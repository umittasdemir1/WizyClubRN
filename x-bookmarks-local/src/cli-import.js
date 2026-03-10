const { runImport } = require("./importer");

function parseArgs(argv) {
    const args = {};

    for (const value of argv) {
        if (value === "--headless") {
            args.headless = true;
            continue;
        }

        if (value.startsWith("--max-items=")) {
            args.maxItems = Number(value.split("=")[1]);
        }
    }

    return args;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const result = await runImport(args);

    console.log(`Imported ${result.importedCount} bookmarks. Total stored: ${result.totalCount}.`);
}

main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
