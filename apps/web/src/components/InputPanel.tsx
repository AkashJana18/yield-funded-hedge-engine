import { Play, RefreshCcw } from "lucide-react";
import type { FormErrors, SimulationDays, SimulationFormState, SimulationMode } from "../types";

interface InputPanelProps {
  values: SimulationFormState;
  errors: FormErrors;
  isLoading: boolean;
  hasResult: boolean;
  onChange: (values: SimulationFormState) => void;
  onSubmit: () => void;
  onRunAgain: () => void;
}

const periods: Array<{ label: string; value: SimulationDays }> = [
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
  { label: "365 days", value: 365 }
];

const modes: Array<{ label: string; value: SimulationMode }> = [
  { label: "Simulated", value: "simulated" },
  { label: "Historical", value: "historical" }
];

export function InputPanel({
  values,
  errors,
  isLoading,
  hasResult,
  onChange,
  onSubmit,
  onRunAgain
}: InputPanelProps) {
  function updateValue<Key extends keyof SimulationFormState>(key: Key, value: SimulationFormState[Key]) {
    onChange({ ...values, [key]: value });
  }

  return (
    <form
      className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      aria-busy={isLoading}
    >
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Strategy inputs</p>
        <h1 className="text-2xl font-semibold tracking-normal text-neutral-950">SOL hedge simulator</h1>
        <p className="text-sm leading-6 text-neutral-600">
          Compare spot SOL exposure against a spot plus short perp hedge funded by yield.
        </p>
      </div>

      <div className="mt-6 space-y-5">
        <TextInput
          id="capital"
          label="Capital"
          prefix="$"
          value={values.capital}
          error={errors.capital}
          helperText="Initial notional used for spot and hedge PnL."
          inputMode="decimal"
          autoComplete="off"
          onChange={(value) => updateValue("capital", value)}
        />

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="hedgePercent" className="text-sm font-medium text-neutral-900">
              Hedge percentage
            </label>
            <span className="font-mono text-sm text-neutral-700">{values.hedgePercent}%</span>
          </div>
          <input
            id="hedgePercent"
            type="range"
            min="0"
            max="100"
            step="1"
            value={values.hedgePercent}
            onChange={(event) => updateValue("hedgePercent", Number(event.target.value))}
            className="h-10 w-full accent-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          />
          {errors.hedgePercent ? (
            <p id="hedgePercent-error" className="text-xs text-red-700">
              {errors.hedgePercent}
            </p>
          ) : (
            <p className="text-xs text-neutral-600">0% keeps full SOL beta. 100% offsets spot price movement.</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <TextInput
            id="stakingYield"
            label="Staking yield"
            suffix="%"
            value={values.stakingYield}
            error={errors.stakingYield}
            helperText="Annualized yield accrued daily on capital."
            inputMode="decimal"
            autoComplete="off"
            onChange={(value) => updateValue("stakingYield", value)}
          />
          <TextInput
            id="fundingRate"
            label="Funding rate"
            suffix="%"
            value={values.fundingRate}
            error={errors.fundingRate}
            helperText="Annualized funding cost on hedged notional."
            inputMode="decimal"
            autoComplete="off"
            onChange={(value) => updateValue("fundingRate", value)}
          />
        </div>

        <SegmentedControl
          legend="Time period"
          options={periods}
          value={values.days}
          onChange={(value) => updateValue("days", value)}
        />

        <SegmentedControl
          legend="Mode"
          options={modes}
          value={values.mode}
          onChange={(value) => updateValue("mode", value)}
        />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Play className="h-4 w-4" aria-hidden="true" />
          {isLoading ? "Running" : "Simulate"}
        </button>
        <button
          type="button"
          disabled={isLoading || !hasResult}
          onClick={onRunAgain}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCcw className="h-4 w-4" aria-hidden="true" />
          Run Again
        </button>
      </div>
    </form>
  );
}

interface TextInputProps {
  id: keyof SimulationFormState;
  label: string;
  value: string;
  error?: string;
  helperText: string;
  prefix?: string;
  suffix?: string;
  inputMode: "decimal" | "numeric";
  autoComplete: string;
  onChange: (value: string) => void;
}

function TextInput({
  id,
  label,
  value,
  error,
  helperText,
  prefix,
  suffix,
  inputMode,
  autoComplete,
  onChange
}: TextInputProps) {
  const describedBy = error ? `${id}-error` : `${id}-hint`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-neutral-900">
        {label}
      </label>
      <div className="relative">
        {prefix ? (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-neutral-500">
            {prefix}
          </span>
        ) : null}
        <input
          id={id}
          value={value}
          type="text"
          inputMode={inputMode}
          autoComplete={autoComplete}
          spellCheck={false}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
          className={`min-h-11 w-full rounded-md border bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm transition placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 ${
            prefix ? "pl-7" : ""
          } ${suffix ? "pr-9" : ""} ${error ? "border-red-500" : "border-neutral-300"}`}
        />
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-neutral-500">
            {suffix}
          </span>
        ) : null}
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-xs text-red-700">
          {error}
        </p>
      ) : (
        <p id={`${id}-hint`} className="text-xs text-neutral-600">
          {helperText}
        </p>
      )}
    </div>
  );
}

interface SegmentedControlProps<TValue extends string | number> {
  legend: string;
  options: Array<{ label: string; value: TValue }>;
  value: TValue;
  onChange: (value: TValue) => void;
}

function SegmentedControl<TValue extends string | number>({
  legend,
  options,
  value,
  onChange
}: SegmentedControlProps<TValue>) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-neutral-900">{legend}</legend>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <button
              key={String(option.value)}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onChange(option.value)}
              className={`min-h-10 rounded-md border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 ${
                isSelected
                  ? "border-emerald-600 bg-emerald-50 text-emerald-800"
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
