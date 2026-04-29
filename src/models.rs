pub struct FileMetadata {
    pub path: String,
    pub hash: String,
    pub last_modified: u64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Range {
    pub start_line: usize,
    pub start_col: usize,
    pub end_line: usize,
    pub end_col: usize,
}

pub struct SymbolDefinition {
    pub name: String,
    pub kind: String,
    pub range: Range,
}

pub struct FixAction {
    pub query_name: String,
    pub replacement: String,
}

pub struct ConvergenceState {
    pub iteration_count: u32,
    pub is_stable: bool,
    pub modified_files: Vec<String>,
}