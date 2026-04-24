# SOL Yield-Funded Hedging Simulator

Full-stack simulator for comparing an unhedged SOL holding with a hedged SOL position funded by staking yield and perp funding.

## Stack

- Frontend: Vite, React, TypeScript, Tailwind CSS, Recharts
- Backend: Node.js, Express, TypeScript
- Data: deterministic simulated SOL prices or historical SOL prices from CoinGecko

## Setup

```bash
npm install
npm run dev
```

The frontend runs at `http://localhost:5173` and the backend runs at `http://localhost:4000`.
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

`POST /simulate`

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

Response:

```json
{
  "unhedged": [10000, 10042.15],
  "hedged": [10000, 10021.52],
  "metrics": {
    "finalUnhedged": 10042.15,
    "finalHedged": 10021.52,
    "netReturnUnhedged": 42.15,
    "netReturnHedged": 21.52,
    "maxDrawdownUnhedged": 0.03,
    "maxDrawdownHedged": 0.01,
    "annualizedApyUnhedged": 0.0171,
    "annualizedApyHedged": 0.0087,
    "protectionBenefit": -20.63
  }
}
```

CoinGecko historical responses are cached in memory by period to reduce rate-limit pressure.
