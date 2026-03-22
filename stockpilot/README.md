# StockPilot

StockPilot is a standalone stock analysis workspace under `stockpilot/` in this repo.

## Scope

- Frontend: Vite + React + TypeScript + Tailwind CSS
- Backend: Express + TypeScript
- Input mode: Excel/CSV file upload first
- Output: KPI dashboard, analysis table, transfer recommendations, planning view

## Local run

From `stockpilot/` root:

```bash
npm run dev:frontend
npm run dev:backend
```

### Frontend

```bash
cd D:\WizyClub\stockpilot\frontend
npm install
npm run dev
```

### Backend

```bash
cd D:\WizyClub\stockpilot\backend
npm install
npm run academia:setup
npm run dev
```

`npm run academia:setup` creates `backend/.venv` and installs the `faster-whisper` worker dependencies used by S+Academia transcript generation.

Frontend expects the backend on `http://localhost:8787` through Vite proxy.

## Local environment files

- `stockpilot/frontend/.env.example`
- `stockpilot/backend/.env.example`

These files are local to StockPilot and should move with the project during repo extraction.

## Expected columns

The parser is now standardized around these fields:

- `warehouse_name`
- `product_code`
- `product_name`
- `color`
- `size`
- `gender`
- `sales_qty`
- `return_qty`
- `inventory`
- `production_year`
- `last_sale_date`
- `first_stock_entry_date`
- `first_sale_date`

## Deployment notes

- `frontend/netlify.toml` still needs the real Render service URL.
- Root repo `.codex/mcp-servers.json` and root `.env` are intentionally untouched for now.
- Render MCP wiring should use the current hosted endpoint, not the stale `/sse` value from the earlier plan draft.
