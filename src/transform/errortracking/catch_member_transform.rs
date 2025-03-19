/**
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
 * This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2022 Datadog, Inc.
 **/
use swc_common::{SyntaxContext, DUMMY_SP};
use swc_ecma_ast::{
    CallExpr, Callee, Expr, ExprOrSpread, Ident, IdentName, MemberExpr, MemberProp,
};

pub struct CatchMemberTransform {}

impl CatchMemberTransform {
    pub fn to_dd_args(args: &mut Vec<ExprOrSpread>) -> Vec<ExprOrSpread> {
        vec![ExprOrSpread {
            spread: None,
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
                        sym: "record_exception_callback".into(),
                    }),
                }))),
                args: args.to_owned(),
                type_args: None,
                ctxt: SyntaxContext::empty(),
            })),
        }]
    }
}
