// gitweb-compatible HTTP layer.
// LDS: 700.080 | IPv6: 2602:F674:0000:0700::80 | 528 Hz
//
// References:
//   https://git-scm.com/docs/gitweb.conf
//
// Read-only public mirror surface. Lives on the sovereign IPv6, served by
// hyper + tower. Not a full re-implementation of gitweb's Perl — just the
// project-list and tree-browse endpoints needed for human-readable browsing
// alongside the Gogs API.

use hyper::{body::Bytes, Response, StatusCode};
use std::convert::Infallible;
use std::path::PathBuf;

pub struct GitWebConfig {
    /// Root directory containing the bare repos (matches `$projectroot` in gitweb.conf).
    pub project_root: PathBuf,
    /// Public site name (`$site_name`).
    pub site_name: String,
}

impl Default for GitWebConfig {
    fn default() -> Self {
        Self {
            project_root: PathBuf::from("/var/lib/gogs/repositories"),
            site_name: "LuciVerse Sovereign SCM".to_string(),
        }
    }
}

/// Minimal handler — returns the project list as JSON. Use behind Caddy
/// reverse proxy at `2602:F674:0000:0700::80` (gogs.lucidigital.io/gitweb).
pub async fn handle_request(
    cfg: &GitWebConfig,
    path: &str,
) -> Result<Response<Bytes>, Infallible> {
    if path == "/" || path == "/projects" {
        return Ok(project_list(cfg));
    }

    Ok(Response::builder()
        .status(StatusCode::NOT_FOUND)
        .body(Bytes::from("not found"))
        .unwrap())
}

fn project_list(cfg: &GitWebConfig) -> Response<Bytes> {
    let projects: Vec<String> = std::fs::read_dir(&cfg.project_root)
        .ok()
        .into_iter()
        .flatten()
        .filter_map(|e| e.ok())
        .filter_map(|e| e.file_name().into_string().ok())
        .filter(|n| n.ends_with(".git"))
        .collect();

    let body = serde_json::json!({
        "site_name": cfg.site_name,
        "projects": projects,
    });

    Response::builder()
        .header("content-type", "application/json")
        .body(Bytes::from(body.to_string()))
        .unwrap()
}
