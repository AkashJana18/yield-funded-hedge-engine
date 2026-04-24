import cors from "cors";
import express from "express";
import { simulationRequestSchema } from "./schemas.js";
import { getHistoricalSolPrices } from "./services/coingecko.js";
import { generateSimulatedPrices, runSimulation } from "./services/simulation.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json());

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
    const prices =
      input.mode === "historical"
        ? await getHistoricalSolPrices(input.days)
        : generateSimulatedPrices(input.days, input.seed ?? "sol-yield-funded-hedge");

    response.json(runSimulation(input, prices));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Simulation failed.";
    response.status(502).json({ error: message });
  }
});

app.listen(port, () => {
  console.log(`SOL hedge simulator API listening on http://localhost:${port}`);
});
