/**
* Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
* This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2022 Datadog, Inc.
**/
use crate::{
    rewriter::Config,
    transform::{
        errortracking::{
            catch_clause_body_transform::CatchClauseBodyTransform,
            catch_clause_pat_transform::CatchClausePatTransform,
            catch_member_transform::CatchMemberTransform,
        },
        transform_status::{Status, TransformStatus},
    },
    visitor::block_transform_utils::{get_program_hash, insert_prefix_statement},
};
use swc_ecma_ast::{CallExpr, CatchClause, ExprOrSpread, Pat, Program};
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

    fn visit_is_cancelled(&mut self) -> bool {
        self.transform_status.status == Status::Cancelled
    }

    pub fn cancel_visit(&mut self, reason: &str) {
        self.transform_status.status = Status::Cancelled;
        self.transform_status.msg = Some(reason.to_string());
    }
}

impl Visit for ErrorTrackingBlockTransformVisitor<'_> {}

impl VisitMut for ErrorTrackingBlockTransformVisitor<'_> {
    fn visit_mut_catch_clause(&mut self, catch: &mut CatchClause) {
        if self.visit_is_cancelled() {
            return;
        }
        catch.visit_mut_children_with(self);
        let new_pat_result = match &catch.param {
            Some(Pat::Array(_) | Pat::Object(_)) | None => Some(
                CatchClausePatTransform::to_dd_catch_clause_pat(&self.config.local_var_prefix),
            ),
            Some(Pat::Ident(_)) => None,
            _ => {
                return self.cancel_visit("unexpected catch clause");
            }
        };

        if let Some(new_pat) = new_pat_result {
            let base_catch_param = catch.param.clone();
            catch.param = Some(new_pat.clone());
            CatchClauseBodyTransform::to_dd_catch_clause_body(
                &mut catch.body,
                &new_pat,
                base_catch_param,
            );
        } else {
            CatchClauseBodyTransform::to_dd_catch_clause_body(
                &mut catch.body,
                catch.param.as_ref().unwrap(),
                None,
            );
        }
        self.transform_status.status = Status::Modified;
    }

    fn visit_mut_call_expr(&mut self, node: &mut CallExpr) {
        if self.visit_is_cancelled() {
            return;
        }

        if let Some(expr) = node.callee.as_expr() {
            if let Some(member_expr) = expr.as_member() {
                let prop: &swc_ecma_ast::MemberProp = &member_expr.prop;
                if prop.is_ident_with("catch") {
                    let args: &mut Vec<ExprOrSpread> = &mut node.args;
                    if args.len() == 1 {
                        *args = CatchMemberTransform::to_dd_args(args);
                        self.transform_status.status = Status::Modified;
                    }
                }
            }
        }
        node.visit_mut_children_with(self);
    }

    fn visit_mut_program(&mut self, node: &mut Program) {
        let base_program_hash = get_program_hash(node);
        node.visit_mut_children_with(self);

        if self.transform_status.status == Status::Modified
            && base_program_hash != get_program_hash(node)
        {
            insert_prefix_statement(node, &self.config.file_errtracking_prefix_code);
        }
    }
}
