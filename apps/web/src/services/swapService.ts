import type { WalletContextState } from "@solana/wallet-adapter-react";
import type { Connection } from "@solana/web3.js";
import { buildSwapTransaction, fetchSwapQuote } from "../api";
import type { SwapQuoteSummary } from "../types";
import { executeSerializedVersionedTransaction, type TransactionExecutionResult } from "./transactionService";

export async function getUsdcToSolRoute(input: {
  amountUsdc: number;
  slippageBps: number;
  signal?: AbortSignal;
}): Promise<SwapQuoteSummary> {
  return fetchSwapQuote(
    {
      inputSymbol: "USDC",
      outputSymbol: "SOL",
      amount: input.amountUsdc,
      slippageBps: input.slippageBps
    },
    input.signal
  );
}

export async function executeJupiterSwap(input: {
  connection: Connection;
  wallet: WalletContextState;
  quote: SwapQuoteSummary;
}): Promise<TransactionExecutionResult> {
  if (!input.wallet.publicKey) {
    throw new Error("Connect a wallet before swapping.");
  }

  const transaction = await buildSwapTransaction({
    userPublicKey: input.wallet.publicKey.toBase58(),
    quoteResponse: input.quote.rawQuote,
    dynamicComputeUnitLimit: true,
    prioritizationFeeLamports: "auto"
  });

  if (transaction.simulationError) {
    throw new Error(`Jupiter simulation failed: ${JSON.stringify(transaction.simulationError)}`);
  }

  return executeSerializedVersionedTransaction(input.connection, input.wallet, transaction.swapTransaction);
}
