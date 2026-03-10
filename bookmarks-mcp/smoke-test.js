const path = require("path");

const sdkRoot = path.join(
    __dirname,
    "..",
    "r2-mcp",
    "node_modules",
    "@modelcontextprotocol",
    "sdk",
    "dist",
    "cjs"
);
const { Client } = require(path.join(sdkRoot, "client", "index.js"));
const { StdioClientTransport } = require(path.join(sdkRoot, "client", "stdio.js"));

const serverPath = path.join(__dirname, "server.js");

async function main() {
    const transport = new StdioClientTransport({
        command: "node",
        args: [serverPath],
        env: process.env
    });
    const client = new Client(
        {
            name: "bookmarks-mcp-smoke-test",
            version: "0.1.0"
        },
        {
            capabilities: {}
        }
    );

    await client.connect(transport);

    const tools = await client.listTools();
    const searchResult = await client.callTool({
        name: "search_bookmarks",
        arguments: {
            query: "mcp",
            limit: 2
        }
    });

    console.log(JSON.stringify({
        toolCount: tools.tools.length,
        searchPreview: searchResult.content?.[0]?.text || null
    }, null, 2));

    await transport.close();
}

main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
