import { Connection } from "@solana/web3.js";
import type { FlashClientStatus } from "./flash.types.js";

export class FlashClient {
  readonly connection: Connection;
  private sdkLoadAttempt: Promise<unknown> | null = null;

  constructor(
    private readonly rpcUrl = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com",
    private readonly liveExecutionEnabled = process.env.FLASH_ENABLE_LIVE_EXECUTION === "true"
  ) {
    this.connection = new Connection(this.rpcUrl, "confirmed");
  }

  async getStatus(): Promise<FlashClientStatus> {
    return {
      sdkAvailable: await this.isSdkAvailable(),
      liveExecutionEnabled: this.liveExecutionEnabled,
      rpcUrl: this.rpcUrl
    };
  }

  async loadSdk(): Promise<unknown> {
    const optionalImport = new Function("specifier", "return import(specifier)") as (
      specifier: string
    ) => Promise<unknown>;
    this.sdkLoadAttempt ??= optionalImport("flash-sdk");
    return this.sdkLoadAttempt;
  }

  private async isSdkAvailable(): Promise<boolean> {
    try {
      await this.loadSdk();
      return true;
    } catch {
      return false;
    }
  }
}
