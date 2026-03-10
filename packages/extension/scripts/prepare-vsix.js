/**
 * prepare-vsix.js
 *
 * pnpm workspace의 symlink 구조를 vsce가 이해하지 못하므로,
 * better-sqlite3를 extension의 node_modules/에 실제 파일로 복사합니다.
 * vsce package --no-dependencies는 node_modules를 무시하므로,
 * dist/node_modules/better-sqlite3/ 에 복사하여 VSIX에 포함되게 합니다.
 */
import { cpSync, existsSync, mkdirSync, rmSync, readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const extRoot = resolve(__dirname, "..");
const distDir = resolve(extRoot, "dist");

// Find better-sqlite3 from the monorepo root
const monoRoot = resolve(extRoot, "..", "..");

/**
 * Dynamically find a package inside .pnpm directory by prefix.
 * E.g., findPnpmPackage("better-sqlite3") finds "better-sqlite3@X.Y.Z/node_modules/better-sqlite3"
 */
function findPnpmPackage(packageName) {
  const pnpmDir = resolve(monoRoot, "node_modules", ".pnpm");
  if (!existsSync(pnpmDir)) return null;
  const entries = readdirSync(pnpmDir);
  const matches = entries
    .filter((e) => e.startsWith(`${packageName}@`))
    .sort()
    .reverse(); // highest version first
  if (matches.length === 0) return null;
  for (const match of matches) {
    const candidate = resolve(pnpmDir, match, "node_modules", packageName);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

const candidates = [
  resolve(monoRoot, "node_modules", "better-sqlite3"),
  findPnpmPackage("better-sqlite3"),
].filter(Boolean);

let sourceDir = null;
for (const candidate of candidates) {
  if (existsSync(candidate)) {
    sourceDir = candidate;
    break;
  }
}

if (!sourceDir) {
  console.error("Could not find better-sqlite3 in monorepo node_modules");
  process.exit(1);
}

const destDir = resolve(distDir, "node_modules", "better-sqlite3");

// Clean and copy
if (existsSync(destDir)) {
  rmSync(destDir, { recursive: true, force: true });
}
mkdirSync(resolve(distDir, "node_modules"), { recursive: true });
cpSync(sourceDir, destDir, { recursive: true, dereference: true });

// Also copy bindings (peer dependency of better-sqlite3)
const bindingsCandidates = [
  resolve(monoRoot, "node_modules", "bindings"),
  findPnpmPackage("bindings"),
].filter(Boolean);

for (const candidate of bindingsCandidates) {
  if (existsSync(candidate)) {
    const bindingsDest = resolve(distDir, "node_modules", "bindings");
    if (existsSync(bindingsDest)) {
      rmSync(bindingsDest, { recursive: true, force: true });
    }
    cpSync(candidate, bindingsDest, { recursive: true, dereference: true });
    console.log(`Copied bindings from ${candidate}`);
    break;
  }
}

// Also copy file-uri-to-path (peer dependency of bindings)
const fileUriCandidates = [
  resolve(monoRoot, "node_modules", "file-uri-to-path"),
  findPnpmPackage("file-uri-to-path"),
].filter(Boolean);

for (const candidate of fileUriCandidates) {
  if (existsSync(candidate)) {
    const dest = resolve(distDir, "node_modules", "file-uri-to-path");
    if (existsSync(dest)) {
      rmSync(dest, { recursive: true, force: true });
    }
    cpSync(candidate, dest, { recursive: true, dereference: true });
    console.log(`Copied file-uri-to-path from ${candidate}`);
    break;
  }
}

console.log(`Copied better-sqlite3 from ${sourceDir} to ${destDir}`);
