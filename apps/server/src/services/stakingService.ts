import { Marinade, MarinadeConfig } from "@marinade.finance/marinade-ts-sdk";
import anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import type { SupportedTokenSymbol } from "../constants.js";
import { BirdeyeService } from "../integrations/birdeye/birdeye.service.js";

const { BN } = anchor;

export type StakeAsset = "mSOL" | "JitoSOL";

export interface StakePreview {
  stakeAsset: StakeAsset;
  inputSol: number;
  expectedLst: number;
  solPriceUsd: number;
  lstPriceUsd: number;
  stakingApy: number;
  provider: "Marinade" | "Jito";
  source: "birdeye";
  risks: string[];
}

export interface StakeTransactionResponse {
  stakeAsset: StakeAsset;
  serializedTransaction: string;
  associatedTokenAccount: string;
  lastValidBlockHeight: number;
}

export class StakingService {
  constructor(
    private readonly marketData = new BirdeyeService(),
    private readonly connection = new Connection(process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com", "confirmed")
  ) {}

  async preview(stakeAsset: StakeAsset, solAmount: number): Promise<StakePreview> {
    const [sol, lst] = await this.marketData.getTokenPrices(["SOL", stakeAsset]);
    const expectedLst = (solAmount * sol.priceUsd) / lst.priceUsd;

    return {
      stakeAsset,
      inputSol: solAmount,
      expectedLst: roundAmount(expectedLst),
      solPriceUsd: sol.priceUsd,
      lstPriceUsd: lst.priceUsd,
      stakingApy: resolveStakingApy(stakeAsset),
      provider: stakeAsset === "mSOL" ? "Marinade" : "Jito",
      source: "birdeye",
      risks: buildStakingRisks(stakeAsset)
    };
  }

  async buildTransaction(input: {
    stakeAsset: StakeAsset;
    walletAddress: string;
    solAmount: number;
  }): Promise<StakeTransactionResponse> {
    if (input.stakeAsset !== "mSOL") {
      throw new Error("JitoSOL staking adapter is preview-only in this build. Use mSOL for live staking.");
    }

    const publicKey = new PublicKey(input.walletAddress);
    const marinade = new Marinade(
      new MarinadeConfig({
        connection: this.connection,
        publicKey
      })
    );
    const amountLamports = new BN(Math.round(input.solAmount * 1_000_000_000));
    const { associatedMSolTokenAccountAddress, transaction } = await marinade.deposit(amountLamports);
    const latest = await this.connection.getLatestBlockhash("confirmed");
    transaction.feePayer = publicKey;
    transaction.recentBlockhash = latest.blockhash;

    return {
      stakeAsset: input.stakeAsset,
      serializedTransaction: transaction
        .serialize({ requireAllSignatures: false, verifySignatures: false })
        .toString("base64"),
      associatedTokenAccount: associatedMSolTokenAccountAddress.toBase58(),
      lastValidBlockHeight: latest.lastValidBlockHeight
    };
  }
}

function resolveStakingApy(stakeAsset: StakeAsset): number {
  const key = stakeAsset === "mSOL" ? "MARINADE_STAKING_APY" : "JITO_STAKING_APY";
  const value = Number(process.env[key]);

  if (Number.isFinite(value) && value >= 0) {
    return value > 1 ? value / 100 : value;
  }

  return stakeAsset === "mSOL" ? 0.07 : 0.072;
}

function buildStakingRisks(stakeAsset: SupportedTokenSymbol): string[] {
  const provider = stakeAsset === "mSOL" ? "Marinade" : "Jito";

  return [
    `${provider} liquid staking has smart contract and validator performance risk.`,
    `${stakeAsset} can trade away from the underlying SOL value during stressed markets.`,
    "Staking APY is variable and can fall below hedge funding cost."
  ];
}

function roundAmount(value: number): number {
  return Math.round(value * 1_000_000_000) / 1_000_000_000;
}

export function isStakeAsset(value: string): value is StakeAsset {
  return value === "mSOL" || value === "JitoSOL";
}
