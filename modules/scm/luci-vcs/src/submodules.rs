// Submodule resolution — the substrate ↔ web binding pattern.
// LDS: 700.x | 528 Hz
//
// Reference: https://git-scm.com/docs/gitsubmodules
//
// Per FOUNDATIONS.md: "every new foundation gets a *.lua bridge in lua-substrate
// AND a src/lib/*.ts web binding — symmetry is the rule". Submodules implement
// that symmetry: the substrate repo and the web repo are pinned by gitlink
// from a parent monorepo, so the sovereign root always knows the exact pair.

use crate::VcsError;
use gix::Repository;

#[derive(Debug, Clone)]
pub struct SubmoduleRef {
    pub name: String,
    pub path: String,
    pub url: String,
    pub head_oid: String,
}

/// Enumerate all submodules of a repo via gix.
pub fn list_submodules(repo: &Repository) -> Result<Vec<SubmoduleRef>, VcsError> {
    let mut out = Vec::new();
    let Some(modules) = repo
        .submodules()
        .map_err(|e| VcsError::Submodule(e.to_string()))?
    else {
        return Ok(out);
    };

    for sub in modules {
        let name = sub.name().to_string();
        let path = sub
            .path()
            .map_err(|e| VcsError::Submodule(e.to_string()))?
            .to_string();
        let url = sub
            .url()
            .map_err(|e| VcsError::Submodule(e.to_string()))?
            .to_bstring()
            .to_string();
        let head = sub
            .head_id()
            .map_err(|e| VcsError::Submodule(e.to_string()))?
            .map(|id| id.to_string())
            .unwrap_or_default();
        out.push(SubmoduleRef {
            name,
            path,
            url,
            head_oid: head,
        });
    }
    Ok(out)
}
