export type SimulationMode = "simulated" | "historical";

export type SimulationDays = 30 | 90 | 365;

export interface SimulationFormState {
  capital: string;
  hedgePercent: number;
  stakingYield: string;
  fundingRate: string;
  days: SimulationDays;
  mode: SimulationMode;
}

export interface SimulationRequest {
  capital: number;
  hedgePercent: number;
  stakingYield: number;
  fundingRate: number;
  days: SimulationDays;
  mode: SimulationMode;
  seed?: string;
}

export interface SimulationMetrics {
  finalUnhedged: number;
  finalHedged: number;
  netReturnUnhedged: number;
  netReturnHedged: number;
  maxDrawdownUnhedged: number;
  maxDrawdownHedged: number;
  annualizedApyUnhedged: number;
  annualizedApyHedged: number;
  protectionBenefit: number;
}

export interface SimulationResponse {
  unhedged: number[];
  hedged: number[];
  metrics: SimulationMetrics;
  source?: "simulated" | "birdeye" | "coingecko";
}

export type FormErrors = Partial<Record<keyof SimulationFormState, string>>;

export interface SolLivePrice {
  symbol: "SOL";
  priceUsd: number;
  source: "birdeye" | "coingecko";
  timestamp: string;
}

export type HedgeHealth = "safe" | "warning" | "danger";
export type HedgeVenue = "mock" | "flash";

export interface HedgePreviewRequest {
  walletAddress?: string;
  capitalUsd: number;
  hedgePercent: number;
  stakingYield: number;
  fundingRate: number;
  leverage: 1 | 2 | 3;
  venue: HedgeVenue;
}

export interface HedgePreviewResponse {
  mode: "paper" | "live";
  symbol: "SOL";
  solPrice: number;
  hedgeNotionalUsd: number;
  estimatedSolShortSize: number;
  marginRequiredUsd: number;
  estimatedLiquidationPrice: number;
  liquidationDistance: number;
  health: HedgeHealth;
  estimatedNetAPY: number;
  estimatedAnnualStakingYieldUsd: number;
  estimatedAnnualFundingCostUsd: number;
  protectionBenefit: number;
  warnings: string[];
}

export interface OpenHedgeRequest {
  walletAddress: string;
  capitalUsd: number;
  hedgePercent: number;
  leverage: 1 | 2 | 3;
  venue: HedgeVenue;
}

export interface VenuePosition {
  id: string;
  walletAddress?: string;
  symbol: "SOL";
  side: "short";
  notionalUsd: number;
  entryPrice: number;
  currentPrice: number;
  leverage: number;
  marginUsd: number;
  estimatedLiquidationPrice: number;
  liquidationDistance: number;
  unrealizedPnl: number;
  health: HedgeHealth;
  mode: "paper" | "live";
  venue: string;
  status: "open" | "closed";
  openedAt: string;
  closedAt?: string;
}

export interface OpenHedgeResponse {
  positionId: string;
  mode: "paper" | "live";
  venue: string;
  status: "opened" | "closed";
  position: VenuePosition;
}

export interface WalletBalanceResponse {
  walletAddress: string;
  solBalance: number;
}
