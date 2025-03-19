use std::hash::{Hash, Hasher};
/**
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
 * This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2022 Datadog, Inc.
 **/
use swc_ecma_ast::{ModuleItem, Program, Stmt};

pub fn insert_prefix_statement(node: &mut Program, prefix_stmts: &[Stmt]) {
    match node {
        Program::Script(script) => {
            let mut index = 0;
            if let Some(stmt) = script.body.first() {
                if stmt.is_use_strict() {
                    index = 1;
                }
            }

            for prefix_statement in prefix_stmts.iter().rev() {
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

            for prefix_statement in prefix_stmts.iter().rev() {
                module
                    .body
                    .insert(index, ModuleItem::Stmt(prefix_statement.clone()));
            }
        }
    }
}

pub fn get_program_hash(node: &mut Program) -> u64 {
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    node.hash(&mut hasher);
    hasher.finish()
}
