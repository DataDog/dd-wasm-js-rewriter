/**
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
 * This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2022 Datadog, Inc.
 **/
use swc_common::{SyntaxContext, DUMMY_SP};
use swc_ecma_ast::{
    AssignExpr, AssignOp, AssignTarget, AssignTargetPat, BlockStmt, CallExpr, Callee, Expr,
    ExprOrSpread, ExprStmt, Ident, IdentName, MemberExpr, MemberProp, Pat, Stmt,
};
pub struct CatchClauseBodyTransform {}

impl CatchClauseBodyTransform {
    pub fn to_dd_catch_clause_body(
        catch_body: &mut BlockStmt,
        catch_param: &Pat,
        pat_to_restore: Option<Pat>,
    ) {
        if let Some(pat) = pat_to_restore {
            catch_body
                .stmts
                .insert(0, create_restore_assignement(&pat, catch_param));
        }
        catch_body.stmts.insert(0, create_record_call(catch_param));
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
