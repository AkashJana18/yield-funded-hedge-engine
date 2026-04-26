import { ArrowRight, BarChart3, RadioTower, ShieldCheck, TriangleAlert } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  {
    title: "Real market data by Birdeye",
    body: "Live SOL price and historical series feed the simulator and hedge preview.",
    icon: RadioTower
  },
  {
    title: "Flash Trade adapter",
    body: "Preview short SOL perp protection through a venue interface built for safe execution.",
    icon: ShieldCheck
  },
  {
    title: "Risk before execution",
    body: "See liquidation distance, margin, funding cost, net APY, and protection benefit first.",
    icon: BarChart3
  }
];

export function LandingPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white antialiased">
      <section className="relative overflow-hidden border-b border-white/10">
        <MarketBackdrop />
        <div className="relative mx-auto flex min-h-[88vh] max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-between">
            <Link
              to="/"
              className="text-sm font-semibold tracking-wide text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
            >
              FloorFi
            </Link>
            <div className="flex items-center gap-2">
              <Link
                to="/app"
                className="inline-flex min-h-10 items-center rounded-md px-3 text-sm font-semibold text-neutral-200 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
              >
                Simulator
              </Link>
              <Link
                to="/hedge"
                className="inline-flex min-h-10 items-center rounded-md bg-emerald-400 px-4 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
              >
                Hedge
              </Link>
            </div>
          </nav>

          <div className="grid flex-1 items-center gap-10 py-14 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.65fr)]">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">FloorFi</p>
              <h1 className="mt-5 text-5xl font-semibold tracking-normal text-white sm:text-6xl lg:text-7xl">
                Put a floor under your SOL.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-300">
                Simulate and preview yield-funded downside protection using real Solana market data.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/app"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
                >
                  Launch Simulator
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/hedge"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
                >
                  Preview One-Click Hedge
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-neutral-900/85 p-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-neutral-200">Protection preview</p>
                <span className="rounded-md bg-emerald-400/15 px-2.5 py-1 text-xs font-semibold text-emerald-200">
                  Paper Mode
                </span>
              </div>
              <div className="mt-6 space-y-4">
                <PreviewRow label="SOL protected" value="$10,000" />
                <PreviewRow label="Short hedge" value="50%" />
                <PreviewRow label="Liquidation distance" value="45.00%" tone="green" />
                <PreviewRow label="Estimated net APY" value="+5.00%" tone="green" />
              </div>
              <div className="mt-6 rounded-md border border-amber-300/20 bg-amber-300/10 p-3 text-sm leading-6 text-amber-100">
                <div className="flex gap-2">
                  <TriangleAlert className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
                  <p>Simulation and paper trading only unless live mode is explicitly enabled.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-10 sm:px-6 md:grid-cols-3 lg:px-8">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <article key={feature.title} className="rounded-lg border border-white/10 bg-neutral-900 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-400/15 text-emerald-300">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-white">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-400">{feature.body}</p>
            </article>
          );
        })}
      </section>
    </main>
  );
}

function MarketBackdrop() {
  const bars = [42, 58, 50, 71, 63, 78, 69, 84, 74, 88, 82, 92];

  return (
    <div className="absolute inset-0 opacity-60" aria-hidden="true">
      <div className="absolute inset-0 bg-neutral-950" />
      <div className="absolute bottom-0 right-0 flex h-2/3 w-full items-end justify-end gap-3 px-8">
        {bars.map((height, index) => (
          <div
            key={index}
            className="w-8 rounded-t-md border border-emerald-300/15 bg-emerald-300/10"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function PreviewRow({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "green" | "neutral" }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-white/10 pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-neutral-400">{label}</span>
      <span className={`font-mono text-lg font-semibold ${tone === "green" ? "text-emerald-300" : "text-white"}`}>
        {value}
      </span>
    </div>
  );
}
