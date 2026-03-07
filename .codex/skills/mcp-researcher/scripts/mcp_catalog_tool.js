#!/usr/bin/env node

const fs = require("fs");
const https = require("https");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const OFFICIAL_CATALOG_URL = "https://raw.githubusercontent.com/modelcontextprotocol/servers/main/README.md";
const AWESOME_CATALOG_URL = "https://raw.githubusercontent.com/punkpeye/awesome-mcp-servers/main/README.md";
const GITHUB_API_ROOT = "https://api.github.com";
const USER_AGENT = "WizyClubRN-mcp-researcher/1.0";
const REPO_ROOT = path.resolve(__dirname, "../../../..");
const DEFAULT_MANIFEST_PATH = path.join(REPO_ROOT, ".codex", "mcp-servers.json");
const DEFAULT_ENV_PATH = path.join(REPO_ROOT, ".env");
const DEFAULT_ENV_EXAMPLE_PATH = path.join(REPO_ROOT, ".env.example");
const SUSPICIOUS_SUFFIXES = new Set([
    ".bat",
    ".cmd",
    ".dll",
    ".dylib",
    ".exe",
    ".jar",
    ".msi",
    ".ps1",
    ".so",
]);
const AUTH_LINE_RE = /(api key|access token|token|oauth|credential|secret|login|auth|environment variables?|env var|personal access token)/i;
const ENV_KEY_RE = /\b[A-Z][A-Z0-9_]{2,}\b/g;
const ENV_KEY_HINT_RE = /(_|KEY|TOKEN|SECRET|PASSWORD|URL|ID|CLIENT|ACCOUNT|PROJECT|ORG|PAT|CREDENTIAL)/;
const ENV_STOP_WORDS = new Set([
    "API",
    "HTTP",
    "HTTPS",
    "JSON",
    "URLS",
    "MCP",
    "README",
    "STDIO",
    "SSE",
    "WS",
]);

function fail(message) {
    console.error(`error: ${message}`);
    process.exit(1);
}

function normalizeWhitespace(value) {
    return String(value).replace(/\s+/g, " ").trim();
}

function stripHtml(value) {
    return String(value).replace(/<[^>]+>/g, " ").replace(/`/g, "").trim();
}

function slugify(value) {
    const slug = String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return slug || "mcp-server";
}

function ensureWithinRoot(root, candidate) {
    const resolvedRoot = path.resolve(root);
    const resolvedCandidate = path.resolve(candidate);
    if (resolvedCandidate !== resolvedRoot && !resolvedCandidate.startsWith(`${resolvedRoot}${path.sep}`)) {
        fail(`path escapes the expected root: ${candidate}`);
    }
    return resolvedCandidate;
}

function readBuffer(url, accept = "text/plain") {
    return new Promise((resolve, reject) => {
        function requestUrl(currentUrl, redirects = 0) {
            if (redirects > 5) {
                reject(new Error(`too many redirects while fetching ${url}`));
                return;
            }

            const request = https.request(
                currentUrl,
                {
                    headers: {
                        Accept: accept,
                        "User-Agent": USER_AGENT,
                    },
                },
                (response) => {
                    const status = response.statusCode || 0;
                    if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) {
                        response.resume();
                        requestUrl(new URL(response.headers.location, currentUrl).toString(), redirects + 1);
                        return;
                    }

                    if (status >= 400) {
                        const chunks = [];
                        response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
                        response.on("end", () => {
                            reject(new Error(`${currentUrl} returned HTTP ${status}: ${Buffer.concat(chunks).toString("utf8").slice(0, 240)}`));
                        });
                        return;
                    }

                    const chunks = [];
                    response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
                    response.on("end", () => resolve(Buffer.concat(chunks)));
                }
            );

            request.on("error", reject);
            request.end();
        }

        requestUrl(url);
    });
}

function readText(url, accept = "text/plain") {
    return readBuffer(url, accept).then((buffer) => buffer.toString("utf8"));
}

function loadManifest(manifestPath) {
    return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function existingServerNames(manifestPath) {
    if (!fs.existsSync(manifestPath)) {
        return new Set();
    }
    const manifest = loadManifest(manifestPath);
    return new Set((manifest.servers || []).map((server) => server.name));
}

function parseOfficialCatalog(markdown, knownServers) {
    const entries = [];
    let currentSection = "Official";
    for (const rawLine of markdown.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (line.startsWith("### ")) {
            currentSection = normalizeWhitespace(line.slice(4));
            if (/community servers/i.test(currentSection)) {
                break;
            }
            continue;
        }

        const match = line.match(/^- (?:\*\*)?\[([^\]]+)\]\(([^)]+)\)(?:\*\*)?\s*[-–]\s*(.+)$/)
            || line.match(/^\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|\s*(.*?)\s*\|$/);
        if (!match || /^name$/i.test(match[1])) {
            continue;
        }

        const link = match[2].startsWith("http")
            ? match[2]
            : `https://github.com/modelcontextprotocol/servers/tree/main/${match[2].replace(/^\.\//, "")}`;
        const suggestedName = slugify(match[1]);
        entries.push({
            catalog: "official-repo",
            section: currentSection,
            name: normalizeWhitespace(match[1]),
            url: link,
            description: stripHtml(match[3]),
            suggestedName,
            localOverlap: knownServers.has(suggestedName),
            score: 0,
        });
    }
    return entries;
}

function parseAwesomeCatalog(markdown, knownServers) {
    const entries = [];
    let currentSection = "Awesome MCP Servers";
    for (const rawLine of markdown.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (line.startsWith("### ")) {
            currentSection = normalizeWhitespace(line.replace(/^###\s+/, "").replace(/<[^>]+>/g, " "));
            continue;
        }
        if (line.startsWith("## ")) {
            currentSection = normalizeWhitespace(line.slice(3));
            continue;
        }

        const match = line.match(/^- (?:\*\*)?\[([^\]]+)\]\(([^)]+)\)(?:\*\*)?\s*[-–]\s*(.+)$/);
        if (!match) {
            continue;
        }

        const url = match[2];
        const suggestedName = slugify(match[1]);
        entries.push({
            catalog: "awesome-list",
            section: currentSection,
            name: normalizeWhitespace(match[1]),
            url,
            description: stripHtml(match[3]),
            suggestedName,
            localOverlap: knownServers.has(suggestedName),
            score: 0,
        });
    }
    return entries;
}

function scoreEntry(entry, terms, requireAllTerms) {
    let score = 0;
    let anyMatch = false;
    const searchable = {
        name: entry.name.toLowerCase(),
        description: entry.description.toLowerCase(),
        section: entry.section.toLowerCase(),
        url: entry.url.toLowerCase(),
    };

    for (const term of terms) {
        let matched = false;
        if (searchable.name.includes(term)) {
            score += 5;
            matched = true;
            anyMatch = true;
        }
        if (searchable.description.includes(term)) {
            score += 3;
            matched = true;
            anyMatch = true;
        }
        if (searchable.section.includes(term) || searchable.url.includes(term)) {
            score += 1;
            matched = true;
            anyMatch = true;
        }
        if (requireAllTerms && !matched) {
            return 0;
        }
    }

    if (anyMatch && entry.catalog === "official-repo") {
        score += 2;
    }
    if (entry.localOverlap) {
        score -= 2;
    }
    return score;
}

function parseGithubTarget(source) {
    const trimmed = String(source).trim();
    const shorthand = trimmed.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
    if (shorthand) {
        return {
            owner: shorthand[1],
            repo: shorthand[2],
            kind: "repo",
            branch: null,
            repoPath: null,
            original: source,
        };
    }

    let parsed;
    try {
        parsed = new URL(trimmed);
    } catch (error) {
        fail("inspect requires a GitHub URL or owner/repo shorthand");
    }

    if (parsed.hostname !== "github.com") {
        fail("inspect currently supports github.com sources only");
    }

    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length < 2) {
        fail("GitHub URL must include owner and repo");
    }

    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/, "");
    if (parts.length === 2) {
        return { owner, repo, kind: "repo", branch: null, repoPath: null, original: source };
    }

    const kind = parts[2];
    if (kind !== "tree" && kind !== "blob") {
        return { owner, repo, kind: "repo", branch: null, repoPath: null, original: source };
    }
    if (parts.length < 4) {
        fail("tree/blob URLs must include a branch name");
    }

    return {
        owner,
        repo,
        kind,
        branch: parts[3],
        repoPath: parts.slice(4).join("/") || null,
        original: source,
    };
}

async function resolveBranch(target) {
    if (target.branch) {
        return target.branch;
    }

    const payload = JSON.parse(await readText(`${GITHUB_API_ROOT}/repos/${target.owner}/${target.repo}`, "application/vnd.github+json"));
    if (!payload.default_branch) {
        fail(`could not determine default branch for ${target.owner}/${target.repo}`);
    }
    return payload.default_branch;
}

function cloneRepo(target, branch) {
    const tempParent = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-researcher-"));
    const repoRoot = path.join(tempParent, "repo");
    const repoUrl = `https://github.com/${target.owner}/${target.repo}.git`;

    try {
        execFileSync("git", ["clone", "--depth", "1", "--branch", branch, repoUrl, repoRoot], {
            stdio: "pipe",
        });
    } catch (error) {
        fs.rmSync(tempParent, { recursive: true, force: true });
        const stderr = error.stderr ? String(error.stderr).trim() : "";
        fail(`git clone failed for ${repoUrl}: ${stderr || error.message}`);
    }

    return { tempParent, repoRoot };
}

function chooseInspectRoot(target, repoRoot, explicitPath) {
    if (explicitPath) {
        return ensureWithinRoot(repoRoot, path.join(repoRoot, explicitPath));
    }
    if (!target.repoPath) {
        return repoRoot;
    }
    const repoPath = target.kind === "blob" && path.extname(target.repoPath).toLowerCase() === ".md"
        ? path.dirname(target.repoPath)
        : target.repoPath;
    return ensureWithinRoot(repoRoot, path.join(repoRoot, repoPath));
}

function walkFiles(rootDir) {
    const files = [];

    function visit(currentDir) {
        for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
            const fullPath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                visit(fullPath);
                continue;
            }
            if (entry.isFile()) {
                files.push(fullPath);
            }
        }
    }

    visit(rootDir);
    files.sort();
    return files;
}

function extractSummary(text) {
    const lines = text.split(/\r?\n/).map((line) => stripHtml(line).trim());
    for (const line of lines) {
        if (!line) {
            continue;
        }
        if (line.startsWith("#") || line.startsWith("```") || line.startsWith("|") || line.startsWith(">")) {
            continue;
        }
        if (line.length < 20) {
            continue;
        }
        return normalizeWhitespace(line);
    }
    return "";
}

function extractEnvKeys(text) {
    const keys = new Set();
    for (const rawLine of text.split(/\r?\n/)) {
        if (!AUTH_LINE_RE.test(rawLine)) {
            continue;
        }
        for (const match of rawLine.matchAll(ENV_KEY_RE)) {
            const key = match[0];
            if (ENV_STOP_WORDS.has(key)) {
                continue;
            }
            if (!ENV_KEY_HINT_RE.test(key) && !key.includes("_")) {
                continue;
            }
            keys.add(key);
        }
    }
    return Array.from(keys).sort();
}

function extractAuthHints(text) {
    const hints = new Set();
    if (/oauth/i.test(text)) {
        hints.add("oauth");
    }
    if (/api key/i.test(text)) {
        hints.add("api-key");
    }
    if (/personal access token|access token|token/i.test(text)) {
        hints.add("token");
    }
    if (/login|sign in|authenticate/i.test(text)) {
        hints.add("interactive-login");
    }
    if (/secret/i.test(text)) {
        hints.add("secret");
    }
    return Array.from(hints).sort();
}

function parseJsonFile(filePath) {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function parsePyProjectName(filePath) {
    const content = fs.readFileSync(filePath, "utf8");
    const sectionMatch = content.match(/\[project\][\s\S]*?^name\s*=\s*["']([^"']+)["']/m);
    if (sectionMatch) {
        return sectionMatch[1];
    }
    const fallbackMatch = content.match(/^name\s*=\s*["']([^"']+)["']/m);
    return fallbackMatch ? fallbackMatch[1] : null;
}

function inspectRepoTree(inspectRoot) {
    const files = walkFiles(inspectRoot);
    const readmes = files.filter((filePath) => /^readme(\.|$)/i.test(path.basename(filePath)));
    const packageJsonFiles = files.filter((filePath) => path.basename(filePath) === "package.json");
    const pyProjectFiles = files.filter((filePath) => path.basename(filePath) === "pyproject.toml");
    const dockerfiles = files.filter((filePath) => path.basename(filePath).toLowerCase() === "dockerfile");

    const packages = [];
    for (const packageFile of packageJsonFiles) {
        try {
            const pkg = parseJsonFile(packageFile);
            packages.push({
                path: path.relative(inspectRoot, packageFile),
                name: pkg.name || null,
                description: pkg.description || null,
                bin: pkg.bin || null,
            });
        } catch (error) {
            packages.push({
                path: path.relative(inspectRoot, packageFile),
                name: null,
                description: `unreadable package.json: ${error.message}`,
                bin: null,
            });
        }
    }

    const pythonProjects = [];
    for (const pyProjectFile of pyProjectFiles) {
        pythonProjects.push({
            path: path.relative(inspectRoot, pyProjectFile),
            name: parsePyProjectName(pyProjectFile),
        });
    }

    const readmeTexts = readmes.slice(0, 3).map((filePath) => fs.readFileSync(filePath, "utf8"));
    const mergedReadme = readmeTexts.join("\n\n");
    const guessedEnvKeys = extractEnvKeys(mergedReadme);
    const authHints = extractAuthHints(mergedReadme);
    const summary = extractSummary(mergedReadme);
    const commandHints = [];

    for (const pkg of packages) {
        if (pkg.name) {
            commandHints.push(`npx -y ${pkg.name}`);
        }
    }
    for (const project of pythonProjects) {
        if (project.name) {
            commandHints.push(`uvx ${project.name}`);
        }
    }
    if (dockerfiles.length > 0) {
        commandHints.push("docker run ...");
    }

    return {
        readmes: readmes.map((filePath) => path.relative(inspectRoot, filePath)),
        packages,
        pythonProjects,
        dockerfiles: dockerfiles.map((filePath) => path.relative(inspectRoot, filePath)),
        summary,
        guessedEnvKeys,
        authHints,
        commandHints: Array.from(new Set(commandHints)),
        suspiciousFiles: files
            .map((filePath) => path.relative(inspectRoot, filePath))
            .filter((filePath) => SUSPICIOUS_SUFFIXES.has(path.extname(filePath).toLowerCase())),
    };
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseEnvAssignments(content) {
    const keys = new Set();
    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) {
            continue;
        }
        const index = line.indexOf("=");
        if (index <= 0) {
            continue;
        }
        keys.add(line.slice(0, index).trim());
    }
    return keys;
}

function stripManagedEnvBlock(content, serverName) {
    const begin = `# BEGIN WIZYCLUB MANAGED MCP ENV ${serverName}`;
    const end = `# END WIZYCLUB MANAGED MCP ENV ${serverName}`;
    const pattern = new RegExp(`${escapeRegExp(begin)}[\\s\\S]*?${escapeRegExp(end)}\\n?`, "g");
    return content.replace(pattern, "").replace(/\n{3,}/g, "\n\n").trim();
}

function buildEnvBlock(serverName, description, sourceUrl, entries) {
    const lines = [
        `# BEGIN WIZYCLUB MANAGED MCP ENV ${serverName}`,
        `# ${serverName} MCP`,
    ];
    if (description) {
        lines.push(`# ${description}`);
    }
    if (sourceUrl) {
        lines.push(`# Source: ${sourceUrl}`);
    }
    for (const entry of entries) {
        lines.push(`${entry.key}=${entry.value}`);
    }
    lines.push(`# END WIZYCLUB MANAGED MCP ENV ${serverName}`);
    return `${lines.join("\n")}\n`;
}

function upsertManagedEnvFile(filePath, serverName, description, sourceUrl, requestedEntries, dryRun) {
    const exists = fs.existsSync(filePath);
    const current = exists ? fs.readFileSync(filePath, "utf8") : "";
    const stripped = stripManagedEnvBlock(current, serverName);
    const existingKeys = parseEnvAssignments(stripped);
    const entriesToAdd = requestedEntries.filter((entry) => !existingKeys.has(entry.key));

    let next = stripped;
    if (entriesToAdd.length > 0) {
        const block = buildEnvBlock(serverName, description, sourceUrl, entriesToAdd);
        next = next ? `${next}\n\n${block}` : block;
    } else if (next) {
        next = `${next}\n`;
    }

    const changed = current !== next;
    if (!dryRun && changed) {
        fs.writeFileSync(filePath, next, "utf8");
    }

    return {
        filePath,
        exists,
        changed,
        entriesAdded: entriesToAdd,
    };
}

function parseKeyValue(token, fallbackValue = "") {
    const index = token.indexOf("=");
    if (index === -1) {
        return {
            key: token.trim(),
            value: fallbackValue,
        };
    }
    return {
        key: token.slice(0, index).trim(),
        value: token.slice(index + 1),
    };
}

function buildCommandSpec(command, commandWin32) {
    if (!commandWin32 && command === "npx") {
        return { default: "npx", win32: "npx.cmd" };
    }
    if (!commandWin32 && command === "npm") {
        return { default: "npm", win32: "npm.cmd" };
    }
    if (!commandWin32) {
        return command;
    }
    return { default: command, win32: commandWin32 };
}

function registerServer(args) {
    const manifestPath = path.resolve(args.manifestPath);
    const envPath = path.resolve(args.envPath);
    const envExamplePath = path.resolve(args.envExamplePath);
    const manifest = loadManifest(manifestPath);
    const existingIndex = (manifest.servers || []).findIndex((server) => server.name === args.name);

    if (existingIndex >= 0 && !args.force) {
        fail(`manifest already contains server '${args.name}'. Re-run with --force to replace it.`);
    }

    const forwardedEnv = {};
    for (const token of args.forwardEnv) {
        const pair = parseKeyValue(token);
        const rootKey = pair.value || pair.key;
        forwardedEnv[pair.key] = `{env:${rootKey}}`;
    }

    const requiredEnv = Array.from(new Set([
        ...args.requireEnv,
        ...args.forwardEnv.map((token) => parseKeyValue(token).value || parseKeyValue(token).key),
    ]));

    const envExampleEntries = Array.from(new Map(
        [...args.envExample, ...requiredEnv]
            .map((token) => {
                if (typeof token === "string") {
                    const pair = parseKeyValue(token, "");
                    return [pair.key, pair];
                }
                return [token.key, token];
            })
    ).values());

    const nextServer = {
        name: args.name,
        type: args.type,
        description: args.description,
        optional: args.optional,
    };
    if (args.catalog) {
        nextServer.catalog = args.catalog;
    }
    if (args.sourceUrl) {
        nextServer.sourceUrl = args.sourceUrl;
    }
    if (requiredEnv.length > 0) {
        nextServer.requiresEnv = requiredEnv;
    }

    if (args.type === "url") {
        nextServer.url = args.url;
    } else {
        nextServer.command = buildCommandSpec(args.command, args.commandWin32);
        nextServer.args = args.serverArgs;
        if (Object.keys(forwardedEnv).length > 0) {
            nextServer.env = forwardedEnv;
        }
    }

    const nextManifest = {
        ...manifest,
        servers: [...(manifest.servers || [])],
    };

    if (existingIndex >= 0) {
        nextManifest.servers[existingIndex] = nextServer;
    } else {
        nextManifest.servers.push(nextServer);
    }

    const manifestChanged = JSON.stringify(manifest, null, 2) !== JSON.stringify(nextManifest, null, 2);
    const envExampleResult = envExampleEntries.length > 0
        ? upsertManagedEnvFile(envExamplePath, args.name, args.description, args.sourceUrl, envExampleEntries, args.dryRun)
        : { filePath: envExamplePath, exists: fs.existsSync(envExamplePath), changed: false, entriesAdded: [] };

    let envResult = {
        filePath: envPath,
        exists: fs.existsSync(envPath),
        changed: false,
        entriesAdded: [],
    };
    if (envExampleEntries.length > 0 && fs.existsSync(envPath)) {
        const blankEntries = envExampleEntries.map((entry) => ({ key: entry.key, value: "" }));
        envResult = upsertManagedEnvFile(envPath, args.name, args.description, args.sourceUrl, blankEntries, args.dryRun);
    }

    if (!args.dryRun && manifestChanged) {
        fs.writeFileSync(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`, "utf8");
    }

    const action = existingIndex >= 0 ? "updated" : "created";
    if (args.json) {
        console.log(JSON.stringify({
            action,
            dryRun: args.dryRun,
            manifestPath,
            manifestChanged,
            envExampleResult,
            envResult,
            server: nextServer,
            nextSteps: envExampleEntries.length > 0
                ? [
                    fs.existsSync(envPath)
                        ? `Fill root .env keys: ${envExampleEntries.map((entry) => entry.key).join(", ")}`
                        : "Create root .env from .env.example and fill the new MCP keys.",
                    "Then run node scripts/setup-codex-mcp.js",
                    "Then run node scripts/doctor-codex-mcp.js",
                ]
                : [
                    "Run node scripts/setup-codex-mcp.js",
                    "Then run node scripts/doctor-codex-mcp.js",
                ],
        }, null, 2));
        return;
    }

    console.log(`Manifest: ${action} ${args.name} (${manifestChanged ? (args.dryRun ? "dry-run" : "written") : "unchanged"})`);
    console.log(`Env example: ${envExampleResult.changed ? (args.dryRun ? "would update" : "updated") : "unchanged"} ${envExampleResult.filePath}`);
    if (!fs.existsSync(envPath) && envExampleEntries.length > 0) {
        console.log(`Root env: missing (${envPath}). Create it from .env.example before final bootstrap.`);
    } else {
        console.log(`Root env: ${envResult.changed ? (args.dryRun ? "would update" : "updated") : "unchanged"} ${envResult.filePath}`);
    }
    if (envExampleResult.entriesAdded.length > 0) {
        console.log(`Managed env keys: ${envExampleResult.entriesAdded.map((entry) => entry.key).join(", ")}`);
    }
}

async function handleSearch(args) {
    const knownServers = existingServerNames(args.manifestPath);
    const [officialReadme, awesomeReadme] = await Promise.all([
        readText(OFFICIAL_CATALOG_URL),
        readText(AWESOME_CATALOG_URL),
    ]);

    let catalogEntries = [
        ...parseOfficialCatalog(officialReadme, knownServers),
        ...parseAwesomeCatalog(awesomeReadme, knownServers),
    ];
    if (args.catalog !== "all") {
        catalogEntries = catalogEntries.filter((entry) => entry.catalog === args.catalog);
    }

    const terms = args.terms.map((term) => term.toLowerCase());
    const results = catalogEntries
        .map((entry) => ({ ...entry, score: scoreEntry(entry, terms, args.allTerms) }))
        .filter((entry) => entry.score > 0)
        .sort((left, right) => {
            if (right.score !== left.score) {
                return right.score - left.score;
            }
            if (left.catalog !== right.catalog) {
                return left.catalog === "official-repo" ? -1 : 1;
            }
            return left.name.localeCompare(right.name);
        })
        .slice(0, args.limit);

    if (args.json) {
        console.log(JSON.stringify(results, null, 2));
        return;
    }

    if (!results.length) {
        console.log("No matching MCP servers found.");
        return;
    }

    for (const [index, entry] of results.entries()) {
        console.log(`${index + 1}. [${entry.catalog}] ${entry.name}`);
        console.log(`   score: ${entry.score} | section: ${entry.section} | suggested name: ${entry.suggestedName} | ${entry.localOverlap ? "possible local overlap" : "no exact local overlap"}`);
        console.log(`   url: ${entry.url}`);
        console.log(`   ${entry.description}`);
    }
}

async function handleInspect(args) {
    const target = parseGithubTarget(args.source);
    const branch = await resolveBranch(target);
    const checkout = cloneRepo(target, branch);

    try {
        const inspectRoot = chooseInspectRoot(target, checkout.repoRoot, args.path);
        if (!fs.existsSync(inspectRoot)) {
            fail(`inspect path does not exist: ${path.relative(checkout.repoRoot, inspectRoot)}`);
        }

        const inspection = inspectRepoTree(inspectRoot);
        const payload = {
            repo: `${target.owner}/${target.repo}`,
            branch,
            inspectRoot: path.relative(checkout.repoRoot, inspectRoot) || ".",
            ...inspection,
        };

        if (args.json) {
            console.log(JSON.stringify(payload, null, 2));
            return;
        }

        console.log(`Repo: ${payload.repo} @ ${payload.branch}`);
        console.log(`Inspect root: ${payload.inspectRoot}`);
        if (payload.summary) {
            console.log(`Summary: ${payload.summary}`);
        }
        if (payload.commandHints.length > 0) {
            console.log(`Command hints: ${payload.commandHints.join(" | ")}`);
        }
        if (payload.guessedEnvKeys.length > 0) {
            console.log(`Guessed env keys: ${payload.guessedEnvKeys.join(", ")}`);
        }
        if (payload.authHints.length > 0) {
            console.log(`Auth hints: ${payload.authHints.join(", ")}`);
        }
        if (payload.packages.length > 0) {
            console.log("Packages:");
            for (const pkg of payload.packages) {
                console.log(`  - ${pkg.path} :: ${pkg.name || "unknown package name"}`);
            }
        }
        if (payload.pythonProjects.length > 0) {
            console.log("Python projects:");
            for (const project of payload.pythonProjects) {
                console.log(`  - ${project.path} :: ${project.name || "unknown project name"}`);
            }
        }
        if (payload.readmes.length > 0) {
            console.log(`Readmes: ${payload.readmes.join(", ")}`);
        }
        if (payload.suspiciousFiles.length > 0) {
            console.log(`Suspicious files: ${payload.suspiciousFiles.join(", ")}`);
        }
    } finally {
        fs.rmSync(checkout.tempParent, { recursive: true, force: true });
    }
}

function printHelp() {
    console.log(`Usage:
  node scripts/mcp_catalog_tool.js search <keywords...> [--catalog all|official-repo|awesome-list] [--all-terms] [--limit N] [--json]
  node scripts/mcp_catalog_tool.js inspect <github-url|owner/repo> [--path RELATIVE_PATH] [--json]
  node scripts/mcp_catalog_tool.js register --name <server-name> --description <text> [--catalog official-repo|awesome-list] [--source-url URL] [--optional] [--force] [--dry-run] [--json]
  node scripts/mcp_catalog_tool.js register --name <server-name> --type url --url <https-url> --description <text> [register options...]
  node scripts/mcp_catalog_tool.js register --name <server-name> --command <command> [--command-win32 <command>] --arg <arg> --description <text> [--forward-env KEY[=ROOT_KEY]] [--require-env ROOT_KEY] [--env-example KEY=placeholder] [register options...]`);
}

function parseSearchArgs(tokens) {
    const args = {
        terms: [],
        catalog: "all",
        allTerms: false,
        limit: 8,
        json: false,
        manifestPath: DEFAULT_MANIFEST_PATH,
    };

    for (let index = 0; index < tokens.length; index += 1) {
        const token = tokens[index];
        if (token === "--catalog") {
            args.catalog = tokens[index + 1];
            index += 1;
            continue;
        }
        if (token === "--all-terms") {
            args.allTerms = true;
            continue;
        }
        if (token === "--limit") {
            args.limit = Number(tokens[index + 1]);
            index += 1;
            continue;
        }
        if (token === "--json") {
            args.json = true;
            continue;
        }
        if (token === "--manifest-path") {
            args.manifestPath = tokens[index + 1];
            index += 1;
            continue;
        }
        if (token.startsWith("--")) {
            fail(`unknown option for search: ${token}`);
        }
        args.terms.push(token);
    }

    if (!args.terms.length) {
        fail("search requires at least one term");
    }
    if (args.catalog === "official") {
        args.catalog = "official-repo";
    }
    if (args.catalog === "awesome") {
        args.catalog = "awesome-list";
    }
    if (!["all", "official-repo", "awesome-list"].includes(args.catalog)) {
        fail("--catalog must be one of: all, official-repo, awesome-list");
    }
    if (!Number.isFinite(args.limit) || args.limit < 1) {
        fail("--limit must be a positive number");
    }
    return args;
}

function parseInspectArgs(tokens) {
    const args = {
        source: null,
        path: null,
        json: false,
    };

    for (let index = 0; index < tokens.length; index += 1) {
        const token = tokens[index];
        if (!args.source && !token.startsWith("--")) {
            args.source = token;
            continue;
        }
        if (token === "--path") {
            args.path = tokens[index + 1];
            index += 1;
            continue;
        }
        if (token === "--json") {
            args.json = true;
            continue;
        }
        fail(`unknown option for inspect: ${token}`);
    }

    if (!args.source) {
        fail("inspect requires a GitHub source");
    }
    return args;
}

function parseRegisterArgs(tokens) {
    const args = {
        name: "",
        type: "command",
        url: "",
        command: "",
        commandWin32: "",
        serverArgs: [],
        description: "",
        optional: false,
        force: false,
        dryRun: false,
        json: false,
        catalog: "",
        sourceUrl: "",
        forwardEnv: [],
        requireEnv: [],
        envExample: [],
        manifestPath: DEFAULT_MANIFEST_PATH,
        envPath: DEFAULT_ENV_PATH,
        envExamplePath: DEFAULT_ENV_EXAMPLE_PATH,
    };

    for (let index = 0; index < tokens.length; index += 1) {
        const token = tokens[index];
        if (token === "--name") {
            args.name = tokens[index + 1];
            index += 1;
            continue;
        }
        if (token === "--type") {
            args.type = tokens[index + 1];
            index += 1;
            continue;
        }
        if (token === "--url") {
            args.url = tokens[index + 1];
            index += 1;
            continue;
        }
        if (token === "--command") {
            args.command = tokens[index + 1];
            index += 1;
            continue;
        }
        if (token === "--command-win32") {
            args.commandWin32 = tokens[index + 1];
            index += 1;
            continue;
        }
        if (token === "--arg") {
            args.serverArgs.push(tokens[index + 1]);
            index += 1;
            continue;
        }
        if (token === "--description") {
            args.description = tokens[index + 1];
            index += 1;
            continue;
        }
        if (token === "--optional") {
            args.optional = true;
            continue;
        }
        if (token === "--force") {
            args.force = true;
            continue;
        }
        if (token === "--dry-run") {
            args.dryRun = true;
            continue;
        }
        if (token === "--json") {
            args.json = true;
            continue;
        }
        if (token === "--catalog") {
            args.catalog = tokens[index + 1];
            index += 1;
            continue;
        }
        if (token === "--source-url") {
            args.sourceUrl = tokens[index + 1];
            index += 1;
            continue;
        }
        if (token === "--forward-env") {
            args.forwardEnv.push(tokens[index + 1]);
            index += 1;
            continue;
        }
        if (token === "--require-env") {
            args.requireEnv.push(tokens[index + 1]);
            index += 1;
            continue;
        }
        if (token === "--env-example") {
            args.envExample.push(tokens[index + 1]);
            index += 1;
            continue;
        }
        if (token === "--manifest-path") {
            args.manifestPath = tokens[index + 1];
            index += 1;
            continue;
        }
        if (token === "--env-path") {
            args.envPath = tokens[index + 1];
            index += 1;
            continue;
        }
        if (token === "--env-example-path") {
            args.envExamplePath = tokens[index + 1];
            index += 1;
            continue;
        }
        fail(`unknown option for register: ${token}`);
    }

    if (!args.name) {
        fail("register requires --name");
    }
    if (!args.description) {
        fail("register requires --description");
    }
    if (args.type !== "command" && args.type !== "url") {
        fail("--type must be either 'command' or 'url'");
    }
    if (args.type === "url" && !args.url) {
        fail("url-based MCP registration requires --url");
    }
    if (args.type === "command" && !args.command) {
        fail("command-based MCP registration requires --command");
    }
    return args;
}

async function main() {
    const [, , command, ...tokens] = process.argv;
    if (!command || command === "--help" || command === "-h") {
        printHelp();
        return;
    }

    if (command === "search") {
        await handleSearch(parseSearchArgs(tokens));
        return;
    }
    if (command === "inspect") {
        await handleInspect(parseInspectArgs(tokens));
        return;
    }
    if (command === "register") {
        registerServer(parseRegisterArgs(tokens));
        return;
    }

    fail(`unknown command: ${command}`);
}

main().catch((error) => {
    fail(error && error.message ? error.message : String(error));
});
