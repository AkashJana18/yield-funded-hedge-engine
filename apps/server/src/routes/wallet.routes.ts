import { Connection, PublicKey } from "@solana/web3.js";
import { Router } from "express";
import { SUPPORTED_TOKEN_SYMBOLS, TOKENS, type SupportedTokenSymbol } from "../constants.js";
import { BirdeyeService } from "../integrations/birdeye/birdeye.service.js";
import { CoinGeckoService } from "../services/coingecko.js";
import { LiveMarketService } from "../services/liveMarket.service.js";

const LAMPORTS_PER_SOL = 1_000_000_000;

export interface WalletTokenBalance {
  symbol: SupportedTokenSymbol;
  mint: string;
  balance: number;
  decimals: number;
  priceUsd: number | null;
  valueUsd: number | null;
}

export function createWalletRouter(
  marketData = new BirdeyeService(),
  connection = new Connection(process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com", "confirmed"),
  liveMarket = new LiveMarketService(marketData, new CoinGeckoService())
): Router {
  const router = Router();

  router.get("/:address/balance", async (request, response) => {
    try {
      const publicKey = new PublicKey(request.params.address);
      const [lamports, tokenBalances, priceResult] = await Promise.all([
        connection.getBalance(publicKey),
        fetchSplBalances(connection, publicKey),
        liveMarket
          .getSolLivePrice()
          .then((price) => ({ price, error: null }))
          .catch((error: unknown) => ({
            price: null,
            error: error instanceof Error ? error.message : "Unable to fetch live SOL price."
          }))
      ]);

      const solBalance = lamports / LAMPORTS_PER_SOL;
      const balances: WalletTokenBalance[] = SUPPORTED_TOKEN_SYMBOLS.map((symbol) => {
        const token = TOKENS[symbol];
        const balance = symbol === "SOL" ? solBalance : (tokenBalances.get(symbol) ?? 0);
        const priceUsd = symbol === "SOL" ? priceResult.price?.priceUsd ?? null : null;

        return {
          symbol,
          mint: token.mint,
          balance,
          decimals: token.decimals,
          priceUsd,
          valueUsd: priceUsd === null ? null : balance * priceUsd
        };
      });

      response.json({
        walletAddress: publicKey.toBase58(),
        solBalance,
        balances,
        marketDataSource: priceResult.price?.source ?? null,
        marketDataError: priceResult.error
      });
    } catch (error) {
      response.status(400).json({
        error: error instanceof Error ? error.message : "Unable to fetch wallet balances."
      });
    }
  });

  return router;
}

async function fetchSplBalances(connection: Connection, owner: PublicKey): Promise<Map<SupportedTokenSymbol, number>> {
  const entries = await Promise.all(
    SUPPORTED_TOKEN_SYMBOLS.filter((symbol) => symbol !== "SOL").map(async (symbol) => {
      const token = TOKENS[symbol];
      const mint = new PublicKey(token.mint);
      const accounts = await connection.getParsedTokenAccountsByOwner(owner, { mint });
      const balance = accounts.value.reduce((sum, account) => {
        const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
        return sum + (Number.isFinite(amount) ? Number(amount) : 0);
      }, 0);

      return [symbol, balance] as const;
    })
  );

  return new Map(entries);
}
