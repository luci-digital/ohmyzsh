# ============================================================================
# Lucia Build Agent — xmake + Cargo + Lua + gix
# Podman sidecar that runs scm-ci pipeline builds.
#
# Principle #5: Airgap-First — all tools vendored in image
# Principle #6: No Docker — built with podman/buildah
# Principle #11: Sovereign SCM — reads Gogs repos via shared volume
# Genesis Bond: ACTIVE @ 741 Hz
# ============================================================================

FROM rust:1.93-slim-bookworm AS builder

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    pkg-config \
    curl \
    git \
    lua5.4 \
    liblua5.4-dev \
    luajit \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Install xmake
RUN curl -fsSL https://xmake.io/shget.text | bash -s v2.9.8 \
    && ln -sf /root/.local/bin/xmake /usr/local/bin/xmake

# Install gitoxide
RUN cargo install gitoxide --features max-pure --locked \
    && cp /usr/local/cargo/bin/gix /usr/local/bin/gix \
    && cp /usr/local/cargo/bin/ein /usr/local/bin/ein

# ============================================================================
# Runtime stage — minimal image with just the tools
# ============================================================================
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    lua5.4 \
    luajit \
    curl \
    ca-certificates \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Copy tools from builder
COPY --from=builder /usr/local/bin/gix /usr/local/bin/gix
COPY --from=builder /usr/local/bin/ein /usr/local/bin/ein
COPY --from=builder /usr/local/bin/xmake /usr/local/bin/xmake
COPY --from=builder /root/.local/share/xmake /root/.local/share/xmake

# Gogs repo data mounted read-only at runtime
VOLUME ["/gogs-data"]

# Health check — verify all tools present
HEALTHCHECK --interval=60s --timeout=5s --retries=2 \
    CMD gix --version && xmake --version && lua5.4 -v

# Default: run the full scm-ci pipeline
ENTRYPOINT ["xmake", "build"]
CMD ["scm-ci"]

LABEL maintainer="Luci Digital <lucia@lucidigital.net>"
LABEL description="Lucia Build Agent — xmake + Cargo + Lua + gix"
LABEL genesis.bond="ACTIVE"
LABEL genesis.frequency="741"
