export type AdminAuditState = "ready" | "unknown" | "blocked";

export interface AdminAuditSource {
  label: string;
  state: AdminAuditState;
  source: string;
  detail?: string;
}

export interface AdminAuditViewModel {
  title: string;
  state: AdminAuditState;
  sources: AdminAuditSource[];
}

const DEFAULT_AUDIT: AdminAuditViewModel = {
  title: "ARE Admin Audit",
  state: "unknown",
  sources: [
    {
      label: "runtime-source",
      state: "unknown",
      source: "not-bound",
      detail: "No live audit source has been attached to this UI surface.",
    },
  ],
};

export function buildAdminAuditMarkup(model: AdminAuditViewModel = DEFAULT_AUDIT): string {
  const rows = model.sources
    .map((source) => {
      const detail = source.detail ? ` — ${source.detail}` : "";
      return `<li data-state="${source.state}"><strong>${source.label}</strong>: ${source.state} <code>${source.source}</code>${detail}</li>`;
    })
    .join("");

  return `<section class="admin-audit admin-audit--${model.state}" data-admin-audit-state="${model.state}">
  <h2>${model.title}</h2>
  <p>Truth path status: <strong>${model.state}</strong></p>
  <ul>${rows}</ul>
</section>`;
}

export function renderAdminAudit(target?: HTMLElement, model: AdminAuditViewModel = DEFAULT_AUDIT): string | HTMLElement {
  const markup = buildAdminAuditMarkup(model);

  if (!target) {
    return markup;
  }

  target.innerHTML = markup;
  return target;
}
