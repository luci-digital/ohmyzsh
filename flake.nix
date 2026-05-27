{
  description = "LuciDigital DevOps platform — sovereign substrate (shell · web · scm · orchestration · infra). LDS 800.000 @ 741 Hz.";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, flake-utils, rust-overlay }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        overlays = [ (import rust-overlay) ];
        pkgs = import nixpkgs { inherit system overlays; };

        rustToolchain = pkgs.rust-bin.stable.latest.default.override {
          extensions = [ "rust-src" "clippy" "rustfmt" ];
        };

        # Native deps shared by the gix-based luci-vcs crate.
        vcsNativeBuildInputs = with pkgs; [ pkg-config ];
        vcsBuildInputs = with pkgs; [ openssl zlib zstd ];

        # ── scm/luci-vcs — Rust crate (Veritas tier, LDS 700.528) ──────────────
        luci-vcs = pkgs.rustPlatform.buildRustPackage {
          pname = "luci-vcs";
          version = "0.1.0";
          src = ./modules/scm/luci-vcs;
          cargoLock = {
            lockFile = ./modules/scm/luci-vcs/Cargo.lock;
            # gix git deps (xet-core) are behind off-by-default features.
            allowBuiltinFetchGit = true;
          };
          nativeBuildInputs = vcsNativeBuildInputs;
          buildInputs = vcsBuildInputs;
          # Default features only (xet/ipfs/ipvm pull unstable upstream deps).
          buildNoDefaultFeatures = false;
          doCheck = true;
        };
      in
      {
        # ── Packages ───────────────────────────────────────────────────────────
        packages = {
          inherit luci-vcs;
          default = luci-vcs;
        };

        # ── Checks (nix flake check) ─────────────────────────────────────────────
        checks = {
          luci-vcs-tests = luci-vcs;
        };

        # ── Dev shells — one per subsystem, plus an everything default ───────────
        devShells = {
          # Full platform shell: every toolchain.
          default = pkgs.mkShell {
            packages = with pkgs; [
              rustToolchain nodejs_22 nodePackages.pnpm
              podman podman-compose caddy lua5_4 luarocks zsh
              jujutsu git gitoxide
            ] ++ vcsNativeBuildInputs ++ vcsBuildInputs;
            shellHook = ''
              echo "LuciDigital DevOps — full dev shell (LDS 800.000 @ 741 Hz)"
              echo "Subsystem shells: nix develop .#web | .#scm | .#orchestration | .#shell"
            '';
          };

          # web/luci-frontend — TanStack Start + Vite + Tailwind.
          web = pkgs.mkShell {
            packages = with pkgs; [ nodejs_22 nodePackages.pnpm ];
            shellHook = ''cd modules/web/luci-frontend 2>/dev/null || true'';
          };

          # scm/luci-vcs — gitoxide-based Rust VCS substrate.
          scm = pkgs.mkShell {
            packages = [ rustToolchain ] ++ (with pkgs; [ gitoxide jujutsu ])
              ++ vcsNativeBuildInputs ++ vcsBuildInputs;
            shellHook = ''cd modules/scm/luci-vcs 2>/dev/null || true'';
          };

          # orchestration — Podman + Caddy compose stack.
          orchestration = pkgs.mkShell {
            packages = with pkgs; [ podman podman-compose caddy ];
            shellHook = ''
              echo "Deploy: podman-compose -f modules/orchestration/podman/podman-compose.yml up -d"
            '';
          };

          # shell — LuciVerse zsh environment (Oh My Zsh in legacy/).
          shell = pkgs.mkShell {
            packages = with pkgs; [ zsh ];
          };
        };

        formatter = pkgs.nixpkgs-fmt;
      });
}
