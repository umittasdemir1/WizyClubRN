const { spawnSync } = require("child_process");
const fs = require("fs");

function findExecutableOnPath(command) {
    const result = spawnSync("which", [command], {
        encoding: "utf8"
    });

    if (result.status !== 0) {
        return null;
    }

    const resolvedPath = (result.stdout || "").trim();
    return resolvedPath && fs.existsSync(resolvedPath) ? resolvedPath : null;
}

function resolveBrowserLaunchOptions() {
    if (process.env.PLAYWRIGHT_EXECUTABLE_PATH && fs.existsSync(process.env.PLAYWRIGHT_EXECUTABLE_PATH)) {
        return {
            executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH
        };
    }

    if (process.env.PLAYWRIGHT_CHANNEL) {
        return {
            channel: process.env.PLAYWRIGHT_CHANNEL
        };
    }

    const discoveredExecutablePath = [
        "chromium",
        "chromium-browser",
        "google-chrome",
        "google-chrome-stable",
        "chrome"
    ]
        .map(findExecutableOnPath)
        .find(Boolean);

    if (discoveredExecutablePath) {
        return {
            executablePath: discoveredExecutablePath
        };
    }

    return {};
}

module.exports = {
    resolveBrowserLaunchOptions
};
