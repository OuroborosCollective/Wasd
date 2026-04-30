use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use anyhow::{Result, Context, anyhow};
use glob::glob;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageJson {
    pub name: String,
    pub version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dependencies: Option<HashMap<String, String>>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "devDependencies")]
    pub dev_dependencies: Option<HashMap<String, String>>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "peerDependencies")]
    pub peer_dependencies: Option<HashMap<String, String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pnpm: Option<PnpmConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PnpmConfig {
    #[serde(skip_serializing_if = "Option::is_none", rename = "patchedDependencies")]
    pub patched_dependencies: Option<HashMap<String, String>>,
}

#[derive(Debug, Deserialize)]
pub struct PnpmWorkspace {
    pub packages: Vec<String>,
}

pub struct Harmonizer {
    pub workspace_root: PathBuf,
}

#[derive(Debug)]
pub struct DependencyConflict {
    pub package_name: String,
    pub required_versions: HashMap<String, String>, // consumer_path -> version_spec
    pub recommended_version: String,
}

impl Harmonizer {
    pub fn new(root: PathBuf) -> Self {
        Self { workspace_root: root }
    }

    pub fn run(&self) -> Result<()> {
        let packages = self.discover_packages()?;
        let conflicts = self.analyze_conflicts(&packages);

        if conflicts.is_empty() {
            println!("No dependency inconsistencies found.");
            return Ok(());
        }

        for conflict in conflicts {
            self.generate_pnpm_patch(&conflict)?;
        }

        Ok(())
    }

    fn discover_packages(&self) -> Result<Vec<(PathBuf, PackageJson)>> {
        let workspace_yaml = self.workspace_root.join("pnpm-workspace.yaml");
        let content = fs::read_to_string(&workspace_yaml)
            .context("Failed to read pnpm-workspace.yaml")?;
        let config: PnpmWorkspace = serde_yaml::from_str(&content)?;

        let mut discovered = Vec::new();

        for pattern in config.packages {
            let full_pattern = self.workspace_root.join(&pattern).join("package.json");
            for entry in glob(full_pattern.to_str().unwrap())? {
                let path = entry?;
                let pkg_content = fs::read_to_string(&path)?;
                let pkg_json: PackageJson = serde_json::from_str(&pkg_content)?;
                discovered.push((path, pkg_json));
            }
        }

        Ok(discovered)
    }

    fn analyze_conflicts(&self, packages: &[(PathBuf, PackageJson)]) -> Vec<DependencyConflict> {
        let mut dep_registry: HashMap<String, HashMap<String, String>> = HashMap::new();

        for (path, pkg) in packages {
            let path_str = path.to_string_lossy().to_string();
            
            let mut process_deps = |deps: &Option<HashMap<String, String>>| {
                if let Some(deps) = deps {
                    for (name, spec) in deps {
                        dep_registry
                            .entry(name.clone())
                            .or_insert_with(HashMap::new)
                            .insert(path_str.clone(), spec.clone());
                    }
                }
            };

            process_deps(&pkg.dependencies);
            process_deps(&pkg.dev_dependencies);
        }

        dep_registry.into_iter()
            .filter(|(_, consumers)| {
                let unique_specs: HashSet<_> = consumers.values().collect();
                unique_specs.len() > 1
            })
            .map(|(name, consumers)| {
                // Heuristic: use the highest version found (simplified)
                let recommended = consumers.values()
                    .max_by(|a, b| a.cmp(b))
                    .unwrap_or(&"latest".to_string())
                    .clone();

                DependencyConflict {
                    package_name: name,
                    required_versions: consumers,
                    recommended_version: recommended,
                }
            })
            .collect()
    }

    fn generate_pnpm_patch(&self, conflict: &DependencyConflict) -> Result<()> {
        println!("Harmonizing {}: pinning to {}", conflict.package_name, conflict.recommended_version);

        // 1. Create patches directory if not exists
        let patches_dir = self.workspace_root.join("patches");
        if !patches_dir.exists() {
            fs::create_dir_all(&patches_dir)?;
        }

        // 2. Logic to invoke `pnpm patch` would go here via Command
        // For this implementation, we simulate the registry update in root package.json
        self.update_root_overrides(&conflict.package_name, &conflict.recommended_version)
    }

    fn update_root_overrides(&self, name: &str, version: &str) -> Result<()> {
        let root_pkg_path = self.workspace_root.join("package.json");
        let content = fs::read_to_string(&root_pkg_path)?;
        let mut pkg_json: serde_json::Value = serde_json::from_str(&content)?;

        // Ensure pnpm.overrides exists
        if pkg_json.get("pnpm").is_none() {
            pkg_json["pnpm"] = serde_json::json!({});
        }
        if pkg_json["pnpm"].get("overrides").is_none() {
            pkg_json["pnpm"]["overrides"] = serde_json::json!({});
        }

        pkg_json["pnpm"]["overrides"][name] = serde_json::json!(version);

        let output = serde_json::to_string_pretty(&pkg_json)?;
        fs::write(root_pkg_path, output)?;

        Ok(())
    }
}

pub fn harmonize_workspace(path: &str) -> Result<()> {
    let harmonizer = Harmonizer::new(PathBuf::from(path));
    harmonizer.run()
}