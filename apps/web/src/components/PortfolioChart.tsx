import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { SimulationResponse } from "../types";
import { formatCurrency, formatCurrencyPrecise } from "../utils/format";

interface PortfolioChartProps {
  result: SimulationResponse | null;
  isLoading: boolean;
}

export function PortfolioChart({ result, isLoading }: PortfolioChartProps) {
  const chartData =
    result?.unhedged.map((unhedged, day) => ({
      day,
      unhedged,
      hedged: result.hedged[day]
    })) ?? [];

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Portfolio value</p>
          <h2 className="text-xl font-semibold text-neutral-950">Unhedged vs hedged SOL</h2>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <span className="rounded-md bg-red-50 px-2 py-1 text-red-700">Unhedged</span>
          <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">Hedged</span>
        </div>
      </div>

      <div className="mt-5 h-[360px] min-h-[280px]">
        {isLoading ? <ChartSkeleton /> : null}

        {!isLoading && chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-md border border-dashed border-neutral-300 bg-neutral-50 px-6 text-center text-sm text-neutral-600">
            Run a simulation to see daily portfolio values.
          </div>
        ) : null}

        {!isLoading && chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 18, left: 8, bottom: 8 }}>
              <CartesianGrid stroke="rgb(229 229 229)" vertical={false} />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "rgb(82 82 82)", fontSize: 12 }}
                label={{
                  value: "Day",
                  position: "insideBottom",
                  offset: -4,
                  fill: "rgb(82 82 82)",
                  fontSize: 12
                }}
              />
              <YAxis
                tickFormatter={formatCurrency}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "rgb(82 82 82)", fontSize: 12 }}
                width={86}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatCurrencyPrecise(value),
                  name === "hedged" ? "Hedged" : "Unhedged"
                ]}
                labelFormatter={(day) => `Day ${day}`}
                contentStyle={{
                  borderRadius: 8,
                  borderColor: "rgb(212 212 212)",
                  boxShadow: "0 10px 20px rgb(0 0 0 / 0.08)"
                }}
              />
              <Legend verticalAlign="top" height={32} />
              <Line
                type="monotone"
                dataKey="unhedged"
                stroke="rgb(var(--chart-unhedged))"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5 }}
                isAnimationActive
              />
              <Line
                type="monotone"
                dataKey="hedged"
                stroke="rgb(var(--chart-hedged))"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5 }}
                isAnimationActive
              />
            </LineChart>
          </ResponsiveContainer>
        ) : null}
      </div>
    </section>
  );
}

function ChartSkeleton() {
  return (
    <div className="h-full rounded-md border border-neutral-200 bg-neutral-50 p-5">
      <div className="h-full animate-pulse space-y-6">
        <div className="h-4 w-40 rounded bg-neutral-200" />
        <div className="grid h-[260px] grid-cols-6 items-end gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="rounded bg-neutral-200"
              style={{ height: `${40 + index * 9}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
