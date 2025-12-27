const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const { S3Client, ListBucketsCommand, ListObjectsV2Command, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");

// Credentials
const ACCOUNT_ID = '952ab1046bdcb041ec23ef25f74d33a5';
const ACCESS_KEY_ID = '83698d552e80464187972e34ebd99fec';
const SECRET_ACCESS_KEY = '568611ad81e89caa08be658c80f4afd83818a5dcfc260e778123d5b667efbfa7';

const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY,
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
                description: "Cloudflare R2 sepetlerini listele",
                inputSchema: { type: "object", properties: {} }
            },
            {
                name: "list_objects",
                description: "Bir sepetteki dosyaları listele",
                inputSchema: {
                    type: "object",
                    properties: {
                        bucket: { type: "string", description: "Sepet adı" },
                        prefix: { type: "string", description: "Klasör ön eki" }
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
    process.stderr.write("R2 MCP Server running via Custom Script...\n");
}

main().catch((error) => {
    process.stderr.write(`Fatal error: ${error.message}\n`);
    process.exit(1);
});
