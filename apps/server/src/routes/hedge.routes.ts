import { Router } from "express";
import { z } from "zod";
import { HedgeService } from "../services/hedge.service.js";

const venueSchema = z.enum(["mock", "flash"]);

const previewSchema = z.object({
  walletAddress: z.string().trim().min(1).max(120).optional(),
  capitalUsd: z.number().positive().max(1_000_000_000),
  hedgePercent: z.number().min(0).max(1),
  stakingYield: z.number().min(-1).max(10),
  fundingRate: z.number().min(-1).max(10),
  leverage: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  venue: venueSchema
});

const openSchema = z.object({
  walletAddress: z.string().trim().min(1).max(120),
  capitalUsd: z.number().positive().max(1_000_000_000),
  hedgePercent: z.number().min(0).max(1),
  leverage: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  venue: venueSchema
});

export function createHedgeRouter(hedgeService = new HedgeService()): Router {
  const router = Router();

  router.post("/preview", async (request, response) => {
    const parsed = previewSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({ error: "Invalid hedge preview input.", details: parsed.error.flatten().fieldErrors });
      return;
    }

    try {
      response.json(await hedgeService.preview(parsed.data));
    } catch (error) {
      response.status(502).json({ error: error instanceof Error ? error.message : "Unable to preview hedge." });
    }
  });

  router.post("/open", async (request, response) => {
    const parsed = openSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({ error: "Invalid hedge open input.", details: parsed.error.flatten().fieldErrors });
      return;
    }

    try {
      response.json(await hedgeService.open(parsed.data));
    } catch (error) {
      response.status(409).json({ error: error instanceof Error ? error.message : "Unable to open hedge." });
    }
  });

  return router;
}
