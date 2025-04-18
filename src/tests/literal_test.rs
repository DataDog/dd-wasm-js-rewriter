/**
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
 * This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2022 Datadog, Inc.
 **/

#[cfg(test)]
mod tests {
    use speculoos::assert_that;

    use crate::tests::{get_literals_config, rewrite_js_with_config};

    #[test]
    fn test_literal_outside_block() -> Result<(), String> {
        let original_code = "const b = 1

            /*
            comment
             */

            const a = 'literal_literal';"
            .to_string();

        let rewritten = rewrite_js_with_config(original_code, &mut get_literals_config())
            .map_err(|e| e.to_string())?;

        assert_that(&rewritten.literals_result.is_some());
        let result = rewritten.literals_result.unwrap();

        let literal_info = result.literals.get(0).unwrap();

        assert_that(&literal_info.locations.len()).is_equal_to(1);

        assert_that(&literal_info.value).is_equal_to("literal_literal".to_string());
        assert_that(&literal_info.locations[0].line).is_equal_to(7);

        Ok(())
    }

    #[test]
    fn test_literal_inside_block() -> Result<(), String> {
        let original_code = "{ const secret = 'literal_literal'; }".to_string();

        let rewritten = rewrite_js_with_config(original_code, &mut get_literals_config())
            .map_err(|e| e.to_string())?;

        assert_that(&rewritten.literals_result.is_some());
        let result = rewritten.literals_result.unwrap();
        let literal_info = result.literals.get(0).unwrap();

        assert_that(&literal_info.locations.len()).is_equal_to(1);

        assert_that(&literal_info.value).is_equal_to("literal_literal".to_string());
        assert_that(&literal_info.locations[0].line).is_equal_to(1);

        Ok(())
    }

    #[test]
    fn test_multiple_literal() -> Result<(), String> {
        let original_code = "
            const secret = 'literal_literal';
            const b = getB();
            const repeated = 'literal_literal';
        "
        .to_string();

        let rewritten = rewrite_js_with_config(original_code, &mut get_literals_config())
            .map_err(|e| e.to_string())?;

        assert_that(&rewritten.literals_result.is_some());
        let result = rewritten.literals_result.unwrap();
        let literal_info = result.literals.get(0).unwrap();

        assert_that(&literal_info.locations.len()).is_equal_to(2);

        assert_that(&literal_info.value).is_equal_to("literal_literal".to_string());

        let location1 = &literal_info.locations[0];
        let location2 = &literal_info.locations[1];
        if location1.ident == Some("secret".to_string()) {
            assert_that(&location1.line).is_equal_to(2);
            assert_that(&location2.line).is_equal_to(4);
            assert_that(&location2.ident).is_equal_to(Some("repeated".to_string()));
        } else {
            assert_that(&location1.line).is_equal_to(4);
            assert_that(&location2.line).is_equal_to(2);
            assert_that(&location2.ident).is_equal_to(Some("secret".to_string()));
        }

        Ok(())
    }

    #[test]
    fn test_literal_inside_obj_prop() -> Result<(), String> {
        let original_code = "{ const a = { secret: 'literal_literal' }; }".to_string();

        let rewritten = rewrite_js_with_config(original_code, &mut get_literals_config())
            .map_err(|e| e.to_string())?;

        assert_that(&rewritten.literals_result.is_some());
        let result = rewritten.literals_result.unwrap();
        let literal_info = result.literals.get(0).unwrap();

        assert_that(&literal_info.locations.len()).is_equal_to(1);

        assert_that(&literal_info.value).is_equal_to("literal_literal".to_string());
        assert_that(&literal_info.locations[0].line).is_equal_to(1);

        Ok(())
    }

    #[test]
    fn test_literal_as_argument() -> Result<(), String> {
        let original_code = "{ login('literal_literal') }".to_string();

        let rewritten = rewrite_js_with_config(original_code, &mut get_literals_config())
            .map_err(|e| e.to_string())?;

        assert_that(&rewritten.literals_result.is_some());
        let result = rewritten.literals_result.unwrap();
        let literal_info = result.literals.get(0).unwrap();

        assert_that(&literal_info.locations.len()).is_equal_to(1);

        assert_that(&literal_info.value).is_equal_to("literal_literal".to_string());
        assert_that(&literal_info.locations[0].line).is_equal_to(1);
        assert_that(&literal_info.locations[0].column).is_equal_to(9);

        Ok(())
    }

    #[test]
    fn test_literal_skipped_due_length() -> Result<(), String> {
        let original_code = "{ const a = 'literal'; }".to_string();

        let rewritten = rewrite_js_with_config(original_code, &mut get_literals_config())
            .map_err(|e| e.to_string())?;

        assert_that(&rewritten.literals_result.is_some());
        assert_that(&rewritten.literals_result.unwrap().literals.len()).is_equal_to(0);
        Ok(())
    }

    #[test]
    fn test_require_literals_discarded() -> Result<(), String> {
        let original_code = "const a = require('literal_literal')".to_string();

        let rewritten = rewrite_js_with_config(original_code, &mut get_literals_config())
            .map_err(|e| e.to_string())?;

        assert_that(&rewritten.literals_result.is_some());
        assert_that(&rewritten.literals_result.unwrap().literals.len()).is_equal_to(0);

        Ok(())
    }

    #[test]
    fn test_require_literals_with_no_literal_discarded() -> Result<(), String> {
        let original_code = "const a = require(getmodule())".to_string();

        let rewritten = rewrite_js_with_config(original_code, &mut get_literals_config())
            .map_err(|e| e.to_string())?;

        assert_that(&rewritten.literals_result.is_some());
        assert_that(&rewritten.literals_result.unwrap().literals.len()).is_equal_to(0);

        Ok(())
    }

    #[test]
    fn test_require_literals_with_no_literal_spread_discarded() -> Result<(), String> {
        let original_code = "const a = require(...a)".to_string();

        let rewritten = rewrite_js_with_config(original_code, &mut get_literals_config())
            .map_err(|e| e.to_string())?;

        assert_that(&rewritten.literals_result.is_some());
        assert_that(&rewritten.literals_result.unwrap().literals.len()).is_equal_to(0);

        Ok(())
    }

    #[test]
    fn test_non_require_calls_literals_included() -> Result<(), String> {
        let original_code = "const a = no_require('literal_literal')".to_string();

        let rewritten = rewrite_js_with_config(original_code, &mut get_literals_config())
            .map_err(|e| e.to_string())?;

        assert_that(&rewritten.literals_result.is_some());
        assert_that(&rewritten.literals_result.unwrap().literals.len()).is_equal_to(1);

        Ok(())
    }

    #[test]
    fn test_new_regexp_is_discarded() -> Result<(), String> {
        let original_code = "const a = new RegExp('literal_literal')".to_string();

        let rewritten = rewrite_js_with_config(original_code, &mut get_literals_config())
            .map_err(|e| e.to_string())?;

        assert_that(&rewritten.literals_result.is_some());
        assert_that(&rewritten.literals_result.unwrap().literals.len()).is_equal_to(0);

        Ok(())
    }

    #[test]
    fn test_regexp_is_discarded() -> Result<(), String> {
        let original_code = "const a = /literal_literal/".to_string();

        let rewritten = rewrite_js_with_config(original_code, &mut get_literals_config())
            .map_err(|e| e.to_string())?;

        assert_that(&rewritten.literals_result.is_some());
        assert_that(&rewritten.literals_result.unwrap().literals.len()).is_equal_to(0);

        Ok(())
    }
}
