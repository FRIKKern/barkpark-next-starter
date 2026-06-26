#!/usr/bin/env bash
#
# Bind THIS folder to a Barkpark project (in the default workspace) and wire the app to it.
#
#   npm run new-project <name>
#
# Creates the project, then writes:
#   .envrc      → direnv: every `bp` command run in this folder auto-targets default/<name>/production
#   .env.local  → the Next app reads that same project
#
# Defaults to a local Barkpark (http://localhost:4000, dev token). Point at a cloud one with
#   BARKPARK_API_URL=https://api.barkpark.cloud BP_ADMIN_TOKEN=<admin> npm run new-project <name>
#
set -euo pipefail
cd "$(dirname "$0")/.."

ok(){ printf '  \033[32m✓\033[0m %s\n' "$1"; }
info(){ printf '  \033[2m%s\033[0m\n' "$1"; }
die(){ printf '\033[31m✗ %s\033[0m\n' "$1" >&2; exit 1; }

NAME="${1:-${BARKPARK_PROJECT:-}}"
if [ -z "$NAME" ]; then
  [ -t 0 ] || die "pass a project name:  npm run new-project <name>"
  printf 'Project name (slug): '; read -r NAME
fi
[ -n "$NAME" ] || die "project name required"

URL="${BARKPARK_API_URL:-http://localhost:4000}"
ADMIN="${BP_ADMIN_TOKEN:-barkpark-dev-token}"
WS="${BARKPARK_WORKSPACE:-default}"
DATASET="${BARKPARK_DATASET:-production}"

command -v bp >/dev/null || die "Barkpark CLI (bp) required:
    curl -fsSL https://raw.githubusercontent.com/FRIKKern/barkpark/main/scripts/install-cli.sh | sh"

printf '\n\033[1m🐶  Bind this folder to Barkpark project "%s"\033[0m  (%s/%s)\n\n' "$NAME" "$WS" "$DATASET"

printf '▸ Project "%s" in workspace "%s" (%s)\n' "$NAME" "$WS" "$URL"
if bp -s "$URL" --token "$ADMIN" -w "$WS" workspace project-create "$NAME" >/dev/null 2>&1; then
  ok "created"
else
  ok "exists — reusing"   # project-create errors when it already exists; that's fine
fi

# direnv: auto-scope `bp` (and the app's env) to this project whenever you're in this folder
cat > .envrc <<EOF
# Auto-scopes bp + the app to this Barkpark project (direnv). Gitignored — holds a token.
export BARKPARK_API_URL=$URL
export BARKPARK_API_TOKEN=$ADMIN
export BARKPARK_WORKSPACE=$WS
export BARKPARK_PROJECT=$NAME
export BARKPARK_DATASET=$DATASET
EOF
ok "wrote .envrc"

# the Next app — server-side read scope (BARKPARK_* are not NEXT_PUBLIC_, never bundled)
cat > .env.local <<EOF
# This folder's Barkpark project. Server-side only (no NEXT_PUBLIC_ on the token).
NEXT_PUBLIC_API_URL=$URL
BARKPARK_READ_TOKEN=$ADMIN
BARKPARK_WORKSPACE=$WS
BARKPARK_PROJECT=$NAME
BARKPARK_DATASET=$DATASET
EOF
ok "wrote .env.local"

if command -v direnv >/dev/null 2>&1; then
  direnv allow . >/dev/null 2>&1 && ok "direnv allowed — \`bp\` in this folder now targets $WS/$NAME/$DATASET"
else
  info "tip: \`brew install direnv\` (+ hook your shell) so bp auto-scopes here."
  info "without it: \`set -a; . ./.envrc; set +a\` to scope bp in this shell."
fi

cat <<EOF

Done — this folder is Barkpark project "$NAME".
  bp schema apply -f schema.json     # all bp commands here target $WS/$NAME/$DATASET
  bp doc mutate --file content.json
  npm run dev                        # the app reads project "$NAME"  → http://localhost:3000
EOF
