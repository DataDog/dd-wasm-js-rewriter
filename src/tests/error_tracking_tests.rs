/**
* Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
* This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2022 Datadog, Inc.
**/

#[cfg(test)]
mod tests {

    use std::collections::HashSet;

    use crate::tests::rewrite_js_with_error_tracking;
    use regex::Regex;
    use speculoos::{assert_that, string::StrAssertions};

    #[test]
    fn test_basic_catch_block() -> Result<(), String> {
        let original_code =
            "try { nonExistentFunction() } catch (error) { console.error(error) }".to_string();
        let js_file: String = "test.js".to_string();
        let rewritten = rewrite_js_with_error_tracking(original_code, js_file, String::new())
            .map_err(|e| e.to_string())?;

        assert_that(&rewritten.code).contains("catch (error) ");
        assert_that(
            &rewritten
                .code
                .contains("_dderrortracking.record_exception(error)"),
        );
        Ok(())
    }

    #[test]
    fn test_catch_array_ident() -> Result<(), String> {
        let original_code =
            "try { nonExistentFunction() } catch ([foo, bar]) { console.error(foo) }".to_string();
        let js_file: String = "test.js".to_string();
        let rewritten =
            rewrite_js_with_error_tracking(original_code, js_file, String::from("test"))
                .map_err(|e| e.to_string())?;

        assert_that(&rewritten.code).contains("catch (__datadog_errortracking_test) ");
        assert_that(
            &rewritten
                .code
                .contains("_dderrortracking.record_exception(__datadog_errortracking_test)"),
        );
        assert_that(
            &rewritten
                .code
                .contains("[foo, bar] = __datadog_errortracking_test"),
        );
        Ok(())
    }

    #[test]
    fn test_catch_object_ident() -> Result<(), String> {
        let original_code =
            "try { nonExistentFunction() } catch ({foo, bar}) { console.error(foo) }".to_string();
        let js_file: String = "test.js".to_string();
        let rewritten =
            rewrite_js_with_error_tracking(original_code, js_file, String::from("test"))
                .map_err(|e| e.to_string())?;
        assert_that(&rewritten.code).contains("catch (__datadog_errortracking_test) ");
        assert_that(
            &rewritten
                .code
                .contains("_dderrortracking.record_exception(__datadog_errortracking_test)"),
        );
        assert_that(
            &rewritten
                .code
                .contains("{foo, bar} = __datadog_errortracking_test"),
        );

        Ok(())
    }

    #[test]
    fn test_catch_without_ident() -> Result<(), String> {
        let original_code =
            "try { nonExistentFunction() } catch { console.error('catch block') }".to_string();
        let js_file: String = "test.js".to_string();
        let rewritten =
            rewrite_js_with_error_tracking(original_code, js_file, String::from("test"))
                .map_err(|e| e.to_string())?;
        assert_that(&rewritten.code).contains("catch (__datadog_errortracking_test) ");
        assert_that(
            &rewritten
                .code
                .contains("_dderrortracking.record_exception(__datadog_errortracking_test)"),
        );

        Ok(())
    }

    #[test]
    fn test_multiple_catch_blocks() -> Result<(), String> {
        let original_code = "
            try {
                nonExistentFunction()
            } catch ([foo, bar]) {
                console.error(foo)
            }

            try {
                nonExistentFunction()
            } catch ([foo, bar]) {
                console.error(foo)
            }
        "
        .to_string();
        let js_file: String = "test.js".to_string();
        let rewritten = rewrite_js_with_error_tracking(original_code, js_file, String::default())
            .map_err(|e| e.to_string())?;

        let re = Regex::new(r"__datadog_errortracking_([a-zA-Z0-9]+)").unwrap();
        let hashes: HashSet<String> = re
            .captures_iter(&rewritten.code)
            .map(|cap| cap[1].to_string())
            .collect();
        assert_eq!(hashes.len(), 2);
        Ok(())
    }

    #[test]
    fn test_nested_catch_blocks() -> Result<(), String> {
        let original_code = "
            try {
                nonExistentFunction()
            } catch ([foo, bar]) {
                console.error(message)
                try {
                    nonExistentFunction()
                } catch ([code1, code2]) {
                    console.log(code1)
                }
            }
        "
        .to_string();
        let js_file: String = "test.js".to_string();
        let rewritten = rewrite_js_with_error_tracking(original_code, js_file, String::default())
            .map_err(|e| e.to_string())?;
        println!("{}", rewritten.code);
        let re = Regex::new(r"__datadog_errortracking_([a-zA-Z0-9]+)").unwrap();
        let hashes: HashSet<String> = re
            .captures_iter(&rewritten.code)
            .map(|cap| cap[1].to_string())
            .collect();
        assert_eq!(hashes.len(), 2);

        Ok(())
    }

    #[test]
    fn test_catch_as_member_expression_arrow_func() -> Result<(), String> {
        let original_code =
            "fetch('1').then(() =>{throw 'did not work'}).catch(error => console.error(error));";
        let js_file: String = "test.js".to_string();
        let rewritten = rewrite_js_with_error_tracking(
            original_code.to_string(),
            js_file,
            String::from("test"),
        )
        .map_err(|e| e.to_string())?;

        assert_that(&rewritten.code.contains(
            "catch(_dderrortracking.record_exception_callback((error)=>console.error(error))",
        ));
        Ok(())
    }

    #[test]
    fn test_catch_as_member_expression_func() -> Result<(), String> {
        let original_code = "fetch('1').then(() =>{throw 'did not work'}).catch(onError);";
        let js_file: String = "test.js".to_string();
        let rewritten = rewrite_js_with_error_tracking(
            original_code.to_string(),
            js_file,
            String::from("test"),
        )
        .map_err(|e| e.to_string())?;

        assert_that(
            &rewritten
                .code
                .contains("catch(_dderrortracking.record_exception_callback(onError)"),
        );
        Ok(())
    }

    #[test]
    fn test_catch_as_member_expression_func_with_this() -> Result<(), String> {
        let original_code = "fetch('1').then(() =>{throw 'did not work'}).catch(this.onError);";
        let js_file: String = "test.js".to_string();
        let rewritten = rewrite_js_with_error_tracking(
            original_code.to_string(),
            js_file,
            String::from("test"),
        )
        .map_err(|e| e.to_string())?;

        assert_that(
            &rewritten
                .code
                .contains("catch(_dderrortracking.record_exception_callback(this.onError)"),
        );
        Ok(())
    }

    #[test]
    fn test_catch_as_member_expression_func_call() -> Result<(), String> {
        let original_code = "fetch('1').then(() =>{throw 'did not work'}).catch(onError(arg));";
        let js_file: String = "test.js".to_string();
        let rewritten = rewrite_js_with_error_tracking(
            original_code.to_string(),
            js_file,
            String::from("test"),
        )
        .map_err(|e| e.to_string())?;

        assert_that(
            &rewritten
                .code
                .contains("catch(_dderrortracking.record_exception_callback(onError(arg)"),
        );
        Ok(())
    }

    #[test]
    fn test_catch_as_member_expression_with_finally() -> Result<(), String> {
        let original_code = "fetch('1').then(() =>{throw 'did not work'}).catch(error => console.error(error)).finally(console.log('foo'));";
        let js_file: String = "test.js".to_string();
        let rewritten = rewrite_js_with_error_tracking(
            original_code.to_string(),
            js_file,
            String::from("test"),
        )
        .map_err(|e| e.to_string())?;

        assert_that(&rewritten.code.contains("catch(_dderrortracking.record_exception_callback((error)=>console.error(error))).finally(console.log('foo'))"));
        Ok(())
    }

    #[test]
    fn test_catch_as_member_expression_complicated_case() -> Result<(), String> {
        let original_code = "fetch('1').then(() =>{throw 'did not work'}).then(doSomething).catch(onError).finally(doSomething);";
        let js_file: String = "test.js".to_string();
        let rewritten = rewrite_js_with_error_tracking(
            original_code.to_string(),
            js_file,
            String::from("test"),
        )
        .map_err(|e| e.to_string())?;

        assert_that(&rewritten.code.contains("then(() =>{throw 'did not work'}).then(doSomething).catch(_dderrortracking.record_exception_callback(onError)).finally(doSomething)"));
        Ok(())
    }
}
