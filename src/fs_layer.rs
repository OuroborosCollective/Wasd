use std::fs;
use std::path::Path;
use std::hash::{Hash, Hasher};
use std::collections::hash_map::DefaultHasher;

pub trait Engine {
    fn validate_ast(&self, content: &str) -> bool;
}

pub struct AtomicWriter;

impl AtomicWriter {
    pub fn save_if_valid<P: AsRef<Path>>(
        path: P,
        content: &str,
        engine: &impl Engine,
    ) -> Result<bool, std::io::Error> {
        let path = path.as_ref();
        let new_hash = Self::calculate_hash(content);

        if path.exists() {
            let existing_content = fs::read_to_string(path)?;
            if Self::calculate_hash(&existing_content) == new_hash {
                return Ok(false);
            }
        }

        if !engine.validate_ast(content) {
            return Ok(false);
        }

        let temp_path = path.with_extension("tmp");
        fs::write(&temp_path, content)?;
        fs::rename(&temp_path, path)?;

        Ok(true)
    }

    fn calculate_hash(t: &str) -> u64 {
        let mut s = DefaultHasher::new();
        t.hash(&mut s);
        s.finish()
    }
}