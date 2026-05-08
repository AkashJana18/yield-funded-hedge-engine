import type { StakeAsset, SupportedTokenSymbol } from "./types";

export interface TokenConfig {
  symbol: SupportedTokenSymbol;
  name: string;
  mint: string;
  decimals: number;
}

export const TOKENS: Record<SupportedTokenSymbol, TokenConfig> = {
  SOL: {
    symbol: "SOL",
    name: "Solana",
    mint: "So11111111111111111111111111111111111111112",
    decimals: 9
  },
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    decimals: 6
  },
  mSOL: {
    symbol: "mSOL",
    name: "Marinade Staked SOL",
    mint: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
    decimals: 9
  },
  JitoSOL: {
    symbol: "JitoSOL",
    name: "Jito Staked SOL",
    mint: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
    decimals: 9
  }
};

export const STAKE_ASSETS: StakeAsset[] = ["mSOL", "JitoSOL"];
export const HEDGE_RATIOS = [0.25, 0.5, 0.75, 1] as const;
export const FLASH_POOL_NAME = "Crypto.1";
export const FLASH_DEFAULT_LEVERAGE = 1;
export const DEFAULT_SLIPPAGE_BPS = 50;
