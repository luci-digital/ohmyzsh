// LuciVerse DID Handle — "Dial by Being"
// LDS 200.741 · 741 Hz · Genesis Bond: ACTIVE
//
// Grammar:  <given-name> <4-digit-nozero-tag> <family-name>
// Example:  "Daryl 4142 Harr"
//
// The tag is derived from the first 2 bytes of an Ed25519 public key:
//   tag_int = u16_be(pk[0..2]) % 6561   (9^4)
//   tag_str = base9_nozero(tag_int, width=4)
//
// "NoZero" means digits 1–9 only; digit 0 never appears.
// This matches the LuciVerse NoZero invariant (LuciClock, qubit |5⟩ centre).

use std::fmt;
use thiserror::Error;
use tracing::instrument;

/// The number of distinct tags: 9^4 = 6561.
const TAG_MODULUS: u32 = 6561;

/// A parsed LuciVerse DID handle.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Handle {
    /// Given (first) name — Latin script, hyphens, apostrophes; preserved case.
    pub given_name: String,
    /// 4-digit NoZero base-9 key tag (e.g. `"4142"`).
    pub key_tag: String,
    /// Family (last) name — same character set as `given_name`.
    pub family_name: String,
}

impl Handle {
    /// Canonical form for comparison: Unicode NFC + case-fold (lower).
    /// The key tag is kept as-is since it is numeric.
    pub fn canonical(&self) -> String {
        format!(
            "{} {} {}",
            self.given_name.to_lowercase(),
            self.key_tag,
            self.family_name.to_lowercase(),
        )
    }

    /// Full display form (as written by the human, preserving case).
    pub fn display(&self) -> String {
        format!("{} {} {}", self.given_name, self.key_tag, self.family_name)
    }

    /// DNS-safe slug: lowercase, spaces replaced with hyphens.
    /// Used as `_did.<slug>.luci.iroh` for Iroh DNS resolution.
    pub fn dns_slug(&self) -> String {
        self.canonical().replace(' ', "-")
    }
}

impl fmt::Display for Handle {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.display())
    }
}

/// Errors returned by handle parsing and verification.
#[derive(Debug, Error, PartialEq, Eq)]
pub enum HandleError {
    #[error("handle must be exactly three tokens: <given> <tag> <family>")]
    WrongTokenCount,

    #[error("given name contains invalid characters (allowed: Latin letters, hyphens, apostrophes)")]
    InvalidGivenName,

    #[error("family name contains invalid characters (allowed: Latin letters, hyphens, apostrophes)")]
    InvalidFamilyName,

    #[error("key tag must be exactly 4 NoZero digits (1–9), got {0:?}")]
    InvalidTag(String),

    #[error("given name must be 1–30 characters, got {0}")]
    GivenNameLength(usize),

    #[error("family name must be 1–30 characters, got {0}")]
    FamilyNameLength(usize),
}

/// Parse a handle string into a [`Handle`].
///
/// Accepts exactly `"<given> <tag> <family>"` where:
/// - names are 1–30 Latin-script characters, hyphens, apostrophes
/// - tag is exactly 4 NoZero digits (1–9 only)
#[instrument(fields(raw = %s))]
pub fn parse_handle(s: &str) -> Result<Handle, HandleError> {
    let parts: Vec<&str> = s.split_whitespace().collect();
    if parts.len() != 3 {
        return Err(HandleError::WrongTokenCount);
    }

    let given = parts[0];
    let tag = parts[1];
    let family = parts[2];

    validate_name(given).map_err(|_| {
        if given.chars().count() > 30 || given.is_empty() {
            HandleError::GivenNameLength(given.chars().count())
        } else {
            HandleError::InvalidGivenName
        }
    })?;
    validate_name(family).map_err(|_| {
        if family.chars().count() > 30 || family.is_empty() {
            HandleError::FamilyNameLength(family.chars().count())
        } else {
            HandleError::InvalidFamilyName
        }
    })?;
    validate_tag(tag)?;

    Ok(Handle {
        given_name: given.to_string(),
        key_tag: tag.to_string(),
        family_name: family.to_string(),
    })
}

fn validate_name(name: &str) -> Result<(), ()> {
    let n = name.chars().count();
    if n == 0 || n > 30 {
        return Err(());
    }
    for ch in name.chars() {
        if !ch.is_alphabetic() && ch != '-' && ch != '\'' {
            return Err(());
        }
    }
    Ok(())
}

fn validate_tag(tag: &str) -> Result<(), HandleError> {
    if tag.len() != 4 {
        return Err(HandleError::InvalidTag(tag.to_string()));
    }
    for ch in tag.chars() {
        match ch {
            '1'..='9' => {}
            _ => return Err(HandleError::InvalidTag(tag.to_string())),
        }
    }
    Ok(())
}

// ─── Key binding ────────────────────────────────────────────────────────────

/// Derive the canonical 4-digit NoZero tag for an Ed25519 public key.
///
/// Algorithm:
/// ```text
/// tag_int = u16_be(pk[0..2]) mod 6561   (range 0..6560)
/// tag_str = base9_nozero(tag_int, width=4)
/// ```
pub fn tag_for_key(pk: &[u8; 32]) -> String {
    let word = u16::from_be_bytes([pk[0], pk[1]]) as u32;
    let tag_int = word % TAG_MODULUS;
    encode_base9_nozero(tag_int, 4)
}

/// Verify that a [`Handle`]'s tag matches an Ed25519 public key.
#[instrument(fields(handle = %handle))]
pub fn verify_handle(handle: &Handle, pk: &[u8; 32]) -> bool {
    tag_for_key(pk) == handle.key_tag
}

// ─── NoZero base-9 codec ────────────────────────────────────────────────────

/// Encode a value in NoZero base-9 (digits 1–9) with a fixed width.
///
/// The encoding shifts each base-9 digit `d ∈ [0,8]` to `d+1 ∈ [1,9]` so
/// that no zero ever appears.  Zero-padding (using digit `1`) is applied on
/// the left to fill `width` digits.
///
/// Domain: `0 ≤ value < 9^width`.
pub fn encode_base9_nozero(mut value: u32, width: usize) -> String {
    let mut digits = vec![b'1'; width];
    for pos in (0..width).rev() {
        let digit = (value % 9) as u8;
        digits[pos] = b'1' + digit; // shift: 0→'1', 8→'9'
        value /= 9;
    }
    String::from_utf8(digits).expect("all bytes are ASCII digits")
}

/// Decode a NoZero base-9 string back to a `u32`.
///
/// Returns `None` if any character is outside `'1'..='9'` or the string is
/// empty.
pub fn decode_base9_nozero(s: &str) -> Option<u32> {
    if s.is_empty() {
        return None;
    }
    let mut value: u32 = 0;
    for ch in s.chars() {
        let digit = match ch {
            '1'..='9' => (ch as u8 - b'1') as u32,
            _ => return None,
        };
        value = value * 9 + digit;
    }
    Some(value)
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // ── NoZero codec ──────────────────────────────────────────────────────────

    #[test]
    fn nozero_zero_maps_to_1111() {
        assert_eq!(encode_base9_nozero(0, 4), "1111");
    }

    #[test]
    fn nozero_max_maps_to_9999() {
        assert_eq!(encode_base9_nozero(6560, 4), "9999");
    }

    #[test]
    fn nozero_roundtrip() {
        for v in 0..6561_u32 {
            let encoded = encode_base9_nozero(v, 4);
            let decoded = decode_base9_nozero(&encoded).unwrap();
            assert_eq!(decoded, v, "roundtrip failed at {v}");
        }
    }

    #[test]
    fn nozero_no_zero_digit_anywhere() {
        for v in 0..6561_u32 {
            let s = encode_base9_nozero(v, 4);
            assert!(!s.contains('0'), "zero found in {s} for value {v}");
        }
    }

    // ── Handle parsing ────────────────────────────────────────────────────────

    #[test]
    fn parse_canonical_example() {
        let h = parse_handle("Daryl 4142 Harr").unwrap();
        assert_eq!(h.given_name, "Daryl");
        assert_eq!(h.key_tag, "4142");
        assert_eq!(h.family_name, "Harr");
    }

    #[test]
    fn parse_hyphenated_name() {
        let h = parse_handle("Mary-Jane 2369 O'Brien").unwrap();
        assert_eq!(h.given_name, "Mary-Jane");
        assert_eq!(h.family_name, "O'Brien");
    }

    #[test]
    fn parse_rejects_zero_in_tag() {
        assert_eq!(
            parse_handle("Alice 1042 Smith"),
            Err(HandleError::InvalidTag("1042".to_string()))
        );
    }

    #[test]
    fn parse_rejects_short_tag() {
        assert_eq!(
            parse_handle("Alice 142 Smith"),
            Err(HandleError::InvalidTag("142".to_string()))
        );
    }

    #[test]
    fn parse_rejects_two_tokens() {
        assert_eq!(
            parse_handle("Alice Smith"),
            Err(HandleError::WrongTokenCount)
        );
    }

    #[test]
    fn parse_rejects_digit_in_name() {
        assert!(parse_handle("Alice3 1234 Smith").is_err());
    }

    #[test]
    fn canonical_is_lowercase() {
        let h = parse_handle("Daryl 4142 Harr").unwrap();
        assert_eq!(h.canonical(), "daryl 4142 harr");
    }

    #[test]
    fn dns_slug_replaces_spaces() {
        let h = parse_handle("Daryl 4142 Harr").unwrap();
        assert_eq!(h.dns_slug(), "daryl-4142-harr");
    }

    // ── Key binding ───────────────────────────────────────────────────────────

    #[test]
    fn tag_for_all_zero_key() {
        // pk[0..2] = 0x0000 → 0 % 6561 = 0 → "1111"
        let pk = [0u8; 32];
        assert_eq!(tag_for_key(&pk), "1111");
    }

    #[test]
    fn tag_for_all_ff_key() {
        // pk[0..2] = 0xFFFF = 65535 → 65535 % 6561 = 65535 - 9*6561 = 65535 - 59049 = 6486
        let pk = [0xffu8; 32];
        let expected = encode_base9_nozero(65535 % 6561, 4);
        assert_eq!(tag_for_key(&pk), expected);
    }

    #[test]
    fn verify_handle_accepts_matching_key() {
        // Build a key whose first 2 bytes give tag "4142"
        // Decode "4142" → int, then find pk bytes that produce it
        let target_int = decode_base9_nozero("4142").unwrap();
        // We need u16_be(pk[0..2]) % 6561 == target_int
        // Simplest: use target_int itself as the u16
        let pk_word = target_int as u16;
        let mut pk = [0u8; 32];
        pk[0..2].copy_from_slice(&pk_word.to_be_bytes());

        let h = parse_handle("Daryl 4142 Harr").unwrap();
        assert!(verify_handle(&h, &pk));
    }

    #[test]
    fn verify_handle_rejects_wrong_key() {
        let pk = [0u8; 32]; // tag "1111"
        let h = parse_handle("Daryl 4142 Harr").unwrap();
        assert!(!verify_handle(&h, &pk));
    }
}
