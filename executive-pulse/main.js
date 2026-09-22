(function () {
  'use strict';

  /* ─── CSS ───────────────────────────────────────────────────────────────── */
  const CSS = `
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    :host {
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif;
      color: #1a1f2e;
      background: transparent;
      overflow: hidden;
    }

    .scale-host { width: 100%; height: 100%; overflow: hidden; }
    .scale-inner { transform-origin: top left; width: 640px; }

    .pulse-root {
      width: 640px;
      background: #fff;
      border-radius: 16px;
      overflow: hidden;
      position: relative;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.08), 0 24px 48px rgba(0,0,0,0.04);
      border: 1px solid rgba(0,0,0,0.07);
    }
    /* ── EYEBROW ACCENT LINE ── */
    @keyframes accent-sweep {
      from { width: 0; }
      to   { width: 100%; }
    }
    .accent-line {
      height: 4px; width: 0;
      background: #e2e8f0;
    }
    .accent-line.adverse   { background: linear-gradient(90deg, #dc2626 0%, #ef4444 60%, #fca5a5 100%); }
    .accent-line.favorable { background: linear-gradient(90deg, #16a34a 0%, #22c55e 60%, #86efac 100%); }
    .accent-line.neutral   { background: #e2e8f0; }
    .accent-line.animate   { animation: accent-sweep 1.8s cubic-bezier(0.4, 0, 0.2, 1) forwards; }

    /* ── HERO ── */
    .hero {
      padding: 20px 24px 0 24px;
    }
    .hero-meta {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 16px;
    }
    .hero-brand {
      display: flex; align-items: center; gap: 7px;
    }
    .pulse-icon-wrap {
      width: 20px; height: 20px; position: relative; flex-shrink: 0;
    }
    /* Animated SVG pulse line — static */
    .pulse-line { opacity: 0.35; }

    /* ── PULSE DIV ANIMATION ── */
    @keyframes pulse-beat {
      0%   { transform: scaleX(0);    opacity: 1; }
      60%  { transform: scaleX(1);    opacity: 1; }
      100% { transform: scaleX(1);    opacity: 0; }
    }
    .pulse-bar {
      position: absolute; bottom: 0; left: 0;
      width: 100%; height: 2px;
      background: #2563eb;
      transform-origin: left center;
      transform: scaleX(0);
      opacity: 0;
      border-radius: 0 2px 2px 0;
    }
    .pulse-bar.firing {
      animation: pulse-beat 1.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
    .widget-title {
      font-size: 10px; font-weight: 700; color: #94a3b8; letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .replay-btn {
      display: flex; align-items: center; gap: 5px;
      padding: 5px 11px; border: 1px solid rgba(0,0,0,0.10);
      border-radius: 20px; background: #fff; cursor: pointer;
      font-size: 10px; font-weight: 600; color: #64748b;
      transition: background 0.15s, border-color 0.15s, color 0.15s; white-space: nowrap;
    }
    .replay-btn:hover { background: #f8fafc; border-color: rgba(0,0,0,0.18); color: #1a1f2e; }

    /* ── KPI BLOCK ── */
    @keyframes kpi-enter {
      from { opacity: 0; transform: translateY(24px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0)    scale(1);    }
    }
    .kpi-reveal {
      animation: kpi-enter 800ms cubic-bezier(0.16, 1, 0.3, 1) both;
      animation-delay: 200ms;
    }
    .kpi-row {
      display: flex; align-items: flex-end; gap: 16px;
      margin-bottom: 6px;
    }
    .kpi-label {
      font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
      text-transform: uppercase; color: #94a3b8; margin-bottom: 6px;
    }
    .kpi-value {
      font-size: 52px; font-weight: 800; color: #0f172a;
      line-height: 1; letter-spacing: -0.03em;
    }
    .kpi-delta-badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 5px 10px; border-radius: 8px; margin-bottom: 8px;
      font-size: 14px; font-weight: 700; line-height: 1;
    }
    .kpi-delta-badge.adverse   { background: rgba(220,38,38,0.08);  color: #b91c1c; }
    .kpi-delta-badge.favorable { background: rgba(22,163,74,0.08);  color: #15803d; }
    .kpi-delta-badge.neutral   { background: rgba(100,116,139,0.08); color: #475569; }
    .kpi-vs {
      font-size: 11px; font-weight: 500; color: #94a3b8; margin-bottom: 18px;
    }
    .consecutive-warning {
      font-size: 11px; color: #92400e; background: #fef3c7; border: 1px solid #fde68a;
      border-radius: 6px; padding: 6px 10px; margin-bottom: 14px;
    }

    /* ── NARRATIVE ── */
    .narrative-block {
      padding: 0 0 20px 0;
      border-bottom: 1px solid rgba(0,0,0,0.06);
    }
    .narrative-text {
      font-size: 14px; color: #334155; line-height: 1.75;
    }
    .narrative-summary {
      margin-top: 12px; font-size: 11px; color: #64748b; font-weight: 500;
      padding: 7px 12px; background: #f8fafc; border-radius: 8px;
      line-height: 1.55; border-left: 2px solid #cbd5e1;
      opacity: 0; transition: opacity 0.5s ease;
    }
    .narrative-summary.visible { opacity: 1; }

    /* ── CHIPS ── */
    .chip {
      display: inline-block; padding: 2px 8px; border-radius: 20px;
      font-size: 13px; font-weight: 600; cursor: pointer;
      border: 1.5px solid transparent; transition: all 0.15s; white-space: nowrap;
    }
    .chip.adverse {
      background: rgba(220,38,38,0.07); color: #b91c1c; border-color: rgba(220,38,38,0.18);
    }
    .chip.adverse:hover, .chip.adverse.active {
      background: rgba(220,38,38,0.12); border-color: rgba(220,38,38,0.4);
    }
    .chip.favorable {
      background: rgba(22,163,74,0.07); color: #15803d; border-color: rgba(22,163,74,0.18);
    }
    .chip.favorable:hover, .chip.favorable.active {
      background: rgba(22,163,74,0.12); border-color: rgba(22,163,74,0.4);
    }
    .num { font-weight: 700; }
    .num.adverse   { color: #b91c1c; }
    .num.favorable { color: #15803d; }

    /* ── NARRATIVE ANIMATION ── */
    .narrative-text .n-part { opacity: 0; transition: opacity 0.5s ease; display: inline; }
    .narrative-text .n-part.visible { opacity: 1; }

    /* ── IMPACT CHART — true diverging axis ── */
    .chart-section {
      padding: 20px 24px 4px;
      border-bottom: 1px solid rgba(0,0,0,0.06);
      opacity: 0; transform: translateY(6px);
      transition: opacity 0.45s ease, transform 0.45s ease;
    }
    .chart-section.visible { opacity: 1; transform: translateY(0); }
    .section-label {
      font-size: 9px; font-weight: 700; letter-spacing: 0.13em;
      text-transform: uppercase; color: #94a3b8; margin-bottom: 14px;
    }

    /* Diverging chart layout:
       NAME(left) | VALUE(left) | BAR-LEFT | AXIS | BAR-RIGHT | VALUE(right) | NAME(right)
       Columns are defined inline via JS for precise sizing. */
    .div-row {
      height: 34px; margin-bottom: 1px;
      cursor: pointer; border-radius: 6px;
      transition: background 0.15s;
    }
    .div-row:hover  { background: rgba(0,0,0,0.022); }
    .div-row.active { background: rgba(37,99,235,0.045); }

    .div-name {
      font-size: 12px; font-weight: 600; color: #1a1f2e;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .div-value {
      font-size: 11px; font-weight: 700; white-space: nowrap;
    }
    .div-value.adverse   { color: #b91c1c; }
    .div-value.favorable { color: #15803d; }

    .div-bar-fill {
      height: 14px; border-radius: 3px; width: 0;
      transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .div-bar-fill.adverse  { background: linear-gradient(90deg, #dc2626, #f87171); }
    .div-bar-fill.favorable { background: linear-gradient(90deg, #22c55e, #16a34a); }

    /* ── EVIDENCE CARD ── */
    .evidence {
      overflow: hidden; max-height: 0; opacity: 0;
      transition: max-height 0.45s cubic-bezier(0.4,0,0.2,1),
                  opacity 0.3s ease, margin 0.3s ease;
      margin: 0 24px;
    }
    .evidence.open { max-height: 180px; opacity: 1; margin: 2px 24px 0; }

    .evidence-inner {
      background: #f8faff;
      border: 1px solid rgba(37,99,235,0.13);
      border-radius: 10px;
      padding: 14px 18px 12px;
      position: relative;
    }
    .evidence-inner::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
      border-radius: 10px 10px 0 0;
      background: linear-gradient(90deg, #2563eb, #60a5fa);
    }
    .evidence-top {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 12px;
    }
    .evidence-name {
      font-size: 13px; font-weight: 700; color: #0f172a;
      display: flex; align-items: center; gap: 6px;
    }
    .evidence-mode-badge {
      font-size: 9px; font-weight: 700; letter-spacing: 0.1em;
      text-transform: uppercase; color: #2563eb;
      background: rgba(37,99,235,0.09); border-radius: 4px; padding: 2px 6px;
    }
    .evidence-close {
      font-size: 16px; color: #94a3b8; cursor: pointer;
      line-height: 1; padding: 2px 4px; border-radius: 4px;
      transition: background 0.15s, color 0.15s;
    }
    .evidence-close:hover { background: rgba(0,0,0,0.06); color: #475569; }
    .evidence-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px 16px;
      margin-bottom: 10px;
    }
    .ev-cell { display: flex; flex-direction: column; gap: 3px; }
    .ev-label {
      font-size: 9px; color: #94a3b8; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.09em;
    }
    .ev-value { font-size: 16px; font-weight: 800; color: #0f172a; letter-spacing: -0.01em; }
    .ev-value.adverse   { color: #b91c1c; }
    .ev-value.favorable { color: #15803d; }
    .ev-rank {
      font-size: 10px; color: #64748b;
      padding-top: 8px; border-top: 1px solid rgba(0,0,0,0.06);
    }

    /* ── EXPLANATION LAYER — cinematic second dimension ── */
    .explanation-section {
      overflow: hidden; max-height: 0; opacity: 0;
      transition: max-height 0.6s cubic-bezier(0.4,0,0.2,1), opacity 0.5s ease;
    }
    .explanation-section.visible {
      opacity: 1; max-height: 700px;
    }
    .explanation-inner {
      margin: 0 24px 24px;
      background: #f8fafc;
      border-radius: 12px;
      border: 1px solid rgba(0,0,0,0.06);
      overflow: hidden;
    }
    .explanation-header-bar {
      padding: 12px 18px 10px;
      background: #fff;
      border-bottom: 1px solid rgba(0,0,0,0.06);
      display: flex; align-items: baseline; justify-content: space-between;
    }
    .explanation-title {
      font-size: 10px; font-weight: 700; letter-spacing: 0.11em;
      text-transform: uppercase; color: #2563eb;
    }
    .explanation-summary {
      font-size: 10px; color: #94a3b8; font-weight: 500;
    }
    .explanation-bars {
      padding: 14px 18px 16px;
    }
    .exp-div-row {
      height: 34px; margin-bottom: 1px;
      cursor: default; border-radius: 6px;
    }
    .exp-bar-fill {
      height: 14px; border-radius: 3px; width: 0;
      transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .exp-bar-fill.adverse  { background: linear-gradient(90deg, #dc2626, #f87171); }
    .exp-bar-fill.favorable { background: linear-gradient(90deg, #22c55e, #16a34a); }
    .exp-bar-value { font-size: 11px; font-weight: 700; white-space: nowrap; }
    .exp-bar-value.adverse   { color: #b91c1c; }
    .exp-bar-value.favorable { color: #15803d; }

    /* ── EMPTY STATE ── */
    .state-msg {
      display: flex; align-items: center; justify-content: center;
      min-height: 180px; color: #94a3b8; font-size: 13px; font-weight: 500;
      padding: 24px; text-align: center; letter-spacing: 0.01em;
    }

  `;

  /* ─── HELPERS ────────────────────────────────────────────────────────────── */

  function cleanName(raw) {
    if (!raw || raw === '#' || raw === 'null' || raw === 'undefined') return '(Unassigned)';
    let s = String(raw);
    const slash = s.lastIndexOf('/');
    if (slash >= 0 && slash < s.length - 1) s = s.slice(slash + 1);
    if (s.endsWith('_SH')) s = s.slice(0, -3);
    if (s === s.toUpperCase() && s.length > 4) s = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    return s.trim() || '(Unassigned)';
  }

  function fmtAbs(v, unit) {
    if (v === null || v === undefined || isNaN(v)) return '–';
    const abs = Math.abs(v);
    let f;
    if (abs >= 1e9) f = (v / 1e9).toFixed(1) + 'B';
    else if (abs >= 1e6) f = (v / 1e6).toFixed(1) + 'M';
    else if (abs >= 1e3) f = (v / 1e3).toFixed(1) + 'K';
    else f = v.toFixed(1);
    return unit ? unit + ' ' + f : f;
  }

  function fmtDelta(d, unit) {
    if (d === null || d === undefined || isNaN(d)) return '–';
    return (d >= 0 ? '+' : '') + fmtAbs(d, unit);
  }

  // Contributor formatter — 2 decimal places in M range for disambiguation
  function fmtContrib(v, unit) {
    if (v === null || v === undefined || isNaN(v)) return '–';
    const abs = Math.abs(v);
    let f;
    if (abs >= 1e9) f = (v / 1e9).toFixed(2) + 'B';
    else if (abs >= 1e6) f = (v / 1e6).toFixed(2) + 'M';
    else if (abs >= 1e3) f = (v / 1e3).toFixed(2) + 'K';
    else f = v.toFixed(2);
    return unit ? unit + ' ' + f : f;
  }
  function fmtContribDelta(d, unit) {
    if (d === null || d === undefined || isNaN(d)) return '–';
    return (d >= 0 ? '+' : '') + fmtContrib(d, unit);
  }

  function fmtPct(cur, prior) {
    if (prior === null || prior === undefined || isNaN(prior) || prior === 0) return null;
    const p = ((cur - prior) / Math.abs(prior)) * 100;
    return (p >= 0 ? '+' : '') + p.toFixed(1) + '%';
  }

  function isAdv(delta, polarity) {
    return polarity === 'lower-is-better' ? delta > 0 : delta < 0;
  }

  function ordinal(n) {
    const s = ['th','st','nd','rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  /* ─── V3 TIME HELPERS ───────────────────────────────────────────────────── */

  const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function extractYearOnly(id) {
    const s = String(id ?? '').trim();
    if (!/^\d{4}$/.test(s)) return null;
    const y = parseInt(s, 10);
    return (y >= 1900 && y <= 2200) ? y : null;
  }

  function extractYearMonth(id) {
    const s = String(id ?? '').trim();
    if (!/^\d{6}$/.test(s)) return null;
    const year  = parseInt(s.slice(0, 4), 10);
    const month = parseInt(s.slice(4, 6), 10);
    if (month < 1 || month > 12) return null;
    if (year < 1900 || year > 2200) return null;
    return { year, month, key: s };
  }

  function formatPeriodSetLabel(monthNums, year) {
    if (!monthNums || monthNums.length === 0) return String(year);
    const sorted = [...monthNums].sort((a, b) => a - b);
    if (sorted.length === 1) {
      return `${MONTH_ABBR[sorted[0] - 1]} ${year}`;
    }
    const isContiguous = sorted.every((m, i) => i === 0 || m === sorted[i - 1] + 1);
    if (isContiguous) {
      return `${MONTH_ABBR[sorted[0] - 1]}–${MONTH_ABBR[sorted[sorted.length - 1] - 1]} ${year}`;
    }
    if (sorted.length <= 4) {
      return sorted.map(m => MONTH_ABBR[m - 1]).join(', ') + ` ${year}`;
    }
    return `${sorted.length} periods in ${year}`;
  }

  // Detects whether timePeriod members are YYYY (year) or YYYYMM (year/month).
  // Returns 'year' | 'yearmonth' | 'unsupported'
  function detectTimeMode(realPeriods) {
    const allYear      = realPeriods.every(id => extractYearOnly(id) !== null);
    const allYearMonth = realPeriods.every(id => extractYearMonth(id) !== null);
    if (allYear)      return 'year';
    if (allYearMonth) return 'yearmonth';
    return 'unsupported';
  }

  // ── Year Mode ──────────────────────────────────────────────────────────────
  // timePeriod contains plain YYYY members. Simple year-vs-year comparison.
  // Returns same shape as parseBindingYearMonth for consistent downstream handling.
  function parseBindingYear(data, tpAlias, dimKeys, measKey) {
    const yearIds = [...new Set(
      data.map(r => r[tpAlias] && r[tpAlias].id).filter(Boolean)
    )].filter(id => String(id) !== '@TotalMember');

    const years = yearIds.map(id => extractYearOnly(id)).filter(Boolean).sort((a, b) => a - b);
    if (years.length < 2) return { state: 'insufficient-years' };

    const resolvedCur   = years[years.length - 1];
    const resolvedPrior = years[years.length - 2];

    // dimensions: Executive + optional Explanation (no time heuristic)
    let dim1Key, dim2Key = null;
    if (dimKeys.length === 0) return { state: 'no-data' };
    if (dimKeys.length === 1) {
      dim1Key = dimKeys[0];
    } else if (dimKeys.length === 2) {
      const counts = dimKeys.map(k => new Set(data.map(r => r[k] && r[k].id)).size);
      const minIdx = counts.indexOf(Math.min(...counts));
      dim1Key = dimKeys[minIdx];
      dim2Key = dimKeys.find((_, i) => i !== minIdx) || null;
    } else {
      return { state: 'too-many-dims' };
    }

    const memberMap  = {};
    const explainMap = {};

    for (const row of data) {
      const tp = row[tpAlias];
      if (!tp || String(tp.id) === '@TotalMember') continue;
      const rowYear = extractYearOnly(String(tp.id));
      if (!rowYear) continue;

      const mem1 = row[dim1Key];
      if (!mem1 || String(mem1.id) === '@TotalMember') continue;

      const measCell = row[measKey];
      const val      = measCell && measCell.raw !== undefined ? Number(measCell.raw) : null;
      const mem1Id   = String(mem1.id);

      if (!memberMap[mem1Id]) memberMap[mem1Id] = { label: mem1.label || mem1.id, cur: null, prior: null };
      if (rowYear === resolvedCur)   memberMap[mem1Id].cur   = (memberMap[mem1Id].cur   ?? 0) + (val ?? 0);
      if (rowYear === resolvedPrior) memberMap[mem1Id].prior = (memberMap[mem1Id].prior ?? 0) + (val ?? 0);

      if (dim2Key) {
        const mem2 = row[dim2Key];
        if (!mem2 || String(mem2.id) === '@TotalMember') continue;
        const mem2Id = String(mem2.id);
        if (!explainMap[mem1Id]) explainMap[mem1Id] = {};
        if (!explainMap[mem1Id][mem2Id]) explainMap[mem1Id][mem2Id] = { label: mem2.label || mem2.id, cur: null, prior: null };
        if (rowYear === resolvedCur)   explainMap[mem1Id][mem2Id].cur   = (explainMap[mem1Id][mem2Id].cur   ?? 0) + (val ?? 0);
        if (rowYear === resolvedPrior) explainMap[mem1Id][mem2Id].prior = (explainMap[mem1Id][mem2Id].prior ?? 0) + (val ?? 0);
      }
    }

    const members = Object.entries(memberMap).map(([id, info]) => {
      const { cur, prior } = info;
      const delta = (cur !== null && prior !== null) ? cur - prior
                  : (cur !== null ? cur : prior !== null ? -prior : null);
      return { id, label: cleanName(info.label), cur, prior, delta,
               isNew: prior === null && cur !== null,
               isLost: cur === null && prior !== null };
    });

    return {
      state: 'ok',
      members,
      resolvedCur:   String(resolvedCur),
      resolvedPrior: String(resolvedPrior),
      curPeriodLabel:   String(resolvedCur),
      priorPeriodLabel: String(resolvedPrior),
      explainMap,
      dim2Key,
    };
  }

  // ── Year/Month Mode ────────────────────────────────────────────────────────
  // Returns { state, members, resolvedCur, resolvedPrior, curPeriodLabel, priorPeriodLabel, explainMap, dim2Key }
  // state: 'ok' | 'no-data' | 'unsupported' | 'no-overlap' | 'insufficient-years' | 'too-many-dims'
  function parseBindingYearMonth(data, tpAlias, dimKeys, measKey, comparisonMode) {
    const rawPeriods  = [...new Set(data.map(r => r[tpAlias] && r[tpAlias].id).filter(Boolean))];
    const realPeriods = rawPeriods.filter(id => String(id) !== '@TotalMember');
    if (realPeriods.length === 0) return { state: 'no-data' };

    const parsed = realPeriods.map(id => extractYearMonth(id));
    if (parsed.some(p => p === null)) return { state: 'unsupported' };

    const years = [...new Set(parsed.map(p => p.year))].sort((a, b) => a - b);
    if (years.length < 2) return { state: 'insufficient-years' };
    const resolvedCur   = years[years.length - 1];
    const resolvedPrior = years[years.length - 2];

    const curMonths   = new Set(parsed.filter(p => p.year === resolvedCur).map(p => p.month));
    const priorMonths = new Set(parsed.filter(p => p.year === resolvedPrior).map(p => p.month));

    let curMatchMonths, priorMatchMonths;
    const mode = comparisonMode === 'all-prior' ? 'all-prior' : 'same-period';
    if (mode === 'same-period') {
      const common = new Set([...curMonths].filter(m => priorMonths.has(m)));
      if (common.size === 0) return { state: 'no-overlap' };
      curMatchMonths   = common;
      priorMatchMonths = common;
    } else {
      curMatchMonths   = curMonths;
      priorMatchMonths = priorMonths;
    }

    // dimensions: Executive + optional Explanation (max 2, no time heuristic)
    let dim1Key, dim2Key = null;
    if (dimKeys.length === 0) return { state: 'no-data' };
    if (dimKeys.length === 1) {
      dim1Key = dimKeys[0];
    } else if (dimKeys.length === 2) {
      const counts = dimKeys.map(k => new Set(data.map(r => r[k] && r[k].id)).size);
      const minIdx = counts.indexOf(Math.min(...counts));
      dim1Key = dimKeys[minIdx];
      dim2Key = dimKeys.find((_, i) => i !== minIdx) || null;
    } else {
      return { state: 'too-many-dims' };
    }

    const memberMap  = {};
    const explainMap = {};

    for (const row of data) {
      const tp = row[tpAlias];
      if (!tp) continue;
      const tpId = String(tp.id);
      if (tpId === '@TotalMember') continue;

      const ym = extractYearMonth(tpId);
      if (!ym) continue;

      const mem1 = row[dim1Key];
      if (!mem1 || String(mem1.id) === '@TotalMember') continue;

      const measCell = row[measKey];
      const val      = measCell && measCell.raw !== undefined ? Number(measCell.raw) : null;
      const mem1Id   = String(mem1.id);

      if (!memberMap[mem1Id]) memberMap[mem1Id] = { label: mem1.label || mem1.id, cur: null, prior: null };
      if (ym.year === resolvedCur && curMatchMonths.has(ym.month))
        memberMap[mem1Id].cur   = (memberMap[mem1Id].cur   ?? 0) + (val ?? 0);
      else if (ym.year === resolvedPrior && priorMatchMonths.has(ym.month))
        memberMap[mem1Id].prior = (memberMap[mem1Id].prior ?? 0) + (val ?? 0);

      if (dim2Key) {
        const mem2 = row[dim2Key];
        if (!mem2 || String(mem2.id) === '@TotalMember') continue;
        const mem2Id = String(mem2.id);
        if (!explainMap[mem1Id]) explainMap[mem1Id] = {};
        if (!explainMap[mem1Id][mem2Id]) explainMap[mem1Id][mem2Id] = { label: mem2.label || mem2.id, cur: null, prior: null };
        if (ym.year === resolvedCur && curMatchMonths.has(ym.month))
          explainMap[mem1Id][mem2Id].cur   = (explainMap[mem1Id][mem2Id].cur   ?? 0) + (val ?? 0);
        else if (ym.year === resolvedPrior && priorMatchMonths.has(ym.month))
          explainMap[mem1Id][mem2Id].prior = (explainMap[mem1Id][mem2Id].prior ?? 0) + (val ?? 0);
      }
    }

    const members = Object.entries(memberMap).map(([id, info]) => {
      const { cur, prior } = info;
      const delta = (cur !== null && prior !== null) ? cur - prior
                  : (cur !== null ? cur : prior !== null ? -prior : null);
      return { id, label: cleanName(info.label), cur, prior, delta,
               isNew: prior === null && cur !== null,
               isLost: cur === null && prior !== null };
    });

    const curPeriodLabel   = formatPeriodSetLabel([...curMatchMonths],   resolvedCur);
    const priorPeriodLabel = formatPeriodSetLabel([...priorMatchMonths], resolvedPrior);

    return {
      state: 'ok',
      members,
      resolvedCur:   String(resolvedCur),
      resolvedPrior: String(resolvedPrior),
      curPeriodLabel,
      priorPeriodLabel,
      explainMap,
      dim2Key,
    };
  }

  // ── Dispatcher ─────────────────────────────────────────────────────────────
  function parseBindingTimePeriod(dataBinding, comparisonMode) {
    const data  = dataBinding.data;
    if (!data || data.length === 0) return { state: 'no-data' };

    const meta  = dataBinding.metadata;
    const feeds = meta && meta.feeds;
    if (!feeds) return { state: 'no-data' };

    const tpValues = feeds.timePeriod && feeds.timePeriod.values;
    if (!tpValues || tpValues.length === 0) return { state: 'no-data' };
    if (tpValues.length > 1) return { state: 'too-many-time-dims' };

    const tpAlias  = tpValues[0];
    const measKeys = Object.keys(data[0]).filter(k => k.startsWith('measures_'));
    const dimKeys  = Object.keys(data[0]).filter(k => k.startsWith('dimensions_'));

    if (measKeys.length < 1) return { state: 'no-data' };

    const rawPeriods  = [...new Set(data.map(r => r[tpAlias] && r[tpAlias].id).filter(Boolean))];
    const realPeriods = rawPeriods.filter(id => String(id) !== '@TotalMember');
    if (realPeriods.length === 0) return { state: 'no-data' };

    const timeMode = detectTimeMode(realPeriods);
    if (timeMode === 'unsupported') return { state: 'unsupported' };

    const measKey = measKeys[0];
    if (timeMode === 'year') {
      return parseBindingYear(data, tpAlias, dimKeys, measKey);
    }
    return parseBindingYearMonth(data, tpAlias, dimKeys, measKey, comparisonMode);
  }

  /* ─── PARSE (Legacy V2) ──────────────────────────────────────────────────── */
  // Supports 2 or 3 dimensions.
  // Time dim   = fewest unique values
  // Dim 1 (Executive Layer)   = second most unique values (or first non-time)
  // Dim 2 (Explanation Layer) = most unique values (or second non-time, optional)
  //
  // Cross-dim data structure for Explanation Layer:
  //   explainMap[dim1MemberId][dim2MemberId] = { label, cur, prior }

  function parseBinding(dataBinding, curYear, priorYear) {
    const data = dataBinding.data;
    if (!data || data.length === 0) return null;
    const firstRow = data[0];
    const dimKeys  = Object.keys(firstRow).filter(k => k.startsWith('dimensions_'));
    const measKeys = Object.keys(firstRow).filter(k => k.startsWith('measures_'));
    if (dimKeys.length < 2 || measKeys.length < 1) return null;

    // Time dim = fewest unique values
    const uniqueCounts = dimKeys.map(k => new Set(data.map(r => r[k] && r[k].id)).size);
    let timeIdx = 0;
    for (let i = 1; i < uniqueCounts.length; i++) {
      if (uniqueCounts[i] < uniqueCounts[timeIdx]) timeIdx = i;
    }
    const timeDimKey = dimKeys[timeIdx];
    const nonTimeDims = dimKeys.filter((_, i) => i !== timeIdx);

    // Among non-time dims: dim1 = fewer uniques (Executive), dim2 = more uniques (Explanation)
    // If only 1 non-time dim, dim2 is absent
    let dim1Key, dim2Key = null;
    if (nonTimeDims.length === 1) {
      dim1Key = nonTimeDims[0];
    } else {
      const c0 = new Set(data.map(r => r[nonTimeDims[0]] && r[nonTimeDims[0]].id)).size;
      const c1 = new Set(data.map(r => r[nonTimeDims[1]] && r[nonTimeDims[1]].id)).size;
      // dim1 = fewer unique members (e.g. Sellers), dim2 = more (e.g. Products)
      if (c0 <= c1) { dim1Key = nonTimeDims[0]; dim2Key = nonTimeDims[1]; }
      else          { dim1Key = nonTimeDims[1]; dim2Key = nonTimeDims[0]; }
    }
    const measKey = measKeys[0];

    const yearIds = [...new Set(data.map(r => r[timeDimKey] && String(r[timeDimKey].id)))].filter(y => y && y !== '@TotalMember');

    function matchYear(target) {
      if (!target) return null;
      return yearIds.find(y => y === String(target))
          || yearIds.find(y => y.includes(String(target)))
          || null;
    }

    let resolvedCur = matchYear(curYear);
    let resolvedPrior = matchYear(priorYear);
    if (!resolvedCur || !resolvedPrior) {
      const sorted = [...yearIds].sort();
      if (sorted.length >= 2) { resolvedPrior = sorted[sorted.length - 2]; resolvedCur = sorted[sorted.length - 1]; }
      else if (sorted.length === 1) { resolvedCur = sorted[0]; resolvedPrior = null; }
    }

    // Build dim1 memberMap (Executive Layer)
    const memberMap = {};
    // Build explainMap[dim1Id][dim2Id] = {label, cur, prior} (Explanation Layer)
    const explainMap = {};

    for (const row of data) {
      const yearId  = row[timeDimKey]  && String(row[timeDimKey].id);
      const mem1    = row[dim1Key];
      const measCell = row[measKey];
      if (!mem1) continue;
      // BW/4 delivers result/total rows with id "@TotalMember" — skip them to avoid double-counting
      if (String(mem1.id) === '@TotalMember') continue;
      if (yearId === '@TotalMember') continue;
      const mem1Id  = String(mem1.id);
      const val     = measCell && measCell.raw !== undefined ? Number(measCell.raw) : null;

      // Dim1 aggregation (sum across dim2 if present)
      if (!memberMap[mem1Id]) memberMap[mem1Id] = { label: mem1.label || mem1.id, cur: null, prior: null };
      if (yearId === resolvedCur)   memberMap[mem1Id].cur   = (memberMap[mem1Id].cur   ?? 0) + (val ?? 0);
      else if (yearId === resolvedPrior) memberMap[mem1Id].prior = (memberMap[mem1Id].prior ?? 0) + (val ?? 0);

      // Dim2 explanation data
      if (dim2Key) {
        const mem2 = row[dim2Key];
        if (!mem2) continue;
        if (String(mem2.id) === '@TotalMember') continue;
        const mem2Id = String(mem2.id);
        if (!explainMap[mem1Id]) explainMap[mem1Id] = {};
        if (!explainMap[mem1Id][mem2Id]) explainMap[mem1Id][mem2Id] = { label: mem2.label || mem2.id, cur: null, prior: null };
        if (yearId === resolvedCur)        explainMap[mem1Id][mem2Id].cur   = (explainMap[mem1Id][mem2Id].cur   ?? 0) + (val ?? 0);
        else if (yearId === resolvedPrior) explainMap[mem1Id][mem2Id].prior = (explainMap[mem1Id][mem2Id].prior ?? 0) + (val ?? 0);
      }
    }

    const members = Object.entries(memberMap).map(([id, info]) => {
      const { cur, prior } = info;
      const delta = (cur !== null && prior !== null) ? cur - prior
                  : (cur !== null ? cur : prior !== null ? -prior : null);
      return { id, label: cleanName(info.label), cur, prior, delta,
               isNew: prior === null && cur !== null,
               isLost: cur === null && prior !== null };
    });

    return { members, resolvedCur, resolvedPrior, explainMap, dim2Key };
  }

  /* ─── CALENDAR YEAR HELPER ─────────────────────────────────────────────── */

  function parseCalendarYear(value) {
    const s = String(value ?? '').trim();
    if (!/^\d{4}$/.test(s)) return null;
    const y = Number(s);
    return (y >= 1900 && y <= 2200) ? y : null;
  }

  /* ─── COMPUTE EXECUTIVE ─────────────────────────────────────────────────── */

  function compute(members, polarity, unit, kpiLabel, dimLabel, curYear, priorYear) {
    const valid = members.filter(m => m.delta !== null);
    if (valid.length === 0) return null;

    const totalCur   = members.reduce((s, m) => s + (m.cur  ?? 0), 0);
    const totalPrior = members.reduce((s, m) => s + (m.prior ?? 0), 0);
    const totalDelta = totalCur - totalPrior;
    const totalPct   = fmtPct(totalCur, totalPrior);

    const adverse   = valid.filter(m => isAdv(m.delta, polarity));
    const favorable = valid.filter(m => !isAdv(m.delta, polarity) && m.delta !== 0);

    adverse.sort((a, b)   => Math.abs(b.delta) - Math.abs(a.delta));
    favorable.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    const totalAdverseImpact   = adverse.reduce((s, m) => s + Math.abs(m.delta), 0);
    const totalFavorableImpact = favorable.reduce((s, m) => s + Math.abs(m.delta), 0);

    const top2AdverseImpact = adverse.slice(0, 2).reduce((s, m) => s + Math.abs(m.delta), 0);
    const concentration = totalAdverseImpact > 0
      ? Math.round(top2AdverseImpact / totalAdverseImpact * 100) : null;

    adverse.forEach((m, i)   => { m.adverseRank   = i + 1; });
    favorable.forEach((m, i) => { m.favorableRank = i + 1; });

    for (const m of adverse)   m.share = totalAdverseImpact   > 0 ? Math.round(Math.abs(m.delta) / totalAdverseImpact   * 100) : null;
    for (const m of favorable) m.share = totalFavorableImpact > 0 ? Math.round(Math.abs(m.delta) / totalFavorableImpact * 100) : null;

    let scenario;
    if (Math.abs(totalDelta) < 0.001 && totalPrior !== 0) scenario = 'D';
    else if (isAdv(totalDelta, polarity)) scenario = 'A';
    else if (adverse.length > 0) scenario = 'B';
    else scenario = 'C';

    const curYearNum   = parseCalendarYear(curYear);
    const priorYearNum = parseCalendarYear(priorYear);
    const consecutiveWarning = (curYearNum !== null && priorYearNum !== null && curYearNum - priorYearNum !== 1)
      ? `Executive Pulse is designed for consecutive calendar years. Current comparison: ${curYear} vs. ${priorYear}.`
      : null;

    return {
      scenario, totalDelta, totalCur, totalPrior, totalPct,
      adverse, favorable, valid,
      totalAdverseImpact, totalFavorableImpact,
      breadth: adverse.length, total: valid.length, concentration,
      unit, kpiLabel, dimLabel, curYear, priorYear, polarity, consecutiveWarning,
    };
  }

  /* ─── COMPUTE EXPLANATION ───────────────────────────────────────────────── */

  function computeExplanation(focusMemberId, explainMap, polarity, unit) {
    if (!explainMap || !explainMap[focusMemberId]) return null;
    const dim2Map = explainMap[focusMemberId];

    const members = Object.entries(dim2Map).map(([id, info]) => {
      const { cur, prior } = info;
      const delta = (cur !== null && prior !== null) ? cur - prior
                  : (cur !== null ? cur : prior !== null ? -prior : null);
      return { id, label: cleanName(info.label), cur, prior, delta };
    }).filter(m => m.delta !== null);

    if (members.length === 0) return null;

    const adverse   = members.filter(m => isAdv(m.delta, polarity));
    const favorable = members.filter(m => !isAdv(m.delta, polarity) && m.delta !== 0);
    adverse.sort((a, b)   => Math.abs(b.delta) - Math.abs(a.delta));
    favorable.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    const totalAdverseImpact = adverse.reduce((s, m) => s + Math.abs(m.delta), 0);
    for (const m of adverse) m.share = totalAdverseImpact > 0 ? Math.round(Math.abs(m.delta) / totalAdverseImpact * 100) : null;

    return { adverse, favorable, total: members.length, totalAdverseImpact, unit, polarity };
  }

  /* ─── NARRATIVE ─────────────────────────────────────────────────────────── */

  function buildNarrative(n) {
    if (!n) return [];
    const { scenario, kpiLabel, totalDelta, totalPct, unit,
            adverse, favorable, totalFavorableImpact, polarity, priorYear } = n;
    const parts = [];

    function chip(m, cls) { return `<span class="chip ${cls}" data-mid="${m.id}">${m.label}</span>`; }
    function num(val, cls) { return `<span class="num ${cls}">${val}</span>`; }

    if (scenario === 'D') {
      parts.push({ id: 'p0', html: `<strong>${kpiLabel}</strong> shows no significant change vs. ${priorYear}.` });
      return parts;
    }

    const totalCls = isAdv(totalDelta, polarity) ? 'adverse' : 'favorable';
    const verb = isAdv(totalDelta, polarity)
      ? (polarity === 'lower-is-better' ? 'up' : 'down')
      : (polarity === 'lower-is-better' ? 'down' : 'up');
    const pctStr = totalPct ? ` (${totalPct})` : '';

    parts.push({ id: 'p0', html:
      `<strong>${kpiLabel}</strong> is ${verb} ${num(fmtAbs(Math.abs(totalDelta), unit), totalCls)}${pctStr} vs. ${priorYear}.`
    });

    if (scenario === 'C') {
      if (favorable.length > 0)
        parts.push({ id: 'p1', html:
          `Every ${n.dimLabel.toLowerCase()} segment contributed positively. ` +
          `${chip(favorable[0], 'favorable')} leads with ${num(fmtContribDelta(favorable[0].delta, unit), 'favorable')}.`
        });
      return parts;
    }

    const bac = adverse[0], bac2 = adverse[1];
    if (bac) {
      let s = `${chip(bac, 'adverse')} is the largest adverse contributor at ${num(fmtContribDelta(bac.delta, unit), 'adverse')}`;
      if (bac2) s += `, followed by ${chip(bac2, 'adverse')} at ${num(fmtContribDelta(bac2.delta, unit), 'adverse')}`;
      parts.push({ id: 'p1', html: s + '.' });
    }

    if (favorable.length > 0 && totalFavorableImpact > 0) {
      const topFav = favorable[0];
      parts.push({ id: 'p2', html:
        `Growth in ${chip(topFav, 'favorable')} offsets ${num(fmtContrib(Math.abs(topFav.delta), unit), 'favorable')} of the adverse impact.`
      });
    }

    return parts;
  }

  function buildSummary(n) {
    if (!n || n.scenario === 'D' || n.scenario === 'C') return null;
    const parts = [];
    if (n.breadth > 0 && n.total > 0) {
      const pl = n.dimLabel.toLowerCase().endsWith('s') ? n.dimLabel.toLowerCase() : n.dimLabel.toLowerCase() + 's';
      parts.push(`${n.breadth} of ${n.total} ${pl} below prior year`);
    }
    if (n.concentration !== null && n.adverse.length >= 2)
      parts.push(`${n.concentration}% of adverse impact concentrated in top 2`);
    return parts.length ? parts.join(' · ') : null;
  }

  /* ─── DIVERGING ROW RENDERER ────────────────────────────────────────────── */
  // True diverging bar: NAME | VALUE | BAR←  | axis | →BAR | VALUE | NAME
  // MAX_BAR_W = max pixel width each side can grow to

  function makeDivRow(MAX_BAR_W, fillClass, valueClass, rowClass, interactive, fmtFn) {
    const NAME_W  = 110;
    const VALUE_W = 58;
    const AXIS_W  = 2;
    const cursor  = interactive ? 'cursor:pointer;' : 'cursor:default;';
    const fmt     = fmtFn || fmtDelta;

    function row(m) {
      const bw = Math.max(3, Math.round((Math.abs(m.delta) / m._maxAbs) * MAX_BAR_W));
      const unit = m._unit || '';
      const isAdverse = m._isAdverse;
      return `
        <div class="${rowClass}" data-mid="${m.id}"
          style="display:grid;
            grid-template-columns:${NAME_W}px ${VALUE_W}px ${MAX_BAR_W}px ${AXIS_W}px ${MAX_BAR_W}px ${VALUE_W}px ${NAME_W}px;
            align-items:center;height:34px;border-radius:6px;${cursor}">
          ${isAdverse ? `
            <div class="div-name" style="text-align:right;padding-right:10px;">${m.label}</div>
            <div class="${valueClass} adverse" style="text-align:right;padding-right:8px;">${fmt(m.delta, unit)}</div>
            <div style="display:flex;justify-content:flex-end;align-items:center;">
              <div class="${fillClass} adverse" data-bw="${bw}" style="width:0;height:14px;border-radius:3px 2px 2px 3px;"></div>
            </div>
            <div style="background:rgba(0,0,0,0.15);width:${AXIS_W}px;height:22px;border-radius:1px;"></div>
            <div></div><div></div><div></div>
          ` : `
            <div></div><div></div><div></div>
            <div style="background:rgba(0,0,0,0.15);width:${AXIS_W}px;height:22px;border-radius:1px;"></div>
            <div style="display:flex;justify-content:flex-start;align-items:center;">
              <div class="${fillClass} favorable" data-bw="${bw}" style="width:0;height:14px;border-radius:2px 3px 3px 2px;"></div>
            </div>
            <div class="${valueClass} favorable" style="text-align:left;padding-left:8px;">${fmt(m.delta, unit)}</div>
            <div class="div-name" style="text-align:left;padding-left:10px;">${m.label}</div>
          `}
        </div>`;
    }
    return { row };
  }


  /* ─── WEB COMPONENT ─────────────────────────────────────────────────────── */

  class ExecutivePulse extends HTMLElement {
    constructor() {
      super();
      this._shadow = this.attachShadow({ mode: 'open' });
      this._props = {};
      this._n = null;
      this._cachedBinding = null;
      this._v3StateMsg = null;
      this._narrativeParts = [];
      this._explainMap = null;
      this._dim2Key = null;
      this._focusMember = null; // currently focused dim1 member for explanation
      this._activeChip = null;
      this._ro = null;
      this._timers = [];
      this._pulseInterval = null;
    }

    connectedCallback()    { this._setupRO(); this._render(); }
    disconnectedCallback() {
      if (this._ro) this._ro.disconnect();
      this._timers.forEach(clearTimeout);
      if (this._pulseInterval) clearInterval(this._pulseInterval);
    }
    async onCustomWidgetBeforeUpdate() {}

    async onCustomWidgetAfterUpdate(changedProps) {
      Object.assign(this._props, changedProps);
      if (changedProps.dataBinding) {
        this._cachedBinding = changedProps.dataBinding;
        this._processBinding(changedProps.dataBinding);
      } else if (this._cachedBinding) {
        this._processBinding(this._cachedBinding);
      } else {
        this._render();
      }
    }

    async onCustomWidgetDataChanged(dataBinding) {
      this._cachedBinding = dataBinding;
      this._processBinding(dataBinding);
    }
    async onCustomWidgetResize(w, h) { this._applyScale(w, h); }

    _processBinding(dataBinding) {
      const meta  = dataBinding.metadata;
      const feeds = meta && meta.feeds;

      // Guard: early calls before SAC has built the full binding
      if (!meta || !feeds) { this._n = null; this._render(); return; }

      const data = dataBinding.data || [];

      // Guard: calendar-time dimension in Analysis feed
      // If any dimension in the 'dimensions' feed looks like a calendar-time dim
      // (all real member IDs match YYYY or YYYYMM), the binding is invalid.
      if (data.length > 0) {
        const firstRow = data[0];
        const dimKeys  = Object.keys(firstRow).filter(k => k.startsWith('dimensions_'));
        for (const dk of dimKeys) {
          const ids = [...new Set(data.map(r => r[dk] && r[dk].id).filter(Boolean))]
            .filter(id => String(id) !== '@TotalMember');
          if (ids.length === 0) continue;
          const allYear      = ids.every(id => extractYearOnly(id) !== null);
          const allYearMonth = ids.every(id => extractYearMonth(id) !== null);
          if (allYear || allYearMonth) {
            this._n = null;
            this._v3StateMsg = 'Calendar Year or Year/Month must be assigned to the Time binding.';
            this._render();
            return;
          }
        }
      }

      const p = this._props;
      const tpBound = feeds.timePeriod && feeds.timePeriod.values && feeds.timePeriod.values.length > 0;

      if (tpBound) {
        // V3 path — time comes exclusively from timePeriod feed
        const mode   = p.comparisonMode || 'same-period';
        const parsed = parseBindingTimePeriod(dataBinding, mode);

        if (parsed.state !== 'ok') {
          this._n = null;
          this._v3StateMsg = this._v3StateMessage(parsed.state);
          this._render();
          return;
        }
        this._v3StateMsg = null;

        this._n = compute(
          parsed.members,
          p.kpiPolarity || 'higher-is-better',
          p.kpiUnit     || '',
          p.kpiLabel    || 'Revenue',
          p.dimLabel    || 'Segment',
          parsed.curPeriodLabel,
          parsed.priorPeriodLabel,
        );
        this._narrativeParts = buildNarrative(this._n);
        this._explainMap     = parsed.explainMap;
        this._dim2Key        = parsed.dim2Key;
        this._focusMember    = this._n && this._n.adverse.length > 0
          ? this._n.adverse[0]
          : (this._n && this._n.valid.length > 0 ? this._n.valid[0] : null);
        this._activeChip = null;
        this._render();
        return;
      }

      // Legacy V2 path — unmodified
      const parsed = parseBinding(dataBinding, p.currentYear || '', p.priorYear || '');
      if (!parsed) { this._n = null; this._v3StateMsg = null; this._render(); return; }

      this._v3StateMsg = null;
      this._n = compute(
        parsed.members,
        p.kpiPolarity || 'higher-is-better',
        p.kpiUnit     || '',
        p.kpiLabel    || 'Revenue',
        p.dimLabel    || 'Segment',
        parsed.resolvedCur   || p.currentYear || '',
        parsed.resolvedPrior || p.priorYear   || '',
      );
      this._narrativeParts = buildNarrative(this._n);
      this._explainMap     = parsed.explainMap;
      this._dim2Key        = parsed.dim2Key;
      this._focusMember    = this._n && this._n.adverse.length > 0
        ? this._n.adverse[0]
        : (this._n && this._n.valid.length > 0 ? this._n.valid[0] : null);
      this._activeChip = null;
      this._render();
    }

    _v3StateMessage(state) {
      switch (state) {
        case 'unsupported':
          return 'Time period format not recognized. Please use a calendar year (0CALYEAR) or calendar year/month dimension (0CALMONTH).';
        case 'no-overlap':
          return 'No overlapping periods found between current and prior year. Check your time period binding.';
        case 'insufficient-years':
          return 'At least two calendar years are required for comparison. Check your time period binding.';
        case 'too-many-time-dims':
          return 'Please use only one time dimension: Calendar Year or Calendar Year/Month.';
        case 'too-many-dims':
          return 'Only one or two analysis dimensions are supported. Please remove extra dimensions from the binding.';
        default:
          return 'Add a measure and dimensions in the Data tab.';
      }
    }

    _setupRO() {
      if (typeof ResizeObserver === 'undefined') return;
      this._ro = new ResizeObserver(entries => {
        const e = entries[0];
        if (e) this._applyScale(e.contentRect.width);
      });
      this._ro.observe(this);
    }

    _applyScale(availW) {
      const inner = this._shadow.querySelector('.scale-inner');
      if (!inner) return;
      const scale = Math.max(0.3, Math.min(1, availW / 640));
      inner.style.transform = `scale(${scale})`;
      const host = this._shadow.querySelector('.scale-host');
      if (host) {
        // Use offsetHeight (includes padding, no transform distortion) for accurate height
        const h = inner.offsetHeight * scale;
        host.style.height = Math.max(h, 160) + 'px';
      }
    }



    /* ── RENDER ── */

    _startPulseLoop() {
      if (this._pulseInterval) clearInterval(this._pulseInterval);
      const fire = () => {
        const bar = this._shadow.getElementById('pulse-bar');
        if (!bar) return;
        bar.classList.remove('firing');
        void bar.getBoundingClientRect();
        bar.classList.add('firing');
      };
      fire();
      this._pulseInterval = setInterval(fire, 3000);
    }

    _render() {
      this._timers.forEach(clearTimeout);
      this._timers = [];
      if (this._pulseInterval) { clearInterval(this._pulseInterval); this._pulseInterval = null; }
      this._renderContent();
    }

    _renderContent() {
      const n = this._n;
      const stateMsg = this._v3StateMsg
        || (n ? null : 'Add a measure and dimensions in the Data tab.');
      this._shadow.innerHTML = `<style>${CSS}</style>
        <div class="scale-host">
          <div class="scale-inner">
            <div class="pulse-root" id="pulse-root">
              <div class="accent-line" id="accent-line"></div>
              ${n ? this._renderHero(n) : `<div class="state-msg">${stateMsg}</div>`}
              ${this._renderChart(n)}
              <div class="evidence" id="evidence-card"></div>
              ${this._renderExplanation()}
            </div>
          </div>
        </div>`;

      // Set accent line color after render
      if (n) {
        const al = this._shadow.getElementById('accent-line');
        if (al) {
          const cls = isAdv(n.totalDelta, n.polarity) ? 'adverse' : n.totalDelta === 0 ? 'neutral' : 'favorable';
          al.classList.add(cls, 'animate');
        }
      }

      this._bindEvents();
      this._animate();
      requestAnimationFrame(() => {
        const rect = this.getBoundingClientRect();
        if (rect.width > 0) this._applyScale(rect.width);
      });
    }

    _renderHero(n) {
      const totalCls = isAdv(n.totalDelta, n.polarity) ? 'adverse' : n.totalDelta === 0 ? 'neutral' : 'favorable';
      const arrow    = isAdv(n.totalDelta, n.polarity) ? '▼' : n.totalDelta === 0 ? '–' : '▲';
      const pctStr   = n.totalPct || '';
      const parts    = this._narrativeParts.map(pt =>
        `<span class="n-part" id="${pt.id}">${pt.html}</span> `
      ).join('');
      const summary  = buildSummary(n);

      return `
        <div class="hero">
          <div class="hero-meta">
            <div class="hero-brand">
              <div class="pulse-icon-wrap">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M2 12h3l3-8 4 16 3-10 2 2h5" stroke="#e2e8f0" stroke-width="1.5"
                    stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                  <path class="pulse-line" id="pulse-line"
                    d="M2 12h3l3-8 4 16 3-10 2 2h5" stroke="#2563eb" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
                <div class="pulse-bar" id="pulse-bar"></div>
              </div>
              <span class="widget-title">Executive Pulse</span>
            </div>
            <button class="replay-btn" id="replay-btn">
              <svg width="9" height="9" viewBox="0 0 16 16" fill="none">
                <path d="M13.65 2.35A8 8 0 1 0 15 8h-2a6 6 0 1 1-1.27-3.73L10 6h5V1l-1.35 1.35z" fill="currentColor"/>
              </svg>
              Replay analysis
            </button>
          </div>

          <div class="kpi-reveal" id="kpi-reveal">
            <div class="kpi-label">${n.kpiLabel}</div>
            <div class="kpi-row">
              <div class="kpi-value">${fmtAbs(n.totalCur, n.unit)}</div>
              <div class="kpi-delta-badge ${totalCls}">${arrow} ${fmtAbs(Math.abs(n.totalDelta), n.unit)}${pctStr ? ' · ' + pctStr : ''}</div>
            </div>
            <div class="kpi-vs">${n.curYear} vs. ${n.priorYear}</div>
          </div>

          ${n.consecutiveWarning ? `<div class="consecutive-warning">${n.consecutiveWarning}</div>` : ''}

          <div class="narrative-block">
            <div class="narrative-text">${parts}</div>
            ${summary ? `<div class="narrative-summary" id="summary">${summary}</div>` : ''}
          </div>
        </div>`;
    }

    _renderChart(n) {
      if (!n || n.scenario === 'D') return '';
      const showAdverse   = n.adverse.slice(0, 3);
      const showFavorable = n.favorable.slice(0, 2);
      if (showAdverse.length === 0 && showFavorable.length === 0) return '';

      const allShown = [...showAdverse, ...showFavorable];
      const maxAbs   = Math.max(...allShown.map(m => Math.abs(m.delta)), 1);

      // DEBUG — root cause investigation
      // (removed after confirming: raw deltas differ, fmtDelta rounds both to same string)

      const { row } = makeDivRow(148, 'div-bar-fill', 'div-value', 'div-row', true, fmtContribDelta);

      showAdverse.forEach(m   => { m._maxAbs = maxAbs; m._isAdverse = true;  m._unit = n.unit; });
      showFavorable.forEach(m => { m._maxAbs = maxAbs; m._isAdverse = false; m._unit = n.unit; });

      const adverseRows   = showAdverse.map(m   => row(m)).join('');
      const sep           = (showAdverse.length > 0 && showFavorable.length > 0)
        ? '<div style="height:6px;"></div>' : '';
      const favorableRows = showFavorable.map(m => row(m)).join('');

      return `
        <div class="chart-section" id="chart-section">
          <div class="section-label">Impact by contributor</div>
          <div>${adverseRows}${sep}${favorableRows}</div>
        </div>`;
    }

    _renderExplanation() {
      if (!this._dim2Key || !this._focusMember || !this._explainMap) return '';

      const exp = computeExplanation(
        this._focusMember.id, this._explainMap,
        this._props.kpiPolarity || 'higher-is-better',
        this._props.kpiUnit || ''
      );
      if (!exp) return '';

      const focusLabel    = this._focusMember.label;
      const showAdverse   = exp.adverse.slice(0, 4);
      const showFavorable = exp.favorable.slice(0, 3);
      if (showAdverse.length === 0 && showFavorable.length === 0) return '';

      const allShown = [...showAdverse, ...showFavorable];
      const maxAbs   = Math.max(...allShown.map(m => Math.abs(m.delta)), 1);

      const { row } = makeDivRow(130, 'exp-bar-fill', 'exp-bar-value', 'exp-div-row', false, fmtContribDelta);

      showAdverse.forEach(m   => { m._maxAbs = maxAbs; m._isAdverse = true;  m._unit = exp.unit; });
      showFavorable.forEach(m => { m._maxAbs = maxAbs; m._isAdverse = false; m._unit = exp.unit; });

      const adverseRows   = showAdverse.map(m   => row(m)).join('');
      const sep           = (showAdverse.length > 0 && showFavorable.length > 0)
        ? '<div style="height:5px;"></div>' : '';
      const favorableRows = showFavorable.map(m => row(m)).join('');

      const topAdv = exp.adverse[0];
      const summaryParts = [];
      if (exp.adverse.length > 0 && exp.total > 0)
        summaryParts.push(`${exp.adverse.length} of ${exp.total} adverse`);
      if (topAdv && topAdv.share !== null)
        summaryParts.push(`${topAdv.label}: ${topAdv.share}% of impact`);
      const summaryLine = summaryParts.join(' · ');

      return `
        <div class="explanation-section" id="explanation-section">
          <div class="explanation-inner">
            <div class="explanation-header-bar">
              <div class="explanation-title">What is behind ${focusLabel}'s impact?</div>
              ${summaryLine ? `<div class="explanation-summary">${summaryLine}</div>` : ''}
            </div>
            <div class="explanation-bars" id="exp-bars">
              ${adverseRows}${sep}${favorableRows}
            </div>
          </div>
        </div>`;
    }

    /* ── ANIMATION ── */

    _animate() {
      const sh = this._shadow;
      const n  = this._n;
      if (!n) return;

      const showAdverse   = n.adverse.slice(0, 3);
      const showFavorable = n.favorable.slice(0, 2);

      const showPart = (id) => { const el = sh.getElementById(id); if (el) el.classList.add('visible'); };
      const growBar  = (selector) => {
        const fill = sh.querySelector(selector);
        if (fill) fill.style.width = fill.dataset.bw + 'px';
      };

      // t=0: pulse loop starts
      this._startPulseLoop();

      // t=500: p0
      this._timers.push(setTimeout(() => { showPart('p0'); }, 500));

      // t=1300: p1 + first adverse bar
      this._timers.push(setTimeout(() => {
        showPart('p1');
        if (showAdverse[0]) growBar(`.div-row[data-mid="${showAdverse[0].id}"] .div-bar-fill`);
      }, 1300));

      // t=1100: p2 + second + third adverse bar
      this._timers.push(setTimeout(() => {
        showPart('p2');
        if (showAdverse[1]) growBar(`.div-row[data-mid="${showAdverse[1].id}"] .div-bar-fill`);
        if (showAdverse[2]) growBar(`.div-row[data-mid="${showAdverse[2].id}"] .div-bar-fill`);
      }, 1700));

      // t=2100: favorable bars
      this._timers.push(setTimeout(() => {
        showFavorable.forEach(m => growBar(`.div-row[data-mid="${m.id}"] .div-bar-fill`));
      }, 2100));

      // t=2600: chart section + summary visible
      this._timers.push(setTimeout(() => {
        const cs = sh.getElementById('chart-section');
        if (cs) cs.classList.add('visible');
        const sm = sh.getElementById('summary');
        if (sm) sm.classList.add('visible');
      }, 2600));

      // t=3000: explanation section appears
      this._timers.push(setTimeout(() => {
        const es = sh.getElementById('explanation-section');
        if (es) es.classList.add('visible');
      }, 3000));

      // t=3300: explanation bars grow sequentially
      const expResult = (this._explainMap && this._focusMember)
        ? (computeExplanation(this._focusMember.id, this._explainMap, this._props.kpiPolarity || 'higher-is-better', this._props.kpiUnit || '') || { adverse: [], favorable: [] })
        : { adverse: [], favorable: [] };
      const expAdverse   = expResult.adverse.slice(0, 4);
      const expFavorable = expResult.favorable.slice(0, 3);

      expAdverse.forEach((m, i) => {
        this._timers.push(setTimeout(() => {
          growBar(`.exp-div-row[data-mid="${m.id}"] .exp-bar-fill`);
        }, 3300 + i * 140));
      });
      expFavorable.forEach((m, i) => {
        this._timers.push(setTimeout(() => {
          growBar(`.exp-div-row[data-mid="${m.id}"] .exp-bar-fill`);
        }, 3300 + expAdverse.length * 140 + i * 140));
      });

      // Scale update after explanation fully appeared
      this._timers.push(setTimeout(() => {
        const rect = this.getBoundingClientRect();
        if (rect.width > 0) this._applyScale(rect.width);
      }, 3700));
    }

    /* ── EVIDENCE ── */

    _openEvidence(member) {
      const n  = this._n;
      const ev = this._shadow.getElementById('evidence-card');
      if (!ev || !n) return;

      const isA  = n.adverse.find(m => m.id === member.id);
      const cls  = isA ? 'adverse' : 'favorable';
      const rank = isA ? ordinal(member.adverseRank  || 1) + ' adverse contributor'
                       : ordinal(member.favorableRank || 1) + ' favorable contributor';
      const share = member.share != null ? member.share + '%' : '–';

      ev.innerHTML = `
        <div class="evidence-inner">
          <div class="evidence-top">
            <div class="evidence-name">
              ${member.label}
              <span class="evidence-mode-badge">Evidence Mode</span>
            </div>
            <span class="evidence-close" id="ev-close">×</span>
          </div>
          <div class="evidence-grid">
            <div class="ev-cell">
              <div class="ev-label">Current</div>
              <div class="ev-value">${fmtContrib(member.cur, n.unit)}</div>
            </div>
            <div class="ev-cell">
              <div class="ev-label">Prior</div>
              <div class="ev-value">${fmtContrib(member.prior, n.unit)}</div>
            </div>
            <div class="ev-cell">
              <div class="ev-label">Impact</div>
              <div class="ev-value ${cls}">${fmtContribDelta(member.delta, n.unit)}</div>
            </div>
            <div class="ev-cell">
              <div class="ev-label">Change</div>
              <div class="ev-value ${cls}">${fmtPct(member.cur, member.prior) || '–'}</div>
            </div>
          </div>
          <div class="ev-rank">${rank} · Share of ${isA ? 'adverse' : 'positive'} impact: <strong>${share}</strong></div>
        </div>`;

      ev.classList.add('open');
      this._shadow.getElementById('ev-close').addEventListener('click', () => {
        this._closeEvidence();
        this._activeChip = null;
        this._shadow.querySelectorAll('.chip, .div-row').forEach(e => e.classList.remove('active'));
      });
    }

    _closeEvidence() {
      const ev = this._shadow.getElementById('evidence-card');
      if (ev) ev.classList.remove('open');
    }

    /* ── SWITCH FOCUS (updates explanation layer without full re-render) ── */

    _switchFocus(member) {
      if (!this._explainMap || !this._dim2Key) return;
      this._focusMember = member;

      // Re-render just explanation section
      const es = this._shadow.getElementById('explanation-section');
      if (!es) return;
      // Fade out, swap content, fade in
      es.classList.remove('visible');
      setTimeout(() => {
        const newHtml = this._renderExplanation();
        if (!newHtml) return;
        const tmp = document.createElement('div');
        tmp.innerHTML = newHtml;
        const newSection = tmp.querySelector('#explanation-section');
        if (newSection) {
          es.innerHTML = newSection.innerHTML;
          // Restore bar animations immediately (no delay)
          const exp = computeExplanation(member.id, this._explainMap, this._props.kpiPolarity || 'higher-is-better', this._props.kpiUnit || '');
          if (exp) {
            [...(exp.adverse || []).slice(0, 4), ...(exp.favorable || []).slice(0, 3)].forEach((m, i) => {
              setTimeout(() => {
                const fill = this._shadow.querySelector(`.exp-div-row[data-mid="${m.id}"] .exp-bar-fill`);
                if (fill) fill.style.width = fill.dataset.bw + 'px';
              }, i * 90);
            });
          }
        }
        es.classList.add('visible');
        this._applyScale(this.getBoundingClientRect().width || 640);
        // Re-apply after CSS transition completes (explanation-section transition = 0.6s)
        setTimeout(() => this._applyScale(this.getBoundingClientRect().width || 640), 700);
      }, 250);
    }

    /* ── EVENTS ── */

    _bindEvents() {
      const sh = this._shadow;

      const handleMember = (id) => {
        if (!this._n) return;
        const all    = [...(this._n.adverse || []), ...(this._n.favorable || [])];
        const member = all.find(m => m.id === id);
        if (!member) return;

        // Switch explanation layer
        this._switchFocus(member);

        // Toggle evidence card
        if (this._activeChip === id) {
          this._activeChip = null;
          sh.querySelectorAll('.chip, .div-row').forEach(e => e.classList.remove('active'));
          this._closeEvidence();
        } else {
          this._activeChip = id;
          sh.querySelectorAll('.chip, .div-row').forEach(e => e.classList.remove('active'));
          sh.querySelectorAll(`[data-mid="${id}"]`).forEach(e => e.classList.add('active'));
          this._openEvidence(member);
        }
      };

      sh.querySelectorAll('.chip').forEach(c =>
        c.addEventListener('click', e => { e.stopPropagation(); handleMember(c.dataset.mid); })
      );
      sh.querySelectorAll('.div-row').forEach(r =>
        r.addEventListener('click', () => handleMember(r.dataset.mid))
      );

      const replayBtn = sh.getElementById('replay-btn');
      if (replayBtn) {
        replayBtn.addEventListener('click', () => {
          // Reset narrative
          sh.querySelectorAll('.n-part').forEach(e => e.classList.remove('visible'));
          const sm = sh.getElementById('summary');
          if (sm) sm.classList.remove('visible');
          // Reset bars
          sh.querySelectorAll('.div-bar-fill, .exp-bar-fill').forEach(f => { f.style.width = '0px'; });
          // Reset accent line animation
          const al = sh.getElementById('accent-line');
          if (al) {
            al.classList.remove('animate');
            void al.getBoundingClientRect();
            al.classList.add('animate');
          }
          // Reset chart + explanation sections
          const cs = sh.getElementById('chart-section');
          if (cs) cs.classList.remove('visible');
          const es = sh.getElementById('explanation-section');
          if (es) es.classList.remove('visible');
          // Reset evidence
          this._closeEvidence();
          sh.querySelectorAll('.chip, .div-row').forEach(e => e.classList.remove('active'));
          this._activeChip = null;
          this._timers.forEach(clearTimeout);
          this._timers = [];
          this._animate();
        });
      }
    }
  }

  if (!customElements.get('com-custom-sac-executivepulse')) {
    customElements.define('com-custom-sac-executivepulse', ExecutivePulse);
  }
})();
