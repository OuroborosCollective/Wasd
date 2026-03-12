export class AssetValidationReport {
  validate(meta:any){
    return {
      ok: Boolean(meta?.assetId && meta?.path),
      assetId: meta?.assetId ?? null
    };
  }
}