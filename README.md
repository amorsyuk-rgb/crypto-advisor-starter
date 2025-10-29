# Crypto Advisor — Starter Repo
This repository contains a minimal starter for a **React** frontend and **Express** backend.

## Server
- Location: `server/`
- Run:
  ```
  cd server
  npm install
  npm run dev   # requires nodemon or use npm start
  ```
- Endpoint:
  `GET /api/assets/:symbol/analysis` (query: tf=1h limit=200)

## Client
- Location: `client/`
- Run:
  ```
  cd client
  npm install
  npm run dev
  ```
- The client expects the server to be available at the same host (proxy in dev) or adjust fetch URL.

## Deploy
You can deploy server and client separately (preferred) or serve client build from server's static folder.

## Notes
- This is a starter. Indicator implementations are intentionally simple and for demo only.
- Not financial advice.
