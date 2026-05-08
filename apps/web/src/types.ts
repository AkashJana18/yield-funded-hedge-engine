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
  source?: "simulated" | "coingecko";
}

export type FormErrors = Partial<Record<keyof SimulationFormState, string>>;

export interface SolLivePrice {
  symbol: "SOL";
  mint?: string;
  priceUsd: number;
  source: "birdeye" | "coingecko";
  timestamp: string;
}

export type HedgeHealth = "safe" | "warning" | "danger";
export type HedgeVenue = "flash";
export type HedgeRouteId = "flash_perp_short" | "phoenix_perp_short";
export type PaperHedgeRouteId = HedgeRouteId | "best";
export type SupportedTokenSymbol = "SOL" | "USDC" | "mSOL" | "JitoSOL";
export type StartingAsset = "SOL" | "USDC";
export type StakeAsset = "mSOL" | "JitoSOL";

export interface TokenBalance {
  symbol: SupportedTokenSymbol;
  mint: string;
  balance: number;
  decimals: number;
  priceUsd: number | null;
  valueUsd: number | null;
}

export interface WalletBalanceResponse {
  walletAddress: string;
  solBalance: number;
  balances: TokenBalance[];
  marketDataSource: "birdeye" | "coingecko" | null;
  marketDataError?: string | null;
}

export interface TokenLivePrice {
  symbol: SupportedTokenSymbol;
  mint: string;
  priceUsd: number;
  source: "birdeye" | "coingecko";
  timestamp: string;
}

export interface TokenPricesResponse {
  source: "birdeye" | "coingecko";
  prices: TokenLivePrice[];
}

export interface SwapRouteLeg {
  label: string;
  percent: number;
  feeAmount: number;
  feeSymbol: SupportedTokenSymbol | string;
}

export interface SwapQuoteSummary {
  inputSymbol: SupportedTokenSymbol;
  outputSymbol: SupportedTokenSymbol;
  inputAmount: number;
  expectedOutputAmount: number;
  minimumOutputAmount: number;
  slippageBps: number;
  priceImpactPct: number;
  route: SwapRouteLeg[];
  rawQuote: unknown;
}

export interface SwapTransactionResponse {
  swapTransaction: string;
  lastValidBlockHeight?: number;
  prioritizationFeeLamports?: number;
  computeUnitLimit?: number;
  simulationError?: unknown;
}

export interface StakePreview {
  stakeAsset: StakeAsset;
  inputSol: number;
  expectedLst: number;
  solPriceUsd: number;
  lstPriceUsd: number;
  stakingApy: number;
  provider: "Marinade" | "Jito";
  source: "birdeye";
  risks: string[];
}

export interface StakeTransactionResponse {
  stakeAsset: StakeAsset;
  serializedTransaction: string;
  associatedTokenAccount: string;
  lastValidBlockHeight: number;
}

export interface RiskWarning {
  code:
    | "HIGH_HEDGE_RATIO"
    | "INSUFFICIENT_MARGIN"
    | "LIQUIDATION_TOO_CLOSE"
    | "FUNDING_OVER_YIELD"
    | "PAPER_MODE"
    | "FLASH_DISABLED"
    | "GENERAL_RISK";
  severity: "info" | "warning" | "danger";
  message: string;
}

export interface HedgePreviewRequest {
  walletAddress?: string;
  capitalUsd: number;
  hedgePercent: number;
  stakingYield: number;
  fundingRate: number;
  leverage: 1 | 2 | 3;
  venue: HedgeVenue;
  availableUsdc?: number;
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
  riskWarnings: RiskWarning[];
  highRisk: boolean;
  recommendedRouteId?: HedgeRouteId | null;
  routeComparison?: HedgeRoutesResponse;
}

export interface HedgeRoutesRequest {
  walletAddress?: string;
  solAmount: number;
  hedgeRatio: number;
  slippageBps: number;
  leverage?: 1 | 2 | 3;
  fundingRate?: number;
  availableUsdc?: number;
}

export interface HedgeRouteQuote {
  id: HedgeRouteId;
  venue: "flash" | "phoenix";
  label: "Flash Perps" | "Phoenix Perps";
  instrument: "perp";
  side: "short";
  availability: {
    status: "available" | "unavailable";
    reason?: string;
  };
  eligible: boolean;
  eligibilityReason?: string;
  score: number | null;
  mode: "paper";
  symbol: "SOL";
  marketSymbol: "SOL-PERP";
  hedgeNotionalUsd: number;
  estimatedSolShortSize: number;
  estimatedFillPrice: number | null;
  referencePrice: number;
  marginRequiredUsd: number | null;
  estimatedLiquidationPrice: number | null;
  liquidationDistance: number | null;
  fundingRate: number | null;
  estimatedAnnualFundingCostUsd: number | null;
  spreadBps: number | null;
  priceImpactBps: number | null;
  estimatedCostBps: number | null;
  takerFeeBps: number | null;
  warnings: string[];
  riskWarnings: RiskWarning[];
  orderbook?: {
    bids: Array<{ price: number; size: number }>;
    asks: Array<{ price: number; size: number }>;
  };
}

export interface HedgeRoutesResponse {
  recommendedRouteId: HedgeRouteId | null;
  livePrice: {
    symbol: "SOL";
    priceUsd: number;
    source: "birdeye" | "coingecko";
    timestamp: string;
  };
  routes: HedgeRouteQuote[];
  sourceBreakdown: {
    historical: "coingecko";
    liveMarket: "birdeye" | "coingecko";
    flash: "flash-sdk-estimate";
    phoenix: "available" | "unavailable";
  };
}

export interface PaperExecuteHedgeRequest extends HedgeRoutesRequest {
  routeId: PaperHedgeRouteId;
}

export interface PaperExecuteHedgeResponse {
  executionMode: "paper";
  selectedRoute: HedgeRouteQuote;
  position: VenuePosition;
  alternatives: HedgeRouteQuote[];
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

export interface FlashHedgeTransactionResponse {
  serializedTransaction: string;
  lastValidBlockHeight: number;
  position: VenuePosition;
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
