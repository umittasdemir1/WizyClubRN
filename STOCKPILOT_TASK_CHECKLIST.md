# StockPilot — Task Checklist

## Phase 1: Planning ✅
- [x] Research project structure, MCPs, skills, credentials
- [x] Research Render MCP setup and docs
- [x] Research antigravity.google design inspiration
- [x] Write implementation plan
- [x] Get user approval on plan

## Phase 2: Project Setup
- [x] Create `stockpilot/frontend/` — Vite + React + TypeScript scaffold
- [x] Install Tailwind CSS 3.4 + PostCSS + Autoprefixer
- [x] Configure `tailwind.config.js` with design system tokens
- [x] Install deps: `xlsx`, `recharts`, `framer-motion`, `lucide-react`, `react-dropzone`, `axios`, `@tanstack/react-query`
- [x] Create `stockpilot/backend/` — Node.js + Express + TypeScript scaffold
- [x] Install backend deps: `express`, `cors`, `multer`, `xlsx`
- [x] Add Render MCP to `.codex/mcp-servers.json`
- [x] Add `RENDER_API_KEY` to `.env`

## Phase 3: Design System & Layout
- [x] Create `index.css` — global styles, Inter font, light background
- [x] Create `Header` component — logo, branding, clean nav
- [x] Create `TabNav` component — 4 tabs with animated indicator
- [x] Create `Footer` component — copyright, version
- [x] Create shared components: `Button`, `Card`, `Spinner`, `EmptyState`

## Phase 4: File Upload
- [x] Create `FileUploader` component — drag-and-drop zone (react-dropzone)
- [x] Create `parser.ts` service — xlsx/xls/csv file parsing (SheetJS)
- [x] Create `useFileUpload` hook — upload state management
- [x] Create upload result preview (data table)

## Phase 5: Backend API
- [x] Create `POST /api/upload` — file upload & parsing endpoint
- [x] Create `POST /api/analyze` — stock analysis endpoint
- [x] Create `POST /api/transfer-plan` — transfer recommendations endpoint
- [x] Create `GET /api/health` — health check endpoint
- [x] Create `parser.ts` service — server-side xlsx parsing
- [x] Create `analyzer.ts` — ABC classification, stock levels, reorder points
- [x] Create `transfer.ts` — inter-store transfer optimization

## Phase 6: Dashboard Tab
- [x] Create `KPICard` component — animated metric cards
- [x] Create `MetricsGrid` — total SKUs, stock value, low stock, overstock
- [x] Create category distribution donut chart (Recharts)
- [x] Create stock health bar chart
- [x] Create recent uploads list

## Phase 7: Stock Analysis Tab
- [x] Create `StockTable` — sortable/filterable data table with search
- [x] Create ABC Classification view — color-coded (A=green, B=yellow, C=red)
- [ ] Create stock level chart per store
- [x] Create low stock alert highlights
- [x] Create Excel export function

## Phase 8: Transfer & Planning Tabs
- [x] Create `TransferMatrix` — heatmap surplus/deficit by store × SKU
- [x] Create transfer recommendation list
- [ ] Create printable transfer document generator
- [ ] Create reorder point table
- [ ] Create safety stock visualization
- [x] Create purchase suggestion list
- [x] Create simple forecast chart (3-period moving average)

## Phase 9: Deployment
- [x] Create `netlify.toml` — build config + API proxy redirects
- [ ] Deploy frontend to Netlify (via dist/)
- [x] Create `render.yaml` — backend deploy config
- [ ] Deploy backend to Render
- [ ] Test end-to-end: frontend → backend API calls

## Phase 10: Polish & Verification
- [x] Add Framer Motion animations (fade-in, slide-up, stagger)
- [x] Add hover effects and micro-interactions
- [x] Verify frontend build (`npm run build` — no errors)
- [x] Verify backend build (`npm run build` — no errors)
- [ ] Browser test all 4 tabs
- [ ] Test file upload with sample Excel
- [ ] Verify Netlify deployment URL works
- [ ] Verify Render backend `/api/health` responds
