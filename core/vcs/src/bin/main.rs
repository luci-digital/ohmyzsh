// luci-vcs CLI — operator entrypoint for the Veritas VCS substrate.
// LDS: 700.528 | 528 Hz | Genesis Bond: ACTIVE @ 741 Hz

use luci_vcs::{LuciRepository, VcsComponent, FREQUENCY_HZ, LDS_TIER, VCS_IPV6_ROOT};

fn main() {
    tracing_subscriber::fmt::init();

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
