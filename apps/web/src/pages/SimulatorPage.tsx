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
  mode: "simulated"
};

export function SimulatorPage() {
  const [formState, setFormState] = useState<SimulationFormState>(defaultFormState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [seed, setSeed] = useState("sol-yield-funded-hedge");
  const activeRequest = useRef<AbortController | null>(null);

  const runSimulation = useCallback(
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

        setApiError(error instanceof Error ? error.message : "Unable to run simulation.");
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
    void runSimulation(seed);

    return () => {
      activeRequest.current?.abort();
    };
  }, []);

  function handleRunAgain() {
    const nextSeed = `sol-run-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setSeed(nextSeed);
    void runSimulation(nextSeed);
  }

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-6 text-neutral-950 antialiased sm:px-6 lg:px-8">
      <div className="mx-auto mb-6 flex max-w-7xl items-center justify-between gap-3">
        <Link to="/" className="text-sm font-semibold text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">
          FloorFi
        </Link>
        <Link
          to="/hedge"
          className="inline-flex min-h-10 items-center rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2"
        >
          Preview hedge
        </Link>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <InputPanel
            values={formState}
            errors={errors}
            isLoading={isLoading}
            hasResult={Boolean(result)}
            onChange={setFormState}
            onSubmit={() => void runSimulation()}
            onRunAgain={handleRunAgain}
          />
        </aside>

        <div className="space-y-6">
          {apiError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 shadow-sm" role="alert">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-none" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold">Simulation failed</p>
                  <p className="mt-1 text-sm">{apiError}</p>
                  {formState.mode === "historical" ? (
                    <p className="mt-1 text-sm">
                      Historical mode uses CoinGecko replay data. Retry in a moment if the public API is unavailable.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <PortfolioChart result={result} isLoading={isLoading} />
          <MetricsPanel metrics={result?.metrics ?? null} isLoading={isLoading} />

          <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-neutral-950">Model assumptions</h2>
                <div className="mt-3 grid gap-3 text-sm leading-6 text-neutral-600 md:grid-cols-2">
                  <p>
                    Daily spot PnL uses the selected capital multiplied by SOL price change. The short hedge offsets
                    that price movement by the selected hedge percentage.
                  </p>
                  <p>
                    Staking yield accrues daily on capital. Funding cost accrues daily on the hedged notional and is
                    subtracted from the hedged portfolio.
                  </p>
                </div>
              </div>
              <span className="inline-flex w-fit rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                Data source: {result?.source === "simulated" ? "Simulated" : "CoinGecko"}
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
    errors.capital = "Enter capital greater than 0.";
  }

  if (!Number.isFinite(stakingYield)) {
    errors.stakingYield = "Enter a valid annual staking percentage.";
  }

  if (!Number.isFinite(fundingRate)) {
    errors.fundingRate = "Enter a valid annual funding percentage.";
  }

  if (formState.hedgePercent < 0 || formState.hedgePercent > 100) {
    errors.hedgePercent = "Hedge percentage must be between 0 and 100.";
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
