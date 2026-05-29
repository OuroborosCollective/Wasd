export type Client2DBootstrapNpc = {
  id?: string;
  name?: string;
  displayName?: string;
  role?: string;
  x?: number;
  z?: number;
  y?: number;
  gridX?: number;
  gridZ?: number;
  fixed?: boolean;
  permanent?: boolean;
  currentAction?: string;
  services?: string[];
};

export type Client2DBootstrap = {
  ok?: boolean;
  contract?: string;
  tick?: number;
  starterNpcCount?: number;
  requiredStarterNpcCount?: number;
  hasMerchant?: boolean;
  hasBlacksmith?: boolean;
  npcs?: Client2DBootstrapNpc[];
};

export const CLIENT2D_BOOTSTRAP_URL = "/api/v1/client2d/bootstrap";

export async function loadClient2DBootstrap(): Promise<Client2DBootstrap | null> {
  try {
    const url = new URL(CLIENT2D_BOOTSTRAP_URL, window.location.origin);
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`client2d bootstrap HTTP ${response.status}`);
    const data = await response.json() as Client2DBootstrap;
    if (data.contract !== "client2d-bootstrap-v1") {
      throw new Error(`unexpected client2d bootstrap contract: ${String(data.contract)}`);
    }
    return data;
  } catch (error) {
    console.warn("[Client2D] Bootstrap contract unavailable", error);
    return null;
  }
}
