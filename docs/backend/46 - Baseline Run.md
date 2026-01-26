# Backend Baseline Run

## Purpose
Define repeatable commands to run the backend before cleanup or refactors.

## Prereqs
- Node.js + npm available in PATH.
- Backend environment variables set (see `.env.example`).

## Setup
1) Copy env template:
   - `cp .env.example .env`
2) Fill required values in `.env`.
3) Install dependencies:
   - `npm install`

## Run
- Start server:
  - `npm run start`

## Verify
- Terminal shows:
  - `Video Backend running on http://0.0.0.0:3000`
- Health check:
  - `curl http://localhost:3000/health`
