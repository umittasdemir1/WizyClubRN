#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { resolveConfigPath } = require("./lib/codex-mcp");

const repoRoot = path.resolve(__dirname, "..");
const rootEnvPath = path.join(repoRoot, ".env");
const r2EnvPath = path.join(repoRoot, "r2-mcp", ".env");
const r2ServerPath = path.join(repoRoot, "r2-mcp", "custom-r2-server.js");
const r2NodeModulesPath = path.join(repoRoot, "r2-mcp", "node_modules");
const requiredR2Modules = [
    path.join(r2NodeModulesPath, "@aws-sdk", "client-s3"),
    path.join(r2NodeModulesPath, "@modelcontextprotocol", "sdk")
];

function parseArgs(argv) {
    return {
        checkOnly: argv.includes("--check-only"),
        noList: argv.includes("--no-list"),
        forceInstall: argv.includes("--force-install"),
        fullEnvSync: argv.includes("--full-env-sync"),
    };
}

function commandName(base) {
    if (process.platform === "win32") {
        return `${base}.cmd`;
    }

    return base;
}

function commandExists(command, args) {
    const result = spawnSync(command, args, {
        cwd: repoRoot,
        stdio: "pipe",
        env: process.env,
    });

    return !result.error;
}

function shellDescriptor() {
    if (process.platform === "win32") {
        return {
            command: process.env.ComSpec || "cmd.exe",
            argsFor: (statement) => ["/d", "/s", "/c", statement],
        };
    }

    return {
        command: process.env.SHELL || "bash",
        argsFor: (statement) => ["-c", statement],
    };
}

function codexHelpProbe() {
    if (process.platform === "win32") {
        return "codex --help >NUL 2>&1";
    }

    return "codex --help >/dev/null 2>&1";
}

function shellCommandExists(statement) {
    const shell = shellDescriptor();
    const result = spawnSync(shell.command, shell.argsFor(statement), {
        cwd: repoRoot,
        stdio: "pipe",
        env: process.env,
    });

    return !result.error && result.status === 0;
}

function runStep(label, command, args) {
    console.log(`[codex-mcp-bootstrap] ${label}`);

    const result = spawnSync(command, args, {
        cwd: repoRoot,
        stdio: "inherit",
        env: process.env,
    });

    if (result.error) {
        throw result.error;
    }

    if (result.status !== 0) {
        throw new Error(`${label} failed with exit code ${result.status}`);
    }
}

function runShellStep(label, statement) {
    const shell = shellDescriptor();
    runStep(label, shell.command, shell.argsFor(statement));
}

function detectEnvironment() {
    const platform = process.platform;
    const isWindows = platform === "win32";
    const isMac = platform === "darwin";
    const isLinux = platform === "linux";
    const isVscode = process.env.TERM_PROGRAM === "vscode"
        || Boolean(process.env.VSCODE_IPC_HOOK_CLI)
        || Boolean(process.env.VSCODE_GIT_IPC_HANDLE);
    const isFirebaseStudio = process.env.GOOGLE_CLOUD_WORKSTATIONS === "true"
        || Boolean(process.env.FIREBASE_DEPLOY_AGENT)
        || /cloudworkstations\.dev/i.test(process.env.WEB_HOST || "");

    let profile = "unknown";

    if (isFirebaseStudio) {
        profile = "firebase-studio";
    } else if (isWindows && isVscode) {
        profile = "windows-vscode-local";
    } else if (isWindows) {
        profile = "windows-local";
    } else if (isLinux && isVscode) {
        profile = "linux-vscode";
    } else if (isLinux) {
        profile = "linux";
    } else if (isMac && isVscode) {
        profile = "macos-vscode";
    } else if (isMac) {
        profile = "macos";
    }

    return {
        profile,
        platform,
        shell: process.env.SHELL || process.env.ComSpec || "unknown",
        isVscode,
        isFirebaseStudio,
        configPath: resolveConfigPath(),
    };
}

function formatEnvironment(info) {
    return [
        `profile=${info.profile}`,
        `platform=${info.platform}`,
        `shell=${info.shell}`,
        `vscode=${info.isVscode ? "yes" : "no"}`,
        `firebaseStudio=${info.isFirebaseStudio ? "yes" : "no"}`,
        `config=${info.configPath}`,
    ].join(" ");
}

function hasRequiredR2Modules() {
    return requiredR2Modules.every((modulePath) => fs.existsSync(modulePath));
}

function maybeRunFullEnvSync(options) {
    if (!options.fullEnvSync) {
        return false;
    }

    if (!commandExists("bash", ["--version"])) {
        console.log("[codex-mcp-bootstrap] bash not found; skipping full env sync.");
        return false;
    }

    runStep("sync root env into backend/mobile/r2-mcp", "bash", ["scripts/sync-env.sh", "all"]);
    return true;
}

function ensurePreconditions() {
    if (!fs.existsSync(rootEnvPath)) {
        throw new Error(`Root .env not found: ${rootEnvPath}. Create it from .env.example first.`);
    }

    if (!fs.existsSync(r2ServerPath)) {
        throw new Error(`R2 MCP server file not found: ${r2ServerPath}`);
    }
}

function inspectState() {
    const state = {
        rootEnv: fs.existsSync(rootEnvPath),
        r2Env: fs.existsSync(r2EnvPath),
        r2NodeModules: fs.existsSync(r2NodeModulesPath),
        r2Deps: hasRequiredR2Modules(),
        codexConfig: fs.existsSync(resolveConfigPath()),
    };

    console.log("[codex-mcp-bootstrap] state");
    Object.entries(state).forEach(([key, value]) => {
        console.log(`- ${key}: ${value ? "yes" : "no"}`);
    });

    return state;
}

function main() {
    const options = parseArgs(process.argv.slice(2));
    const environment = detectEnvironment();

    console.log(`[codex-mcp-bootstrap] environment ${formatEnvironment(environment)}`);
    ensurePreconditions();

    if (options.checkOnly) {
        inspectState();
        runStep("verify managed Codex MCP block", "node", ["scripts/doctor-codex-mcp.js"]);
        runStep("syntax check r2-local server", "node", ["-c", "r2-mcp/custom-r2-server.js"]);

        if (!options.noList && shellCommandExists(codexHelpProbe())) {
            runShellStep("list active MCP servers", "codex mcp list");
        }

        return;
    }

    maybeRunFullEnvSync(options);

    if (options.forceInstall || !hasRequiredR2Modules()) {
        runStep("install r2-mcp dependencies", commandName("npm"), ["--prefix", "r2-mcp", "ci"]);
    } else {
        console.log("[codex-mcp-bootstrap] r2-mcp dependencies already present; skipping npm ci.");
    }

    runStep("write managed Codex MCP block", "node", ["scripts/setup-codex-mcp.js"]);
    runStep("verify managed Codex MCP block", "node", ["scripts/doctor-codex-mcp.js"]);
    runStep("syntax check r2-local server", "node", ["-c", "r2-mcp/custom-r2-server.js"]);

    if (!options.noList && shellCommandExists(codexHelpProbe())) {
        runShellStep("list active MCP servers", "codex mcp list");
    } else if (!options.noList) {
        console.log("[codex-mcp-bootstrap] codex CLI not found; skipping 'codex mcp list'.");
    }

    console.log("[codex-mcp-bootstrap] done");
}

try {
    main();
} catch (error) {
    console.error(`[codex-mcp-bootstrap] failed: ${error.message}`);
    process.exit(1);
}
