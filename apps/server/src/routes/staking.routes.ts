import { Router } from "express";
import { z } from "zod";
import { isStakeAsset, StakingService } from "../services/stakingService.js";

const previewSchema = z.object({
  stakeAsset: z.string().transform((value, context) => {
    if (!isStakeAsset(value)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "stakeAsset must be mSOL or JitoSOL." });
      return z.NEVER;
    }

    return value;
  }),
  solAmount: z.number().positive().max(10_000_000)
});

const transactionSchema = previewSchema.extend({
  walletAddress: z.string().trim().min(32).max(64)
});

export function createStakingRouter(stakingService = new StakingService()): Router {
  const router = Router();

  router.post("/preview", async (request, response) => {
    const parsed = previewSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({ error: "Invalid staking preview input.", details: parsed.error.flatten().fieldErrors });
      return;
    }

    try {
      response.json(await stakingService.preview(parsed.data.stakeAsset, parsed.data.solAmount));
    } catch (error) {
      response.status(502).json({ error: error instanceof Error ? error.message : "Unable to preview staking." });
    }
  });

  router.post("/transaction", async (request, response) => {
    const parsed = transactionSchema.safeParse(request.body);

    if (!parsed.success) {
      response
        .status(400)
        .json({ error: "Invalid staking transaction input.", details: parsed.error.flatten().fieldErrors });
      return;
    }

    try {
      response.json(await stakingService.buildTransaction(parsed.data));
    } catch (error) {
      response
        .status(502)
        .json({ error: error instanceof Error ? error.message : "Unable to build staking transaction." });
    }
  });

  return router;
}
