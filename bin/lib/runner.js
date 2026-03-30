// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

const { spawnSync } = require("child_process");
const path = require("path");
const { detectDockerHost } = require("./platform");

const ROOT = path.resolve(__dirname, "..", "..");
const SCRIPTS = path.join(ROOT, "scripts");
const SHELL_SCRIPTS = "./scripts";

const dockerHost = detectDockerHost();
if (dockerHost) {
  process.env.DOCKER_HOST = dockerHost.dockerHost;
}

function run(cmd, opts = {}) {
  const stdio = opts.stdio ?? ["ignore", "inherit", "inherit"];
  const result = spawnSync("bash", ["-c", cmd], {
    ...opts,
    stdio,
    cwd: ROOT,
    env: { ...process.env, ...opts.env },
  });
  if (result.status !== 0 && !opts.ignoreError) {
    console.error(`  Command failed (exit ${result.status}): ${cmd.slice(0, 80)}`);
    process.exit(result.status || 1);
  }
  return result;
}

function runInteractive(cmd, opts = {}) {
  const stdio = opts.stdio ?? "inherit";
  const result = spawnSync("bash", ["-c", cmd], {
    ...opts,
    stdio,
    cwd: ROOT,
    env: { ...process.env, ...opts.env },
  });
  if (result.status !== 0 && !opts.ignoreError) {
    console.error(`  Command failed (exit ${result.status}): ${cmd.slice(0, 80)}`);
    process.exit(result.status || 1);
  }
  return result;
}

function runCapture(cmd, opts = {}) {
  const result = spawnSync("bash", ["-c", cmd], {
    cwd: ROOT,
    env: { ...process.env, ...opts.env },
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
    ...opts,
  });
  const stdout = (result.stdout || "").trim();
  if (result.status !== 0) {
  try {
    return execSync(cmd, {
      ...opts,
      encoding: "utf-8",
      cwd: ROOT,
      env: { ...process.env, ...opts.env },
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch (err) {
    if (opts.ignoreError) return "";
    const err = new Error((result.stderr || stdout || `Command failed: ${cmd}`).trim());
    err.status = result.status;
    err.stdout = stdout;
    err.stderr = (result.stderr || "").trim();
    throw err;
  }
  return stdout;
}

function toWslPath(inputPath) {
  const resolved = path.resolve(inputPath);
  if (process.platform !== "win32") {
    return resolved.replace(/\\/g, "/");
  }
  const match = resolved.match(/^([A-Za-z]):\\(.*)$/);
  if (!match) {
    return resolved.replace(/\\/g, "/");
  }
  const [, drive, tail] = match;
  return `/mnt/${drive.toLowerCase()}/${tail.replace(/\\/g, "/")}`;
}

function unsupportedWindowsMessage() {
  return [
    "  Windows host shells are not supported for NemoClaw onboarding.",
    "  Run the repo from WSL2 Ubuntu instead:",
    `    wsl -d Ubuntu -- bash -lc 'cd ${toWslPath(ROOT)} && ./install.sh'`,
  ].join("\n");
}

function ensureSupportedHost() {
  if (process.platform !== "win32") return;
  console.error("");
  console.error(unsupportedWindowsMessage());
  process.exit(1);
}

module.exports = {
  ROOT,
  SCRIPTS,
  SHELL_SCRIPTS,
  run,
  runCapture,
  toWslPath,
  unsupportedWindowsMessage,
  ensureSupportedHost,
};
module.exports = { ROOT, SCRIPTS, run, runCapture, runInteractive };
/**
 * Shell-quote a value for safe interpolation into bash -c strings.
 * Wraps in single quotes and escapes embedded single quotes.
 */
function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

/**
 * Validate a name (sandbox, instance, container) against RFC 1123 label rules.
 * Rejects shell metacharacters, path traversal, and empty/overlength names.
 */
function validateName(name, label = "name") {
  if (!name || typeof name !== "string") {
    throw new Error(`${label} is required`);
  }
  if (name.length > 63) {
    throw new Error(`${label} too long (max 63 chars): '${name.slice(0, 20)}...'`);
  }
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(name)) {
    throw new Error(
      `Invalid ${label}: '${name}'. Must be lowercase alphanumeric with optional internal hyphens.`
    );
  }
  return name;
}

module.exports = { ROOT, SCRIPTS, run, runCapture, runInteractive, shellQuote, validateName };
