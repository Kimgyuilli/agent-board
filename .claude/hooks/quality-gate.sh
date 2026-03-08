#!/usr/bin/env bash
set -euo pipefail

echo "=== Quality Gate ==="

echo ">> Running lint..."
npx pnpm lint
echo ">> Lint passed."

echo ">> Running tests..."
npx pnpm test
echo ">> Tests passed."

echo "=== Quality Gate PASSED ==="
