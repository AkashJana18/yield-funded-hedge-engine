import { Router } from "express";
import { HedgeService } from "../services/hedge.service.js";

export function createPositionsRouter(hedgeService = new HedgeService()): Router {
  const router = Router();

  router.get("/:id", async (request, response) => {
    try {
      response.json(await hedgeService.getPosition(request.params.id));
    } catch (error) {
      response.status(404).json({ error: error instanceof Error ? error.message : "Position not found." });
    }
  });

  router.post("/:id/close", async (request, response) => {
    try {
      response.json(await hedgeService.closePosition(request.params.id, request.body?.walletAddress));
    } catch (error) {
      response.status(404).json({ error: error instanceof Error ? error.message : "Unable to close position." });
    }
  });

  return router;
}
