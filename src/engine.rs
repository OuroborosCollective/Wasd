use tree_sitter::{Parser, Language, Node};
use std::collections::HashMap;

pub trait ValidationRule {
    fn check_and_fix(&self, root_node: &Node, source_code: &str) -> (bool, String);
}

pub struct MultiLanguageEngine {
    languages: HashMap<String, Language>,
    rules: Vec<Box<dyn ValidationRule>>,
}

impl MultiLanguageEngine {
    pub fn new() -> Self {
        MultiLanguageEngine {
            languages: HashMap::new(),
            rules: Vec::new(),
        }
    }

    pub fn register_language(&mut self, name: &str, language: Language) {
        self.languages.insert(name.to_string(), language);
    }

    pub fn add_rule(&mut self, rule: Box<dyn ValidationRule>) {
        self.rules.push(rule);
    }

    pub fn apply_transformations(&self, language_name: &str, source: &str) -> (bool, String) {
        let language = match self.languages.get(language_name) {
            Some(lang) => lang,
            None => return (false, source.to_string()),
        };

        let mut parser = Parser::new();
        parser.set_language(*language).expect("Failed to set tree-sitter language");

        let mut current_source = source.to_string();
        let mut overall_changed = false;

        for rule in &self.rules {
            let tree = parser.parse(&current_source, None).expect("Failed to parse source code");
            let (changed, updated_source) = rule.check_and_fix(&tree.root_node(), &current_source);
            
            if changed {
                current_source = updated_source;
                overall_changed = true;
            }
        }

        (overall_changed, current_source)
    }

    pub fn list_registered_languages(&self) -> Vec<String> {
        self.languages.keys().cloned().collect()
    }
}

pub struct ExampleNoOpRule;

impl ValidationRule for ExampleNoOpRule {
    fn check_and_fix(&self, _root_node: &Node, source_code: &str) -> (bool, String) {
        (false, source_code.to_string())
    }
}