/**
* Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
* This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2022 Datadog, Inc.
**/
use crate::{
    telemetry::TelemetryVerbosity,
    transform::transform_status::{Status, TransformStatus},
    util::{file_name, parse_source_map, FileReader},
    visitor::iast::{
        csi_methods::CsiMethods,
        literal_visitor::{get_literals, LiteralsResult},
        taint_block_transform_visitor::TaintBlockTransformVisitor,
    },
};
use anyhow::{Error, Result};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use log::debug;
use orchestrion_js::Instrumentor;
use std::{
    borrow::Cow,
    collections::HashMap,
    io::Read,
    path::{Path, PathBuf},
    str,
    sync::Arc,
};
use swc::{
    config::{IsModule, SourceMapsConfig},
    sourcemap::{decode, decode_data_url, DecodedMap, SourceMap, SourceMapBuilder},
    try_with_handler, Compiler, HandlerOpts, PrintArgs, SwcComments,
};
use swc_common::{
    comments::Comments,
    errors::{ColorConfig, Handler},
    FileName, FilePathMapping, SourceFile,
};
use swc_ecma_ast::{EsVersion, Program, Stmt};

use std::{collections::HashSet, fmt};
use swc_ecma_parser::{EsSyntax, Syntax};
use swc_ecma_visit::VisitMutWith;

const SOURCE_MAP_URL: &str = "# sourceMappingURL=";

#[derive(Copy, Clone)]
struct FileMeta<'a> {
    module_name: Option<&'a str>,
    module_version: Option<&'a str>,
    filename: &'a PathBuf,
}

#[derive(Debug, Clone, Eq, Hash, PartialEq)]
// #[serde(rename_all = "snake_case")]
pub enum TransformPass {
    Iast,
    Orchestrion,
}

impl TransformPass {
    fn transform(
        &self,
        program: &mut Program,
        transform_status: &mut TransformStatus,
        config: &mut Config,
        meta: &FileMeta,
    ) {
        match self {
            Self::Iast => transform_iast(program, transform_status, config),
            Self::Orchestrion => transform_orchestrion(program, transform_status, config, meta),
        }
    }
}

pub struct RewrittenOutput {
    pub code: String,
    pub source_map: String,
    pub original_source_map: OriginalSourceMap,
    pub transform_status: Option<TransformStatus>,
    pub literals_result: Option<LiteralsResult>,
}

pub struct OriginalSourceMap {
    pub source: Option<SourceMap>,
    pub source_map_comment: Option<String>,
}

pub struct Config {
    pub chain_source_map: bool,
    pub print_comments: bool,
    pub local_var_prefix: String,
    pub csi_methods: CsiMethods,
    pub verbosity: TelemetryVerbosity,
    pub literals: bool,
    pub file_iast_prefix_code: Vec<Stmt>,
    pub strict: bool,
    pub instrumentor: Option<Instrumentor>,
}

impl fmt::Debug for Config {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("Config")
            .field("chain_source_map", &self.chain_source_map)
            .field("print_comments", &self.print_comments)
            .field("local_var_prefix", &self.local_var_prefix)
            .field("csi_methods", &self.csi_methods)
            .field("verbosity", &self.verbosity)
            .field("literals", &self.literals)
            .field("strict", &self.strict)
            // file_prefix_code intentionally ignored
            .finish()
    }
}

pub fn print_js<'a>(
    code: &'a str,
    source_map: &str,
    original_source_map: &OriginalSourceMap,
    config: &Config,
) -> Cow<'a, str> {
    let final_source_map = chain_source_maps(source_map, &original_source_map.source, config)
        .unwrap_or_else(|| String::from(source_map));

    let final_code = if config.print_comments {
        match &original_source_map.source_map_comment {
            Some(comment) => {
                debug!("Replacing original sourceMappingUrl comment: {comment}");
                code.replace(comment.as_str(), "").into()
            }
            _ => code.into(),
        }
    } else {
        code.into()
    };

    if final_source_map.is_empty() {
        debug!("No sourcemap available");
        final_code
    } else {
        debug!("Embedding new sourcemap: {final_source_map}");

        format!(
            "{}\n//{}data:application/json;base64,{}",
            final_code,
            SOURCE_MAP_URL,
            STANDARD.encode(final_source_map)
        )
        .into()
    }
}

fn default_handler_opts() -> HandlerOpts {
    HandlerOpts {
        color: ColorConfig::Never,
        skip_filename: false,
    }
}

pub fn rewrite_js<R: Read>(
    code: String,
    file: &str,
    config: &mut Config,
    file_reader: &impl FileReader<R>,
    base_passes: &[String],
    module_name: Option<&str>,
    module_version: Option<&str>,
) -> Result<RewrittenOutput> {
    debug!("Rewriting js file: {file} with config: {config:?}");

    let compiler = Compiler::new(Arc::new(swc_common::SourceMap::new(
        FilePathMapping::empty(),
    )));
    try_with_handler(compiler.cm.clone(), default_handler_opts(), |handler| {
        let source_file = compiler
            .cm
            .new_source_file(Arc::new(FileName::Real(PathBuf::from(file))), code);

        let mut passes: HashSet<TransformPass> = HashSet::new();
        if base_passes.contains(&String::from("iast")) {
            passes.insert(TransformPass::Iast);
        }
        if base_passes.contains(&String::from("orchestrion")) {
            passes.insert(TransformPass::Orchestrion);
        }
        let meta = FileMeta {
            module_name,
            module_version,
            filename: &PathBuf::from(file),
        };

        parse_and_transform(
            &source_file,
            handler,
            &compiler,
            file,
            file_reader,
            config,
            &mut passes,
            meta,
        )
    })
}

#[allow(clippy::too_many_arguments)]
fn parse_and_transform<R: Read>(
    source_file: &Arc<SourceFile>,
    handler: &Handler,
    compiler: &Compiler,
    file: &str,
    file_reader: &impl FileReader<R>,
    config: &mut Config,
    passes: &mut HashSet<TransformPass>,
    meta: FileMeta,
) -> Result<RewrittenOutput, Error> {
    parse_js(source_file, handler, compiler)
        .and_then(|program| apply_transformation_passes(program, config, passes, meta))
        .and_then(|(program, transform_status)| {
            if transform_status.status == Status::Restart {
                parse_and_transform(
                    source_file,
                    handler,
                    compiler,
                    file,
                    file_reader,
                    config,
                    passes,
                    meta,
                )
            } else {
                generate_output(
                    program,
                    transform_status,
                    file,
                    file_reader,
                    config,
                    compiler,
                )
            }
        })
}

fn parse_js(
    source_file: &Arc<SourceFile>,
    handler: &Handler,
    compiler: &Compiler,
) -> Result<Program> {
    let es_syntax = EsSyntax {
        jsx: false,
        fn_bind: false,
        decorators: false,
        decorators_before_export: false,
        export_default_from: false,
        import_attributes: true,
        allow_super_outside_method: false,
        allow_return_outside_function: true,
        auto_accessors: true,
        ..Default::default()
    };

    compiler.parse_js(
        source_file.to_owned(),
        handler,
        EsVersion::latest(),
        Syntax::Es(es_syntax),
        IsModule::Unknown,
        Some(&compiler.comments() as &dyn Comments),
    )
}

fn apply_transformation_passes(
    mut program: Program,
    config: &mut Config,
    passes: &mut HashSet<TransformPass>,
    meta: FileMeta,
) -> Result<(Program, TransformStatus)> {
    let mut transform_status = TransformStatus::not_modified(config);

    if let Some(pass_to_remove) = passes
        .iter()
        .find(|&pass| {
            pass.transform(&mut program, &mut transform_status, config, &meta);
            transform_status.status == Status::Cancelled
        })
        .cloned()
    {
        passes.remove(&pass_to_remove);
        if !passes.is_empty() && !config.strict {
            transform_status.status = Status::Restart
        }
    }
    Ok((program, transform_status))
}

fn transform_iast(
    program: &mut Program,
    transform_status: &mut TransformStatus,
    config: &mut Config,
) {
    let mut block_transform_visitor = TaintBlockTransformVisitor::default(transform_status, config);
    program.visit_mut_with(&mut block_transform_visitor);
}

fn transform_orchestrion(
    program: &mut Program,
    transform_status: &mut TransformStatus,
    config: &mut Config,
    meta: &FileMeta,
) {
    if let Some(instrumentor) = &mut config.instrumentor {
        if let (Some(name), Some(version)) = (meta.module_name, meta.module_version) {
            let file_path = meta.filename.to_str().unwrap();
            let searchable = format!("node_modules/{}", name);
            if let Some(index) = file_path.find(&searchable) {
                let path = &file_path[(index + searchable.len() + 1)..];
                let path = path.into();
                let mut instrumentation_visitor =
                    instrumentor.get_matching_instrumentations(name, version, &path);
                program.visit_mut_with(&mut instrumentation_visitor);
                transform_status.status = Status::Modified;
            }
        }
    }
}

fn generate_output<R: Read>(
    mut program: Program,
    transform_status: TransformStatus,
    file: &str,
    file_reader: &impl FileReader<R>,
    config: &Config,
    compiler: &Compiler,
) -> Result<RewrittenOutput, Error> {
    let literals_result = get_literals(config.literals, file, &mut program, compiler);
    let comments = &compiler.comments().clone() as &dyn Comments;

    let print_args = PrintArgs {
        source_file_name: file_name(file),
        source_map: SourceMapsConfig::Bool(true),
        comments: config.print_comments.then_some(comments),
        emit_source_map_columns: true,
        ..Default::default()
    };

    match transform_status.status {
        Status::Modified => {
            // extract sourcemap before printing otherwise comments are consumed
            // and looks like it is not possible to read them after compiler.print() invocation
            let original_source_map = extract_source_map(file, compiler.comments(), file_reader);

            compiler
                .print(&program, print_args)
                .map(|output| RewrittenOutput {
                    code: output.code,
                    source_map: output.map.unwrap_or_default(),
                    original_source_map,
                    transform_status: Some(transform_status),
                    literals_result,
                })
        }
        Status::NotModified => Ok(RewrittenOutput {
            code: String::default(),
            source_map: String::default(),
            original_source_map: OriginalSourceMap {
                source: None,
                source_map_comment: None,
            },
            transform_status: Some(transform_status),
            literals_result,
        }),
        Status::Cancelled | Status::Restart => Err(Error::msg(format!(
            "Cancelling {} file rewrite. Reason: {}",
            file,
            transform_status
                .msg
                .unwrap_or_else(|| "unknown".to_string())
        ))),
    }
}

fn chain_source_maps(
    source_map: &str,
    original_map: &Option<SourceMap>,
    config: &Config,
) -> Option<String> {
    config.chain_source_map.then(|| {
        debug!("Chaining sourcemaps");

        original_map.as_ref().and_then(|original_source| {
            parse_source_map(Some(source_map)).and_then(|new_source| {
                let mut builder = SourceMapBuilder::new(None);
                let mut sources: HashMap<String, u32> = HashMap::new();
                let mut names: HashMap<String, u32> = HashMap::new();
                for token in new_source.tokens() {
                    let original_token =
                        original_source.lookup_token(token.get_src_line(), token.get_src_col());
                    if let Some(original) = original_token {
                        let mut source_idx = None;
                        if original.has_source() {
                            let source = original.get_source().unwrap();
                            source_idx = Some(sources.get(source).copied().unwrap_or_else(|| {
                                let result = builder.add_source(source);
                                sources.insert(String::from(source), result);
                                result
                            }));
                        }
                        let mut name_idx = None;
                        if original.has_name() {
                            let name = original.get_name().unwrap();
                            name_idx = Some(names.get(name).copied().unwrap_or_else(|| {
                                let result = builder.add_name(name);
                                names.insert(String::from(name), result);
                                result
                            }));
                        }
                        builder.add_raw(
                            token.get_dst_line(),
                            token.get_dst_col(),
                            original.get_src_line(),
                            original.get_src_col(),
                            source_idx,
                            name_idx,
                            false,
                        );
                    }
                }

                let mut source_map_output: Vec<u8> = vec![];
                builder
                    .into_sourcemap()
                    .to_writer(&mut source_map_output)
                    .map(|_| {
                        debug!("Sourcemaps chained successfully");
                        String::from_utf8(source_map_output).unwrap()
                    })
                    .map_err(|err| {
                        debug!("Error chaining sourcemaps {err:?}");
                    })
                    .ok()
            })
        })
    })?
}

fn extract_source_map<R: Read>(
    file_path: &str,
    comments: &SwcComments,
    file_reader: &impl FileReader<R>,
) -> OriginalSourceMap {
    let mut source_map_comment = None;
    let mut source: Option<SourceMap> = None;
    for trailing in comments.trailing.iter() {
        for comment in trailing.iter() {
            let trim_comment = comment.text.trim();
            if trim_comment.starts_with(SOURCE_MAP_URL) {
                source_map_comment = Some(String::from(comment.text.as_str()));
                let url = trim_comment.get(SOURCE_MAP_URL.len()..).unwrap();
                source = decode_data_url(url)
                    .map_err(Error::new)
                    .or_else(|_| {
                        let source_path = PathBuf::from(url);
                        let final_path = if source_path.is_absolute() {
                            source_path
                        } else {
                            let folder = file_reader.parent(Path::new(file_path)).unwrap();
                            folder.join(source_path)
                        };

                        decode(file_reader.read(&final_path)?)
                    })
                    .ok()
                    .and_then(|it| match it {
                        DecodedMap::Regular(source) => Some(source),
                        _ => None,
                    });
            }
        }
    }

    OriginalSourceMap {
        source,
        source_map_comment,
    }
}

pub fn generate_prefix_stmts(csi_methods: &CsiMethods) -> Vec<Stmt> {
    let template = ";
    if (typeof _ddiast === 'undefined') (function(globals) {
        const noop = (res) => res;
        globals._ddiast = globals._ddiast || { __CSI_METHODS__ };
    }((1,eval)('this')));
    ";

    let csi_methods_code = csi_methods
        .methods
        .iter()
        .map(|csi_method| format!("{}: noop", csi_method.dst))
        .collect::<Vec<_>>()
        .join(", ");

    let final_template = template.replace("__CSI_METHODS__", &csi_methods_code);

    let compiler = Compiler::new(Arc::new(swc_common::SourceMap::new(
        FilePathMapping::empty(),
    )));

    let handler_opts = HandlerOpts {
        color: ColorConfig::Never,
        skip_filename: false,
    };
    let program_result = try_with_handler(compiler.cm.clone(), handler_opts, |handler| {
        let source_file = compiler.cm.new_source_file(
            Arc::new(FileName::Real(PathBuf::from("inline.js".to_string()))),
            final_template.clone(),
        );

        parse_js(&source_file, handler, &compiler)
    });

    if let Ok(Program::Script(script)) = program_result {
        return script.body;
    }

    Vec::new()
}

#[cfg(test)]
pub fn debug_js(code: String) -> Result<RewrittenOutput> {
    use swc::PrintArgs;

    use crate::util::DefaultFileReader;

    let compiler = Compiler::new(Arc::new(swc_common::SourceMap::new(
        FilePathMapping::empty(),
    )));
    return try_with_handler(compiler.cm.clone(), default_handler_opts(), |handler| {
        let js_file = "debug.js".to_string();
        let source_file = compiler.cm.new_source_file(
            Arc::new(FileName::Real(PathBuf::from(js_file.clone()))),
            code,
        );

        let program = parse_js(&source_file, handler, &compiler)?;

        print!("{:#?}", program);

        let source_map_reader = DefaultFileReader {};
        let original_map =
            extract_source_map(js_file.as_str(), &compiler.comments(), &source_map_reader);

        let print_args = PrintArgs {
            source_file_name: file_name(&js_file),
            source_map: SourceMapsConfig::Bool(true),
            comments: Some(compiler.comments() as &dyn Comments),
            emit_source_map_columns: true,
            ..Default::default()
        };

        let print_result = compiler.print(&program, print_args);

        print_result.map(|printed| RewrittenOutput {
            code: printed.code,
            source_map: printed.map.unwrap(),
            original_source_map: original_map,
            transform_status: None,
            literals_result: None,
        })
    });
}
