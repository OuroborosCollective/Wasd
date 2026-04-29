use git2::{Repository, DiffOptions, Sort};
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

pub struct GitMetadataParser;

impl GitMetadataParser {
    pub fn get_recent_files(repo_path: &Path, window: Duration) -> Result<HashSet<PathBuf>, git2::Error> {
        let repo = Repository::open(repo_path)?;
        let mut revwalk = repo.revwalk()?;
        
        if let Err(_) = revwalk.push_head() {
            return Ok(HashSet::new());
        }
        
        revwalk.set_sorting(Sort::TIME)?;

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0);
        
        let cutoff = now - (window.as_secs() as i64);
        let mut file_set = HashSet::new();

        for oid_result in revwalk {
            let oid = match oid_result {
                Ok(id) => id,
                Err(_) => continue,
            };
            
            let commit = repo.find_commit(oid)?;
            
            if commit.time().seconds() < cutoff {
                break;
            }

            let current_tree = commit.tree()?;
            let parent_tree = if commit.parent_count() > 0 {
                commit.parent(0).ok().and_then(|p| p.tree().ok())
            } else {
                None
            };

            let mut opts = DiffOptions::new();
            let diff = repo.diff_tree_to_tree(
                parent_tree.as_ref(),
                Some(&current_tree),
                Some(&mut opts),
            )?;

            diff.foreach(
                &mut |delta, _| {
                    if let Some(path) = delta.new_file().path() {
                        file_set.insert(path.to_path_buf());
                    }
                    true
                },
                None,
                None,
                None,
            )?;
        }

        Ok(file_set)
    }
}