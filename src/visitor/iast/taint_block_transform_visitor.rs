/**
* Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
* This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2022 Datadog, Inc.
**/
use crate::{
    rewriter::Config,
    transform::transform_status::{Status, TransformStatus},
    visitor::{
        block_transform_utils::{get_program_hash, insert_prefix_statement},
        iast::{
            ident_provider::DefaultIdentProvider,
            operation_transform_visitor::OperationTransformVisitor,
        },
        visitor_utils::get_dd_local_variable_prefix,
        visitor_with_context::Ctx,
    },
};
use std::collections::HashSet;
use swc_common::{SyntaxContext, DUMMY_SP};
use swc_ecma_ast::{Stmt::Decl as DeclEnumOption, *};
use swc_ecma_visit::{Visit, VisitMut, VisitMutWith};

pub struct TaintBlockTransformVisitor<'a> {
    pub transform_status: &'a mut TransformStatus,
    pub config: &'a Config,
}

impl TaintBlockTransformVisitor<'_> {
    pub fn default<'a>(
        transform_status: &'a mut TransformStatus,
        config: &'a Config,
    ) -> TaintBlockTransformVisitor<'a> {
        TaintBlockTransformVisitor {
            transform_status,
            config,
        }
    }

    fn visit_is_cancelled(&mut self) -> bool {
        self.transform_status.status == Status::Cancelled
    }

    fn cancel_visit(&mut self, reason: &str) {
        self.transform_status.status = Status::Cancelled;
        self.transform_status.msg = Some(reason.to_string());
    }
}

//  Block:
//  - Find items to instrument (+ or template literals in statements or in while, if... test part)
//  - Replace found items by (__dd_XXX_1=....)
//  - Create necessary temporal vars in top of block

impl Visit for TaintBlockTransformVisitor<'_> {}

impl VisitMut for TaintBlockTransformVisitor<'_> {
    fn visit_mut_block_stmt(&mut self, expr: &mut BlockStmt) {
        if self.visit_is_cancelled() {
            return;
        }
        let mut ident_provider = DefaultIdentProvider::new(&self.config.local_var_prefix);
        let mut operation_visitor = OperationTransformVisitor {
            ident_provider: &mut ident_provider,
            csi_methods: &self.config.csi_methods,
            transform_status: self.transform_status,
            ctx: Ctx::root(),
        };

        expr.visit_mut_children_with(&mut operation_visitor);

        if variables_contains_possible_duplicate(
            &ident_provider.variable_decl,
            &self.config.local_var_prefix,
        ) {
            return self.cancel_visit("Variable name duplicated");
        } else {
            insert_variable_declaration(&ident_provider.idents, expr);
        }

        expr.visit_mut_children_with(self);
    }

    fn visit_mut_program(&mut self, node: &mut Program) {
        let base_program_hash = get_program_hash(node);
        node.visit_mut_children_with(self);

        if self.transform_status.status == Status::Modified
            && base_program_hash != get_program_hash(node)
        {
            insert_prefix_statement(node, &self.config.file_iast_prefix_code);
        }
    }
}

fn variables_contains_possible_duplicate(variable_decl: &HashSet<Ident>, prefix: &String) -> bool {
    let prefix = get_dd_local_variable_prefix(prefix);
    variable_decl
        .iter()
        .any(|var| var.span != DUMMY_SP && var.sym.starts_with(&prefix))
}

fn insert_variable_declaration(ident_expressions: &[Ident], expr: &mut BlockStmt) {
    if !ident_expressions.is_empty() {
        let span = expr.span;
        let mut vec = Vec::new();
        ident_expressions.iter().for_each(|ident| {
            vec.push(VarDeclarator {
                span,
                definite: false,
                name: Pat::Ident(BindingIdent {
                    id: ident.clone(),
                    type_ann: None,
                }),
                init: None,
            });
        });
        let declaration = DeclEnumOption(Decl::Var(Box::new(VarDecl {
            span,
            decls: vec,
            declare: false,
            kind: VarDeclKind::Let,
            ctxt: SyntaxContext::empty(),
        })));

        let index = get_variable_insertion_index(&expr.stmts);
        expr.stmts.insert(index, declaration);
    }
}

fn get_variable_insertion_index(stmts: &[Stmt]) -> usize {
    if !stmts.is_empty() && stmts[0].is_use_strict() {
        1
    } else {
        0
    }
}
