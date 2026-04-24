import type { SimulationMetrics, SimulationRequest, SimulationResponse } from "../types.js";

const DEFAULT_START_PRICE = 160;
const DEFAULT_ANNUAL_DRIFT = 0.04;
const DEFAULT_ANNUAL_VOLATILITY = 0.85;

export function generateSimulatedPrices(days: number, seed: string): number[] {
  const random = createSeededRandom(seed);
  const prices = [DEFAULT_START_PRICE];
  const dailyDrift = (DEFAULT_ANNUAL_DRIFT - 0.5 * DEFAULT_ANNUAL_VOLATILITY ** 2) / 365;
  const dailyVolatility = DEFAULT_ANNUAL_VOLATILITY / Math.sqrt(365);

  for (let day = 1; day <= days; day += 1) {
    const shock = randomNormal(random) * dailyVolatility;
    const nextPrice = prices[day - 1] * Math.exp(dailyDrift + shock);
    prices.push(Math.max(nextPrice, 0.01));
  }

  return prices;
}

export function runSimulation(input: SimulationRequest, prices: number[]): SimulationResponse {
  if (prices.length < input.days + 1) {
    throw new Error(`Expected at least ${input.days + 1} prices, received ${prices.length}.`);
  }

  const hedgeRatio = input.hedgePercent / 100;
  const stakingRate = input.stakingYield / 100;
  const fundingRate = input.fundingRate / 100;
  const dailyStaking = input.capital * (stakingRate / 365);
  const dailyFunding = input.capital * hedgeRatio * (fundingRate / 365);

  let unhedgedValue = input.capital;
  let hedgedValue = input.capital;

  const unhedgedHistory = [input.capital];
  const hedgedHistory = [input.capital];

  for (let day = 1; day <= input.days; day += 1) {
    const yesterday = prices[day - 1];
    const today = prices[day];
    const priceChange = (today - yesterday) / yesterday;

    const spotPnL = input.capital * priceChange;
    const hedgePnL = -input.capital * hedgeRatio * priceChange;

    unhedgedValue += spotPnL + dailyStaking;
    hedgedValue += spotPnL + hedgePnL + dailyStaking - dailyFunding;

    unhedgedHistory.push(roundCurrency(unhedgedValue));
    hedgedHistory.push(roundCurrency(hedgedValue));
  }

  return {
    unhedged: unhedgedHistory,
    hedged: hedgedHistory,
    metrics: calculateMetrics(input.capital, input.days, unhedgedHistory, hedgedHistory)
  };
}

function calculateMetrics(
  initialCapital: number,
  days: number,
  unhedgedHistory: number[],
  hedgedHistory: number[]
): SimulationMetrics {
  const finalUnhedged = unhedgedHistory[unhedgedHistory.length - 1];
  const finalHedged = hedgedHistory[hedgedHistory.length - 1];
  const netReturnUnhedged = finalUnhedged - initialCapital;
  const netReturnHedged = finalHedged - initialCapital;

  return {
    finalUnhedged: roundCurrency(finalUnhedged),
    finalHedged: roundCurrency(finalHedged),
    netReturnUnhedged: roundCurrency(netReturnUnhedged),
    netReturnHedged: roundCurrency(netReturnHedged),
    maxDrawdownUnhedged: roundRate(maxDrawdown(unhedgedHistory)),
    maxDrawdownHedged: roundRate(maxDrawdown(hedgedHistory)),
    annualizedApyUnhedged: roundRate(((finalUnhedged / initialCapital) - 1) * (365 / days)),
    annualizedApyHedged: roundRate(((finalHedged / initialCapital) - 1) * (365 / days)),
    protectionBenefit: roundCurrency(netReturnHedged - netReturnUnhedged)
  };
}

function maxDrawdown(values: number[]): number {
  let peak = values[0];
  let worstDrawdown = 0;

  for (const value of values) {
    peak = Math.max(peak, value);
    worstDrawdown = Math.max(worstDrawdown, (peak - value) / peak);
  }

  return worstDrawdown;
}

function createSeededRandom(seed: string): () => number {
  let state = hashSeed(seed);

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function hashSeed(seed: string): number {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function randomNormal(random: () => number): number {
  const u1 = Math.max(random(), Number.EPSILON);
  const u2 = random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundRate(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
