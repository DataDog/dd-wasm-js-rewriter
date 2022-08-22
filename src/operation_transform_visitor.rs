use std::ops::DerefMut;
use swc::{
    atoms::JsWord,
    common::{util::take::Take, Span},
    ecmascript::ast::*,
};
use swc_ecma_visit::{Visit, VisitMut, VisitMutWith};

use crate::visitor_util::{
    get_dd_local_variable_name, get_plus_operator_based_on_num_of_args_for_span,
};

pub struct OperationTransformVisitor {
    pub counter: usize,
}

impl Visit for OperationTransformVisitor {}

impl VisitMut for OperationTransformVisitor {
    fn visit_mut_expr(&mut self, expr: &mut Expr) {
        println!("expr {:#?}", expr);
        match expr {
            Expr::Bin(binary) => {
                if binary.op == BinaryOp::Add {
                    expr.map_with_mut(|bin| to_dd_binary_expr(bin, self));
                    return;
                } else {
                    expr.visit_mut_children_with(self);
                }
            }
            _ => {
                expr.visit_mut_children_with(self);
            }
        }
    }
    fn visit_mut_if_stmt(&mut self, if_stmt: &mut IfStmt) {
        if_stmt.test.visit_mut_children_with(self);
    }
    fn visit_mut_block_stmt(&mut self, _expr: &mut BlockStmt) {
        println!("expr block {:#?}", _expr);
    }
}
fn to_dd_binary_expr(
    expr: Expr,
    operation_transform_visitor: &mut OperationTransformVisitor,
) -> Expr {
    match expr {
        Expr::Bin(binary) => {
            let mut binary_clone = binary.clone();
            let span = binary.span;

            let mut assign_expressions = Vec::new();
            let mut arguments_expressions = Vec::new();
            replace_expressions_in_binary(
                &mut binary_clone,
                &mut assign_expressions,
                &mut arguments_expressions,
            );

            operation_transform_visitor.counter = assign_expressions.len();
            assign_expressions.push(Box::new(get_dd_call_plus_operator_expr(
                binary_clone,
                &arguments_expressions,
            )));

            // TODO Iterate all children items checking if it has direct
            return Expr::Paren(ParenExpr {
                span,
                expr: Box::new(Expr::Seq(SeqExpr {
                    span,
                    exprs: assign_expressions,
                })),
            });
        }
        _ => {}
    }
    expr.clone()
}

fn fn_create_assign_expression(index: usize, expr: Expr, span: Span) -> (Expr, Expr) {
    let id = Ident {
        span,
        sym: JsWord::from(get_dd_local_variable_name(index)),
        optional: false,
    };
    (
        Expr::Assign(AssignExpr {
            span,
            left: PatOrExpr::Pat(Box::new(Pat::Ident(BindingIdent {
                id: id.clone(),
                type_ann: None,
            }))),
            right: Box::new(expr),
            op: AssignOp::Assign,
        }),
        Expr::Ident(id),
    )
}

fn replace_expressions_in_binary(
    binary: &mut BinExpr,
    assign_exprs: &mut Vec<Box<Expr>>,
    argument_exprs: &mut Vec<Expr>,
) {
    let left = binary.left.deref_mut();
    let span = binary.span;

    match left {
        Expr::Bin(left_bin) => {
            if left_bin.op == BinaryOp::Add {
                replace_expressions_in_binary(left_bin, assign_exprs, argument_exprs);
            }
        }
        Expr::Call(_) => {
            let index = assign_exprs.len();
            let (assign, id) = fn_create_assign_expression(index, *binary.left.clone(), span);
            assign_exprs.push(Box::new(assign));
            binary
                .left
                .map_with_mut(|_left| Box::new(get_ident(span, index)));
            argument_exprs.push(id);
        }
        _ => argument_exprs.push(left.clone()),
    }
    let right = binary.right.deref_mut();
    match right {
        Expr::Bin(right_bin) => {
            if right_bin.op == BinaryOp::Add {
                replace_expressions_in_binary(right_bin, assign_exprs, argument_exprs);
            }
        }
        Expr::Call(_) => {
            let index = assign_exprs.len();
            let (assign, id) = fn_create_assign_expression(index, *binary.right.clone(), span);
            assign_exprs.push(Box::new(assign));
            binary
                .right
                .map_with_mut(|_right| Box::new(get_ident(span, index)));
            argument_exprs.push(id);
        }
        _ => argument_exprs.push(right.clone()),
    }
}

fn get_ident(span: Span, index: usize) -> Expr {
    return Expr::Ident(Ident {
        span,
        sym: JsWord::from(get_dd_local_variable_name(index)),
        optional: false,
    });
}

fn get_dd_call_plus_operator_expr(binary: BinExpr, argument_exprs: &Vec<Expr>) -> Expr {
    let mut args: Vec<ExprOrSpread> = Vec::new();
    let span = binary.span;

    args.push(ExprOrSpread {
        expr: Box::new(Expr::Bin(binary)),
        spread: None,
    });

    args.append(
        &mut argument_exprs
            .iter()
            .map(|expr| ExprOrSpread {
                expr: Box::new(expr.to_owned()),
                spread: None,
            })
            .collect::<Vec<_>>(),
    );

    Expr::Call(CallExpr {
        span,
        callee: get_plus_operator_based_on_num_of_args_for_span(args.len() - 1, span),
        args,
        type_args: None,
    })
}
