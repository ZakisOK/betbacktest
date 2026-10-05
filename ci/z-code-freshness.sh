#!/bin/sh
# Freshness CI wiring for the z-code harness (spec Layer 1).
# Drop this into your CI on every change. It runs the shipped check
# scripts against the manifest. Any failure states what was violated
# and what to do instead. This wiring makes no network calls.
set -e

# Resolve the repository root: this file lives in ci/, one level down.
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
MANIFEST="$ROOT/z-code.yaml"

# The check scripts ship with the Z.Code kit, not with this repo. Point
# ZCODE_CHECKS at the kit's checks/ directory and ZCODE_PYTHON at a python3
# that has PyYAML and jsonschema (the kit's .venv does).
CHECKS="${ZCODE_CHECKS:?set ZCODE_CHECKS to the Z.Code kit checks/ directory}"
PY="${ZCODE_PYTHON:-python3}"

"$PY" "$CHECKS/check_hash_drift.py" "$MANIFEST"
"$PY" "$CHECKS/check_inventory_count.py" "$MANIFEST"
"$PY" "$CHECKS/check_token_budget.py" "$MANIFEST"
"$PY" "$CHECKS/check_test_surface.py" "$MANIFEST"
# The protected-surface guard scores a list of changed files. It is for
# agent-authored changes: set ZCODE_BASE (for example origin/main) to
# diff against it. Unset, the guard is skipped so maps can be edited.
if [ -n "${ZCODE_BASE:-}" ]; then
  git -C "$ROOT" diff --name-only "$ZCODE_BASE"...HEAD | "$PY" "$CHECKS/check_protected_surface.py" "$MANIFEST"
else
  echo "check_protected_surface: skipped (set ZCODE_BASE to guard an agent change)"
fi

echo "freshness CI: all checks passed"
