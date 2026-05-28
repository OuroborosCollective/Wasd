import { useEffect, useMemo, useState } from "react";

type KenneyManifest = {
  packId?: string;
  importedCount?: number;
  skippedCount?: number;
  license?: string;
  authorityPolicy?: string;
};

const BASE_URL = import.meta.env.BASE_URL || "/";

function runtimeBaseUrl(): URL {
  const base = BASE_URL === "/" && window.location.pathname.startsWith("/2d") ? "/2d/" : BASE_URL;
  return new URL(base, window.location.origin);
}

function clientAssetUrl(path: string): string {
  return new URL(path.replace(/^\//, ""), runtimeBaseUrl()).toString();
}

const MANIFEST_URL = clientAssetUrl("2d-assets/manifests/generated/kenney-ui-pack.json");
const BUTTON_URL = clientAssetUrl("2d-assets/ui/kenney-ui-pack/png/blue/default/button-rectangle-depth-gradient.png");
const ROUND_URL = clientAssetUrl("2d-assets/ui/kenney-ui-pack/png/blue/default/button-round-depth-gradient.png");
const ARROW_URL = clientAssetUrl("2d-assets/ui/kenney-ui-pack/png/blue/default/arrow-basic-e-small.png");

export function KenneyUiLiveSkinBadge() {
  const [manifest, setManifest] = useState<KenneyManifest | null>(null);
  const [state, setState] = useState<"loading" | "online" | "missing">("loading");

  useEffect(() => {
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty("--kenney-ui-button-blue", `url("${BUTTON_URL}")`);
    rootStyle.setProperty("--kenney-ui-button-round-blue", `url("${ROUND_URL}")`);
    rootStyle.setProperty("--kenney-ui-arrow-blue", `url("${ARROW_URL}")`);

    let cancelled = false;

    fetch(MANIFEST_URL, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`Kenney UI manifest failed: ${response.status}`);
        return response.json() as Promise<KenneyManifest>;
      })
      .then((data) => {
        if (cancelled) return;
        setManifest(data);
        setState("online");
      })
      .catch((error) => {
        if (cancelled) return;
        console.warn("[KenneyUI] Live skin manifest unavailable", { url: MANIFEST_URL, error });
        setState("missing");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const assetCount = useMemo(() => manifest?.importedCount ?? 0, [manifest]);

  return (
    <aside className={`kenney-live-skin-badge ${state}`} aria-label="Kenney UI Pack live skin status">
      <div className="kenney-live-skin-preview" aria-hidden="true">
        <img src={BUTTON_URL} alt="" />
        <img src={ROUND_URL} alt="" />
        <img src={ARROW_URL} alt="" />
      </div>
      <div className="kenney-live-skin-copy">
        <small>KENNEY UI PACK</small>
        <strong>{state === "online" ? "LIVE SKIN ONLINE" : state === "loading" ? "LOADING UI SKIN" : "SKIN MANIFEST MISSING"}</strong>
        <span>{state === "online" ? `${assetCount} visual assets · ${manifest?.license ?? "CC0"}` : "visual-only · no gameplay authority"}</span>
      </div>
    </aside>
  );
}
