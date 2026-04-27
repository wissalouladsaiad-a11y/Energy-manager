// ============================================================
//  APP.JS — Logique principale du site
//  Connexion Google Sheets API + Rendu dynamique
// ============================================================

const API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
let dataCache = {};

async function fetchSheet(sheetName) {
  if (dataCache[sheetName]) return dataCache[sheetName];
  const url = `${API_BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(sheetName)}?key=${CONFIG.API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Erreur API ${res.status} — Vérifiez que le Sheet est partagé en lecture`);
  const json = await res.json();
  dataCache[sheetName] = json.values || [];
  return dataCache[sheetName];
}

function val(row, index, fallback = "—") {
  return (row && row[index] && row[index].trim() !== "") ? row[index].trim() : fallback;
}

function energieBadge(type) {
  if (!type || type === "—") return "";
  const t = type.toLowerCase();
  let cls = "badge-autre";
  if (t.includes("elec") || t.includes("élec")) cls = "badge-elec";
  else if (t.includes("gaz")) cls = "badge-gaz";
  return `<span class="contrat-energie-badge ${cls}">${type}</span>`;
}

function energieTagClass(type) {
  if (!type) return "badge-autre";
  const t = type.toLowerCase();
  if (t.includes("elec") || t.includes("élec")) return "badge-elec";
  if (t.includes("gaz")) return "badge-gaz";
  return "badge-autre";
}

function usageBadge(usage) {
  if (!usage || usage === "—") return "—";
  const u = usage.toLowerCase().replace(/\s/g, '-');
  return `<span class="usage-tag usage-${u}">${usage}</span>`;
}

function statutBadge(statut) {
  if (!statut || statut === "—") return "—";
  const s = statut.toLowerCase();
  let cls = "statut-attente";
  if (s.includes("cours")) cls = "statut-en-cours";
  else if (s.includes("termin") || s.includes("réalisé")) cls = "statut-termine";
  return `<span class="badge-statut ${cls}">${statut}</span>`;
}

function prioriteBadge(prio) {
  if (!prio || prio === "—") return "—";
  const p = prio.toString().trim();
  let cls = "prio-3";
  if (p === "1") cls = "prio-1";
  else if (p === "2") cls = "prio-2";
  return `<span class="badge-priorite ${cls}">${p}</span>`;
}

function formatDate(dateStr) {
  if (!dateStr || dateStr === "—") return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return dateStr; }
}

// ── IDENTITÉ ─────────────────────────────────────────────────
async function loadIdentite() {
  const rows = await fetchSheet(CONFIG.SHEETS.IDENTITE);
  const headers = rows[3] || [];
  const data = rows[CONFIG.DATA_ROW - 1] || [];

  const obj = {};
  headers.forEach((h, i) => {
    if (h && h.trim()) obj[h.trim()] = data[i] ? data[i].trim() : "";
  });

  const g = (key) => {
    for (const k of Object.keys(obj)) {
      if (k.toLowerCase().includes(key.toLowerCase()) && obj[k]) return obj[k];
    }
    return "—";
  };

  const nom = g("Nom Bât") || CONFIG.BATIMENT_NOM;
  const societe = g("Société");
  const adresse = g("Adresse");
  const cp = g("Code Postal");
  const ville = g("Ville");
  const surface = g("Surface");
  const annee = g("Année de construct");
  const zone = g("Zone climatique");

  document.getElementById("hero-nom").textContent = nom !== "—" ? nom : CONFIG.BATIMENT_NOM;
  document.getElementById("hero-adresse").textContent =
    [adresse, cp, ville].filter(v => v !== "—").join(", ") || "Adresse non renseignée";

  const surfNum = surface !== "—" ? parseInt(surface.replace(/\D/g,'')) : NaN;
  document.getElementById("kpi-surface").textContent = isNaN(surfNum) ? surface : surfNum.toLocaleString('fr-FR');
  document.getElementById("kpi-annee").textContent = annee;
  document.getElementById("kpi-zone").textContent = zone;
  document.getElementById("last-update").textContent = "Sync " + new Date().toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'});

  const infoItems = [
    { label: "Société", value: societe },
    { label: "Nom bâtiment", value: nom },
    { label: "Adresse", value: adresse },
    { label: "Code postal", value: cp },
    { label: "Ville", value: ville },
    { label: "Mono / Multi-locataires", value: g("locataire") || g("mono") },
    { label: "Zone climatique", value: zone, highlight: true },
    { label: "Année de construction", value: annee },
    { label: "Activité / Typologie", value: g("Activité") || g("Typologie") },
    { label: "Surface plancher (m²)", value: surface, highlight: true },
    { label: "Nb d'occupants", value: g("occupant") },
  ];

  document.getElementById("info-generale").innerHTML = infoItems.map(item => `
    <div class="info-item">
      <div class="info-label">${item.label}</div>
      <div class="info-value ${item.highlight ? 'highlight' : ''}">${item.value || "—"}</div>
    </div>`).join("");

  const jours = [
    { key: "lundi", label: "LUN" }, { key: "mardi", label: "MAR" },
    { key: "mercredi", label: "MER" }, { key: "jeudi", label: "JEU" },
    { key: "vendredi", label: "VEN" }, { key: "samedi", label: "SAM" },
    { key: "dimanche", label: "DIM" },
  ];

  document.getElementById("horaires-occupation").innerHTML = jours.map(j => {
    const h = g(`ccupation ${j.key}`) || g(j.key) || "—";
    const isFerme = h.toLowerCase().includes("ferm") || h === "—";
    return `<div class="horaire-item">
      <div class="horaire-jour">${j.label}</div>
      <div class="${isFerme ? 'horaire-ferme' : 'horaire-value'}">${h}</div>
    </div>`;
  }).join("");

  const contrats = [];
  for (let i = 1; i <= 10; i++) {
    const energie = g(`Energie n°${i}`) || g(`Énergie n°${i}`);
    const pdl = g(`N° PDL ${i}`) || g(`PDL ${i}`);
    const desc = g(`description) ${i}`);
    if (energie && energie !== "—") contrats.push({ energie, pdl, desc });
  }

  document.getElementById("contrats-energie").innerHTML = contrats.length === 0
    ? `<div class="empty-state"><div class="empty-state-icon">⚡</div><div class="empty-state-text">Aucun contrat renseigné</div></div>`
    : contrats.map(c => `
      <div class="contrat-item">
        ${energieBadge(c.energie)}
        <div class="contrat-details">
          <div class="contrat-desc">${c.desc !== "—" ? c.desc : c.energie}</div>
          ${c.pdl !== "—" ? `<div class="contrat-pdl">PDL : ${c.pdl}</div>` : ""}
        </div>
      </div>`).join("");

  document.getElementById("info-reglementation").innerHTML = [
    { label: "Soumis au DEET", value: g("DEET") },
    { label: "Soumis au BACS", value: g("BACS") },
    { label: "Présence GTB", value: g("GTB") || g("présence") },
    { label: "Consommation réf. 1 (kWh/m²)", value: g("référence 1") || g("Consommation de référence 1") },
    { label: "Objectif 2030 DEET (kWh/m²)", value: g("Objectif 2030") },
    { label: "% Conso passive", value: g("passive") },
  ].map(item => `
    <div class="info-item">
      <div class="info-label">${item.label}</div>
      <div class="info-value">${item.value || "—"}</div>
    </div>`).join("");
}

// ── ÉQUIPEMENTS ──────────────────────────────────────────────
async function loadEquipements() {
  const rows = await fetchSheet(CONFIG.SHEETS.EQUIPEMENTS);
  if (!rows || rows.length === 0) {
    document.getElementById("equipements-container").innerHTML =
      `<div class="empty-state"><div class="empty-state-icon">🔧</div><div class="empty-state-text">Aucun équipement trouvé</div></div>`;
    return;
  }

  const catIcons = {
    "Distribution électrique": "⚡", "Production chaud": "🔥",
    "Production Froid - Climatisation": "❄️", "Eau chaude sanitaire": "💧",
    "Ventilation": "💨", "Eclairage": "💡", "Éclairage": "💡",
    "Bureautique": "💻", "Général": "🔧",
  };

  let currentCategory = "Général";
  let categories = {};

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(c => !c || c.trim() === "")) continue;
    const typeCell = (row[0] || "").trim();
    const detailCell = (row[1] || "").trim();
    const filledCols = row.filter(c => c && c.trim()).length;

    if (typeCell && !detailCell && filledCols <= 2) {
      currentCategory = typeCell;
      if (!categories[currentCategory]) categories[currentCategory] = [];
    } else {
      if (!categories[currentCategory]) categories[currentCategory] = [];
      if (typeCell || detailCell) categories[currentCategory].push(row);
    }
  }

  let html = "";
  Object.entries(categories).forEach(([cat, items]) => {
    if (items.length === 0) return;
    const icon = catIcons[cat] || "🔧";
    html += `<div class="equip-category">
      <div class="equip-category-header">${icon} ${cat}</div>
      <table class="equip-table">
        <thead><tr>
          <th>Équipement</th><th>Détails</th><th>Localisation</th>
          <th>Énergie</th><th>Comptage</th><th>Nb</th><th>Puissance (kW)</th>
        </tr></thead><tbody>`;
    items.forEach(row => {
      const energie = val(row, 3);
      html += `<tr data-search="${row.join(' ').toLowerCase()}">
        <td><div class="equip-name">${val(row, 0)}</div></td>
        <td><div class="equip-detail">${val(row, 1)}</div></td>
        <td>${val(row, 2)}</td>
        <td>${energie !== "—" ? `<span class="energie-tag ${energieTagClass(energie)}">${energie}</span>` : "—"}</td>
        <td>${val(row, 4)}</td>
        <td>${val(row, 6)}</td>
        <td>${val(row, 8) !== "—" ? val(row, 8) : val(row, 7)}</td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
  });

  document.getElementById("equipements-container").innerHTML = html ||
    `<div class="empty-state"><div class="empty-state-icon">🔧</div><div class="empty-state-text">Aucun équipement trouvé</div></div>`;

  document.getElementById("filter-equipements").addEventListener("input", function () {
    const q = this.value.toLowerCase();
    document.querySelectorAll(".equip-table tbody tr").forEach(tr => {
      tr.style.display = (tr.dataset.search || "").includes(q) ? "" : "none";
    });
  });
}

// ── PLAN D'ACTION ────────────────────────────────────────────
async function loadActions() {
  const rows = await fetchSheet(CONFIG.SHEETS.ACTIONS);
  if (!rows || rows.length < 2) {
    document.getElementById("actions-container").innerHTML =
      `<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">Aucune action trouvée</div></div>`;
    return;
  }

  const headers = rows[0] || [];
  const col = (name) => headers.findIndex(h => h && h.toLowerCase().includes(name.toLowerCase()));

  const iNum = col("n°") !== -1 ? col("n°") : 1;
  const iDate = col("date identification") !== -1 ? col("date identification") : 2;
  const iZone = col("zone") !== -1 ? col("zone") : 3;
  const iPrio = col("riorité") !== -1 ? col("riorité") : 4;
  const iUsage = col("usage") !== -1 ? col("usage") : 5;
  const iAction = col("action") !== -1 ? col("action") : 7;
  const iResp = col("esponsable") !== -1 ? col("esponsable") : 8;
  const iStatut = col("statut") !== -1 ? col("statut") : 9;
  const iEcheance = col("chéance") !== -1 ? col("chéance") : 10;

  const dataRows = rows.slice(1).filter(r => r && r.some(c => c && c.trim() !== ""));
  let nbEnCours = 0;

  let html = `<table class="actions-table">
    <thead><tr>
      <th>N°</th><th>Priorité</th><th>Usage</th><th>Zone</th>
      <th>Action</th><th>Responsable</th><th>Statut</th><th>Échéance</th>
    </tr></thead>
    <tbody id="actions-tbody">`;

  dataRows.forEach(row => {
    const statut = val(row, iStatut);
    const prio = val(row, iPrio);
    const usage = val(row, iUsage);
    if (statut.toLowerCase().includes("cours")) nbEnCours++;

    html += `<tr data-statut="${statut.toLowerCase()}" data-prio="${prio}">
      <td>${val(row, iNum)}</td>
      <td>${prioriteBadge(prio)}</td>
      <td>${usageBadge(usage)}</td>
      <td>${val(row, iZone)}</td>
      <td><div class="action-description">${val(row, iAction)}</div></td>
      <td>${val(row, iResp)}</td>
      <td>${statutBadge(statut)}</td>
      <td>${formatDate(val(row, iEcheance))}</td>
    </tr>`;
  });

  html += `</tbody></table>`;
  document.getElementById("actions-container").innerHTML = html;
  document.getElementById("kpi-actions").textContent = nbEnCours;

  function applyFilters() {
    const statut = document.getElementById("filter-statut").value.toLowerCase();
    const prio = document.getElementById("filter-priorite").value;
    document.querySelectorAll("#actions-tbody tr").forEach(tr => {
      const sMatch = !statut || (tr.dataset.statut || "").includes(statut);
      const pMatch = !prio || (tr.dataset.prio || "") === prio;
      tr.style.display = sMatch && pMatch ? "" : "none";
    });
  }

  document.getElementById("filter-statut").addEventListener("change", applyFilters);
  document.getElementById("filter-priorite").addEventListener("change", applyFilters);
}

// ── NAVIGATION ────────────────────────────────────────────────
function initTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", async function () {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      this.classList.add("active");
      const tab = this.dataset.tab;
      document.getElementById(`tab-${tab}`).classList.add("active");
      try {
        if (tab === "equipements") await loadEquipements();
        if (tab === "actions") await loadActions();
      } catch (err) { showError(err.message); }
    });
  });
}

function showError(msg) {
  const existing = document.querySelector(".error-banner");
  if (existing) existing.remove();
  const banner = document.createElement("div");
  banner.className = "error-banner";
  banner.innerHTML = `⚠️ <strong>Erreur :</strong> ${msg}`;
  document.querySelector(".main-content").prepend(banner);
}

async function init() {
  initTabs();
  try {
    await loadIdentite();
  } catch (err) {
    document.getElementById("hero-nom").textContent = CONFIG.BATIMENT_NOM;
    document.getElementById("last-update").textContent = "Erreur sync";
    showError(err.message);
  }
}

document.addEventListener("DOMContentLoaded", init);
