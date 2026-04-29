pub struct IntegrityRule {
    pub id: &'static str,
    pub category: &'static str,
    pub query: &'static str,
    pub description: &'static str,
}

pub const RULES: &[IntegrityRule] = &[
    IntegrityRule {
        id: "RULE-001",
        category: "naming",
        query: r#"
            (struct_item
              name: (type_identifier) @name
              (#not-match? @name "^[A-Z][a-zA-Z0-9]*$"))
        "#,
        description: "Struct names must follow PascalCase naming convention.",
    },
    IntegrityRule {
        id: "RULE-002",
        category: "naming",
        query: r#"
            (function_item
              name: (identifier) @name
              (#not-match? @name "^[a-z][a-z0-9_]*$"))
        "#,
        description: "Function names must follow snake_case naming convention.",
    },
    IntegrityRule {
        id: "RULE-003",
        category: "naming",
        query: r#"
            (const_item
              name: (identifier) @name
              (#not-match? @name "^[A-Z][A-Z0-9_]*$"))
        "#,
        description: "Constants must follow SCREAMING_SNAKE_CASE naming convention.",
    },
    IntegrityRule {
        id: "RULE-004",
        category: "documentation",
        query: r#"
            (function_item
              (line_comment)* @doc
              .
              (function_item) @func
              (#not-match? @doc "^///"))
        "#,
        description: "Public functions must be documented with triple-slash (///) comments.",
    },
    IntegrityRule {
        id: "RULE-005",
        category: "integrity",
        query: r#"
            (impl_item
              (declaration_list
                (function_item
                  name: (identifier) @name
                  (#eq? @name "new"))))
        "#,
        description: "Implementations providing a 'new' method should generally implement Default.",
    },
];

pub fn get_rules_by_category(category: &str) -> Vec<&'static IntegrityRule> {
    RULES.iter()
        .filter(|r| r.category == category)
        .collect()
}

pub fn get_rule_by_id(id: &str) -> Option<&'static IntegrityRule> {
    RULES.iter().find(|r| r.id == id)
}