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
        lib = pkgs.lib;

        # Build a runnable `nix run .#<name>` app from a shell script.
        # Uses writeShellScriptBin (no build-time shellcheck) with explicit
        # strict mode and a PATH composed from runtimeInputs.
        mkApp = name: runtimeInputs: text:
          let
            script = pkgs.writeShellScriptBin name ''
              set -euo pipefail
              export PATH=${lib.makeBinPath runtimeInputs}''${PATH:+:$PATH}
              ${text}
            '';
          in { type = "app"; program = "${script}/bin/${name}"; };

        rustToolchain = pkgs.rust-bin.stable.latest.default.override {
          extensions = [ "rust-src" "clippy" "rustfmt" ];
        };

        # Optional tools — included only if present + evaluable in this
        # nixpkgs/platform (e.g. foundationdb client, kubo/ipfs). Missing or
        # unsupported attrs are filtered out so the dev shell still builds.
        tryPkg = name:
          let r = builtins.tryEval (pkgs.${name} or null);
          in if r.success then r.value else null;
        optionalTools = builtins.filter (p: p != null)
          (map tryPkg [ "foundationdb" "kubo" ]);

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

        # Runtime inputs + helpers for the format/check apps.
        rustRuntime = [ rustToolchain ] ++ vcsNativeBuildInputs ++ vcsBuildInputs;
        webRuntime = with pkgs; [ nodejs_22 pnpm git ];
        podmanRuntime = with pkgs; [ podman podman-compose git ];
        # cd to repo root (works regardless of invocation dir).
        cdRoot = ''cd "$(git rev-parse --show-toplevel)"'';
        composeFile = "modules/orchestration/podman/podman-compose.yml";
        # Shared zsh syntax-check body (run after cdRoot).
        zshCheckBody = ''
          shopt -s nullglob globstar
          fail=0
          for f in \
            modules/legacy/original-layout/oh-my-zsh.sh \
            modules/legacy/original-layout/lib/*.zsh \
            modules/legacy/original-layout/plugins/*/*.plugin.zsh \
            modules/legacy/original-layout/plugins/*/_* \
            modules/legacy/original-layout/themes/*.zsh-theme \
            modules/shell/**/*.zsh; do
            [ -e "$f" ] || continue
            zsh -n "$f" || { echo "SYNTAX FAIL: $f"; fail=1; }
          done
          exit "$fail"
        '';
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

        # ── Apps (nix run .#<name>) — format + check entry points ────────────────
        apps = {
          # web/luci-frontend — pnpm lifecycle
          web-install = mkApp "web-install" webRuntime ''
            ${cdRoot}/modules/web/luci-frontend
            pnpm install --frozen-lockfile
          '';
          web-build = mkApp "web-build" webRuntime ''
            ${cdRoot}/modules/web/luci-frontend
            pnpm build
          '';
          web-test = mkApp "web-test" webRuntime ''
            ${cdRoot}/modules/web/luci-frontend
            pnpm test
          '';

          # scm/luci-vcs — cargo
          cargo-check = mkApp "cargo-check" (rustRuntime ++ [ pkgs.git ]) ''
            ${cdRoot}/modules/scm/luci-vcs
            cargo check
          '';
          cargo-test = mkApp "cargo-test" (rustRuntime ++ [ pkgs.git ]) ''
            ${cdRoot}/modules/scm/luci-vcs
            cargo test
          '';

          # Shell hygiene — shellcheck + shfmt over our own scripts (legacy OMZ excluded)
          shellcheck = mkApp "shellcheck" (with pkgs; [ shellcheck git ]) ''
            ${cdRoot}
            mapfile -t files < <(git ls-files '*.sh' ':!:modules/legacy/**')
            if [ "''${#files[@]}" -eq 0 ]; then echo "no .sh files to check"; exit 0; fi
            shellcheck "''${files[@]}"
          '';
          shfmt = mkApp "shfmt" (with pkgs; [ shfmt git ]) ''
            ${cdRoot}
            mapfile -t files < <(git ls-files '*.sh' ':!:modules/legacy/**')
            if [ "''${#files[@]}" -eq 0 ]; then echo "no .sh files to format-check"; exit 0; fi
            shfmt -d "''${files[@]}"
          '';

          # zsh syntax check — replicates upstream OMZ CI over the legacy tree + our shell module
          zsh-syntax = mkApp "zsh-syntax" (with pkgs; [ zsh git ]) ''
            ${cdRoot}
            ${zshCheckBody}
          '';

          # podman compose config validation
          compose-config = mkApp "compose-config" podmanRuntime ''
            ${cdRoot}
            podman-compose -f ${composeFile} config
          '';

          # Aggregate — run the full local CI gate
          ci = mkApp "ci" (rustRuntime ++ webRuntime
            ++ (with pkgs; [ shellcheck shfmt zsh podman-compose ])) ''
            ${cdRoot}
            echo "▶ cargo test";      ( cd modules/scm/luci-vcs && cargo test )
            echo "▶ web build";       ( cd modules/web/luci-frontend && pnpm install --frozen-lockfile && pnpm build && pnpm test )
            echo "▶ shellcheck";      git ls-files '*.sh' ':!:modules/legacy/**' | xargs -r shellcheck
            echo "▶ shfmt";           git ls-files '*.sh' ':!:modules/legacy/**' | xargs -r shfmt -d
            echo "▶ compose config";  podman-compose -f ${composeFile} config >/dev/null
            echo "✓ local CI gate passed"
          '';

          # ── Common operations ──────────────────────────────────────────────────

          # dev — frontend dev loop: ensure deps, then live HMR server (port 3000)
          dev = mkApp "dev" webRuntime ''
            ${cdRoot}/modules/web/luci-frontend
            [ -d node_modules ] || pnpm install --frozen-lockfile
            exec pnpm dev
          '';

          # web — run the frontend dev server (assumes deps installed)
          web = mkApp "web" webRuntime ''
            ${cdRoot}/modules/web/luci-frontend
            exec pnpm dev
          '';

          # check — verification gate (tests + lint + syntax + compose validation)
          check = mkApp "check" (rustRuntime ++ webRuntime
            ++ (with pkgs; [ shellcheck shfmt zsh podman-compose ])) ''
            ${cdRoot}
            echo "▶ cargo test";     ( cd modules/scm/luci-vcs && cargo test )
            echo "▶ web test";       ( cd modules/web/luci-frontend && pnpm install --frozen-lockfile && pnpm test )
            echo "▶ shellcheck";     git ls-files '*.sh' ':!:modules/legacy/**' | xargs -r shellcheck
            echo "▶ shfmt";          git ls-files '*.sh' ':!:modules/legacy/**' | xargs -r shfmt -d
            echo "▶ zsh syntax";     zsh -n modules/legacy/original-layout/oh-my-zsh.sh
            echo "▶ compose config"; podman-compose -f ${composeFile} config >/dev/null
            echo "✓ checks passed"
          '';

          # compose-up — start the sovereign stack (detached)
          compose-up = mkApp "compose-up" podmanRuntime ''
            ${cdRoot}
            exec podman-compose -f ${composeFile} up -d
          '';

          # compose-down — stop the sovereign stack
          compose-down = mkApp "compose-down" podmanRuntime ''
            ${cdRoot}
            exec podman-compose -f ${composeFile} down
          '';

          # deploy-local — build images + (re)start the stack, then show status
          deploy-local = mkApp "deploy-local" podmanRuntime ''
            ${cdRoot}
            echo "▶ building images";  podman-compose -f ${composeFile} build
            echo "▶ starting stack";   podman-compose -f ${composeFile} up -d
            echo "▶ status";           podman-compose -f ${composeFile} ps
            echo "✓ local deploy complete"
          '';

          # zsh-test — zsh syntax checks over the shell environment
          zsh-test = mkApp "zsh-test" (with pkgs; [ zsh git ]) ''
            ${cdRoot}
            ${zshCheckBody}
          '';
        };

        # ── Dev shells — one per subsystem, plus an everything default ───────────
        devShells = {
          # Full platform shell: every toolchain.
          # rustToolchain bundles rustc + cargo + rustfmt + clippy.
          default = pkgs.mkShell {
            packages = [ rustToolchain ] ++ (with pkgs; [
              zsh git gnumake just
              podman podman-compose buildah caddy
              nodejs_22 pnpm
              xmake lua5_4 luajit
              postgresql
              # Handy LuciVerse extras (not in the required list, low cost):
              jujutsu gitoxide
            ]) ++ optionalTools ++ vcsNativeBuildInputs ++ vcsBuildInputs;
            shellHook = ''
              echo "LuciDigital DevOps — full dev shell (LDS 800.000 @ 741 Hz)"
              echo "Subsystem shells: nix develop .#web | .#scm | .#orchestration | .#shell"
              echo "Optional tools present: ${
                toString (map (p: p.pname or p.name or "?") optionalTools)
              }"
            '';
          };

          # web/luci-frontend — TanStack Start + Vite + Tailwind.
          web = pkgs.mkShell {
            packages = with pkgs; [ nodejs_22 pnpm ];
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

        # `nix fmt` — format Nix, shell, and Rust in place (legacy OMZ untouched).
        formatter = pkgs.writeShellScriptBin "luci-fmt" ''
          set -euo pipefail
          export PATH=${lib.makeBinPath (with pkgs; [ nixpkgs-fmt shfmt rustToolchain git ])}''${PATH:+:$PATH}
          ${cdRoot}
          git ls-files '*.nix' | xargs -r nixpkgs-fmt
          git ls-files '*.sh' ':!:modules/legacy/**' | xargs -r shfmt -w
          ( cd modules/scm/luci-vcs && cargo fmt )
        '';
      });
}
