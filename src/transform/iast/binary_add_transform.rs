/**
* Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
* This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2022 Datadog, Inc.
**/
use swc_ecma_ast::*;

use crate::{
    transform::{
        iast::operand_handler::{DefaultOperandHandler, OperandHandler},
        transform_status::TransformResult,
    },
    visitor::{
        iast::{
            csi_methods::CsiMethods,
            ident_provider::{IdentKind, IdentProvider},
        },
        visitor_utils::get_dd_paren_expr,
    },
};

use super::operand_handler::ExpandArrays;

pub struct BinaryAddTransform {}

impl BinaryAddTransform {
    pub fn to_dd_binary_expr(
        expr: &Expr,
        csi_methods: &CsiMethods,
        ident_provider: &mut dyn IdentProvider,
    ) -> TransformResult<Expr> {
        let expr_clone = expr.clone();
        if let Expr::Bin(mut binary) = expr_clone {
            if let Some(dd_expr) =
                to_dd_binary_expr_binary(&mut binary, csi_methods, ident_provider)
            {
                return TransformResult::modified(dd_expr);
            }
        }
        TransformResult::not_modified()
    }
}

fn to_dd_binary_expr_binary(
    binary: &mut BinExpr,
    csi_methods: &CsiMethods,
    ident_provider: &mut dyn IdentProvider,
) -> Option<Expr> {
    let mut assignations = Vec::new();
    let mut arguments = Vec::new();

    if prepare_replace_expressions_in_binary(
        binary,
        &mut assignations,
        &mut arguments,
        ident_provider,
    ) {
        let expr = get_dd_paren_expr(
            &Expr::Bin(binary.clone()),
            &arguments,
            &mut assignations,
            &csi_methods.get_dd_plus_operator_name(),
            &binary.span,
        );

        return Some(expr);
    }
    None
}

fn prepare_replace_expressions_in_binary(
    binary: &mut BinExpr,
    assignations: &mut Vec<Expr>,
    arguments: &mut Vec<ExprOrSpread>,
    ident_provider: &mut dyn IdentProvider,
) -> bool {
    let left_ident_mode = DefaultOperandHandler::get_ident_mode(&mut binary.right);
    DefaultOperandHandler::replace_expressions_in_expr(
        &mut binary.left,
        left_ident_mode,
        assignations,
        arguments,
        &binary.span,
        ident_provider,
        IdentKind::Expr,
        ExpandArrays::No,
    );

    let right_ident_mode = DefaultOperandHandler::get_ident_mode(&mut binary.left);
    DefaultOperandHandler::replace_expressions_in_expr(
        &mut binary.right,
        right_ident_mode,
        assignations,
        arguments,
        &binary.span,
        ident_provider,
        IdentKind::Expr,
        ExpandArrays::No,
    );

    // if all arguments are literals we can skip expression replacement
    must_replace_binary_expression(arguments)
}

fn must_replace_binary_expression(arguments: &[ExprOrSpread]) -> bool {
    arguments.iter().any(|arg| !arg.expr.is_lit())
}
