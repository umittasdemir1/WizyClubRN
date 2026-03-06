const fs = require("fs");
const path = require("path");
const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const { S3Client, ListBucketsCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");

function parseDotEnv(filePath) {
    const out = {};
    if (!fs.existsSync(filePath)) {
        return out;
    }
    const raw = fs.readFileSync(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
            continue;
        }
        const idx = trimmed.indexOf("=");
        if (idx <= 0) {
            continue;
        }
        const key = trimmed.slice(0, idx).trim();
        let value = trimmed.slice(idx + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        out[key] = value;
    }
    return out;
}

const mergedEnv = {
    ...parseDotEnv(path.join(__dirname, ".env")),
    ...process.env,
};

function getRequiredEnv(name) {
    const value = mergedEnv[name];
    if (!value || !value.trim()) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

const accountId = getRequiredEnv("R2_ACCOUNT_ID");
const accessKeyId = getRequiredEnv("R2_ACCESS_KEY_ID");
const secretAccessKey = getRequiredEnv("R2_SECRET_ACCESS_KEY");

const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId,
        secretAccessKey,
    },
});

const server = new Server(
    {
        name: "r2-custom-mcp",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// List Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "list_buckets",
                description: "List Cloudflare R2 buckets",
                inputSchema: { type: "object", properties: {} }
            },
            {
                name: "list_objects",
                description: "List objects in a bucket",
                inputSchema: {
                    type: "object",
                    properties: {
                        bucket: { type: "string", description: "Bucket name" },
                        prefix: { type: "string", description: "Object prefix filter" }
                    },
                    required: ["bucket"]
                }
            }
        ],
    };
});

// Tool Handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        if (name === "list_buckets") {
            const data = await s3.send(new ListBucketsCommand({}));
            return {
                content: [{ type: "text", text: JSON.stringify(data.Buckets, null, 2) }],
            };
        }

        if (name === "list_objects") {
            if (!args || typeof args.bucket !== "string" || !args.bucket.trim()) {
                throw new Error("Invalid 'bucket' argument");
            }
            const data = await s3.send(new ListObjectsV2Command({
                Bucket: args.bucket,
                Prefix: args.prefix
            }));
            return {
                content: [{ type: "text", text: JSON.stringify(data.Contents, null, 2) }],
            };
        }

        throw new Error(`Tool not found: ${name}`);
    } catch (error) {
        return {
            isError: true,
            content: [{ type: "text", text: error.message }],
        };
    }
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    process.stderr.write("R2 MCP server started.\n");
}

main().catch((error) => {
    process.stderr.write(`Fatal error: ${error.message}\n`);
    process.exit(1);
});
