import type { SimulationRequest, SimulationResponse } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export async function simulatePortfolio(
  payload: SimulationRequest,
  signal?: AbortSignal
): Promise<SimulationResponse> {
  const response = await fetch(`${API_BASE_URL}/simulate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    signal
  });

  const data = (await response.json().catch(() => null)) as
    | SimulationResponse
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(data && "error" in data && data.error ? data.error : "Simulation request failed.");
  }

  return data as SimulationResponse;
}
