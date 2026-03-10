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
const { Server } = require(path.join(sdkRoot, "server", "index.js"));
const { StdioServerTransport } = require(path.join(sdkRoot, "server", "stdio.js"));
const { CallToolRequestSchema, ListToolsRequestSchema } = require(path.join(sdkRoot, "types.js"));

const {
    callRpc,
    loadEnv,
    normalizeLimit,
    normalizeRowId,
    normalizeString,
    requireEnv
} = require("./client");

const repoRoot = path.resolve(__dirname, "..");
const env = loadEnv(repoRoot);
const supabaseUrl = requireEnv(env, "SUPABASE_URL");
const serviceRoleKey = requireEnv(env, "SUPABASE_SERVICE_ROLE_KEY");

function jsonContent(value) {
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(value, null, 2)
            }
        ]
    };
}

const server = new Server(
    {
        name: "bookmarks-mcp",
        version: "0.1.0"
    },
    {
        capabilities: {
            tools: {}
        }
    }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "search_bookmarks",
                description: "Search stored X bookmarks by text, author, or raw tweet content.",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "Search text."
                        },
                        limit: {
                            type: "integer",
                            description: "Maximum results to return. Defaults to 10, max 50."
                        }
                    },
                    required: ["query"]
                }
            },
            {
                name: "get_bookmark",
                description: "Get one bookmark by tweet id, tweet url, or internal row id.",
                inputSchema: {
                    type: "object",
                    properties: {
                        tweet_id: {
                            type: "string",
                            description: "Tweet id."
                        },
                        tweet_url: {
                            type: "string",
                            description: "Full tweet URL."
                        },
                        row_id: {
                            type: "integer",
                            description: "Internal bookmarks.items row id."
                        }
                    }
                }
            },
            {
                name: "list_recent_bookmarks",
                description: "List the most recently created bookmarks.",
                inputSchema: {
                    type: "object",
                    properties: {
                        limit: {
                            type: "integer",
                            description: "Maximum results to return. Defaults to 10, max 50."
                        }
                    }
                }
            }
        ]
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        if (name === "search_bookmarks") {
            const query = normalizeString(args?.query);

            if (!query) {
                throw new Error("query is required");
            }

            const limit = normalizeLimit(args?.limit, 10, 50);
            const result = await callRpc(
                fetch,
                supabaseUrl,
                serviceRoleKey,
                "bookmarks_search_bookmarks",
                {
                    search_query: query,
                    result_limit: limit
                }
            );

            return jsonContent(result);
        }

        if (name === "get_bookmark") {
            const tweetId = normalizeString(args?.tweet_id);
            const tweetUrl = normalizeString(args?.tweet_url);
            const rowId = normalizeRowId(args?.row_id);

            if (!tweetId && !tweetUrl && !rowId) {
                throw new Error("tweet_id, tweet_url, or row_id is required");
            }

            const result = await callRpc(
                fetch,
                supabaseUrl,
                serviceRoleKey,
                "bookmarks_get_bookmark",
                {
                    target_tweet_id: tweetId,
                    target_tweet_url: tweetUrl,
                    target_row_id: rowId
                }
            );

            return jsonContent(result);
        }

        if (name === "list_recent_bookmarks") {
            const limit = normalizeLimit(args?.limit, 10, 50);
            const result = await callRpc(
                fetch,
                supabaseUrl,
                serviceRoleKey,
                "bookmarks_list_recent_bookmarks",
                {
                    result_limit: limit
                }
            );

            return jsonContent(result);
        }

        throw new Error(`Tool not found: ${name}`);
    } catch (error) {
        return {
            isError: true,
            content: [
                {
                    type: "text",
                    text: error.message
                }
            ]
        };
    }
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    process.stderr.write("Bookmarks MCP server started.\n");
}

if (require.main === module) {
    main().catch((error) => {
        process.stderr.write(`Fatal error: ${error.message}\n`);
        process.exit(1);
    });
}

module.exports = {
    main
};
