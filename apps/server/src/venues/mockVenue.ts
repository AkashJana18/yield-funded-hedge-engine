import { randomUUID } from "node:crypto";
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
import {
  calculateHealth,
  calculateLiquidationDistance,
  calculateMarginRequired,
  calculateShortPnl,
  estimateShortLiquidationPrice
} from "../services/riskEngine.js";

export class MockVenue implements PerpVenue {
  readonly name: VenueName = "mock";
  private readonly positions = new Map<string, VenuePosition>();

  constructor(private readonly marketData = new BirdeyeService()) {}

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

  async openShort(params: OpenShortParams): Promise<VenueOrderResult> {
    const preview = await this.previewShort(params);
    const position: VenuePosition = {
      id: `paper-${randomUUID()}`,
      walletAddress: params.walletAddress,
      symbol: preview.symbol,
      side: preview.side,
      notionalUsd: preview.notionalUsd,
      entryPrice: preview.entryPrice,
      currentPrice: preview.currentPrice,
      leverage: preview.leverage,
      marginUsd: preview.marginUsd,
      estimatedLiquidationPrice: preview.estimatedLiquidationPrice,
      liquidationDistance: preview.liquidationDistance,
      unrealizedPnl: 0,
      health: preview.health,
      mode: "paper",
      venue: this.name,
      status: "open",
      openedAt: new Date().toISOString()
    };

    this.positions.set(position.id, position);

    return {
      positionId: position.id,
      mode: "paper",
      venue: this.name,
      status: "opened",
      position
    };
  }

  async closePosition(params: ClosePositionParams): Promise<VenueOrderResult> {
    const position = await this.getPosition(params.positionId);
    const currentPrice = await this.getMarketPrice(position.symbol);
    const updated = refreshPosition(position, currentPrice, "closed");

    this.positions.set(updated.id, updated);

    return {
      positionId: updated.id,
      mode: updated.mode,
      venue: this.name,
      status: "closed",
      position: updated
    };
  }

  async getPosition(positionId: string): Promise<VenuePosition> {
    const position = this.positions.get(positionId);

    if (!position) {
      throw new Error(`Position ${positionId} was not found.`);
    }

    const currentPrice = await this.getMarketPrice(position.symbol);
    const updated = refreshPosition(position, currentPrice, position.status);
    this.positions.set(updated.id, updated);

    return updated;
  }
}

function refreshPosition(
  position: VenuePosition,
  currentPrice: number,
  status: VenuePosition["status"]
): VenuePosition {
  const liquidationDistance = calculateLiquidationDistance(currentPrice, position.estimatedLiquidationPrice);

  return {
    ...position,
    currentPrice: roundCurrency(currentPrice),
    liquidationDistance: roundRate(liquidationDistance),
    unrealizedPnl: roundCurrency(calculateShortPnl(position.notionalUsd, position.entryPrice, currentPrice)),
    health: calculateHealth(liquidationDistance),
    status,
    closedAt: status === "closed" ? new Date().toISOString() : position.closedAt
  };
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
