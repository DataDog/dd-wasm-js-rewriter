/**
* Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
* This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2022 Datadog, Inc.
**/
use swc_common::util::take::Take;
use swc_ecma_ast::*;
use swc_ecma_visit::{Visit, VisitMut, VisitMutWith};

use crate::{
    telemetry::Telemetry,
    transform::{
        iast::{
            arrow_transform::ArrowTransform, assign_add_transform::AssignAddTransform,
            binary_add_transform::BinaryAddTransform, call_expr_transform::CallExprTransform,
            opt_chain_transform::OptChainTransform, template_transform::TemplateTransform,
        },
        transform_status::{Status, TransformStatus},
    },
    visitor::{
        iast::{csi_methods::CsiMethods, ident_provider::IdentProvider},
        visitor_with_context::{Ctx, VisitorWithContext},
    },
};

pub const ADD_TAG: &str = "+";
pub const ADD_ASSING_TAG: &str = "+=";
pub const TPL_TAG: &str = "Tpl";

pub struct OperationTransformVisitor<'a> {
    pub ident_provider: &'a mut dyn IdentProvider,
    pub csi_methods: &'a CsiMethods,
    pub transform_status: &'a mut TransformStatus,
    pub ctx: Ctx,
}

impl VisitorWithContext for OperationTransformVisitor<'_> {
    fn get_ctx(&self) -> Ctx {
        self.ctx
    }

    fn set_ctx(&mut self, ctx: Ctx) {
        self.ctx = ctx;
    }

    fn reset_ctx(&mut self) {
        if self.ctx.root {
            self.ident_provider.reset_counter();
        }
    }
}

impl OperationTransformVisitor<'_> {
    fn update_status(&mut self, status: Status, tag: Option<String>) {
        if self.transform_status.status == Status::Cancelled {
            return;
        }

        if status != Status::NotModified {
            self.transform_status.status = status;
        }

        if self.transform_status.status == Status::Modified {
            self.transform_status.telemetry.inc(tag);
        }
    }
}

impl Visit for OperationTransformVisitor<'_> {}

impl VisitMut for OperationTransformVisitor<'_> {
    fn visit_mut_expr(&mut self, expr: &mut Expr) {
        let plus_operator_enabled = self.csi_methods.plus_operator_is_enabled();
        let tpl_operator_enabled = self.csi_methods.tpl_operator_is_enabled();

        match expr {
            Expr::Bin(binary) if plus_operator_enabled => {
                // check WithCtx::drop. It calls reset_ctx() method when it is destructed
                let opv_with_child_ctx = &mut *self.with_child_ctx();
                binary.visit_mut_children_with(opv_with_child_ctx);

                if binary.op == BinaryOp::Add {
                    expr.map_with_mut(|bin| {
                        let result = BinaryAddTransform::to_dd_binary_expr(
                            &bin,
                            opv_with_child_ctx.csi_methods,
                            opv_with_child_ctx.ident_provider,
                        );
                        opv_with_child_ctx.update_status(result.status, Some(ADD_TAG.to_string()));
                        result.expr.unwrap_or(bin)
                    });
                }
            }

            Expr::Assign(assign) if plus_operator_enabled => {
                let opv_with_child_ctx = &mut *self.with_child_ctx();
                assign.visit_mut_children_with(opv_with_child_ctx);

                if assign.op == AssignOp::AddAssign {
                    assign.map_with_mut(|mut assign| {
                        let result =
                            AssignAddTransform::to_dd_assign_expr(&mut assign, opv_with_child_ctx);
                        opv_with_child_ctx
                            .update_status(result.status, Some(ADD_ASSING_TAG.to_string()));
                        result.expr.unwrap_or(assign)
                    });
                }
            }

            Expr::Tpl(tpl) if tpl_operator_enabled => {
                if !tpl.exprs.is_empty() && tpl.exprs.iter().all(|tpl_expr| !tpl_expr.is_lit()) {
                    let opv_with_child_ctx = &mut *self.with_child_ctx();
                    tpl.visit_mut_children_with(opv_with_child_ctx);

                    expr.map_with_mut(|mut tpl| {
                        let result = TemplateTransform::to_dd_tpl_expr(
                            &mut tpl,
                            opv_with_child_ctx.csi_methods,
                            opv_with_child_ctx.ident_provider,
                        );
                        opv_with_child_ctx.update_status(result.status, Some(TPL_TAG.to_string()));
                        result.expr.unwrap_or(tpl)
                    });
                }
            }

            Expr::Call(call) => {
                let opv_with_child_ctx = &mut *self.with_child_ctx();
                call.visit_mut_children_with(opv_with_child_ctx);
                if call.callee.is_expr() {
                    let result = CallExprTransform::to_dd_call_expr(
                        call,
                        opv_with_child_ctx.csi_methods,
                        opv_with_child_ctx.ident_provider,
                    );
                    if result.is_modified() {
                        expr.map_with_mut(|e| result.expr.unwrap_or(e));
                        opv_with_child_ctx.update_status(result.status, result.tag);
                    }
                }
            }

            Expr::OptChain(_) => {
                let opv_with_child_ctx = &mut *self.with_child_ctx();
                let transform_result = OptChainTransform::to_dd_cond_expr(
                    expr,
                    opv_with_child_ctx.csi_methods,
                    opv_with_child_ctx.ident_provider,
                );
                if transform_result.is_modified() {
                    expr.map_with_mut(|e| transform_result.expr.unwrap_or(e));
                    opv_with_child_ctx.update_status(transform_result.status, transform_result.tag);
                }

                expr.visit_mut_children_with(opv_with_child_ctx);
            }

            Expr::Unary(unary_expr) => {
                if UnaryOp::Delete != unary_expr.op {
                    expr.visit_mut_children_with(self);
                }
            }

            Expr::Arrow(arrow) => {
                let transform_result = ArrowTransform::to_dd_arrow_expr(arrow);
                if transform_result.is_modified() {
                    expr.map_with_mut(|e| transform_result.expr.unwrap_or(e));
                    // do not update status yet
                }
            }

            _ => {
                expr.visit_mut_children_with(self);
            }
        }
    }

    fn visit_mut_ident(&mut self, ident: &mut Ident) {
        self.ident_provider.register_variable(ident);
    }

    fn visit_mut_if_stmt(&mut self, if_stmt: &mut IfStmt) {
        if_stmt.test.visit_mut_children_with(self);
        if_stmt.cons.visit_mut_children_with(self);
    }

    // cancel visit child blocks
    fn visit_mut_block_stmt(&mut self, _n: &mut BlockStmt) {}
}
