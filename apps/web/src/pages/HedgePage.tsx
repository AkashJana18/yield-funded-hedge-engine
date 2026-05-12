import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  RadioTower,
  RefreshCcw,
  Route,
  ShieldAlert,
  ShieldCheck,
  Zap
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  calculatePortfolioMetrics,
  fetchHedgeRoutes,
  fetchSolLivePrice,
  fetchWalletBalance,
  openProtectionPosition,
  simulatePortfolio
} from "../api";
import { DEFAULT_SLIPPAGE_BPS, FLASH_DEFAULT_LEVERAGE, HEDGE_RATIOS } from "../constants";
import type {
  HedgeRouteId,
  HedgeRouteQuote,
  HedgeRoutesResponse,
  ProtectionExecutionResponse,
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

const POSITION_STORAGE_KEY = "floorfi:last-protection-position";

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
  const [historicalPerformance, setHistoricalPerformance] = useState<SimulationResponse | null>(null);
  const [portfolioMetrics, setPortfolioMetrics] = useState<PortfolioMetrics | null>(null);
  const [protectionExecution, setProtectionExecution] = useState<ProtectionExecutionResponse | null>(null);
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
    const position = trackedPosition ?? protectionExecution?.position ?? null;
    return position && activePrice ? refreshPosition(position, activePrice) : position;
  }, [activePrice, protectionExecution?.position, trackedPosition]);
  const highRisk = Boolean(
    recommendedRoute?.riskWarnings.some((warning) => warning.severity === "danger")
  );

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
    void refreshLivePrice().catch(() => {
      setError("Unable to load live SOL market data.");
    });

    const interval = window.setInterval(() => {
      void refreshLivePrice().catch(() => undefined);
    }, 20_000);

    return () => window.clearInterval(interval);
  }, [refreshLivePrice]);

  useEffect(() => {
    void refreshBalances().catch(() => {
      setError("Unable to refresh wallet balances.");
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
        setError("Unable to compare protection routes. Retry in a moment.");
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
      setHistoricalPerformance(null);
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
      .then(setHistoricalPerformance)
      .catch(() => setHistoricalPerformance(null));
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

  async function handleOpenProtection(routeId: HedgeRouteId | "best" = "best") {
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a SOL amount before opening protection.");
      return;
    }

    setExecuteLoading(true);
    setError(null);

    try {
      const result = await openProtectionPosition({
        routeId,
        walletAddress,
        solAmount: parsedAmount,
        hedgeRatio,
        slippageBps,
        leverage,
        fundingRate: Number.isFinite(fundingRateValue) ? fundingRateValue : 0.04,
        availableUsdc
      });
      setProtectionExecution(result);
      setTrackedPosition(result.position);
      storePosition(result.position);
    } catch {
      setError("Unable to open protection. Review route availability and try again.");
    } finally {
      setExecuteLoading(false);
    }
  }

  const projectedProtection = historicalPerformance?.metrics;

  return (
    <main className="floorfi-shell px-4 py-6 antialiased sm:px-6 lg:px-8">
      <div className="floorfi-content mx-auto w-full min-w-0 max-w-7xl overflow-hidden">
        <nav className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full min-w-0 flex-col items-start gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              to="/"
              className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md text-sm font-semibold text-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              <span className="live-dot" aria-hidden="true" />
              FloorFi
            </Link>
            <Badge icon={<RadioTower className="h-3.5 w-3.5" aria-hidden="true" />}>Live SOL Market Data</Badge>
            <Badge icon={<Route className="h-3.5 w-3.5" aria-hidden="true" />}>Multi-Venue Routing</Badge>
            <Badge icon={<Zap className="h-3.5 w-3.5" aria-hidden="true" />}>Powered by Phoenix + Flash</Badge>
          </div>
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
            <Link
              to="/app"
              className="dark-button inline-flex min-h-10 shrink-0 items-center rounded-md px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              Historical Performance
            </Link>
            <WalletMultiButton />
          </div>
        </nav>

        <header className="mt-8 grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="status-pill inline-flex min-h-8 items-center rounded-md px-2.5 text-xs font-semibold">
                Real-Time Market Protection
              </span>
              {recommendedRoute ? (
                <span className="status-pill inline-flex min-h-8 items-center rounded-md px-2.5 text-xs font-semibold">
                  Best Route: {getVenueLabel(recommendedRoute)}
                </span>
              ) : (
                <span className="inline-flex min-h-8 items-center rounded-md border border-amber-300/22 bg-amber-300/10 px-2.5 text-xs font-semibold text-amber-100">
                  Route scan in progress
                </span>
              )}
            </div>
            <h1 className="mt-4 max-w-[21rem] break-words text-3xl font-semibold tracking-normal text-emerald-50 sm:max-w-3xl md:text-4xl">
              Keep holding SOL while reducing downside risk.
            </h1>
            <p className="mt-3 max-w-[21rem] text-sm leading-6 text-emerald-50/64 sm:max-w-3xl">
              FloorFi compares live Phoenix and Flash routes, monitors market depth, and helps you open protection with
              clear portfolio impact before you act.
            </p>
          </div>

          <section className="glass-panel w-full min-w-0 rounded-lg p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">Wallet balances</p>
                <p className="mt-1 text-sm text-emerald-50/62">
                  {walletAddress ? truncateAddress(walletAddress) : "Connect wallet to personalize positions"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void refreshBalances()}
                disabled={!walletAddress}
                className="dark-button inline-flex min-h-10 min-w-10 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Refresh balances"
              >
                <RefreshCcw className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <BalanceTile balance={solBalance} fallback="SOL" />
              <BalanceTile balance={usdcBalance} fallback="USDC" />
              <BalanceTile balance={msolBalance} fallback="mSOL" />
              <BalanceTile balance={jitoBalance} fallback="JitoSOL" />
            </div>
            {balances?.marketDataError ? (
              <p className="mt-3 text-xs leading-5 text-amber-100">Some balance marks are refreshing. Live SOL data remains active.</p>
            ) : null}
          </section>
        </header>

        {error ? (
          <div className="mt-6 rounded-lg border border-red-300/24 bg-red-400/10 p-4 text-red-100" role="alert">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-none" aria-hidden="true" />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        ) : null}

        <section className="mt-6 grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="glass-panel w-full min-w-0 rounded-lg p-5 lg:self-start">
            <h2 className="text-lg font-semibold text-emerald-50">Protection setup</h2>
            <div className="mt-5 space-y-5">
              <TextInput id="amount" label="SOL holdings" value={amount} suffix="SOL" onChange={setAmount} />
              <Segmented
                label={<TooltipLabel label="Protection level" tip="How much of your SOL value to protect during downside moves." />}
                options={HEDGE_RATIOS.map((ratio) => ({ label: `${Math.round(ratio * 100)}%`, value: ratio }))}
                value={hedgeRatio}
                onChange={setHedgeRatio}
              />
              <Segmented
                label="Execution leverage"
                options={[
                  { label: "1x", value: 1 as const },
                  { label: "2x", value: 2 as const },
                  { label: "3x", value: 3 as const }
                ]}
                value={leverage}
                onChange={setLeverage}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <TextInput
                  id="slippage"
                  label="Price tolerance"
                  value={String(slippageBps / 100)}
                  suffix="%"
                  onChange={(next) => setSlippageBps(Math.max(1, Math.round(parseAmount(next) * 100)))}
                />
                <TextInput
                  id="fundingRate"
                  label={<TooltipLabel label="Annual carry" tip="Annual cost assumption for market protection when venue data is limited." />}
                  value={fundingRate}
                  suffix="%"
                  onChange={setFundingRate}
                />
              </div>
            </div>
          </aside>

          <div className="min-w-0 space-y-6">
            <section className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Metric
                label="Live SOL Market Data"
                value={activePrice ? formatCurrencyPrecise(activePrice) : routeState === "loading" ? "Loading" : "Unavailable"}
                detail={`Source ${sourceLabel(routes?.sourceBreakdown.liveMarket ?? livePrice?.source ?? "birdeye")}`}
              />
              <Metric
                label="Best Route"
                value={recommendedRoute?.estimatedCostBps !== null && recommendedRoute ? `${recommendedRoute.estimatedCostBps.toFixed(1)} bps` : "Unavailable"}
                detail={recommendedRoute ? `${getVenueLabel(recommendedRoute)} route quality ${recommendedRoute.score?.toFixed(1) ?? "n/a"}` : "Waiting for route comparison"}
                tone={highRisk ? "risk" : "neutral"}
              />
              <Metric
                label="Phoenix liquidity"
                value={phoenixRoute?.spreadBps !== null && phoenixRoute ? `${phoenixRoute.spreadBps.toFixed(1)} bps` : "Unavailable"}
                detail={phoenixRoute?.availability.status === "available" ? "Live orderbook depth" : "Depth scan in progress"}
                tone={phoenixRoute?.availability.status === "unavailable" ? "risk" : "neutral"}
              />
              <Metric
                label="Protection Position"
                value={displayedPosition ? formatCurrencyPrecise(displayedPosition.notionalUsd) : "Ready"}
                detail={displayedPosition ? `${displayedPosition.venue} active` : "Awaiting activation"}
              />
            </section>

            <section className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2">
              <VenueCard
                route={flashRoute}
                recommended={routes?.recommendedRouteId === "flash_perp_short"}
                loading={routeState === "loading"}
                onOpenProtection={() => void handleOpenProtection("flash_perp_short")}
                disabled={executeLoading}
              />
              <VenueCard
                route={phoenixRoute}
                recommended={routes?.recommendedRouteId === "phoenix_perp_short"}
                loading={routeState === "loading"}
                onOpenProtection={() => void handleOpenProtection("phoenix_perp_short")}
                disabled={executeLoading}
              />
            </section>

            <section className="glass-panel min-w-0 rounded-lg p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-emerald-50">Open Protection</h2>
                  <p className="mt-1 text-sm leading-6 text-emerald-50/62">
                    FloorFi selects the best available route using live market data and opens a protection position for
                    your SOL holdings.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={executeLoading || !recommendedRoute}
                  onClick={() => void handleOpenProtection("best")}
                  className="glow-button inline-flex min-h-11 w-full min-w-40 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {executeLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                  Open Protection
                </button>
              </div>

              {protectionExecution ? (
                <div className="mt-5 rounded-md border border-emerald-300/24 bg-emerald-300/10 p-4 text-sm text-emerald-50">
                  <div className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-emerald-300" aria-hidden="true" />
                    <div>
                      <p className="font-semibold">{getVenueLabel(protectionExecution.selectedRoute)} protection position opened</p>
                      <p className="mt-1 text-emerald-50/70">
                        {formatCurrencyPrecise(protectionExecution.position.notionalUsd)} protected at{" "}
                        {formatCurrencyPrecise(protectionExecution.position.entryPrice)} entry.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="glass-panel-soft min-w-0 rounded-lg p-5">
                <h2 className="text-lg font-semibold text-emerald-50">Phoenix liquidity depth</h2>
                <OrderbookDepth route={phoenixRoute} loading={routeState === "loading"} />
              </div>

              <div className="glass-panel-soft min-w-0 rounded-lg p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-emerald-50">Protection checks</h2>
                  {highRisk ? (
                    <ShieldAlert className="h-5 w-5 text-amber-300" aria-hidden="true" />
                  ) : (
                    <ShieldCheck className="h-5 w-5 text-emerald-300" aria-hidden="true" />
                  )}
                </div>
                <RiskList route={recommendedRoute} />
              </div>
            </section>

            <section className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="glass-panel min-w-0 rounded-lg p-5">
                <h2 className="text-lg font-semibold text-emerald-50">Portfolio dashboard</h2>
                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Metric label="SOL exposure" value={formatCurrencyPrecise(solExposureUsd)} detail={`${formatTokenAmount(parsedAmount || 0, 5)} SOL`} />
                  <Metric label="Protection size" value={formatCurrencyPrecise(portfolioMetrics?.shortPositionSizeUsd ?? displayedPosition?.notionalUsd ?? 0)} detail={displayedPosition ? `${displayedPosition.venue} active` : "No active protection"} />
                  <Metric label="Current net exposure" value={formatCurrencyPrecise(portfolioMetrics?.netExposureUsd ?? solExposureUsd)} detail="After protection" tone={(portfolioMetrics?.netExposureUsd ?? solExposureUsd) < 0 ? "risk" : "neutral"} />
                  <Metric label="Position PnL" value={formatSignedCurrency(portfolioMetrics?.unrealizedPnl ?? 0)} detail="Current protection position" tone={(portfolioMetrics?.unrealizedPnl ?? 0) < 0 ? "risk" : "neutral"} />
                </div>
              </div>

              <div className="glass-panel min-w-0 rounded-lg p-5">
                <h2 className="text-lg font-semibold text-emerald-50">Projected Protection</h2>
                <div className="mt-5 grid gap-4">
                  <ComparisonRow
                    label="Historical performance"
                    primary={projectedProtection ? formatCurrencyPrecise(projectedProtection.finalHedged) : "Loading"}
                    detail={projectedProtection ? `90d protected APY ${formatSignedPercent(projectedProtection.annualizedApyHedged)}` : "Historical CoinGecko path"}
                  />
                  <ComparisonRow
                    label="Active route"
                    primary={recommendedRoute ? getVenueLabel(recommendedRoute) : "No route"}
                    detail={recommendedRoute ? `Route cost ${recommendedRoute.estimatedCostBps?.toFixed(1) ?? "n/a"} bps` : "Waiting for route comparison"}
                  />
                  <ComparisonRow
                    label="Protection floor"
                    primary={displayedPosition ? formatCurrencyPrecise(displayedPosition.estimatedLiquidationPrice) : recommendedRoute?.estimatedLiquidationPrice ? formatCurrencyPrecise(recommendedRoute.estimatedLiquidationPrice) : "Loading"}
                    detail={displayedPosition ? `${formatPercent(displayedPosition.liquidationDistance)} from live SOL` : "Ready before activation"}
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
  onOpenProtection
}: {
  route: HedgeRouteQuote | null;
  recommended: boolean;
  loading: boolean;
  disabled: boolean;
  onOpenProtection: () => void;
}) {
  if (loading && !route) {
    return <RouteSkeleton />;
  }

  if (!route) {
    return (
      <article className="glass-panel-soft min-w-0 rounded-lg p-5">
        <p className="text-sm font-semibold text-emerald-50">Route unavailable</p>
        <p className="mt-2 text-sm text-emerald-50/62">Enter a valid SOL amount to compare protection venues.</p>
      </article>
    );
  }

  const unavailable = route.availability.status === "unavailable";

  return (
    <article className={`glass-panel-soft min-w-0 rounded-lg p-5 ${recommended ? "border-emerald-300/36" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-emerald-50">{getVenueLabel(route)}</h2>
            {recommended ? (
              <span className="status-pill rounded-md px-2 py-1 text-xs font-semibold">
                Best route
              </span>
            ) : null}
            <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${unavailable ? "border-amber-300/22 bg-amber-300/10 text-amber-100" : "border-emerald-300/18 bg-emerald-300/8 text-emerald-100"}`}>
              {unavailable ? "Monitoring" : "Live"}
            </span>
          </div>
          <p className="mt-1 text-sm text-emerald-50/58">SOL protection route</p>
        </div>
        {route.eligible ? <CheckCircle2 className="h-5 w-5 text-emerald-300" aria-hidden="true" /> : <AlertTriangle className="h-5 w-5 text-amber-300" aria-hidden="true" />}
      </div>

      {unavailable ? (
        <p className="mt-4 rounded-md border border-amber-300/22 bg-amber-300/10 p-3 text-sm leading-6 text-amber-50">
          {routeNotice(route)}
        </p>
      ) : null}

      <div className="mt-5 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        <MiniMetric label="Entry" value={route.estimatedFillPrice ? formatCurrencyPrecise(route.estimatedFillPrice) : "n/a"} />
        <MiniMetric label="Route cost" value={route.estimatedCostBps !== null ? `${route.estimatedCostBps.toFixed(1)} bps` : "n/a"} />
        <MiniMetric label="Required collateral" value={route.marginRequiredUsd !== null ? formatCurrencyPrecise(route.marginRequiredUsd) : "n/a"} />
        <MiniMetric label="Annual carry" value={route.fundingRate !== null ? formatSignedPercent(route.fundingRate) : "n/a"} />
      </div>

      <button
        type="button"
        disabled={disabled || !route.eligible || unavailable}
        onClick={onOpenProtection}
        className="dark-button mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-md px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50"
      >
        Open Protection with {getVenueLabel(route)}
      </button>
    </article>
  );
}

function RouteSkeleton() {
  return (
    <article className="glass-panel-soft min-w-0 rounded-lg p-5">
      <div className="h-5 w-40 animate-pulse rounded-md bg-emerald-300/12" />
      <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-20 animate-pulse rounded-md bg-emerald-300/10" />
        ))}
      </div>
      <div className="mt-5 h-11 animate-pulse rounded-md bg-emerald-300/12" />
    </article>
  );
}

function OrderbookDepth({ route, loading }: { route: HedgeRouteQuote | null; loading: boolean }) {
  const bids = route?.orderbook?.bids ?? [];
  const asks = route?.orderbook?.asks ?? [];

  if (loading && !route) {
    return (
      <div className="mt-5 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="h-44 animate-pulse rounded-md bg-emerald-300/10" />
        <div className="h-44 animate-pulse rounded-md bg-emerald-300/10" />
      </div>
    );
  }

  if (!route || route.availability.status === "unavailable" || (bids.length === 0 && asks.length === 0)) {
    return (
      <div className="mt-5 rounded-md border border-amber-300/22 bg-amber-300/10 p-4 text-sm leading-6 text-amber-50">
        Phoenix liquidity depth is refreshing.
      </div>
    );
  }

  return (
    <div className="mt-5 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
      <BookSide title="Bids" rows={bids} />
      <BookSide title="Asks" rows={asks} />
    </div>
  );
}

function BookSide({ title, rows }: { title: string; rows: Array<{ price: number; size: number }> }) {
  return (
    <div className="min-w-0 rounded-md border border-emerald-300/14 bg-black/24 p-3">
      <p className="text-sm font-semibold text-emerald-50">{title}</p>
      <div className="mt-3 space-y-2">
        {rows.slice(0, 6).map((row, index) => (
          <div key={`${title}-${row.price}-${index}`} className="flex items-center justify-between gap-3 text-xs">
            <span className="font-mono tabular-nums text-emerald-50">{formatCurrencyPrecise(row.price)}</span>
            <span className="font-mono tabular-nums text-emerald-50/58">{formatTokenAmount(row.size, 3)} SOL</span>
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
      <legend className="text-sm font-medium text-emerald-50">{label}</legend>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={String(option.value)}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={`min-h-10 rounded-md border px-3 text-sm font-semibold transition duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                selected
                  ? "border-emerald-300/70 bg-emerald-300/16 text-emerald-50 shadow-[0_0_18px_rgb(52_211_153_/_0.12)]"
                  : "border-emerald-300/16 bg-black/22 text-emerald-50/68 hover:border-emerald-300/34 hover:bg-emerald-300/8"
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
      <label htmlFor={id} className="text-sm font-medium text-emerald-50">
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
          className={`min-h-11 w-full rounded-md border border-emerald-300/18 bg-black/28 px-3 py-2 text-sm text-emerald-50 shadow-sm transition duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${suffix ? "pr-16" : ""}`}
        />
        {suffix ? <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-emerald-50/52">{suffix}</span> : null}
      </div>
    </div>
  );
}

function TooltipLabel({ label, tip }: { label: string; tip: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <Info className="h-3.5 w-3.5 text-emerald-50/54" aria-label={tip}>
        <title>{tip}</title>
      </Info>
    </span>
  );
}

function Badge({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <span className="status-pill inline-flex min-h-8 max-w-full shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold">
      {icon}
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
    <div className={`min-w-0 rounded-lg border p-4 ${tone === "risk" ? "border-amber-300/24 bg-amber-300/10" : "border-emerald-300/14 bg-black/24"}`}>
      <p className="text-sm font-medium text-emerald-50/62">{label}</p>
      <p className={`mt-2 break-words font-mono text-xl font-semibold tabular-nums ${tone === "risk" ? "text-amber-100" : "text-emerald-50"}`}>{value}</p>
      <p className="mt-1 text-xs leading-5 text-emerald-50/54">{detail}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-emerald-300/14 bg-black/22 p-3">
      <p className="text-xs font-semibold text-emerald-50/52">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-emerald-50 tabular-nums">{value}</p>
    </div>
  );
}

function BalanceTile({ balance, fallback }: { balance?: TokenBalance; fallback: string }) {
  return (
    <div className="min-w-0 rounded-md border border-emerald-300/14 bg-black/22 p-3">
      <p className="text-xs font-semibold text-emerald-50/52">{balance?.symbol ?? fallback}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-emerald-50 tabular-nums">
        {balance ? formatTokenAmount(balance.balance, balance.symbol === "USDC" ? 2 : 5) : "0"}
      </p>
      <p className="mt-1 text-xs text-emerald-50/52">{balance?.valueUsd === null || !balance ? "USD mark pending" : formatCurrencyPrecise(balance.valueUsd)}</p>
    </div>
  );
}

function RiskList({ route }: { route: HedgeRouteQuote | null }) {
  const items = (route?.riskWarnings ?? []).filter(
    (warning) => warning.code !== "PAPER_MODE" && warning.code !== "FLASH_DISABLED"
  );

  if (!route) {
    return (
      <div className="mt-4 rounded-md border border-emerald-300/14 bg-black/22 p-4 text-sm text-emerald-50/62">
        Load route comparison to see protection checks.
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mt-4 rounded-md border border-emerald-300/18 bg-emerald-300/8 p-4 text-sm text-emerald-50/70">
        Protection checks are clear for the current route.
      </div>
    );
  }

  return (
    <ul className="mt-4 space-y-3">
      {items.map((warning, index) => (
        <li key={`${warning.code}-${index}`} className="flex gap-2 text-sm leading-6 text-emerald-50/70">
          <AlertTriangle className={`mt-1 h-4 w-4 flex-none ${warning.severity === "danger" ? "text-red-300" : warning.severity === "warning" ? "text-amber-300" : "text-emerald-300"}`} aria-hidden="true" />
          <span>{protectionWarningText(warning.code)}</span>
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
    <div className="flex min-w-0 items-center justify-between gap-4 rounded-md border border-emerald-300/14 bg-black/22 p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-emerald-50/74">{label}</p>
        <p className="mt-1 text-xs text-emerald-50/52">{detail}</p>
      </div>
      <p className={`min-w-0 break-words text-right font-mono text-lg font-semibold tabular-nums ${tone === "risk" ? "text-amber-100" : "text-emerald-50"}`}>{primary}</p>
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

function getVenueLabel(route: Pick<HedgeRouteQuote, "venue">): string {
  return route.venue === "phoenix" ? "Phoenix" : "Flash";
}

function sourceLabel(source: "birdeye" | "coingecko"): string {
  return source === "coingecko" ? "CoinGecko" : "Birdeye";
}

function routeNotice(route: HedgeRouteQuote): string {
  return `${getVenueLabel(route)} liquidity is temporarily unavailable. FloorFi will keep monitoring for the next best route.`;
}

function protectionWarningText(code: string): string {
  switch (code) {
    case "HIGH_HEDGE_RATIO":
      return "Higher protection levels require more active collateral management.";
    case "INSUFFICIENT_MARGIN":
      return "Wallet USDC is below the estimated collateral requirement.";
    case "LIQUIDATION_TOO_CLOSE":
      return "The protection floor is close to the current SOL price.";
    case "FUNDING_OVER_YIELD":
      return "Annual protection cost is higher than the selected holding yield.";
    default:
      return "Protection reduces downside risk, but outcomes can vary with market conditions.";
  }
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
