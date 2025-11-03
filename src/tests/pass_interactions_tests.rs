/**
* Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
* This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2022 Datadog, Inc.
**/

#[cfg(test)]
mod tests {

    use crate::{
        tests::rewrite_js_with_error_tracking_and_iast, transform::transform_status::Status,
    };
    use speculoos::{assert_that, string::StrAssertions};

    #[test]
    fn test_arrow_modified_and_errortracking() -> Result<(), String> {
        let original_code = "
        try {
            const a = (arg) => arg ? `hello ${arg}` : ''
        } catch (error) {
            console.log(error)
        }";
        let js_file = "test.js".to_string();
        let rewritten = rewrite_js_with_error_tracking_and_iast(original_code.to_string(), js_file)
            .map_err(|e| e.to_string())?;

        assert_that(
            &rewritten
                .transform_status
                .is_some_and(|status| status.status == Status::Modified),
        );
        assert_that(&rewritten.code).contains("const a = (arg)=>{
        let __datadog_test_0;
        return arg ? (__datadog_test_0 = arg, _ddiast.tplOperator(`hello ${__datadog_test_0}`, __datadog_test_0)) : '';
    };");
        assert_that(&rewritten.code).contains("_dderrortracking.record_exception(error)");

        Ok(())
    }
}
