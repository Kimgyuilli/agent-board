#!/usr/bin/env bash
set -euo pipefail

echo "=== Verify Completion ==="

echo ">> Running lint..."
npx pnpm lint
echo ">> Lint passed."

echo ">> Running tests..."
npx pnpm test
echo ">> Tests passed."

echo ">> Running type check..."
npx pnpm -r exec tsc --noEmit
echo ">> Type check passed."

echo "=== Verification PASSED ==="
