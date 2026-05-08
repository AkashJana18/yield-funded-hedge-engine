import type { PositionHealth } from "../venues/types.js";

export type RiskSeverity = "info" | "warning" | "danger";

export interface RiskWarning {
  code:
    | "HIGH_HEDGE_RATIO"
    | "INSUFFICIENT_MARGIN"
    | "LIQUIDATION_TOO_CLOSE"
    | "FUNDING_OVER_YIELD"
    | "PAPER_MODE"
    | "FLASH_DISABLED"
    | "GENERAL_RISK";
  severity: RiskSeverity;
  message: string;
}

export interface RiskEvaluationInput {
  hedgeRatio: number;
  stakingYield: number;
  fundingRate: number;
  liquidationDistance: number;
  marginRequiredUsd: number;
  availableUsdc?: number;
  mode: "paper" | "live";
  flashLiveEnabled: boolean;
}

export interface RiskEvaluation {
  health: PositionHealth;
  highRisk: boolean;
  warnings: RiskWarning[];
}

export function calculateHedgeNotional(solExposureUsd: number, hedgeRatio: number): number {
  return solExposureUsd * hedgeRatio;
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

export function evaluateRisk(input: RiskEvaluationInput): RiskEvaluation {
  const warnings: RiskWarning[] = [
    {
      code: "GENERAL_RISK",
      severity: "info",
      message: "This builder creates a hedged position, not guaranteed protection."
    }
  ];

  if (input.mode === "paper") {
    warnings.push({
      code: "PAPER_MODE",
      severity: "warning",
      message: "Paper mode uses live market data but does not execute a real hedge."
    });
  }

  if (!input.flashLiveEnabled) {
    warnings.push({
      code: "FLASH_DISABLED",
      severity: "warning",
      message: "Flash live execution is disabled by environment configuration."
    });
  }

  if (input.hedgeRatio > 0.75) {
    warnings.push({
      code: "HIGH_HEDGE_RATIO",
      severity: "warning",
      message: "Hedge ratios above 75% leave less room for funding spikes and liquidation management."
    });
  }

  if (input.availableUsdc !== undefined && input.availableUsdc < input.marginRequiredUsd) {
    warnings.push({
      code: "INSUFFICIENT_MARGIN",
      severity: "danger",
      message: "Wallet USDC is below the estimated margin required for the short."
    });
  }

  if (input.liquidationDistance < 0.15) {
    warnings.push({
      code: "LIQUIDATION_TOO_CLOSE",
      severity: "danger",
      message: "Liquidation is too close to the current SOL price for this setup."
    });
  }

  if (input.fundingRate > input.stakingYield) {
    warnings.push({
      code: "FUNDING_OVER_YIELD",
      severity: "warning",
      message: "Estimated funding cost is higher than staking yield."
    });
  }

  const health = calculateHealth(input.liquidationDistance);
  const highRisk = health === "danger" || warnings.some((warning) => warning.severity === "danger");

  return { health, highRisk, warnings };
}
