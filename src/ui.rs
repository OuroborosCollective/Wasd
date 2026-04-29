use std::io::{self, Write};

pub struct Logger;

impl Logger {
    pub fn log_reset(file_path: &str) {
        println!(
            "\x1b[1;37;41m RESET \x1b[0m \x1b[90mSource change detected:\x1b[0m \x1b[4;36m{}\x1b[0m",
            file_path
        );
    }

    pub fn log_iteration(count: usize) {
        print!(
            "\r\x1b[1;37;44m ITER  \x1b[0m \x1b[90mCurrent fixed-point iteration:\x1b[0m \x1b[1;35m{}\x1b[0m",
            count
        );
        let _ = io::stdout().flush();
    }

    pub fn log_convergence(iterations: usize, elapsed_ms: u128) {
        println!(
            "\n\x1b[1;30;42m DONE  \x1b[0m \x1b[90mFixed-point iteration converged.\x1b[0m"
        );
        println!(
            " \x1b[90m├── Total iterations:\x1b[0m \x1b[1;32m{}\x1b[0m",
            iterations
        );
        println!(
            " \x1b[90m└── Execution time:\x1b[0m   \x1b[1;33m{}ms\x1b[0m\n",
            elapsed_ms
        );
    }

    pub fn log_error(context: &str, message: &str) {
        eprintln!(
            "\x1b[1;37;41m ERROR \x1b[0m \x1b[1;31m{}\x1b[0m: \x1b[0;31m{}\x1b[0m",
            context, message
        );
    }

    pub fn log_info(message: &str) {
        println!(
            "\x1b[1;30;47m INFO  \x1b[0m \x1b[37m{}\x1b[0m",
            message
        );
    }
}