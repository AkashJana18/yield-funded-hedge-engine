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
      <section className="rounded-lg border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-600">
        Metrics will appear after the first run.
      </section>
    );
  }

  const hedgedOutperforms = metrics.protectionBenefit > 0;

  return (
    <section className="space-y-4">
      <div
        className={`rounded-lg border p-4 shadow-sm ${
          hedgedOutperforms
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
            : "border-amber-200 bg-amber-50 text-amber-950"
        }`}
      >
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 flex-none" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold">
              {hedgedOutperforms ? "Hedged outperformed" : "Unhedged outperformed"}
            </p>
            <p className="mt-1 text-sm">
              Protection benefit: {formatSignedCurrency(metrics.protectionBenefit)} versus the unhedged path.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<BadgeDollarSign className="h-5 w-5" aria-hidden="true" />}
          label="Final unhedged"
          value={formatCurrencyPrecise(metrics.finalUnhedged)}
          detail={formatSignedCurrency(metrics.netReturnUnhedged)}
          tone="red"
        />
        <MetricCard
          icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
          label="Final hedged"
          value={formatCurrencyPrecise(metrics.finalHedged)}
          detail={formatSignedCurrency(metrics.netReturnHedged)}
          tone="green"
        />
        <MetricCard
          icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />}
          label="Net APY"
          value={formatSignedPercent(metrics.annualizedApyHedged)}
          detail={`Unhedged ${formatSignedPercent(metrics.annualizedApyUnhedged)}`}
          tone="neutral"
        />
        <MetricCard
          icon={<ArrowDownToLine className="h-5 w-5" aria-hidden="true" />}
          label="Max drawdown"
          value={formatPercent(metrics.maxDrawdownHedged)}
          detail={`Unhedged ${formatPercent(metrics.maxDrawdownUnhedged)}`}
          tone="neutral"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard
          icon={<LineChart className="h-5 w-5" aria-hidden="true" />}
          label="Hedged APY"
          value={formatSignedPercent(metrics.annualizedApyHedged)}
          detail="Annualized over the selected period"
          tone="green"
        />
        <MetricCard
          icon={<LineChart className="h-5 w-5" aria-hidden="true" />}
          label="Unhedged APY"
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
      ? "bg-emerald-50 text-emerald-700"
      : tone === "red"
        ? "bg-red-50 text-red-700"
        : "bg-neutral-100 text-neutral-700";

  return (
    <article className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <div className={`flex h-10 w-10 items-center justify-center rounded-md ${toneClass}`}>{icon}</div>
      <p className="mt-4 text-sm font-medium text-neutral-600">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold text-neutral-950">{value}</p>
      <p className="mt-2 text-sm text-neutral-600">{detail}</p>
    </article>
  );
}

function MetricsSkeleton() {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="h-10 w-10 animate-pulse rounded-md bg-neutral-200" />
          <div className="mt-4 h-4 w-28 animate-pulse rounded bg-neutral-200" />
          <div className="mt-3 h-8 w-36 animate-pulse rounded bg-neutral-200" />
          <div className="mt-3 h-4 w-32 animate-pulse rounded bg-neutral-200" />
        </div>
      ))}
    </section>
  );
}
