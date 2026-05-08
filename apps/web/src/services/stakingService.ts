import type { WalletContextState } from "@solana/wallet-adapter-react";
import type { Connection } from "@solana/web3.js";
import { buildStakeTransaction, previewStake } from "../api";
import type { StakeAsset, StakePreview } from "../types";
import { executeSerializedLegacyTransaction, type TransactionExecutionResult } from "./transactionService";

export interface StakingAdapter {
  asset: StakeAsset;
  preview(solAmount: number, signal?: AbortSignal): Promise<StakePreview>;
  stake(input: {
    connection: Connection;
    wallet: WalletContextState;
    solAmount: number;
  }): Promise<TransactionExecutionResult>;
}

export const marinadeStakingAdapter: StakingAdapter = {
  asset: "mSOL",
  preview(solAmount, signal) {
    return previewStake({ stakeAsset: "mSOL", solAmount }, signal);
  },
  async stake({ connection, wallet, solAmount }) {
    if (!wallet.publicKey) {
      throw new Error("Connect a wallet before staking.");
    }

    const transaction = await buildStakeTransaction({
      stakeAsset: "mSOL",
      solAmount,
      walletAddress: wallet.publicKey.toBase58()
    });

    return executeSerializedLegacyTransaction(connection, wallet, transaction.serializedTransaction);
  }
};

export const jitoStakingAdapter: StakingAdapter = {
  asset: "JitoSOL",
  preview(solAmount, signal) {
    return previewStake({ stakeAsset: "JitoSOL", solAmount }, signal);
  },
  async stake() {
    throw new Error("JitoSOL staking adapter is present but disabled in this build. Select mSOL for live staking.");
  }
};

export function getStakingAdapter(asset: StakeAsset): StakingAdapter {
  return asset === "mSOL" ? marinadeStakingAdapter : jitoStakingAdapter;
}
