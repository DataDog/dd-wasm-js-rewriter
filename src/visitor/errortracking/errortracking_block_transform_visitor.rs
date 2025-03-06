/**
* Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
* This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2022 Datadog, Inc.
**/
use crate::{
    rewriter::Config,
    transform::transform_status::{Status, TransformStatus},
    visitor::block_transform_utils::insert_prefix_statement,
};
use rand::{thread_rng, Rng};
use std::fmt::Write;
use swc_common::{SyntaxContext, DUMMY_SP};
use swc_ecma_ast::{
    AssignExpr, AssignOp, AssignTarget, AssignTargetPat, BindingIdent, CallExpr, Callee,
    CatchClause, Expr, ExprOrSpread, ExprStmt, Ident, IdentName, MemberExpr, MemberProp, Pat,
    Program, Stmt,
};
use swc_ecma_visit::{Visit, VisitMut, VisitMutWith};

pub struct ErrorTrackingBlockTransformVisitor<'a> {
    pub transform_status: &'a mut TransformStatus,
    pub config: &'a Config,
}

impl ErrorTrackingBlockTransformVisitor<'_> {
    pub fn default<'a>(
        transform_status: &'a mut TransformStatus,
        config: &'a Config,
    ) -> ErrorTrackingBlockTransformVisitor<'a> {
        ErrorTrackingBlockTransformVisitor {
            transform_status,
            config,
        }
    }
}

impl Visit for ErrorTrackingBlockTransformVisitor<'_> {}

impl VisitMut for ErrorTrackingBlockTransformVisitor<'_> {
    fn visit_mut_catch_clause(&mut self, catch: &mut CatchClause) {
        catch.visit_mut_children_with(self);
        match &mut catch.param {
            Some(pat) => {
                let param_to_restore = match pat {
                    Pat::Ident(_) => None,
                    Pat::Array(_) => {
                        let old_param = Some(pat.clone());
                        *pat = Pat::Ident(get_new_binding_indent());
                        old_param
                    }
                    Pat::Object(_) => {
                        let old_param = Some(pat.clone());
                        *pat = Pat::Ident(get_new_binding_indent());
                        old_param
                    }
                    _ => None,
                };

                // Inject function call
                let body = &mut catch.body;
                if let Some(param) = &param_to_restore {
                    body.stmts.insert(0, create_restore_assignement(param, pat));
                }
                body.stmts.insert(0, create_record_call(pat));
            }
            None => {
                catch.param = Some(Pat::Ident(get_new_binding_indent()));
                let body = &mut catch.body;
                body.stmts
                    .insert(0, create_record_call(catch.param.as_ref().unwrap()));
            }
        }
        self.transform_status.status = Status::Modified;
    }

    fn visit_mut_program(&mut self, node: &mut Program) {
        node.visit_mut_children_with(self);

        if self.transform_status.status == Status::Modified {
            insert_prefix_statement(node, self.config);
        }
    }
}

fn create_record_call(pat: &Pat) -> Stmt {
    Stmt::Expr(ExprStmt {
        span: DUMMY_SP,
        expr: Box::new(Expr::Call(CallExpr {
            span: DUMMY_SP,
            callee: Callee::Expr(Box::new(Expr::Member(MemberExpr {
                span: DUMMY_SP,
                obj: Box::new(Expr::Ident(Ident {
                    span: DUMMY_SP,
                    sym: "_dderrortracking".into(),
                    optional: false,
                    ctxt: SyntaxContext::empty(),
                })),
                prop: MemberProp::Ident(IdentName {
                    span: DUMMY_SP,
                    sym: "record_exception".into(),
                }),
            }))),
            args: vec![ExprOrSpread {
                spread: None,
                expr: Box::new(Expr::Ident(pat.as_ident().unwrap().clone().id)),
            }],
            type_args: None,
            ctxt: SyntaxContext::empty(),
        })),
    })
}

fn create_restore_assignement(left: &Pat, right: &Pat) -> Stmt {
    Stmt::Expr(ExprStmt {
        span: DUMMY_SP,
        expr: Box::new(Expr::Assign(AssignExpr {
            span: DUMMY_SP,
            op: AssignOp::Assign,
            left: match left {
                Pat::Array(array) => Some(AssignTarget::Pat(AssignTargetPat::Array(array.clone()))),
                Pat::Object(object) => {
                    Some(AssignTarget::Pat(AssignTargetPat::Object(object.clone())))
                }
                _ => None,
            }
            .unwrap(),
            right: Box::new(Expr::Ident(right.as_ident().unwrap().clone().id)),
        })),
    })
}

fn random_hash(size: usize) -> String {
    let mut rng = thread_rng();
    let mut output = String::new();
    for _ in 0..size {
        let _ = write!(output, "{:x}", rng.gen_range(0..16)); // Generates a hex digit
    }
    output
}

fn get_new_binding_indent() -> BindingIdent {
    BindingIdent {
        id: Ident {
            span: DUMMY_SP,
            sym: format!("__datadog_errortracking_{}", random_hash(16)).into(),
            optional: false,
            ctxt: SyntaxContext::empty(),
        },
        type_ann: None,
    }
}
