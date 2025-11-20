# Order Execution Engine — Mock Implementation

🔗 **GitHub Repository**: https://github.com/apirichitguy/Eterna-Labs-Assignment  
🚀 **Live Deployment**: https://eternalabs-production.up.railway.app  
🎮 **Interactive Demo**: https://eternalabs-production.up.railway.app/demo  
📺 **Demo Video**: https://youtu.be/CgMwlznyfMM

## Overview
This repository implements a mock order execution engine for a single order type (market orders by default) with DEX routing, real-time WebSocket status updates, and an order processing queue. The DEX router simulates Raydium and Meteora with realistic network delays and price variance.

Core features:
- Single endpoint `/api/orders/execute` supporting both POST and WebSocket upgrades.
- MockDEx router comparing quotes and selecting best execution venue.
- BullMQ + Redis-based queue with exponential backoff (≤3 attempts).
- WebSocket lifecycle events: pending → routing → building → submitted → confirmed/failed.
- Docker Compose for local testing (Redis + Postgres + App).
- Unit tests (Jest) and a Postman collection.

## Why Market Orders (choice)
I implemented **market orders** to demonstrate the full execution lifecycle and routing. Market orders emphasize immediate routing & execution, allowing us to show deterministic matching and end-to-end status events. The engine is modular and can be extended to:

- **Limit orders**: add a price watcher component that enqueues when market price meets target.
- **Sniper orders**: add a block/tx watch and token listing monitor to trigger an immediate market buy.

## Quickstart (local)
1. Clone and install:
```bash
git clone https://github.com/SanyamBK/EternaLabs.git
cd EternaLabs
npm install
```

2. Start with Docker:

```bash
docker-compose up --build
```

3. Start app:

```bash
npm run dev
# server on http://localhost:3000
```

## API

### POST /api/orders/execute

* Accepts JSON: `{ userId, type, tokenIn, tokenOut, amountIn }`
* Returns: `{ orderId, ws }` (ws is suggested subscription path)
* After POST, open a WebSocket to the server and send `{ subscribeOrderId: "<orderId>" }` to receive status updates.

### WebSocket usage

* Connect to `ws://localhost:3000/api/orders/execute` (or same path upgraded via ws).
* Send: `{ subscribeOrderId: "<orderId>" }`
* Events received: JSON objects with `status` field and additional info (chosenDex, txHash, error).

## Design decisions

* **Mock DEX**: Emulates price spreads (2-5%) and 2–3s execution delays. This keeps the focus on routing logic and system architecture.
* **BullMQ**: provides robust retries and concurrency settings. Default concurrency is configured in worker.
* **WebSocket manager**: lightweight in-memory map for connection management. Production: use Redis pub/sub for multi-instance.
* **Persistence**: orders stored in Postgres (simple table). In this mock, primary focus is on lifecycle and routing; persistence hooks are present.

## Tests

Run tests:

```bash
npm test
```

## Postman

Import `postman/OrderExecution.postman_collection.json` to experiment.

## Deployment

**Live on Railway**: https://eternalabs-production.up.railway.app

The application is deployed with:
* Managed Redis instance (Railway Redis service)
* Managed PostgreSQL database (Railway Postgres service)
* Auto-deployment from GitHub main branch

To test the live API:

**Interactive Demo UI:**
Visit https://eternalabs-production.up.railway.app/demo for a full-featured web interface with:
- Real-time order status updates via WebSocket
- Visual display of DEX routing decisions (Raydium vs Meteora)
- Quick test buttons for common token pairs
- Live statistics dashboard

**cURL Example:**
```bash
curl -X POST https://eternalabs-production.up.railway.app/api/orders/execute \
  -H "Content-Type: application/json" \
  -d '{"tokenIn":"SOL","tokenOut":"USDC","amountIn":1.5}'
```

### Local Deployment
* For local development, use Docker Compose (see Quickstart above)
* Replace MockDexRouter with Raydium/Meteora SDKs for real devnet execution

## Next steps (if you want real devnet)

* Integrate `@raydium-io/raydium-sdk-v2` and Meteora SDK.
* Add wallet signing, devnet faucet, and transaction confirmation flows.
* Implement rate limiting and authentication.
