import { randomUUID } from "node:crypto";
import { BirdeyeService } from "../integrations/birdeye/birdeye.service.js";
import {
  PhoenixPerpsService,
  type PhoenixOrderbookLevel,
  type PhoenixPerpMarketData,
  type PhoenixPerpSnapshot
} from "../integrations/phoenix/phoenixPerps.service.js";
import { FlashTradeVenue } from "../venues/flashTradeVenue.js";
import { MockVenue } from "../venues/mockVenue.js";
import type { ExecutionMode, PerpVenue, VenueName, VenueOrderResult, VenuePosition } from "../venues/types.js";
import { CoinGeckoService } from "./coingecko.js";
import { LiveMarketService } from "./liveMarket.service.js";
import {
  calculateHealth,
  calculateHedgeNotional,
  calculateLiquidationDistance,
  calculateMarginRequired,
  estimateShortLiquidationPrice,
  evaluateRisk,
  type RiskWarning
} from "./riskEngine.js";

export type HedgeRouteId = "flash_perp_short" | "phoenix_perp_short";
export type PaperHedgeRouteId = HedgeRouteId | "best";

export interface HedgePreviewInput {
  walletAddress?: string;
  capitalUsd: number;
  hedgePercent: number;
  stakingYield: number;
  fundingRate: number;
  leverage: number;
  venue: VenueName;
  availableUsdc?: number;
}

export interface SolExposureHedgePreviewInput {
  walletAddress?: string;
  solAmount: number;
  hedgeRatio: number;
  stakingYield?: number;
  fundingRate?: number;
  leverage?: 1 | 2 | 3;
  venue?: VenueName;
  availableUsdc?: number;
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
  riskWarnings: RiskWarning[];
  highRisk: boolean;
  recommendedRouteId?: HedgeRouteId | null;
  routeComparison?: HedgeRoutesResponse;
}

export interface OpenHedgeInput {
  walletAddress: string;
  capitalUsd: number;
  hedgePercent: number;
  leverage: number;
  venue: VenueName;
}

export interface BuildFlashHedgeTransactionInput {
  walletAddress: string;
  marginUsd: number;
  shortNotionalUsd: number;
  solPriceUsd: number;
  slippageBps: number;
  leverage: 1 | 2 | 3;
}

export interface BuildFlashHedgeTransactionResponse {
  serializedTransaction: string;
  lastValidBlockHeight: number;
  position: VenuePosition;
}

export interface HedgeRoutesInput {
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
    bids: PhoenixOrderbookLevel[];
    asks: PhoenixOrderbookLevel[];
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

export interface PaperExecuteHedgeInput extends HedgeRoutesInput {
  routeId: PaperHedgeRouteId;
}

export interface PaperExecuteHedgeResponse {
  executionMode: "paper";
  selectedRoute: HedgeRouteQuote;
  position: VenuePosition;
  alternatives: HedgeRouteQuote[];
}

export class HedgeService {
  private readonly mockVenue: MockVenue;
  private readonly flashVenue: FlashTradeVenue;
  private readonly paperPositions = new Map<string, VenuePosition>();

  constructor(
    private readonly marketData = new BirdeyeService(),
    private readonly historicalData = new CoinGeckoService(),
    private readonly liveMarket = new LiveMarketService(marketData, historicalData),
    private readonly phoenixPerps = new PhoenixPerpsService()
  ) {
    this.mockVenue = new MockVenue(this.marketData);
    this.flashVenue = new FlashTradeVenue(this.marketData);
  }

  async preview(input: HedgePreviewInput): Promise<HedgePreviewResponse> {
    const solPrice = await this.liveMarket.getSolLivePrice();
    const solAmount = input.capitalUsd / solPrice.priceUsd;
    const routeComparison = await this.getRoutes({
      walletAddress: input.walletAddress,
      solAmount,
      hedgeRatio: input.hedgePercent,
      slippageBps: 50,
      leverage: normalizeLeverage(input.leverage),
      fundingRate: input.fundingRate,
      availableUsdc: input.availableUsdc
    });
    const route = routeComparison.routes.find((item) => item.id === routeComparison.recommendedRouteId)
      ?? routeComparison.routes[0];

    return routeToPreview(input, route, routeComparison);
  }

  async previewSolExposure(input: SolExposureHedgePreviewInput): Promise<HedgePreviewResponse> {
    const routeComparison = await this.getRoutes({
      walletAddress: input.walletAddress,
      solAmount: input.solAmount,
      hedgeRatio: input.hedgeRatio,
      slippageBps: 50,
      leverage: input.leverage ?? 2,
      fundingRate: input.fundingRate ?? parseRateEnv("DEFAULT_FUNDING_RATE", 0.04),
      availableUsdc: input.availableUsdc
    });
    const route = routeComparison.routes.find((item) => item.id === routeComparison.recommendedRouteId)
      ?? routeComparison.routes[0];
    const capitalUsd = input.solAmount * routeComparison.livePrice.priceUsd;

    return routeToPreview(
      {
        walletAddress: input.walletAddress,
        capitalUsd,
        hedgePercent: input.hedgeRatio,
        stakingYield: input.stakingYield ?? parseRateEnv("MARINADE_STAKING_APY", 0.07),
        fundingRate: input.fundingRate ?? parseRateEnv("DEFAULT_FUNDING_RATE", 0.04),
        leverage: input.leverage ?? 2,
        venue: input.venue ?? "flash",
        availableUsdc: input.availableUsdc
      },
      route,
      routeComparison
    );
  }

  async getRoutes(input: HedgeRoutesInput): Promise<HedgeRoutesResponse> {
    const leverage = input.leverage ?? 2;
    const livePrice = await this.liveMarket.getSolLivePrice();
    const phoenixData = await this.phoenixPerps.getSolPerpMarketData();
    const hedgeNotionalUsd = calculateHedgeNotional(input.solAmount * livePrice.priceUsd, input.hedgeRatio);
    const routes = [
      buildFlashRoute({
        input,
        leverage,
        livePrice: livePrice.priceUsd,
        hedgeNotionalUsd
      }),
      buildPhoenixRoute({
        input,
        leverage,
        livePrice: livePrice.priceUsd,
        hedgeNotionalUsd,
        phoenixData
      })
    ];
    const recommended = routes
      .filter((route) => route.eligible && route.score !== null)
      .sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity))[0];

    return {
      recommendedRouteId: recommended?.id ?? null,
      livePrice: {
        symbol: "SOL",
        priceUsd: livePrice.priceUsd,
        source: livePrice.source,
        timestamp: livePrice.timestamp
      },
      routes,
      sourceBreakdown: {
        historical: "coingecko",
        liveMarket: livePrice.source,
        flash: "flash-sdk-estimate",
        phoenix: phoenixData.status
      }
    };
  }

  async paperExecute(input: PaperExecuteHedgeInput): Promise<PaperExecuteHedgeResponse> {
    const routes = await this.getRoutes(input);
    const selectedRoute =
      routes.routes.find((route) => route.id === (input.routeId === "best" ? routes.recommendedRouteId : input.routeId))
      ?? null;

    if (!selectedRoute) {
      throw new Error("No eligible protection route is available.");
    }

    if (!selectedRoute.eligible || selectedRoute.availability.status !== "available") {
      throw new Error(selectedRoute.eligibilityReason ?? selectedRoute.availability.reason ?? "Selected route is unavailable.");
    }

    const liquidationDistance = selectedRoute.liquidationDistance ?? 0;
    const position: VenuePosition = {
      id: `paper-${selectedRoute.id}-${randomUUID()}`,
      walletAddress: input.walletAddress,
      symbol: "SOL",
      side: "short",
      notionalUsd: selectedRoute.hedgeNotionalUsd,
      entryPrice: selectedRoute.estimatedFillPrice ?? selectedRoute.referencePrice,
      currentPrice: selectedRoute.referencePrice,
      leverage: input.leverage ?? 2,
      marginUsd: selectedRoute.marginRequiredUsd ?? 0,
      estimatedLiquidationPrice: selectedRoute.estimatedLiquidationPrice ?? 0,
      liquidationDistance,
      unrealizedPnl: 0,
      health: calculateHealth(liquidationDistance),
      mode: "paper",
      venue: selectedRoute.venue,
      status: "open",
      openedAt: new Date().toISOString()
    };

    this.paperPositions.set(position.id, position);

    return {
      executionMode: "paper",
      selectedRoute,
      position,
      alternatives: routes.routes.filter((route) => route.id !== selectedRoute.id)
    };
  }

  async open(input: OpenHedgeInput): Promise<VenueOrderResult> {
    return this.mockVenue.openShort({
      walletAddress: input.walletAddress,
      symbol: "SOL",
      notionalUsd: calculateHedgeNotional(input.capitalUsd, input.hedgePercent),
      leverage: input.leverage,
      mode: "paper"
    });
  }

  async getPosition(positionId: string): Promise<VenuePosition> {
    const paperPosition = this.paperPositions.get(positionId);

    if (paperPosition) {
      return refreshPaperPosition(paperPosition, await this.liveMarket.getSolLivePrice().then((price) => price.priceUsd));
    }

    if (positionId.startsWith("paper-")) {
      return this.mockVenue.getPosition(positionId);
    }

    return this.flashVenue.getPosition(positionId);
  }

  async closePosition(positionId: string, walletAddress?: string): Promise<VenueOrderResult> {
    const paperPosition = this.paperPositions.get(positionId);

    if (paperPosition) {
      const currentPrice = await this.liveMarket.getSolLivePrice().then((price) => price.priceUsd);
      const closed = refreshPaperPosition({ ...paperPosition, walletAddress: walletAddress ?? paperPosition.walletAddress }, currentPrice, "closed");
      this.paperPositions.set(positionId, closed);

      return {
        positionId,
        mode: "paper",
        venue: closed.venue,
        status: "closed",
        position: closed
      };
    }

    if (positionId.startsWith("paper-")) {
      return this.mockVenue.closePosition({ positionId, walletAddress });
    }

    return this.flashVenue.closePosition({ positionId, walletAddress });
  }

  async buildFlashOpenTransaction(
    _input: BuildFlashHedgeTransactionInput
  ): Promise<BuildFlashHedgeTransactionResponse> {
    throw new Error("Protection route is temporarily unavailable.");
  }

  private getVenue(venueName: VenueName): PerpVenue {
    return venueName === "flash" ? this.flashVenue : this.mockVenue;
  }

  private resolveMode(_venueName: VenueName): ExecutionMode {
    return "paper";
  }
}

function buildFlashRoute({
  input,
  leverage,
  livePrice,
  hedgeNotionalUsd
}: {
  input: HedgeRoutesInput;
  leverage: number;
  livePrice: number;
  hedgeNotionalUsd: number;
}): HedgeRouteQuote {
  const fundingRate = input.fundingRate ?? parseRateEnv("DEFAULT_FUNDING_RATE", 0.04);
  const estimatedFillPrice = livePrice * (1 - input.slippageBps / 10_000);
  const marginRequiredUsd = calculateMarginRequired(hedgeNotionalUsd, leverage);
  const estimatedLiquidationPrice = estimateShortLiquidationPrice(estimatedFillPrice, leverage);
  const liquidationDistance = calculateLiquidationDistance(livePrice, estimatedLiquidationPrice);
  const risk = evaluateRisk({
    hedgeRatio: input.hedgeRatio,
    stakingYield: parseRateEnv("MARINADE_STAKING_APY", 0.07),
    fundingRate,
    liquidationDistance,
    marginRequiredUsd,
    availableUsdc: input.availableUsdc,
    mode: "paper",
    flashLiveEnabled: false
  });
  const takerFeeBps = 5;
  const estimatedCostBps = input.slippageBps + takerFeeBps + Math.max(fundingRate * 100, 0);
  const eligibilityReason = input.availableUsdc !== undefined && input.availableUsdc < marginRequiredUsd
    ? "Wallet USDC is below estimated Flash margin."
    : undefined;

  return {
    id: "flash_perp_short",
    venue: "flash",
    label: "Flash Perps",
    instrument: "perp",
    side: "short",
    availability: { status: "available" },
    eligible: !eligibilityReason,
    eligibilityReason,
    score: !eligibilityReason ? scoreRoute(estimatedCostBps, liquidationDistance, fundingRate) : null,
    mode: "paper",
    symbol: "SOL",
    marketSymbol: "SOL-PERP",
    hedgeNotionalUsd: roundCurrency(hedgeNotionalUsd),
    estimatedSolShortSize: roundAmount(hedgeNotionalUsd / estimatedFillPrice),
    estimatedFillPrice: roundCurrency(estimatedFillPrice),
    referencePrice: roundCurrency(livePrice),
    marginRequiredUsd: roundCurrency(marginRequiredUsd),
    estimatedLiquidationPrice: roundCurrency(estimatedLiquidationPrice),
    liquidationDistance: roundRate(liquidationDistance),
    fundingRate: roundRate(fundingRate),
    estimatedAnnualFundingCostUsd: roundCurrency(hedgeNotionalUsd * fundingRate),
    spreadBps: null,
    priceImpactBps: input.slippageBps,
    estimatedCostBps: roundRate(estimatedCostBps),
    takerFeeBps,
    warnings: risk.warnings.map((warning) => warning.message),
    riskWarnings: risk.warnings,
  };
}

function buildPhoenixRoute({
  input,
  leverage,
  livePrice,
  hedgeNotionalUsd,
  phoenixData
}: {
  input: HedgeRoutesInput;
  leverage: number;
  livePrice: number;
  hedgeNotionalUsd: number;
  phoenixData: PhoenixPerpMarketData;
}): HedgeRouteQuote {
  if (phoenixData.status === "unavailable") {
    return unavailablePhoenixRoute(input, livePrice, hedgeNotionalUsd, phoenixData.reason);
  }

  const fill = estimateShortFill(phoenixData, hedgeNotionalUsd);

  if (!fill) {
    return unavailablePhoenixRoute(input, livePrice, hedgeNotionalUsd, "Phoenix SOL-PERP orderbook has insufficient bid depth for this hedge size.", phoenixData);
  }

  const fundingRate = phoenixData.fundingRateAnnualized ?? input.fundingRate ?? 0;
  const maxLeverage = Math.min(leverage, phoenixData.maxLeverage);
  const marginRequiredUsd = calculateMarginRequired(hedgeNotionalUsd, maxLeverage);
  const estimatedLiquidationPrice = estimateShortLiquidationPrice(fill.vwap, maxLeverage);
  const liquidationDistance = calculateLiquidationDistance(livePrice, estimatedLiquidationPrice);
  const priceImpactBps = Math.max(((livePrice - fill.vwap) / livePrice) * 10_000, 0);
  const estimatedCostBps = priceImpactBps + phoenixData.spreadBps + phoenixData.takerFeeBps + Math.max(fundingRate * 100, 0);
  const risk = evaluateRisk({
    hedgeRatio: input.hedgeRatio,
    stakingYield: parseRateEnv("MARINADE_STAKING_APY", 0.07),
    fundingRate,
    liquidationDistance,
    marginRequiredUsd,
    availableUsdc: input.availableUsdc,
    mode: "paper",
    flashLiveEnabled: false
  });
  const eligibilityReason = input.availableUsdc !== undefined && input.availableUsdc < marginRequiredUsd
    ? "Wallet USDC is below estimated Phoenix margin."
    : undefined;

  return {
    id: "phoenix_perp_short",
    venue: "phoenix",
    label: "Phoenix Perps",
    instrument: "perp",
    side: "short",
    availability: { status: "available" },
    eligible: !eligibilityReason,
    eligibilityReason,
    score: !eligibilityReason ? scoreRoute(estimatedCostBps, liquidationDistance, fundingRate) : null,
    mode: "paper",
    symbol: "SOL",
    marketSymbol: "SOL-PERP",
    hedgeNotionalUsd: roundCurrency(hedgeNotionalUsd),
    estimatedSolShortSize: roundAmount(fill.baseSize),
    estimatedFillPrice: roundCurrency(fill.vwap),
    referencePrice: roundCurrency(livePrice),
    marginRequiredUsd: roundCurrency(marginRequiredUsd),
    estimatedLiquidationPrice: roundCurrency(estimatedLiquidationPrice),
    liquidationDistance: roundRate(liquidationDistance),
    fundingRate: roundRate(fundingRate),
    estimatedAnnualFundingCostUsd: roundCurrency(hedgeNotionalUsd * fundingRate),
    spreadBps: phoenixData.spreadBps,
    priceImpactBps: roundRate(priceImpactBps),
    estimatedCostBps: roundRate(estimatedCostBps),
    takerFeeBps: phoenixData.takerFeeBps,
    warnings: risk.warnings.map((warning) => warning.message),
    riskWarnings: risk.warnings,
    orderbook: phoenixData.orderbook
  };
}

function unavailablePhoenixRoute(
  input: HedgeRoutesInput,
  livePrice: number,
  hedgeNotionalUsd: number,
  reason: string,
  phoenixData?: PhoenixPerpSnapshot
): HedgeRouteQuote {
  return {
    id: "phoenix_perp_short",
    venue: "phoenix",
    label: "Phoenix Perps",
    instrument: "perp",
    side: "short",
    availability: { status: "unavailable", reason },
    eligible: false,
    eligibilityReason: reason,
    score: null,
    mode: "paper",
    symbol: "SOL",
    marketSymbol: "SOL-PERP",
    hedgeNotionalUsd: roundCurrency(hedgeNotionalUsd),
    estimatedSolShortSize: roundAmount(hedgeNotionalUsd / livePrice),
    estimatedFillPrice: null,
    referencePrice: roundCurrency(livePrice),
    marginRequiredUsd: null,
    estimatedLiquidationPrice: null,
    liquidationDistance: null,
    fundingRate: input.fundingRate ?? null,
    estimatedAnnualFundingCostUsd: null,
    spreadBps: phoenixData?.spreadBps ?? null,
    priceImpactBps: null,
    estimatedCostBps: null,
    takerFeeBps: phoenixData?.takerFeeBps ?? null,
    warnings: [reason],
    riskWarnings: [
      {
        code: "GENERAL_RISK",
        severity: "warning",
        message: reason
      }
    ],
    orderbook: phoenixData?.orderbook
  };
}

function estimateShortFill(
  phoenixData: PhoenixPerpSnapshot,
  hedgeNotionalUsd: number
): { vwap: number; baseSize: number } | null {
  let remainingBase = hedgeNotionalUsd / phoenixData.bestBid;
  let quoteFilled = 0;
  let baseFilled = 0;

  for (const level of phoenixData.orderbook.bids) {
    if (remainingBase <= 0) {
      break;
    }

    const baseAtLevel = Math.min(level.size, remainingBase);
    quoteFilled += baseAtLevel * level.price;
    baseFilled += baseAtLevel;
    remainingBase -= baseAtLevel;
  }

  if (remainingBase > 0.000001 || baseFilled <= 0) {
    return null;
  }

  return {
    vwap: quoteFilled / baseFilled,
    baseSize: baseFilled
  };
}

function routeToPreview(
  input: HedgePreviewInput,
  route: HedgeRouteQuote,
  routeComparison: HedgeRoutesResponse
): HedgePreviewResponse {
  const fundingRate = route.fundingRate ?? input.fundingRate;
  const estimatedAnnualStakingYieldUsd = input.capitalUsd * input.stakingYield;
  const estimatedAnnualFundingCostUsd = route.estimatedAnnualFundingCostUsd ?? route.hedgeNotionalUsd * fundingRate;
  const estimatedNetAPY = input.stakingYield - input.hedgePercent * fundingRate;

  return {
    mode: "paper",
    symbol: "SOL",
    solPrice: route.referencePrice,
    hedgeNotionalUsd: route.hedgeNotionalUsd,
    estimatedSolShortSize: route.estimatedSolShortSize,
    marginRequiredUsd: route.marginRequiredUsd ?? 0,
    estimatedLiquidationPrice: route.estimatedLiquidationPrice ?? 0,
    liquidationDistance: route.liquidationDistance ?? 0,
    health: calculateHealth(route.liquidationDistance ?? 0),
    estimatedNetAPY: roundRate(estimatedNetAPY),
    estimatedAnnualStakingYieldUsd: roundCurrency(estimatedAnnualStakingYieldUsd),
    estimatedAnnualFundingCostUsd: roundCurrency(estimatedAnnualFundingCostUsd),
    protectionBenefit: roundCurrency(route.hedgeNotionalUsd),
    warnings: route.warnings,
    riskWarnings: route.riskWarnings,
    highRisk: route.riskWarnings.some((warning) => warning.severity === "danger"),
    recommendedRouteId: routeComparison.recommendedRouteId,
    routeComparison
  };
}

function refreshPaperPosition(
  position: VenuePosition,
  solPrice: number,
  status: VenuePosition["status"] = position.status
): VenuePosition {
  const liquidationDistance = calculateLiquidationDistance(solPrice, position.estimatedLiquidationPrice);
  const unrealizedPnl = -position.notionalUsd * ((solPrice - position.entryPrice) / position.entryPrice);

  return {
    ...position,
    currentPrice: roundCurrency(solPrice),
    liquidationDistance: roundRate(liquidationDistance),
    unrealizedPnl: roundCurrency(unrealizedPnl),
    health: calculateHealth(liquidationDistance),
    status,
    closedAt: status === "closed" ? new Date().toISOString() : position.closedAt
  };
}

function scoreRoute(estimatedCostBps: number, liquidationDistance: number, fundingRate: number): number {
  const liquidationPenalty = liquidationDistance < 0.15 ? 600 : liquidationDistance < 0.3 ? 200 : 0;
  const fundingPenalty = Math.max(fundingRate * 1_000, 0);
  return roundRate(10_000 - estimatedCostBps - liquidationPenalty - fundingPenalty);
}

function normalizeLeverage(value: number): 1 | 2 | 3 {
  return value === 1 || value === 2 || value === 3 ? value : 2;
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

function parseRateEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}
