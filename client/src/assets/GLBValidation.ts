export function validateGLBMeta(meta:any){
  return {
    ok: Boolean(meta?.assetId && meta?.path),
    missing: [
      !meta?.assetId ? "assetId" : null,
      !meta?.path ? "path" : null
    ].filter(Boolean)
  };
}