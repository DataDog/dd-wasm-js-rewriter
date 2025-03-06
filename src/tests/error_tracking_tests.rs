/**
* Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
* This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2022 Datadog, Inc.
**/

#[cfg(test)]
mod tests {

    use crate::{
        tests::{
            rewrite_js, rewrite_js_with_error_tracking, rewrite_js_with_error_tracking_and_iast,
        },
        transform::transform_status::Status,
    };
    use speculoos::{assert_that, string::StrAssertions};

    #[test]
    fn test_basic_catch_block() -> Result<(), String> {
        let original_code =
            "try { nonExistentFunction() } catch (error) { console.error(error) }".to_string();
        let js_file: String = "test.js".to_string();
        let rewritten = rewrite_js_with_error_tracking(original_code.clone(), js_file)
            .map_err(|e| e.to_string())?;

        println!("before");
        println!("{0}", original_code);
        println!("----");
        println!("after");
        println!("{}", rewritten.code);
        println!("----");

        Ok(())
    }

    #[test]
    fn test_catch_array_ident() -> Result<(), String> {
        let original_code =
            "try { nonExistentFunction() } catch ([message, oui]) { console.error(message) }"
                .to_string();
        let js_file: String = "test.js".to_string();
        let rewritten = rewrite_js_with_error_tracking(original_code.clone(), js_file)
            .map_err(|e| e.to_string())?;

        println!("before");
        println!("{0}", original_code);
        println!("----");
        println!("after");
        println!("{}", rewritten.code);
        println!("----");

        Ok(())
    }

    #[test]
    fn test_catch_object_ident() -> Result<(), String> {
        let original_code =
            "try { nonExistentFunction() } catch ({code1, code2}) { console.error(code1) }"
                .to_string();
        let js_file: String = "test.js".to_string();
        let rewritten = rewrite_js_with_error_tracking(original_code.clone(), js_file)
            .map_err(|e| e.to_string())?;

        println!("before");
        println!("{0}", original_code);
        println!("----");
        println!("after");
        println!("{}", rewritten.code);
        println!("----");

        Ok(())
    }

    #[test]
    fn test_catch_without_ident() -> Result<(), String> {
        let original_code =
            "try { nonExistentFunction() } catch { console.error('catch block') }".to_string();
        let js_file: String = "test.js".to_string();
        let rewritten = rewrite_js_with_error_tracking(original_code.clone(), js_file)
            .map_err(|e| e.to_string())?;

        println!("before");
        println!("{0}", original_code);
        println!("----");
        println!("after");
        println!("{}", rewritten.code);
        println!("----");

        Ok(())
    }

    #[test]
    fn test_multiple_catch_blocks() -> Result<(), String> {
        let original_code = "
            try {
                nonExistentFunction()
            } catch ([message, oui]) {
                console.error(message)
            }

            try {
                nonExistentFunction()
            } catch ([message, oui]) {
                console.error(message)
            }

            try {
                nonExistentFunction()
            } catch ([message, oui]) {
                console.error(message)
            }
        "
        .to_string();
        let js_file: String = "test.js".to_string();
        let rewritten = rewrite_js_with_error_tracking(original_code.clone(), js_file)
            .map_err(|e| e.to_string())?;

        println!("before");
        println!("{0}", original_code);
        println!("----");
        println!("after");
        println!("{}", rewritten.code);
        println!("----");

        Ok(())
    }

    #[test]
    fn test_nested_catch_blocks() -> Result<(), String> {
        let original_code = "
            try {
                nonExistentFunction()
            } catch ([message, oui]) {
                console.error(message)
                try {
                    nonExistentFunction()
                } catch ([message, oui]) {
                    console.log(message)
                }
            }
        "
        .to_string();
        let js_file: String = "test.js".to_string();
        let rewritten = rewrite_js_with_error_tracking(original_code.clone(), js_file)
            .map_err(|e| e.to_string())?;

        println!("before");
        println!("{0}", original_code);
        println!("----");
        println!("after");
        println!("{}", rewritten.code);
        println!("----");

        Ok(())
    }

    #[test]
    fn test_errortracking_iast() -> Result<(), String> {
        let original_code = "
            try {
                nonExistentFunction()
            } catch ([message, oui]) {
                let b;const a = 'a' + (b = '_b_', b + c);
            }
        "
        .to_string();
        let js_file: String = "test.js".to_string();
        let rewritten = rewrite_js_with_error_tracking_and_iast(original_code.clone(), js_file)
            .map_err(|e| e.to_string())?;

        println!("before");
        println!("{0}", original_code);
        println!("----");
        println!("after");
        println!("{}", rewritten.code);
        println!("----");

        Ok(())
    }

    #[test]
    fn test_conditional_with_call_add_and_assignation() -> Result<(), String> {
        let original_code = "{a += b ? c(e() + f) : d; {a += b ? c(e() + f) : d;}}";
        let js_file = "test.js".to_string();
        let rewritten =
            rewrite_js(original_code.to_string(), js_file).map_err(|e| e.to_string())?;

        println!("before");
        println!("{0}", original_code);
        println!("----");
        println!("after");
        println!("{}", rewritten.code);
        println!("----");
        Ok(())
    }
}
