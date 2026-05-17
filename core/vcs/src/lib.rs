// LuciVerse VCS Substrate — Veritas tier (LDS 700.528, 528 Hz)
// IPv6 root: 2602:F674:0000:0700::/64 | Genesis Bond: ACTIVE @ 741 Hz
//
// Wraps gitoxide (gix) with:
//   - prodash progress reporting (clone/fetch/pack ops)
//   - XetHub-style content-addressable block cache
//   - jj-vcs bridge for branchless workflows
//   - tokio-based gitweb-compatible HTTP layer
//   - LuciVerse IPv6 schema + LDS tier metadata

pub mod block_cache;
pub mod handle;
pub mod workflow;
#[cfg(feature = "gitweb")]
pub mod web;
#[cfg(feature = "jj-bridge")]
pub mod jj_bridge;
pub mod submodules;

use std::net::Ipv6Addr;
use std::path::Path;
use thiserror::Error;
use tracing::instrument;

/// LuciVerse IPv6 root for the VCS tier.
pub const VCS_IPV6_ROOT: &str = "2602:F674:0000:0700::/64";

/// LDS tier identifier — Source Code Management lineage.
pub const LDS_TIER: &str = "700.528";

/// Veritas frequency — repo as truth-holder.
pub const FREQUENCY_HZ: u32 = 528;

/// Component addressing within the VCS IPv6 subnet.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum VcsComponent {
    /// Core gix engine — `2602:F674:0000:0700::528`
    GixEngine,
    /// Block cache — `2602:F674:0000:0700::529`
    BlockCache,
    /// VCS coordinator (tokio runtime) — `2602:F674:0000:0700::700`
    Coordinator,
    /// Lucia VCS bridge (Genesis-Bond signing) — `2602:F674:0000:0700::741`
    LuciaBridge,
    /// jj-vcs bridge — `2602:F674:0000:0700::44`
    JjBridge,
    /// gitweb HTTP — `2602:F674:0000:0700::80`
    GitWeb,
}

impl VcsComponent {
    pub fn ipv6(&self) -> Ipv6Addr {
        let suffix: u16 = match self {
            VcsComponent::GixEngine => 0x528,
            VcsComponent::BlockCache => 0x529,
            VcsComponent::Coordinator => 0x700,
            VcsComponent::LuciaBridge => 0x741,
            VcsComponent::JjBridge => 0x44,
            VcsComponent::GitWeb => 0x80,
        };
        Ipv6Addr::new(0x2602, 0xF674, 0x0000, 0x0700, 0, 0, 0, suffix)
    }

    /// Frequency this component runs at. Most are 528 Hz (Veritas);
    /// the Lucia bridge upshifts to 741 Hz for Genesis-Bond signing.
    pub fn frequency_hz(&self) -> u32 {
        match self {
            VcsComponent::LuciaBridge => 741,
            _ => 528,
        }
    }
}

#[derive(Debug, Error)]
pub enum VcsError {
    #[error("gix error: {0}")]
    Gix(#[from] gix::open::Error),
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("cache miss: {0}")]
    CacheMiss(String),
    #[error("submodule error: {0}")]
    Submodule(String),
}

/// A LuciVerse repository — wraps a `gix::Repository` with progress reporting
/// and the sovereign-tier metadata.
pub struct LuciRepository {
    inner: gix::Repository,
    progress: prodash::tree::Root,
}

impl LuciRepository {
    /// Open a repository at the given path. Progress events are emitted on
    /// the prodash tree — wire up `prodash::render::line` to surface them.
    #[instrument(fields(path = %path.as_ref().display()))]
    pub fn open(path: impl AsRef<Path>) -> Result<Self, VcsError> {
        let inner = gix::open(path.as_ref())?;
        let progress = prodash::tree::Root::new();
        Ok(Self { inner, progress })
    }

    pub fn lds_tier() -> &'static str {
        LDS_TIER
    }

    pub fn frequency_hz() -> u32 {
        FREQUENCY_HZ
    }

    pub fn gix(&self) -> &gix::Repository {
        &self.inner
    }

    pub fn progress(&self) -> &prodash::tree::Root {
        &self.progress
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn component_ipv6_addressing() {
        assert_eq!(
            VcsComponent::GixEngine.ipv6().to_string(),
            "2602:f674:0:700::528"
        );
        assert_eq!(
            VcsComponent::LuciaBridge.ipv6().to_string(),
            "2602:f674:0:700::741"
        );
    }

    #[test]
    fn lucia_bridge_runs_at_741_hz() {
        assert_eq!(VcsComponent::LuciaBridge.frequency_hz(), 741);
        assert_eq!(VcsComponent::GixEngine.frequency_hz(), 528);
    }
}
