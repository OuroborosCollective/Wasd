use clap::{Parser, Subcommand};
use indicatif::{ProgressBar, ProgressStyle};
use std::path::PathBuf;

mod executor;
use crate::executor::{FixedPointExecutor, ExecutionMode, Status};

#[derive(Parser)]
#[command(name = "fp-executor")]
#[command(version = "1.0")]
#[command(about = "CLI tool for fixed-point convergence auditing and fixing", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Audits the file system for convergence without making permanent changes
    Audit {
        /// Target path to monitor
        #[arg(short, long, value_name = "PATH")]
        path: PathBuf,

        /// Sliding window size for stability check
        #[arg(short, long, default_value_t = 10)]
        window: usize,
    },
    /// Executes fixes until a fixed point is reached
    Fix {
        /// Target path to modify
        #[arg(short, long, value_name = "PATH")]
        path: PathBuf,

        /// Sliding window size for stability check
        #[arg(short, long, default_value_t = 10)]
        window: usize,
    },
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let cli = Cli::parse();

    let pb = ProgressBar::new_spinner();
    pb.set_style(
        ProgressStyle::with_template("Iteration [{pos}], Current: [{msg}], Status: [{status}]")?
            .with_key("status", |state: &indicatif::ProgressState, w: &mut dyn std::fmt::Write| {
                let status = state.get_var("status").map(|s| s.to_string()).unwrap_or_else(|| "Initializing".to_string());
                write!(w, "{}", status).unwrap();
            })
    );

    let (path, window, mode) = match cli.command {
        Commands::Audit { path, window } => (path, window, ExecutionMode::Audit),
        Commands::Fix { path, window } => (path, window, ExecutionMode::Fix),
    };

    let mut executor = FixedPointExecutor::new(path, window);

    executor.execute(mode, |iteration, current_path, status| {
        pb.set_position(iteration as u64);
        pb.set_message(current_path.to_string_lossy().into_owned());
        
        let status_text = match status {
            Status::Resetting => "Resetting",
            Status::Converged => "Converged",
            Status::Running => "Processing",
        };
        
        pb.set_variable("status", status_text);
        pb.tick();
    })?;

    pb.finish_with_message("Execution complete.");
    Ok(())
}