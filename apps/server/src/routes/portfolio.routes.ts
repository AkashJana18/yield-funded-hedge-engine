import { Router } from "express";
import { z } from "zod";
import { PortfolioService } from "../services/portfolioService.js";

const balanceSchema = z.object({
  symbol: z.enum(["SOL", "USDC", "mSOL", "JitoSOL"]),
  mint: z.string(),
  balance: z.number(),
  decimals: z.number(),
  priceUsd: z.number().nullable(),
  valueUsd: z.number().nullable()
});

const positionSchema = z
  .object({
    id: z.string(),
    symbol: z.literal("SOL"),
    side: z.literal("short"),
    notionalUsd: z.number(),
    entryPrice: z.number(),
    currentPrice: z.number(),
    leverage: z.number(),
    marginUsd: z.number(),
    estimatedLiquidationPrice: z.number(),
    liquidationDistance: z.number(),
    unrealizedPnl: z.number(),
    health: z.enum(["safe", "warning", "danger"]),
    mode: z.enum(["paper", "live"]),
    venue: z.string(),
    status: z.enum(["open", "closed"]),
    openedAt: z.string(),
    walletAddress: z.string().optional(),
    closedAt: z.string().optional()
  })
  .nullable()
  .optional();

const metricsSchema = z.object({
  balances: z.array(balanceSchema),
  shortPosition: positionSchema,
  stakingYieldRate: z.number().min(-1).max(10),
  fundingRate: z.number().min(-1).max(10)
});

export function createPortfolioRouter(portfolioService = new PortfolioService()): Router {
  const router = Router();

  router.post("/metrics", (request, response) => {
    const parsed = metricsSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({ error: "Invalid portfolio metric input.", details: parsed.error.flatten().fieldErrors });
      return;
    }

    response.json(portfolioService.calculateMetrics(parsed.data));
  });

  return router;
}
