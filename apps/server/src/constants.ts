export type SupportedTokenSymbol = "SOL" | "USDC" | "mSOL" | "JitoSOL";

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

export const SUPPORTED_TOKEN_SYMBOLS = Object.keys(TOKENS) as SupportedTokenSymbol[];

export function getTokenByMint(mint: string): TokenConfig | undefined {
  return SUPPORTED_TOKEN_SYMBOLS.map((symbol) => TOKENS[symbol]).find((token) => token.mint === mint);
}

export function parseTokenSymbol(value: string): SupportedTokenSymbol | null {
  return SUPPORTED_TOKEN_SYMBOLS.includes(value as SupportedTokenSymbol) ? (value as SupportedTokenSymbol) : null;
}
