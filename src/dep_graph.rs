use petgraph::graph::{DiGraph, NodeIndex};
use petgraph::Direction;
use regex::Regex;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};

pub struct DependencyGraphMapper {
    pub graph: DiGraph<PathBuf, ()>,
    node_map: HashMap<PathBuf, NodeIndex>,
}

impl DependencyGraphMapper {
    pub fn new() -> Self {
        Self {
            graph: DiGraph::new(),
            node_map: HashMap::new(),
        }
    }

    pub fn build_graph<P: AsRef<Path>>(&mut self, root_files: Vec<P>) -> Result<(), Box<dyn std::error::Error>> {
        let import_regex = Regex::new(r#"(?:import|export|from|require)\s*\(?\s*['"]([^'"]+)['"]"#)?;
        let mut visited = HashSet::new();
        let mut queue: Vec<PathBuf> = root_files
            .into_iter()
            .filter_map(|p| fs::canonicalize(p).ok())
            .collect();

        while let Some(current_path) = queue.pop() {
            if visited.contains(&current_path) {
                continue;
            }
            visited.insert(current_path.clone());

            let source_idx = self.get_or_create_node(&current_path);
            
            if let Ok(content) = fs::read_to_string(&current_path) {
                for cap in import_regex.captures_iter(&content) {
                    let import_path_str = &cap[1];
                    if let Some(resolved_path) = self.resolve_path(&current_path, import_path_str) {
                        let target_idx = self.get_or_create_node(&resolved_path);
                        if !self.graph.contains_edge(source_idx, target_idx) {
                            self.graph.add_edge(source_idx, target_idx, ());
                        }
                        if !visited.contains(&resolved_path) {
                            queue.push(resolved_path);
                        }
                    }
                }
            }
        }
        Ok(())
    }

    fn get_or_create_node(&mut self, path: &PathBuf) -> NodeIndex {
        if let Some(&idx) = self.node_map.get(path) {
            idx
        } else {
            let idx = self.graph.add_node(path.clone());
            self.node_map.insert(path.clone(), idx);
            idx
        }
    }

    fn resolve_path(&self, base_file: &Path, import_str: &str) -> Option<PathBuf> {
        if !import_str.starts_with('.') {
            return None;
        }

        let parent = base_file.parent()?;
        let candidate_base = parent.join(import_str);

        let extensions = ["", ".ts", ".js", ".tsx", ".jsx", "/index.ts", "/index.js"];
        for ext in extensions {
            let path = if ext.is_empty() {
                candidate_base.clone()
            } else if ext.starts_with('/') {
                candidate_base.join(&ext[1..])
            } else {
                let mut p = candidate_base.clone();
                let mut s = p.to_string_lossy().into_owned();
                s.push_str(ext);
                PathBuf::from(s)
            };

            if path.exists() && path.is_file() {
                return fs::canonicalize(path).ok();
            }
        }
        None
    }

    pub fn get_dependencies(&self, path: &Path) -> Vec<PathBuf> {
        if let Ok(abs_path) = fs::canonicalize(path) {
            if let Some(&idx) = self.node_map.get(&abs_path) {
                return self.graph
                    .neighbors_directed(idx, Direction::Outgoing)
                    .map(|n| self.graph[n].clone())
                    .collect();
            }
        }
        vec![]
    }

    pub fn get_dependents(&self, path: &Path) -> Vec<PathBuf> {
        if let Ok(abs_path) = fs::canonicalize(path) {
            if let Some(&idx) = self.node_map.get(&abs_path) {
                return self.graph
                    .neighbors_directed(idx, Direction::Incoming)
                    .map(|n| self.graph[n].clone())
                    .collect();
            }
        }
        vec![]
    }

    pub fn get_full_context_bfs(&self, path: &Path, max_depth: usize) -> Vec<PathBuf> {
        let mut context = Vec::new();
        if let Ok(abs_path) = fs::canonicalize(path) {
            if let Some(&start_idx) = self.node_map.get(&abs_path) {
                let mut bfs = petgraph::visit::Bfs::new(&self.graph, start_idx);
                while let Some(nx) = bfs.next(&self.graph) {
                    if self.graph[nx] != abs_path {
                        context.push(self.graph[nx].clone());
                    }
                    if context.len() >= max_depth {
                        break;
                    }
                }
            }
        }
        context
    }
}