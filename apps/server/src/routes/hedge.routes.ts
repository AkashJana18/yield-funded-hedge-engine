import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { HedgeService } from "../services/hedge.service.js";

const venueSchema = z.enum(["mock", "flash"]);

const capitalPreviewSchema = z.object({
  walletAddress: z.string().trim().min(1).max(120).optional(),
  capitalUsd: z.number().positive().max(1_000_000_000),
  hedgePercent: z.number().min(0).max(1),
  stakingYield: z.number().min(-1).max(10),
  fundingRate: z.number().min(-1).max(10),
  leverage: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  venue: venueSchema,
  availableUsdc: z.number().nonnegative().optional()
});

const solExposurePreviewSchema = z.object({
  walletAddress: z.string().trim().min(1).max(120).optional(),
  solAmount: z.number().positive().max(10_000_000),
  hedgeRatio: z.number().min(0).max(1),
  stakingYield: z.number().min(-1).max(10).optional(),
  fundingRate: z.number().min(-1).max(10).optional(),
  leverage: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  venue: venueSchema.optional(),
  availableUsdc: z.number().nonnegative().optional()
});

const previewSchema = z.union([
  capitalPreviewSchema.transform((input) => ({ kind: "capital" as const, input })),
  solExposurePreviewSchema.transform((input) => ({ kind: "solExposure" as const, input }))
]);

const openSchema = z.object({
  walletAddress: z.string().trim().min(1).max(120),
  capitalUsd: z.number().positive().max(1_000_000_000),
  hedgePercent: z.number().min(0).max(1),
  leverage: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  venue: venueSchema
});

const flashTransactionSchema = z.object({
  walletAddress: z.string().trim().min(32).max(64),
  marginUsd: z.number().positive().max(1_000_000_000),
  shortNotionalUsd: z.number().positive().max(1_000_000_000),
  solPriceUsd: z.number().positive().max(1_000_000),
  slippageBps: z.number().int().min(1).max(500),
  leverage: z.union([z.literal(1), z.literal(2), z.literal(3)])
});

const hedgeRoutesSchema = z.object({
  walletAddress: z.string().trim().min(1).max(120).optional(),
  solAmount: z.number().positive().max(10_000_000),
  hedgeRatio: z.number().min(0).max(1),
  slippageBps: z.number().int().min(1).max(500),
  leverage: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  fundingRate: z.number().min(-1).max(10).optional(),
  availableUsdc: z.number().nonnegative().optional()
});

const paperExecuteSchema = hedgeRoutesSchema.extend({
  routeId: z.enum(["best", "flash_perp_short", "phoenix_perp_short"])
});

export function createHedgeRouter(hedgeService = new HedgeService()): Router {
  const router = Router();

  router.post("/routes", async (request, response) => {
    const parsed = hedgeRoutesSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({ error: "Invalid protection route input.", details: parsed.error.flatten().fieldErrors });
      return;
    }

    try {
      response.json(await hedgeService.getRoutes(parsed.data));
    } catch (error) {
      response.status(502).json({ error: error instanceof Error ? error.message : "Unable to compare protection routes." });
    }
  });

  async function handleOpenProtection(request: Request, response: Response) {
    const parsed = paperExecuteSchema.safeParse(request.body);

    if (!parsed.success) {
      response
        .status(400)
        .json({ error: "Invalid protection request.", details: parsed.error.flatten().fieldErrors });
      return;
    }

    try {
      response.json(await hedgeService.paperExecute(parsed.data));
    } catch (error) {
      response.status(409).json({ error: error instanceof Error ? error.message : "Unable to open protection." });
    }
  }

  router.post("/open-protection", handleOpenProtection);
  router.post("/paper/execute", handleOpenProtection);

  router.post("/preview", async (request, response) => {
    const parsed = previewSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({ error: "Invalid protection input.", details: parsed.error.flatten().fieldErrors });
      return;
    }

    try {
      response.json(
        parsed.data.kind === "capital"
          ? await hedgeService.preview(parsed.data.input)
          : await hedgeService.previewSolExposure(parsed.data.input)
      );
    } catch (error) {
      response.status(502).json({ error: error instanceof Error ? error.message : "Unable to load protection." });
    }
  });

  router.post("/open", async (request, response) => {
    const parsed = openSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({ error: "Invalid protection open input.", details: parsed.error.flatten().fieldErrors });
      return;
    }

    try {
      response.json(await hedgeService.open(parsed.data));
    } catch (error) {
      response.status(409).json({ error: error instanceof Error ? error.message : "Unable to open protection." });
    }
  });

  router.post("/flash/transaction", async (request, response) => {
    const parsed = flashTransactionSchema.safeParse(request.body);

    if (!parsed.success) {
      response
        .status(400)
        .json({ error: "Invalid Flash protection input.", details: parsed.error.flatten().fieldErrors });
      return;
    }

    try {
      response.json(await hedgeService.buildFlashOpenTransaction(parsed.data));
    } catch (error) {
      response
        .status(502)
        .json({ error: error instanceof Error ? error.message : "Unable to prepare Flash protection." });
    }
  });

  return router;
}
