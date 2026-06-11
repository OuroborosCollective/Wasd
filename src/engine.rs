use std::error::Error;
use std::fmt;

use tree_sitter::{
    Language, Parser, Point, Query, QueryCursor, StreamingIterator, Tree,
};

#[derive(Clone, Copy, Debug, Eq, PartialEq, Hash)]
pub enum Grammar {
    Rust,
    Python,
    JavaScript,
}

impl Grammar {
    pub fn name(self) -> &'static str {
        match self {
            Grammar::Rust => "rust",
            Grammar::Python => "python",
            Grammar::JavaScript => "javascript",
        }
    }

    pub fn language(self) -> Language {
        match self {
            Grammar::Rust => tree_sitter_rust::LANGUAGE.into(),
            Grammar::Python => tree_sitter_python::LANGUAGE.into(),
            Grammar::JavaScript => tree_sitter_javascript::LANGUAGE.into(),
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Severity {
    Info,
    Warning,
    Error,
    Fatal,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Ord, PartialOrd, Hash)]
pub struct ByteRange {
    pub start: usize,
    pub end: usize,
}

impl ByteRange {
    pub fn new(start: usize, end: usize) -> Self {
        Self { start, end }
    }

    pub fn is_valid_for(self, content: &str) -> bool {
        self.start <= self.end
            && self.end <= content.len()
            && content.is_char_boundary(self.start)
            && content.is_char_boundary(self.end)
    }

    pub fn overlaps(self, other: Self) -> bool {
        self.start < other.end && other.start < self.end
    }
}

#[derive(Clone, Debug)]
pub struct Violation {
    pub rule_id: String,
    pub message: String,
    pub severity: Severity,
    pub grammar: Grammar,
    pub range: ByteRange,
    pub start_position: Point,
    pub end_position: Point,
    pub capture_name: Option<String>,
}

#[derive(Clone, Debug)]
pub struct TransformationReport {
    pub output: String,
    pub replacements_applied: usize,
    pub output_hash: u64,
}

pub trait Rule: Send + Sync {
    fn id(&self) -> &str;
    fn s_expression(&self) -> &str;
    fn message(&self) -> &str;

    fn severity(&self) -> Severity {
        Severity::Error
    }

    /// Optional: only report one named capture, for example `Some("call")`.
    /// If `None`, all captures are reported.
    fn capture_name(&self) -> Option<&str> {
        None
    }
}

#[derive(Debug)]
pub enum EngineError {
    LanguageLoad {
        grammar: Grammar,
        message: String,
    },
    ParseFailed {
        grammar: Grammar,
    },
    SyntaxError {
        grammar: Grammar,
        root_kind: String,
    },
    InvalidQuery {
        grammar: Grammar,
        query: String,
        message: String,
    },
    InvalidByteRange {
        range: ByteRange,
    },
    OverlappingTransformation {
        left: ByteRange,
        right: ByteRange,
    },
    QueryExceededMatchLimit {
        grammar: Grammar,
        rule_id: String,
    },
}

impl fmt::Display for EngineError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            EngineError::LanguageLoad { grammar, message } => {
                write!(f, "failed to load {} grammar: {}", grammar.name(), message)
            }
            EngineError::ParseFailed { grammar } => {
                write!(f, "failed to parse {} source", grammar.name())
            }
            EngineError::SyntaxError { grammar, root_kind } => {
                write!(
                    f,
                    "{} syntax tree contains errors at root kind '{}'",
                    grammar.name(),
                    root_kind
                )
            }
            EngineError::InvalidQuery {
                grammar,
                query,
                message,
            } => {
                write!(
                    f,
                    "invalid {} tree-sitter query '{}': {}",
                    grammar.name(),
                    query,
                    message
                )
            }
            EngineError::InvalidByteRange { range } => {
                write!(f, "invalid UTF-8 byte range {}..{}", range.start, range.end)
            }
            EngineError::OverlappingTransformation { left, right } => {
                write!(
                    f,
                    "overlapping transformation ranges {}..{} and {}..{}",
                    left.start, left.end, right.start, right.end
                )
            }
            EngineError::QueryExceededMatchLimit { grammar, rule_id } => {
                write!(
                    f,
                    "{} query exceeded tree-sitter match limit for rule '{}'",
                    grammar.name(),
                    rule_id
                )
            }
        }
    }
}

impl Error for EngineError {}

pub struct ValidationEngine;

impl ValidationEngine {
    pub fn get_language(grammar: Grammar) -> Language {
        grammar.language()
    }

    pub fn verify_syntax(content: &str, grammar: Grammar) -> bool {
        Self::parse_tree(content, grammar)
            .map(|tree| !tree.root_node().has_error())
            .unwrap_or(false)
    }

    pub fn validate_syntax(content: &str, grammar: Grammar) -> Result<(), EngineError> {
        let tree = Self::parse_tree(content, grammar)?;

        let root = tree.root_node();
        if root.has_error() {
            return Err(EngineError::SyntaxError {
                grammar,
                root_kind: root.kind().to_string(),
            });
        }

        Ok(())
    }

    pub fn parse_tree(content: &str, grammar: Grammar) -> Result<Tree, EngineError> {
        let language = grammar.language();

        let mut parser = Parser::new();
        parser
            .set_language(&language)
            .map_err(|error| EngineError::LanguageLoad {
                grammar,
                message: error.to_string(),
            })?;

        parser
            .parse(content, None)
            .ok_or(EngineError::ParseFailed { grammar })
    }

    pub fn check_rules(
        content: &str,
        grammar: Grammar,
        rules: &[Box<dyn Rule>],
    ) -> Result<Vec<Violation>, EngineError> {
        let language = grammar.language();
        let tree = Self::parse_tree(content, grammar)?;
        let root = tree.root_node();

        let mut violations = Vec::new();

        for rule in rules {
            let query = Query::new(&language, rule.s_expression()).map_err(|error| {
                EngineError::InvalidQuery {
                    grammar,
                    query: rule.s_expression().to_string(),
                    message: error.to_string(),
                }
            })?;

            let wanted_capture = rule.capture_name();
            let capture_names = query.capture_names();

            let mut cursor = QueryCursor::new();
            cursor.set_match_limit(65_536);

            {
                let mut matches = cursor.matches(&query, root, content.as_bytes());

                while let Some(query_match) = matches.next() {
                    for capture in query_match.captures {
                        let capture_name = capture_names
                            .get(capture.index as usize)
                            .copied()
                            .unwrap_or("");

                        if let Some(wanted) = wanted_capture {
                            if capture_name != wanted {
                                continue;
                            }
                        }

                        let node = capture.node;
                        violations.push(Violation {
                            rule_id: rule.id().to_string(),
                            message: rule.message().to_string(),
                            severity: rule.severity(),
                            grammar,
                            range: ByteRange::new(node.start_byte(), node.end_byte()),
                            start_position: node.start_position(),
                            end_position: node.end_position(),
                            capture_name: Some(capture_name.to_string()),
                        });
                    }
                }
            }

            if cursor.did_exceed_match_limit() {
                return Err(EngineError::QueryExceededMatchLimit {
                    grammar,
                    rule_id: rule.id().to_string(),
                });
            }
        }

        violations.sort_by_key(|v| (v.range.start, v.range.end, v.rule_id.clone()));
        Ok(violations)
    }
}

pub struct Transformer;

impl Transformer {
    pub fn apply_transformation(
        content: &str,
        grammar: Grammar,
        query_s_expr: &str,
        replacement: &str,
    ) -> Result<String, EngineError> {
        Ok(Self::apply_transformation_report(
            content,
            grammar,
            query_s_expr,
            replacement,
            None,
        )?
        .output)
    }

    pub fn apply_transformation_for_capture(
        content: &str,
        grammar: Grammar,
        query_s_expr: &str,
        replacement: &str,
        capture_name: &str,
    ) -> Result<String, EngineError> {
        Ok(Self::apply_transformation_report(
            content,
            grammar,
            query_s_expr,
            replacement,
            Some(capture_name),
        )?
        .output)
    }

    pub fn apply_transformation_report(
        content: &str,
        grammar: Grammar,
        query_s_expr: &str,
        replacement: &str,
        wanted_capture: Option<&str>,
    ) -> Result<TransformationReport, EngineError> {
        let language = grammar.language();
        let tree = ValidationEngine::parse_tree(content, grammar)?;

        let query = Query::new(&language, query_s_expr).map_err(|error| {
            EngineError::InvalidQuery {
                grammar,
                query: query_s_expr.to_string(),
                message: error.to_string(),
            }
        })?;

        let capture_names = query.capture_names();
        let mut cursor = QueryCursor::new();
        cursor.set_match_limit(65_536);

        let mut ranges = Vec::<ByteRange>::new();

        {
            let mut matches = cursor.matches(&query, tree.root_node(), content.as_bytes());

            while let Some(query_match) = matches.next() {
                for capture in query_match.captures {
                    let capture_name = capture_names
                        .get(capture.index as usize)
                        .copied()
                        .unwrap_or("");

                    if let Some(wanted) = wanted_capture {
                        if capture_name != wanted {
                            continue;
                        }
                    }

                    let range = ByteRange::new(
                        capture.node.start_byte(),
                        capture.node.end_byte(),
                    );

                    if !range.is_valid_for(content) {
                        return Err(EngineError::InvalidByteRange { range });
                    }

                    ranges.push(range);
                }
            }
        }

        if cursor.did_exceed_match_limit() {
            return Err(EngineError::QueryExceededMatchLimit {
                grammar,
                rule_id: "transformation".to_string(),
            });
        }

        ranges.sort();
        ranges.dedup();

        for pair in ranges.windows(2) {
            let left = pair[0];
            let right = pair[1];

            if left.overlaps(right) {
                return Err(EngineError::OverlappingTransformation { left, right });
            }
        }

        let mut output = content.to_string();

        for range in ranges.iter().rev() {
            output.replace_range(range.start..range.end, replacement);
        }

        ValidationEngine::validate_syntax(&output, grammar)?;

        Ok(TransformationReport {
            output_hash: deterministic_hash64(&output),
            replacements_applied: ranges.len(),
            output,
        })
    }
}

#[derive(Clone, Debug)]
pub struct SimpleRule {
    pub id: String,
    pub query: String,
    pub message: String,
    pub severity: Severity,
    pub capture_name: Option<String>,
}

impl SimpleRule {
    pub fn new(
        id: impl Into<String>,
        query: impl Into<String>,
        message: impl Into<String>,
    ) -> Self {
        Self {
            id: id.into(),
            query: query.into(),
            message: message.into(),
            severity: Severity::Error,
            capture_name: None,
        }
    }

    pub fn with_capture_name(mut self, capture_name: impl Into<String>) -> Self {
        self.capture_name = Some(capture_name.into());
        self
    }

    pub fn with_severity(mut self, severity: Severity) -> Self {
        self.severity = severity;
        self
    }
}

impl Rule for SimpleRule {
    fn id(&self) -> &str {
        &self.id
    }

    fn s_expression(&self) -> &str {
        &self.query
    }

    fn message(&self) -> &str {
        &self.message
    }

    fn severity(&self) -> Severity {
        self.severity
    }

    fn capture_name(&self) -> Option<&str> {
        self.capture_name.as_deref()
    }
}

/// Deterministic FNV-1a 64-bit hash.
/// Good for stable fingerprints, not for cryptographic security.
pub fn deterministic_hash64(input: &str) -> u64 {
    const OFFSET_BASIS: u64 = 0xcbf29ce484222325;
    const PRIME: u64 = 0x00000100000001b3;

    let mut hash = OFFSET_BASIS;

    for byte in input.as_bytes() {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(PRIME);
    }

    hash
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_valid_rust() {
        let source = r#"
            pub fn main() {
                let x = 1;
                println!("{}", x);
            }
        "#;

        assert!(ValidationEngine::verify_syntax(source, Grammar::Rust));
    }

    #[test]
    fn rejects_invalid_rust() {
        let source = r#"
            pub fn main( {
                let x =
            }
        "#;

        assert!(!ValidationEngine::verify_syntax(source, Grammar::Rust));
    }

    #[test]
    fn detects_javascript_date_now() {
        let source = r#"
            const tick = Date.now();
        "#;

        let rule = SimpleRule::new(
            "FORBIDDEN_DATE_NOW",
            r#"
            (
              (call_expression
                function: (member_expression
                  object: (identifier) @object
                  property: (property_identifier) @method)) @call
              (#eq? @object "Date")
              (#eq? @method "now")
            )
            "#,
            "Date.now() is forbidden in deterministic runtime code",
        )
        .with_capture_name("call")
        .with_severity(Severity::Fatal);

        let rules: Vec<Box<dyn Rule>> = vec![Box::new(rule)];
        let violations =
            ValidationEngine::check_rules(source, Grammar::JavaScript, &rules).unwrap();

        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].rule_id, "FORBIDDEN_DATE_NOW");
    }

    #[test]
    fn transforms_rust_integer_literal() {
        let source = r#"
            pub fn main() {
                let x = 1;
            }
        "#;

        let output = Transformer::apply_transformation_for_capture(
            source,
            Grammar::Rust,
            "(integer_literal) @number",
            "2",
            "number",
        )
        .unwrap();

        assert!(output.contains("let x = 2;"));
        assert!(ValidationEngine::verify_syntax(&output, Grammar::Rust));
    }

    #[test]
    fn produces_deterministic_hash() {
        let a = deterministic_hash64("ARELORIA");
        let b = deterministic_hash64("ARELORIA");
        let c = deterministic_hash64("OUROBOROS");

        assert_eq!(a, b);
        assert_ne!(a, c);
    }
                    }
