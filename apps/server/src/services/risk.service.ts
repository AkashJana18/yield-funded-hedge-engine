import type { PositionHealth } from "../venues/types.js";

export function calculateHedgeNotional(capitalUsd: number, hedgePercent: number): number {
  return capitalUsd * hedgePercent;
}

export function calculateMarginRequired(notionalUsd: number, leverage: number): number {
  return notionalUsd / leverage;
}

export function calculateShortPnl(notionalUsd: number, entryPrice: number, currentPrice: number): number {
  const priceChange = (currentPrice - entryPrice) / entryPrice;
  return -notionalUsd * priceChange;
}

export function estimateShortLiquidationPrice(
  entryPrice: number,
  leverage: number,
  bufferPercent = 0.05
): number {
  const liquidationMove = 1 / leverage - bufferPercent;
  return entryPrice * (1 + Math.max(liquidationMove, 0.02));
}

export function calculateLiquidationDistance(currentPrice: number, liquidationPrice: number): number {
  return Math.max((liquidationPrice - currentPrice) / currentPrice, 0);
}

export function calculateHealth(liquidationDistance: number): PositionHealth {
  if (liquidationDistance > 0.25) {
    return "safe";
  }

  if (liquidationDistance >= 0.1) {
    return "warning";
  }

  return "danger";
}
