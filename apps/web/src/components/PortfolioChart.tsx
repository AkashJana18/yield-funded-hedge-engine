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
    result?.unhedged.map((unprotected, day) => ({
      day,
      unprotected,
      protected: result.hedged[day]
    })) ?? [];

  return (
    <section className="glass-panel rounded-lg p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">Historical performance</p>
          <h2 className="text-xl font-semibold text-emerald-50">Protected vs unprotected SOL</h2>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <span className="rounded-md border border-red-300/18 bg-red-400/10 px-2 py-1 text-red-200">Unprotected</span>
          <span className="rounded-md border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-emerald-200">Protected</span>
        </div>
      </div>

      <div className="mt-5 h-[360px] min-h-[280px]">
        {isLoading ? <ChartSkeleton /> : null}

        {!isLoading && chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-md border border-dashed border-emerald-300/18 bg-emerald-300/6 px-6 text-center text-sm text-emerald-50/62">
            Run a replay to see daily portfolio values.
          </div>
        ) : null}

        {!isLoading && chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 18, left: 8, bottom: 8 }}>
              <CartesianGrid stroke="rgb(74 222 128 / 0.12)" vertical={false} />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "rgb(187 247 208 / 0.62)", fontSize: 12 }}
                label={{
                  value: "Day",
                  position: "insideBottom",
                  offset: -4,
                  fill: "rgb(187 247 208 / 0.62)",
                  fontSize: 12
                }}
              />
              <YAxis
                tickFormatter={formatCurrency}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "rgb(187 247 208 / 0.62)", fontSize: 12 }}
                width={86}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatCurrencyPrecise(value),
                  name === "protected" ? "Protected" : "Unprotected"
                ]}
                labelFormatter={(day) => `Day ${day}`}
                contentStyle={{
                  background: "rgb(2 8 5 / 0.96)",
                  borderRadius: 8,
                  borderColor: "rgb(74 222 128 / 0.22)",
                  boxShadow: "0 18px 50px rgb(0 0 0 / 0.38)",
                  color: "rgb(236 253 245)"
                }}
                labelStyle={{ color: "rgb(236 253 245)" }}
              />
              <Legend verticalAlign="top" height={32} />
              <Line
                type="monotone"
                dataKey="unprotected"
                name="Unprotected"
                stroke="rgb(var(--chart-unhedged))"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="protected"
                name="Protected"
                stroke="rgb(var(--chart-hedged))"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
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
    <div className="chart-surface h-full rounded-md border border-emerald-300/14 p-5">
      <div className="h-full animate-pulse space-y-6">
        <div className="h-4 w-40 rounded bg-emerald-300/12" />
        <div className="grid h-[260px] grid-cols-6 items-end gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="rounded bg-emerald-300/14"
              style={{ height: `${40 + index * 9}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
