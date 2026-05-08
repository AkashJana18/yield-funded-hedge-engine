# FloorFi

FloorFi is a Solana paper execution and risk engine for yield-funded SOL hedging. It compares Flash Perps and Phoenix Perps short routes, replays historical SOL paths with CoinGecko, and keeps real transaction submission disabled for this hackathon build.

## Stack

- Frontend: Vite, React, TypeScript, Tailwind CSS, Recharts
- Wallets: Solana wallet-adapter with mainnet auto-connect
- Backend: Node.js, Express, TypeScript
- Historical data: CoinGecko `/coins/solana/market_chart`
- Live SOL market data: cached Birdeye, with CoinGecko fallback
- Swap route: Jupiter Swap API through the backend
- Staking: Marinade mSOL transaction builder, JitoSOL preview adapter
- Hedge venues: Flash Perps paper preview plus Phoenix SOL-PERP public market/orderbook/funding/risk adapter through `@ellipsis-labs/rise`

## App Routes

- `/` - landing page
- `/app` - simulator dashboard
- `/build` - Flash + Phoenix best hedge route dashboard
- `/hedge` - alias for `/build`

## Setup

Create `.env` from `.env.example`:

```bash
BIRDEYE_API_KEY=your-birdeye-api-key
BIRDEYE_BASE_URL=https://public-api.birdeye.so
BIRDEYE_CHAIN=solana
COINGECKO_BASE_URL=https://api.coingecko.com/api/v3
PHOENIX_API_URL=https://perp-api.phoenix.trade
PHOENIX_PERP_SYMBOL=SOL
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
VITE_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
JUPITER_BASE_URL=https://lite-api.jup.ag/swap/v1
SIMULATION_MODE=true
MAINNET_LIVE=false
FLASH_ENABLE_LIVE_EXECUTION=false
DEFAULT_EXECUTION_MODE=paper
MARINADE_STAKING_APY=0.07
JITO_STAKING_APY=0.072
```

The Birdeye key stays on the backend. The frontend never receives it.

```bash
npm install
npm run dev
```

The frontend runs at `http://localhost:5173` and the backend runs at `http://localhost:4000`.

## Execution Model

- Paper mode only for hedging in this pass.
- No wallet signature or submitted transaction is required for `/api/hedge/paper/execute`.
- No private key handling.
- CoinGecko is the only source for 30d, 90d, and 365d replay, simulation, drawdown, and APY comparisons.
- Birdeye is only used for cached live SOL price and live market display.
- Phoenix public SOL-PERP data is used where available. If public access is gated or unavailable, the adapter returns typed unavailable status instead of simulated liquidity.
- Flash and Phoenix routes are scored for paper short previews. Real hedge execution is intentionally disabled.

The dashboard copy is explicit: historical data powered by CoinGecko, live market data powered by Birdeye, and perp execution comparison powered by Flash + Phoenix.

## API

### Market

`GET /api/market/live`

Returns current SOL price from cached Birdeye with CoinGecko fallback.

```json
{
  "symbol": "SOL",
  "priceUsd": 89.47,
  "source": "birdeye",
  "timestamp": "2026-05-08T15:58:06.000Z"
}
```

`GET /api/market/sol/live`

Alias for `/api/market/live`.

`GET /api/market/sol/history?days=30|90|365`

Returns normalized daily SOL prices from CoinGecko.

`GET /api/market/tokens/prices?symbols=SOL`

Returns live SOL price from Birdeye. Multi-token live prices are intentionally not part of the hedge-routing data path.

### Swap

`POST /api/swap/quote`

```json
{
  "inputSymbol": "USDC",
  "outputSymbol": "SOL",
  "amount": 1000,
  "slippageBps": 50
}
```

`POST /api/swap/transaction`

Builds an unsigned Jupiter swap transaction for the connected wallet.

### Stake

`POST /api/stake/preview`

Returns expected mSOL/JitoSOL received, APY, and staking risks.

`POST /api/stake/transaction`

Builds an unsigned Marinade SOL -> mSOL transaction.

### Hedge

`POST /api/hedge/routes`

Compares Flash Perps and Phoenix Perps paper short routes.

```json
{
  "walletAddress": "optional",
  "solAmount": 10,
  "hedgeRatio": 0.5,
  "slippageBps": 50,
  "leverage": 2,
  "availableUsdc": 1000
}
```

Returns `recommendedRouteId`, `livePrice`, `routes`, and `sourceBreakdown`. Phoenix uses real public SOL-PERP data when available and returns unavailable status when data is gated, missing, or insufficient.

`POST /api/hedge/paper/execute`

Creates a paper short only. `routeId` may be `"best"`, `"flash_perp_short"`, or `"phoenix_perp_short"`.

```json
{
  "routeId": "best",
  "solAmount": 10,
  "hedgeRatio": 0.5,
  "slippageBps": 50,
  "leverage": 2
}
```

`POST /api/hedge/preview`

Legacy preview route. It now delegates to the Flash/Phoenix route comparison and returns paper-mode estimates.

`POST /api/hedge/flash/transaction`

Disabled in this build. Use `/api/hedge/paper/execute`.

### Portfolio

`POST /api/portfolio/metrics`

Calculates LST value, short size, net delta, hedge ratio, unrealized PnL, estimated staking yield, funding cost, net APY, and liquidation warning state.

## Safety

The builder warns when:

- Hedge ratio is above 75%
- USDC margin is insufficient
- Liquidation price is too close
- Funding rate is above staking yield
- JitoSOL is selected in preview-only mode
- Phoenix public data is gated, unavailable, or insufficient for the requested size

The primary action is paper execution only: no wallet signature is requested and no hedge transaction is sent.
