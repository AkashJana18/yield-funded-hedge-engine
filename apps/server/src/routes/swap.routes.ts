import { Router } from "express";
import { z } from "zod";
import { parseTokenSymbol, TOKENS } from "../constants.js";
import { SwapService, type JupiterQuoteResponse } from "../services/swapService.js";

const quoteSchema = z.object({
  inputSymbol: z.string().transform((value, context) => {
    const symbol = parseTokenSymbol(value);

    if (!symbol) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Unsupported input token." });
      return z.NEVER;
    }

    return symbol;
  }),
  outputSymbol: z.string().transform((value, context) => {
    const symbol = parseTokenSymbol(value);

    if (!symbol) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Unsupported output token." });
      return z.NEVER;
    }

    return symbol;
  }),
  amount: z.number().positive().max(1_000_000_000),
  slippageBps: z.number().int().min(1).max(500)
});

const transactionSchema = z.object({
  userPublicKey: z.string().trim().min(32).max(64),
  quoteResponse: z.unknown(),
  dynamicComputeUnitLimit: z.boolean().optional(),
  prioritizationFeeLamports: z.union([z.literal("auto"), z.number().int().nonnegative()]).optional()
});

export function createSwapRouter(swapService = new SwapService()): Router {
  const router = Router();

  router.post("/quote", async (request, response) => {
    const parsed = quoteSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({ error: "Invalid swap quote input.", details: parsed.error.flatten().fieldErrors });
      return;
    }

    try {
      const { inputSymbol, outputSymbol, amount, slippageBps } = parsed.data;
      const amountRaw = Math.round(amount * 10 ** TOKENS[inputSymbol].decimals).toString();
      response.json(await swapService.quote({ inputSymbol, outputSymbol, amountRaw, slippageBps }));
    } catch (error) {
      response.status(502).json({ error: error instanceof Error ? error.message : "Unable to fetch Jupiter route." });
    }
  });

  router.post("/transaction", async (request, response) => {
    const parsed = transactionSchema.safeParse(request.body);

    if (!parsed.success) {
      response
        .status(400)
        .json({ error: "Invalid swap transaction input.", details: parsed.error.flatten().fieldErrors });
      return;
    }

    try {
      response.json(
        await swapService.buildSwapTransaction({
          ...parsed.data,
          quoteResponse: parsed.data.quoteResponse as JupiterQuoteResponse
        })
      );
    } catch (error) {
      response
        .status(502)
        .json({ error: error instanceof Error ? error.message : "Unable to build Jupiter swap transaction." });
    }
  });

  return router;
}
