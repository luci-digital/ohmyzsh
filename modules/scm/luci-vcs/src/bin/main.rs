// luci-vcs CLI — operator entrypoint for the Veritas VCS substrate.
// LDS: 700.528 | 528 Hz | Genesis Bond: ACTIVE @ 741 Hz

use luci_vcs::{LuciRepository, VcsComponent, FREQUENCY_HZ, LDS_TIER, VCS_IPV6_ROOT};
use tracing::info;
use tracing_subscriber::{EnvFilter, fmt};

fn main() {
    // Tokio tracing subscriber — env-filter so operators can tune verbosity:
    //   RUST_LOG=luci_vcs=debug,tokio=info luci-vcs
    // Fields: file + line numbers for debugging; thread IDs for tokio tasks.
    // Ref: https://tokio.rs/tokio/topics/tracing
    fmt::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| EnvFilter::new("luci_vcs=info,warn")),
        )
        .with_file(true)
        .with_line_number(true)
        .with_thread_ids(true)
        .with_target(true)
        .init();

    info!(
        lds_tier = LDS_TIER,
        frequency_hz = FREQUENCY_HZ,
        ipv6_root = VCS_IPV6_ROOT,
        "LuciVerse VCS substrate starting"
    );

    println!("LuciVerse VCS Substrate");
    println!("  LDS tier:   {}", LDS_TIER);
    println!("  Frequency:  {} Hz (Veritas)", FREQUENCY_HZ);
    println!("  IPv6 root:  {}", VCS_IPV6_ROOT);
    println!();
    println!("Components:");
    for c in [
        VcsComponent::GixEngine,
        VcsComponent::BlockCache,
        VcsComponent::Coordinator,
        VcsComponent::LuciaBridge,
        VcsComponent::JjBridge,
        VcsComponent::GitWeb,
    ] {
        println!(
            "  {:<15} {} @ {} Hz",
            format!("{:?}", c),
            c.ipv6(),
            c.frequency_hz()
        );
    }

    if let Ok(repo) = LuciRepository::open(".") {
        println!();
        println!("Opened repository at .");
        let gix = repo.gix();
        if let Ok(head) = gix.head_name() {
            println!("  HEAD: {:?}", head);
        }
    }
}
