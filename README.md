# FloorFi

FloorFi is a Solana DeFi simulation and hedge-preview app for comparing unhedged SOL exposure against a yield-funded hedged strategy using spot/LST exposure plus short SOL perp protection.

## Stack

- Frontend: Vite, React, TypeScript, Tailwind CSS, Recharts
- Backend: Node.js, Express, TypeScript
- Market data: Birdeye first, CoinGecko historical fallback
- Solana: `@solana/web3.js`
- Execution adapter: Flash Trade adapter is present, with live execution disabled by default

## App Routes

- `/` - landing page
- `/app` - existing simulator dashboard
- `/hedge` - one-click hedge preview flow

## Setup

Create `.env` from `.env.example`:

```bash
BIRDEYE_API_KEY=your-birdeye-api-key
BIRDEYE_BASE_URL=https://public-api.birdeye.so
BIRDEYE_CHAIN=solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
FLASH_ENABLE_LIVE_EXECUTION=false
DEFAULT_EXECUTION_MODE=paper
```

Get a Birdeye API key from the Birdeye developer portal. The backend sends `X-API-KEY` and `x-chain: solana` headers on market requests.

```bash
npm install
npm run dev
```

The frontend runs at `http://localhost:5173` and the backend runs at `http://localhost:4000`.
`npm run dev` stops stale FloorFi dev processes on ports `4000` and `5173-5176` before starting, so rerunning the command after an interrupted session should not hit `EADDRINUSE`.
If your browser resolves `localhost` oddly, use `http://127.0.0.1:5173`.
The frontend defaults to calling the backend on the same hostname and port `4000`, so LAN URLs such as `http://192.168.x.x:5173` call `http://192.168.x.x:4000`.

To point the frontend at a different API URL:

```bash
VITE_API_URL=http://localhost:4000 npm run dev:web
```

To run them separately:

```bash
npm run dev:server
npm run dev:web
```

## Build

```bash
npm run build
npm start
```

## API

### Market

`GET /api/market/sol/live`

Returns the current SOL price. Birdeye is preferred; if Birdeye live price is rate-limited, the service falls back to the latest normalized historical point.

`GET /api/market/sol/history?days=30|90|365`

Returns normalized daily SOL prices from Birdeye, with CoinGecko as fallback.

### Simulator

`POST /api/simulate`

```json
{
  "capital": 10000,
  "hedgePercent": 50,
  "stakingYield": 7,
  "fundingRate": 4,
  "days": 90,
  "mode": "simulated",
  "seed": "optional-seed"
}
```

`seed` is optional and only affects simulated mode. Passing the same seed returns the same simulated price path.

### Hedge Preview

`POST /api/hedge/preview`

```json
{
  "walletAddress": "optional",
  "capitalUsd": 10000,
  "hedgePercent": 0.5,
  "stakingYield": 0.07,
  "fundingRate": 0.04,
  "leverage": 1,
  "venue": "mock"
}
```

Returns hedge notional, estimated SOL short size, margin, liquidation price, liquidation distance, health, net APY, funding cost, and warnings.

### Paper Positions

`POST /api/hedge/open`

```json
{
  "walletAddress": "PaperMode111111111111111111111111111111111",
  "capitalUsd": 10000,
  "hedgePercent": 0.5,
  "leverage": 1,
  "venue": "mock"
}
```

`GET /api/positions/:id`

`POST /api/positions/:id/close`

## Paper Mode

Paper mode uses live market data but never executes real trades. `MockVenue` opens and closes in-memory paper short positions and tracks entry price, current price, notional, margin, liquidation price, unrealized PnL, and health.

## Flash Integration Status

`FlashTradeVenue` exists as a clean adapter implementing the same perp venue interface as `MockVenue`. It initializes a Solana connection and can dynamically load `flash-sdk` if the package is installed, but live methods intentionally throw:

```text
Flash live execution is disabled or not implemented yet
```

Live Flash execution is disabled unless:

```bash
FLASH_ENABLE_LIVE_EXECUTION=true
```

Do not enable live execution until the exact Flash SDK order methods, wallet signing path, slippage controls, and risk limits are reviewed. This MVP does not include custody, auth, a database, Anchor programs, or real vault logic.
