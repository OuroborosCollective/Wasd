use std::fs;
use std::path::Path;
use std::process::exit;
use std::collections::HashSet;

fn main() {
    let agents_path = "docs/AGENTS.md";
    let logic_path = "docs/world_logic.md";
    let matrix_path = "docs/CONTENT_STATUS_MATRIX.md";

    let mut errors = Vec::new();

    let agents_content = read_file(agents_path, &mut errors);
    let logic_content = read_file(logic_path, &mut errors);
    let matrix_content = read_file(matrix_path, &mut errors);

    if !errors.is_empty() {
        print_errors_and_exit(errors);
    }

    let agents = extract_agents(&agents_content);
    let matrix_entities = extract_matrix_entities(&matrix_content);
    let logic_rules = extract_logic_keys(&logic_content);

    // Validation 1: Every Agent must be in the Status Matrix
    for agent in &agents {
        if !matrix_entities.contains(agent) {
            errors.push(format!("Inconsistency: Agent '{}' defined in AGENTS.md but missing in CONTENT_STATUS_MATRIX.md", agent));
        }
    }

    // Validation 2: Every Entity in Matrix should be documented (as Agent or Logic Object)
    for entity in &matrix_entities {
        if !agents.contains(entity) && !logic_content.contains(entity) {
            errors.push(format!("Inconsistency: Entity '{}' found in CONTENT_STATUS_MATRIX.md but not documented in AGENTS.md or world_logic.md", entity));
        }
    }

    // Validation 3: Cross-check logic keys in matrix headers
    for rule in &logic_rules {
        if !matrix_content.contains(rule) {
            errors.push(format!("Inconsistency: Logic rule/tag '{}' from world_logic.md not referenced in CONTENT_STATUS_MATRIX.md headers", rule));
        }
    }

    if errors.is_empty() {
        println!("Success: Synchronization between AGENTS.md, world_logic.md, and CONTENT_STATUS_MATRIX.md validated.");
        exit(0);
    } else {
        print_errors_and_exit(errors);
    }
}

fn read_file(path: &str, errors: &mut Vec<String>) -> String {
    match fs::read_to_string(Path::new(path)) {
        Ok(content) => content,
        Err(e) => {
            errors.push(format!("Error reading {}: {}", path, e));
            String::new()
        }
    }
}

fn extract_agents(content: &str) -> HashSet<String> {
    let mut agents = HashSet::new();
    for line in content.lines() {
        let trimmed = line.trim();
        // Looking for Markdown headers like ## AgentName or list items - AgentName
        if trimmed.starts_with("## ") {
            agents.insert(trimmed.trim_start_matches("## ").to_string());
        } else if trimmed.starts_with("- ") && !trimmed.contains(':') {
             agents.insert(trimmed.trim_start_matches("- ").to_string());
        }
    }
    agents
}

fn extract_matrix_entities(content: &str) -> HashSet<String> {
    let mut entities = HashSet::new();
    let mut table_found = false;
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with('|') {
            if trimmed.contains("---") {
                table_found = true;
                continue;
            }
            if table_found {
                let parts: Vec<&str> = trimmed.split('|').collect();
                if parts.len() > 2 {
                    let entity = parts[1].trim();
                    if !entity.is_empty() && entity != "Entity" && entity != "Agent" {
                        entities.insert(entity.to_string());
                    }
                }
            }
        }
    }
    entities
}

fn extract_logic_keys(content: &str) -> Vec<String> {
    let mut keys = Vec::new();
    // Logic keys are expected in backticks like `REQUIRED_STATE`
    let mut current = content;
    while let Some(start) = current.find('`') {
        let remaining = &current[start + 1..];
        if let Some(end) = remaining.find('`') {
            let key = &remaining[..end];
            if key.chars().all(|c| c.is_uppercase() || c == '_') && key.len() > 3 {
                keys.push(key.to_string());
            }
            current = &remaining[end + 1..];
        } else {
            break;
        }
    }
    keys
}

fn print_errors_and_exit(errors: Vec<String>) {
    eprintln!("Validation Failed:");
    for err in errors {
        eprintln!("  - {}", err);
    }
    exit(1);
}