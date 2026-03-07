#!/usr/bin/env node

const fs = require("fs");
const https = require("https");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const CATALOG_URL = "https://raw.githubusercontent.com/VoltAgent/awesome-agent-skills/main/README.md";
const GITHUB_API_ROOT = "https://api.github.com";
const USER_AGENT = "WizyClubRN-skills-researcher/1.0";
const DEFAULT_SKILLS_ROOT = path.resolve(__dirname, "../../../..", ".codex", "skills");
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

function fail(message) {
    console.error(`error: ${message}`);
    process.exit(1);
}

function normalizeWhitespace(value) {
    return String(value).replace(/\s+/g, " ").trim();
}

function slugify(value) {
    const slug = String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return slug || "imported-skill";
}

function ensureWithinRoot(root, candidate) {
    const resolvedRoot = path.resolve(root);
    const resolvedCandidate = path.resolve(candidate);
    if (resolvedCandidate !== resolvedRoot && !resolvedCandidate.startsWith(`${resolvedRoot}${path.sep}`)) {
        fail(`path escapes the downloaded repo: ${candidate}`);
    }
    return resolvedCandidate;
}

function readText(url, accept = "text/plain") {
    return readBuffer(url, accept).then((buffer) => buffer.toString("utf8"));
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
                            reject(new Error(`${currentUrl} returned HTTP ${status}: ${Buffer.concat(chunks).toString("utf8").slice(0, 200)}`));
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

function loadLocalSkillNames(skillsRoot) {
    const resolvedRoot = path.resolve(skillsRoot);
    if (!fs.existsSync(resolvedRoot)) {
        return new Set();
    }

    return new Set(
        fs.readdirSync(resolvedRoot, { withFileTypes: true })
            .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(resolvedRoot, entry.name, "SKILL.md")))
            .map((entry) => entry.name)
    );
}

function parseCatalog(markdown, localSkillNames) {
    const headings = [];
    for (const match of markdown.matchAll(/###\s+([^\n]+)/g)) {
        headings.push({
            position: match.index,
            value: normalizeWhitespace(match[1]),
        });
    }

    const entryPattern = /-\s+\*\*\[([^\]]+)\]\((https:\/\/github\.com\/[^)]+)\)\*\*\s+-\s+(.*?)(?=\s+-\s+\*\*\[|\s+###\s+|\s+##\s+|$)/gs;
    const entries = [];

    for (const match of markdown.matchAll(entryPattern)) {
        let section = "Uncategorized";
        for (const heading of headings) {
            if (heading.position > match.index) {
                break;
            }
            section = heading.value;
        }

        const label = normalizeWhitespace(match[1]);
        const url = normalizeWhitespace(match[2]);
        const description = normalizeWhitespace(match[3]);
        const suggestedDest = slugify(label.replace(/\//g, "-"));
        const lastSegment = slugify(label.split("/").slice(-1)[0]);
        const localOverlap = localSkillNames.has(suggestedDest) || localSkillNames.has(lastSegment);

        entries.push({
            label,
            url,
            description,
            section,
            suggestedDest,
            localOverlap,
            score: 0,
        });
    }

    return entries;
}

function scoreEntry(entry, terms, requireAllTerms) {
    let score = 0;
    const searchable = {
        label: entry.label.toLowerCase(),
        description: entry.description.toLowerCase(),
        section: entry.section.toLowerCase(),
    };

    for (const term of terms) {
        let matched = false;
        if (searchable.label.includes(term)) {
            score += 5;
            matched = true;
        }
        if (searchable.description.includes(term)) {
            score += 3;
            matched = true;
        }
        if (searchable.section.includes(term)) {
            score += 1;
            matched = true;
        }
        if (requireAllTerms && !matched) {
            return 0;
        }
    }

    if (!searchable.section.includes("community")) {
        score += 1;
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
        fail("source must be a GitHub URL or owner/repo shorthand");
    }

    if (parsed.hostname !== "github.com") {
        fail("source must be hosted on github.com");
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
    const tempParent = fs.mkdtempSync(path.join(os.tmpdir(), "skills-researcher-"));
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

function parseFrontmatter(skillFile) {
    const content = fs.readFileSync(skillFile, "utf8");
    const nameMatch = content.match(/^name:\s*["']?([^"'\n]+)["']?\s*$/m);
    const descriptionMatch = content.match(/^description:\s*["']?(.+?)["']?\s*$/m);
    return {
        name: nameMatch ? normalizeWhitespace(nameMatch[1]) : null,
        description: descriptionMatch ? normalizeWhitespace(descriptionMatch[1]) : null,
    };
}

function findSkillFiles(scanRoot) {
    const results = [];

    function walk(currentDir) {
        for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
            const fullPath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
                continue;
            }
            if (entry.isFile() && entry.name === "SKILL.md") {
                results.push(fullPath);
            }
        }
    }

    walk(scanRoot);
    results.sort();
    return results;
}

function listSkillDirectories(scanRoot) {
    return findSkillFiles(scanRoot).map((skillFile) => {
        const skillDir = path.dirname(skillFile);
        const metadata = parseFrontmatter(skillFile);
        return {
            path: path.relative(scanRoot, skillDir) || ".",
            name: metadata.name,
            description: metadata.description,
            topLevelChildren: fs.readdirSync(skillDir).sort(),
        };
    });
}

function determineSourceDirectory(target, repoRoot, explicitSkillPath) {
    let sourceDir;
    if (explicitSkillPath) {
        sourceDir = ensureWithinRoot(repoRoot, path.join(repoRoot, explicitSkillPath));
    } else if (target.repoPath) {
        const repoPath = target.kind === "blob" && path.basename(target.repoPath) === "SKILL.md"
            ? path.dirname(target.repoPath)
            : target.repoPath;
        sourceDir = ensureWithinRoot(repoRoot, path.join(repoRoot, repoPath));
    } else {
        fail("repo root sources require --skill-path; run discover first");
    }

    if (!fs.existsSync(sourceDir)) {
        fail(`source path does not exist in downloaded repo: ${path.relative(repoRoot, sourceDir)}`);
    }
    if (!fs.statSync(sourceDir).isDirectory()) {
        fail("source path must point to a directory");
    }
    if (!fs.existsSync(path.join(sourceDir, "SKILL.md"))) {
        fail("source directory does not contain SKILL.md");
    }
    return sourceDir;
}

function summarizeDirectory(sourceDir) {
    const files = [];

    function walk(currentDir) {
        for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
            const fullPath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
                continue;
            }
            if (entry.isFile()) {
                files.push(path.relative(sourceDir, fullPath));
            }
        }
    }

    walk(sourceDir);
    files.sort();
    return {
        fileCount: files.length,
        files,
        topLevelChildren: fs.readdirSync(sourceDir).sort(),
        suspiciousFiles: files.filter((fileName) => SUSPICIOUS_SUFFIXES.has(path.extname(fileName).toLowerCase())),
    };
}

function copyDirectory(sourceDir, destDir) {
    fs.mkdirSync(destDir, { recursive: true });
    for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
        const sourcePath = path.join(sourceDir, entry.name);
        const destPath = path.join(destDir, entry.name);
        if (entry.isDirectory()) {
            copyDirectory(sourcePath, destPath);
            continue;
        }
        if (entry.isSymbolicLink()) {
            fs.symlinkSync(fs.readlinkSync(sourcePath), destPath);
            continue;
        }
        fs.copyFileSync(sourcePath, destPath);
    }
}

async function handleSearch(args) {
    const localSkillNames = loadLocalSkillNames(args.skillsRoot);
    const catalog = parseCatalog(await readText(CATALOG_URL), localSkillNames);
    const loweredTerms = args.terms.map((term) => term.toLowerCase());

    const results = catalog
        .map((entry) => ({ ...entry, score: scoreEntry(entry, loweredTerms, args.allTerms) }))
        .filter((entry) => entry.score > 0)
        .sort((left, right) => {
            if (right.score !== left.score) {
                return right.score - left.score;
            }
            return left.label.localeCompare(right.label);
        })
        .slice(0, args.limit);

    if (args.json) {
        console.log(JSON.stringify(results, null, 2));
        return;
    }

    if (!results.length) {
        console.log("No matching skills found.");
        return;
    }

    for (const [index, entry] of results.entries()) {
        console.log(`${index + 1}. [${entry.section}] ${entry.label}`);
        console.log(`   score: ${entry.score} | suggested dest: ${entry.suggestedDest} | ${entry.localOverlap ? "possible local overlap" : "no exact local overlap"}`);
        console.log(`   url: ${entry.url}`);
        console.log(`   ${entry.description}`);
    }
}

async function handleDiscover(args) {
    const target = parseGithubTarget(args.source);
    const branch = await resolveBranch(target);
    const checkout = cloneRepo(target, branch);

    try {
        let scanRoot = checkout.repoRoot;
        if (args.path) {
            scanRoot = ensureWithinRoot(checkout.repoRoot, path.join(checkout.repoRoot, args.path));
        } else if (target.repoPath) {
            const selectedPath = target.kind === "blob" && path.basename(target.repoPath) === "SKILL.md"
                ? path.dirname(target.repoPath)
                : target.repoPath;
            scanRoot = ensureWithinRoot(checkout.repoRoot, path.join(checkout.repoRoot, selectedPath));
        }

        if (!fs.existsSync(scanRoot)) {
            fail(`scan path does not exist: ${path.relative(checkout.repoRoot, scanRoot)}`);
        }

        const skills = listSkillDirectories(scanRoot);
        if (args.json) {
            console.log(JSON.stringify({
                repo: `${target.owner}/${target.repo}`,
                branch,
                scanRoot: path.relative(checkout.repoRoot, scanRoot) || ".",
                skills,
            }, null, 2));
            return;
        }

        if (!skills.length) {
            console.log("No SKILL.md files found in the selected path.");
            return;
        }

        console.log(`Repository: ${target.owner}/${target.repo} @ ${branch}`);
        console.log(`Scan root: ${path.relative(checkout.repoRoot, scanRoot) || "."}`);
        for (const [index, skill] of skills.entries()) {
            console.log(`${index + 1}. ${skill.path}`);
            if (skill.name) {
                console.log(`   name: ${skill.name}`);
            }
            if (skill.description) {
                console.log(`   description: ${skill.description}`);
            }
            console.log(`   children: ${skill.topLevelChildren.join(", ")}`);
        }
    } finally {
        fs.rmSync(checkout.tempParent, { recursive: true, force: true });
    }
}

async function handleInstall(args) {
    const target = parseGithubTarget(args.source);
    const branch = await resolveBranch(target);
    const checkout = cloneRepo(target, branch);

    try {
        const sourceDir = determineSourceDirectory(target, checkout.repoRoot, args.skillPath);
        const summary = summarizeDirectory(sourceDir);
        const destDir = path.resolve(args.skillsRoot, args.dest);

        if (args.json) {
            console.log(JSON.stringify({
                repo: `${target.owner}/${target.repo}`,
                branch,
                sourceDir: path.relative(checkout.repoRoot, sourceDir),
                dest: destDir,
                dryRun: args.dryRun,
                summary,
            }, null, 2));
            return;
        }

        console.log(`Source: ${target.owner}/${target.repo} @ ${branch}`);
        console.log(`Skill path: ${path.relative(checkout.repoRoot, sourceDir)}`);
        console.log(`Destination: ${destDir}`);
        console.log(`Files: ${summary.fileCount}`);
        console.log(`Top-level children: ${summary.topLevelChildren.join(", ")}`);
        if (summary.suspiciousFiles.length) {
            console.log("Suspicious file types detected:");
            for (const fileName of summary.suspiciousFiles) {
                console.log(`  - ${fileName}`);
            }
        }

        if (args.dryRun) {
            console.log("Dry run only; nothing was copied.");
            return;
        }

        fs.mkdirSync(path.dirname(destDir), { recursive: true });
        if (fs.existsSync(destDir) && !args.force) {
            fail(`destination already exists: ${destDir}`);
        }
        if (fs.existsSync(destDir) && args.force) {
            fs.rmSync(destDir, { recursive: true, force: true });
        }
        copyDirectory(sourceDir, destDir);
        console.log(`Installed skill into ${destDir}`);
    } finally {
        fs.rmSync(checkout.tempParent, { recursive: true, force: true });
    }
}

function printHelp() {
    console.log(`Usage:
  node scripts/awesome_skill_tool.js search <keywords...> [--all-terms] [--limit N] [--json] [--skills-root PATH]
  node scripts/awesome_skill_tool.js discover <github-url|owner/repo> [--path RELATIVE_PATH] [--json]
  node scripts/awesome_skill_tool.js install <github-url|owner/repo> --dest <local-skill-name> [--skill-path RELATIVE_PATH] [--skills-root PATH] [--dry-run] [--force] [--json]`);
}

function parseSearchArgs(tokens) {
    const args = {
        terms: [],
        allTerms: false,
        limit: 8,
        json: false,
        skillsRoot: DEFAULT_SKILLS_ROOT,
    };

    for (let index = 0; index < tokens.length; index += 1) {
        const token = tokens[index];
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
        if (token === "--skills-root") {
            args.skillsRoot = tokens[index + 1];
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
    if (!Number.isFinite(args.limit) || args.limit < 1) {
        fail("--limit must be a positive number");
    }
    return args;
}

function parseDiscoverArgs(tokens) {
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
        fail(`unknown option for discover: ${token}`);
    }

    if (!args.source) {
        fail("discover requires a GitHub source");
    }
    return args;
}

function parseInstallArgs(tokens) {
    const args = {
        source: null,
        skillPath: null,
        dest: null,
        skillsRoot: DEFAULT_SKILLS_ROOT,
        dryRun: false,
        force: false,
        json: false,
    };

    for (let index = 0; index < tokens.length; index += 1) {
        const token = tokens[index];
        if (!args.source && !token.startsWith("--")) {
            args.source = token;
            continue;
        }
        if (token === "--skill-path") {
            args.skillPath = tokens[index + 1];
            index += 1;
            continue;
        }
        if (token === "--dest") {
            args.dest = tokens[index + 1];
            index += 1;
            continue;
        }
        if (token === "--skills-root") {
            args.skillsRoot = tokens[index + 1];
            index += 1;
            continue;
        }
        if (token === "--dry-run") {
            args.dryRun = true;
            continue;
        }
        if (token === "--force") {
            args.force = true;
            continue;
        }
        if (token === "--json") {
            args.json = true;
            continue;
        }
        fail(`unknown option for install: ${token}`);
    }

    if (!args.source) {
        fail("install requires a GitHub source");
    }
    if (!args.dest) {
        fail("install requires --dest");
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
    if (command === "discover") {
        await handleDiscover(parseDiscoverArgs(tokens));
        return;
    }
    if (command === "install") {
        await handleInstall(parseInstallArgs(tokens));
        return;
    }

    fail(`unknown command: ${command}`);
}

main().catch((error) => {
    fail(error && error.message ? error.message : String(error));
});
