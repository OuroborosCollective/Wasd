use tree_sitter::{Language, Parser, Query, QueryCursor};

pub enum Grammar {
    Rust,
    Python,
    JavaScript,
}

pub trait Rule {
    fn s_expression(&self) -> &str;
    fn message(&self) -> &str;
}

pub struct ValidationEngine;

impl ValidationEngine {
    pub fn get_language(lang: Grammar) -> Language {
        match lang {
            Grammar::Rust => tree_sitter_rust::language(),
            Grammar::Python => tree_sitter_python::language(),
            Grammar::JavaScript => tree_sitter_javascript::language(),
        }
    }

    pub fn verify_syntax(content: &str, lang: Grammar) -> bool {
        let mut parser = Parser::new();
        let ts_lang = Self::get_language(lang);
        parser.set_language(ts_lang).expect("Failed to load grammar");
        match parser.parse(content, None) {
            Some(tree) => !tree.root_node().has_error(),
            None => false,
        }
    }

    pub fn check_rules(content: &str, lang: Grammar, rules: &[Box<dyn Rule>]) -> Vec<(usize, usize, String)> {
        let ts_lang = Self::get_language(lang);
        let mut parser = Parser::new();
        parser.set_language(ts_lang).unwrap();
        let tree = parser.parse(content, None).unwrap();
        let mut violations = Vec::new();

        for rule in rules {
            let query = Query::new(ts_lang, rule.s_expression()).expect("Invalid S-expression query");
            let mut cursor = QueryCursor::new();
            let matches = cursor.matches(&query, tree.root_node(), content.as_bytes());

            for m in matches {
                for capture in m.captures {
                    violations.push((
                        capture.node.start_byte(),
                        capture.node.end_byte(),
                        rule.message().to_string(),
                    ));
                }
            }
        }
        violations
    }
}

pub struct Transformer;

impl Transformer {
    pub fn apply_transformation(
        content: &str,
        lang: Grammar,
        query_s_expr: &str,
        replacement: &str,
    ) -> Result<String, String> {
        let ts_lang = ValidationEngine::get_language(lang);
        let query = Query::new(ts_lang, query_s_expr).map_err(|e| e.to_string())?;
        let mut parser = Parser::new();
        parser.set_language(ts_lang).unwrap();
        let tree = parser.parse(content, None).unwrap();
        let mut cursor = QueryCursor::new();
        
        let mut matches: Vec<(usize, usize)> = cursor
            .matches(&query, tree.root_node(), content.as_bytes())
            .flat_map(|m| m.captures.iter().map(|c| (c.node.start_byte(), c.node.end_byte())))
            .collect();

        // Sort descending to prevent index shifts during string manipulation
        matches.sort_by(|a, b| b.0.cmp(&a.0));
        matches.dedup();

        let mut output = content.to_string();
        for (start, end) in matches {
            output.replace_range(start..end, replacement);
        }

        // Validate that the transformation did not break the AST
        if !ValidationEngine::verify_syntax(&output, lang) {
            return Err("Transformation resulted in invalid syntax".to_string());
        }

        Ok(output)
    }
}

pub struct SimpleRule {
    pub query: String,
    pub message: String,
}

impl Rule for SimpleRule {
    fn s_expression(&self) -> &str {
        &self.query
    }
    fn message(&self) -> &str {
        &self.message
    }
}