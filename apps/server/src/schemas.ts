import { z } from "zod";

export const simulationRequestSchema = z.object({
  capital: z.number().positive().max(1_000_000_000),
  hedgePercent: z.number().min(0).max(100),
  stakingYield: z.number().min(-100).max(1_000),
  fundingRate: z.number().min(-100).max(1_000),
  days: z.union([z.literal(30), z.literal(90), z.literal(365)]),
  mode: z.enum(["simulated", "historical"]),
  seed: z.string().trim().min(1).max(120).optional()
});
