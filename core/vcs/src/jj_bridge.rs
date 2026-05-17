// jj-vcs bridge — branchless workflows over LuciVerse repos.
// LDS: 700.044 | IPv6: 2602:F674:0000:0700::44 | 528 Hz
//
// Reference: https://github.com/jj-vcs/jj
//
// jj treats every commit as a first-class object (no anonymous heads), which
// maps cleanly onto LuciVerse's "every state is a LuciStone" principle.
// This bridge shells out to the `jj` binary — once jj-lib stabilises its
// public API we can link in directly.

use std::path::Path;
use std::process::Command;
use thiserror::Error;
use tracing::{instrument, warn};

#[derive(Debug, Error)]
pub enum JjError {
    #[error("jj binary not found in PATH")]
    NotInstalled,
    #[error("jj exited with status {0}")]
    ExitStatus(i32),
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
}

#[derive(Debug)]
pub struct JjBridge<'a> {
    repo_path: &'a Path,
}

impl<'a> JjBridge<'a> {
    pub fn new(repo_path: &'a Path) -> Self {
        Self { repo_path }
    }

    /// Initialise a jj workspace on top of an existing git repo.
    /// `jj git init --git-repo=.` makes jj track the existing git history.
    #[instrument(fields(repo = %self.repo_path.display()))]
    pub fn colocate(&self) -> Result<(), JjError> {
        let status = Command::new("jj")
            .arg("git")
            .arg("init")
            .arg("--colocate")
            .current_dir(self.repo_path)
            .status()?;
        if !status.success() {
            return Err(JjError::ExitStatus(status.code().unwrap_or(-1)));
        }
        Ok(())
    }

    /// List all change IDs in topological order. Every change is named and
    /// reachable — no anonymous branches, matching LuciStone semantics.
    #[instrument(fields(repo = %self.repo_path.display()))]
    pub fn log(&self) -> Result<Vec<String>, JjError> {
        let out = Command::new("jj")
            .arg("log")
            .arg("--no-graph")
            .arg("-T")
            .arg("change_id ++ \"\\n\"")
            .current_dir(self.repo_path)
            .output()?;
        if !out.status.success() {
            let code = out.status.code().unwrap_or(-1);
            warn!(exit_code = code, "jj log failed");
            return Err(JjError::ExitStatus(code));
        }
        Ok(String::from_utf8_lossy(&out.stdout)
            .lines()
            .map(|s| s.to_string())
            .collect())
    }
}
