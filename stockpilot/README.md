# StockPilot

StockPilot is a standalone stock analysis workspace under `D:\WizyClub\stockpilot`.

## Scope

- Frontend: Vite + React + TypeScript + Tailwind CSS
- Backend: Express + TypeScript
- Input mode: Excel/CSV file upload first
- Output: KPI dashboard, analysis table, transfer recommendations, planning view

## Local run

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
npm run dev
```

Frontend expects the backend on `http://localhost:8787` through Vite proxy.

## Expected columns

The parser accepts flexible header names, but these concepts are useful:

- `SKU`
- `Product Name`
- `Category`
- `Store`
- `Stock` or `On Hand`
- `Unit Price`
- `Daily Sales`
- `Lead Time`
- `Safety Stock`
- `Reorder Point`

Missing reorder points are inferred from daily sales, lead time, and safety stock.

## Deployment notes

- `frontend/netlify.toml` still needs the real Render service URL.
- Root repo `.codex/mcp-servers.json` and root `.env` are intentionally untouched for now.
- Render MCP wiring should use the current hosted endpoint, not the stale `/sse` value from the earlier plan draft.
