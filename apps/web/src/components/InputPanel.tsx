import { Play, RefreshCcw } from "lucide-react";
import type { FormErrors, SimulationDays, SimulationFormState } from "../types";

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
      className="glass-panel rounded-lg p-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      aria-busy={isLoading}
    >
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">Protection inputs</p>
        <h1 className="text-2xl font-semibold tracking-normal text-emerald-50">SOL Protection Replay</h1>
        <p className="text-sm leading-6 text-emerald-50/62">
          Compare holding SOL alone against a protected position designed to reduce downside during sharp selloffs.
        </p>
      </div>

      <div className="mt-6 space-y-5">
        <TextInput
          id="capital"
          label="Portfolio value"
          prefix="$"
          value={values.capital}
          error={errors.capital}
          helperText="Value of SOL holdings to protect."
          inputMode="decimal"
          autoComplete="off"
          onChange={(value) => updateValue("capital", value)}
        />

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="hedgePercent" className="text-sm font-medium text-emerald-50">
              Protection level
            </label>
            <span className="font-mono text-sm text-emerald-200">{values.hedgePercent}%</span>
          </div>
          <input
            id="hedgePercent"
            type="range"
            min="0"
            max="100"
            step="1"
            value={values.hedgePercent}
            onChange={(event) => updateValue("hedgePercent", Number(event.target.value))}
            className="h-10 w-full accent-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          />
          {errors.hedgePercent ? (
            <p id="hedgePercent-error" className="text-xs text-red-300">
              {errors.hedgePercent}
            </p>
          ) : (
            <p className="text-xs text-emerald-50/54">0% keeps full SOL exposure. 100% targets full downside offset.</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <TextInput
            id="stakingYield"
            label="Holding yield"
            suffix="%"
            value={values.stakingYield}
            error={errors.stakingYield}
            helperText="Annual yield applied to long-term SOL holdings."
            inputMode="decimal"
            autoComplete="off"
            onChange={(value) => updateValue("stakingYield", value)}
          />
          <TextInput
            id="fundingRate"
            label="Protection cost"
            suffix="%"
            value={values.fundingRate}
            error={errors.fundingRate}
            helperText="Annual cost assumption used in projections."
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

        <div className="rounded-md border border-emerald-300/16 bg-emerald-300/8 p-3">
          <p className="text-sm font-medium text-emerald-50">Historical Crash Replay</p>
          <p className="mt-1 text-xs leading-5 text-emerald-50/56">
            Uses historical SOL market paths to compare protected and unprotected outcomes.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <button
          type="submit"
          disabled={isLoading}
          className="glow-button inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Play className="h-4 w-4" aria-hidden="true" />
          {isLoading ? "Running" : "Run Replay"}
        </button>
        <button
          type="button"
          disabled={isLoading || !hasResult}
          onClick={onRunAgain}
          className="dark-button inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCcw className="h-4 w-4" aria-hidden="true" />
          Refresh Path
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
      <label htmlFor={id} className="text-sm font-medium text-emerald-50">
        {label}
      </label>
      <div className="relative">
        {prefix ? (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-emerald-50/52">
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
          className={`min-h-11 w-full rounded-md border bg-black/28 px-3 py-2 text-sm text-emerald-50 shadow-sm transition duration-150 ease-out placeholder:text-emerald-50/36 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
            prefix ? "pl-7" : ""
          } ${suffix ? "pr-9" : ""} ${error ? "border-red-400/70" : "border-emerald-300/18"}`}
        />
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-emerald-50/52">
            {suffix}
          </span>
        ) : null}
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-xs text-red-300">
          {error}
        </p>
      ) : (
        <p id={`${id}-hint`} className="text-xs text-emerald-50/52">
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
      <legend className="text-sm font-medium text-emerald-50">{legend}</legend>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <button
              key={String(option.value)}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onChange(option.value)}
              className={`min-h-10 rounded-md border px-3 py-2 text-sm font-medium transition duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                isSelected
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
