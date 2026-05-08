import { TOKENS, type SupportedTokenSymbol } from "../constants.js";

export interface JupiterQuoteRequest {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps: number;
}

export interface JupiterQuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: "ExactIn" | "ExactOut";
  slippageBps: number;
  priceImpactPct: string;
  routePlan: Array<{
    percent: number;
    swapInfo: {
      ammKey: string;
      label?: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
  }>;
}

export interface JupiterSwapTransactionRequest {
  userPublicKey: string;
  quoteResponse: JupiterQuoteResponse;
  dynamicComputeUnitLimit?: boolean;
  prioritizationFeeLamports?: "auto" | number;
}

export interface JupiterSwapTransactionResponse {
  swapTransaction: string;
  lastValidBlockHeight?: number;
  prioritizationFeeLamports?: number;
  computeUnitLimit?: number;
  prioritizationType?: unknown;
  simulationError?: unknown;
}

export interface SwapQuoteSummary {
  inputSymbol: SupportedTokenSymbol;
  outputSymbol: SupportedTokenSymbol;
  inputAmount: number;
  expectedOutputAmount: number;
  minimumOutputAmount: number;
  slippageBps: number;
  priceImpactPct: number;
  route: Array<{
    label: string;
    percent: number;
    feeAmount: number;
    feeSymbol: SupportedTokenSymbol | string;
  }>;
  rawQuote: JupiterQuoteResponse;
}

export class SwapService {
  private readonly baseUrl = process.env.JUPITER_BASE_URL ?? "https://lite-api.jup.ag/swap/v1";
  private readonly apiKey = process.env.JUPITER_API_KEY;

  async quoteUsdcToSol(amountUsdc: number, slippageBps: number): Promise<SwapQuoteSummary> {
    return this.quote({
      inputSymbol: "USDC",
      outputSymbol: "SOL",
      amountRaw: toRawAmount(amountUsdc, TOKENS.USDC.decimals),
      slippageBps
    });
  }

  async quote(input: {
    inputSymbol: SupportedTokenSymbol;
    outputSymbol: SupportedTokenSymbol;
    amountRaw: string;
    slippageBps: number;
  }): Promise<SwapQuoteSummary> {
    const inputToken = TOKENS[input.inputSymbol];
    const outputToken = TOKENS[input.outputSymbol];
    const params = new URLSearchParams({
      inputMint: inputToken.mint,
      outputMint: outputToken.mint,
      amount: input.amountRaw,
      slippageBps: String(input.slippageBps),
      swapMode: "ExactIn"
    });

    const response = await this.fetchJupiter<JupiterQuoteResponse>(`quote?${params.toString()}`);

    return summarizeQuote(response, input.inputSymbol, input.outputSymbol);
  }

  async buildSwapTransaction(input: JupiterSwapTransactionRequest): Promise<JupiterSwapTransactionResponse> {
    return this.fetchJupiter<JupiterSwapTransactionResponse>("swap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userPublicKey: input.userPublicKey,
        quoteResponse: input.quoteResponse,
        dynamicComputeUnitLimit: input.dynamicComputeUnitLimit ?? true,
        prioritizationFeeLamports: input.prioritizationFeeLamports ?? "auto"
      })
    });
  }

  private async fetchJupiter<TResponse>(path: string, init: RequestInit = {}): Promise<TResponse> {
    const headers = new Headers(init.headers);
    headers.set("accept", "application/json");

    if (this.apiKey) {
      headers.set("x-api-key", this.apiKey);
    }

    const response = await fetch(new URL(`${this.baseUrl.replace(/\/$/, "")}/${path}`), { ...init, headers });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Jupiter request failed with ${response.status}: ${body || response.statusText}`);
    }

    return (await response.json()) as TResponse;
  }
}

function summarizeQuote(
  quote: JupiterQuoteResponse,
  inputSymbol: SupportedTokenSymbol,
  outputSymbol: SupportedTokenSymbol
): SwapQuoteSummary {
  const inputToken = TOKENS[inputSymbol];
  const outputToken = TOKENS[outputSymbol];

  return {
    inputSymbol,
    outputSymbol,
    inputAmount: fromRawAmount(quote.inAmount, inputToken.decimals),
    expectedOutputAmount: fromRawAmount(quote.outAmount, outputToken.decimals),
    minimumOutputAmount: fromRawAmount(quote.otherAmountThreshold, outputToken.decimals),
    slippageBps: quote.slippageBps,
    priceImpactPct: Number(quote.priceImpactPct),
    route: quote.routePlan.map((leg) => ({
      label: leg.swapInfo.label ?? "Unknown venue",
      percent: leg.percent,
      feeAmount: leg.swapInfo.feeAmount
        ? fromRawAmount(leg.swapInfo.feeAmount, getDecimalsByMint(leg.swapInfo.feeMint))
        : 0,
      feeSymbol: leg.swapInfo.feeMint ? getSymbolByMint(leg.swapInfo.feeMint) : inputSymbol
    })),
    rawQuote: quote
  };
}

function toRawAmount(value: number, decimals: number): string {
  return Math.round(value * 10 ** decimals).toString();
}

function fromRawAmount(value: string, decimals: number): number {
  return Number(value) / 10 ** decimals;
}

function getDecimalsByMint(mint: string): number {
  return Object.values(TOKENS).find((token) => token.mint === mint)?.decimals ?? 9;
}

function getSymbolByMint(mint: string): SupportedTokenSymbol | string {
  return Object.values(TOKENS).find((token) => token.mint === mint)?.symbol ?? mint;
}
