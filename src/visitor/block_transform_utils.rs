/**
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
 * This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2022 Datadog, Inc.
 **/
use crate::rewriter::Config;
use swc_ecma_ast::{Program, ModuleItem};

pub fn insert_prefix_statement(node: &mut Program, config: &Config) {
    match node {
        Program::Script(script) => {
            let mut index = 0;
            if let Some(stmt) = script.body.first() {
                if stmt.is_use_strict() {
                    index = 1;
                }
            }

            for prefix_statement in config.file_prefix_code.iter().rev() {
                script.body.insert(index, prefix_statement.clone());
            }
        }
        Program::Module(module) => {
            let mut index = 0;
            if let Some(ModuleItem::Stmt(stmt)) = module.body.first() {
                if stmt.is_use_strict() {
                    index = 1;
                }
            }

            for prefix_statement in config.file_prefix_code.iter().rev() {
                module
                    .body
                    .insert(index, ModuleItem::Stmt(prefix_statement.clone()));
            }
        }
    }
}