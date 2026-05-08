import { type WalletTokenBalance } from "../routes/wallet.routes.js";
import type { VenuePosition } from "../venues/types.js";

export interface PortfolioMetricsInput {
  balances: WalletTokenBalance[];
  shortPosition?: VenuePosition | null;
  stakingYieldRate: number;
  fundingRate: number;
}

export interface PortfolioMetrics {
  lstBalance: number;
  lstValueUsd: number;
  shortPositionSizeUsd: number;
  netExposureUsd: number;
  hedgeRatio: number;
  unrealizedPnl: number;
  estimatedStakingYieldUsd: number;
  estimatedFundingCostUsd: number;
  netApy: number;
  liquidationWarning: "none" | "watch" | "high";
}

export class PortfolioService {
  calculateMetrics(input: PortfolioMetricsInput): PortfolioMetrics {
    const msol = input.balances.find((balance) => balance.symbol === "mSOL");
    const jitoSol = input.balances.find((balance) => balance.symbol === "JitoSOL");
    const sol = input.balances.find((balance) => balance.symbol === "SOL");
    const lstValueUsd = (msol?.valueUsd ?? 0) + (jitoSol?.valueUsd ?? 0);
    const spotExposureUsd = lstValueUsd + (sol?.valueUsd ?? 0);
    const shortPositionSizeUsd = input.shortPosition?.notionalUsd ?? 0;
    const unrealizedPnl = input.shortPosition?.unrealizedPnl ?? 0;
    const estimatedStakingYieldUsd = lstValueUsd * input.stakingYieldRate;
    const estimatedFundingCostUsd = shortPositionSizeUsd * input.fundingRate;
    const netApy =
      spotExposureUsd > 0 ? (estimatedStakingYieldUsd - estimatedFundingCostUsd) / spotExposureUsd : 0;

    return {
      lstBalance: (msol?.balance ?? 0) + (jitoSol?.balance ?? 0),
      lstValueUsd,
      shortPositionSizeUsd,
      netExposureUsd: spotExposureUsd - shortPositionSizeUsd,
      hedgeRatio: spotExposureUsd > 0 ? shortPositionSizeUsd / spotExposureUsd : 0,
      unrealizedPnl,
      estimatedStakingYieldUsd,
      estimatedFundingCostUsd,
      netApy,
      liquidationWarning: classifyLiquidation(input.shortPosition?.liquidationDistance)
    };
  }
}

function classifyLiquidation(liquidationDistance: number | undefined): "none" | "watch" | "high" {
  if (liquidationDistance === undefined) {
    return "none";
  }

  if (liquidationDistance < 0.15) {
    return "high";
  }

  if (liquidationDistance < 0.3) {
    return "watch";
  }

  return "none";
}
