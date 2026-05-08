type CacheEntry = {
  expiresAt: number;
  data: unknown;
};

export class BirdeyeClient {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly chain: string;
  private readonly cache = new Map<string, CacheEntry>();

  constructor() {
    this.apiKey = process.env.BIRDEYE_API_KEY;
    this.baseUrl = process.env.BIRDEYE_BASE_URL ?? "https://public-api.birdeye.so";
    this.chain = process.env.BIRDEYE_CHAIN ?? "solana";
  }

  async get<TResponse>(
    path: string,
    params: Record<string, string | number | boolean | undefined> = {},
    cacheTtlMs = 60_000
  ): Promise<TResponse> {
    if (!this.apiKey) {
      throw new Error("BIRDEYE_API_KEY is required for Birdeye market data.");
    }

    const url = new URL(path, this.baseUrl);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }

    const cacheKey = url.toString();
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as TResponse;
    }

    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "X-API-KEY": this.apiKey,
        "x-chain": this.chain
      }
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Birdeye request failed with ${response.status}: ${body || response.statusText}`);
    }

    const data = (await response.json()) as TResponse;
    this.cache.set(cacheKey, { data, expiresAt: Date.now() + cacheTtlMs });

    return data;
  }

  async post<TResponse>(
    path: string,
    params: Record<string, string | number | boolean | undefined> = {},
    body: unknown,
    cacheTtlMs = 60_000
  ): Promise<TResponse> {
    if (!this.apiKey) {
      throw new Error("BIRDEYE_API_KEY is required for Birdeye market data.");
    }

    const url = new URL(path, this.baseUrl);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }

    const cacheKey = `${url.toString()}:${JSON.stringify(body)}`;
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as TResponse;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        "X-API-KEY": this.apiKey,
        "x-chain": this.chain
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const responseBody = await response.text().catch(() => "");
      throw new Error(`Birdeye request failed with ${response.status}: ${responseBody || response.statusText}`);
    }

    const data = (await response.json()) as TResponse;
    this.cache.set(cacheKey, { data, expiresAt: Date.now() + cacheTtlMs });

    return data;
  }
}
