#!/bin/sh
set -e

FILTERED="${FILTERED:-true}"

if [ "$FILTERED" = "true" ]; then
    IPV4_PRIMARY="9.9.9.9"
    IPV4_SECONDARY="149.112.112.112"
    IPV6_PRIMARY="2620:fe::fe"
    IPV6_SECONDARY="2620:fe::9"
else
    # Unfiltered — no malware blocking, still DNSSEC
    IPV4_PRIMARY="9.9.9.10"
    IPV4_SECONDARY="149.112.112.10"
    IPV6_PRIMARY="2620:fe::10"
    IPV6_SECONDARY="2620:fe::fe:10"
fi

echo "Configuring Quad9 DNS (filtered=${FILTERED})..."

# Write resolv.conf with Quad9 — IPv6 first (LuciVerse is IPv6-first)
cat > /etc/resolv.conf <<EOF
# Quad9 — sovereign, privacy-respecting upstream (matches luciverse_dns.lua)
# Ref: https://docs.quad9.net/Setup_Guides/Open-Source_Routers/OpenWrt_LuCi/
nameserver ${IPV6_PRIMARY}
nameserver ${IPV6_SECONDARY}
nameserver ${IPV4_PRIMARY}
nameserver ${IPV4_SECONDARY}
options ndots:1
EOF

echo "Quad9 DNS configured."
