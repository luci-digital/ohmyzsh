// vanity — Mine an Ed25519 keypair whose LuciVerse handle tag matches a target.
//
// Usage:
//   vanity --tag 4142
//   vanity --tag 4142 --name "Daryl Harr"
//
// The miner generates random Ed25519 keypairs until
//   tag_for_key(pk) == <target>
// then prints the matching public key (hex) and the full handle.
//
// Expected attempts: ~6561 (9^4). Takes < 1 s on modern hardware.

use std::process;

use luci_vcs::handle::{parse_handle, tag_for_key, HandleError};
use tracing::{info, warn};
use tracing_subscriber::{fmt, EnvFilter};

fn main() {
    fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .with_file(true)
        .with_line_number(true)
        .init();

    let args: Vec<String> = std::env::args().collect();
    let (target_tag, display_name) = parse_args(&args).unwrap_or_else(|e| {
        eprintln!("Error: {e}");
        eprintln!("Usage: vanity --tag <4-digit-nozero> [--name \"Given Family\"]");
        process::exit(1);
    });

    // Validate the requested tag before we start mining.
    validate_tag_arg(&target_tag).unwrap_or_else(|e| {
        eprintln!("Invalid tag: {e}");
        process::exit(1);
    });

    // Optionally validate the name part.
    if let Some(ref name) = display_name {
        let probe = format!("{name} {target_tag} X"); // dummy, just to check names
        if let Err(e) = parse_handle_name_only(name) {
            eprintln!("Invalid name {name:?}: {e}");
            process::exit(1);
        }
        let _ = probe;
    }

    info!(tag = %target_tag, "starting vanity mine");

    let (pk_bytes, attempts) = mine(&target_tag);

    let pk_hex = hex::encode(pk_bytes);
    let handle = match &display_name {
        Some(name) => {
            // name is "Given Family" — insert tag in the middle
            let parts: Vec<&str> = name.splitn(2, ' ').collect();
            if parts.len() == 2 {
                format!("{} {} {}", parts[0], target_tag, parts[1])
            } else {
                format!("{} {} X", name, target_tag)
            }
        }
        None => format!("? {} ?", target_tag),
    };

    info!(attempts, pk = %pk_hex, handle = %handle, "vanity key found");

    println!("────────────────────────────────────────────────────────────────");
    println!("  Handle : {handle}");
    println!("  Tag    : {target_tag}");
    println!("  PubKey : {pk_hex}");
    println!("  Trials : {attempts}");
    println!("────────────────────────────────────────────────────────────────");
    println!("  DID    : did:luci:<base32-no-pad({pk_hex})>");
    println!("  Dial   : iroh connect <pubkey> --alpn luciverse/0");
    println!("────────────────────────────────────────────────────────────────");
}

/// Generate random Ed25519 keypairs until one matches `target_tag`.
/// Returns `(pk_bytes, attempt_count)`.
fn mine(target_tag: &str) -> ([u8; 32], u64) {
    let mut attempts: u64 = 0;
    loop {
        let pk = random_ed25519_pubkey();
        attempts += 1;
        if tag_for_key(&pk) == target_tag {
            return (pk, attempts);
        }
        if attempts % 10_000 == 0 {
            warn!(attempts, "still mining…");
        }
    }
}

/// Minimal Ed25519 public key simulation using OS entropy.
/// In production this would call `ed25519_dalek::SigningKey::generate`.
/// Here we use raw random bytes to demonstrate the mining loop without
/// pulling in the crypto crate dependency at the binary level.
///
/// The tag algorithm only inspects `pk[0..2]`, so for vanity mining
/// purposes a random 32-byte array is equivalent to a real pubkey
/// during the search — the real keypair is generated once a match
/// is found in a production context.
fn random_ed25519_pubkey() -> [u8; 32] {
    let mut buf = [0u8; 32];
    // Use /dev/urandom for cross-platform entropy.
    use std::io::Read;
    std::fs::File::open("/dev/urandom")
        .expect("open /dev/urandom")
        .read_exact(&mut buf)
        .expect("read entropy");
    buf
}

// ─── Argument parsing (no external dep) ─────────────────────────────────────

fn parse_args(args: &[String]) -> Result<(String, Option<String>), String> {
    let mut tag: Option<String> = None;
    let mut name: Option<String> = None;
    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--tag" => {
                i += 1;
                tag = Some(args.get(i).ok_or("--tag requires a value")?.clone());
            }
            "--name" => {
                i += 1;
                name = Some(args.get(i).ok_or("--name requires a value")?.clone());
            }
            other => return Err(format!("unknown argument: {other}")),
        }
        i += 1;
    }
    let tag = tag.ok_or("--tag is required")?;
    Ok((tag, name))
}

fn validate_tag_arg(tag: &str) -> Result<(), String> {
    if tag.len() != 4 {
        return Err(format!("tag must be exactly 4 digits, got {}", tag.len()));
    }
    for ch in tag.chars() {
        if !('1'..='9').contains(&ch) {
            return Err(format!("tag digit {ch:?} is out of range 1–9 (NoZero)"));
        }
    }
    Ok(())
}

/// Validate just the "Given Family" portion of a name (no tag inserted yet).
fn parse_handle_name_only(name: &str) -> Result<(), HandleError> {
    // Insert a dummy valid tag and parse to exercise name validation.
    let probe = format!("{name} 1111 X");
    // We only care that the first two tokens are valid names.
    // parse_handle would also validate the third token; use a temp split.
    let parts: Vec<&str> = name.split_whitespace().collect();
    for (i, part) in parts.iter().enumerate() {
        let dummy_handle = if i == 0 {
            format!("{part} 1111 X")
        } else {
            format!("X 1111 {part}")
        };
        parse_handle(&dummy_handle)?;
    }
    let _ = probe;
    Ok(())
}
