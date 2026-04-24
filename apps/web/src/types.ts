export type SimulationMode = "simulated" | "historical";

export type SimulationDays = 30 | 90 | 365;

export interface SimulationFormState {
  capital: string;
  hedgePercent: number;
  stakingYield: string;
  fundingRate: string;
  days: SimulationDays;
  mode: SimulationMode;
}

export interface SimulationRequest {
  capital: number;
  hedgePercent: number;
  stakingYield: number;
  fundingRate: number;
  days: SimulationDays;
  mode: SimulationMode;
  seed?: string;
}

export interface SimulationMetrics {
  finalUnhedged: number;
  finalHedged: number;
  netReturnUnhedged: number;
  netReturnHedged: number;
  maxDrawdownUnhedged: number;
  maxDrawdownHedged: number;
  annualizedApyUnhedged: number;
  annualizedApyHedged: number;
  protectionBenefit: number;
}

export interface SimulationResponse {
  unhedged: number[];
  hedged: number[];
  metrics: SimulationMetrics;
}

export type FormErrors = Partial<Record<keyof SimulationFormState, string>>;
