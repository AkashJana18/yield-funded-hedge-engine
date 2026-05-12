import { AlertCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { simulatePortfolio } from "../api";
import { InputPanel } from "../components/InputPanel";
import { MetricsPanel } from "../components/MetricsPanel";
import { PortfolioChart } from "../components/PortfolioChart";
import type { FormErrors, SimulationFormState, SimulationRequest, SimulationResponse } from "../types";

const defaultFormState: SimulationFormState = {
  capital: "10000",
  hedgePercent: 50,
  stakingYield: "7",
  fundingRate: "4",
  days: 90,
  mode: "historical"
};

export function ProtectionReplayPage() {
  const [formState, setFormState] = useState<SimulationFormState>(defaultFormState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [seed, setSeed] = useState("sol-protection-replay");
  const activeRequest = useRef<AbortController | null>(null);

  const runReplay = useCallback(
    async (nextSeed = seed) => {
      const nextPayload = buildPayload(formState, nextSeed);
      setErrors(nextPayload.errors);

      if (!nextPayload.request) {
        return;
      }

      activeRequest.current?.abort();
      const controller = new AbortController();
      activeRequest.current = controller;
      setIsLoading(true);
      setApiError(null);

      try {
        const response = await simulatePortfolio(nextPayload.request, controller.signal);
        setResult(response);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setApiError("Market replay is temporarily unavailable. Retry in a moment.");
      } finally {
        if (activeRequest.current === controller) {
          setIsLoading(false);
          activeRequest.current = null;
        }
      }
    },
    [formState, seed]
  );

  useEffect(() => {
    void runReplay(seed);

    return () => {
      activeRequest.current?.abort();
    };
  }, []);

  function handleRunAgain() {
    const nextSeed = `sol-replay-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setSeed(nextSeed);
    void runReplay(nextSeed);
  }

  return (
    <main className="floorfi-shell px-4 py-6 antialiased sm:px-6 lg:px-8">
      <div className="floorfi-content mx-auto mb-6 flex max-w-7xl items-center justify-between gap-3">
        <Link
          to="/"
          className="inline-flex min-h-10 items-center gap-2 rounded-md text-sm font-semibold text-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          <span className="live-dot" aria-hidden="true" />
          FloorFi
        </Link>
        <Link
          to="/hedge"
          className="glow-button inline-flex min-h-10 items-center rounded-md px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          Open Protection
        </Link>
      </div>

      <div className="floorfi-content mx-auto grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <InputPanel
            values={formState}
            errors={errors}
            isLoading={isLoading}
            hasResult={Boolean(result)}
            onChange={setFormState}
            onSubmit={() => void runReplay()}
            onRunAgain={handleRunAgain}
          />
        </aside>

        <div className="space-y-6">
          {apiError ? (
            <div className="rounded-lg border border-red-300/24 bg-red-400/10 p-4 text-red-100 shadow-sm" role="alert">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-none" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold">Replay unavailable</p>
                  <p className="mt-1 text-sm text-red-50/76">{apiError}</p>
                </div>
              </div>
            </div>
          ) : null}

          <PortfolioChart result={result} isLoading={isLoading} />
          <MetricsPanel metrics={result?.metrics ?? null} isLoading={isLoading} />

          <section className="glass-panel-soft rounded-lg p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-emerald-50">Protection assumptions</h2>
                <div className="mt-3 grid grid-cols-1 gap-3 text-sm leading-6 text-emerald-50/62 md:grid-cols-2">
                  <p>
                    SOL price movement drives the unprotected path. The protected path applies the selected protection
                    level to help offset downside during market stress.
                  </p>
                  <p>
                    Holding yield accrues daily. Protection cost is applied to the protected notional and reflected in
                    the projected outcome.
                  </p>
                </div>
              </div>
              <span className="status-pill inline-flex w-fit rounded-md px-2.5 py-1 text-xs font-semibold">
                Market data: {result?.source === "coingecko" ? "CoinGecko historical feed" : "Stress path"}
              </span>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function buildPayload(
  formState: SimulationFormState,
  seed: string
): { request: SimulationRequest | null; errors: FormErrors } {
  const errors: FormErrors = {};
  const capital = parseDecimal(formState.capital);
  const stakingYield = parseDecimal(formState.stakingYield);
  const fundingRate = parseDecimal(formState.fundingRate);

  if (!Number.isFinite(capital) || capital <= 0) {
    errors.capital = "Enter a portfolio value greater than 0.";
  }

  if (!Number.isFinite(stakingYield)) {
    errors.stakingYield = "Enter a valid annual holding yield.";
  }

  if (!Number.isFinite(fundingRate)) {
    errors.fundingRate = "Enter a valid annual protection cost.";
  }

  if (formState.hedgePercent < 0 || formState.hedgePercent > 100) {
    errors.hedgePercent = "Protection level must be between 0 and 100.";
  }

  if (Object.keys(errors).length > 0) {
    return { request: null, errors };
  }

  return {
    errors,
    request: {
      capital,
      hedgePercent: formState.hedgePercent,
      stakingYield,
      fundingRate,
      days: formState.days,
      mode: formState.mode,
      seed
    }
  };
}

function parseDecimal(value: string): number {
  return Number(value.replace(/,/g, "").trim());
}
