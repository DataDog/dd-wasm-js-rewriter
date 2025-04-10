/**
* Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
* This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2022 Datadog, Inc.
**/
use swc_common::{Span, SyntaxContext};
use swc_ecma_ast::*;

const DATADOG_VAR_PREFIX: &str = "__datadog";
const DD_GLOBAL_NAMESPACE: &str = "_ddiast";
pub const DD_PLUS_OPERATOR: &str = "plusOperator";
pub const DD_TEMPLATE_LITERAL_OPERATOR: &str = "tplOperator";

pub fn get_dd_local_variable_name(n: usize, prefix: &String) -> String {
    format!("{}{}", get_dd_local_variable_prefix(prefix), n)
}

pub fn get_dd_local_variable_prefix(prefix: &String) -> String {
    format!("{DATADOG_VAR_PREFIX}_{prefix}_")
}

pub fn dd_global_method_invocation(method_name: &str, span: &Span) -> Callee {
    Callee::Expr(Box::new(Expr::Member(MemberExpr {
        span: *span,
        prop: MemberProp::Ident(IdentName::new(method_name.into(), *span)),
        obj: Box::new(Expr::Ident(Ident {
            span: *span,
            sym: DD_GLOBAL_NAMESPACE.into(),
            optional: false,
            ctxt: SyntaxContext::empty(),
        })),
    })))
}

pub fn get_dd_call_expr(
    expr: &Expr,
    arguments: &[ExprOrSpread],
    method_name: &str,
    span: &Span,
) -> Expr {
    let mut args: Vec<ExprOrSpread> = vec![ExprOrSpread {
        expr: Box::new(expr.clone()),
        spread: None,
    }];

    args.append(&mut arguments.to_vec());

    Expr::Call(CallExpr {
        span: *span,
        callee: dd_global_method_invocation(method_name, span),
        args,
        type_args: None,
        ctxt: SyntaxContext::empty(),
    })
}

pub fn get_dd_paren_expr(
    expr: &Expr,
    arguments: &[ExprOrSpread],
    assignations: &mut Vec<Expr>,
    method_name: &str,
    span: &Span,
) -> Expr {
    let call = get_dd_call_expr(expr, arguments, method_name, span);

    // if there are 0 assign expressions we can return just call expression without parentheses
    // else wrap them all with a sequence of comma separated expressions inside parentheses
    if assignations.is_empty() {
        call
    } else {
        assignations.push(call);
        Expr::Paren(ParenExpr {
            span: *span,
            expr: Box::new(Expr::Seq(SeqExpr {
                span: *span,
                exprs: assignations
                    .iter()
                    .map(|assignation| Box::new(assignation.clone()))
                    .collect::<Vec<Box<Expr>>>(),
            })),
        })
    }
}
