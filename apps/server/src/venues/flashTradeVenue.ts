import { FlashClient } from "../integrations/flash/flash.client.js";
import {
  calculateHealth,
  calculateLiquidationDistance,
  calculateMarginRequired,
  estimateShortLiquidationPrice
} from "../services/risk.service.js";
import type {
  ClosePositionParams,
  OpenShortParams,
  PerpVenue,
  PreviewShortParams,
  PreviewShortResult,
  VenueName,
  VenueOrderResult,
  VenuePosition
} from "./types.js";
import { BirdeyeService } from "../integrations/birdeye/birdeye.service.js";

export class FlashTradeVenue implements PerpVenue {
  readonly name: VenueName = "flash";

  constructor(
    private readonly marketData = new BirdeyeService(),
    private readonly flashClient = new FlashClient(),
    private readonly liveExecutionEnabled = process.env.FLASH_ENABLE_LIVE_EXECUTION === "true"
  ) {}

  async getMarketPrice(symbol: string): Promise<number> {
    assertSolSymbol(symbol);
    const price = await this.marketData.getSolLivePrice();
    return price.priceUsd;
  }

  async getFundingRate(symbol: string): Promise<number> {
    assertSolSymbol(symbol);
    return 0.04;
  }

  async previewShort(params: PreviewShortParams): Promise<PreviewShortResult> {
    const currentPrice = params.entryPrice ?? (await this.getMarketPrice(params.symbol));
    const marginUsd = calculateMarginRequired(params.notionalUsd, params.leverage);
    const estimatedLiquidationPrice = estimateShortLiquidationPrice(currentPrice, params.leverage);
    const liquidationDistance = calculateLiquidationDistance(currentPrice, estimatedLiquidationPrice);

    return {
      symbol: "SOL",
      side: "short",
      notionalUsd: roundCurrency(params.notionalUsd),
      entryPrice: roundCurrency(currentPrice),
      currentPrice: roundCurrency(currentPrice),
      leverage: params.leverage,
      marginUsd: roundCurrency(marginUsd),
      estimatedLiquidationPrice: roundCurrency(estimatedLiquidationPrice),
      liquidationDistance: roundRate(liquidationDistance),
      estimatedSolShortSize: roundAmount(params.notionalUsd / currentPrice),
      health: calculateHealth(liquidationDistance)
    };
  }

  async openShort(_params: OpenShortParams): Promise<VenueOrderResult> {
    await this.ensureLiveExecutionImplemented();
    throw new Error("Flash live execution is disabled or not implemented yet");
  }

  async closePosition(_params: ClosePositionParams): Promise<VenueOrderResult> {
    await this.ensureLiveExecutionImplemented();
    throw new Error("Flash live execution is disabled or not implemented yet");
  }

  async getPosition(_positionId: string): Promise<VenuePosition> {
    throw new Error("Flash position reads are not implemented yet");
  }

  private async ensureLiveExecutionImplemented(): Promise<void> {
    const status = await this.flashClient.getStatus();

    if (!this.liveExecutionEnabled || !status.liveExecutionEnabled) {
      throw new Error("Flash live execution is disabled or not implemented yet");
    }

    if (!status.sdkAvailable) {
      throw new Error("Flash SDK is not available in this runtime.");
    }

    throw new Error("Flash live execution is disabled or not implemented yet");
  }
}

function assertSolSymbol(symbol: string): asserts symbol is "SOL" {
  if (symbol !== "SOL") {
    throw new Error(`Unsupported market ${symbol}. Only SOL is supported in this MVP.`);
  }
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundAmount(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function roundRate(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
