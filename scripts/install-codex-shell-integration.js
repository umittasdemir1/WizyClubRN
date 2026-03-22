#!/usr/bin/env node
const fs = require("fs");
const os = require("os");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const bashLauncher = path.join(repoRoot, "scripts", "codex-launch.sh");
const cmdLauncher = path.join(repoRoot, "scripts", "codex-launch.cmd");
const beginMarker = "# BEGIN WIZYCLUB CODEX MCP LAUNCHER";
const endMarker = "# END WIZYCLUB CODEX MCP LAUNCHER";

function parseArgs(argv) {
    return {
        checkOnly: argv.includes("--check-only"),
        forceAllShells: argv.includes("--all-shells"),
    };
}

function ensureFileExists(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Required file not found: ${filePath}`);
    }
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripManagedBlock(content) {
    const pattern = new RegExp(`${escapeRegExp(beginMarker)}[\\s\\S]*?${escapeRegExp(endMarker)}\\n?`, "g");
    return content.replace(pattern, "").replace(/\n{3,}/g, "\n\n").trim();
}

function upsertManagedBlock(content, block) {
    const stripped = stripManagedBlock(content || "");
    if (!stripped) {
        return `${block}\n`;
    }

    return `${stripped}\n\n${block}\n`;
}

function ensureDir(filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeManagedFile(filePath, block, checkOnly) {
    const exists = fs.existsSync(filePath);
    const current = exists ? fs.readFileSync(filePath, "utf8") : "";
    const next = upsertManagedBlock(current, block);
    const changed = current !== next;

    if (!checkOnly && changed) {
        ensureDir(filePath);
        fs.writeFileSync(filePath, next, "utf8");
    }

    return {
        filePath,
        exists,
        changed,
    };
}

function toGitBashPath(inputPath) {
    const normalized = inputPath.replace(/\\/g, "/");
    const match = normalized.match(/^([A-Za-z]):\/(.*)$/);

    if (!match) {
        return normalized;
    }

    return `/${match[1].toLowerCase()}/${match[2]}`;
}

function quoteSingle(value) {
    return `'${String(value).replace(/'/g, `'\"'\"'`)}'`;
}

function renderPosixBlock() {
    return [
        beginMarker,
        `export WIZYCLUB_CODEX_REPO=${quoteSingle(repoRoot)}`,
        "codex() {",
        `    bash ${quoteSingle(bashLauncher)} \"$@\"`,
        "}",
        endMarker,
    ].join("\n");
}

function renderGitBashBlock() {
    const repoForBash = toGitBashPath(repoRoot);
    const launcherForBash = toGitBashPath(bashLauncher);

    return [
        beginMarker,
        `export WIZYCLUB_CODEX_REPO=${quoteSingle(repoForBash)}`,
        "codex() {",
        `    bash ${quoteSingle(launcherForBash)} \"$@\"`,
        "}",
        endMarker,
    ].join("\n");
}

function renderPowerShellBlock() {
    const escaped = cmdLauncher.replace(/`/g, "``");

    return [
        beginMarker,
        `Set-Item -Path Env:WIZYCLUB_CODEX_REPO -Value "${repoRoot}"`,
        "function global:codex {",
        `    & "${escaped}" @args`,
        "}",
        endMarker,
    ].join("\n");
}

function detectTargets(options) {
    const home = os.homedir();
    const shell = process.env.SHELL || "";
    const isZsh = /zsh$/i.test(shell);

    if (process.platform === "win32") {
        return [
            {
                name: "powershell-core",
                filePath: path.join(home, "Documents", "PowerShell", "Microsoft.PowerShell_profile.ps1"),
                block: renderPowerShellBlock(),
            },
            {
                name: "powershell-windows",
                filePath: path.join(home, "Documents", "WindowsPowerShell", "Microsoft.PowerShell_profile.ps1"),
                block: renderPowerShellBlock(),
            },
            {
                name: "git-bash",
                filePath: path.join(home, ".bashrc"),
                block: renderGitBashBlock(),
            },
        ];
    }

    const targets = [
        {
            name: "bash",
            filePath: path.join(home, ".bashrc"),
            block: renderPosixBlock(),
        },
    ];

    if (options.forceAllShells || isZsh || fs.existsSync(path.join(home, ".zshrc"))) {
        targets.push({
            name: "zsh",
            filePath: path.join(home, ".zshrc"),
            block: renderPosixBlock(),
        });
    }

    return targets;
}

function main() {
    const options = parseArgs(process.argv.slice(2));

    ensureFileExists(bashLauncher);
    ensureFileExists(cmdLauncher);

    const targets = detectTargets(options);
    console.log(`[codex-shell-install] platform=${process.platform} home=${os.homedir()}`);

    targets.forEach((target) => {
        const result = writeManagedFile(target.filePath, target.block, options.checkOnly);
        const action = options.checkOnly
            ? (result.changed ? "would-update" : "ok")
            : (result.changed ? "updated" : "ok");
        console.log(`[codex-shell-install] ${target.name} ${action} ${target.filePath}`);
    });

    if (options.checkOnly) {
        console.log("[codex-shell-install] check complete");
    } else {
        console.log("[codex-shell-install] install complete");
    }
}

try {
    main();
} catch (error) {
    console.error(`[codex-shell-install] failed: ${error.message}`);
    process.exit(1);
}
