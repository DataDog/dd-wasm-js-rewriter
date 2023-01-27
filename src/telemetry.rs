/**
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
 * This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2022 Datadog, Inc.
 **/
use swc_ecma_visit::swc_ecma_ast::Expr;

use crate::rewriter::Config;

pub struct PropagationDetail {
    _file_name: String,
    _csi: String,
    _line: u32,
}

#[derive(PartialEq, Eq, serde::Deserialize, Clone, Debug)]
pub enum TelemetryVerbosity {
    Off,
    Mandatory,
    Information,
    Debug,
}

pub trait Telemetry {
    fn inc(&mut self, expr: &Expr);
}

pub enum IastTelemetry {
    Default(DefaultTelemetry),
    NoOp(NoOpTelemetry),
}

impl IastTelemetry {
    pub fn new(config: &Config) -> IastTelemetry {
        if config.verbosity == TelemetryVerbosity::Off {
            return IastTelemetry::NoOp(NoOpTelemetry {});
        }
        IastTelemetry::Default(DefaultTelemetry::with(&config.verbosity))
    }
}

impl Telemetry for IastTelemetry {
    fn inc(&mut self, expr: &Expr) {
        match self {
            IastTelemetry::Default(t) => t.inc(expr),
            IastTelemetry::NoOp(t) => t.inc(expr),
        }
    }
}

pub struct DefaultTelemetry {
    pub verbosity: TelemetryVerbosity,
    pub instrumented_propagation: u32,
    pub propagation_debug: Vec<PropagationDetail>,
}

impl DefaultTelemetry {
    pub fn with(verbosity: &TelemetryVerbosity) -> Self {
        DefaultTelemetry {
            verbosity: verbosity.clone(),
            instrumented_propagation: 0,
            propagation_debug: Vec::new(),
        }
    }
}

impl Telemetry for DefaultTelemetry {
    fn inc(&mut self, expr: &Expr) {
        dbg!(expr);
        self.instrumented_propagation += 1;
        if self.verbosity == TelemetryVerbosity::Debug {}
    }
}

pub struct NoOpTelemetry {}

impl Telemetry for NoOpTelemetry {
    fn inc(&mut self, _expr: &Expr) {}
}
