import { Router } from "express";
import { BirdeyeService } from "../integrations/birdeye/birdeye.service.js";

export function createMarketRouter(marketData = new BirdeyeService()): Router {
  const router = Router();

  router.get("/sol/live", async (_request, response) => {
    try {
      response.json(await marketData.getSolLivePrice());
    } catch (error) {
      response.status(502).json({ error: error instanceof Error ? error.message : "Unable to fetch SOL price." });
    }
  });

  router.get("/sol/history", async (request, response) => {
    const days = Number(request.query.days);

    if (days !== 30 && days !== 90 && days !== 365) {
      response.status(400).json({ error: "days must be one of 30, 90, or 365." });
      return;
    }

    try {
      response.json(await marketData.getSolHistory(days));
    } catch (error) {
      response.status(502).json({ error: error instanceof Error ? error.message : "Unable to fetch SOL history." });
    }
  });

  return router;
}
