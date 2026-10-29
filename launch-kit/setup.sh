#!/usr/bin/env bash
# VETO token launcher setup (Mac/Linux). Downloads everything, installs, and starts the launcher.
set -e
echo; echo "== VETO launcher setup =="
if ! command -v node >/dev/null; then
  if command -v brew >/dev/null; then brew install node; else echo "Install Node.js LTS from https://nodejs.org, then run this command again."; exit 1; fi
fi
mkdir -p "$HOME/veto-launch" && cd "$HOME/veto-launch"
for f in launch.mjs token.json verify-input.json package.json; do echo "Downloading $f"; curl -fsSL "https://raw.githubusercontent.com/Fabulous1112/veto-site/main/launch-kit/$f" -o "$f"; done
echo "Installing (about 30 seconds)..."
npm install --no-fund --no-audit --loglevel=error
read -r -p "Type mainnet for the real launch, or testnet to practise: " net </dev/tty
[ "$net" = "testnet" ] || net=mainnet
node launch.mjs "$net" </dev/tty
