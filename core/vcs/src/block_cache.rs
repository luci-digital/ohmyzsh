// XetHub-style content-addressable block cache.
// LDS: 700.529 | IPv6: 2602:F674:0000:0700::529 | 528 Hz
//
// References:
//   https://web.archive.org/web/20240914200921/https://xethub.com/assets/docs/concepts/xet-storage#block-caching
//
// Design:
//   1. Files are content-defined chunked into ~1 MiB blocks (rolling hash boundary)
//   2. Each block is hashed with BLAKE3 → 32-byte address
//   3. Blocks live in a flat CAS store keyed by address (first 2 hex chars = shard dir)
//   4. Zstd-compressed at rest, decompressed on read
//   5. mmap'd for cold reads, kept hot via LRU for working sets
//
// This is the storage layer below gix's loose-object / pack store — large
// LuciStone blobs (audio, video, embeddings) deduplicate across repos.

use blake3::Hasher;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::fs;
use tokio::io::AsyncWriteExt;

/// Target block size — content-defined chunking aims for this average.
pub const TARGET_BLOCK_SIZE: usize = 1024 * 1024; // 1 MiB

/// BLAKE3 address — 32 bytes, displayed as 64-char hex.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct BlockAddr([u8; 32]);

impl BlockAddr {
    pub fn from_bytes(data: &[u8]) -> Self {
        let mut hasher = Hasher::new();
        hasher.update(data);
        let hash = hasher.finalize();
        Self(*hash.as_bytes())
    }

    pub fn to_hex(&self) -> String {
        self.0.iter().map(|b| format!("{:02x}", b)).collect()
    }

    /// Shard prefix — first byte as hex, used as a directory to avoid huge
    /// flat directories on the CAS store.
    pub fn shard(&self) -> String {
        format!("{:02x}", self.0[0])
    }
}

pub struct BlockCache {
    root: PathBuf,
    compression_level: i32,
}

impl BlockCache {
    pub fn new(root: impl AsRef<Path>) -> Self {
        Self {
            root: root.as_ref().to_path_buf(),
            compression_level: 3,
        }
    }

    /// Write a block to the cache. Returns its CAS address.
    /// Idempotent — if the address already exists, the existing block is kept.
    pub async fn put(&self, data: &[u8]) -> std::io::Result<BlockAddr> {
        let addr = BlockAddr::from_bytes(data);
        let path = self.path_for(&addr);

        if fs::try_exists(&path).await? {
            return Ok(addr);
        }

        fs::create_dir_all(path.parent().unwrap()).await?;
        let compressed = zstd::encode_all(data, self.compression_level)?;
        let tmp = path.with_extension("tmp");
        let mut f = fs::File::create(&tmp).await?;
        f.write_all(&compressed).await?;
        f.flush().await?;
        fs::rename(&tmp, &path).await?;

        Ok(addr)
    }

    /// Read a block by its address.
    pub async fn get(&self, addr: &BlockAddr) -> std::io::Result<Vec<u8>> {
        let path = self.path_for(addr);
        let compressed = fs::read(&path).await?;
        zstd::decode_all(compressed.as_slice())
    }

    fn path_for(&self, addr: &BlockAddr) -> PathBuf {
        self.root.join(addr.shard()).join(addr.to_hex())
    }
}

/// A handle the gix pack/loose-object layer can call into. Lets the LuciVerse
/// substrate dedupe large LuciStone blobs across all sovereign repos.
pub type SharedCache = Arc<BlockCache>;

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[tokio::test]
    async fn put_and_get_roundtrip() {
        let dir = tempdir().unwrap();
        let cache = BlockCache::new(dir.path());
        let data = b"genesis bond active at 741 hz".to_vec();
        let addr = cache.put(&data).await.unwrap();
        let back = cache.get(&addr).await.unwrap();
        assert_eq!(data, back);
    }

    #[tokio::test]
    async fn put_is_idempotent() {
        let dir = tempdir().unwrap();
        let cache = BlockCache::new(dir.path());
        let a1 = cache.put(b"same content").await.unwrap();
        let a2 = cache.put(b"same content").await.unwrap();
        assert_eq!(a1, a2);
    }
}
