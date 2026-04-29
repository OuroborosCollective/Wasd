use clap::Parser;
use std::error::Error;
use std::path::PathBuf;
use std::time::Duration;
use tokio::time::sleep;

mod git_parser;
mod dependency_mapper;
mod fixed_point_executor;

use git_parser::GitParser;
use dependency_mapper::DependencyMapper;
use fixed_point_executor::FixedPointExecutor;

#[derive(Parser, Debug)]
#[command(name = "git-converge")]
#[command(author = "System")]
#[command(version = "1.0")]
#[command(about = "Orchestrates dependency resolution until fixed point convergence", long_about = None)]
struct Args {
    #[arg(short, long, value_name = "PATH", default_value = ".")]
    repo: PathBuf,

    #[arg(short, long, value_name = "SECONDS", default_value_t = 5)]
    interval: u64,

    #[arg(short, long, default_value_t = false)]
    verbose: bool,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let args = Args::parse();

    let git_parser = GitParser::new(&args.repo);
    let dependency_mapper = DependencyMapper::new();
    let executor = FixedPointExecutor::new();

    if args.verbose {
        println!("Initializing orchestration at: {:?}", args.repo);
    }

    loop {
        let git_context = git_parser.parse().await?;
        let dependency_graph = dependency_mapper.map(&git_context).await?;
        
        let convergence_result = executor.execute(&dependency_graph).await?;

        if convergence_result.is_converged() {
            if args.verbose {
                println!("Convergence reached. Fixed point established.");
            }
            break;
        }

        if args.verbose {
            println!(
                "System in flux. Retrying in {} seconds...",
                args.interval
            );
        }

        sleep(Duration::from_secs(args.interval)).await;
    }

    Ok(())
}