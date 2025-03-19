/**
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
 * This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2022 Datadog, Inc.
 **/
use rand::{thread_rng, Rng};
use std::fmt::Write;
use swc_common::{SyntaxContext, DUMMY_SP};
use swc_ecma_ast::{BindingIdent, Ident, Pat};

pub struct CatchClausePatTransform {}

impl CatchClausePatTransform {
    pub fn to_dd_catch_clause_pat(prefix: &str) -> Pat {
        Pat::Ident(get_new_binding_indent(prefix))
    }
}

pub fn get_new_binding_indent(prefix: &str) -> BindingIdent {
    BindingIdent {
        id: Ident {
            span: DUMMY_SP,
            sym: format!(
                "__datadog_errortracking_{}",
                if prefix.is_empty() {
                    random_hash(16)
                } else {
                    prefix.to_owned()
                }
            )
            .into(),
            optional: false,
            ctxt: SyntaxContext::empty(),
        },
        type_ann: None,
    }
}

fn random_hash(size: usize) -> String {
    let mut rng = thread_rng();
    let mut output = String::new();
    for _ in 0..size {
        let _ = write!(output, "{:x}", rng.gen_range(0..16)); // Generates a hex digit
    }
    output
}
