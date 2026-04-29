use std::path::PathBuf;

pub struct EngineResult {
    pub mutated: bool,
}

pub trait Engine {
    fn run(&self, file_path: &PathBuf) -> EngineResult;
}

pub struct FixedPointExecutor<'a> {
    engine: &'a dyn Engine,
    files: Vec<PathBuf>,
}

impl<'a> FixedPointExecutor<'a> {
    pub fn new(engine: &'a dyn Engine, files: Vec<PathBuf>) -> Self {
        Self { engine, files }
    }

    pub fn execute(&self) {
        loop {
            let mut mutation_detected_in_pass = false;

            for file in &self.files {
                let result = self.engine.run(file);

                if result.mutated {
                    println!("[FixedPointExecutor] Mutation detected in file: {:?}. Restarting audit cycle.", file);
                    mutation_detected_in_pass = true;
                    break;
                }
            }

            if !mutation_detected_in_pass {
                println!("[FixedPointExecutor] Convergence reached. No mutations detected in a complete pass.");
                break;
            }
        }
    }
}