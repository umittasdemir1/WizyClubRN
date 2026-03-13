# StockPilot Deployment & Ops Notes

## Architecture Overview

StockPilot is a standalone application with:
- **Frontend**: Vite + React + TypeScript + Tailwind CSS (Deployed to Netlify)
- **Backend**: Node.js + Express + TypeScript (Deployed to Render)

## Deployment Configuration

### Frontend (Netlify)
The frontend is configured via `stockpilot/frontend/netlify.toml`.
It expects to proxy `/api/*` requests to the Render backend service.

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/api/*"
  to = "https://<render-service-url>/api/:splat"
  status = 200
  force = true
```

### Backend (Render)
The backend is configured via `stockpilot/backend/render.yaml`.
```yaml
services:
  - type: web
    name: stockpilot-api
    runtime: node
    plan: free
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
```

## MCP Configuration

The Render MCP server is hosted and needs to be configured as a remote MCP server with a Render API key.

```json
{
  "name": "render",
  "type": "url",
  "url": "https://mcp.render.com/sse",
  "headers": {
    "Authorization": "Bearer {env:RENDER_API_KEY}"
  },
  "description": "Render MCP server for backend deployment management.",
  "optional": true,
  "requiresEnv": ["RENDER_API_KEY"]
}
```

Add the following to your environment:
```
RENDER_API_KEY=<your-render-api-key>
```

Note: Render MCP wiring should use the current hosted endpoint, not the stale `/sse` value from earlier drafts if it's changed.

## Verification

### Automated Tests
1. **Frontend Build Check**: `npm --prefix frontend run build` (Must complete with no errors, output in dist/)
2. **Backend Build Check**: `npm --prefix backend run build` (Must compile TypeScript with no errors)

### Manual Verification
1. **Dev Server Smoke Test**: `npm --prefix frontend run dev` and open browser.
2. **Render Backend**: Test health endpoint at `/api/health`.
