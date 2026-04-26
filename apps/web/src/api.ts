import type {
  HedgePreviewRequest,
  HedgePreviewResponse,
  OpenHedgeRequest,
  OpenHedgeResponse,
  SimulationRequest,
  SimulationResponse,
  SolLivePrice,
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
  return getJson<SolLivePrice>("/api/market/sol/live", signal);
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

export async function fetchWalletBalance(address: string, signal?: AbortSignal): Promise<WalletBalanceResponse> {
  return getJson<WalletBalanceResponse>(`/api/wallet/${address}/balance`, signal);
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
    throw new Error(isErrorResponse(data) ? data.error : "Simulation request failed.");
  }

  return data as TResponse;
}

function isErrorResponse(value: unknown): value is { error: string } {
  return typeof value === "object" && value !== null && "error" in value && typeof value.error === "string";
}

function getDefaultApiBaseUrl(): string {
  return `${window.location.protocol}//${window.location.hostname}:4000`;
}
