use git2::{Repository, Error, Sort};
use std::collections::HashSet;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

pub struct GitMetadataParser;

impl GitMetadataParser {
    pub fn get_audit_scope(repo_path: &str) -> Result<HashSet<PathBuf>, Error> {
        let repo = Repository::open(repo_path)?;
        let mut revwalk = repo.revwalk()?;
        
        revwalk.set_sorting(Sort::TIME | Sort::TOPOLOGICAL)?;
        revwalk.push_head()?;

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|_| Error::from_str("Clock drifted before epoch"))?
            .as_secs() as i64;
        
        let seconds_in_48_hours = 48 * 60 * 60;
        let threshold = now - seconds_in_48_hours;

        let mut modified_files = HashSet::new();

        for oid_result in revwalk {
            let oid = oid_result?;
            let commit = repo.find_commit(oid)?;
            
            if commit.time().seconds() < threshold {
                break;
            }

            let current_tree = commit.tree()?;
            
            if commit.parent_count() > 0 {
                for parent in commit.parents() {
                    let parent_tree = parent.tree()?;
                    let diff = repo.diff_tree_to_tree(Some(&parent_tree), Some(&current_tree), None)?;
                    
                    diff.foreach(
                        &mut |delta, _| {
                            if let Some(path) = delta.new_file().path() {
                                modified_files.insert(path.to_path_buf());
                            }
                            true
                        },
                        None,
                        None,
                        None,
                    )?;
                }
            } else {
                let diff = repo.diff_tree_to_tree(None, Some(&current_tree), None)?;
                diff.foreach(
                    &mut |delta, _| {
                        if let Some(path) = delta.new_file().path() {
                            modified_files.insert(path.to_path_buf());
                        }
                        true
                    },
                    None,
                    None,
                    None,
                )?;
            }
        }

        Ok(modified_files)
    }
}