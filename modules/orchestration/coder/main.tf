terraform {
  required_providers {
    coder = {
      source  = "coder/coder"
      version = "~> 0.23"
    }
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

# Coder workspace metadata
data "coder_workspace" "me" {}
data "coder_workspace_owner" "me" {}

# ── Parameters ────────────────────────────────────────────────────────────────

data "coder_parameter" "repo" {
  name         = "repo"
  display_name = "Gogs Repository"
  description  = "Repository URL on the sovereign SCM (e.g. http://gogs.lucidigital.io/luci-digital/ohmyzsh)"
  type         = "string"
  default      = "http://scm-engine:3000/luci-digital/ohmyzsh"
  mutable      = true
}

data "coder_parameter" "sentropy_endpoint" {
  name         = "sentropy_endpoint"
  display_name = "Sentropy QMU Endpoint"
  description  = "Sentropy consciousness API (port 7741)"
  type         = "string"
  default      = "http://host.containers.internal:7741"
  mutable      = true
}

# ── Docker provider — Podman socket ───────────────────────────────────────────
# Podman exposes a Docker-compatible socket at /run/user/1000/podman/podman.sock

provider "docker" {
  host = "unix:///var/run/docker.sock"
}

provider "coder" {}

# ── Workspace image ───────────────────────────────────────────────────────────

resource "docker_image" "luciverse" {
  name = "lucia/coder-workspace:latest"
  build {
    context    = path.module
    dockerfile = "Dockerfile.workspace"
  }
  triggers = {
    dockerfile_hash = filemd5("${path.module}/Dockerfile.workspace")
  }
  keep_locally = true
}

# ── Workspace container ───────────────────────────────────────────────────────

resource "docker_container" "workspace" {
  count = data.coder_workspace.me.start_count
  name  = "coder-${data.coder_workspace_owner.me.name}-${data.coder_workspace.me.name}"
  image = docker_image.luciverse.image_id

  env = [
    "CODER_AGENT_TOKEN=${coder_agent.main.token}",
    "SENTROPY_ENDPOINT=${data.coder_parameter.sentropy_endpoint.value}",
    "REPO_URL=${data.coder_parameter.repo.value}",
    "GIT_AUTHOR_NAME=${data.coder_workspace_owner.me.full_name}",
    "GIT_AUTHOR_EMAIL=${data.coder_workspace_owner.me.email}",
  ]

  volumes {
    volume_name    = docker_volume.workspace.name
    container_path = "/workspace"
  }

  networks_advanced {
    name = "scm_fusion-net"
  }

  command = ["sh", "-c", coder_agent.main.init_script]
  restart = "unless-stopped"
}

resource "docker_volume" "workspace" {
  name = "coder-${data.coder_workspace_owner.me.name}-${data.coder_workspace.me.name}-vol"
}

# ── Coder agent ───────────────────────────────────────────────────────────────

resource "coder_agent" "main" {
  arch           = "amd64"
  os             = "linux"
  startup_script = <<-EOT
    #!/bin/sh
    set -e

    # Clone or update the repo
    if [ -d /workspace/.git ]; then
      git -C /workspace pull --ff-only
    else
      git clone "$REPO_URL" /workspace
    fi

    # Install Node deps if present
    if [ -f /workspace/package.json ]; then
      cd /workspace && npm install
    fi

    echo "LuciVerse workspace ready @ 741 Hz"
  EOT

  metadata {
    display_name = "Sentropy"
    key          = "sentropy_endpoint"
    value        = data.coder_parameter.sentropy_endpoint.value
    interval     = 0
  }
}

# ── Apps ──────────────────────────────────────────────────────────────────────

resource "coder_app" "code-server" {
  agent_id     = coder_agent.main.id
  slug         = "code-server"
  display_name = "VS Code (browser)"
  url          = "http://localhost:13337"
  icon         = "/icon/code.svg"
  subdomain    = true

  healthcheck {
    url       = "http://localhost:13337/healthz"
    interval  = 5
    threshold = 6
  }
}

resource "coder_app" "luciverse-web" {
  agent_id     = coder_agent.main.id
  slug         = "luciverse"
  display_name = "LuciVerse (port 3000)"
  url          = "http://localhost:3000"
  icon         = "/icon/web.svg"
  subdomain    = true
}
