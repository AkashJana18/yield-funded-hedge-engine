import { Connection, PublicKey } from "@solana/web3.js";
import { Router } from "express";

export function createWalletRouter(
  connection = new Connection(process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com", "confirmed")
): Router {
  const router = Router();

  router.get("/:address/balance", async (request, response) => {
    try {
      const publicKey = new PublicKey(request.params.address);
      const lamports = await connection.getBalance(publicKey);

      response.json({
        walletAddress: publicKey.toBase58(),
        solBalance: lamports / 1_000_000_000
      });
    } catch (error) {
      response.status(400).json({
        error: error instanceof Error ? error.message : "Unable to fetch wallet SOL balance."
      });
    }
  });

  return router;
}
