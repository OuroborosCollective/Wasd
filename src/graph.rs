use std::collections::{HashMap, HashSet, VecDeque};
use tree_sitter::{Parser, Language, Query, QueryCursor};

pub struct SymbolLocation {
    pub file_path: String,
    pub start_line: usize,
    pub start_column: usize,
}

pub struct DependencyGraphMapper {
    symbol_index: HashMap<String, SymbolLocation>,
    dependents: HashMap<String, HashSet<String>>,
    language: Language,
}

impl DependencyGraphMapper {
    pub fn new(language: Language) -> Self {
        Self {
            symbol_index: HashMap::new(),
            dependents: HashMap::new(),
            language,
        }
    }

    pub fn index_file(&mut self, path: &str, source: &str) {
        let mut parser = Parser::new();
        parser.set_language(self.language).expect("Failed to set tree-sitter language");
        let tree = parser.parse(source, None).expect("Failed to parse source code");

        let query_str = r#"
            [
                (function_item name: (identifier) @def)
                (struct_item name: (type_identifier) @def)
                (enum_item name: (type_identifier) @def)
                (trait_item name: (identifier) @def)
                (type_item name: (type_identifier) @def)
                (impl_item type: (type_identifier) @def)
            ]
            (call_expression function: (identifier) @use)
            (type_identifier) @use
            (field_identifier) @use
        "#;

        let query = Query::new(self.language, query_str).expect("Failed to create tree-sitter query");
        let mut cursor = QueryCursor::new();
        let matches = cursor.matches(&query, tree.root_node(), source.as_bytes());

        let mut current_scope_defs = Vec::new();

        for m in matches {
            for capture in m.captures {
                let node = capture.node;
                let text = node.utf8_text(source.as_bytes()).unwrap_or("").to_string();
                let capture_name = query.capture_names()[capture.index as usize].as_str();

                match capture_name {
                    "def" => {
                        let pos = node.start_position();
                        self.symbol_index.insert(text.clone(), SymbolLocation {
                            file_path: path.to_string(),
                            start_line: pos.row,
                            start_column: pos.column,
                        });
                        current_scope_defs.push(text);
                    }
                    "use" => {
                        if let Some(parent) = current_scope_defs.last() {
                            if &text != parent {
                                self.dependents
                                    .entry(text)
                                    .or_default()
                                    .insert(parent.clone());
                            }
                        }
                    }
                    _ => {}
                }
            }
        }
    }

    pub fn get_impact_scope(&self, symbol: &str) -> Vec<String> {
        let mut impacted = HashSet::new();
        let mut queue = VecDeque::new();
        
        queue.push_back(symbol.to_string());

        while let Some(current_symbol) = queue.pop_front() {
            if let Some(users) = self.dependents.get(&current_symbol) {
                for user in users {
                    if !impacted.contains(user) {
                        impacted.insert(user.clone());
                        queue.push_back(user.clone());
                    }
                }
            }
        }

        impacted.into_iter().collect()
    }

    pub fn get_symbol_location(&self, symbol: &str) -> Option<&SymbolLocation> {
        self.symbol_index.get(symbol)
    }

    pub fn clear_index(&mut self) {
        self.symbol_index.clear();
        self.dependents.clear();
    }
}