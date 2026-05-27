# infra/secrets

- `env.example` — template for required environment variables.

Real secrets are sourced from the 1Password switchboard (`op://`) at deploy
time and **never** committed. Copy `env.example` to `.env` locally.
