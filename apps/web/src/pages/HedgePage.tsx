import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  calculatePortfolioMetrics,
  fetchHedgeRoutes,
  fetchSolLivePrice,
  fetchWalletBalance,
  paperExecuteHedge,
  simulatePortfolio
} from "../api";
import { DEFAULT_SLIPPAGE_BPS, FLASH_DEFAULT_LEVERAGE, HEDGE_RATIOS } from "../constants";
import type {
  HedgeRouteId,
  HedgeRouteQuote,
  HedgeRoutesResponse,
  PaperExecuteHedgeResponse,
  PortfolioMetrics,
  SimulationResponse,
  SolLivePrice,
  TokenBalance,
  VenuePosition,
  WalletBalanceResponse
} from "../types";
import {
  formatCurrencyPrecise,
  formatPercent,
  formatSignedCurrency,
  formatSignedPercent,
  formatTokenAmount
} from "../utils/format";

type RouteLoadState = "idle" | "loading" | "ready" | "error";

const POSITION_STORAGE_KEY = "floorfi:last-paper-position";

export function HedgePage() {
  const wallet = useWallet();
  const [amount, setAmount] = useState("10");
  const [hedgeRatio, setHedgeRatio] = useState<(typeof HEDGE_RATIOS)[number]>(0.5);
  const [slippageBps, setSlippageBps] = useState(DEFAULT_SLIPPAGE_BPS);
  const [leverage, setLeverage] = useState<1 | 2 | 3>(FLASH_DEFAULT_LEVERAGE);
  const [fundingRate, setFundingRate] = useState("4");
  const [livePrice, setLivePrice] = useState<SolLivePrice | null>(null);
  const [balances, setBalances] = useState<WalletBalanceResponse | null>(null);
  const [routes, setRoutes] = useState<HedgeRoutesResponse | null>(null);
  const [routeState, setRouteState] = useState<RouteLoadState>("idle");
  const [simulation, setSimulation] = useState<SimulationResponse | null>(null);
  const [portfolioMetrics, setPortfolioMetrics] = useState<PortfolioMetrics | null>(null);
  const [paperExecution, setPaperExecution] = useState<PaperExecuteHedgeResponse | null>(null);
  const [trackedPosition, setTrackedPosition] = useState<VenuePosition | null>(() => loadStoredPosition());
  const [executeLoading, setExecuteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const parsedAmount = parseAmount(amount);
  const walletAddress = wallet.publicKey?.toBase58();
  const usdcBalance = findBalance(balances?.balances, "USDC");
  const solBalance = findBalance(balances?.balances, "SOL");
  const msolBalance = findBalance(balances?.balances, "mSOL");
  const jitoBalance = findBalance(balances?.balances, "JitoSOL");
  const activePrice = routes?.livePrice.priceUsd ?? livePrice?.priceUsd ?? null;
  const availableUsdc = usdcBalance?.balance;
  const solExposureUsd = activePrice && Number.isFinite(parsedAmount) ? parsedAmount * activePrice : 0;
  const fundingRateValue = parseAmount(fundingRate) / 100;
  const recommendedRoute = routes?.routes.find((route) => route.id === routes.recommendedRouteId) ?? null;
  const flashRoute = routes?.routes.find((route) => route.id === "flash_perp_short") ?? null;
  const phoenixRoute = routes?.routes.find((route) => route.id === "phoenix_perp_short") ?? null;
  const displayedPosition = useMemo(() => {
    const position = trackedPosition ?? paperExecution?.position ?? null;
    return position && activePrice ? refreshPosition(position, activePrice) : position;
  }, [activePrice, paperExecution?.position, trackedPosition]);
  const highRisk = Boolean(recommendedRoute?.riskWarnings.some((warning) => warning.severity === "danger"));

  const refreshBalances = useCallback(async () => {
    if (!walletAddress) {
      setBalances(null);
      return;
    }

    const nextBalances = await fetchWalletBalance(walletAddress);
    setBalances(nextBalances);
  }, [walletAddress]);

  const refreshLivePrice = useCallback(async () => {
    const nextLivePrice = await fetchSolLivePrice();
    setLivePrice(nextLivePrice);
  }, []);

  useEffect(() => {
    void refreshLivePrice().catch((priceError) => {
      setError(priceError instanceof Error ? priceError.message : "Unable to load live SOL price.");
    });

    const interval = window.setInterval(() => {
      void refreshLivePrice().catch(() => undefined);
    }, 20_000);

    return () => window.clearInterval(interval);
  }, [refreshLivePrice]);

  useEffect(() => {
    void refreshBalances().catch((balanceError) => {
      setError(balanceError instanceof Error ? balanceError.message : "Unable to fetch wallet balances.");
    });
  }, [refreshBalances]);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    async function loadRoutes() {
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        setRoutes(null);
        setRouteState("idle");
        return;
      }

      setRouteState("loading");
      setError(null);
      const nextRoutes = await fetchHedgeRoutes(
        {
          walletAddress,
          solAmount: parsedAmount,
          hedgeRatio,
          slippageBps,
          leverage,
          fundingRate: Number.isFinite(fundingRateValue) ? fundingRateValue : 0.04,
          availableUsdc
        },
        controller.signal
      );

      setRoutes(nextRoutes);
      setLivePrice(nextRoutes.livePrice);
      setRouteState("ready");
    }

    void loadRoutes().catch((routeError) => {
      if (!(routeError instanceof DOMException && routeError.name === "AbortError")) {
        setRouteState("error");
        setError(routeError instanceof Error ? routeError.message : "Unable to compare Flash and Phoenix hedge routes.");
      }
    });

    return () => controller.abort();
  }, [
    amount,
    availableUsdc,
    fundingRateValue,
    hedgeRatio,
    leverage,
    parsedAmount,
    slippageBps,
    walletAddress
  ]);

  useEffect(() => {
    if (!activePrice || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setSimulation(null);
      return;
    }

    void simulatePortfolio({
      capital: parsedAmount * activePrice,
      hedgePercent: hedgeRatio * 100,
      stakingYield: 7,
      fundingRate: Number.isFinite(fundingRateValue) ? fundingRateValue * 100 : 4,
      days: 90,
      mode: "historical",
      seed: "floorfi-best-route"
    })
      .then(setSimulation)
      .catch(() => setSimulation(null));
  }, [activePrice, fundingRateValue, hedgeRatio, parsedAmount]);

  useEffect(() => {
    if (!balances) {
      setPortfolioMetrics(null);
      return;
    }

    void calculatePortfolioMetrics({
      balances: balances.balances,
      shortPosition: displayedPosition,
      stakingYieldRate: 0.07,
      fundingRate: Number.isFinite(fundingRateValue) ? fundingRateValue : 0.04
    })
      .then(setPortfolioMetrics)
      .catch(() => setPortfolioMetrics(null));
  }, [balances, displayedPosition, fundingRateValue]);

  async function handlePaperExecute(routeId: HedgeRouteId | "best" = "best") {
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a SOL exposure amount before paper execution.");
      return;
    }

    setExecuteLoading(true);
    setError(null);

    try {
      const result = await paperExecuteHedge({
        routeId,
        walletAddress,
        solAmount: parsedAmount,
        hedgeRatio,
        slippageBps,
        leverage,
        fundingRate: Number.isFinite(fundingRateValue) ? fundingRateValue : 0.04,
        availableUsdc
      });
      setPaperExecution(result);
      setTrackedPosition(result.position);
      storePosition(result.position);
    } catch (executeError) {
      setError(executeError instanceof Error ? executeError.message : "Unable to paper execute hedge.");
    } finally {
      setExecuteLoading(false);
    }
  }

  const simulatorExpected = simulation?.metrics;

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-6 text-neutral-950 antialiased sm:px-6 lg:px-8">
      <div className="mx-auto min-w-0 max-w-7xl">
        <nav className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <Link
              to="/"
              className="text-sm font-semibold text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2"
            >
              FloorFi
            </Link>
            <Badge>Paper Mode</Badge>
            <Badge>Flash + Phoenix Perps</Badge>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Link
              to="/app"
              className="inline-flex min-h-10 items-center rounded-md px-3 text-sm font-semibold text-neutral-700 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2"
            >
              Simulator
            </Link>
            <WalletMultiButton />
          </div>
        </nav>

        <header className="mt-8 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-neutral-950 px-2.5 py-1 text-xs font-semibold text-white">
                Best Hedge Routing
              </span>
              {recommendedRoute ? (
                <span className="rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                  Best route: {recommendedRoute.label}
                </span>
              ) : (
                <span className="rounded-md bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
                  Awaiting route
                </span>
              )}
            </div>
            <h1 className="mt-4 max-w-full break-words text-3xl font-semibold tracking-normal text-neutral-950 md:text-4xl">
              Compare Flash and Phoenix perps before opening a paper SOL hedge.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
              Historical data powered by CoinGecko. Live market data powered by Birdeye. Perp execution comparison
              powered by Flash + Phoenix.
            </p>
          </div>

          <section className="min-w-0 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Wallet balances</p>
                <p className="mt-1 text-sm text-neutral-600">
                  {walletAddress ? truncateAddress(walletAddress) : "Connect to label paper positions"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void refreshBalances()}
                disabled={!walletAddress}
                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-neutral-300 bg-white text-neutral-700 transition hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Refresh balances"
              >
                <RefreshCcw className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <BalanceTile balance={solBalance} fallback="SOL" />
              <BalanceTile balance={usdcBalance} fallback="USDC" />
              <BalanceTile balance={msolBalance} fallback="mSOL" />
              <BalanceTile balance={jitoBalance} fallback="JitoSOL" />
            </div>
            {balances?.marketDataError ? (
              <p className="mt-3 text-xs leading-5 text-amber-800">{balances.marketDataError}</p>
            ) : null}
          </section>
        </header>

        {error ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800" role="alert">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-none" aria-hidden="true" />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        ) : null}

        <section className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="min-w-0 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm lg:self-start">
            <h2 className="text-lg font-semibold text-neutral-950">Hedge inputs</h2>
            <div className="mt-5 space-y-5">
              <TextInput id="amount" label="SOL exposure" value={amount} suffix="SOL" onChange={setAmount} />
              <Segmented
                label={<TooltipLabel label="Hedge ratio" tip="Percentage of SOL exposure to offset with a short perp." />}
                options={HEDGE_RATIOS.map((ratio) => ({ label: `${Math.round(ratio * 100)}%`, value: ratio }))}
                value={hedgeRatio}
                onChange={setHedgeRatio}
              />
              <Segmented
                label="Leverage"
                options={[
                  { label: "1x", value: 1 as const },
                  { label: "2x", value: 2 as const },
                  { label: "3x", value: 3 as const }
                ]}
                value={leverage}
                onChange={setLeverage}
              />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <TextInput
                  id="slippage"
                  label="Slippage"
                  value={String(slippageBps / 100)}
                  suffix="%"
                  onChange={(next) => setSlippageBps(Math.max(1, Math.round(parseAmount(next) * 100)))}
                />
                <TextInput
                  id="fundingRate"
                  label={<TooltipLabel label="Flash funding" tip="Fallback annualized funding cost estimate when venue data is unavailable." />}
                  value={fundingRate}
                  suffix="%"
                  onChange={setFundingRate}
                />
              </div>
            </div>
          </aside>

          <div className="min-w-0 space-y-6">
            <section className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Metric
                label="Live SOL"
                value={activePrice ? formatCurrencyPrecise(activePrice) : routeState === "loading" ? "Loading" : "Unavailable"}
                detail={`Source ${routes?.sourceBreakdown.liveMarket ?? livePrice?.source ?? "Birdeye"}`}
              />
              <Metric
                label="Best hedge rate"
                value={recommendedRoute?.estimatedCostBps !== null && recommendedRoute ? `${recommendedRoute.estimatedCostBps.toFixed(1)} bps` : "Unavailable"}
                detail={recommendedRoute ? `${recommendedRoute.label} score ${recommendedRoute.score?.toFixed(1) ?? "n/a"}` : "Waiting for eligible route"}
                tone={highRisk ? "risk" : "neutral"}
              />
              <Metric
                label="Phoenix spread"
                value={phoenixRoute?.spreadBps !== null && phoenixRoute ? `${phoenixRoute.spreadBps.toFixed(1)} bps` : "Unavailable"}
                detail={phoenixRoute?.availability.status === "available" ? "SOL-PERP orderbook" : phoenixRoute?.availability.reason ?? "Public data pending"}
                tone={phoenixRoute?.availability.status === "unavailable" ? "risk" : "neutral"}
              />
              <Metric
                label="Paper position"
                value={displayedPosition ? formatCurrencyPrecise(displayedPosition.notionalUsd) : "None"}
                detail={displayedPosition ? `${displayedPosition.venue} ${truncateAddress(displayedPosition.id)}` : "No signatures sent"}
              />
            </section>

            <section className="grid min-w-0 gap-6 xl:grid-cols-2">
              <VenueCard
                route={flashRoute}
                recommended={routes?.recommendedRouteId === "flash_perp_short"}
                loading={routeState === "loading"}
                onPaperExecute={() => void handlePaperExecute("flash_perp_short")}
                disabled={executeLoading}
              />
              <VenueCard
                route={phoenixRoute}
                recommended={routes?.recommendedRouteId === "phoenix_perp_short"}
                loading={routeState === "loading"}
                onPaperExecute={() => void handlePaperExecute("phoenix_perp_short")}
                disabled={executeLoading}
              />
            </section>

            <section className="min-w-0 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-950">Paper execution</h2>
                  <p className="mt-1 text-sm leading-6 text-neutral-600">
                    The backend chooses the best eligible route from real venue data where available, then records a
                    paper short position. No wallet signature or on-chain transaction is requested.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={executeLoading || !recommendedRoute}
                  onClick={() => void handlePaperExecute("best")}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {executeLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                  Paper execute best hedge
                </button>
              </div>

              {paperExecution ? (
                <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  <div className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none" aria-hidden="true" />
                    <div>
                      <p className="font-semibold">{paperExecution.selectedRoute.label} paper hedge opened</p>
                      <p className="mt-1">
                        {formatCurrencyPrecise(paperExecution.position.notionalUsd)} notional at{" "}
                        {formatCurrencyPrecise(paperExecution.position.entryPrice)} entry.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="min-w-0 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-neutral-950">Phoenix SOL-PERP depth</h2>
                <OrderbookDepth route={phoenixRoute} loading={routeState === "loading"} />
              </div>

              <div className="min-w-0 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-neutral-950">Risk checks</h2>
                  {highRisk ? (
                    <ShieldAlert className="h-5 w-5 text-red-700" aria-hidden="true" />
                  ) : (
                    <ShieldCheck className="h-5 w-5 text-emerald-700" aria-hidden="true" />
                  )}
                </div>
                <RiskList route={recommendedRoute} />
              </div>
            </section>

            <section className="grid min-w-0 gap-6 xl:grid-cols-2">
              <div className="min-w-0 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-neutral-950">Portfolio dashboard</h2>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <Metric label="SOL exposure" value={formatCurrencyPrecise(solExposureUsd)} detail={`${formatTokenAmount(parsedAmount || 0, 5)} SOL`} />
                  <Metric label="Short size" value={formatCurrencyPrecise(portfolioMetrics?.shortPositionSizeUsd ?? displayedPosition?.notionalUsd ?? 0)} detail={displayedPosition ? displayedPosition.venue : "No paper short"} />
                  <Metric label="Net exposure" value={formatCurrencyPrecise(portfolioMetrics?.netExposureUsd ?? solExposureUsd)} detail="After paper hedge" tone={(portfolioMetrics?.netExposureUsd ?? solExposureUsd) < 0 ? "risk" : "neutral"} />
                  <Metric label="Unrealized PnL" value={formatSignedCurrency(portfolioMetrics?.unrealizedPnl ?? 0)} detail="Paper short only" tone={(portfolioMetrics?.unrealizedPnl ?? 0) < 0 ? "risk" : "neutral"} />
                </div>
              </div>

              <div className="min-w-0 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-neutral-950">Simulation vs live</h2>
                <div className="mt-5 grid gap-4">
                  <ComparisonRow
                    label="Expected from simulator"
                    primary={simulatorExpected ? formatCurrencyPrecise(simulatorExpected.finalHedged) : "Loading"}
                    detail={simulatorExpected ? `90d APY ${formatSignedPercent(simulatorExpected.annualizedApyHedged)}` : "Historical CoinGecko path"}
                  />
                  <ComparisonRow
                    label="Current paper route"
                    primary={recommendedRoute ? recommendedRoute.label : "No route"}
                    detail={recommendedRoute ? `Estimated cost ${recommendedRoute.estimatedCostBps?.toFixed(1) ?? "n/a"} bps` : "Waiting for route comparison"}
                  />
                  <ComparisonRow
                    label="Liquidation indicator"
                    primary={displayedPosition ? formatCurrencyPrecise(displayedPosition.estimatedLiquidationPrice) : recommendedRoute?.estimatedLiquidationPrice ? formatCurrencyPrecise(recommendedRoute.estimatedLiquidationPrice) : "Loading"}
                    detail={displayedPosition ? `${formatPercent(displayedPosition.liquidationDistance)} from spot` : "Before paper execution"}
                    tone={(displayedPosition?.liquidationDistance ?? recommendedRoute?.liquidationDistance ?? 1) < 0.15 ? "risk" : "neutral"}
                  />
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function VenueCard({
  route,
  recommended,
  loading,
  disabled,
  onPaperExecute
}: {
  route: HedgeRouteQuote | null;
  recommended: boolean;
  loading: boolean;
  disabled: boolean;
  onPaperExecute: () => void;
}) {
  if (loading && !route) {
    return <RouteSkeleton />;
  }

  if (!route) {
    return (
      <article className="min-w-0 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-neutral-950">Route unavailable</p>
        <p className="mt-2 text-sm text-neutral-600">Enter a valid SOL amount to compare hedge venues.</p>
      </article>
    );
  }

  const unavailable = route.availability.status === "unavailable";

  return (
    <article className={`min-w-0 rounded-lg border bg-white p-5 shadow-sm ${recommended ? "border-emerald-300" : "border-neutral-200"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-neutral-950">{route.label}</h2>
            {recommended ? (
              <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
                Best hedge rate
              </span>
            ) : null}
            <span className={`rounded-md px-2 py-1 text-xs font-semibold ${unavailable ? "bg-amber-100 text-amber-900" : "bg-neutral-100 text-neutral-700"}`}>
              {unavailable ? "Unavailable" : "Available"}
            </span>
          </div>
          <p className="mt-1 text-sm text-neutral-600">{route.marketSymbol} paper short</p>
        </div>
        {route.eligible ? <CheckCircle2 className="h-5 w-5 text-emerald-700" aria-hidden="true" /> : <AlertTriangle className="h-5 w-5 text-amber-700" aria-hidden="true" />}
      </div>

      {unavailable ? (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          {route.availability.reason}
        </p>
      ) : null}

      <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2">
        <MiniMetric label="Entry" value={route.estimatedFillPrice ? formatCurrencyPrecise(route.estimatedFillPrice) : "n/a"} />
        <MiniMetric label="Cost" value={route.estimatedCostBps !== null ? `${route.estimatedCostBps.toFixed(1)} bps` : "n/a"} />
        <MiniMetric label="Margin" value={route.marginRequiredUsd !== null ? formatCurrencyPrecise(route.marginRequiredUsd) : "n/a"} />
        <MiniMetric label="Funding" value={route.fundingRate !== null ? formatSignedPercent(route.fundingRate) : "n/a"} />
      </div>

      <button
        type="button"
        disabled={disabled || !route.eligible || unavailable}
        onClick={onPaperExecute}
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Paper execute {route.label}
      </button>
    </article>
  );
}

function RouteSkeleton() {
  return (
    <article className="min-w-0 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="h-5 w-40 rounded-md bg-neutral-200" />
      <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-20 rounded-md bg-neutral-100" />
        ))}
      </div>
      <div className="mt-5 h-11 rounded-md bg-neutral-200" />
    </article>
  );
}

function OrderbookDepth({ route, loading }: { route: HedgeRouteQuote | null; loading: boolean }) {
  const bids = route?.orderbook?.bids ?? [];
  const asks = route?.orderbook?.asks ?? [];

  if (loading && !route) {
    return (
      <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2">
        <div className="h-44 rounded-md bg-neutral-100" />
        <div className="h-44 rounded-md bg-neutral-100" />
      </div>
    );
  }

  if (!route || route.availability.status === "unavailable" || (bids.length === 0 && asks.length === 0)) {
    return (
      <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        {route?.availability.reason ?? "Phoenix public orderbook depth is unavailable."}
      </div>
    );
  }

  return (
    <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2">
      <BookSide title="Bids" rows={bids} />
      <BookSide title="Asks" rows={asks} />
    </div>
  );
}

function BookSide({ title, rows }: { title: string; rows: Array<{ price: number; size: number }> }) {
  return (
    <div className="min-w-0 rounded-md border border-neutral-200 bg-neutral-50 p-3">
      <p className="text-sm font-semibold text-neutral-900">{title}</p>
      <div className="mt-3 space-y-2">
        {rows.slice(0, 6).map((row, index) => (
          <div key={`${title}-${row.price}-${index}`} className="flex items-center justify-between gap-3 text-xs">
            <span className="font-mono tabular-nums text-neutral-950">{formatCurrencyPrecise(row.price)}</span>
            <span className="font-mono tabular-nums text-neutral-600">{formatTokenAmount(row.size, 3)} SOL</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Segmented<TValue extends string | number>({
  label,
  options,
  value,
  onChange
}: {
  label: ReactNode;
  options: Array<{ label: string; value: TValue }>;
  value: TValue;
  onChange: (value: TValue) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-neutral-900">{label}</legend>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={String(option.value)}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={`min-h-10 rounded-md border px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 ${
                selected
                  ? "border-neutral-950 bg-neutral-950 text-white"
                  : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function TextInput({
  id,
  label,
  value,
  suffix,
  onChange
}: {
  id: string;
  label: ReactNode;
  value: string;
  suffix?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-neutral-900">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          className={`min-h-11 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 ${suffix ? "pr-16" : ""}`}
        />
        {suffix ? <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-neutral-500">{suffix}</span> : null}
      </div>
    </div>
  );
}

function TooltipLabel({ label, tip }: { label: string; tip: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <Info className="h-3.5 w-3.5 text-neutral-500" aria-label={tip}>
        <title>{tip}</title>
      </Info>
    </span>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700">
      {children}
    </span>
  );
}

function Metric({
  label,
  value,
  detail,
  tone = "neutral"
}: {
  label: ReactNode;
  value: string;
  detail: string;
  tone?: "neutral" | "risk";
}) {
  return (
    <div className={`min-w-0 rounded-lg border p-4 ${tone === "risk" ? "border-amber-300 bg-amber-50" : "border-neutral-200 bg-white"}`}>
      <p className="text-sm font-medium text-neutral-600">{label}</p>
      <p className={`mt-2 break-words font-mono text-xl font-semibold tabular-nums ${tone === "risk" ? "text-amber-900" : "text-neutral-950"}`}>{value}</p>
      <p className="mt-1 text-xs leading-5 text-neutral-600">{detail}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-neutral-200 bg-neutral-50 p-3">
      <p className="text-xs font-semibold text-neutral-500">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-neutral-950 tabular-nums">{value}</p>
    </div>
  );
}

function BalanceTile({ balance, fallback }: { balance?: TokenBalance; fallback: string }) {
  return (
    <div className="min-w-0 rounded-md border border-neutral-200 bg-neutral-50 p-3">
      <p className="text-xs font-semibold text-neutral-500">{balance?.symbol ?? fallback}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-neutral-950 tabular-nums">
        {balance ? formatTokenAmount(balance.balance, balance.symbol === "USDC" ? 2 : 5) : "0"}
      </p>
      <p className="mt-1 text-xs text-neutral-600">{balance?.valueUsd === null || !balance ? "No USD mark" : formatCurrencyPrecise(balance.valueUsd)}</p>
    </div>
  );
}

function RiskList({ route }: { route: HedgeRouteQuote | null }) {
  const items = route?.riskWarnings ?? [];

  if (!route) {
    return (
      <div className="mt-4 rounded-md border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
        Load route comparison to see risk checks.
      </div>
    );
  }

  return (
    <ul className="mt-4 space-y-3">
      {items.map((warning, index) => (
        <li key={`${warning.code}-${index}`} className="flex gap-2 text-sm leading-6 text-neutral-700">
          <AlertTriangle className={`mt-1 h-4 w-4 flex-none ${warning.severity === "danger" ? "text-red-700" : warning.severity === "warning" ? "text-amber-700" : "text-neutral-500"}`} aria-hidden="true" />
          <span>{warning.message}</span>
        </li>
      ))}
    </ul>
  );
}

function ComparisonRow({
  label,
  primary,
  detail,
  tone = "neutral"
}: {
  label: string;
  primary: string;
  detail: string;
  tone?: "neutral" | "risk";
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-4 rounded-md border border-neutral-200 bg-neutral-50 p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-neutral-700">{label}</p>
        <p className="mt-1 text-xs text-neutral-600">{detail}</p>
      </div>
      <p className={`min-w-0 break-words text-right font-mono text-lg font-semibold tabular-nums ${tone === "risk" ? "text-red-700" : "text-neutral-950"}`}>{primary}</p>
    </div>
  );
}

function findBalance(balances: TokenBalance[] | undefined, symbol: TokenBalance["symbol"]) {
  return balances?.find((balance) => balance.symbol === symbol);
}

function parseAmount(value: string): number {
  return Number(value.replace(/,/g, "").trim());
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function refreshPosition(position: VenuePosition, solPrice: number): VenuePosition {
  const unrealizedPnl = -position.notionalUsd * ((solPrice - position.entryPrice) / position.entryPrice);
  const liquidationDistance = Math.max((position.estimatedLiquidationPrice - solPrice) / solPrice, 0);

  return {
    ...position,
    currentPrice: solPrice,
    unrealizedPnl,
    liquidationDistance,
    health: liquidationDistance > 0.25 ? "safe" : liquidationDistance >= 0.1 ? "warning" : "danger"
  };
}

function loadStoredPosition(): VenuePosition | null {
  try {
    const raw = window.localStorage.getItem(POSITION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as VenuePosition) : null;
  } catch {
    return null;
  }
}

function storePosition(position: VenuePosition) {
  window.localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(position));
}
