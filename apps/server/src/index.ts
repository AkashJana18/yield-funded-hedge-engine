import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import cors from "cors";
import express from "express";
import { BirdeyeService } from "./integrations/birdeye/birdeye.service.js";
import { createHedgeRouter } from "./routes/hedge.routes.js";
import { createMarketRouter } from "./routes/market.routes.js";
import { createPositionsRouter } from "./routes/positions.routes.js";
import { createWalletRouter } from "./routes/wallet.routes.js";
import { simulationRequestSchema } from "./schemas.js";
import { HedgeService } from "./services/hedge.service.js";
import { generateSimulatedPrices, runSimulation } from "./services/simulation.js";

config({
  path: fileURLToPath(new URL("../../../.env", import.meta.url)),
  quiet: true
});

const app = express();
const port = Number(process.env.PORT ?? 4000);
const marketData = new BirdeyeService();
const hedgeService = new HedgeService();

app.use(cors({ origin: resolveCorsOrigin }));
app.use(express.json());

app.get("/", (_request, response) => {
  response.json({
    name: "SOL yield-funded hedging simulator API",
    status: "ok",
    routes: {
      health: "GET /health",
      simulate: "POST /simulate",
      marketLive: "GET /api/market/sol/live",
      marketHistory: "GET /api/market/sol/history?days=30",
      hedgePreview: "POST /api/hedge/preview"
    }
  });
});

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.post("/simulate", async (request, response) => {
  const parsed = simulationRequestSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({
      error: "Invalid simulation input.",
      details: parsed.error.flatten().fieldErrors
    });
    return;
  }

  try {
    const input = parsed.data;
    const historical = input.mode === "historical" ? await marketData.getSolHistory(input.days) : null;
    const prices = historical
      ? historical.prices.map((point) => point.price)
      : generateSimulatedPrices(input.days, input.seed ?? "sol-yield-funded-hedge");

    response.json({
      ...runSimulation(input, prices),
      source: historical?.source ?? "simulated"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Simulation failed.";
    response.status(502).json({ error: message });
  }
});

app.post("/api/simulate", async (request, response) => {
  const parsed = simulationRequestSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({
      error: "Invalid simulation input.",
      details: parsed.error.flatten().fieldErrors
    });
    return;
  }

  try {
    const input = parsed.data;
    const historical = input.mode === "historical" ? await marketData.getSolHistory(input.days) : null;
    const prices = historical
      ? historical.prices.map((point) => point.price)
      : generateSimulatedPrices(input.days, input.seed ?? "sol-yield-funded-hedge");

    response.json({
      ...runSimulation(input, prices),
      source: historical?.source ?? "simulated"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Simulation failed.";
    response.status(502).json({ error: message });
  }
});

app.use("/api/market", createMarketRouter(marketData));
app.use("/api/hedge", createHedgeRouter(hedgeService));
app.use("/api/positions", createPositionsRouter(hedgeService));
app.use("/api/wallet", createWalletRouter());

app.listen(port, () => {
  console.log(`SOL hedge simulator API listening on http://localhost:${port}`);
});

function resolveCorsOrigin(
  origin: string | undefined,
  callback: (error: Error | null, allow?: boolean) => void
) {
  if (!origin) {
    callback(null, true);
    return;
  }

  const configuredOrigins = (process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (configuredOrigins.includes(origin) || isLocalDevOrigin(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error(`Origin ${origin} is not allowed by CORS.`));
}

function isLocalDevOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    const hostname = url.hostname;

    return (
      url.protocol === "http:" &&
      (hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "::1" ||
        hostname.startsWith("192.168.") ||
        hostname.startsWith("10.") ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname))
    );
  } catch {
    return false;
  }
}
