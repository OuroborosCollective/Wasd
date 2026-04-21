(() => {
  const API_BASE = "/api/vote/admin";

  function mustToken() {
    const tokenInput = document.getElementById("token");
    const token = (tokenInput && typeof tokenInput.value === "string" ? tokenInput.value : "").trim();
    if (!token) throw new Error("Bitte zuerst den Admin-Code eingeben.");
    return token;
  }

  function authHeaders(withJson) {
    const token = mustToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      "X-Admin-Token": token,
    };
    if (withJson) headers["Content-Type"] = "application/json";
    return headers;
  }

  async function req(method, path, body) {
    const init = { method, headers: authHeaders(body !== undefined) };
    if (body !== undefined) init.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE}${path}`, init);
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    if (!res.ok) {
      throw new Error(json?.reason || json?.error || text || `HTTP ${res.status}`);
    }
    return json;
  }

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function toPrettyJson(value) {
    try {
      return JSON.stringify(value ?? {}, null, 2);
    } catch {
      return "{}";
    }
  }

  function parseJsonArea(area, fallback) {
    const raw = area.value.trim();
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("JSON muss ein Objekt sein.");
    }
    return parsed;
  }

  function bySort(a, b) {
    return Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
  }

  function byCreatedDesc(a, b) {
    return Number(b?.claimedAt || 0) - Number(a?.claimedAt || 0);
  }

  function makeMessageBox(id) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("div");
      el.id = id;
      el.className = "msg hidden";
    }
    return el;
  }

  function showMsg(el, text, tone) {
    el.className = `msg ${tone}`;
    el.textContent = text;
  }

  function hideMsg(el) {
    el.className = "msg hidden";
    el.textContent = "";
  }

  function createFieldLabel(text) {
    const label = document.createElement("label");
    label.textContent = text;
    return label;
  }

  function createInput(type, placeholder) {
    const input = document.createElement("input");
    input.type = type || "text";
    input.placeholder = placeholder || "";
    input.autocomplete = "off";
    return input;
  }

  function createTextArea(rows, placeholder) {
    const area = document.createElement("textarea");
    area.rows = rows || 4;
    area.placeholder = placeholder || "";
    area.style.width = "100%";
    area.style.minHeight = `${(rows || 4) * 18 + 16}px`;
    return area;
  }

  function createCardContainer() {
    const card = document.createElement("div");
    card.className = "card hidden";
    card.id = "stepVoteAdmin";
    card.innerHTML =
      '<div class="card-h"><span class="ih" aria-hidden="true">🗳️</span><span>Vote-Banner Verwaltung</span></div>' +
      '<p class="hint" style="margin-top:0">Erstellt/editiert Toplist-Banner für das Ingame-Vote-Menü. Reihenfolge, Aktivstatus, Verifikation und Provider-Config werden serverseitig gespeichert.</p>';
    return card;
  }

  function initVoteAdminPanel() {
    const stepPublish = document.getElementById("stepPublish");
    if (!stepPublish) return;
    if (document.getElementById("stepVoteAdmin")) return;

    const card = createCardContainer();
    const state = { banners: [], selectedId: "" };
    const msg = makeMessageBox("voteAdminMsg");
    const diagMsg = makeMessageBox("voteDiagMsg");
    const listWrap = document.createElement("div");
    listWrap.id = "voteAdminListWrap";

    const formTitle = document.createElement("div");
    formTitle.className = "hint";
    formTitle.style.marginTop = "8px";
    formTitle.textContent = "Neuer Banner";

    const internalIdInput = createInput("text", "optional: internalId");
    const providerKeyInput = createInput("text", "z. B. gtop100");
    const displayNameInput = createInput("text", "Banner Titel");
    const bannerImageInput = createInput("url", "https://.../banner.png");
    const targetUrlInput = createInput("url", "https://.../vote");
    const descriptionInput = createTextArea(2, "Optionale Beschreibung");
    const claimInstructionsInput = createTextArea(2, "Optionale Claim-Hinweise");
    const sortOrderInput = createInput("number", "0");
    const voteWindowHoursInput = createInput("number", "12");
    const cooldownHoursInput = createInput("number", "24");
    const buffHoursInput = createInput("number", "4");
    const isActiveInput = document.createElement("input");
    isActiveInput.type = "checkbox";
    isActiveInput.checked = true;
    const verificationModeSelect = document.createElement("select");
    verificationModeSelect.innerHTML =
      '<option value="api_poll">api_poll</option><option value="callback_token">callback_token</option>';
    const providerConfigArea = createTextArea(5, '{"verifyApiUrl":"https://provider/api/check","serverId":"my-server"}');
    const metadataArea = createTextArea(3, "{}");

    card.appendChild(listWrap);
    card.appendChild(formTitle);
    card.appendChild(createFieldLabel("internalId (optional)"));
    card.appendChild(internalIdInput);
    card.appendChild(createFieldLabel("providerKey"));
    card.appendChild(providerKeyInput);
    card.appendChild(createFieldLabel("displayName"));
    card.appendChild(displayNameInput);
    card.appendChild(createFieldLabel("bannerImage URL"));
    card.appendChild(bannerImageInput);
    card.appendChild(createFieldLabel("targetUrl"));
    card.appendChild(targetUrlInput);
    card.appendChild(createFieldLabel("description"));
    card.appendChild(descriptionInput);

    const rowA = document.createElement("div");
    rowA.className = "ref-row";
    rowA.appendChild(createFieldLabel("sortOrder"));
    rowA.appendChild(sortOrderInput);
    rowA.appendChild(createFieldLabel("voteWindowHours"));
    rowA.appendChild(voteWindowHoursInput);
    rowA.appendChild(createFieldLabel("cooldownHours"));
    rowA.appendChild(cooldownHoursInput);
    rowA.appendChild(createFieldLabel("buffHours"));
    rowA.appendChild(buffHoursInput);
    card.appendChild(rowA);

    const rowB = document.createElement("div");
    rowB.className = "ref-row";
    const activeLabel = createFieldLabel("aktiv");
    activeLabel.style.display = "inline-flex";
    activeLabel.style.alignItems = "center";
    activeLabel.style.gap = "6px";
    activeLabel.appendChild(isActiveInput);
    rowB.appendChild(activeLabel);
    rowB.appendChild(createFieldLabel("verificationMode"));
    rowB.appendChild(verificationModeSelect);
    card.appendChild(rowB);

    card.appendChild(createFieldLabel("providerConfig (JSON)"));
    card.appendChild(providerConfigArea);
    card.appendChild(createFieldLabel("claimInstructions"));
    card.appendChild(claimInstructionsInput);
    card.appendChild(createFieldLabel("metadata (JSON)"));
    card.appendChild(metadataArea);

    const actionRow = document.createElement("div");
    actionRow.className = "ref-row";
    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.textContent = "Banner speichern";
    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "ghost";
    resetBtn.textContent = "Formular leeren";
    const refreshBtn = document.createElement("button");
    refreshBtn.type = "button";
    refreshBtn.className = "ghost";
    refreshBtn.textContent = "Neu laden";
    actionRow.appendChild(saveBtn);
    actionRow.appendChild(resetBtn);
    actionRow.appendChild(refreshBtn);
    card.appendChild(actionRow);
    card.appendChild(msg);

    const diagTitle = document.createElement("div");
    diagTitle.className = "card-h";
    diagTitle.style.marginTop = "14px";
    diagTitle.innerHTML = '<span class="ih" aria-hidden="true">📊</span><span>Vote-Diagnose</span>';
    const diagWrap = document.createElement("div");
    diagWrap.id = "voteDiagWrap";
    card.appendChild(diagTitle);
    card.appendChild(diagWrap);
    card.appendChild(diagMsg);

    stepPublish.insertAdjacentElement("afterend", card);

    function clearForm() {
      state.selectedId = "";
      formTitle.textContent = "Neuer Banner";
      internalIdInput.value = "";
      providerKeyInput.value = "";
      displayNameInput.value = "";
      bannerImageInput.value = "";
      targetUrlInput.value = "";
      descriptionInput.value = "";
      claimInstructionsInput.value = "";
      sortOrderInput.value = "0";
      voteWindowHoursInput.value = "12";
      cooldownHoursInput.value = "24";
      buffHoursInput.value = "4";
      isActiveInput.checked = true;
      verificationModeSelect.value = "api_poll";
      providerConfigArea.value = "{}";
      metadataArea.value = "{}";
    }

    function fillForm(row) {
      state.selectedId = row.internalId;
      formTitle.textContent = `Bearbeiten: ${row.displayName}`;
      internalIdInput.value = row.internalId;
      providerKeyInput.value = row.providerKey;
      displayNameInput.value = row.displayName;
      bannerImageInput.value = row.bannerImage;
      targetUrlInput.value = row.targetUrl;
      descriptionInput.value = row.description || "";
      claimInstructionsInput.value = row.claimInstructions || "";
      sortOrderInput.value = String(row.sortOrder);
      voteWindowHoursInput.value = String(row.voteWindowHours);
      cooldownHoursInput.value = String(row.cooldownHours);
      buffHoursInput.value = String(row.buffHours);
      isActiveInput.checked = !!row.isActive;
      verificationModeSelect.value = row.verificationMode;
      providerConfigArea.value = toPrettyJson(row.providerConfig || {});
      metadataArea.value = toPrettyJson(row.metadata || {});
    }

    async function loadBanners() {
      const payload = await req("GET", "/banners");
      state.banners = Array.isArray(payload?.banners) ? payload.banners : [];
      renderList();
    }

    function renderList() {
      const rows = [...state.banners].sort(bySort);
      if (rows.length === 0) {
        listWrap.innerHTML = '<p class="hint">Noch keine Vote-Banner angelegt.</p>';
        return;
      }
      const tableRows = rows
        .map((row, index) => {
          const tone = row.isActive ? "ok" : "err";
          return `<tr data-id="${esc(row.internalId)}"><td>${index + 1}</td><td>${esc(row.displayName)}</td><td>${esc(row.providerKey)}</td><td><span class="msg ${tone}" style="display:inline-flex;padding:2px 6px">${row.isActive ? "aktiv" : "inaktiv"}</span></td><td>${esc(row.verificationMode)}</td><td>${esc(row.buffHours)}h</td><td><button type="button" class="ghost btn-sm" data-action="up">↑</button> <button type="button" class="ghost btn-sm" data-action="down">↓</button> <button type="button" class="ghost btn-sm" data-action="edit">Edit</button> <button type="button" class="danger btn-sm" data-action="del">Delete</button></td></tr>`;
        })
        .join("");
      listWrap.innerHTML = `<table><thead><tr><th>#</th><th>Name</th><th>Provider</th><th>Status</th><th>Verify</th><th>Buff</th><th>Aktion</th></tr></thead><tbody>${tableRows}</tbody></table>`;

      listWrap.querySelectorAll("tr[data-id]").forEach((tr) => {
        const rowId = tr.getAttribute("data-id") || "";
        tr.querySelectorAll("button[data-action]").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const action = btn.getAttribute("data-action");
            const idx = state.banners.findIndex((x) => x.internalId === rowId);
            if (idx < 0) return;
            if (action === "edit") return fillForm(state.banners[idx]);
            if (action === "del") {
              if (!confirm(`Banner "${state.banners[idx].displayName}" wirklich löschen?`)) return;
              try {
                await req("DELETE", `/banners/${encodeURIComponent(rowId)}`);
                showMsg(msg, "Banner gelöscht.", "ok");
                await loadBanners();
              } catch (error) {
                showMsg(msg, String(error?.message || error), "err");
              }
              return;
            }
            const next = [...state.banners].sort(bySort);
            const pos = next.findIndex((x) => x.internalId === rowId);
            if (pos < 0) return;
            if (action === "up" && pos > 0) [next[pos - 1], next[pos]] = [next[pos], next[pos - 1]];
            else if (action === "down" && pos < next.length - 1) [next[pos], next[pos + 1]] = [next[pos + 1], next[pos]];
            else return;
            try {
              await req("POST", "/banners/reorder", { ids: next.map((x) => x.internalId) });
              showMsg(msg, "Reihenfolge aktualisiert.", "ok");
              await loadBanners();
            } catch (error) {
              showMsg(msg, String(error?.message || error), "err");
            }
          });
        });
      });
    }

    async function loadDiagnostics() {
      try {
        const payload = await req("GET", "/diagnostics");
        renderDiagnostics(payload?.diagnostics || {});
        hideMsg(diagMsg);
      } catch (error) {
        showMsg(diagMsg, String(error?.message || error), "err");
      }
    }

    function renderDiagnostics(diag) {
      const claims = Array.isArray(diag?.recentClaims) ? [...diag.recentClaims].sort(byCreatedDesc) : [];
      const pending = Array.isArray(diag?.pendingSessions) ? diag.pendingSessions : [];
      const claimRows =
        claims.length === 0
          ? '<tr><td colspan="5" class="hint">Keine Claims vorhanden.</td></tr>'
          : claims
              .slice(0, 20)
              .map((row) => {
                const when = new Date(Number(row?.claimedAt || 0)).toLocaleString("de-DE");
                const hours = Math.round((Number(row?.durationMs || 0) / 3600000) * 10) / 10;
                return `<tr><td>${esc(row?.playerId)}</td><td>${esc(row?.bannerId)}</td><td>${esc(row?.providerKey)}</td><td>${hours}h</td><td>${esc(when)}</td></tr>`;
              })
              .join("");
      const pendingRows =
        pending.length === 0
          ? '<tr><td colspan="5" class="hint">Keine offenen Sessions.</td></tr>'
          : pending
              .slice(0, 20)
              .map((row) => {
                const exp = new Date(Number(row?.expiresAt || 0)).toLocaleString("de-DE");
                return `<tr><td>${esc(row?.playerId)}</td><td>${esc(row?.bannerId)}</td><td>${esc(row?.providerKey)}</td><td>${esc(row?.status)}</td><td>${esc(exp)}</td></tr>`;
              })
              .join("");
      diagWrap.innerHTML =
        `<div class="hint" style="margin-bottom:6px">Letzte verifizierte Claims</div>` +
        `<table><thead><tr><th>Player</th><th>Banner</th><th>Provider</th><th>Buff</th><th>Zeit</th></tr></thead><tbody>${claimRows}</tbody></table>` +
        `<div class="hint" style="margin:10px 0 6px">Offene Vote-Sessions</div>` +
        `<table><thead><tr><th>Player</th><th>Banner</th><th>Provider</th><th>Status</th><th>Expires</th></tr></thead><tbody>${pendingRows}</tbody></table>`;
    }

    saveBtn.addEventListener("click", async () => {
      try {
        const body = {
          internalId: state.selectedId || internalIdInput.value.trim() || undefined,
          providerKey: providerKeyInput.value.trim(),
          displayName: displayNameInput.value.trim(),
          bannerImage: bannerImageInput.value.trim(),
          targetUrl: targetUrlInput.value.trim(),
          description: descriptionInput.value.trim() || undefined,
          claimInstructions: claimInstructionsInput.value.trim() || undefined,
          sortOrder: Number(sortOrderInput.value || 0),
          voteWindowHours: Number(voteWindowHoursInput.value || 12),
          cooldownHours: Number(cooldownHoursInput.value || 24),
          buffHours: Number(buffHoursInput.value || 4),
          isActive: isActiveInput.checked,
          verificationMode: verificationModeSelect.value,
          providerConfig: parseJsonArea(providerConfigArea, {}),
          metadata: parseJsonArea(metadataArea, {}),
        };
        const payload = await req("POST", "/banners", body);
        state.banners = Array.isArray(payload?.banners) ? payload.banners : state.banners;
        renderList();
        await loadDiagnostics();
        showMsg(msg, "Banner gespeichert.", "ok");
        clearForm();
      } catch (error) {
        showMsg(msg, String(error?.message || error), "err");
      }
    });

    resetBtn.addEventListener("click", () => {
      clearForm();
      hideMsg(msg);
    });

    refreshBtn.addEventListener("click", async () => {
      try {
        await loadBanners();
        await loadDiagnostics();
        showMsg(msg, "Vote-Banner aktualisiert.", "ok");
      } catch (error) {
        showMsg(msg, String(error?.message || error), "err");
      }
    });

    clearForm();
    document.addEventListener("areloria-admin-login-success", async () => {
      card.classList.remove("hidden");
      try {
        await loadBanners();
        await loadDiagnostics();
        hideMsg(msg);
      } catch (error) {
        showMsg(msg, String(error?.message || error), "err");
      }
    });
  }

  window.initVoteAdminPanel = initVoteAdminPanel;
  initVoteAdminPanel();
})();
