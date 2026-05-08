import type { WalletContextState } from "@solana/wallet-adapter-react";
import { Buffer } from "buffer";
import {
  Connection,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
  type AddressLookupTableAccount,
  type Signer,
  type TransactionInstruction
} from "@solana/web3.js";

export interface TransactionExecutionResult {
  signature: string;
  simulationLogs: string[];
}

export async function executeSerializedVersionedTransaction(
  connection: Connection,
  wallet: WalletContextState,
  base64Transaction: string
): Promise<TransactionExecutionResult> {
  const transaction = VersionedTransaction.deserialize(Buffer.from(base64Transaction, "base64"));
  return executeVersionedTransaction(connection, wallet, transaction);
}

export async function executeSerializedLegacyTransaction(
  connection: Connection,
  wallet: WalletContextState,
  base64Transaction: string
): Promise<TransactionExecutionResult> {
  const transaction = Transaction.from(Buffer.from(base64Transaction, "base64"));
  return executeLegacyTransaction(connection, wallet, transaction);
}

export async function executeVersionedTransaction(
  connection: Connection,
  wallet: WalletContextState,
  transaction: VersionedTransaction
): Promise<TransactionExecutionResult> {
  assertWalletCanSign(wallet);
  const simulation = await connection.simulateTransaction(transaction, {
    sigVerify: false,
    replaceRecentBlockhash: true
  });

  if (simulation.value.err) {
    throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`);
  }

  const signed = await wallet.signTransaction(transaction);
  const signature = await sendRawTransactionWithRetry(connection, signed.serialize());
  const latest = await connection.getLatestBlockhash("confirmed");
  await connection.confirmTransaction({ signature, ...latest }, "confirmed");

  return {
    signature,
    simulationLogs: simulation.value.logs ?? []
  };
}

export async function executeLegacyTransaction(
  connection: Connection,
  wallet: WalletContextState,
  transaction: Transaction
): Promise<TransactionExecutionResult> {
  assertWalletCanSign(wallet);

  transaction.feePayer = wallet.publicKey ?? undefined;
  const latest = await connection.getLatestBlockhash("confirmed");
  transaction.recentBlockhash = latest.blockhash;

  const simulation = await connection.simulateTransaction(transaction, undefined, true);

  if (simulation.value.err) {
    throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`);
  }

  const signed = await wallet.signTransaction(transaction);
  const signature = await sendRawTransactionWithRetry(connection, signed.serialize());
  await connection.confirmTransaction({ signature, ...latest }, "confirmed");

  return {
    signature,
    simulationLogs: simulation.value.logs ?? []
  };
}

export async function buildVersionedTransaction(input: {
  connection: Connection;
  payer: NonNullable<WalletContextState["publicKey"]>;
  instructions: TransactionInstruction[];
  addressLookupTables?: AddressLookupTableAccount[];
  additionalSigners?: Signer[];
}): Promise<VersionedTransaction> {
  const latest = await input.connection.getLatestBlockhash("confirmed");
  const message = new TransactionMessage({
    payerKey: input.payer,
    recentBlockhash: latest.blockhash,
    instructions: input.instructions
  }).compileToV0Message(input.addressLookupTables ?? []);
  const transaction = new VersionedTransaction(message);

  if (input.additionalSigners?.length) {
    transaction.sign(input.additionalSigners);
  }

  return transaction;
}

async function sendRawTransactionWithRetry(connection: Connection, serialized: Uint8Array): Promise<string> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await connection.sendRawTransaction(serialized, {
        maxRetries: 3,
        skipPreflight: false,
        preflightCommitment: "confirmed"
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Transaction send failed.");
}

function assertWalletCanSign(wallet: WalletContextState): asserts wallet is WalletContextState & {
  publicKey: NonNullable<WalletContextState["publicKey"]>;
  signTransaction: NonNullable<WalletContextState["signTransaction"]>;
} {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error("Connect a wallet that supports transaction signing.");
  }
}
