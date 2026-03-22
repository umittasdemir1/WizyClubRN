const { spawn } = require("child_process");

function quoteWindowsArg(value) {
    const input = String(value);

    if (!/[\s"]/u.test(input)) {
        return input;
    }

    return `"${input
        .replace(/(\\*)"/g, "$1$1\\\"")
        .replace(/(\\+)$/g, "$1$1")}"`;
}

function spawnNpx(args, options = {}) {
    const commandArgs = Array.isArray(args) ? args : [];

    if (process.platform !== "win32") {
        return spawn("npx", commandArgs, options);
    }

    const commandLine = ["npx.cmd", ...commandArgs]
        .map(quoteWindowsArg)
        .join(" ");

    return spawn(process.env.ComSpec || "cmd.exe", [
        "/d",
        "/s",
        "/c",
        commandLine
    ], options);
}

module.exports = {
    spawnNpx
};
