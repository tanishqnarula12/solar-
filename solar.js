const DEFAULT_DATA = {
  "Andhra Pradesh": 3771.12,
  "Arunachal Pradesh": 10.34,
  "Assam": 85.12,
  "Bihar": 127.45,
  "Chhattisgarh": 821.5,
  "Goa": 4.2,
  "Gujarat": 19421.89,
  "Haryana": 2099.33,
  "Himachal Pradesh": 213.44,
  "Jharkhand": 157.2,
  "Karnataka": 13500.0,
  "Kerala": 2184.4,
  "Madhya Pradesh": 5156.78,
  "Maharashtra": 11151.53,
  "Manipur": 3.5,
  "Meghalaya": 16.2,
  "Mizoram": 2.1,
  "Nagaland": 1.9,
  "Odisha": 1300.23,
  "Punjab": 1421.43,
  "Rajasthan": 28761.22,
  "Sikkim": 0.9,
  "Tamil Nadu": 10983.0,
  "Telangana": 1740.3,
  "Tripura": 14.0,
  "Uttar Pradesh": 3368.87,
  "Uttarakhand": 593.07,
  "West Bengal": 617.2,
  "Andaman & Nicobar": 0.5,
  "Chandigarh": 78.85,
  "Dadra & Nagar Haveli and Daman & Diu": 5.1,
  "Delhi": 319.3,
  "Jammu & Kashmir": 82.29,
  "Ladakh": 0.0,
  "Lakshadweep": 0.05,
  "Puducherry": 18.2
};

let stateData = Object.assign({}, DEFAULT_DATA);
let meta = {
  source: 'fallback',
  lastUpdated: null,
  rawRemoteUrl: null,
  loadedRows: 0,
  errors: []
};

function _hoursPerYear() { return 8760; }
function estimateAnnualGWh(mw, capacityFactor = 0.20) {
  if (!isFinite(mw) || mw <= 0) return 0;
  return (mw * capacityFactor * _hoursPerYear()) / 1000;
}
function estimatePanelCount(mw, panelWp = 400) {
  if (!isFinite(mw) || mw <= 0) return 0;
  if (!isFinite(panelWp) || panelWp <= 0) return 0;
  return Math.round((mw * 1_000_000) / panelWp);
}
function estimateCO2AvoidedTonnes(generationGWh, gridEmissionFactorKgPerMWh = 750) {
  if (!isFinite(generationGWh) || generationGWh <= 0) return 0;
  const mwh = generationGWh * 1000;
  const kg = mwh * gridEmissionFactorKgPerMWh;
  return +(kg / 1000).toFixed(3);
}
function estimateHouseholdsPowered(generationGWh, avgHouseholdAnnualKWh = 1200) {
  if (!isFinite(generationGWh) || generationGWh <= 0) return 0;
  const kwh = generationGWh * 1000000 / 1000;
  return Math.round((generationGWh * 1000) / avgHouseholdAnnualKWh);
}
function formatNumber(n, digits = 2) {
  if (!isFinite(n)) return '-';
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}
function normalizedKey(s) {
  if (!s && s !== 0) return '';
  return String(s).trim().toLowerCase().replace(/\s+/g, ' ');
}
function fuzzyFindState(query) {
  if (!query) return null;
  const q = normalizedKey(query);
  if (!q) return null;
  const exact = Object.keys(stateData).find(k => normalizedKey(k) === q);
  if (exact) return exact;
  const prefix = Object.keys(stateData).find(k => normalizedKey(k).startsWith(q));
  if (prefix) return prefix;
  const includes = Object.keys(stateData).find(k => normalizedKey(k).includes(q));
  if (includes) return includes;
  const tokens = q.split(' ');
  for (const k of Object.keys(stateData)) {
    const nk = normalizedKey(k);
    let matches = 0;
    for (const t of tokens) {
      if (nk.includes(t)) matches++;
    }
    if (matches === tokens.length) return k;
  }
  let best = null;
  let bestScore = -1;
  for (const k of Object.keys(stateData)) {
    const nk = normalizedKey(k);
    const score = _levenshteinScore(q, nk);
    if (score > bestScore) { bestScore = score; best = k; }
  }
  return best;
}
function _levenshteinScore(a, b) {
  if (!a || !b) return 0;
  const dist = _levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - dist / maxLen;
}
function _levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}
function getSolarInfo(stateName, opts = {}) {
  const cf = typeof opts.capacityFactor === 'number' ? opts.capacityFactor : 0.20;
  const panelWp = typeof opts.panelWp === 'number' ? opts.panelWp : 400;
  const gridEf = typeof opts.gridEmissionFactorKgPerMWh === 'number' ? opts.gridEmissionFactorKgPerMWh : 750;
  const avgHouseholdKWh = typeof opts.avgHouseholdAnnualKWh === 'number' ? opts.avgHouseholdAnnualKWh : 1200;
  if (!stateName) return { error: 'stateName required' };
  const key = fuzzyFindState(stateName);
  if (!key) return { error: `No data for "${stateName}"` };
  const installedMW = Number(stateData[key]) || 0;
  const estimatedGWh = estimateAnnualGWh(installedMW, cf);
  const panelCount = estimatePanelCount(installedMW, panelWp);
  const co2 = estimateCO2AvoidedTonnes(estimatedGWh, gridEf);
  const households = estimateHouseholdsPowered(estimatedGWh, avgHouseholdKWh);
  return {
    state: key,
    installedCapacityMW: installedMW,
    capacityFactorUsed: cf,
    panelWpUsed: panelWp,
    estimatedAnnualGenerationGWh: +estimatedGWh.toFixed(4),
    estimatedPanelCount: panelCount,
    estimatedCO2AvoidedTonnes: co2,
    estimatedHouseholdsPowered: households,
    meta: Object.assign({}, meta)
  };
}
function listAllStates(opts = {}) {
  const cf = typeof opts.capacityFactor === 'number' ? opts.capacityFactor : 0.20;
  const panelWp = typeof opts.panelWp === 'number' ? opts.panelWp : 400;
  const gridEf = typeof opts.gridEmissionFactorKgPerMWh === 'number' ? opts.gridEmissionFactorKgPerMWh : 750;
  const avgHouseholdKWh = typeof opts.avgHouseholdAnnualKWh === 'number' ? opts.avgHouseholdAnnualKWh : 1200;
  const arr = [];
  for (const [state, mw] of Object.entries(stateData)) {
    const gwh = estimateAnnualGWh(mw, cf);
    arr.push({
      state,
      installedCapacityMW: +Number(mw).toFixed(4),
      estimatedAnnualGenerationGWh: +gwh.toFixed(4),
      estimatedPanelCount: estimatePanelCount(mw, panelWp),
      estimatedCO2AvoidedTonnes: estimateCO2AvoidedTonnes(gwh, gridEf),
      estimatedHouseholdsPowered: estimateHouseholdsPowered(gwh, avgHouseholdKWh)
    });
  }
  return arr.sort((a, b) => b.installedCapacityMW - a.installedCapacityMW);
}
function analyticsSummary(opts = {}) {
  const cf = typeof opts.capacityFactor === 'number' ? opts.capacityFactor : 0.20;
  const panelWp = typeof opts.panelWp === 'number' ? opts.panelWp : 400;
  const arr = listAllStates({ capacityFactor: cf, panelWp });
  const totalCapacity = arr.reduce((s, x) => s + (Number(x.installedCapacityMW) || 0), 0);
  const totalGeneration = arr.reduce((s, x) => s + (Number(x.estimatedAnnualGenerationGWh) || 0), 0);
  const totalPanels = arr.reduce((s, x) => s + (Number(x.estimatedPanelCount) || 0), 0);
  const top10 = arr.slice(0, 10);
  const byPercent = arr.map(x => ({ state: x.state, installedCapacityMW: x.installedCapacityMW, percentOfTotal: totalCapacity ? +(x.installedCapacityMW / totalCapacity * 100).toFixed(3) : 0 }));
  return {
    totalStates: arr.length,
    totalInstalledCapacityMW: +totalCapacity.toFixed(4),
    totalEstimatedAnnualGenerationGWh: +totalGeneration.toFixed(4),
    totalEstimatedPanelCount: totalPanels,
    top10ByCapacity: top10,
    contributionPercentages: byPercent,
    meta: Object.assign({}, meta)
  };
}
function rankStatesBy(field = 'installedCapacityMW', n = 10, opts = {}) {
  const all = listAllStates(opts);
  if (!all.length) return [];
  if (!['installedCapacityMW', 'estimatedAnnualGenerationGWh', 'estimatedPanelCount', 'estimatedCO2AvoidedTonnes', 'estimatedHouseholdsPowered'].includes(field)) field = 'installedCapacityMW';
  return all.sort((a, b) => Number(b[field] || 0) - Number(a[field] || 0)).slice(0, n);
}
function stateCompare(stateA, stateB, opts = {}) {
  const a = getSolarInfo(stateA, opts);
  const b = getSolarInfo(stateB, opts);
  if (a.error || b.error) return { error: a.error || b.error };
  return {
    A: a,
    B: b,
    diff: {
      installedCapacityMW: +(a.installedCapacityMW - b.installedCapacityMW).toFixed(4),
      annualGenerationGWh: +(a.estimatedAnnualGenerationGWh - b.estimatedAnnualGenerationGWh).toFixed(4),
      panelCount: a.estimatedPanelCount - b.estimatedPanelCount
    },
    meta: Object.assign({}, meta)
  };
}
function generateIframeHTMLForMap(opts = {}) {
  const bbox = opts.bbox || { left: 68.0, bottom: 6.5, right: 98.5, top: 36.0 };
  const layer = opts.layer || 'mapnik';
  const width = opts.width || '100%';
  const height = opts.height || 420;
  const url = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox.left)}%2C${encodeURIComponent(bbox.bottom)}%2C${encodeURIComponent(bbox.right)}%2C${encodeURIComponent(bbox.top)}&layer=${encodeURIComponent(layer)}`;
  return `<iframe src="${url}" width="${width}" height="${height}" frameborder="0" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}
function generateLeafletHtmlSnippet(geoJsonUrl, opts = {}) {
  const mapId = opts.mapId || 'solarMap';
  const width = opts.width || '100%';
  const height = opts.height || '480px';
  const center = opts.center || [22.0, 83.0];
  const zoom = opts.zoom || 5;
  const palette = opts.palette || ['#ffffcc','#c2e699','#78c679','#31a354','#006837'];
  return `<div id="${mapId}" style="width:${width};height:${height};"></div>
<script>
  (function(){
    if (typeof L === 'undefined') {
      console.error('Leaflet is required for this snippet.');
      return;
    }
    const map = L.map('${mapId}').setView([${center[0]}, ${center[1]}], ${zoom});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    fetch('${geoJsonUrl}').then(r=>r.json()).then(geo=>{
      const values = {};
      const data = ${JSON.stringify(listAllStates({capacityFactor: opts.capacityFactor || 0.2, panelWp: opts.panelWp || 400}))};
      data.forEach(d=>values[d.state]=d.installedCapacityMW);
      const max = Math.max(...Object.values(values),1);
      function getColor(v){ if (v<=0) return '#ffffff'; const idx = Math.min(${palette.length}-1, Math.floor(v/max*(${palette.length}-1))); return '${palette[0]}' };
      function style(feature){
        const name = feature.properties.NAME_1 || feature.properties.ST_NM || feature.properties.name || feature.properties.STATE || '';
        const v = values[name] || 0;
        const c = getColor(v);
        return { fillColor: c, weight:1, opacity:1, color:'#666', fillOpacity:0.8 };
      }
      L.geoJSON(geo, { style }).addTo(map);
    }).catch(e=>console.error(e));
  })();
</script>`;
}
function setStateDataFromObject(obj, sourceLabel = 'object') {
  if (!obj || typeof obj !== 'object') return { success: false, error: 'Invalid object' };
  const out = {};
  let rows = 0;
  for (const [k, v] of Object.entries(obj)) {
    const key = String(k).trim();
    const num = Number(v);
    out[key] = isFinite(num) ? num : 0;
    rows++;
  }
  stateData = out;
  meta.source = sourceLabel;
  meta.lastUpdated = new Date().toISOString();
  meta.rawRemoteUrl = null;
  meta.loadedRows = rows;
  meta.errors = [];
  return { success: true, loadedRows: rows };
}
async function loadRemoteData(url, opts = {}) {
  if (!url) return { success: false, error: 'url required' };
  meta.rawRemoteUrl = url;
  meta.source = 'remote';
  meta.lastUpdated = null;
  meta.loadedRows = 0;
  meta.errors = [];
  try {
    const mode = opts.fetchOptions && opts.fetchOptions.mode ? opts.fetchOptions.mode : 'cors';
    const resp = await (typeof fetch === 'undefined' ? _nodeFetch(url, opts.fetchOptions) : fetch(url, { mode, ...opts.fetchOptions }));
    if (!resp) throw new Error('No response object');
    if (!resp.ok && resp.status) throw new Error(`HTTP ${resp.status}`);
    const contentType = resp.headers && resp.headers.get ? resp.headers.get('content-type') || '' : (resp.headers && resp.headers['content-type'] ? resp.headers['content-type'] : '');
    const text = await resp.text();
    if (contentType.includes('application/json') || url.toLowerCase().endsWith('.json')) {
      const parsed = JSON.parse(text);
      const arr = Array.isArray(parsed) ? parsed : (parsed.data || parsed.results || parsed.rows || []);
      if (!Array.isArray(arr)) throw new Error('JSON format not array');
      const mapped = _mapRowsToStateObjectFromArray(arr);
      stateData = mapped.out;
      meta.lastUpdated = new Date().toISOString();
      meta.loadedRows = mapped.count;
      return { success: true, count: mapped.count, source: url };
    } else {
      const rows = csvToArray(text);
      if (!rows || !rows.length) throw new Error('CSV parse yielded no rows');
      const headers = rows[0].map(h => String(h).trim());
      const idxState = headers.findIndex(h => /state|state\/ut|state ut|state_ut|statenm|name/i.test(h));
      const idxInstall = headers.findIndex(h => /install|installed|capacity|solar|mw|megawatt/i.test(h));
      if (idxState === -1 || idxInstall === -1) {
        const mappedGuess = _tryMapByHeuristics(headers);
        if (!mappedGuess.stateIndex || !mappedGuess.installIndex) throw new Error('CSV headers cannot be mapped to state and installation columns');
        const out = {};
        let count = 0;
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          const name = (r[mappedGuess.stateIndex] || '').trim();
          if (!name) continue;
          const raw = (r[mappedGuess.installIndex] || '').trim();
          const num = Number(String(raw).replace(/[^0-9.\-\.]/g, '')) || 0;
          out[name] = num;
          count++;
        }
        stateData = out;
        meta.lastUpdated = new Date().toISOString();
        meta.loadedRows = count;
        return { success: true, count, source: url };
      } else {
        const out = {};
        let count = 0;
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          const name = (r[idxState] || '').trim();
          if (!name) continue;
          const raw = (r[idxInstall] || '').trim();
          const num = Number(String(raw).replace(/[^0-9.\-\.]/g, '')) || 0;
          out[name] = num;
          count++;
        }
        stateData = out;
        meta.lastUpdated = new Date().toISOString();
        meta.loadedRows = count;
        return { success: true, count, source: url };
      }
    }
  } catch (err) {
    meta.errors.push(String(err && err.message ? err.message : err));
    stateData = Object.assign({}, DEFAULT_DATA);
    meta.source = 'fallback';
    meta.lastUpdated = new Date().toISOString();
    return { success: false, error: String(err && err.message ? err.message : err) };
  }
}
function _mapRowsToStateObjectFromArray(arr) {
  const out = {};
  let count = 0;
  for (const row of arr) {
    if (!row || typeof row !== 'object') continue;
    const name = row['State/UT'] || row['State'] || row['state'] || row['STATE'] || row['statenm'] || row['State Name'] || row['STATE_NAME'] || row['state_ut'];
    const val = row['Installed Capacity (MW)'] || row['Installed Capacity'] || row['Solar Power (MW)'] || row['installed_capacity_mw'] || row['installed_capacity'] || row['capacity_mw'] || row['Capacity'];
    if (!name) continue;
    const num = Number(String(val).replace(/[^0-9.\-\.]/g, '')) || 0;
    out[String(name).trim()] = num;
    count++;
  }
  return { out, count };
}
function _tryMapByHeuristics(headers) {
  const h = headers.map(x => String(x).toLowerCase());
  let stateIndex = -1;
  let installIndex = -1;
  for (let i = 0; i < h.length; i++) {
    if (/(state|state\/ut|state ut|state_ut|statenm|name)/.test(h[i])) stateIndex = i;
    if (/(install|installed|capacity|solar|mw|megawatt|power)/.test(h[i])) installIndex = i;
  }
  return { stateIndex: stateIndex === -1 ? null : stateIndex, installIndex: installIndex === -1 ? null : installIndex };
}
function csvToArray(text) {
  const lines = text.split(/\r\n|\n/);
  const rows = [];
  for (const line of lines) {
    const row = [];
    let cur = '';
    let inside = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inside = !inside;
      } else if (ch === ',' && !inside) {
        row.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    row.push(cur);
    rows.push(row);
  }
  return rows;
}
async function _nodeFetch(url, fetchOptions) {
  try {
    const nodeFetch = require('node-fetch');
    return await nodeFetch(url, fetchOptions);
  } catch (e) {
    throw new Error('node-fetch unavailable, cannot fetch in Node environment');
  }
}
function getMeta() {
  return Object.assign({}, meta);
}
function resetToDefault() {
  stateData = Object.assign({}, DEFAULT_DATA);
  meta = { source: 'fallback', lastUpdated: null, rawRemoteUrl: null, loadedRows: 0, errors: [] };
  return { success: true };
}
function importStateDataFromCSVText(csvText, options = {}) {
  const rows = csvToArray(csvText);
  if (!rows || !rows.length) return { success: false, error: 'CSV parse failure' };
  const headers = rows[0].map(h => String(h).trim());
  const idxState = headers.findIndex(h => /state|state\/ut|state ut|name/i.test(h));
  const idxInstall = headers.findIndex(h => /install|installed|capacity|mw|solar|power/i.test(h));
  if (idxState === -1 || idxInstall === -1) return { success: false, error: 'CSV headers not mapped' };
  const out = {};
  let count = 0;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const name = (r[idxState] || '').trim();
    if (!name) continue;
    const raw = (r[idxInstall] || '').trim();
    const num = Number(String(raw).replace(/[^0-9.\-\.]/g, '')) || 0;
    out[name] = num;
    count++;
  }
  stateData = out;
  meta.source = 'imported-csv';
  meta.lastUpdated = new Date().toISOString();
  meta.loadedRows = count;
  return { success: true, count };
}
function toCSV(objArr) {
  if (!Array.isArray(objArr)) return '';
  if (!objArr.length) return '';
  const headers = Object.keys(objArr[0]);
  const lines = [];
  lines.push(headers.join(','));
  for (const row of objArr) {
    const vals = headers.map(h => {
      const v = row[h];
      if (v === null || v === undefined) return '';
      const s = String(v);
      if (s.includes(',') || s.includes('"')) return `"${s.replace(/"/g, '""')}"`;
      return s;
    });
    lines.push(vals.join(','));
  }
  return lines.join('\n');
}
function exportStateDataAsJSON(pretty = false) {
  return pretty ? JSON.stringify(stateData, null, 2) : JSON.stringify(stateData);
}
function exportAnalyticsAsCSV(opts = {}) {
  const arr = listAllStates(opts);
  const rows = arr.map(r => ({
    State: r.state,
    InstalledCapacityMW: r.installedCapacityMW,
    EstimatedAnnualGenerationGWh: r.estimatedAnnualGenerationGWh,
    EstimatedPanelCount: r.estimatedPanelCount,
    EstimatedCO2AvoidedTonnes: r.estimatedCO2AvoidedTonnes,
    EstimatedHouseholdsPowered: r.estimatedHouseholdsPowered
  }));
  return toCSV(rows);
}
function smartLoad(urls = [], opts = {}) {
  if (!Array.isArray(urls)) urls = [urls];
  const proxy = opts.proxy || null;
  const tryUrls = urls.map(u => String(u));
  const sequence = async () => {
    for (let i = 0; i < tryUrls.length; i++) {
      const raw = tryUrls[i];
      const target = proxy ? (proxy.replace('{url}', encodeURIComponent(raw))) : raw;
      const res = await loadRemoteData(target, opts.fetchOptions || {});
      if (res && res.success) return res;
    }
    return { success: false, error: 'All URLs failed' };
  };
  return sequence();
}
function prettyPrintStateInfo(stateName, opts = {}) {
  const info = getSolarInfo(stateName, opts);
  if (info.error) return info.error;
  const lines = [];
  lines.push(`State: ${info.state}`);
  lines.push(`Installed Capacity: ${formatNumber(info.installedCapacityMW, 2)} MW`);
  lines.push(`Capacity Factor Used: ${info.capacityFactorUsed}`);
  lines.push(`Estimated Annual Generation: ${formatNumber(info.estimatedAnnualGenerationGWh, 3)} GWh`);
  lines.push(`Estimated Panel Count (@${info.panelWpUsed} Wp): ${formatNumber(info.estimatedPanelCount, 0)}`);
  lines.push(`Estimated CO2 Avoided: ${formatNumber(info.estimatedCO2AvoidedTonnes, 2)} tonnes`);
  lines.push(`Estimated Households Powered: ${formatNumber(info.estimatedHouseholdsPowered, 0)}`);
  return lines.join('\n');
}
function bulkQuery(states = [], opts = {}) {
  if (!Array.isArray(states)) return [];
  return states.map(s => getSolarInfo(s, opts));
}
function suggestStates(prefix = '', limit = 10) {
  const p = normalizedKey(prefix || '');
  if (!p) return Object.keys(stateData).slice(0, limit);
  const list = Object.keys(stateData).filter(k => normalizedKey(k).includes(p));
  if (!list.length) {
    const scored = Object.keys(stateData).map(k => ({ k, score: _levenshteinScore(p, normalizedKey(k)) }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(x => x.k);
  }
  return list.slice(0, limit);
}
function getStateGeoJsonFeatureNameFields() {
  return ['NAME_1', 'ST_NM', 'name', 'STATE', 'STATE_NAME', 'Name'];
}
const API = {
  getSolarInfo,
  listAllStates,
  analyticsSummary,
  rankStatesBy,
  stateCompare,
  loadRemoteData,
  smartLoad,
  setStateDataFromObject,
  importStateDataFromCSVText,
  exportStateDataAsJSON,
  exportAnalyticsAsCSV,
  generateIframeHTMLForMap,
  generateLeafletHtmlSnippet,
  getMeta,
  resetToDefault,
  prettyPrintStateInfo,
  bulkQuery,
  suggestStates,
  toCSV
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = API;
} else {
  if (typeof window !== 'undefined') {
    window.SolarStateAPI = API;
  }
}
