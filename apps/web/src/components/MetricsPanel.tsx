import { ArrowDownToLine, BadgeDollarSign, LineChart, ShieldCheck, TrendingUp } from "lucide-react";
import type { SimulationMetrics } from "../types";
import {
  formatCurrencyPrecise,
  formatPercent,
  formatSignedCurrency,
  formatSignedPercent
} from "../utils/format";

interface MetricsPanelProps {
  metrics: SimulationMetrics | null;
  isLoading: boolean;
}

export function MetricsPanel({ metrics, isLoading }: MetricsPanelProps) {
  if (isLoading) {
    return <MetricsSkeleton />;
  }

  if (!metrics) {
    return (
      <section className="glass-panel-soft rounded-lg border-dashed p-6 text-sm text-emerald-50/62">
        Protection metrics appear after the first run.
      </section>
    );
  }

  const protectionImprovedOutcome = metrics.protectionBenefit > 0;

  return (
    <section className="space-y-4">
      <div
        className={`rounded-lg border p-4 shadow-sm ${
          protectionImprovedOutcome
            ? "border-emerald-300/24 bg-emerald-300/10 text-emerald-50"
            : "border-amber-300/24 bg-amber-300/10 text-amber-50"
        }`}
      >
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 flex-none text-emerald-300" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold">
              {protectionImprovedOutcome ? "Protection improved outcome" : "Market exposure led outcome"}
            </p>
            <p className="mt-1 text-sm text-emerald-50/70">
              Protection benefit: {formatSignedCurrency(metrics.protectionBenefit)} versus holding SOL without a floor.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<BadgeDollarSign className="h-5 w-5" aria-hidden="true" />}
          label="Without protection"
          value={formatCurrencyPrecise(metrics.finalUnhedged)}
          detail={formatSignedCurrency(metrics.netReturnUnhedged)}
          tone="red"
        />
        <MetricCard
          icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
          label="With protection"
          value={formatCurrencyPrecise(metrics.finalHedged)}
          detail={formatSignedCurrency(metrics.netReturnHedged)}
          tone="green"
        />
        <MetricCard
          icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />}
          label="Projected return"
          value={formatSignedPercent(metrics.annualizedApyHedged)}
          detail={`Unprotected ${formatSignedPercent(metrics.annualizedApyUnhedged)}`}
          tone="neutral"
        />
        <MetricCard
          icon={<ArrowDownToLine className="h-5 w-5" aria-hidden="true" />}
          label="Max drawdown"
          value={formatPercent(metrics.maxDrawdownHedged)}
          detail={`Unprotected ${formatPercent(metrics.maxDrawdownUnhedged)}`}
          tone="neutral"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <MetricCard
          icon={<LineChart className="h-5 w-5" aria-hidden="true" />}
          label="Protected APY"
          value={formatSignedPercent(metrics.annualizedApyHedged)}
          detail="Annualized over the selected period"
          tone="green"
        />
        <MetricCard
          icon={<LineChart className="h-5 w-5" aria-hidden="true" />}
          label="Unprotected APY"
          value={formatSignedPercent(metrics.annualizedApyUnhedged)}
          detail="Annualized over the selected period"
          tone="red"
        />
      </div>
    </section>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: "green" | "red" | "neutral";
}

function MetricCard({ icon, label, value, detail, tone }: MetricCardProps) {
  const toneClass =
    tone === "green"
      ? "border-emerald-300/22 bg-emerald-300/10 text-emerald-300"
      : tone === "red"
        ? "border-red-300/20 bg-red-400/10 text-red-300"
        : "border-emerald-300/16 bg-emerald-50/6 text-emerald-100";

  return (
    <article className="glass-panel-soft rounded-lg p-4 transition duration-150 ease-out hover:-translate-y-0.5 hover:border-emerald-300/26">
      <div className={`flex h-10 w-10 items-center justify-center rounded-md border ${toneClass}`}>{icon}</div>
      <p className="mt-4 text-sm font-medium text-emerald-50/62">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold text-emerald-50 tabular-nums">{value}</p>
      <p className="mt-2 text-sm text-emerald-50/56">{detail}</p>
    </article>
  );
}

function MetricsSkeleton() {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="glass-panel-soft rounded-lg p-4">
          <div className="h-10 w-10 animate-pulse rounded-md bg-emerald-300/12" />
          <div className="mt-4 h-4 w-28 animate-pulse rounded bg-emerald-300/12" />
          <div className="mt-3 h-8 w-36 animate-pulse rounded bg-emerald-300/14" />
          <div className="mt-3 h-4 w-32 animate-pulse rounded bg-emerald-300/12" />
        </div>
      ))}
    </section>
  );
}
