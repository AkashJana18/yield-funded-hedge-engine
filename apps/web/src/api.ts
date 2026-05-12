import type {
  HedgePreviewRequest,
  HedgePreviewResponse,
  FlashHedgeTransactionResponse,
  OpenHedgeRequest,
  OpenHedgeResponse,
  HedgeRoutesRequest,
  HedgeRoutesResponse,
  PaperExecuteHedgeRequest,
  PaperExecuteHedgeResponse,
  PortfolioMetrics,
  SimulationRequest,
  SimulationResponse,
  SolLivePrice,
  StakeAsset,
  StakePreview,
  StakeTransactionResponse,
  SupportedTokenSymbol,
  SwapQuoteSummary,
  SwapTransactionResponse,
  TokenPricesResponse,
  VenuePosition,
  WalletBalanceResponse
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? getDefaultApiBaseUrl();

export async function simulatePortfolio(
  payload: SimulationRequest,
  signal?: AbortSignal
): Promise<SimulationResponse> {
  return postJson<SimulationResponse>("/api/simulate", payload, signal);
}

export async function fetchSolLivePrice(signal?: AbortSignal): Promise<SolLivePrice> {
  return getJson<SolLivePrice>("/api/market/live", signal);
}

export async function fetchTokenPrices(
  symbols: SupportedTokenSymbol[],
  signal?: AbortSignal
): Promise<TokenPricesResponse> {
  return getJson<TokenPricesResponse>(`/api/market/tokens/prices?symbols=${symbols.join(",")}`, signal);
}

export async function previewHedge(
  payload: HedgePreviewRequest,
  signal?: AbortSignal
): Promise<HedgePreviewResponse> {
  return postJson<HedgePreviewResponse>("/api/hedge/preview", payload, signal);
}

export async function openHedge(payload: OpenHedgeRequest, signal?: AbortSignal): Promise<OpenHedgeResponse> {
  return postJson<OpenHedgeResponse>("/api/hedge/open", payload, signal);
}

export async function fetchHedgeRoutes(
  payload: HedgeRoutesRequest,
  signal?: AbortSignal
): Promise<HedgeRoutesResponse> {
  return postJson<HedgeRoutesResponse>("/api/hedge/routes", payload, signal);
}

export async function openProtectionPosition(
  payload: PaperExecuteHedgeRequest,
  signal?: AbortSignal
): Promise<PaperExecuteHedgeResponse> {
  return postJson<PaperExecuteHedgeResponse>("/api/hedge/open-protection", payload, signal);
}

export async function buildFlashHedgeTransaction(
  payload: {
    walletAddress: string;
    marginUsd: number;
    shortNotionalUsd: number;
    solPriceUsd: number;
    slippageBps: number;
    leverage: 1 | 2 | 3;
  },
  signal?: AbortSignal
): Promise<FlashHedgeTransactionResponse> {
  return postJson<FlashHedgeTransactionResponse>("/api/hedge/flash/transaction", payload, signal);
}

export async function fetchWalletBalance(address: string, signal?: AbortSignal): Promise<WalletBalanceResponse> {
  return getJson<WalletBalanceResponse>(`/api/wallet/${address}/balance`, signal);
}

export async function fetchSwapQuote(
  payload: {
    inputSymbol: SupportedTokenSymbol;
    outputSymbol: SupportedTokenSymbol;
    amount: number;
    slippageBps: number;
  },
  signal?: AbortSignal
): Promise<SwapQuoteSummary> {
  return postJson<SwapQuoteSummary>("/api/swap/quote", payload, signal);
}

export async function buildSwapTransaction(
  payload: {
    userPublicKey: string;
    quoteResponse: unknown;
    dynamicComputeUnitLimit?: boolean;
    prioritizationFeeLamports?: "auto" | number;
  },
  signal?: AbortSignal
): Promise<SwapTransactionResponse> {
  return postJson<SwapTransactionResponse>("/api/swap/transaction", payload, signal);
}

export async function previewStake(
  payload: { stakeAsset: StakeAsset; solAmount: number },
  signal?: AbortSignal
): Promise<StakePreview> {
  return postJson<StakePreview>("/api/stake/preview", payload, signal);
}

export async function buildStakeTransaction(
  payload: { stakeAsset: StakeAsset; solAmount: number; walletAddress: string },
  signal?: AbortSignal
): Promise<StakeTransactionResponse> {
  return postJson<StakeTransactionResponse>("/api/stake/transaction", payload, signal);
}

export async function calculatePortfolioMetrics(
  payload: {
    balances: WalletBalanceResponse["balances"];
    shortPosition?: VenuePosition | null;
    stakingYieldRate: number;
    fundingRate: number;
  },
  signal?: AbortSignal
): Promise<PortfolioMetrics> {
  return postJson<PortfolioMetrics>("/api/portfolio/metrics", payload, signal);
}

async function getJson<TResponse>(path: string, signal?: AbortSignal): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, { signal });
  return parseJsonResponse<TResponse>(response);
}

async function postJson<TResponse>(
  path: string,
  payload: unknown,
  signal?: AbortSignal
): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    signal
  });

  return parseJsonResponse<TResponse>(response);
}

async function parseJsonResponse<TResponse>(response: Response): Promise<TResponse> {
  const data = (await response.json().catch(() => null)) as
    | TResponse
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(isErrorResponse(data) ? data.error : "Request failed.");
  }

  return data as TResponse;
}

function isErrorResponse(value: unknown): value is { error: string } {
  return typeof value === "object" && value !== null && "error" in value && typeof value.error === "string";
}

function getDefaultApiBaseUrl(): string {
  return `${window.location.protocol}//${window.location.hostname}:4000`;
}
