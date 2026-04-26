export type VenueName = "mock" | "flash";
export type ExecutionMode = "paper" | "live";
export type PositionHealth = "safe" | "warning" | "danger";

export interface PreviewShortParams {
  walletAddress?: string;
  symbol: "SOL";
  notionalUsd: number;
  leverage: number;
  entryPrice?: number;
}

export interface PreviewShortResult {
  symbol: "SOL";
  side: "short";
  notionalUsd: number;
  entryPrice: number;
  currentPrice: number;
  leverage: number;
  marginUsd: number;
  estimatedLiquidationPrice: number;
  liquidationDistance: number;
  estimatedSolShortSize: number;
  health: PositionHealth;
}

export interface OpenShortParams extends PreviewShortParams {
  walletAddress: string;
  mode?: ExecutionMode;
}

export interface ClosePositionParams {
  positionId: string;
  walletAddress?: string;
}

export interface VenueOrderResult {
  positionId: string;
  mode: ExecutionMode;
  venue: string;
  status: "opened" | "closed";
  position: VenuePosition;
}

export interface VenuePosition {
  id: string;
  walletAddress?: string;
  symbol: "SOL";
  side: "short";
  notionalUsd: number;
  entryPrice: number;
  currentPrice: number;
  leverage: number;
  marginUsd: number;
  estimatedLiquidationPrice: number;
  liquidationDistance: number;
  unrealizedPnl: number;
  health: PositionHealth;
  mode: ExecutionMode;
  venue: string;
  status: "open" | "closed";
  openedAt: string;
  closedAt?: string;
}

export interface PerpVenue {
  name: VenueName;
  getMarketPrice(symbol: string): Promise<number>;
  getFundingRate(symbol: string): Promise<number>;
  previewShort(params: PreviewShortParams): Promise<PreviewShortResult>;
  openShort(params: OpenShortParams): Promise<VenueOrderResult>;
  closePosition(params: ClosePositionParams): Promise<VenueOrderResult>;
  getPosition(positionId: string): Promise<VenuePosition>;
}
