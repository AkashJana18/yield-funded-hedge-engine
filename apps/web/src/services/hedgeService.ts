import type { WalletContextState } from "@solana/wallet-adapter-react";
import type { Connection } from "@solana/web3.js";
import { buildFlashHedgeTransaction } from "../api";
import type { VenuePosition } from "../types";
import { executeSerializedVersionedTransaction, type TransactionExecutionResult } from "./transactionService";

export interface FlashHedgeExecutionResult extends TransactionExecutionResult {
  position: VenuePosition;
}

export async function executeFlashShort(input: {
  connection: Connection;
  wallet: WalletContextState;
  marginUsd: number;
  shortNotionalUsd: number;
  solPriceUsd: number;
  slippageBps: number;
  leverage?: 1 | 2 | 3;
}): Promise<FlashHedgeExecutionResult> {
  if (!input.wallet.publicKey) {
    throw new Error("Connect a wallet before opening the hedge.");
  }

  const transaction = await buildFlashHedgeTransaction({
    walletAddress: input.wallet.publicKey.toBase58(),
    marginUsd: input.marginUsd,
    shortNotionalUsd: input.shortNotionalUsd,
    solPriceUsd: input.solPriceUsd,
    slippageBps: input.slippageBps,
    leverage: input.leverage ?? 1
  });
  const result = await executeSerializedVersionedTransaction(
    input.connection,
    input.wallet,
    transaction.serializedTransaction
  );

  return {
    ...result,
    position: transaction.position
  };
}
