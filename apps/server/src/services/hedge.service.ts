import { BirdeyeService } from "../integrations/birdeye/birdeye.service.js";
import { FlashTradeVenue } from "../venues/flashTradeVenue.js";
import { MockVenue } from "../venues/mockVenue.js";
import type {
  ExecutionMode,
  PerpVenue,
  VenueName,
  VenueOrderResult,
  VenuePosition
} from "../venues/types.js";
import { calculateHedgeNotional } from "./risk.service.js";

export interface HedgePreviewInput {
  walletAddress?: string;
  capitalUsd: number;
  hedgePercent: number;
  stakingYield: number;
  fundingRate: number;
  leverage: number;
  venue: VenueName;
}

export interface HedgePreviewResponse {
  mode: ExecutionMode;
  symbol: "SOL";
  solPrice: number;
  hedgeNotionalUsd: number;
  estimatedSolShortSize: number;
  marginRequiredUsd: number;
  estimatedLiquidationPrice: number;
  liquidationDistance: number;
  health: "safe" | "warning" | "danger";
  estimatedNetAPY: number;
  estimatedAnnualStakingYieldUsd: number;
  estimatedAnnualFundingCostUsd: number;
  protectionBenefit: number;
  warnings: string[];
}

export interface OpenHedgeInput {
  walletAddress: string;
  capitalUsd: number;
  hedgePercent: number;
  leverage: number;
  venue: VenueName;
}

export class HedgeService {
  private readonly marketData = new BirdeyeService();
  private readonly mockVenue = new MockVenue(this.marketData);
  private readonly flashVenue = new FlashTradeVenue(this.marketData);

  async preview(input: HedgePreviewInput): Promise<HedgePreviewResponse> {
    const venue = this.getVenue(input.venue);
    const mode = this.resolveMode(input.venue);
    const hedgeNotionalUsd = calculateHedgeNotional(input.capitalUsd, input.hedgePercent);
    const preview = await venue.previewShort({
      walletAddress: input.walletAddress,
      symbol: "SOL",
      notionalUsd: hedgeNotionalUsd,
      leverage: input.leverage
    });

    const estimatedAnnualStakingYieldUsd = input.capitalUsd * input.stakingYield;
    const estimatedAnnualFundingCostUsd = hedgeNotionalUsd * input.fundingRate;
    const estimatedNetAPY = input.stakingYield - input.hedgePercent * input.fundingRate;

    return {
      mode,
      symbol: "SOL",
      solPrice: preview.currentPrice,
      hedgeNotionalUsd: preview.notionalUsd,
      estimatedSolShortSize: preview.estimatedSolShortSize,
      marginRequiredUsd: preview.marginUsd,
      estimatedLiquidationPrice: preview.estimatedLiquidationPrice,
      liquidationDistance: preview.liquidationDistance,
      health: preview.health,
      estimatedNetAPY: roundRate(estimatedNetAPY),
      estimatedAnnualStakingYieldUsd: roundCurrency(estimatedAnnualStakingYieldUsd),
      estimatedAnnualFundingCostUsd: roundCurrency(estimatedAnnualFundingCostUsd),
      protectionBenefit: roundCurrency(hedgeNotionalUsd),
      warnings: buildWarnings(mode, input.venue, preview.health)
    };
  }

  async open(input: OpenHedgeInput): Promise<VenueOrderResult> {
    const mode = this.resolveMode(input.venue);
    const hedgeNotionalUsd = calculateHedgeNotional(input.capitalUsd, input.hedgePercent);

    if (input.venue === "flash" && mode === "paper") {
      const defaultMode = process.env.DEFAULT_EXECUTION_MODE ?? "paper";

      if (defaultMode !== "paper") {
        throw new Error("Flash live execution is disabled or not implemented yet");
      }

      return this.mockVenue.openShort({
        walletAddress: input.walletAddress,
        symbol: "SOL",
        notionalUsd: hedgeNotionalUsd,
        leverage: input.leverage,
        mode: "paper"
      });
    }

    return this.getVenue(input.venue).openShort({
      walletAddress: input.walletAddress,
      symbol: "SOL",
      notionalUsd: hedgeNotionalUsd,
      leverage: input.leverage,
      mode
    });
  }

  async getPosition(positionId: string): Promise<VenuePosition> {
    if (positionId.startsWith("paper-")) {
      return this.mockVenue.getPosition(positionId);
    }

    return this.flashVenue.getPosition(positionId);
  }

  async closePosition(positionId: string, walletAddress?: string): Promise<VenueOrderResult> {
    if (positionId.startsWith("paper-")) {
      return this.mockVenue.closePosition({ positionId, walletAddress });
    }

    return this.flashVenue.closePosition({ positionId, walletAddress });
  }

  private getVenue(venueName: VenueName): PerpVenue {
    return venueName === "flash" ? this.flashVenue : this.mockVenue;
  }

  private resolveMode(venueName: VenueName): ExecutionMode {
    if (venueName === "flash" && process.env.FLASH_ENABLE_LIVE_EXECUTION === "true") {
      return "live";
    }

    return "paper";
  }
}

function buildWarnings(
  mode: ExecutionMode,
  venue: VenueName,
  health: "safe" | "warning" | "danger"
): string[] {
  const warnings = [
    "This is a hedge preview, not guaranteed protection.",
    "Funding can flip and increase hedge carry cost.",
    "Liquidation can occur if SOL rises sharply against the short.",
    "LST basis risk may appear when spot exposure uses an LST."
  ];

  if (mode === "paper") {
    warnings.unshift("Paper mode uses live market data but does not execute real trades.");
  }

  if (venue === "flash" && process.env.FLASH_ENABLE_LIVE_EXECUTION !== "true") {
    warnings.unshift("Live Flash execution is disabled for this MVP.");
  }

  if (health !== "safe") {
    warnings.push("Liquidation distance is tight for the selected leverage.");
  }

  return warnings;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundRate(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
