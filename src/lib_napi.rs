/**
* Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
* This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2022 Datadog, Inc.
**/
extern crate base64;

use crate::{
    rewriter::{print_js, rewrite_js, Config},
    telemetry::TelemetryVerbosity,
    util::{rnd_string, DefaultFileReader},
    visitor::{self, csi_methods::CsiMethods, hardcoded_secret_visitor::LiteralInfo},
};

use napi::{Error, Status};

#[napi(object)]
#[derive(Debug)]
pub struct CsiMethod {
    pub src: String,
    pub dst: Option<String>,
    pub operator: Option<bool>,
}

#[napi(object)]
#[derive(Debug)]
pub struct RewriterConfig {
    pub chain_source_map: Option<bool>,
    pub comments: Option<bool>,
    pub local_var_prefix: Option<String>,
    pub csi_methods: Option<Vec<CsiMethod>>,
    pub hardcoded_secret: Option<bool>,
}

impl RewriterConfig {
    fn get_csi_methods(&self) -> CsiMethods {
        match &self.csi_methods {
            Some(methods_napi) => CsiMethods::new(
                &methods_napi
                    .iter()
                    .map(|m| {
                        visitor::csi_methods::CsiMethod::new(
                            m.src.clone(),
                            m.dst.clone(),
                            m.operator.unwrap_or(false),
                        )
                    })
                    .collect::<Vec<visitor::csi_methods::CsiMethod>>(),
            ),
            None => CsiMethods::empty(),
        }
    }

    fn to_config(&self) -> Config {
        Config {
            chain_source_map: self.chain_source_map.unwrap_or(false),
            print_comments: self.comments.unwrap_or(false),
            local_var_prefix: self
                .local_var_prefix
                .clone()
                .unwrap_or_else(|| rnd_string(6)),
            csi_methods: self.get_csi_methods(),
            verbosity: TelemetryVerbosity::Information,
            hardcoded_secret: self.hardcoded_secret.unwrap_or(true),
        }
    }
}

#[napi(object)]
#[derive(Debug)]
pub struct ResultWithoutMetrics {
    pub content: String,
    pub hardcoded_secret_result: Option<HardcodedSecretResultNapi>,
}

#[napi(object, js_name = "HardcodedSecretResult")]
#[derive(Debug)]
pub struct HardcodedSecretResultNapi {
    pub file: String,
    pub literals: Vec<LiteralInfoNapi>,
}

#[napi(object, js_name = "LiteralInfo")]
#[derive(Debug)]
pub struct LiteralInfoNapi {
    pub value: String,
    pub ident: Option<String>,
    pub line: Option<i32>,
}

impl LiteralInfoNapi {
    fn from(literals: Vec<LiteralInfo>) -> Vec<LiteralInfoNapi> {
        literals
            .iter()
            .map(|literal| LiteralInfoNapi {
                value: literal.value.clone(),
                ident: literal.ident.clone(),
                line: literal.line.map(|line| line as i32),
            })
            .collect()
    }
}

#[napi]
pub struct Rewriter {
    config: Config,
}

#[napi]
impl Rewriter {
    #[napi(constructor)]
    pub fn new(config: Option<RewriterConfig>) -> Self {
        let rewriter_config: RewriterConfig = config.unwrap_or(RewriterConfig {
            chain_source_map: Some(false),
            comments: Some(false),
            local_var_prefix: None,
            csi_methods: None,
            hardcoded_secret: Some(true),
        });
        Self {
            config: rewriter_config.to_config(),
        }
    }

    #[napi]
    pub fn rewrite(&self, code: String, file: String) -> napi::Result<ResultWithoutMetrics> {
        let default_file_reader = DefaultFileReader {};

        rewrite_js(code, &file, &self.config, &default_file_reader)
            .map(|result| ResultWithoutMetrics {
                content: print_js(&result, &self.config),
                hardcoded_secret_result: match result.hardcoded_secret_result {
                    Some(hardcoded_secret_result) => Some(HardcodedSecretResultNapi {
                        file,
                        literals: LiteralInfoNapi::from(hardcoded_secret_result.literals),
                    }),
                    _ => None,
                },
            })
            .map_err(|e| Error::new(Status::Unknown, format!("{e}")))
    }

    #[napi]
    pub fn csi_methods(&self) -> napi::Result<Vec<String>> {
        let csi_methods = &self.config.csi_methods;

        Ok(csi_methods
            .methods
            .iter()
            .map(|csi_method| csi_method.dst.clone())
            .collect())
    }
}
