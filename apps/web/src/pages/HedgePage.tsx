import { AlertCircle, CheckCircle2, Loader2, ShieldCheck, Wallet } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchSolLivePrice, fetchWalletBalance, openHedge, previewHedge } from "../api";
import type { HedgePreviewResponse, HedgeVenue, OpenHedgeResponse, SolLivePrice } from "../types";
import { formatCurrencyPrecise, formatPercent } from "../utils/format";

type Leverage = 1 | 2 | 3;

const hedgeLevels = [0.25, 0.5, 0.75, 1] as const;
const leverages = [1, 2, 3] as const;

export function HedgePage() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletLabel, setWalletLabel] = useState("Connect wallet");
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [capitalUsd, setCapitalUsd] = useState("10000");
  const [hedgePercent, setHedgePercent] = useState<(typeof hedgeLevels)[number]>(0.5);
  const [stakingYield, setStakingYield] = useState("7");
  const [fundingRate, setFundingRate] = useState("4");
  const [leverage, setLeverage] = useState<Leverage>(1);
  const [venue, setVenue] = useState<HedgeVenue>("mock");
  const [livePrice, setLivePrice] = useState<SolLivePrice | null>(null);
  const [preview, setPreview] = useState<HedgePreviewResponse | null>(null);
  const [opened, setOpened] = useState<OpenHedgeResponse | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetchSolLivePrice(controller.signal)
      .then(setLivePrice)
      .catch((fetchError) => {
        if (!(fetchError instanceof DOMException && fetchError.name === "AbortError")) {
          setError(fetchError instanceof Error ? fetchError.message : "Unable to fetch SOL price.");
        }
      });

    return () => controller.abort();
  }, []);

  async function connectWallet() {
    setError(null);

    if (!window.solana) {
      const paperWallet = "PaperMode111111111111111111111111111111111";
      setWalletAddress(paperWallet);
      setWalletLabel("Paper wallet");
      setSolBalance(null);
      return;
    }

    try {
      const response = await window.solana.connect();
      const address = response.publicKey.toString();
      setWalletAddress(address);
      setWalletLabel(shortAddress(address));
      const balance = await fetchWalletBalance(address);
      setSolBalance(balance.solBalance);
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : "Unable to connect wallet.");
    }
  }

  async function handlePreview() {
    const payload = buildPreviewPayload();

    if (!payload) {
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsPreviewing(true);
    setError(null);
    setOpened(null);

    try {
      const response = await previewHedge(payload, controller.signal);
      setPreview(response);
      setLivePrice({
        symbol: "SOL",
        priceUsd: response.solPrice,
        source: "birdeye",
        timestamp: new Date().toISOString()
      });
    } catch (previewError) {
      if (!(previewError instanceof DOMException && previewError.name === "AbortError")) {
        setError(previewError instanceof Error ? previewError.message : "Unable to preview hedge.");
      }
    } finally {
      if (abortRef.current === controller) {
        setIsPreviewing(false);
      }
    }
  }

  async function handleOpenPaperHedge() {
    const capital = parseInput(capitalUsd);

    if (!walletAddress) {
      setError("Connect a wallet or use the paper wallet before opening a paper hedge.");
      return;
    }

    if (!Number.isFinite(capital) || capital <= 0) {
      setError("Enter capital greater than 0.");
      return;
    }

    setIsOpening(true);
    setError(null);

    try {
      setOpened(
        await openHedge({
          walletAddress,
          capitalUsd: capital,
          hedgePercent,
          leverage,
          venue
        })
      );
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : "Unable to open paper hedge.");
    } finally {
      setIsOpening(false);
    }
  }

  function buildPreviewPayload() {
    const capital = parseInput(capitalUsd);
    const staking = parseInput(stakingYield);
    const funding = parseInput(fundingRate);

    if (!Number.isFinite(capital) || capital <= 0) {
      setError("Enter capital greater than 0.");
      return null;
    }

    if (!Number.isFinite(staking) || !Number.isFinite(funding)) {
      setError("Enter valid annual staking and funding rates.");
      return null;
    }

    return {
      walletAddress: walletAddress ?? undefined,
      capitalUsd: capital,
      hedgePercent,
      stakingYield: staking / 100,
      fundingRate: funding / 100,
      leverage,
      venue
    };
  }

  const mode = preview?.mode ?? "paper";
  const liveEnabled = mode === "live";

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-6 text-white antialiased sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex items-center justify-between gap-3">
          <Link
            to="/"
            className="text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
          >
            FloorFi
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/app"
              className="inline-flex min-h-10 items-center rounded-md px-3 text-sm font-semibold text-neutral-300 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
            >
              Simulator
            </Link>
            <button
              type="button"
              onClick={() => void connectWallet()}
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
            >
              <Wallet className="h-4 w-4" aria-hidden="true" />
              {walletLabel}
            </button>
          </div>
        </nav>

        <header className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-emerald-400/15 px-2.5 py-1 text-xs font-semibold text-emerald-200">
                One-Click Hedge
              </span>
              <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${liveEnabled ? "bg-red-400/15 text-red-200" : "bg-amber-300/15 text-amber-100"}`}>
                {liveEnabled ? "Live Mode" : "Paper Mode"}
              </span>
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-normal text-white sm:text-5xl">
              Preview SOL downside protection.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">
              This is a hedge preview, not guaranteed protection. Paper mode uses live market data but does not
              execute real trades.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-neutral-900 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">SOL balance</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-white">
              {solBalance === null ? "Not connected" : `${solBalance.toFixed(4)} SOL`}
            </p>
          </div>
        </header>

        {error ? (
          <div className="mt-6 rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-red-100" role="alert">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-none" aria-hidden="true" />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        ) : null}

        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.15fr)]">
          <div className="rounded-lg border border-white/10 bg-neutral-900 p-5">
            <h2 className="text-lg font-semibold text-white">Inputs</h2>
            <div className="mt-5 space-y-5">
              <DarkInput
                id="capitalUsd"
                label="Capital to protect"
                prefix="$"
                value={capitalUsd}
                onChange={setCapitalUsd}
              />
              <Segmented
                label="Hedge level"
                options={hedgeLevels.map((value) => ({ label: `${Math.round(value * 100)}%`, value }))}
                value={hedgePercent}
                onChange={(value) => setHedgePercent(value as (typeof hedgeLevels)[number])}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <DarkInput
                  id="stakingYield"
                  label="Staking yield"
                  suffix="%"
                  value={stakingYield}
                  onChange={setStakingYield}
                />
                <DarkInput
                  id="fundingRate"
                  label="Funding rate"
                  suffix="%"
                  value={fundingRate}
                  onChange={setFundingRate}
                />
              </div>
              <Segmented
                label="Leverage"
                options={leverages.map((value) => ({ label: `${value}x`, value }))}
                value={leverage}
                onChange={(value) => setLeverage(value as Leverage)}
              />
              <Segmented
                label="Venue"
                options={[
                  { label: "Mock", value: "mock" },
                  { label: "Flash", value: "flash" }
                ]}
                value={venue}
                onChange={(value) => setVenue(value as HedgeVenue)}
              />
              <button
                type="button"
                onClick={() => void handlePreview()}
                disabled={isPreviewing}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-emerald-400 px-4 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPreviewing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                Preview Hedge
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-neutral-900 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Hedge Preview</h2>
                <p className="mt-1 text-sm text-neutral-400">Live SOL market data by Birdeye.</p>
              </div>
              <span className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-semibold text-neutral-200">
                {livePrice ? formatCurrencyPrecise(livePrice.priceUsd) : "Loading SOL"}
              </span>
            </div>

            {preview ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Metric label="Hedge notional" value={formatCurrencyPrecise(preview.hedgeNotionalUsd)} />
                <Metric label="SOL short size" value={`${preview.estimatedSolShortSize.toFixed(4)} SOL`} />
                <Metric label="Margin required" value={formatCurrencyPrecise(preview.marginRequiredUsd)} />
                <Metric label="Liquidation price" value={formatCurrencyPrecise(preview.estimatedLiquidationPrice)} tone="risk" />
                <Metric label="Liquidation distance" value={formatPercent(preview.liquidationDistance)} tone={preview.health === "safe" ? "green" : "risk"} />
                <Metric label="Health" value={preview.health.toUpperCase()} tone={preview.health === "safe" ? "green" : "risk"} />
                <Metric label="Estimated net APY" value={formatPercent(preview.estimatedNetAPY)} tone={preview.estimatedNetAPY >= 0 ? "green" : "risk"} />
                <Metric label="Funding cost" value={formatCurrencyPrecise(preview.estimatedAnnualFundingCostUsd)} tone="risk" />
                <Metric label="Protection level" value={`${Math.round(hedgePercent * 100)}%`} />
                <Metric label="Protection benefit" value={formatCurrencyPrecise(preview.protectionBenefit)} tone="green" />
              </div>
            ) : (
              <div className="mt-6 flex min-h-[320px] items-center justify-center rounded-md border border-dashed border-white/15 bg-white/[0.03] px-6 text-center text-sm leading-6 text-neutral-400">
                Choose inputs and preview the hedge before opening a paper position.
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-5">
            <h2 className="text-lg font-semibold text-amber-100">Risk warnings</h2>
            <ul className="mt-4 grid gap-3 text-sm leading-6 text-amber-50 md:grid-cols-2">
              {(preview?.warnings ?? [
                "Funding can flip.",
                "Liquidation can occur.",
                "Hedge is not guaranteed protection.",
                "LST basis risk if LST is used later."
              ]).map((warning) => (
                <li key={warning} className="flex gap-2">
                  <AlertCircle className="mt-1 h-4 w-4 flex-none" aria-hidden="true" />
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-white/10 bg-neutral-900 p-5">
            <button
              type="button"
              onClick={() => void handleOpenPaperHedge()}
              disabled={!preview || isOpening}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isOpening ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
              Open Paper Hedge
            </button>
            <button
              type="button"
              disabled
              className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-md border border-white/15 px-4 text-sm font-semibold text-neutral-500"
            >
              Open Live Hedge
            </button>
            <p className="mt-3 text-xs leading-5 text-neutral-500">Live Flash execution is disabled for this MVP.</p>
            {opened ? (
              <div className="mt-4 rounded-md border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-100">
                Paper position opened: <span className="font-mono">{opened.positionId.slice(0, 18)}...</span>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function DarkInput({
  id,
  label,
  value,
  prefix,
  suffix,
  onChange
}: {
  id: string;
  label: string;
  value: string;
  prefix?: string;
  suffix?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-neutral-200">
        {label}
      </label>
      <div className="relative">
        {prefix ? <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-neutral-500">{prefix}</span> : null}
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          className={`min-h-11 w-full rounded-md border border-white/15 bg-neutral-950 px-3 py-2 text-sm text-white shadow-sm transition placeholder:text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 ${prefix ? "pl-7" : ""} ${suffix ? "pr-9" : ""}`}
        />
        {suffix ? <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-neutral-500">{suffix}</span> : null}
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
  label: string;
  options: Array<{ label: string; value: TValue }>;
  value: TValue;
  onChange: (value: TValue) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-neutral-200">{label}</legend>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={String(option.value)}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={`min-h-10 rounded-md border px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 ${
                selected
                  ? "border-emerald-300 bg-emerald-300/15 text-emerald-100"
                  : "border-white/15 bg-white/5 text-neutral-300 hover:bg-white/10"
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

function Metric({
  label,
  value,
  tone = "neutral"
}: {
  label: string;
  value: string;
  tone?: "green" | "risk" | "neutral";
}) {
  const toneClass = tone === "green" ? "text-emerald-300" : tone === "risk" ? "text-amber-200" : "text-white";

  return (
    <div className="rounded-lg border border-white/10 bg-neutral-950 p-4">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className={`mt-2 font-mono text-xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function parseInput(value: string): number {
  return Number(value.replace(/,/g, "").trim());
}

function shortAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
