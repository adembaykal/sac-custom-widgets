(function () {
  'use strict';

  /* ─── DEMO DATA ─────────────────────────────────────────────────────────── */
  const DEMO = {
    kpiLabel: 'Gross Margin',
    kpiValue: '−3.4%',
    yearLabel: 'FY 2026 vs FY 2025',
    impactByLabel: null,
    ring1Label: 'Driver',
    ring2Label: 'Geography',
    ring3Label: 'Segment',
    impactUnit: '€',
    ring1Nodes: [
      { id: 'revenue',  label: 'Revenue',  impact: -4.8, primary: true  },
      { id: 'cogs',     label: 'COGS',     impact:  1.2, primary: false },
      { id: 'discount', label: 'Discount', impact:  0.6, primary: false }
    ],
    ring2Nodes: [
      { id: 'germany', label: 'Germany', impact: -2.8, primary: true  },
      { id: 'france',  label: 'France',  impact: -1.1, primary: false },
      { id: 'uk',      label: 'UK',      impact: -0.9, primary: false }
    ],
    ring3Nodes: [
      { id: 'enterprise', label: 'Enterprise', impact: -1.9, primary: true  },
      { id: 'retail',     label: 'Retail',     impact: -0.8, primary: false },
      { id: 'smb',        label: 'SMB',        impact: -0.5, primary: false },
      { id: 'other',      label: 'Other',      impact: -0.3, primary: false }
    ],
    impactSharePct: 58,
    shareDriveLabel: 'Dominant Driver — Share of Total Adverse Impact',
    pathSummary: null
  };

  /* ─── CSS ───────────────────────────────────────────────────────────────── */
  const CSS = `
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    :host { display: block; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif; color: #1a1f2e; background: transparent; }

    .scale-host  { width: 100%; overflow: visible; }
    .scale-inner { transform-origin: top left; width: 620px; overflow: visible; }

    .widget { width: 620px; background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.08), 0 20px 56px rgba(0,0,0,0.28); border: 1px solid rgba(0,0,0,0.07); }

    /* accent bar */
    .accent-bar { height: 3px; background: linear-gradient(90deg, #dc2626 0%, #ef4444 60%, #fca5a5 100%); animation: sweep 1.4s cubic-bezier(0.4,0,0.2,1) forwards; width: 0; }
    @keyframes sweep { to { width: 100%; } }

    /* header */
    .widget-inner { padding: 28px 32px 30px; color: #1a1f2e; }
    .widget-eyebrow { font-size: 9px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #374151; margin-bottom: 6px; }
    .widget-kpi-row { display: flex; align-items: baseline; gap: 12px; margin-bottom: 4px; }
    .widget-kpi-value { font-size: 40px; font-weight: 700; color: #dc2626; letter-spacing: -0.02em; line-height: 1; animation: fadeUp 0.5s 0.2s both; }
    .widget-kpi-badge { font-size: 12px; font-weight: 700; color: #dc2626; background: #fef2f2; padding: 3px 10px; border-radius: 20px; animation: fadeUp 0.5s 0.4s both; }
    .widget-sub { font-size: 12px; color: #374151; margin-bottom: 24px; animation: fadeUp 0.5s 0.5s both; }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

    /* canvas */
    .ripple-canvas { position: relative; width: 100%; height: 380px; display: flex; align-items: center; justify-content: center; }
    .svg-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }

    /* rings */
    .ring { position: absolute; border-radius: 50%; border: 1px solid; opacity: 0; transform: scale(0); }
    .ring-3 { width: 356px; height: 356px; border-color: rgba(220,38,38,0.13); animation: expandRing 0.7s cubic-bezier(0.22,1,0.36,1) 2.2s forwards; }
    .ring-2 { width: 226px; height: 226px; border-color: rgba(220,38,38,0.22); animation: expandRing 0.7s cubic-bezier(0.22,1,0.36,1) 1.4s forwards; }
    .ring-1 { width: 122px; height: 122px; border-color: rgba(220,38,38,0.35); animation: expandRing 0.7s cubic-bezier(0.22,1,0.36,1) 0.7s forwards; }
    @keyframes expandRing { from { opacity: 0; transform: scale(0.1); } to { opacity: 1; transform: scale(1); } }

    /* ring semantic labels — shown inside canvas near ring edge */
    .ring-label { position: absolute; font-size: 7px; font-weight: 700; letter-spacing: 0.10em; text-transform: uppercase; color: #9ca3af; white-space: nowrap; pointer-events: none; opacity: 0; }
    .ring-label-1 { left: calc(50% - 56px); top: calc(50% + 54px); }
    .ring-label-2 { left: calc(50% - 106px); top: calc(50% + 106px); }
    .ring-label-3 { left: calc(50% - 170px); top: calc(50% + 166px); }
    .ring-label.show { animation: labelIn 0.4s cubic-bezier(0.4,0,0.2,1) forwards; }
    @keyframes labelIn { from { opacity: 0; transform: translateX(-4px); } to { opacity: 0.7; transform: translateX(0); } }

    /* center node */
    .center-node { position: absolute; width: 80px; height: 80px; border-radius: 50%; background: #dc2626; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 20; box-shadow: 0 0 0 10px rgba(220,38,38,0.08), 0 0 0 20px rgba(220,38,38,0.04); animation: centerIn 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.05s both; }
    @keyframes centerIn { from { opacity: 0; transform: scale(0.2); } to { opacity: 1; transform: scale(1); } }
    .center-label { font-size: 8px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.6); }
    .center-value { font-size: 18px; font-weight: 800; color: #fff; }

    /* nodes */
    .node { position: absolute; display: flex; flex-direction: column; align-items: center; opacity: 0; transform: scale(0.4); }
    .node-pip { border-radius: 50%; margin-bottom: 5px; flex-shrink: 0; }
    .node-name { font-size: 9px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; white-space: nowrap; text-align: center; line-height: 1.3; }
    .node-val  { font-size: 12px; font-weight: 800; white-space: nowrap; text-align: center; }
    .node.primary .node-pip  { width: 12px; height: 12px; background: #dc2626; box-shadow: 0 0 0 4px rgba(220,38,38,0.15); }
    .node.primary .node-name { color: #111827; }
    .node.primary .node-val  { color: #dc2626; }
    .node.secondary .node-pip  { width: 7px; height: 7px; background: #f87171; }
    .node.secondary .node-name { color: #1a1f2e; font-size: 8.5px; }
    .node.secondary .node-val  { color: #374151; font-size: 10.5px; }
    .node.show-primary   { animation: nodeIn 0.45s cubic-bezier(0.34,1.5,0.64,1) forwards; }
    .node.show-secondary { animation: nodeInSecondary 0.4s cubic-bezier(0.34,1.2,0.64,1) forwards; }
    @keyframes nodeIn          { from { opacity:0; transform:scale(0.4); } to { opacity:1;    transform:scale(1); } }
    @keyframes nodeInSecondary { from { opacity:0; transform:scale(0.4); } to { opacity:0.65; transform:scale(1); } }

    /* ring 1 node positions — inside ring-1 (r=61px), 3 nodes spread top/bottom-right/bottom-left */
    .n-r1-0 { top: 26px;  left: calc(50% - 66px); }
    .n-r1-1 { top: 50%;   right: 58px; margin-top: -24px; }
    .n-r1-2 { bottom: 20px; left: calc(50% - 22px); }

    /* ring 2 node positions — inside ring-2 (r=113px), spread top-right/bottom-right/bottom-left */
    .n-r2-0 { top: 38px;  right: 64px; }
    .n-r2-1 { bottom: 52px; right: 56px; }
    .n-r2-2 { bottom: 40px; left: 56px; }

    /* ring 3 node positions — inside ring-3 (r=178px), all kept away from canvas edge */
    .n-r3-0 { top: 16px;  right: 40px; }
    .n-r3-1 { top: 50%;   right: 16px; margin-top: -20px; }
    .n-r3-2 { bottom: 36px; right: 52px; }
    .n-r3-3 { bottom: 28px; left: 64px; }

    /* impact share */
    .impact-share { margin-top: 18px; padding: 12px 16px; background: #fafafa; border-radius: 10px; border: 1px solid #f1f5f9; opacity: 0; animation: fadeUp 0.5s 3.4s forwards; }
    .share-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
    .share-label  { font-size: 8px; font-weight: 700; letter-spacing: 0.10em; text-transform: uppercase; color: #374151; }
    .share-pct    { font-size: 12px; font-weight: 800; color: #dc2626; }
    .share-track  { height: 5px; background: #f1f5f9; border-radius: 3px; overflow: hidden; }
    .share-fill   { height: 100%; border-radius: 3px; background: linear-gradient(90deg, #dc2626, #ef4444); width: 0; }
    .share-path   { font-size: 10px; font-weight: 600; color: #1a1f2e; margin-top: 7px; }
    .share-path span { color: #dc2626; }

    /* legend */
    .legend { display: flex; gap: 20px; margin-top: 14px; padding-top: 14px; border-top: 1px solid #f1f5f9; opacity: 0; animation: fadeUp 0.5s 3.0s forwards; }
    .legend-item { display: flex; align-items: center; gap: 6px; }
    .legend-dot  { border-radius: 50%; flex-shrink: 0; }
    .legend-text { font-size: 8.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #374151; }
  `;

  /* ─── RENDER HELPERS ────────────────────────────────────────────────────── */
  function fmtImpact(val, unit) {
    const abs  = Math.abs(val);
    const sign = val < 0 ? '−' : '+';
    if (abs < 0.1) return `${sign}${unit}${Math.round(abs * 1000)}K`;
    return `${sign}${unit}${abs.toFixed(1)}M`;
  }

  function renderNodes(nodes, ring) {
    return nodes.map((n, i) => `
      <div class="node ${n.primary ? 'primary' : 'secondary'} n-r${ring}-${i}" data-ring="${ring}" data-idx="${i}" data-primary="${n.primary}">
        <div class="node-pip"></div>
        <div class="node-name">${n.label}</div>
        <div class="node-val">${fmtImpact(n.impact, '')}</div>
      </div>`).join('');
  }

  function buildPathSummary(d) {
    if (d.pathSummary) return d.pathSummary;
    const p1 = d.ring1Nodes.find(n => n.primary);
    const p2 = d.ring2Nodes.find(n => n.primary);
    const p3 = d.ring3Nodes.find(n => n.primary);
    const fmt = (n) => `<span>${n.label} ${fmtImpact(n.impact, d.impactUnit)}</span>`;
    return `<span>${d.kpiLabel}</span> → ${fmt(p1)} → ${fmt(p2)} → ${fmt(p3)}`;
  }

  function renderWidget(d) {
    return `
      <div class="widget">
        <div class="accent-bar"></div>
        <div class="widget-inner">
          <div class="widget-eyebrow">Impact Analysis · ${d.kpiLabel}</div>
          <div class="widget-kpi-row">
            <div class="widget-kpi-value">${d.kpiValue}</div>
            <div class="widget-kpi-badge">▼ ${d.kpiLabel}</div>
          </div>
          <div class="widget-sub">${d.yearLabel}${d.impactByLabel ? ` · Impact by ${d.impactByLabel}` : ''} · ${d.ring1Label} → ${d.ring2Label} → ${d.ring3Label}</div>

          <div class="ripple-canvas" id="ir-canvas">
            <svg class="svg-layer" id="ir-svg"></svg>
            <div class="ring ring-3"></div>
            <div class="ring ring-2"></div>
            <div class="ring ring-1"></div>
            <div class="ring-label ring-label-1" id="ir-rl1">${d.ring1Label}</div>
            <div class="ring-label ring-label-2" id="ir-rl2">${d.ring2Label}</div>
            <div class="ring-label ring-label-3" id="ir-rl3">${d.ring3Label}</div>
            <div class="center-node" id="ir-center">
              <div class="center-label">${d.kpiLabel}</div>
              <div class="center-value">${d.kpiValue}</div>
            </div>
            ${renderNodes(d.ring1Nodes, 1)}
            ${renderNodes(d.ring2Nodes, 2)}
            ${renderNodes(d.ring3Nodes, 3)}
          </div>

          <div class="impact-share">
            <div class="share-header">
              <div class="share-label">${d.shareDriveLabel}</div>
              <div class="share-pct">${d.impactSharePct}%</div>
            </div>
            <div class="share-track"><div class="share-fill" id="ir-fill"></div></div>
            <div class="share-path">${buildPathSummary(d)}</div>
          </div>

          <div class="legend">
            <div class="legend-item"><div class="legend-dot" style="width:12px;height:12px;background:#dc2626"></div><div class="legend-text">${d.ring1Label}</div></div>
            <div class="legend-item"><div class="legend-dot" style="width:9px;height:9px;background:#f87171"></div><div class="legend-text">${d.ring2Label}</div></div>
            <div class="legend-item"><div class="legend-dot" style="width:7px;height:7px;background:#fca5a5"></div><div class="legend-text">${d.ring3Label}</div></div>
            <div class="legend-item" style="margin-left:auto;display:flex;align-items:center;gap:6px">
              <div style="width:22px;height:1.5px;background:#dc2626;border-radius:1px;opacity:0.6"></div>
              <div class="legend-text">Dominant path</div>
            </div>
          </div>
        </div>
      </div>`;
  }

  /* ─── ANIMATION ─────────────────────────────────────────────────────────── */
  // Returns center of el relative to canvas, both in unscaled CSS px (offsetLeft/Top based)
  function getCtr(el, canvas) {
    let x = el.offsetLeft + el.offsetWidth  / 2;
    let y = el.offsetTop  + el.offsetHeight / 2;
    // Walk up offsetParent chain until we reach canvas
    let cur = el.offsetParent;
    while (cur && cur !== canvas) {
      x += cur.offsetLeft;
      y += cur.offsetTop;
      cur = cur.offsetParent;
    }
    return { x, y };
  }

  function animateLine(svg, x1, y1, x2, y2, delay) {
    const len  = Math.hypot(x2 - x1, y2 - y1);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1); line.setAttribute('y1', y1);
    line.setAttribute('x2', x2); line.setAttribute('y2', y2);
    line.setAttribute('stroke', '#dc2626');
    line.setAttribute('stroke-width', '1.5');
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('stroke-dasharray', len);
    line.setAttribute('stroke-dashoffset', len);
    line.setAttribute('opacity', '0.5');
    svg.appendChild(line);
    setTimeout(() => {
      line.style.transition = 'stroke-dashoffset 0.65s cubic-bezier(0.4,0,0.2,1)';
      requestAnimationFrame(() => line.setAttribute('stroke-dashoffset', '0'));
    }, delay);
  }

  function showNode(el, isPrimary, delay) {
    setTimeout(() => {
      el.classList.add(isPrimary ? 'show-primary' : 'show-secondary');
    }, delay);
  }

  function runAnimation(root) {
    const canvas = root.getElementById('ir-canvas');
    const svg    = root.getElementById('ir-svg');
    if (!canvas || !svg) return;

    // All geometry in unscaled CSS px (offsetLeft/Top) — no getBoundingClientRect
    const canvasW = canvas.offsetWidth;
    const canvasH = canvas.offsetHeight;
    svg.setAttribute('width',  canvasW);
    svg.setAttribute('height', canvasH);

    const RING_RADII = { '1': 61, '2': 113, '3': 178 };
    const MIN_GAP = 72;

    function resolveRingOverlaps(ringNum, delay, onDone) {
      setTimeout(() => {
        const nodes = Array.from(root.querySelectorAll(`[data-ring="${ringNum}"]`));
        if (nodes.length < 2) { if (onDone) onDone(); return; }

        const cx = canvas.offsetWidth  / 2;
        const cy = canvas.offsetHeight / 2;
        const r  = RING_RADII[String(ringNum)];

        function placeAt(el, theta) {
          el.style.left   = (cx + r * Math.cos(theta) - el.offsetWidth  / 2) + 'px';
          el.style.top    = (cy + r * Math.sin(theta) - el.offsetHeight / 2) + 'px';
          el.style.right  = 'auto';
          el.style.bottom = 'auto';
          el.style.marginTop  = '0';
          el.style.marginLeft = '0';
        }

        const primary   = nodes.find(n => n.dataset.primary === 'true');
        const secondary = nodes.filter(n => n.dataset.primary !== 'true');
        if (!primary) return;

        // Deterministic angle from primary node label — same data = same direction, different data = different direction
        // Range: −70° to +70° around 12 o'clock to avoid colliding with bottom impact box
        function hashAngle(str) {
          let h = 0;
          for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
          const norm = ((h >>> 0) % 1000) / 1000; // 0..1
          return -Math.PI / 2 + (norm - 0.5) * (140 * Math.PI / 180); // ±70° around top
        }
        const primaryLabel = (primary.querySelector('.node-name') || {}).textContent || '';
        const primaryAngle = hashAngle(primaryLabel);
        placeAt(primary, primaryAngle);
        const placed = [{ angle: primaryAngle }];

        const total = secondary.length + 1;
        const step  = (2 * Math.PI) / total;

        for (let si = 0; si < secondary.length; si++) {
          const sec = secondary[si];
          let angle = primaryAngle + (si + 1) * step;
          for (let i = 0; i < 120; i++) {
            const sx = cx + r * Math.cos(angle);
            const sy = cy + r * Math.sin(angle);
            const conflict = placed.find(p => {
              const px = cx + r * Math.cos(p.angle);
              const py = cy + r * Math.sin(p.angle);
              return Math.hypot(sx - px, sy - py) < MIN_GAP;
            });
            if (!conflict) break;
            const diff = angle - conflict.angle;
            angle += (diff >= 0 ? 1 : -1) * (Math.PI / 36);
          }
          placeAt(sec, angle);
          placed.push({ angle });
        }

        // Nodes are now in final position — trigger fade-in animation
        nodes.forEach(el => showNode(el, el.dataset.primary === 'true', 0));

        // Hide ring-label if any placed node is too close to it
        const labelEl = root.getElementById(`ir-rl${ringNum}`);
        if (labelEl) {
          const lc = getCtr(labelEl, canvas);
          const tooClose = placed.some(p => {
            const px = cx + r * Math.cos(p.angle);
            const py = cy + r * Math.sin(p.angle);
            return Math.hypot(lc.x - px, lc.y - py) < 44;
          });
          if (tooClose) labelEl.style.opacity = '0';
        }
        if (onDone) requestAnimationFrame(() => requestAnimationFrame(onDone));
      }, delay);
    }

    resolveRingOverlaps(1, 1200);
    resolveRingOverlaps(2, 1950);
    resolveRingOverlaps(3, 2750);

    const center = root.getElementById('ir-center');
    const p1 = root.querySelector('[data-ring="1"][data-primary="true"]');
    const p2 = root.querySelector('[data-ring="2"][data-primary="true"]');
    const p3 = root.querySelector('[data-ring="3"][data-primary="true"]');

    function drawLineBetween(fromEl, toEl) {
      svg.setAttribute('width',  canvas.offsetWidth);
      svg.setAttribute('height', canvas.offsetHeight);
      const c1 = getCtr(fromEl, canvas);
      const c2 = getCtr(toEl,   canvas);
      animateLine(svg, c1.x, c1.y, c2.x, c2.y, 0);
    }

    // Chain: draw each line only after the corresponding ring's overlap resolution is done
    if (center && p1) resolveRingOverlaps(1, 1200, () => drawLineBetween(center, p1));
    if (p1 && p2)     resolveRingOverlaps(2, 1950, () => drawLineBetween(p1, p2));
    if (p2 && p3)     resolveRingOverlaps(3, 2750, () => drawLineBetween(p2, p3));

    function showLabel(id, delay) {
      setTimeout(() => { const el = root.getElementById(id); if (el) el.classList.add('show'); }, delay);
    }
    showLabel('ir-rl1', 900);
    showLabel('ir-rl2', 1600);
    showLabel('ir-rl3', 2400);

    const fill = root.getElementById('ir-fill');
    if (fill) {
      setTimeout(() => {
        fill.style.transition = 'width 0.8s cubic-bezier(0.4,0,0.2,1)';
        fill.style.width = fill.closest('.impact-share').querySelector('.share-pct').textContent.replace('%', '') + '%';
      }, 3800);
    }
  }


  /* ─── DATA BINDING PARSER ────────────────────────────────────────────────── */
  function parseBinding(dataBinding, kpiLabel, kpiUnit, impactUnit, ring1Label, ring2Label, ring3Label, pathSummaryOverride) {
    const data = dataBinding && dataBinding.data;
    if (!data || data.length === 0) return null;

    const meta  = dataBinding && dataBinding.metadata;
    const feeds = meta && meta.feeds;

    // Resolve aliases by index from feed
    function aliases(feedId) {
      const feed = feeds && feeds[feedId];
      return (feed && feed.values) ? feed.values : [];
    }

    const measAliases = aliases('measures');
    const dimAliases  = aliases('dimensions');

    // measures_0 = KPI, measures_1 = Impact (falls nur 1 Measure: beide = measures_0)
    const kpiMeasKey    = measAliases[0] || null;
    const impactMeasKey = measAliases[1] || measAliases[0] || null;
    // dimensions_0 = Time, dimensions_1..3 = Ring 1..3
    const timeDimKey    = dimAliases[0] || null;
    const driverDimKey  = dimAliases[1] || null;
    const geoDimKey     = dimAliases[2] || null;
    const segmentDimKey = dimAliases[3] || null;

    if (!kpiMeasKey || !impactMeasKey || !timeDimKey || !driverDimKey || !geoDimKey || !segmentDimKey) return null;

    // Validate that the first dimension is a time dimension
    // Primary check: SAC metadata type field
    // Fallback: time dims have few unique values (years), non-time dims have many (countries, products)
    function isTimeDimension(alias) {
      const dim = meta && meta.dimensions && meta.dimensions[alias];
      if (dim && dim.type && dim.type.toLowerCase().includes('time')) return true;
      if (dim && dim.type && dim.type.toLowerCase().includes('date')) return true;
      // Heuristic: unique value count — time dims typically have ≤ 5 distinct values
      const uniqueVals = new Set(data.map(r => r[alias] && String(r[alias].id))).size;
      const totalDimVals = new Set(data.map(r => r[driverDimKey] && String(r[driverDimKey].id))).size;
      return uniqueVals <= 5 && uniqueVals < totalDimVals;
    }

    if (!isTimeDimension(timeDimKey)) return { _configError: true };

    // Real display names from SAC metadata
    function measName(alias) {
      const msm = meta && meta.mainStructureMembers && meta.mainStructureMembers[alias];
      return (msm && (msm.label || msm.description || msm.id)) || alias.replace('measures_', '');
    }
    function dimName(alias) {
      const dim = meta && meta.dimensions && meta.dimensions[alias];
      return (dim && (dim.description || dim.label || dim.id)) || alias.replace('dimensions_', '');
    }

    const inferredKpiLabel   = measName(kpiMeasKey);
    const inferredRing1Label = dimName(driverDimKey);
    const inferredRing2Label = dimName(geoDimKey);
    const inferredRing3Label = dimName(segmentDimKey);


    const yearIds = [...new Set(data.map(r => r[timeDimKey] && String(r[timeDimKey].id)))].filter(Boolean).sort();
    if (yearIds.length < 2) return null;
    const resolvedPrior = yearIds[yearIds.length - 2];
    const resolvedCur   = yearIds[yearIds.length - 1];

    const impactMap = {};

    for (const row of data) {
      const yearId = row[timeDimKey] && String(row[timeDimKey].id);
      const drv    = row[driverDimKey];
      const geo    = row[geoDimKey];
      const seg    = row[segmentDimKey];
      const cell   = row[impactMeasKey];
      if (!drv || !geo || !seg || !cell) continue;

      const drvId = String(drv.id);
      const geoId = String(geo.id);
      const segId = String(seg.id);
      const val   = cell.raw !== undefined ? Number(cell.raw) : null;
      if (val === null) continue;

      if (!impactMap[drvId]) impactMap[drvId] = { label: drv.label || drv.id, geos: {} };
      if (!impactMap[drvId].geos[geoId]) impactMap[drvId].geos[geoId] = { label: geo.label || geo.id, segs: {} };
      if (!impactMap[drvId].geos[geoId].segs[segId]) impactMap[drvId].geos[geoId].segs[segId] = { label: seg.label || seg.id, cur: null, prior: null };

      const entry = impactMap[drvId].geos[geoId].segs[segId];
      if (yearId === resolvedCur)        entry.cur   = (entry.cur   ?? 0) + val;
      else if (yearId === resolvedPrior) entry.prior = (entry.prior ?? 0) + val;
    }

    const driverTotals = {};
    for (const [drvId, drvData] of Object.entries(impactMap)) {
      let drvSum = 0;
      for (const [geoId, geoData] of Object.entries(drvData.geos)) {
        for (const [segId, segData] of Object.entries(geoData.segs)) {
          drvSum += (segData.cur ?? 0) - (segData.prior ?? 0);
        }
      }
      driverTotals[drvId] = { label: drvData.label, total: drvSum };
    }

    const ring1Primary = Object.entries(driverTotals).sort((a, b) => a[1].total - b[1].total)[0];
    if (!ring1Primary) return null;
    const primaryDrvId = ring1Primary[0];

    const geoTotals = {};
    for (const [geoId, geoData] of Object.entries(impactMap[primaryDrvId].geos)) {
      let geoSum = 0;
      for (const [segId, segData] of Object.entries(geoData.segs)) {
        geoSum += (segData.cur ?? 0) - (segData.prior ?? 0);
      }
      geoTotals[geoId] = { label: geoData.label, total: geoSum };
    }
    const ring2Primary = Object.entries(geoTotals).sort((a, b) => a[1].total - b[1].total)[0];
    if (!ring2Primary) return null;
    const primaryGeoId = ring2Primary[0];

    const segTotals = {};
    for (const [segId, segData] of Object.entries(impactMap[primaryDrvId].geos[primaryGeoId].segs)) {
      const delta = (segData.cur ?? 0) - (segData.prior ?? 0);
      segTotals[segId] = { label: segData.label, total: delta };
    }
    const ring3Primary = Object.entries(segTotals).sort((a, b) => a[1].total - b[1].total)[0];
    if (!ring3Primary) return null;
    const primarySegId = ring3Primary[0];

    function buildRingNodes(totalsObj, primaryId, maxNodes) {
      const sorted = Object.entries(totalsObj)
        .sort((a, b) => a[1].total - b[1].total)
        .slice(0, maxNodes)
        .map(([id, d]) => ({
          id,
          label: d.label,
          impact: d.total / 1e6,
          primary: id === primaryId
        }));
      // Ensure primary node is always at index 0 (slot n-rX-0 = top position)
      const primaryIdx = sorted.findIndex(n => n.primary);
      if (primaryIdx > 0) {
        const [primary] = sorted.splice(primaryIdx, 1);
        sorted.unshift(primary);
      }
      return sorted;
    }

    const ring1Nodes = buildRingNodes(driverTotals, primaryDrvId, 3);
    const ring2Nodes = buildRingNodes(geoTotals, primaryGeoId, 3);
    const ring3Nodes = buildRingNodes(segTotals, primarySegId, 4);

    const totalAdverse = Object.values(driverTotals).reduce((s, d) => d.total < 0 ? s + d.total : s, 0);
    const impactSharePct = totalAdverse !== 0 ? Math.round(Math.abs(ring1Primary[1].total / totalAdverse) * 100) : 0;

    // KPI value: calculate % delta from impact measure totals (cur - prior) / prior
    let kpiCur = 0, kpiPrior = 0;
    for (const row of data) {
      const yearId = row[timeDimKey] && String(row[timeDimKey].id);
      const cell   = row[impactMeasKey];
      if (!cell || cell.raw === undefined || cell.raw === null) continue;
      if (yearId === resolvedCur)        kpiCur   += Number(cell.raw);
      else if (yearId === resolvedPrior) kpiPrior += Number(cell.raw);
    }
    const kpiDelta = kpiPrior !== 0 ? (kpiCur - kpiPrior) / Math.abs(kpiPrior) * 100 : 0;
    const kpiFormatted = (kpiDelta < 0 ? '−' : '+') + Math.abs(kpiDelta).toFixed(1) + (kpiUnit || '%');

    const inferredImpactLabel = measName(impactMeasKey);
    const resolvedKpiLabel    = kpiLabel    || inferredKpiLabel;
    const resolvedImpactLabel = inferredImpactLabel;
    const resolvedRing1Label  = ring1Label  || inferredRing1Label;
    const resolvedRing2Label  = ring2Label  || inferredRing2Label;
    const resolvedRing3Label  = ring3Label  || inferredRing3Label;
    const resolvedYearLabel   = `${resolvedCur} vs ${resolvedPrior}`;
    const showImpactBy        = impactMeasKey !== kpiMeasKey && resolvedImpactLabel !== resolvedKpiLabel;

    return {
      kpiLabel:      resolvedKpiLabel,
      kpiValue:      kpiFormatted,
      yearLabel:     resolvedYearLabel,
      impactByLabel: showImpactBy ? resolvedImpactLabel : null,
      ring1Label:    resolvedRing1Label,
      ring2Label:    resolvedRing2Label,
      ring3Label:    resolvedRing3Label,
      impactUnit:    impactUnit    || '€',
      ring1Nodes,
      ring2Nodes,
      ring3Nodes,
      impactSharePct,
      shareDriveLabel: `Dominant ${resolvedRing1Label} — Share of Total Adverse ${resolvedImpactLabel} Impact`,
      pathSummary: pathSummaryOverride || null
    };
  }

  /* ─── WEB COMPONENT ─────────────────────────────────────────────────────── */
  class ImpactRippleWidget extends HTMLElement {
    constructor() {
      super();
      this._shadow = this.attachShadow({ mode: 'open' });
      this._data   = null;
      this._ro     = null;
    }

    connectedCallback() {
      if (!this._data) this._render(DEMO);
    }

    _renderConfigError() {
      const style = document.createElement('style');
      style.textContent = CSS;
      const wrapper = document.createElement('div');
      wrapper.className = 'scale-host';
      wrapper.innerHTML = `<div class="scale-inner" style="display:flex;align-items:center;justify-content:center;height:100%;padding:24px;">
        <div style="text-align:center;color:#374151;font-family:sans-serif;">
          <div style="font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#dc2626;margin-bottom:12px;">Configuration required</div>
          <div style="font-size:12px;color:#6b7280;line-height:1.6;">Please place a time dimension in the first slot.<br><span style="color:#374151;font-weight:600;">Expected order: Time → Ring 1 → Ring 2 → Ring 3</span></div>
        </div>
      </div>`;
      this._shadow.innerHTML = '';
      this._shadow.appendChild(style);
      this._shadow.appendChild(wrapper);
    }

    _render(d) {
      this._data = d;
      const style = document.createElement('style');
      style.textContent = CSS;
      const wrapper = document.createElement('div');
      wrapper.className = 'scale-host';
      wrapper.innerHTML = `<div class="scale-inner">${renderWidget(d)}</div>`;
      this._shadow.innerHTML = '';
      this._shadow.appendChild(style);
      this._shadow.appendChild(wrapper);

      requestAnimationFrame(() => {
        setTimeout(() => runAnimation(this._shadow), 50);
      });

      this._applyScale(this.offsetWidth, this.offsetHeight);
      this._attachResize();
    }

    _applyScale(w, h) {
      const inner = this._shadow.querySelector('.scale-inner');
      if (!inner || !w) return;
      const scale = w / 620;
      // Read natural height BEFORE applying transform (transform doesn't change offsetHeight)
      const naturalH = inner.offsetHeight || 660;
      inner.style.transform = `scale(${scale})`;
      this.style.height = `${naturalH * scale}px`;
    }

    _attachResize() {
      if (this._ro) this._ro.disconnect();
      this._ro = new ResizeObserver(entries => {
        const e = entries[0];
        if (e) this._applyScale(e.contentRect.width, e.contentRect.height);
      });
      this._ro.observe(this);
    }

    onCustomWidgetBeforeUpdate() {}

    onCustomWidgetAfterUpdate(changedProps) {
      // SAC passes the full dataBinding object in changedProps
      const binding = changedProps && (changedProps.dataBinding || changedProps['dataBinding']);
      if (binding) this._processBinding(binding);
    }

    onCustomWidgetDataChanged(dataBinding) { this._processBinding(dataBinding); }

    onCustomWidgetResize(w, h) { this._applyScale(w, h); }

    _processBinding(dataBinding) {
      if (!dataBinding) return;
      this._lastBinding = dataBinding;
      const p = this;
      // Only use manual property overrides if they differ from their defaults
      const overrideKpi    = (p.kpiLabel   && p.kpiLabel   !== 'Gross Margin') ? p.kpiLabel   : null;
      const overrideRing1  = (p.ring1Label && p.ring1Label !== 'Driver')       ? p.ring1Label : null;
      const overrideRing2  = (p.ring2Label && p.ring2Label !== 'Geography')    ? p.ring2Label : null;
      const overrideRing3  = (p.ring3Label && p.ring3Label !== 'Segment')      ? p.ring3Label : null;
      const d = parseBinding(dataBinding, overrideKpi, p.kpiUnit, p.impactUnit, overrideRing1, overrideRing2, overrideRing3, p.pathSummary);
      if (d && d._configError) { this._renderConfigError(); return; }
      if (d) this._render(d);
    }
  }

  customElements.define('com-custom-sac-impactripple', ImpactRippleWidget);
})();
