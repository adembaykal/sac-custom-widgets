(function () {
  'use strict';

  const TAG = 'com-custom-hierarchy-shift';
  const NODE_W = 224;
  const NODE_H = 82;
  const COL_GAP = 44;
  const ROW_GAP = 12;
  const V_COL_GAP = 26;
  const V_ROW_GAP = 58;
  const PAD_X = 24;
  const PAD_Y = 24;

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function normalizeBinding(input) {
    if (!input) return null;
    if (input.dataBinding) return input.dataBinding;
    if (input.binding) return input.binding;
    return input;
  }

  function cellId(cell) {
    if (!cell) return '';
    if (cell.id != null) return String(cell.id);
    if (cell.key != null) return String(cell.key);
    if (cell.label != null) return String(cell.label);
    return '';
  }

  function parsePeriodScore(cell) {
    if (!cell) return null;
    for (const raw of [cell.id, cell.label]) {
      if (raw == null) continue;
      const s = String(raw).trim();
      const digits = s.replace(/\D/g, '');
      if (digits.length >= 4 && digits.length <= 14) {
        const n = Number(digits);
        if (Number.isFinite(n)) return n;
      }
      const d = Date.parse(s);
      if (!Number.isNaN(d)) return d;
    }
    return null;
  }

  function looksLikeTime(meta, rows, key) {
    const desc = `${meta?.id || ''} ${meta?.description || ''}`.toLowerCase();
    if (/cal|time|date|year|month|quarter|week|day/.test(desc)) return true;

    let good = 0;
    let seen = 0;
    for (const row of rows.slice(0, 100)) {
      const c = row[key];
      if (!c) continue;
      seen++;
      if (parsePeriodScore(c) != null) good++;
    }
    return seen > 0 && good / seen > 0.7;
  }

  function detectAliases(binding) {
    const rows = binding?.data || [];
    const md = binding?.metadata || {};
    const dimEntries = Object.entries(md.dimensions || {});
    const msrEntries = Object.entries(md.mainStructureMembers || {});

    let hierarchyKey = null;
    let timeKey = null;

    for (const [key] of dimEntries) {
      let evidence = 0;
      let count = 0;
      for (const row of rows.slice(0, 220)) {
        const c = row[key];
        if (!c) continue;
        count++;
        if (c.parentId != null || c.isNode === true || c.isCollapsed != null) evidence++;
      }
      if (count && evidence / count > 0.06) {
        hierarchyKey = key;
        break;
      }
    }

    for (const [key, meta] of dimEntries) {
      if (key === hierarchyKey) continue;
      if (looksLikeTime(meta, rows, key)) {
        timeKey = key;
        break;
      }
    }

    if (!hierarchyKey && dimEntries.length) {
      hierarchyKey = dimEntries.find(([key]) => key !== timeKey)?.[0] || dimEntries[0][0];
    }

    if (!timeKey && dimEntries.length > 1) {
      timeKey = dimEntries.find(([key]) => key !== hierarchyKey)?.[0] || null;
    }

    const measureKey =
      msrEntries[0]?.[0] ||
      Object.keys(rows[0] || {}).find(k => {
        const c = rows[0]?.[k];
        return c && typeof c === 'object' &&
          ('raw' in c || 'value' in c || 'rawValue' in c || 'formatted' in c || 'formattedValue' in c);
      }) ||
      null;

    return {
      hierarchyKey,
      timeKey,
      measureKey,
      hierarchyMeta: hierarchyKey ? md.dimensions?.[hierarchyKey] : null,
      timeMeta: timeKey ? md.dimensions?.[timeKey] : null,
      measureMeta: measureKey ? md.mainStructureMembers?.[measureKey] : null
    };
  }

  function rawNumber(cell) {
    if (cell == null) return 0;
    if (typeof cell === 'number') return Number.isFinite(cell) ? cell : 0;
    for (const v of [cell.raw, cell.value, cell.rawValue]) {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
    return 0;
  }

  function formatNumber(value, unit) {
    const abs = Math.abs(value);
    const options = abs >= 1000000000
      ? { notation: 'compact', maximumFractionDigits: 1 }
      : { maximumFractionDigits: abs > 0 && abs < 100 ? 1 : 0, minimumFractionDigits: 0 };

    const text = new Intl.NumberFormat(undefined, options).format(value);
    return unit ? `${text} ${unit}` : text;
  }

  function isAggregateHierarchyCell(cell) {
    if (!cell) return false;
    if (cell.isTotal === true || cell.isResult === true || cell.isGrandTotal === true) return true;

    const label = String(cell.label || '').trim().toLowerCase();
    const id = String(cell.id || '').trim().toLowerCase();

    const known = new Set([
      'total', 'totals', 'grand total', 'overall total', 'result', 'results'
    ]);

    if (known.has(label)) return true;
    if (/^(grand[_ -]?total|overall[_ -]?total|totals?)$/.test(id)) return true;
    return false;
  }

  function buildModel(binding) {
    if (!binding || binding.state !== 'success' || !Array.isArray(binding.data) || !binding.data.length) {
      return null;
    }

    const aliases = detectAliases(binding);
    if (!aliases.hierarchyKey || !aliases.measureKey) return null;

    /*
     * The current SAC data binding is the source of truth. SHIFT does not add a
     * second period selector. If the story is filtered to 2026, SHIFT consumes
     * the 2026 result set that SAC supplies.
     */
    const structure = new Map();

    for (const row of binding.data) {
      const hc = row[aliases.hierarchyKey];
      if (!hc || isAggregateHierarchyCell(hc)) continue;

      const id = cellId(hc);
      if (!id) continue;

      const parentId = hc.parentId != null ? String(hc.parentId) : null;
      const score = aliases.timeKey ? parsePeriodScore(row[aliases.timeKey]) : 0;

      let current = structure.get(id);
      if (!current) {
        current = {
          id,
          label: hc.label || id,
          isNode: hc.isNode === true,
          parentVotes: new Map()
        };
        structure.set(id, current);
      }

      if (hc.label) current.label = hc.label;
      if (hc.isNode === true) current.isNode = true;

      if (parentId) {
        const vote = current.parentVotes.get(parentId) || { count: 0, latestScore: -Infinity };
        vote.count += 1;
        if (score != null && score > vote.latestScore) vote.latestScore = score;
        current.parentVotes.set(parentId, vote);
      }
    }

    for (const item of structure.values()) {
      let selectedParent = null;
      let selectedVote = null;

      for (const [parentId, vote] of item.parentVotes.entries()) {
        if (!selectedVote ||
            vote.count > selectedVote.count ||
            (vote.count === selectedVote.count && vote.latestScore > selectedVote.latestScore)) {
          selectedParent = parentId;
          selectedVote = vote;
        }
      }

      item.parentId = selectedParent;
    }

    /*
     * If BW omitted the row for a referenced parent but supplied child relations,
     * keep the parent structurally rather than losing the branch.
     */
    for (const item of Array.from(structure.values())) {
      if (item.parentId && !structure.has(item.parentId)) {
        structure.set(item.parentId, {
          id: item.parentId,
          label: item.parentId.replace(/^0HIER_NODE!/, ''),
          isNode: true,
          parentVotes: new Map(),
          parentId: null
        });
      }
    }

    if (!structure.size) return null;

    /*
     * Unit is metadata of the KPI cell and may only be present on selected rows.
     * Scan the full current binding once and retain it independently of formatted
     * values so EUR/USD/etc. never disappears from a node.
     */
    let unit = '';
    for (const row of binding.data) {
      const mc = row[aliases.measureKey];
      if (mc?.unit) {
        unit = String(mc.unit);
        break;
      }
    }

    /*
     * Deduplicate one hierarchy member per time member, then sum the time members
     * currently supplied by SAC. This supports a story filter such as Calendar
     * Year = 2026 without adding a second period filter in the widget.
     */
    const byNodeTime = new Map();

    for (const row of binding.data) {
      const hc = row[aliases.hierarchyKey];
      if (!hc || isAggregateHierarchyCell(hc)) continue;

      const id = cellId(hc);
      if (!id || !structure.has(id)) continue;

      const mc = row[aliases.measureKey];
      if (!mc) continue;

      const timeId = aliases.timeKey ? cellId(row[aliases.timeKey]) : '__context__';
      const value = rawNumber(mc);
      const key = `${id}@@${timeId}`;

      const current = byNodeTime.get(key);
      if (!current || Math.abs(value) > Math.abs(current.value)) {
        byNodeTime.set(key, { id, value });
      }
    }

    const directValues = new Map();
    for (const entry of byNodeTime.values()) {
      directValues.set(entry.id, (directValues.get(entry.id) || 0) + entry.value);
    }

    const nodeMap = {};

    for (const [id, item] of structure.entries()) {
      nodeMap[id] = {
        id,
        label: item.label || id,
        parentId: item.parentId || null,
        isNode: item.isNode === true,
        directValue: directValues.has(id) ? directValues.get(id) : null,
        hasDirectValue: directValues.has(id),
        value: directValues.has(id) ? directValues.get(id) : 0,
        scenarioDelta: 0,
        valueSource: directValues.has(id) ? 'direct' : 'none'
      };
    }

    for (const id of Object.keys(nodeMap)) {
      const n = nodeMap[id];
      if (n.parentId === id || (n.parentId && !nodeMap[n.parentId])) n.parentId = null;
    }

    const childrenMap = {};
    Object.keys(nodeMap).forEach(id => { childrenMap[id] = []; });

    Object.values(nodeMap).forEach(n => {
      if (n.parentId && childrenMap[n.parentId]) childrenMap[n.parentId].push(n.id);
    });

    Object.keys(childrenMap).forEach(id => {
      if (childrenMap[id].length) nodeMap[id].isNode = true;
    });

    /*
     * Existing BW aggregate values stay authoritative. Only a structural node
     * without a returned value gets a child roll-up fallback.
     */
    const memo = new Map();
    const visiting = new Set();

    function resolveValue(id) {
      if (memo.has(id)) return memo.get(id);
      if (visiting.has(id)) return 0;

      visiting.add(id);
      const node = nodeMap[id];
      const kids = childrenMap[id] || [];

      let value = node.hasDirectValue ? node.directValue : 0;

      if (!node.hasDirectValue && kids.length) {
        value = kids.reduce((sum, kidId) => sum + resolveValue(kidId), 0);
        node.valueSource = 'rollup';
      } else {
        kids.forEach(resolveValue);
      }

      node.value = value;
      visiting.delete(id);
      memo.set(id, value);
      return value;
    }

    Object.keys(nodeMap).forEach(resolveValue);

    /*
     * Final aggregate guard: a disconnected Totals/Grand Total result row can
     * never become an artificial second root.
     */
    for (const id of Object.keys(nodeMap)) {
      const node = nodeMap[id];
      const hasKids = (childrenMap[id] || []).length > 0;
      const label = String(node.label || '').trim().toLowerCase();

      if (!node.parentId && !hasKids &&
          ['total', 'totals', 'grand total', 'overall total', 'result', 'results'].includes(label)) {
        delete nodeMap[id];
      }
    }

    return {
      nodes: nodeMap,
      unit,
      measureLabel: aliases.measureMeta?.label || aliases.measureMeta?.description || 'KPI',
      hierarchyLabel: aliases.hierarchyMeta?.description || aliases.hierarchyMeta?.id || 'Hierarchy',
      contextLabel: aliases.timeMeta?.description
        ? `SAC filter context • ${aliases.timeMeta.description}`
        : 'SAC filter context'
    };
  }

  function cloneParents(nodes) {
    const out = {};
    for (const id of Object.keys(nodes)) out[id] = nodes[id].parentId || null;
    return out;
  }

  const ROOT_INDEX_KEY = '__SHIFT_ROOT__';
  const COMPACT_ROW_H = 50;
  const COMPACT_VIRTUAL_THRESHOLD = 320;
  const COMPACT_VIRTUAL_WINDOW = 180;

  function buildHierarchyIndex(nodes, parentOverride = null) {
    const children = new Map();
    const parent = new Map();
    const depth = new Map();
    const roots = [];

    function parentOf(node) {
      if (!node) return null;
      if (parentOverride && Object.prototype.hasOwnProperty.call(parentOverride, node.id)) {
        return parentOverride[node.id] || null;
      }
      return node.parentId || null;
    }

    for (const node of Object.values(nodes || {})) {
      const p = parentOf(node);
      parent.set(node.id, p);
      const key = p || ROOT_INDEX_KEY;
      if (!children.has(key)) children.set(key, []);
      children.get(key).push(node.id);
    }

    for (const ids of children.values()) {
      ids.sort((a, b) => {
        const al = nodes[a]?.label || a;
        const bl = nodes[b]?.label || b;
        return al.localeCompare(bl);
      });
    }

    for (const node of Object.values(nodes || {})) {
      const p = parent.get(node.id);
      if (!p || !nodes[p]) roots.push(node.id);
    }

    roots.sort((a, b) =>
      (nodes[a]?.label || a).localeCompare(nodes[b]?.label || b)
    );

    const stack = roots.map(id => ({ id, d: 0 }));
    const seen = new Set();
    let maxDepth = 0;

    while (stack.length) {
      const item = stack.shift();
      if (!item || seen.has(item.id)) continue;
      seen.add(item.id);
      depth.set(item.id, item.d);
      maxDepth = Math.max(maxDepth, item.d);

      const kids = children.get(item.id) || [];
      for (const kid of kids) stack.push({ id: kid, d: item.d + 1 });
    }

    return { children, parent, depth, roots, maxDepth };
  }

  function childrenOf(nodes, parentId, index = null) {
    if (index?.children) {
      const key = parentId || ROOT_INDEX_KEY;
      return (index.children.get(key) || [])
        .map(id => nodes[id])
        .filter(Boolean);
    }

    return Object.values(nodes)
      .filter(n => (n.parentId || null) === (parentId || null))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  function hasChildren(nodes, id, index = null) {
    if (index?.children) return (index.children.get(id) || []).length > 0;
    return Object.values(nodes).some(n => (n.parentId || null) === id);
  }

  function descendantSet(nodes, rootId, index = null) {
    const set = new Set();
    const stack = [rootId];

    while (stack.length) {
      const id = stack.pop();

      for (const child of childrenOf(nodes, id, index)) {
        if (!set.has(child.id)) {
          set.add(child.id);
          stack.push(child.id);
        }
      }
    }

    return set;
  }

  function subtreeCount(nodes, rootId, index = null) {
    return 1 + descendantSet(nodes, rootId, index).size;
  }

  function visibleChildren(nodes, id, index, allowedSet) {
    const kids = childrenOf(nodes, id, index);
    if (!allowedSet) return kids;
    return kids.filter(k => allowedSet.has(k.id));
  }

  function layoutTree(nodes, collapsedMap, orientation = 'horizontal', index = null, options = {}) {
    const focusRootId =
      options.focusRootId && nodes[options.focusRootId] ? options.focusRootId : null;
    const allowedSet = options.allowedSet || null;
    const maxVisibleDepth = Number(options.maxVisibleDepth || 0);

    const roots = focusRootId
      ? [nodes[focusRootId]]
      : (index?.roots || Object.values(nodes)
          .filter(n => !n.parentId || !nodes[n.parentId])
          .map(n => n.id))
          .map(id => nodes[id])
          .filter(Boolean)
          .filter(n => !allowedSet || allowedSet.has(n.id))
          .sort((a, b) => a.label.localeCompare(b.label));

    const positions = {};
    const visible = new Set();
    let maxDepth = 0;

    function shouldStop(depth, id) {
      if (collapsedMap?.[id]) return true;
      return maxVisibleDepth > 0 && depth >= maxVisibleDepth;
    }

    if (orientation === 'vertical') {
      let nextLeafX = PAD_X;

      function placeVertical(node, depth) {
        if (!node || visible.has(node.id)) return null;
        if (allowedSet && !allowedSet.has(node.id)) return null;

        visible.add(node.id);
        maxDepth = Math.max(maxDepth, depth);

        const kids = shouldStop(depth, node.id)
          ? []
          : visibleChildren(nodes, node.id, index, allowedSet);

        let x;

        if (!kids.length) {
          x = nextLeafX;
          nextLeafX += NODE_W + V_COL_GAP;
        } else {
          const xs = [];
          for (const child of kids) {
            const cx = placeVertical(child, depth + 1);
            if (cx != null) xs.push(cx);
          }

          if (xs.length) x = (xs[0] + xs[xs.length - 1]) / 2;
          else {
            x = nextLeafX;
            nextLeafX += NODE_W + V_COL_GAP;
          }
        }

        positions[node.id] = {
          x,
          y: PAD_Y + depth * (NODE_H + V_ROW_GAP),
          depth
        };

        return x;
      }

      for (const root of roots) {
        placeVertical(root, 0);
        nextLeafX += 12;
      }

      const positionValues = Object.values(positions);
      const width = Math.max(
        720,
        nextLeafX + PAD_X,
        ...(positionValues.length
          ? positionValues.map(p => p.x + NODE_W + PAD_X)
          : [720])
      );

      const height = Math.max(
        390,
        PAD_Y * 2 + (maxDepth + 1) * NODE_H + maxDepth * V_ROW_GAP
      );

      return {
        positions,
        width,
        height,
        roots: roots.map(r => r.id),
        orientation
      };
    }

    let nextLeafY = PAD_Y;

    function placeHorizontal(node, depth) {
      if (!node || visible.has(node.id)) return null;
      if (allowedSet && !allowedSet.has(node.id)) return null;

      visible.add(node.id);
      maxDepth = Math.max(maxDepth, depth);

      const kids = shouldStop(depth, node.id)
        ? []
        : visibleChildren(nodes, node.id, index, allowedSet);

      let y;

      if (!kids.length) {
        y = nextLeafY;
        nextLeafY += NODE_H + ROW_GAP;
      } else {
        const ys = [];
        for (const child of kids) {
          const cy = placeHorizontal(child, depth + 1);
          if (cy != null) ys.push(cy);
        }

        if (ys.length) y = (ys[0] + ys[ys.length - 1]) / 2;
        else {
          y = nextLeafY;
          nextLeafY += NODE_H + ROW_GAP;
        }
      }

      positions[node.id] = {
        x: PAD_X + depth * (NODE_W + COL_GAP),
        y,
        depth
      };

      return y;
    }

    for (const root of roots) {
      placeHorizontal(root, 0);
      nextLeafY += 8;
    }

    return {
      positions,
      width: PAD_X * 2 + (maxDepth + 1) * NODE_W + maxDepth * COL_GAP,
      height: Math.max(390, nextLeafY + PAD_Y),
      roots: roots.map(r => r.id),
      orientation
    };
  }

  function compactRows(nodes, collapsedMap, index = null, options = {}) {
    const focusRootId =
      options.focusRootId && nodes[options.focusRootId] ? options.focusRootId : null;
    const allowedSet = options.allowedSet || null;
    const maxVisibleDepth = Number(options.maxVisibleDepth || 0);

    const roots = focusRootId
      ? [nodes[focusRootId]]
      : (index?.roots || Object.values(nodes)
          .filter(n => !n.parentId || !nodes[n.parentId])
          .map(n => n.id))
          .map(id => nodes[id])
          .filter(Boolean)
          .filter(n => !allowedSet || allowedSet.has(n.id))
          .sort((a, b) => a.label.localeCompare(b.label));

    const rows = [];
    const seen = new Set();

    function walk(node, depth) {
      if (!node || seen.has(node.id)) return;
      if (allowedSet && !allowedSet.has(node.id)) return;

      seen.add(node.id);
      rows.push({ node, depth });

      if (collapsedMap?.[node.id]) return;
      if (maxVisibleDepth > 0 && depth >= maxVisibleDepth) return;

      visibleChildren(nodes, node.id, index, allowedSet)
        .forEach(child => walk(child, depth + 1));
    }

    roots.forEach(root => walk(root, 0));
    return rows;
  }


  function xmlEscape(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  const SHIFT_CRC32_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) {
      c = SHIFT_CRC32_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function utf8Bytes(text) {
    return new TextEncoder().encode(String(text));
  }

  function le16(value) {
    const a = new Uint8Array(2);
    new DataView(a.buffer).setUint16(0, value >>> 0, true);
    return a;
  }

  function le32(value) {
    const a = new Uint8Array(4);
    new DataView(a.buffer).setUint32(0, value >>> 0, true);
    return a;
  }

  function concatBytes(parts) {
    const length = parts.reduce((sum, p) => sum + p.length, 0);
    const out = new Uint8Array(length);
    let offset = 0;
    for (const p of parts) {
      out.set(p, offset);
      offset += p.length;
    }
    return out;
  }

  function zipStore(entries) {
    const locals = [];
    const centrals = [];
    let offset = 0;

    for (const entry of entries) {
      const name = utf8Bytes(entry.name);
      const data = entry.data instanceof Uint8Array ? entry.data : utf8Bytes(entry.data);
      const crc = crc32(data);

      const local = concatBytes([
        le32(0x04034b50), le16(20), le16(0x0800), le16(0), le16(0), le16(0),
        le32(crc), le32(data.length), le32(data.length), le16(name.length), le16(0),
        name, data
      ]);
      locals.push(local);

      const central = concatBytes([
        le32(0x02014b50), le16(20), le16(20), le16(0x0800), le16(0), le16(0), le16(0),
        le32(crc), le32(data.length), le32(data.length), le16(name.length), le16(0),
        le16(0), le16(0), le16(0), le32(0), le32(offset), name
      ]);
      centrals.push(central);
      offset += local.length;
    }

    const centralSize = centrals.reduce((sum, p) => sum + p.length, 0);
    const centralOffset = offset;
    const end = concatBytes([
      le32(0x06054b50), le16(0), le16(0), le16(entries.length), le16(entries.length),
      le32(centralSize), le32(centralOffset), le16(0)
    ]);
    return concatBytes([...locals, ...centrals, end]);
  }

  function xlsxColumnName(index) {
    let n = index + 1;
    let out = '';
    while (n > 0) {
      const rem = (n - 1) % 26;
      out = String.fromCharCode(65 + rem) + out;
      n = Math.floor((n - 1) / 26);
    }
    return out;
  }

  const XLSX_STYLE = Object.freeze({
    BODY_TEXT: 0,
    HEADER: 1,
    BODY_NUMBER: 2,
    BODY_LEVEL: 3,
    BODY_MEMBER: 4,
    BODY_UNIT: 5,
    BRANCH_TEXT: 6,
    BRANCH_NUMBER: 7,
    BRANCH_LEVEL: 8,
    BRANCH_MEMBER: 9,
    BRANCH_UNIT: 10,
    ROOT_TEXT: 11,
    ROOT_NUMBER: 12,
    ROOT_LEVEL: 13,
    ROOT_MEMBER: 14,
    ROOT_UNIT: 15,
    CHANGED_TEXT: 16,
    CHANGED_NUMBER: 17,
    DELTA_POS: 18,
    DELTA_NEG: 19,
    DELTA_ZERO: 20,
    LEAF_INDENT_BASE: 21,
    BRANCH_INDENT_BASE: 33
  });

  function xlsxHierarchyStyle(depth, isRoot, isBranch) {
    if (isRoot) return XLSX_STYLE.ROOT_TEXT;
    const d = Math.max(0, Math.min(11, Number(depth || 0)));
    return (isBranch ? XLSX_STYLE.BRANCH_INDENT_BASE : XLSX_STYLE.LEAF_INDENT_BASE) + d;
  }

  function xlsxCellXml(value, rowIndex, colIndex, style = 0) {
    const ref = `${xlsxColumnName(colIndex)}${rowIndex + 1}`;
    const styleAttr = ` s="${Number(style || 0)}"`;
    if (value === null || value === undefined || value === '') return `<c r="${ref}"${styleAttr}/>`;
    if (typeof value === 'number' && Number.isFinite(value)) {
      return `<c r="${ref}"${styleAttr}><v>${value}</v></c>`;
    }
    const text = String(value);
    const preserve = /^\s|\s$|\n/.test(text) ? ' xml:space="preserve"' : '';
    return `<c r="${ref}" t="inlineStr"${styleAttr}><is><t${preserve}>${xmlEscape(text)}</t></is></c>`;
  }

  function xlsxSheetXml(rows, widths = []) {
    const maxCols = rows.reduce((m, r) => Math.max(m, r.length), 0);
    const cols = widths.length
      ? `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
      : '';

    const sheetData = rows.map((row, r) => {
      const cells = row.map((cell, c) => {
        if (cell && typeof cell === 'object' && Object.prototype.hasOwnProperty.call(cell, 'v')) {
          return xlsxCellXml(cell.v, r, c, Number(cell.s || 0));
        }
        return xlsxCellXml(cell, r, c, r === 0 ? XLSX_STYLE.HEADER : XLSX_STYLE.BODY_TEXT);
      }).join('');

      const levelCell = row?.[0];
      const levelValue = levelCell && typeof levelCell === 'object' ? Number(levelCell.v) : Number(levelCell);
      const outlineLevel = r > 0 && Number.isFinite(levelValue)
        ? Math.max(0, Math.min(7, levelValue - 1))
        : 0;
      const rowHeight = r === 0 ? 26 : 21;
      const outlineAttr = r > 0 && outlineLevel > 0 ? ` outlineLevel="${outlineLevel}"` : '';

      return `<row r="${r + 1}" ht="${rowHeight}" customHeight="1"${outlineAttr}>${cells}</row>`;
    }).join('');

    const endCol = xlsxColumnName(Math.max(0, maxCols - 1));
    const endRow = Math.max(1, rows.length);

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
      `<dimension ref="A1:${endCol}${endRow}"/>` +
      `<sheetViews><sheetView showGridLines="0" workbookViewId="0">` +
        `<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>` +
        `<selection pane="bottomLeft" activeCell="A2" sqref="A2"/>` +
      `</sheetView></sheetViews>` +
      `<sheetFormatPr defaultRowHeight="21" outlineLevelRow="7"/>${cols}` +
      `<sheetData>${sheetData}</sheetData>` +
      `<autoFilter ref="A1:${endCol}${endRow}"/>` +
      `<pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>` +
      `</worksheet>`;
  }

  function buildXlsxStylesXml() {
    const xf = (fontId, fillId, numFmtId, align = '', borderId = 1) => {
      const numFmtAttr = numFmtId ? ` applyNumberFormat="1"` : '';
      const alignXml = align ? `<alignment ${align}/>` : '<alignment vertical="center"/>';
      return `<xf numFmtId="${numFmtId || 0}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"${numFmtAttr}>${alignXml}</xf>`;
    };

    const xfs = [
      xf(0,0,0,'vertical="center"'),
      xf(1,2,0,'horizontal="left" vertical="center"'),
      xf(0,0,164,'horizontal="right" vertical="center"'),
      xf(0,0,0,'horizontal="center" vertical="center"'),
      xf(4,0,0,'vertical="center"'),
      xf(0,0,0,'horizontal="center" vertical="center"'),
      xf(2,3,0,'vertical="center"'),
      xf(2,3,164,'horizontal="right" vertical="center"'),
      xf(2,3,0,'horizontal="center" vertical="center"'),
      xf(4,3,0,'vertical="center"'),
      xf(2,3,0,'horizontal="center" vertical="center"'),
      xf(3,4,0,'vertical="center"'),
      xf(3,4,164,'horizontal="right" vertical="center"'),
      xf(3,4,0,'horizontal="center" vertical="center"'),
      xf(5,4,0,'vertical="center"'),
      xf(3,4,0,'horizontal="center" vertical="center"'),
      xf(2,5,0,'vertical="center"'),
      xf(2,5,164,'horizontal="right" vertical="center"'),
      xf(6,6,164,'horizontal="right" vertical="center"'),
      xf(7,7,164,'horizontal="right" vertical="center"'),
      xf(4,8,164,'horizontal="right" vertical="center"')
    ];

    for (let d = 0; d < 12; d++) {
      xfs.push(xf(0,0,0,`horizontal="left" vertical="center" indent="${d}"`));
    }
    for (let d = 0; d < 12; d++) {
      xfs.push(xf(2,3,0,`horizontal="left" vertical="center" indent="${d}"`));
    }

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
      `<numFmts count="1"><numFmt numFmtId="164" formatCode="#\,##0.00;[Red]-#\,##0.00;-"/></numFmts>` +
      `<fonts count="8">` +
        `<font><sz val="11"/><color rgb="FF1D2D3E"/><name val="Aptos"/></font>` +
        `<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font>` +
        `<font><b/><sz val="11"/><color rgb="FF0B4F8A"/><name val="Aptos"/></font>` +
        `<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font>` +
        `<font><sz val="10"/><color rgb="FF526D82"/><name val="Aptos"/></font>` +
        `<font><sz val="10"/><color rgb="FFDCEEFF"/><name val="Aptos"/></font>` +
        `<font><b/><sz val="11"/><color rgb="FF107E3E"/><name val="Aptos"/></font>` +
        `<font><b/><sz val="11"/><color rgb="FFBB0000"/><name val="Aptos"/></font>` +
      `</fonts>` +
      `<fills count="9">` +
        `<fill><patternFill patternType="none"/></fill>` +
        `<fill><patternFill patternType="gray125"/></fill>` +
        `<fill><patternFill patternType="solid"><fgColor rgb="FF0A6ED1"/><bgColor indexed="64"/></patternFill></fill>` +
        `<fill><patternFill patternType="solid"><fgColor rgb="FFEAF4FF"/><bgColor indexed="64"/></patternFill></fill>` +
        `<fill><patternFill patternType="solid"><fgColor rgb="FF0B5EAE"/><bgColor indexed="64"/></patternFill></fill>` +
        `<fill><patternFill patternType="solid"><fgColor rgb="FFFFF4CE"/><bgColor indexed="64"/></patternFill></fill>` +
        `<fill><patternFill patternType="solid"><fgColor rgb="FFECFDF3"/><bgColor indexed="64"/></patternFill></fill>` +
        `<fill><patternFill patternType="solid"><fgColor rgb="FFFFF1F0"/><bgColor indexed="64"/></patternFill></fill>` +
        `<fill><patternFill patternType="solid"><fgColor rgb="FFF4F6F8"/><bgColor indexed="64"/></patternFill></fill>` +
      `</fills>` +
      `<borders count="2">` +
        `<border><left/><right/><top/><bottom/><diagonal/></border>` +
        `<border><left/><right/><top/><bottom style="thin"><color rgb="FFD9E7F5"/></bottom><diagonal/></border>` +
      `</borders>` +
      `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
      `<cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs>` +
      `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
      `</styleSheet>`;
  }

  function buildXlsxBlob(sheets) {
    const safeSheets = (sheets || []).slice(0, 8).map((sheet, i) => ({
      name: String(sheet.name || `Sheet ${i + 1}`).slice(0, 31).replace(/[\\/*?:\[\]]/g, '_'),
      rows: sheet.rows || [],
      widths: sheet.widths || []
    }));

    const contentOverrides = safeSheets.map((_, i) =>
      `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    ).join('');

    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
      `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
      contentOverrides + `</Types>`;

    const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
      `</Relationships>`;

    const workbookSheets = safeSheets.map((sheet, i) =>
      `<sheet name="${xmlEscape(sheet.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
    ).join('');

    const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
      `<sheets>${workbookSheets}</sheets></workbook>`;

    const workbookRels = safeSheets.map((_, i) =>
      `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
    ).join('') +
      `<Relationship Id="rId${safeSheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`;

    const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${workbookRels}</Relationships>`;

    const entries = [
      { name: '[Content_Types].xml', data: contentTypes },
      { name: '_rels/.rels', data: rootRels },
      { name: 'xl/workbook.xml', data: workbook },
      { name: 'xl/_rels/workbook.xml.rels', data: rels },
      { name: 'xl/styles.xml', data: buildXlsxStylesXml() }
    ];
    safeSheets.forEach((sheet, i) => entries.push({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      data: xlsxSheetXml(sheet.rows, sheet.widths)
    }));

    return new Blob([zipStore(entries)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
  }

  class HierarchyShift extends HTMLElement {
    constructor() {
      super();
      this._root = this.attachShadow({ mode: 'open' });
      this._binding = null;
      this._model = null;
      this._baselineParents = null;
      this._history = [];
      this._lastMove = null;
      this._dragId = null;
      this._dragSourceIds = [];
      this._selectedId = null;
      this._selectedIds = new Set();
      this._selectionAnchorId = null;
      this._selectionNotice = '';
      this._collapsed = {};
      this._viewMode = 'graphical';
      this._graphOrientation = 'horizontal';
      this._zoom = 1;
      this._lastLayoutBounds = { width: 720, height: 390 };
      this._scrollByView = {
        graphical: { top: 0, left: 0 },
        compact: { top: 0, left: 0 }
      };
      this._scenarioManagerOpen = false;
      this._activeScenarioId = null;
      this._scenarioDirty = false;
      this._memoryScenarioStore = [];
      this._scenarioStorageKey = 'com.custom.hierarchy_shift.scenarios.v1';

      // v0.8.4: the current working scenario is intentionally transient.
      // A normal SAC refresh starts from the fresh BW baseline. Saved SHIFT
      // scenarios are restored only when the user explicitly loads them.
      // Legacy bookmark fields remain for backward-compatible story upgrades,
      // but their state is no longer applied automatically.
      this._pendingBookmarkState = '';
      this._hasPendingBookmarkState = false;
      this._lastDispatchedBookmarkState = '';
      this._applyingBookmarkState = false;

      this._hierarchyIndex = null;
      this._baselineIndex = null;

      this._focusRootId = null;
      this._maxVisibleDepth = 0;
      this._showChangedOnly = false;
      this._searchQuery = '';
      this._pendingLocateId = null;

      this._sideTab = 'impact';
      this._moveDialogOpen = false;
      this._moveSourceId = null;
      this._moveSourceIds = [];
      this._scenarioMoves = [];

      this._saveDialogOpen = false;
      this._scenarioNameDraft = '';
      this._scenarioDescriptionDraft = '';
      this._compareScenarioAId = '';
      this._compareScenarioBId = '';
      this._debugMode = false;
      this._dragPreviewTargetId = null;

      this._infoOpen = false;
      this._themeMode = 'light';
      try {
        const storedTheme = localStorage.getItem('com.custom.hierarchy_shift.theme.v1');
        if (storedTheme === 'dark' || storedTheme === 'light') this._themeMode = storedTheme;
      } catch (_) {}

      // User-controlled text scaling. Kept separate from the compact top toolbar
      // so dense SAC story layouts can stay on one line while hierarchy content
      // remains readable.
      this._uiScalePercent = 100;
      this._scalePopoverOpen = false;
      try {
        const storedScaleRaw = localStorage.getItem('com.custom.hierarchy_shift.uiScale.v1');
        if (storedScaleRaw !== null) {
          const storedScale = Number(storedScaleRaw);
          if (Number.isFinite(storedScale)) {
            this._uiScalePercent = Math.max(85, Math.min(120, Math.round(storedScale / 5) * 5));
          }
        }
      } catch (_) {}

      this._compactWindowStart = 0;
      this._compactVirtualRows = 0;

      this._dragAutoScrollRaf = 0;
      this._dragAutoScrollX = 0;
      this._dragAutoScrollY = 0;

      this._pendingAnimation = null;
      this._renderedOnce = false;
    }

    connectedCallback() { this._render(); }
    onCustomWidgetBeforeUpdate() {}

    onCustomWidgetAfterUpdate(changed) {
      // v0.8.4: scenarioBookmarkState is deliberately ignored here.
      // Working state must never be silently restored after a normal refresh.
      this._pendingBookmarkState = '';
      this._hasPendingBookmarkState = false;

      const candidate = changed?.hierarchyData !== undefined
        ? changed.hierarchyData
        : changed?.dataBinding !== undefined
          ? changed.dataBinding
          : (this.hierarchyData || this.dataBinding || null);

      if (candidate) {
        this._binding = normalizeBinding(candidate);
        this._loadBinding();
      } else if (!this._renderedOnce) {
        this._render();
      }
    }

    onCustomWidgetDataChanged(db) {
      this._binding = normalizeBinding(db);
      this._loadBinding();
    }

    onCustomWidgetResize() { this._render(); }

    _loadBinding() {
      const next = buildModel(this._binding);

      if (!next) {
        this._model = null;
        this._baselineParents = null;
        this._history = [];
        this._lastMove = null;
        this._selectedId = null;
        this._selectedIds = new Set();
        this._selectionAnchorId = null;
        this._selectionNotice = '';
        this._collapsed = {};
        this._render();
        return;
      }

      this._model = next;
      this._baselineParents = cloneParents(next.nodes);
      this._hierarchyIndex = buildHierarchyIndex(next.nodes);
      this._baselineIndex = buildHierarchyIndex(next.nodes, this._baselineParents);

      this._history = [];
      this._lastMove = null;
      this._selectedId = null;
      this._selectedIds = new Set();
      this._selectionAnchorId = null;
      this._selectionNotice = '';
      this._dragSourceIds = [];
      this._activeScenarioId = null;
      this._scenarioDirty = false;
      this._scenarioMoves = [];

      this._focusRootId = null;
      this._maxVisibleDepth = 0;
      this._showChangedOnly = false;
      this._searchQuery = '';
      this._pendingLocateId = null;
      this._sideTab = 'impact';
      this._moveDialogOpen = false;
      this._moveSourceId = null;
      this._moveSourceIds = [];
      this._saveDialogOpen = false;
      this._scenarioNameDraft = '';
      this._scenarioDescriptionDraft = '';
      this._compareScenarioAId = '';
      this._compareScenarioBId = '';
      this._dragPreviewTargetId = null;
      this._compactWindowStart = 0;

      this._collapsed = {};

      Object.keys(next.nodes).forEach(id => {
        if (!next.nodes[id].parentId) this._collapsed[id] = false;
      });

      // Always render the freshly loaded SAP BW hierarchy baseline.
      this._pendingBookmarkState = '';
      this._hasPendingBookmarkState = false;
      this._render();
    }

    _snapshot() {
      return cloneParents(this._model.nodes);
    }

    _snapshotScenarioDeltas() {
      const out = {};
      for (const id of Object.keys(this._model?.nodes || {})) {
        out[id] = Number(this._model.nodes[id].scenarioDelta || 0);
      }
      return out;
    }

    _restoreScenarioDeltas(deltaMap) {
      for (const id of Object.keys(this._model?.nodes || {})) {
        this._model.nodes[id].scenarioDelta = Number(deltaMap?.[id] || 0);
      }
    }

    _scenarioValue(id) {
      const node = this._model?.nodes?.[id];
      if (!node) return 0;
      return Number(node.value || 0) + Number(node.scenarioDelta || 0);
    }

    _hasScenarioChanges() {
      if (!this._model || !this._baselineParents) return false;

      for (const id of Object.keys(this._model.nodes)) {
        const baselineParent = this._baselineParents[id] || null;
        const currentParent = this._model.nodes[id].parentId || null;
        const delta = Number(this._model.nodes[id].scenarioDelta || 0);

        if (baselineParent !== currentParent || Math.abs(delta) > 1e-9) {
          return true;
        }
      }

      return false;
    }

    _rebuildHierarchyIndex() {
      this._hierarchyIndex = this._model
        ? buildHierarchyIndex(this._model.nodes)
        : null;
    }

    _rebuildBaselineIndex() {
      this._baselineIndex =
        this._model && this._baselineParents
          ? buildHierarchyIndex(this._model.nodes, this._baselineParents)
          : null;
    }

    _searchNodes(query, { branchesOnly = false, sourceId = null, limit = 30 } = {}) {
      if (!this._model) return [];

      const q = String(query || '').trim().toLowerCase();
      const sourceDesc =
        sourceId && this._model.nodes[sourceId]
          ? descendantSet(this._model.nodes, sourceId, this._hierarchyIndex)
          : new Set();

      const rows = Object.values(this._model.nodes)
        .filter(node => {
          if (branchesOnly && node.isNode !== true && !hasChildren(this._model.nodes, node.id, this._hierarchyIndex)) {
            return false;
          }

          if (sourceId) {
            if (node.id === sourceId) return false;
            if (sourceDesc.has(node.id)) return false;
            if ((this._model.nodes[sourceId]?.parentId || null) === node.id) return false;
          }

          if (!q) return true;

          const hay = `${node.label || ''} ${node.id || ''}`.toLowerCase();
          return hay.includes(q);
        })
        .map(node => {
          const label = String(node.label || node.id);
          const lower = label.toLowerCase();
          const score = !q
            ? 3
            : lower === q
              ? 0
              : lower.startsWith(q)
                ? 1
                : 2;
          return { node, score };
        })
        .sort((a, b) =>
          a.score - b.score ||
          a.node.label.localeCompare(b.node.label)
        )
        .slice(0, limit)
        .map(x => x.node);

      return rows;
    }

    _isSelected(id) {
      return !!id && this._selectedIds instanceof Set && this._selectedIds.has(id);
    }

    _selectedList() {
      if (!(this._selectedIds instanceof Set)) this._selectedIds = new Set();
      return Array.from(this._selectedIds).filter(id => !!this._model?.nodes?.[id]);
    }

    _setSingleSelection(id) {
      this._selectedIds = new Set();
      if (id && this._model?.nodes?.[id]) this._selectedIds.add(id);
      this._selectedId = id && this._model?.nodes?.[id] ? id : null;
      this._selectionAnchorId = this._selectedId;
      this._selectionNotice = '';
    }

    _clearSelection(render = true) {
      this._selectedIds = new Set();
      this._selectedId = null;
      this._selectionAnchorId = null;
      this._selectionNotice = '';
      if (render) this._render();
    }

    _selectionConflict(id, selectedIds = this._selectedList()) {
      if (!this._model?.nodes?.[id]) return 'Node is not available in the loaded hierarchy.';
      const node = this._model.nodes[id];
      if (!node.parentId) return 'The hierarchy root cannot be part of a multi-selection move.';

      for (const otherId of selectedIds) {
        if (!otherId || otherId === id || !this._model.nodes[otherId]) continue;
        const otherDesc = descendantSet(this._model.nodes, otherId, this._hierarchyIndex);
        if (otherDesc.has(id)) {
          return `Cannot select ${node.label} together with its ancestor ${this._model.nodes[otherId].label}.`;
        }
        const thisDesc = descendantSet(this._model.nodes, id, this._hierarchyIndex);
        if (thisDesc.has(otherId)) {
          return `Cannot select ${node.label} together with its descendant ${this._model.nodes[otherId].label}.`;
        }
      }
      return '';
    }

    _toggleMultiSelection(id) {
      if (!this._model?.nodes?.[id]) return;
      if (!(this._selectedIds instanceof Set)) this._selectedIds = new Set();

      if (this._selectedIds.has(id)) {
        this._selectedIds.delete(id);
        if (this._selectedId === id) this._selectedId = this._selectedList().at(-1) || null;
        this._selectionAnchorId = this._selectedId;
        this._selectionNotice = '';
        return;
      }

      const conflict = this._selectionConflict(id);
      if (conflict) {
        this._selectionNotice = conflict;
        return;
      }

      this._selectedIds.add(id);
      this._selectedId = id;
      this._selectionAnchorId = id;
      this._selectionNotice = '';
    }

    _selectSiblingRange(anchorId, endId) {
      if (!this._model?.nodes?.[anchorId] || !this._model?.nodes?.[endId]) return;
      const anchorParent = this._model.nodes[anchorId].parentId || null;
      const endParent = this._model.nodes[endId].parentId || null;

      if (!anchorParent || anchorParent !== endParent) {
        this._selectionNotice = 'Shift selection works across sibling nodes under the same parent.';
        return;
      }

      const siblings = childrenOf(this._model.nodes, anchorParent, this._hierarchyIndex);
      const a = siblings.findIndex(n => n.id === anchorId);
      const b = siblings.findIndex(n => n.id === endId);
      if (a < 0 || b < 0) return;

      const [from, to] = a <= b ? [a, b] : [b, a];
      const next = new Set(this._selectedList());
      for (const node of siblings.slice(from, to + 1)) {
        const conflict = this._selectionConflict(node.id, Array.from(next));
        if (!conflict) next.add(node.id);
      }

      this._selectedIds = next;
      this._selectedId = endId;
      this._selectionAnchorId = anchorId;
      this._selectionNotice = '';
    }

    _handleSelectionClick(id, event = null) {
      const additive = !!(event?.ctrlKey || event?.metaKey);
      const range = !!event?.shiftKey;

      if (range && this._viewMode === 'compact' && this._selectionAnchorId) {
        this._selectSiblingRange(this._selectionAnchorId, id);
      } else if (additive) {
        this._toggleMultiSelection(id);
      } else {
        this._setSingleSelection(id);
      }
    }

    _selectionValue(ids = this._selectedList()) {
      return (ids || []).reduce((sum, id) => sum + Number(this._scenarioValue(id) || 0), 0);
    }

    _activeMoveSourceIds(explicitId = null) {
      const selected = this._selectedList();
      if (explicitId && this._isSelected(explicitId) && selected.length > 1) return selected;
      if (!explicitId && selected.length) return selected;
      if (explicitId && this._model?.nodes?.[explicitId]) return [explicitId];
      return [];
    }

    _multiMoveValidation(sourceIds, targetId) {
      const ids = Array.from(new Set(sourceIds || [])).filter(id => !!this._model?.nodes?.[id]);
      const result = { ok:false, reasons:[], warnings:[], sourceIds:ids };
      if (!ids.length) {
        result.reasons.push('Select at least one movable hierarchy node.');
        return result;
      }

      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const conflict = this._selectionConflict(id, ids.filter(x => x !== id));
        if (conflict) {
          result.reasons.push(conflict);
          return result;
        }
        const validation = this._moveValidation(id, targetId);
        if (!validation.ok) {
          result.reasons.push(`${this._model.nodes[id].label}: ${validation.reasons[0] || 'invalid move'}`);
          return result;
        }
        for (const warning of validation.warnings || []) {
          if (!result.warnings.includes(warning)) result.warnings.push(warning);
        }
      }

      result.ok = true;
      return result;
    }

    _focusContains(id) {
      if (!this._focusRootId || !this._model?.nodes?.[this._focusRootId]) return true;
      if (id === this._focusRootId) return true;
      return descendantSet(
        this._model.nodes,
        this._focusRootId,
        this._hierarchyIndex
      ).has(id);
    }

    _revealNode(id) {
      if (!this._model?.nodes?.[id]) return;

      if (!this._focusContains(id)) this._focusRootId = null;

      let current = this._model.nodes[id]?.parentId || null;
      const seen = new Set();

      while (current && this._model.nodes[current] && !seen.has(current)) {
        seen.add(current);
        this._collapsed[current] = false;
        current = this._model.nodes[current].parentId || null;
      }

      this._maxVisibleDepth = 0;
      this._setSingleSelection(id);
      this._pendingLocateId = id;

      if (this._viewMode === 'compact') {
        const rows = compactRows(
          this._model.nodes,
          this._collapsed,
          this._hierarchyIndex,
          this._visibilityOptions(false)
        );
        const idx = rows.findIndex(r => r.node.id === id);
        if (idx >= 0) {
          this._compactWindowStart = Math.max(0, idx - 30);
          this._scrollByView.compact = {
            top: Math.max(0, idx * COMPACT_ROW_H - 170),
            left: 0
          };
        }
      }

      this._render();
    }

    _focusNode(id) {
      if (!this._model?.nodes?.[id]) return;
      this._focusRootId = id;
      this._collapsed[id] = false;
      this._setSingleSelection(id);
      this._maxVisibleDepth = 0;
      this._scrollByView.graphical = { top: 0, left: 0 };
      this._scrollByView.compact = { top: 0, left: 0 };
      this._compactWindowStart = 0;
      this._render();
    }

    _clearFocus() {
      this._focusRootId = null;
      this._scrollByView.graphical = { top: 0, left: 0 };
      this._scrollByView.compact = { top: 0, left: 0 };
      this._compactWindowStart = 0;
      this._render();
    }

    _focusBreadcrumb() {
      if (!this._focusRootId || !this._model?.nodes?.[this._focusRootId]) return [];

      const ids = [];
      const seen = new Set();
      let id = this._focusRootId;

      while (id && this._model.nodes[id] && !seen.has(id)) {
        seen.add(id);
        ids.unshift(id);
        id = this._model.nodes[id].parentId || null;
      }

      return ids.map(nodeId => this._model.nodes[nodeId]);
    }

    _changedContextSet() {
      if (!this._model || !this._baselineParents || !this._hasScenarioChanges()) {
        return null;
      }

      const allowed = new Set();

      for (const id of Object.keys(this._model.nodes)) {
        const node = this._model.nodes[id];
        const baselineParent = this._baselineParents[id] || null;
        const currentParent = node.parentId || null;
        const delta = Number(node.scenarioDelta || 0);

        if (baselineParent !== currentParent) {
          allowed.add(id);
          for (const desc of descendantSet(this._model.nodes, id, this._hierarchyIndex)) {
            allowed.add(desc);
          }
        }

        if (Math.abs(delta) > 1e-9) allowed.add(id);
      }

      for (const id of Array.from(allowed)) {
        let parentId = this._model.nodes[id]?.parentId || null;
        const seen = new Set();

        while (parentId && this._model.nodes[parentId] && !seen.has(parentId)) {
          seen.add(parentId);
          allowed.add(parentId);
          parentId = this._model.nodes[parentId].parentId || null;
        }
      }

      if (this._focusRootId) allowed.add(this._focusRootId);
      return allowed;
    }

    _visibilityOptions(includeChangedFilter = true) {
      return {
        focusRootId: this._focusRootId,
        maxVisibleDepth: this._maxVisibleDepth,
        allowedSet:
          includeChangedFilter && this._showChangedOnly
            ? this._changedContextSet()
            : null
      };
    }

    _maxLevelOption() {
      if (!this._model) return 0;

      if (!this._focusRootId) {
        return Number(this._hierarchyIndex?.maxDepth || 0);
      }

      let max = 0;
      const stack = [{ id: this._focusRootId, depth: 0 }];
      const seen = new Set();

      while (stack.length) {
        const item = stack.pop();
        if (!item || seen.has(item.id)) continue;
        seen.add(item.id);
        max = Math.max(max, item.depth);

        for (const child of childrenOf(
          this._model.nodes,
          item.id,
          this._hierarchyIndex
        )) {
          stack.push({ id: child.id, depth: item.depth + 1 });
        }
      }

      return max;
    }

    _openMoveDialog(sourceId = null) {
      const sourceIds = this._activeMoveSourceIds(sourceId);
      if (!sourceIds.length) return;
      if (!sourceIds.every(id => !!this._model?.nodes?.[id]?.parentId)) return;

      this._moveSourceIds = sourceIds;
      this._moveSourceId = sourceIds[0] || null;
      this._moveDialogOpen = true;
      this._render();
    }

    _closeMoveDialog() {
      this._moveDialogOpen = false;
      this._moveSourceId = null;
      this._moveSourceIds = [];
      this._render();
    }

    _resetBranch(rootId) {
      if (!this._model?.nodes?.[rootId] || !this._baselineParents) return;

      const affected = new Set([rootId]);

      for (const id of descendantSet(
        this._model.nodes,
        rootId,
        this._hierarchyIndex
      )) affected.add(id);

      for (const id of descendantSet(
        this._model.nodes,
        rootId,
        this._baselineIndex
      )) affected.add(id);

      const remainingMoves = (this._scenarioMoves || [])
        .filter(move => {
          const ids = Array.isArray(move.sourceIds) ? move.sourceIds : [move.sourceId];
          return !ids.some(id => affected.has(id));
        });

      const beforeVisual = this._captureVisualState();
      this._replayScenarioMoves(remainingMoves);

      this._setSingleSelection(rootId);
      this._activeScenarioId = null;
      this._scenarioDirty = false;
      this._pendingAnimation = {
        from: beforeVisual,
        triggerId: rootId,
        expanding: true
      };
      this._syncNativeBookmarkState();
      this._render();
    }

    _replayScenarioMoves(moves) {
      if (!this._model || !this._baselineParents) return;

      this._restoreParents(this._baselineParents);
      this._restoreScenarioDeltas({});
      this._rebuildHierarchyIndex();

      this._scenarioMoves = [];
      this._history = [];
      this._lastMove = null;

      for (const move of moves || []) {
        if (!move?.targetId) continue;

        const ids = Array.isArray(move.sourceIds)
          ? move.sourceIds.filter(id => !!this._model.nodes[id])
          : move.sourceId && this._model.nodes[move.sourceId]
            ? [move.sourceId]
            : [];

        if (!ids.length) continue;

        if (ids.length > 1) {
          const preview = this._multiMovePreviewInfo(ids, move.targetId);
          if (!preview.validation?.ok) continue;
          const individual = [];
          for (const id of ids) {
            const info = this._applyMoveCore(id, move.targetId);
            if (info) individual.push(info);
          }
          if (!individual.length) continue;

          const entry = {
            sourceIds: ids,
            targetId: move.targetId,
            sourceLabels: individual.map(x => x.sourceLabel),
            targetLabel: this._model.nodes[move.targetId]?.label || move.targetLabel || move.targetId,
            shiftedValue: preview.shiftedValue,
            affectedNodes: preview.affectedNodes,
            originLabels: preview.originImpacts.map(x => x.label),
            movedAt: move.movedAt || null
          };
          this._scenarioMoves.push(entry);
          this._lastMove = {
            isMulti:true,
            sourceIds:ids,
            sourceCount:ids.length,
            sourceLabels:entry.sourceLabels,
            newParentId:move.targetId,
            newParentLabel:entry.targetLabel,
            shiftedValue:preview.shiftedValue,
            affectedNodes:preview.affectedNodes,
            impacts:preview.impacts,
            originImpacts:preview.originImpacts,
            targetImpact:preview.targetImpact
          };
        } else {
          const info = this._applyMoveCore(ids[0], move.targetId);
          if (!info) continue;
          this._scenarioMoves.push({
            sourceId: ids[0], targetId: move.targetId,
            fromParentId: info.oldParentId || move.fromParentId || null,
            sourceLabel: info.sourceLabel || move.sourceLabel || ids[0],
            fromParentLabel: info.oldParentLabel || move.fromParentLabel || 'Root',
            targetLabel: info.newParentLabel || move.targetLabel || move.targetId,
            shiftedValue: info.shiftedValue,
            movedAt: move.movedAt || null
          });
          this._lastMove = info;
        }
      }
    }

    _toggleTheme() {
      this._themeMode = this._themeMode === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('com.custom.hierarchy_shift.theme.v1', this._themeMode);
      } catch (_) {}
      this._render();
    }

    _uiScaleVars(percent = this._uiScalePercent) {
      const scale = Math.max(0.85, Math.min(1.20, Number(percent || 100) / 100));
      const px = value => `${Math.round(value * scale * 10) / 10}px`;

      return {
        '--shift-fs-eyebrow': px(11),
        '--shift-fs-title': px(27),
        '--shift-fs-subtitle': px(13),
        '--shift-fs-pill': px(11.5),
        '--shift-fs-nav': px(12.5),
        '--shift-fs-nav-small': px(11),
        '--shift-fs-context': px(13),
        '--shift-fs-context-small': px(10.5),
        '--shift-fs-table-head': px(11.5),
        '--shift-fs-compact': px(14),
        '--shift-fs-compact-delta': px(10),
        '--shift-fs-node': px(13.5),
        '--shift-fs-node-value': px(15),
        '--shift-fs-node-small': px(9.5),
        '--shift-fs-side-title': px(13),
        '--shift-fs-side': px(12.5),
        '--shift-fs-side-small': px(11),
        '--shift-fs-side-kpi': px(27),
        '--shift-fs-dialog-title': px(21),
        '--shift-fs-dialog': px(12.5),
        '--shift-fs-dialog-small': px(10.5)
      };
    }

    _uiScaleStyle(percent = this._uiScalePercent) {
      return Object.entries(this._uiScaleVars(percent))
        .map(([key, value]) => `${key}:${value}`)
        .join(';');
    }

    _applyUiScale(percent, persist = true) {
      const next = Math.max(85, Math.min(120, Math.round(Number(percent || 100) / 5) * 5));
      this._uiScalePercent = next;

      if (persist) {
        try {
          localStorage.setItem('com.custom.hierarchy_shift.uiScale.v1', String(next));
        } catch (_) {}
      }

      const shell = this._root.querySelector('.shell');
      if (shell) {
        const vars = this._uiScaleVars(next);
        Object.entries(vars).forEach(([key, value]) => shell.style.setProperty(key, value));
      }

      this._root.querySelectorAll('[data-scale-label]').forEach(label => {
        label.textContent = `${next}%`;
      });

      this._root.querySelectorAll('[data-scale-preset]').forEach(btn => {
        btn.classList.toggle('active', Number(btn.dataset.scalePreset) === next);
      });
    }

    _toggleScalePopover() {
      this._scalePopoverOpen = !this._scalePopoverOpen;
      this._render();
    }

    _openInfo() {
      this._infoOpen = true;
      this._render();
    }

    _closeInfo() {
      this._infoOpen = false;
      this._render();
    }

    _nodePath(id, includeSelf = true, parentMap = null) {
      if (!this._model?.nodes?.[id]) return '';
      const labels = [];
      const seen = new Set();
      let current = includeSelf ? id : (parentMap?.[id] ?? this._model.nodes[id].parentId ?? null);
      while (current && this._model.nodes[current] && !seen.has(current)) {
        seen.add(current);
        labels.unshift(this._model.nodes[current].label || current);
        current = parentMap ? (parentMap[current] || null) : (this._model.nodes[current].parentId || null);
      }
      return labels.join(' > ');
    }

    _activeScenarioName() {
      if (!this._activeScenarioId) return '';
      const item = this._readScenarioStore().find(s => s.id === this._activeScenarioId);
      return item?.name || this._activeScenarioId;
    }

    _moveValidation(sourceId, targetId) {
      const result = { ok:false, reasons:[], warnings:[], sourceDepth:null, targetDepth:null, resultingDepth:null };
      if (!this._model || !sourceId || !targetId) {
        result.reasons.push('Missing source or target.');
        return result;
      }
      const source = this._model.nodes[sourceId];
      const target = this._model.nodes[targetId];
      if (!source || !target) {
        result.reasons.push('Source or target is not available in the loaded hierarchy.');
        return result;
      }
      if (sourceId === targetId) {
        result.reasons.push('A node cannot be moved below itself.');
        return result;
      }
      if (!source.parentId) {
        result.reasons.push('The root node cannot be moved.');
        return result;
      }
      if (target.isNode !== true && !hasChildren(this._model.nodes, targetId, this._hierarchyIndex)) {
        result.reasons.push('The target must be a hierarchy node.');
        return result;
      }
      const descendants = descendantSet(this._model.nodes, sourceId, this._hierarchyIndex);
      if (descendants.has(targetId)) {
        result.reasons.push('A node cannot be moved below one of its descendants.');
        return result;
      }
      if (source.parentId === targetId) {
        result.reasons.push('The selected target is already the current parent.');
        return result;
      }

      result.sourceDepth = Number(this._hierarchyIndex?.depth?.get(sourceId) ?? 0);
      result.targetDepth = Number(this._hierarchyIndex?.depth?.get(targetId) ?? 0);
      result.resultingDepth = result.targetDepth + 1;
      if (result.sourceDepth !== result.resultingDepth) {
        result.warnings.push(`Hierarchy level changes from ${result.sourceDepth + 1} to ${result.resultingDepth + 1}.`);
      }
      const descendantsCount = descendants.size;
      if (descendantsCount > 0) {
        result.warnings.push(`${descendantsCount.toLocaleString()} descendant${descendantsCount === 1 ? '' : 's'} move with this branch.`);
      }
      result.ok = true;
      return result;
    }

    _multiMovePreviewInfo(sourceIds, targetId) {
      const ids = Array.from(new Set(sourceIds || [])).filter(id => !!this._model?.nodes?.[id]);
      const validation = this._multiMoveValidation(ids, targetId);
      if (!validation.ok) return { validation, sourceIds:ids };

      const impactsMap = new Map();
      const sources = [];
      let shiftedValue = 0;
      let affectedNodes = 0;

      const addImpact = (id, delta) => {
        if (!id || !this._model.nodes[id]) return;
        impactsMap.set(id, Number(impactsMap.get(id) || 0) + Number(delta || 0));
      };

      for (const sourceId of ids) {
        const source = this._model.nodes[sourceId];
        const value = this._scenarioValue(sourceId);
        const oldParentId = source.parentId || null;
        shiftedValue += value;
        affectedNodes += subtreeCount(this._model.nodes, sourceId, this._hierarchyIndex);

        for (const id of this._ancestorChain(oldParentId)) addImpact(id, -value);
        for (const id of this._ancestorChain(targetId)) addImpact(id, value);

        sources.push({
          id:sourceId,
          label:source.label,
          value,
          oldParentId,
          oldParentLabel:oldParentId && this._model.nodes[oldParentId]
            ? this._model.nodes[oldParentId].label
            : (oldParentId || 'Root')
        });
      }

      const impacts = Array.from(impactsMap.entries())
        .map(([id, delta]) => ({
          id,
          label:this._model.nodes[id]?.label || id,
          delta,
          before:this._scenarioValue(id),
          after:this._scenarioValue(id) + delta
        }))
        .filter(item => Math.abs(item.delta) > 1e-9)
        .sort((a,b) => Math.abs(b.delta) - Math.abs(a.delta));

      const originIds = new Set(sources.map(s => s.oldParentId).filter(Boolean));
      const originImpacts = impacts.filter(item => originIds.has(item.id));
      const targetImpact = impacts.find(item => item.id === targetId) || {
        id:targetId,
        label:this._model.nodes[targetId]?.label || targetId,
        delta:0,
        before:this._scenarioValue(targetId),
        after:this._scenarioValue(targetId)
      };

      return {
        validation,
        sourceIds:ids,
        sources,
        sourceCount:ids.length,
        shiftedValue,
        affectedNodes,
        targetId,
        targetLabel:this._model.nodes[targetId]?.label || targetId,
        impacts,
        originImpacts,
        targetImpact
      };
    }

    _movePreviewInfo(sourceId, targetId) {
      return this._multiMovePreviewInfo(sourceId ? [sourceId] : [], targetId);
    }

    _movePreviewHtml(sourceIds, targetId, compact = false) {
      const ids = Array.isArray(sourceIds) ? sourceIds : (sourceIds ? [sourceIds] : []);
      const info = this._multiMovePreviewInfo(ids, targetId);
      if (!info.validation?.ok) {
        return `<div class="preview-invalid">${esc(info.validation?.reasons?.[0] || 'Invalid move.')}</div>`;
      }

      const warnings = info.validation.warnings || [];
      const title = info.sourceCount === 1
        ? `${info.sources[0].label} → ${info.targetLabel}`
        : `${info.sourceCount} selected nodes → ${info.targetLabel}`;

      const importantImpacts = [];
      for (const impact of [...info.originImpacts, info.targetImpact, ...info.impacts]) {
        if (!impact || importantImpacts.some(x => x.id === impact.id)) continue;
        importantImpacts.push(impact);
        if (importantImpacts.length >= 4) break;
      }

      return `
        <div class="move-preview-card ${compact ? 'compact-preview' : ''}">
          <div class="move-preview-eyebrow">${info.sourceCount > 1 ? 'Multi move preview' : 'Move preview'}</div>
          <div class="move-preview-title">${esc(title)}</div>
          <div class="preview-kpi"><span>Combined shifted KPI</span><strong>${esc(formatNumber(info.shiftedValue, this._model.unit))}</strong></div>
          ${info.sourceCount > 1 ? `<div class="preview-source-list">${info.sources.slice(0,6).map(s => `<span>${esc(s.label)} <b>${esc(formatNumber(s.value,this._model.unit))}</b></span>`).join('')}${info.sources.length>6?`<span>+${info.sources.length-6} more</span>`:''}</div>` : ''}
          <div class="preview-grid multi-preview-grid">
            ${importantImpacts.map(impact => `
              <div>
                <span>${esc(impact.label)}</span>
                <small>${esc(formatNumber(impact.before,this._model.unit))} → ${esc(formatNumber(impact.after,this._model.unit))}</small>
                <b class="${impact.delta >= 0 ? 'up' : 'down'}">${impact.delta >= 0 ? '+' : '−'}${esc(formatNumber(Math.abs(impact.delta),this._model.unit))}</b>
              </div>`).join('')}
          </div>
          ${warnings.length ? `<div class="preview-warnings">${warnings.slice(0,5).map(w => `<span>${esc(w)}</span>`).join('')}</div>` : `<div class="preview-ok">Structure validation passed for all selected nodes.</div>`}
        </div>`;
    }

    _paintMovePreview(sourceIds, targetId) {
      const ids = Array.isArray(sourceIds) ? sourceIds : (sourceIds ? [sourceIds] : []);
      this._dragPreviewTargetId = targetId || null;
      const host = this._root.querySelector('.move-preview-live');
      if (host) {
        host.innerHTML = ids.length && targetId ? this._movePreviewHtml(ids, targetId) : '';
        host.classList.toggle('open', !!(ids.length && targetId));
      }
      const dialogHost = this._root.querySelector('.move-dialog-preview');
      if (dialogHost) {
        dialogHost.innerHTML = ids.length && targetId
          ? this._movePreviewHtml(ids, targetId, true)
          : '<div class="preview-placeholder">Hover a valid target to preview the KPI impact before moving.</div>';
      }
    }

    _scenarioComparison(aId, bId) {
      if (!this._model || !aId || !bId || aId === bId) return null;
      const store = this._readScenarioStore();
      const a = store.find(s => s.id === aId);
      const b = store.find(s => s.id === bId);
      if (!a || !b) return null;
      const sameContext = a.contextSignature && b.contextSignature &&
        a.contextSignature === b.contextSignature &&
        a.contextSignature === this._scenarioContextSignature();
      const structural = [];
      const impacts = [];
      for (const id of Object.keys(this._model.nodes)) {
        const aParent = a.parents?.[id] || null;
        const bParent = b.parents?.[id] || null;
        const aDelta = Number(a.deltas?.[id] || 0);
        const bDelta = Number(b.deltas?.[id] || 0);
        if (aParent !== bParent) {
          structural.push({
            id,
            label:this._model.nodes[id].label,
            aParentLabel:aParent && this._model.nodes[aParent] ? this._model.nodes[aParent].label : (aParent || 'Root'),
            bParentLabel:bParent && this._model.nodes[bParent] ? this._model.nodes[bParent].label : (bParent || 'Root')
          });
        }
        const difference = bDelta - aDelta;
        if (Math.abs(difference) > 1e-9) impacts.push({ id, label:this._model.nodes[id].label, difference });
      }
      impacts.sort((x,y) => Math.abs(y.difference)-Math.abs(x.difference));
      return { a,b,sameContext,structural,impacts };
    }

    _openSaveScenarioDialog() {
      const current = this._activeScenarioId
        ? this._readScenarioStore().find(s => s.id === this._activeScenarioId)
        : null;
      this._scenarioNameDraft = current?.name ? `${current.name} copy` : `Scenario ${this._readScenarioStore().length + 1}`;
      this._scenarioDescriptionDraft = current?.description || '';
      this._saveDialogOpen = true;
      this._render();
    }

    _closeSaveScenarioDialog() {
      this._saveDialogOpen = false;
      this._render();
    }

    _exportCurrentViewXlsx() {
      if (!this._model) return;

      const rows = compactRows(
        this._model.nodes,
        this._collapsed,
        this._hierarchyIndex,
        this._visibilityOptions(true)
      );

      const currentView = [[
        { v: 'Level', s: XLSX_STYLE.HEADER },
        { v: 'Hierarchy Node', s: XLSX_STYLE.HEADER },
        { v: 'Member ID', s: XLSX_STYLE.HEADER },
        { v: 'Parent', s: XLSX_STYLE.HEADER },
        { v: this._model.measureLabel, s: XLSX_STYLE.HEADER },
        { v: 'Unit', s: XLSX_STYLE.HEADER }
      ]];

      const scenarioAnalysis = [[
        { v: 'Level', s: XLSX_STYLE.HEADER },
        { v: 'Hierarchy Node', s: XLSX_STYLE.HEADER },
        { v: 'Member ID', s: XLSX_STYLE.HEADER },
        { v: 'Baseline Parent', s: XLSX_STYLE.HEADER },
        { v: 'Scenario Parent', s: XLSX_STYLE.HEADER },
        { v: `Baseline ${this._model.measureLabel}`, s: XLSX_STYLE.HEADER },
        { v: `Scenario ${this._model.measureLabel}`, s: XLSX_STYLE.HEADER },
        { v: 'Delta', s: XLSX_STYLE.HEADER },
        { v: 'Unit', s: XLSX_STYLE.HEADER }
      ]];

      for (const { node, depth } of rows) {
        const isRoot = depth === 0;
        const isBranch = node.isNode === true || hasChildren(
          this._model.nodes,
          node.id,
          this._hierarchyIndex
        );

        const currentParentId = node.parentId || null;
        const currentParent = currentParentId && this._model.nodes[currentParentId]
          ? this._model.nodes[currentParentId].label
          : (currentParentId || 'Root');

        const baselineParentId = this._baselineParents?.[node.id] || null;
        const baselineParent = baselineParentId && this._model.nodes[baselineParentId]
          ? this._model.nodes[baselineParentId].label
          : (baselineParentId || 'Root');

        const baselineValue = Number(node.value || 0);
        const scenarioValue = this._scenarioValue(node.id);
        const delta = scenarioValue - baselineValue;
        const parentChanged = baselineParentId !== currentParentId;

        const levelStyle = isRoot
          ? XLSX_STYLE.ROOT_LEVEL
          : isBranch
            ? XLSX_STYLE.BRANCH_LEVEL
            : XLSX_STYLE.BODY_LEVEL;
        const textStyle = isRoot
          ? XLSX_STYLE.ROOT_TEXT
          : isBranch
            ? XLSX_STYLE.BRANCH_TEXT
            : XLSX_STYLE.BODY_TEXT;
        const memberStyle = isRoot
          ? XLSX_STYLE.ROOT_MEMBER
          : isBranch
            ? XLSX_STYLE.BRANCH_MEMBER
            : XLSX_STYLE.BODY_MEMBER;
        const numberStyle = isRoot
          ? XLSX_STYLE.ROOT_NUMBER
          : isBranch
            ? XLSX_STYLE.BRANCH_NUMBER
            : XLSX_STYLE.BODY_NUMBER;
        const unitStyle = isRoot
          ? XLSX_STYLE.ROOT_UNIT
          : isBranch
            ? XLSX_STYLE.BRANCH_UNIT
            : XLSX_STYLE.BODY_UNIT;
        const hierarchyStyle = xlsxHierarchyStyle(depth, isRoot, isBranch);
        const scenarioParentStyle = parentChanged ? XLSX_STYLE.CHANGED_TEXT : textStyle;
        const deltaStyle = delta > 1e-9
          ? XLSX_STYLE.DELTA_POS
          : delta < -1e-9
            ? XLSX_STYLE.DELTA_NEG
            : XLSX_STYLE.DELTA_ZERO;

        currentView.push([
          { v: depth + 1, s: levelStyle },
          { v: node.label, s: hierarchyStyle },
          { v: node.id, s: memberStyle },
          { v: currentParent, s: textStyle },
          { v: scenarioValue, s: numberStyle },
          { v: this._model.unit || '', s: unitStyle }
        ]);

        scenarioAnalysis.push([
          { v: depth + 1, s: levelStyle },
          { v: node.label, s: hierarchyStyle },
          { v: node.id, s: memberStyle },
          { v: baselineParent, s: textStyle },
          { v: currentParent, s: scenarioParentStyle },
          { v: baselineValue, s: numberStyle },
          { v: scenarioValue, s: parentChanged ? XLSX_STYLE.CHANGED_NUMBER : numberStyle },
          { v: delta, s: deltaStyle },
          { v: this._model.unit || '', s: unitStyle }
        ]);
      }

      const blob = buildXlsxBlob([
        {
          name: 'Current View',
          rows: currentView,
          widths: [9, 34, 31, 27, 19, 10]
        },
        {
          name: 'Scenario Analysis',
          rows: scenarioAnalysis,
          widths: [9, 34, 31, 27, 27, 20, 20, 18, 10]
        }
      ]);

      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const filename =
        `Hierarchy_SHIFT_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_` +
        `${pad(now.getHours())}${pad(now.getMinutes())}.xlsx`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }

    _copyTechnicalInfo() {
      if (!this._model || !this._selectedId || this._selectedList().length !== 1) return;
      const id = this._selectedId;
      const node = this._model.nodes[id];
      const baselineParentId = this._baselineParents?.[id] || null;
      const currentChildren = childrenOf(this._model.nodes, id, this._hierarchyIndex);
      const lines = [
        `Label: ${node.label}`,
        `Member ID: ${id}`,
        `Baseline parent: ${baselineParentId || 'Root'}`,
        `Current parent: ${node.parentId || 'Root'}`,
        `Baseline level: ${Number(this._baselineIndex?.depth?.get(id) ?? 0) + 1}`,
        `Current level: ${Number(this._hierarchyIndex?.depth?.get(id) ?? 0) + 1}`,
        `Node type: ${node.isNode ? 'Branch' : 'Leaf'}`,
        `Loaded children: ${currentChildren.length}`,
        `Value source: ${node.valueSource || 'unknown'}`,
        `Direct KPI: ${node.hasDirectValue ? node.directValue : 'none'}`,
        `Baseline KPI: ${node.value}`,
        `Scenario delta: ${Number(node.scenarioDelta || 0)}`,
        `Scenario KPI: ${this._scenarioValue(id)}`,
        `Unit: ${this._model.unit || ''}`
      ];
      const text = lines.join('\n');
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).catch(() => {});
      } else {
        const area=document.createElement('textarea');
        area.value=text; area.style.position='fixed'; area.style.opacity='0'; document.body.appendChild(area); area.select();
        try { document.execCommand('copy'); } catch (_) {}
        area.remove();
      }
    }

    _selectCompactNeighbor(delta) {
      if (!this._model || this._viewMode !== 'compact') return;
      const rows = compactRows(this._model.nodes, this._collapsed, this._hierarchyIndex, this._visibilityOptions(true));
      if (!rows.length) return;
      let index = rows.findIndex(r => r.node.id === this._selectedId);
      if (index < 0) index = delta > 0 ? -1 : rows.length;
      const nextIndex = Math.max(0, Math.min(rows.length - 1, index + delta));
      const next = rows[nextIndex]?.node;
      if (!next) return;
      this._setSingleSelection(next.id);
      this._pendingLocateId = next.id;
      this._compactWindowStart = Math.max(0, nextIndex - 35);
      this._scrollByView.compact = { top:Math.max(0,nextIndex*COMPACT_ROW_H-160), left:this._scrollByView.compact?.left||0 };
      this._render();
    }

    _ancestorChain(startId) {
      const out = [];
      const seen = new Set();
      let id = startId;

      while (id && this._model?.nodes?.[id] && !seen.has(id)) {
        seen.add(id);
        out.push(id);
        id = this._model.nodes[id].parentId || null;
      }

      return out;
    }

    _restoreParents(parentMap) {
      if (!this._model || !parentMap) return;

      for (const id of Object.keys(this._model.nodes)) {
        this._model.nodes[id].parentId = parentMap[id] || null;
      }
    }

    _nativeBookmarkPayload() {
      if (!this._model) return null;

      return {
        schemaVersion: 1,
        contextSignature: this._scenarioContextSignature(),
        parents: this._snapshot(),
        deltas: this._snapshotScenarioDeltas(),
        collapsed: { ...this._collapsed },
        viewMode: this._viewMode,
        graphOrientation: this._graphOrientation,
        zoom: this._zoom,
        focusRootId: this._focusRootId || null,
        maxVisibleDepth: this._maxVisibleDepth,
        showChangedOnly: this._showChangedOnly,
        scenarioMoves: Array.from(this._scenarioMoves || []),
        activeScenarioId: this._activeScenarioId || null
      };
    }

    _syncNativeBookmarkState() {
      // v0.8.4: intentionally disabled.
      // Working state is transient. Use Save Scenario / Load Scenario instead.
      return;
    }

    _applyNativeBookmarkState(serialized, bindingJustLoaded = false) {
      // v0.8.4: legacy bookmark payloads are no longer applied automatically.
      return false;
    }

    _readScenarioStore() {
      try {
        const raw = localStorage.getItem(this._scenarioStorageKey);
        if (!raw) return Array.from(this._memoryScenarioStore || []);
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch (_) {
        return Array.from(this._memoryScenarioStore || []);
      }
    }

    _writeScenarioStore(items) {
      const safeItems = Array.isArray(items) ? items : [];
      this._memoryScenarioStore = safeItems;

      try {
        localStorage.setItem(this._scenarioStorageKey, JSON.stringify(safeItems));
      } catch (_) {
        /* Browser storage can be restricted. In that case the current widget
           session still keeps the scenarios in memory. */
      }
    }

    _scenarioContextSignature() {
      if (!this._model) return '';

      const parts = [
        this._model.hierarchyLabel || '',
        this._model.measureLabel || '',
        this._model.unit || ''
      ];

      Object.keys(this._model.nodes)
        .sort()
        .forEach(id => {
          const node = this._model.nodes[id];
          parts.push(`${id}:${Number(node.value || 0)}`);
        });

      let hash = 2166136261;
      const text = parts.join('|');

      for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }

      return (hash >>> 0).toString(16).padStart(8, '0');
    }

    _currentChanges() {
      const changes = [];
      if (!this._model || !this._baselineParents) return changes;

      for (const id of Object.keys(this._model.nodes)) {
        const original = this._baselineParents[id] || null;
        const current = this._model.nodes[id].parentId || null;

        if (original !== current) {
          changes.push({
            nodeId: id,
            nodeLabel: this._model.nodes[id].label,
            fromParentId: original,
            fromParentLabel: original && this._model.nodes[original]
              ? this._model.nodes[original].label
              : (original || 'Root'),
            toParentId: current,
            toParentLabel: current && this._model.nodes[current]
              ? this._model.nodes[current].label
              : (current || 'Root')
          });
        }
      }

      return changes;
    }

    _generateScenarioId() {
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
      const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

      let suffix = '';
      try {
        const bytes = new Uint8Array(2);
        crypto.getRandomValues(bytes);
        suffix = Array.from(bytes)
          .map(v => (v % 36).toString(36).toUpperCase())
          .join('');
      } catch (_) {
        suffix = Math.random().toString(36).slice(2, 4).toUpperCase();
      }

      return `SHIFT-${date}-${time}-${suffix}`;
    }

    _saveScenario(name = '', description = '') {
      if (!this._model) return;

      const store = this._readScenarioStore();
      const number = store.length + 1;
      const id = this._generateScenarioId();
      const changes = this._currentChanges();

      const scenario = {
        schemaVersion: 1,
        id,
        name: String(name || '').trim() || `Scenario ${number}`,
        description: String(description || '').trim(),
        createdAt: new Date().toISOString(),
        hierarchyLabel: this._model.hierarchyLabel,
        measureLabel: this._model.measureLabel,
        unit: this._model.unit,
        contextSignature: this._scenarioContextSignature(),
        parents: this._snapshot(),
        deltas: this._snapshotScenarioDeltas(),
        collapsed: { ...this._collapsed },
        viewMode: this._viewMode,
        graphOrientation: this._graphOrientation,
        zoom: this._zoom,
        focusRootId: this._focusRootId || null,
        maxVisibleDepth: this._maxVisibleDepth,
        showChangedOnly: this._showChangedOnly,
        scenarioMoves: Array.from(this._scenarioMoves || []),
        changes
      };

      store.unshift(scenario);
      this._writeScenarioStore(store);

      this._activeScenarioId = id;
      this._scenarioDirty = false;
      this._scenarioManagerOpen = true;
      this._saveDialogOpen = false;
      this._scenarioNameDraft = '';
      this._scenarioDescriptionDraft = '';
      this._syncNativeBookmarkState();

      this.dispatchEvent(new CustomEvent('scenarioSaved', {
        detail: {
          id,
          name: scenario.name,
          changes
        },
        bubbles: true,
        composed: true
      }));

      this._render();
    }

    _loadScenario(id) {
      if (!this._model || !id) return;

      const scenario = this._readScenarioStore().find(item => item.id === id);
      if (!scenario) return;

      if (scenario.contextSignature !== this._scenarioContextSignature()) {
        alert(
          'This scenario was saved in a different SAC data context. ' +
          'Restore the same story filters before loading it.'
        );
        return;
      }

      const currentIds = new Set(Object.keys(this._model.nodes));

      for (const [nodeId, parentId] of Object.entries(scenario.parents || {})) {
        if (!currentIds.has(nodeId)) continue;
        if (parentId && !currentIds.has(parentId)) continue;
        if (nodeId === parentId) continue;

        this._model.nodes[nodeId].parentId = parentId || null;
      }

      this._restoreScenarioDeltas(scenario.deltas || {});
      this._collapsed = { ...(scenario.collapsed || {}) };
      this._viewMode = scenario.viewMode === 'compact' ? 'compact' : 'graphical';
      this._graphOrientation =
        scenario.graphOrientation === 'vertical' ? 'vertical' : 'horizontal';
      this._zoom = Math.max(0.55, Math.min(1.5, Number(scenario.zoom || 1)));
      this._focusRootId =
        scenario.focusRootId && this._model.nodes[scenario.focusRootId]
          ? scenario.focusRootId
          : null;
      this._maxVisibleDepth = Math.max(0, Number(scenario.maxVisibleDepth || 0));
      this._showChangedOnly = !!scenario.showChangedOnly;
      this._scenarioMoves = Array.isArray(scenario.scenarioMoves)
        ? scenario.scenarioMoves
        : Array.isArray(scenario.changes)
          ? scenario.changes
              .filter(change => change?.nodeId && change?.toParentId)
              .map(change => ({
                sourceId: change.nodeId,
                targetId: change.toParentId
              }))
          : [];
      this._rebuildHierarchyIndex();
      this._history = [];
      this._lastMove = null;
      this._selectedId = null;
      this._selectedIds = new Set();
      this._selectionAnchorId = null;
      this._selectionNotice = '';
      this._activeScenarioId = scenario.id;
      this._scenarioDirty = false;
      this._scenarioManagerOpen = false;
      this._syncNativeBookmarkState();

      this.dispatchEvent(new CustomEvent('scenarioLoaded', {
        detail: {
          id: scenario.id,
          name: scenario.name
        },
        bubbles: true,
        composed: true
      }));

      this._render();
    }

    _deleteScenario(id) {
      if (!id) return;

      const next = this._readScenarioStore().filter(item => item.id !== id);
      this._writeScenarioStore(next);

      if (this._activeScenarioId === id) {
        this._activeScenarioId = null;
        this._scenarioDirty = false;
      }

      this._render();
    }

    _exportScenario(id) {
      const scenario = this._readScenarioStore().find(item => item.id === id);
      if (!scenario) return;

      const blob = new Blob([JSON.stringify(scenario, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${scenario.id}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }

    _importScenarioFile(file) {
      if (!file) return;

      const reader = new FileReader();

      reader.onload = () => {
        try {
          const scenario = JSON.parse(String(reader.result || ''));

          if (!scenario ||
              scenario.schemaVersion !== 1 ||
              !scenario.id ||
              !scenario.parents ||
              !scenario.deltas) {
            throw new Error('Invalid scenario format');
          }

          const store = this._readScenarioStore();
          const existingIndex = store.findIndex(item => item.id === scenario.id);

          if (existingIndex >= 0) store[existingIndex] = scenario;
          else store.unshift(scenario);

          this._writeScenarioStore(store);
          this._scenarioManagerOpen = true;
          this._render();
        } catch (_) {
          alert('The selected file is not a valid Hierarchy SHIFT scenario.');
        }
      };

      reader.readAsText(file);
    }

    _captureVisualState() {
      const state = new Map();

      this._root.querySelectorAll('.node-card, .compact-row').forEach(el => {
        const id = el.dataset.id;
        if (!id) return;
        state.set(id, el.getBoundingClientRect());
      });

      return state;
    }

    _runPendingAnimation() {
      const pending = this._pendingAnimation;
      this._pendingAnimation = null;
      if (!pending) return;

      const triggerOld = pending.from.get(pending.triggerId) || null;
      const duration = 330;

      requestAnimationFrame(() => {
        this._root.querySelectorAll('.node-card, .compact-row').forEach(el => {
          const id = el.dataset.id;
          const now = el.getBoundingClientRect();
          const before = pending.from.get(id);

          let dx = 0;
          let dy = 0;
          let startScale = 1;
          let startOpacity = 1;

          if (before) {
            dx = before.left - now.left;
            dy = before.top - now.top;
          } else if (triggerOld) {
            dx = (triggerOld.left + triggerOld.width / 2) - (now.left + now.width / 2);
            dy = (triggerOld.top + triggerOld.height / 2) - (now.top + now.height / 2);
            startScale = 0.86;
            startOpacity = 0;
          } else {
            startOpacity = 0;
            startScale = 0.92;
          }

          el.style.transition = 'none';
          el.style.transformOrigin = 'left center';
          el.style.transform = `translate(${dx}px, ${dy}px) scale(${startScale})`;
          el.style.opacity = String(startOpacity);

          requestAnimationFrame(() => {
            el.style.transition =
              `transform ${duration}ms cubic-bezier(.22,.8,.28,1), opacity 220ms ease`;
            el.style.transform = 'translate(0,0) scale(1)';
            el.style.opacity = '1';
          });
        });
      });
    }

    _canMove(sourceId, targetId) {
      return this._moveValidation(sourceId, targetId).ok;
    }

    _applyMoveCore(sourceId, targetId) {
      if (!this._canMove(sourceId, targetId)) return null;

      const nodes = this._model.nodes;
      const source = nodes[sourceId];
      const oldParentId = source.parentId;
      const oldParent = nodes[oldParentId];
      const newParent = nodes[targetId];

      const shiftedValue = this._scenarioValue(sourceId);
      const oldParentBefore = oldParent ? this._scenarioValue(oldParentId) : 0;
      const newParentBefore = this._scenarioValue(targetId);
      const oldAncestorChain = this._ancestorChain(oldParentId);
      const newAncestorChain = this._ancestorChain(targetId);
      const affectedNodes = subtreeCount(
        nodes,
        sourceId,
        this._hierarchyIndex
      );

      source.parentId = targetId;
      this._collapsed[targetId] = false;

      for (const id of oldAncestorChain) {
        nodes[id].scenarioDelta =
          Number(nodes[id].scenarioDelta || 0) - shiftedValue;
      }

      for (const id of newAncestorChain) {
        nodes[id].scenarioDelta =
          Number(nodes[id].scenarioDelta || 0) + shiftedValue;
      }

      this._rebuildHierarchyIndex();

      return {
        sourceId,
        sourceLabel: source.label,
        oldParentId,
        oldParentLabel: oldParent?.label || oldParentId || 'Root',
        newParentId: targetId,
        newParentLabel: newParent.label,
        shiftedValue,
        affectedNodes,
        oldParentBefore,
        oldParentAfter: oldParent ? this._scenarioValue(oldParentId) : 0,
        newParentBefore,
        newParentAfter: this._scenarioValue(targetId)
      };
    }

    _moveMany(sourceIds, targetId) {
      const ids = Array.from(new Set(sourceIds || [])).filter(id => !!this._model?.nodes?.[id]);
      const validation = this._multiMoveValidation(ids, targetId);
      if (!validation.ok) {
        this._selectionNotice = validation.reasons?.[0] || 'Invalid move.';
        this._render();
        return;
      }

      if (ids.length === 1) return this._move(ids[0], targetId);

      const beforeVisual = this._captureVisualState();
      const preview = this._multiMovePreviewInfo(ids, targetId);

      this._history.push({
        parents:this._snapshot(),
        deltas:this._snapshotScenarioDeltas(),
        move:this._lastMove,
        scenarioMoves:Array.from(this._scenarioMoves || []),
        selectedIds:this._selectedList()
      });

      const individual = [];
      for (const id of ids) {
        const info = this._applyMoveCore(id, targetId);
        if (info) individual.push(info);
      }

      if (individual.length !== ids.length) {
        const last = this._history.pop();
        if (last) {
          this._restoreParents(last.parents);
          this._restoreScenarioDeltas(last.deltas || {});
          this._scenarioMoves = Array.isArray(last.scenarioMoves) ? last.scenarioMoves : [];
          this._rebuildHierarchyIndex();
        }
        this._selectionNotice = 'The multi move could not be completed as one atomic action.';
        this._render();
        return;
      }

      const entry = {
        sourceIds:ids,
        targetId,
        sourceLabels:individual.map(x => x.sourceLabel),
        targetLabel:this._model.nodes[targetId]?.label || targetId,
        shiftedValue:preview.shiftedValue,
        affectedNodes:preview.affectedNodes,
        originLabels:preview.originImpacts.map(x => x.label),
        movedAt:new Date().toISOString()
      };
      this._scenarioMoves.push(entry);

      this._lastMove = {
        isMulti:true,
        sourceIds:ids,
        sourceCount:ids.length,
        sourceLabels:entry.sourceLabels,
        newParentId:targetId,
        newParentLabel:entry.targetLabel,
        shiftedValue:preview.shiftedValue,
        affectedNodes:preview.affectedNodes,
        impacts:preview.impacts,
        originImpacts:preview.originImpacts,
        targetImpact:preview.targetImpact
      };

      this._selectedIds = new Set(ids);
      this._selectedId = ids[0] || null;
      this._selectionAnchorId = this._selectedId;
      this._selectionNotice = '';
      this._sideTab = 'impact';
      this._moveDialogOpen = false;
      this._moveSourceId = null;
      this._moveSourceIds = [];

      if (this._activeScenarioId) this._scenarioDirty = true;
      this._syncNativeBookmarkState();

      this._pendingAnimation = {
        from:beforeVisual,
        triggerId:ids[0] || null,
        expanding:true
      };

      this._render();
    }

    _move(sourceId, targetId) {
      if (!this._canMove(sourceId, targetId)) return;

      const beforeVisual = this._captureVisualState();

      this._history.push({
        parents: this._snapshot(),
        deltas: this._snapshotScenarioDeltas(),
        move: this._lastMove,
        scenarioMoves: Array.from(this._scenarioMoves || []),
        selectedIds:this._selectedList()
      });

      const moveInfo = this._applyMoveCore(sourceId, targetId);
      if (!moveInfo) {
        this._history.pop();
        return;
      }

      this._scenarioMoves.push({
        sourceId,
        targetId,
        fromParentId: moveInfo.oldParentId || null,
        sourceLabel: moveInfo.sourceLabel,
        fromParentLabel: moveInfo.oldParentLabel,
        targetLabel: moveInfo.newParentLabel,
        shiftedValue: moveInfo.shiftedValue,
        movedAt: new Date().toISOString()
      });
      this._lastMove = moveInfo;
      this._setSingleSelection(sourceId);
      this._sideTab = 'impact';
      this._moveDialogOpen = false;
      this._moveSourceId = null;
      this._moveSourceIds = [];

      if (this._activeScenarioId) this._scenarioDirty = true;
      this._syncNativeBookmarkState();

      this._pendingAnimation = {
        from: beforeVisual,
        triggerId: sourceId,
        expanding: true
      };

      this._render();
    }

    _undo() {
      const last = this._history.pop();
      if (!last) return;

      const beforeVisual = this._captureVisualState();
      this._restoreParents(last.parents);
      this._restoreScenarioDeltas(last.deltas || {});
      this._scenarioMoves = Array.isArray(last.scenarioMoves)
        ? last.scenarioMoves
        : [];
      this._rebuildHierarchyIndex();
      this._lastMove = last.move || null;
      if (Array.isArray(last.selectedIds)) {
        this._selectedIds = new Set(last.selectedIds.filter(id => !!this._model?.nodes?.[id]));
        this._selectedId = this._selectedList().at(-1) || null;
        this._selectionAnchorId = this._selectedId;
      }

      if (this._activeScenarioId) this._scenarioDirty = true;
      this._syncNativeBookmarkState();

      this._pendingAnimation = {
        from: beforeVisual,
        triggerId: this._selectedId,
        expanding: true
      };

      this._render();
    }

    _reset() {
      if (!this._baselineParents) return;

      const beforeVisual = this._captureVisualState();

      this._restoreParents(this._baselineParents);
      this._restoreScenarioDeltas({});
      this._rebuildHierarchyIndex();

      this._history = [];
      this._scenarioMoves = [];
      this._lastMove = null;
      this._selectedId = null;
      this._selectedIds = new Set();
      this._selectionAnchorId = null;
      this._selectionNotice = '';
      this._dragSourceIds = [];
      this._activeScenarioId = null;
      this._scenarioDirty = false;
      this._showChangedOnly = false;
      this._sideTab = 'impact';
      this._moveDialogOpen = false;
      this._moveSourceId = null;
      this._moveSourceIds = [];
      this._saveDialogOpen = false;
      this._dragPreviewTargetId = null;
      this._collapsed = {};

      Object.keys(this._model.nodes).forEach(id => {
        if (!this._model.nodes[id].parentId) this._collapsed[id] = false;
      });

      this._syncNativeBookmarkState();

      this._pendingAnimation = {
        from: beforeVisual,
        triggerId: null,
        expanding: true
      };

      this._render();
    }

    _toggleCollapse(id) {
      if (!this._model || !hasChildren(this._model.nodes, id, this._hierarchyIndex)) return;

      const currentlyCollapsed = !!this._collapsed[id];
      const beforeVisual = this._captureVisualState();

      if (!currentlyCollapsed) {
        /*
         * Give the branch a short close gesture before it disappears. This makes
         * collapse feel like folding a hierarchy, not like a hard redraw.
         */
        const descendants = descendantSet(this._model.nodes, id, this._hierarchyIndex);

        this._root.querySelectorAll('.node-card, .compact-row').forEach(el => {
          if (descendants.has(el.dataset.id)) el.classList.add('branch-closing');
        });

        setTimeout(() => {
          this._collapsed[id] = true;
          this._pendingAnimation = {
            from: beforeVisual,
            triggerId: id,
            expanding: false
          };
          this._syncNativeBookmarkState();
          this._render();
        }, 145);
      } else {
        this._collapsed[id] = false;
        this._pendingAnimation = {
          from: beforeVisual,
          triggerId: id,
          expanding: true
        };
        this._syncNativeBookmarkState();
        this._render();
      }
    }

    _setZoom(next) {
      this._zoom = Math.max(0.55, Math.min(1.5, Math.round(next * 100) / 100));
      this._syncNativeBookmarkState();
      this._render();
    }

    _fitZoom() {
      const workspace = this._root.querySelector('.workspace');
      if (!workspace || !this._lastLayoutBounds) return;

      const availableW = Math.max(200, workspace.clientWidth - 40);
      const availableH = Math.max(200, workspace.clientHeight - 40);
      const fit = Math.min(
        availableW / Math.max(1, this._lastLayoutBounds.width),
        availableH / Math.max(1, this._lastLayoutBounds.height),
        1.35
      );

      this._zoom = Math.max(0.55, Math.min(1.5, Math.round(fit * 100) / 100));
      this._scrollByView.graphical = { top: 0, left: 0 };
      this._syncNativeBookmarkState();
      this._render();
    }

    _setGraphOrientation(orientation) {
      const next = orientation === 'vertical' ? 'vertical' : 'horizontal';
      if (this._graphOrientation === next) return;

      const beforeVisual = this._captureVisualState();
      this._graphOrientation = next;
      this._scrollByView.graphical = { top: 0, left: 0 };
      this._pendingAnimation = {
        from: beforeVisual,
        triggerId: this._selectedId,
        expanding: true
      };
      this._syncNativeBookmarkState();
      this._render();
    }

    _toggleScenarioManager() {
      this._scenarioManagerOpen = !this._scenarioManagerOpen;
      this._render();
    }

    _stopDragAutoScroll() {
      this._dragAutoScrollX = 0;
      this._dragAutoScrollY = 0;

      if (this._dragAutoScrollRaf) {
        cancelAnimationFrame(this._dragAutoScrollRaf);
        this._dragAutoScrollRaf = 0;
      }
    }
    _updateDragAutoScroll(workspace, clientX, clientY) {
      const mode = this._viewMode;

      if (!workspace ||
          !this._dragId ||
          (mode !== 'compact' && mode !== 'graphical')) {
        this._stopDragAutoScroll();
        return;
      }

      const rect = workspace.getBoundingClientRect();
      const graphical = mode === 'graphical';

      const edgeY = graphical
        ? Math.min(120, Math.max(72, rect.height * 0.18))
        : Math.min(92, Math.max(58, rect.height * 0.16));

      const edgeX = graphical
        ? Math.min(120, Math.max(68, rect.width * 0.12))
        : Math.min(92, Math.max(52, rect.width * 0.10));

      const maxSpeedY = graphical ? 30 : 24;
      const maxSpeedX = graphical ? 26 : 18;

      let vy = 0;
      let vx = 0;

      if (clientY < rect.top + edgeY) {
        const ratio = Math.min(1, (rect.top + edgeY - clientY) / edgeY);
        vy = -Math.max(4, Math.round(maxSpeedY * ratio));
      } else if (clientY > rect.bottom - edgeY) {
        const ratio = Math.min(1, (clientY - (rect.bottom - edgeY)) / edgeY);
        vy = Math.max(4, Math.round(maxSpeedY * ratio));
      }

      if (clientX < rect.left + edgeX) {
        const ratio = Math.min(1, (rect.left + edgeX - clientX) / edgeX);
        vx = -Math.max(3, Math.round(maxSpeedX * ratio));
      } else if (clientX > rect.right - edgeX) {
        const ratio = Math.min(1, (clientX - (rect.right - edgeX)) / edgeX);
        vx = Math.max(3, Math.round(maxSpeedX * ratio));
      }

      this._dragAutoScrollX = vx;
      this._dragAutoScrollY = vy;

      if (!vx && !vy) {
        this._stopDragAutoScroll();
        return;
      }

      if (this._dragAutoScrollRaf) return;

      const tick = () => {
        this._dragAutoScrollRaf = 0;

        const currentMode = this._viewMode;
        if (!this._dragId ||
            (currentMode !== 'compact' && currentMode !== 'graphical')) {
          this._stopDragAutoScroll();
          return;
        }

        const beforeTop = workspace.scrollTop;
        const beforeLeft = workspace.scrollLeft;

        workspace.scrollTop += this._dragAutoScrollY;
        workspace.scrollLeft += this._dragAutoScrollX;

        this._scrollByView[currentMode] = {
          top: workspace.scrollTop,
          left: workspace.scrollLeft
        };

        const moved =
          workspace.scrollTop !== beforeTop ||
          workspace.scrollLeft !== beforeLeft;

        if ((this._dragAutoScrollX || this._dragAutoScrollY) && moved) {
          this._dragAutoScrollRaf = requestAnimationFrame(tick);
        } else {
          this._stopDragAutoScroll();
        }
      };

      this._dragAutoScrollRaf = requestAnimationFrame(tick);
    }

    _wireEvents() {
      const interactiveNodes = this._root.querySelectorAll('.node-card, .compact-row');

      interactiveNodes.forEach(el => {
        const id = el.dataset.id;

        el.addEventListener('click', e => {
          if (e.target?.closest?.('.multi-check')) return;
          this._handleSelectionClick(id, e);
          this._render();
          requestAnimationFrame(() => this._root.querySelector('.shell')?.focus({ preventScroll:true }));
        });

        el.querySelector('.multi-check')?.addEventListener('click', e => {
          e.stopPropagation();
          this._toggleMultiSelection(id);
          this._render();
          requestAnimationFrame(() => this._root.querySelector('.shell')?.focus({ preventScroll:true }));
        });

        el.querySelector('.toggle-btn')?.addEventListener('click', e => {
          e.stopPropagation();
          this._toggleCollapse(id);
        });

        el.addEventListener('dragstart', e => {
          if (!el.draggable) {
            e.preventDefault();
            return;
          }

          if (!this._isSelected(id)) this._setSingleSelection(id);
          this._dragId = id;
          this._dragSourceIds = this._activeMoveSourceIds(id);
          this._dragPreviewTargetId = null;
          this._paintMovePreview([], null);
          e.dataTransfer.effectAllowed = 'move';

          try {
            e.dataTransfer.setData('text/plain', id);
          } catch (_) {}

          if (this._viewMode === 'compact') {
            this._root.querySelector('.workspace')?.classList.add('compact-dragging');
          }

          requestAnimationFrame(() => el.classList.add('dragging'));
        });

        el.addEventListener('dragend', () => {
          this._stopDragAutoScroll();
          this._paintMovePreview(null, null);
          this._dragPreviewTargetId = null;
          this._dragId = null;
          this._dragSourceIds = [];
          this._root.querySelectorAll('.drop-target').forEach(x => x.classList.remove('drop-target'));
          this._root.querySelector('.workspace')?.classList.remove('compact-dragging');
          el.classList.remove('dragging');
        });

        el.addEventListener('dragover', e => {
          const sourceIds = this._dragSourceIds?.length ? this._dragSourceIds : this._activeMoveSourceIds(this._dragId);
          if (this._multiMoveValidation(sourceIds, id).ok) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            el.classList.add('drop-target');
            if (this._dragPreviewTargetId !== id) this._paintMovePreview(sourceIds, id);
          }
        });

        el.addEventListener('dragleave', () => {
          el.classList.remove('drop-target');
        });

        el.addEventListener('drop', e => {
          e.preventDefault();
          el.classList.remove('drop-target');

          const sourceId = this._dragId || (() => {
            try {
              return e.dataTransfer.getData('text/plain');
            } catch (_) {
              return '';
            }
          })();

          const sourceIds = this._dragSourceIds?.length ? Array.from(this._dragSourceIds) : this._activeMoveSourceIds(sourceId);
          this._stopDragAutoScroll();
          this._paintMovePreview([], null);
          this._dragPreviewTargetId = null;
          this._dragId = null;
          this._dragSourceIds = [];
          this._moveMany(sourceIds, id);
        });
      });

      /*
       * Compact view drag auto-scroll:
       * when a user drags a node from lower in the hierarchy toward a parent
       * above, the table now keeps scrolling while the pointer stays near the
       * top edge. The same works toward the bottom, left and right edges.
       */
      if (this._viewMode === 'compact') {
        const workspace = this._root.querySelector('.workspace');

        if (workspace) {
          workspace.addEventListener('dragover', e => {
            if (!this._dragId) return;

            // Keep HTML5 DnD active even while the pointer is over empty table
            // space instead of directly over a valid drop target.
            e.preventDefault();
            this._updateDragAutoScroll(
              workspace,
              e.clientX,
              e.clientY
            );
          });

          workspace.addEventListener('dragleave', e => {
            const rect = workspace.getBoundingClientRect();
            const outside =
              e.clientX < rect.left ||
              e.clientX > rect.right ||
              e.clientY < rect.top ||
              e.clientY > rect.bottom;

            if (outside) this._stopDragAutoScroll();
          });

          workspace.addEventListener('drop', () => {
            this._stopDragAutoScroll();
          });
        }
      }

      /*
       * Graphical View node drag auto-scroll:
       * keep moving the viewport when a dragged hierarchy node reaches
       * any edge, so distant target parents can be reached without releasing.
       */
      if (this._viewMode === 'graphical') {
        const workspace = this._root.querySelector('.workspace');

        if (workspace) {
          workspace.addEventListener('dragover', e => {
            if (!this._dragId) return;
            e.preventDefault();
            this._updateDragAutoScroll(workspace, e.clientX, e.clientY);
          });

          workspace.addEventListener('dragleave', e => {
            const rect = workspace.getBoundingClientRect();
            const outside =
              e.clientX < rect.left ||
              e.clientX > rect.right ||
              e.clientY < rect.top ||
              e.clientY > rect.bottom;
            if (outside) this._stopDragAutoScroll();
          });

          workspace.addEventListener('drop', () => {
            this._stopDragAutoScroll();
          });
        }
      }

      /*
       * Graphical view drag-to-pan:
       * grab any empty area of the hierarchy canvas and move the viewport
       * freely in all four directions. Node drag/drop remains untouched.
       */
      if (this._viewMode === 'graphical') {
        const workspace = this._root.querySelector('.workspace');

        if (workspace) {
          let pan = null;

          const finishPan = () => {
            if (!pan) return;

            this._scrollByView.graphical = {
              top: workspace.scrollTop,
              left: workspace.scrollLeft
            };

            pan = null;
            workspace.classList.remove('panning');
          };

          workspace.addEventListener('pointerdown', e => {
            if (e.button !== 0) return;

            const target = e.target;
            if (target?.closest?.('.node-card, button, .zoom-controls, .orientation-switch')) return;

            pan = {
              pointerId: e.pointerId,
              x: e.clientX,
              y: e.clientY,
              left: workspace.scrollLeft,
              top: workspace.scrollTop
            };

            workspace.classList.add('panning');

            try {
              workspace.setPointerCapture(e.pointerId);
            } catch (_) {}
          });

          workspace.addEventListener('pointermove', e => {
            if (!pan || e.pointerId !== pan.pointerId) return;

            const dx = e.clientX - pan.x;
            const dy = e.clientY - pan.y;

            workspace.scrollLeft = pan.left - dx;
            workspace.scrollTop = pan.top - dy;

            this._scrollByView.graphical = {
              top: workspace.scrollTop,
              left: workspace.scrollLeft
            };

            e.preventDefault();
          });

          workspace.addEventListener('pointerup', finishPan);
          workspace.addEventListener('pointercancel', finishPan);
          workspace.addEventListener('lostpointercapture', finishPan);
        }
      }

      this._root.querySelector('[data-action="view-graphical"]')?.addEventListener('click', () => {
        if (this._viewMode === 'graphical') return;

        const ws = this._root.querySelector('.workspace');
        if (ws) {
          this._scrollByView[this._viewMode] = {
            top: ws.scrollTop,
            left: ws.scrollLeft
          };
        }

        this._viewMode = 'graphical';
        this._syncNativeBookmarkState();
        this._render();
      });

      this._root.querySelector('[data-action="view-compact"]')?.addEventListener('click', () => {
        if (this._viewMode === 'compact') return;

        const ws = this._root.querySelector('.workspace');
        if (ws) {
          this._scrollByView[this._viewMode] = {
            top: ws.scrollTop,
            left: ws.scrollLeft
          };
        }

        this._viewMode = 'compact';
        this._syncNativeBookmarkState();
        this._render();
      });

      this._root.querySelector('[data-action="orientation-horizontal"]')?.addEventListener('click', () => {
        this._setGraphOrientation('horizontal');
      });

      this._root.querySelector('[data-action="orientation-vertical"]')?.addEventListener('click', () => {
        this._setGraphOrientation('vertical');
      });

      this._root.querySelector('[data-action="zoom-in"]')?.addEventListener('click', () => {
        this._setZoom(this._zoom + 0.1);
      });

      this._root.querySelector('[data-action="zoom-out"]')?.addEventListener('click', () => {
        this._setZoom(this._zoom - 0.1);
      });

      this._root.querySelector('[data-action="zoom-reset"]')?.addEventListener('click', () => {
        this._setZoom(1);
      });

      this._root.querySelector('[data-action="zoom-fit"]')?.addEventListener('click', () => {
        this._fitZoom();
      });

      const hierarchySearch = this._root.querySelector('[data-action="hierarchy-search"]');
      const hierarchySearchResults = this._root.querySelector('.hierarchy-search-results');

      const paintHierarchySearch = value => {
        this._searchQuery = value || '';
        if (!hierarchySearchResults) return;

        const q = String(value || '').trim();
        if (!q) {
          hierarchySearchResults.innerHTML = '';
          hierarchySearchResults.classList.remove('open');
          return;
        }

        const results = this._searchNodes(q, { limit: 24 });

        hierarchySearchResults.innerHTML = results.length
          ? results.map(node => `
              <button class="search-result" data-search-node="${esc(node.id)}" type="button">
                <span>
                  <strong>${esc(node.label)}</strong>
                  <small>${esc(node.id)}</small>
                </span>
                <b>Locate</b>
              </button>`).join('')
          : `<div class="search-empty">No matching node in the loaded hierarchy.</div>`;

        hierarchySearchResults.classList.add('open');

        hierarchySearchResults.querySelectorAll('[data-search-node]').forEach(btn => {
          btn.addEventListener('click', () => {
            this._searchQuery = '';
            this._revealNode(btn.dataset.searchNode);
          });
        });
      };

      hierarchySearch?.addEventListener('input', () => {
        paintHierarchySearch(hierarchySearch.value);
      });

      hierarchySearch?.addEventListener('focus', () => {
        if (hierarchySearch.value.trim()) paintHierarchySearch(hierarchySearch.value);
      });

      this._root.querySelector('[data-action="level-limit"]')?.addEventListener('change', e => {
        this._maxVisibleDepth = Math.max(0, Number(e.target.value || 0));
        this._compactWindowStart = 0;
        this._scrollByView.graphical = { top: 0, left: 0 };
        this._scrollByView.compact = { top: 0, left: 0 };
        this._render();
      });

      this._root.querySelector('[data-action="focus-selected"]')?.addEventListener('click', () => {
        if (this._selectedId && this._selectedList().length === 1) this._focusNode(this._selectedId);
      });

      this._root.querySelector('[data-action="clear-focus"]')?.addEventListener('click', () => {
        this._clearFocus();
      });

      this._root.querySelector('[data-action="show-changed"]')?.addEventListener('click', () => {
        this._showChangedOnly = !this._showChangedOnly;
        this._compactWindowStart = 0;
        this._scrollByView.graphical = { top: 0, left: 0 };
        this._scrollByView.compact = { top: 0, left: 0 };
        this._render();
      });

      this._root.querySelectorAll('[data-side-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
          const allowed = new Set(['impact', 'summary', 'history', 'technical']);
          this._sideTab = allowed.has(btn.dataset.sideTab) ? btn.dataset.sideTab : 'impact';
          this._render();
        });
      });

      this._root.querySelector('[data-action="move-selected"]')?.addEventListener('click', () => {
        if (this._selectedList().length) this._openMoveDialog(this._selectedId);
      });

      this._root.querySelector('[data-action="clear-selection"]')?.addEventListener('click', () => {
        this._clearSelection();
      });

      this._root.querySelector('[data-action="reset-branch"]')?.addEventListener('click', () => {
        if (this._selectedId && this._selectedList().length === 1) this._resetBranch(this._selectedId);
      });

      this._root.querySelector('[data-action="close-move-dialog"]')?.addEventListener('click', () => {
        this._closeMoveDialog();
      });

      this._root.querySelector('.move-dialog-backdrop')?.addEventListener('click', e => {
        if (e.target.classList.contains('move-dialog-backdrop')) this._closeMoveDialog();
      });

      const moveSearch = this._root.querySelector('[data-action="move-search"]');
      const moveResults = this._root.querySelector('.move-results');

      const paintMoveTargets = value => {
        if (!moveResults || !this._moveSourceId) return;

        const sourceIds = this._moveSourceIds?.length ? this._moveSourceIds : this._activeMoveSourceIds(this._moveSourceId);
        const targets = this._searchNodes(value, {
          branchesOnly: true,
          limit: 80
        }).filter(node => this._multiMoveValidation(sourceIds, node.id).ok).slice(0, 40);

        moveResults.innerHTML = targets.length
          ? targets.map(node => {
              const validation = this._multiMoveValidation(sourceIds, node.id);
              const levelText = sourceIds.length === 1
                ? (() => { const v=this._moveValidation(sourceIds[0],node.id); return v.ok ? `Level ${Number(v.sourceDepth||0)+1} → ${Number(v.resultingDepth||0)+1}` : ''; })()
                : `${sourceIds.length} nodes`;
              return `
                <button type="button" class="move-target" data-move-target="${esc(node.id)}">
                  <span>
                    <strong>${esc(node.label)}</strong>
                    <small>${esc(node.id)}${levelText ? ` • ${esc(levelText)}` : ''}</small>
                  </span>
                  <b>Move here</b>
                </button>`;
            }).join('')
          : `<div class="search-empty">No valid target parent found.</div>`;

        moveResults.querySelectorAll('[data-move-target]').forEach(btn => {
          const sourceIds = this._moveSourceIds?.length ? this._moveSourceIds : this._activeMoveSourceIds(this._moveSourceId);
          btn.addEventListener('mouseenter', () => this._paintMovePreview(sourceIds, btn.dataset.moveTarget));
          btn.addEventListener('focus', () => this._paintMovePreview(sourceIds, btn.dataset.moveTarget));
          btn.addEventListener('click', () => this._moveMany(sourceIds, btn.dataset.moveTarget));
        });
      };

      if (moveSearch) {
        paintMoveTargets('');
        moveSearch.addEventListener('input', () => paintMoveTargets(moveSearch.value));
        requestAnimationFrame(() => moveSearch.focus());
      }

      this._root.querySelectorAll('[data-summary-node]').forEach(btn => {
        btn.addEventListener('click', () => this._revealNode(btn.dataset.summaryNode));
      });

      this._root.querySelectorAll('[data-action="undo"]').forEach(btn => {
        btn.addEventListener('click', () => this._undo());
      });
      this._root.querySelector('[data-action="reset"]')?.addEventListener('click', () => this._reset());
      this._root.querySelectorAll('[data-action="save-scenario"]').forEach(btn => {
        btn.addEventListener('click', () => this._openSaveScenarioDialog());
      });
      this._root.querySelectorAll('[data-action="scenario-manager"]').forEach(btn => {
        btn.addEventListener('click', () => this._toggleScenarioManager());
      });
      this._root.querySelector('[data-action="export-excel"]')?.addEventListener('click', () => this._exportCurrentViewXlsx());
      this._root.querySelector('[data-action="toggle-debug"]')?.addEventListener('click', () => {
        this._debugMode = !this._debugMode;
        this._sideTab = this._debugMode ? 'technical' : 'impact';
        this._render();
      });
      this._root.querySelector('[data-action="toggle-theme"]')?.addEventListener('click', () => this._toggleTheme());

      this._root.querySelector('[data-action="toggle-scale"]')?.addEventListener('click', e => {
        e.stopPropagation();
        this._toggleScalePopover();
      });

      const scaleRange = this._root.querySelector('[data-action="ui-scale"]');
      scaleRange?.addEventListener('input', () => {
        this._applyUiScale(Number(scaleRange.value), true);
      });

      this._root.querySelectorAll('[data-scale-preset]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          const value = Number(btn.dataset.scalePreset || 100);
          this._applyUiScale(value, true);
          if (scaleRange) scaleRange.value = String(value);
        });
      });

      this._root.querySelector('[data-action="open-info"]')?.addEventListener('click', () => this._openInfo());
      this._root.querySelectorAll('[data-action="close-info"]').forEach(btn => btn.addEventListener('click', () => this._closeInfo()));
      this._root.querySelector('.info-dialog-backdrop')?.addEventListener('click', e => {
        if (e.target.classList.contains('info-dialog-backdrop')) this._closeInfo();
      });
      this._root.querySelector('[data-action="copy-technical"]')?.addEventListener('click', () => this._copyTechnicalInfo());

      this._root.querySelectorAll('[data-load-scenario]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          this._loadScenario(btn.dataset.loadScenario);
        });
      });

      this._root.querySelectorAll('[data-export-scenario]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          this._exportScenario(btn.dataset.exportScenario);
        });
      });

      this._root.querySelectorAll('[data-delete-scenario]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          this._deleteScenario(btn.dataset.deleteScenario);
        });
      });

      const compareA = this._root.querySelector('[data-action="compare-a"]');
      const compareB = this._root.querySelector('[data-action="compare-b"]');
      compareA?.addEventListener('change', () => { this._compareScenarioAId = compareA.value || ''; this._render(); });
      compareB?.addEventListener('change', () => { this._compareScenarioBId = compareB.value || ''; this._render(); });

      const importInput = this._root.querySelector('[data-action="import-scenario-file"]');
      this._root.querySelector('[data-action="import-scenario"]')?.addEventListener('click', () => {
        importInput?.click();
      });

      importInput?.addEventListener('change', () => {
        const file = importInput.files?.[0];
        if (file) this._importScenarioFile(file);
        importInput.value = '';
      });

      this._root.querySelectorAll('[data-action="close-save-dialog"]').forEach(btn => {
        btn.addEventListener('click', () => this._closeSaveScenarioDialog());
      });
      this._root.querySelector('.save-dialog-backdrop')?.addEventListener('click', e => {
        if (e.target.classList.contains('save-dialog-backdrop')) this._closeSaveScenarioDialog();
      });
      const scenarioNameInput = this._root.querySelector('[data-action="scenario-name"]');
      const scenarioDescriptionInput = this._root.querySelector('[data-action="scenario-description"]');
      scenarioNameInput?.addEventListener('input', () => { this._scenarioNameDraft = scenarioNameInput.value; });
      scenarioDescriptionInput?.addEventListener('input', () => { this._scenarioDescriptionDraft = scenarioDescriptionInput.value; });
      this._root.querySelector('[data-action="confirm-save-scenario"]')?.addEventListener('click', () => {
        this._saveScenario(scenarioNameInput?.value || this._scenarioNameDraft, scenarioDescriptionInput?.value || this._scenarioDescriptionDraft);
      });

      this._root.querySelector('[data-action="expand-all"]')?.addEventListener('click', () => {
        const beforeVisual = this._captureVisualState();
        Object.keys(this._model?.nodes || {}).forEach(id => {
          this._collapsed[id] = false;
        });
        this._pendingAnimation = {
          from: beforeVisual,
          triggerId: null,
          expanding: true
        };
        this._syncNativeBookmarkState();
        this._render();
      });

      this._root.querySelector('[data-action="collapse-all"]')?.addEventListener('click', () => {
        const beforeVisual = this._captureVisualState();

        Object.keys(this._model?.nodes || {}).forEach(id => {
          if (hasChildren(this._model.nodes, id, this._hierarchyIndex)) {
            this._collapsed[id] = true;
          }
        });

        this._pendingAnimation = {
          from: beforeVisual,
          triggerId: null,
          expanding: false
        };
        this._syncNativeBookmarkState();
        this._render();
      });

      if (this._viewMode === 'compact') {
        const workspace = this._root.querySelector('.workspace');
        const stickyPath = this._root.querySelector('[data-sticky-path]');
        const updateStickyContext = () => {
          if (!workspace || !stickyPath || !this._model) return;
          const wsRect = workspace.getBoundingClientRect();
          const currentRows = Array.from(this._root.querySelectorAll('.compact-row'));
          const firstVisible = currentRows.find(row => row.getBoundingClientRect().bottom > wsRect.top + 43);
          const id = firstVisible?.dataset?.id;
          const node = id ? this._model.nodes[id] : null;
          stickyPath.textContent = node
            ? (this._nodePath(id, node.isNode === true) || this._model.hierarchyLabel)
            : (this._focusRootId ? this._nodePath(this._focusRootId, true) : this._model.hierarchyLabel);
        };
        workspace?.addEventListener('scroll', () => requestAnimationFrame(updateStickyContext));
        requestAnimationFrame(updateStickyContext);
      }

      if (this._viewMode === 'compact' && this._compactVirtualRows > COMPACT_VIRTUAL_THRESHOLD) {
        const workspace = this._root.querySelector('.workspace');

        if (workspace) {
          let scheduled = false;

          workspace.addEventListener('scroll', () => {
            this._scrollByView.compact = {
              top: workspace.scrollTop,
              left: workspace.scrollLeft
            };

            if (scheduled) return;
            scheduled = true;

            requestAnimationFrame(() => {
              scheduled = false;

              // Replacing virtualized rows during native HTML5 drag can destroy
              // the drag source. Keep the current rendered window stable until
              // the drag finishes.
              if (this._dragId) return;

              const desired = Math.max(
                0,
                Math.floor(Math.max(0, workspace.scrollTop - 48) / COMPACT_ROW_H) - 35
              );

              if (Math.abs(desired - this._compactWindowStart) >= 40) {
                this._compactWindowStart = desired;
                this._render();
              }
            });
          });
        }
      }

      const shell = this._root.querySelector('.shell');
      shell?.addEventListener('keydown', e => {
        const tag = String(e.target?.tagName || '').toUpperCase();
        const editing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable;
        if (e.key === '/' && !editing) {
          e.preventDefault();
          this._root.querySelector('[data-action="hierarchy-search"]')?.focus();
          return;
        }
        if (e.key === 'Escape') {
          if (this._scalePopoverOpen) { e.preventDefault(); this._scalePopoverOpen = false; this._render(); return; }
          if (this._infoOpen) { e.preventDefault(); this._closeInfo(); return; }
          if (this._saveDialogOpen) { e.preventDefault(); this._closeSaveScenarioDialog(); return; }
          if (this._moveDialogOpen) { e.preventDefault(); this._closeMoveDialog(); return; }
          const results = this._root.querySelector('.hierarchy-search-results');
          if (results?.classList.contains('open')) { e.preventDefault(); results.classList.remove('open'); return; }
        }
        if (editing || this._viewMode !== 'compact') return;
        if (e.key === 'ArrowDown') { e.preventDefault(); this._selectCompactNeighbor(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); this._selectCompactNeighbor(-1); }
        else if (e.key === 'Enter' && this._selectedId && this._selectedList().length === 1 && hasChildren(this._model.nodes, this._selectedId, this._hierarchyIndex)) {
          e.preventDefault(); this._toggleCollapse(this._selectedId);
        }
      });
    }

    _emptyState() {
      return `
        <div class="empty">
          <div class="empty-aurora a1"></div>
          <div class="empty-aurora a2"></div>
          <div class="empty-grid"></div>

          <div class="empty-stage" aria-hidden="true">
            <svg class="empty-stage-links" viewBox="0 0 560 220" preserveAspectRatio="none">
              <path class="empty-link l-root" d="M280 45 V82 H145 V115"></path>
              <path class="empty-link l-root" d="M280 82 H415 V115"></path>
              <path class="empty-link l-child" d="M145 157 V190 H92"></path>
              <path class="empty-link l-child" d="M145 190 H196"></path>
              <path class="empty-link l-child target-link" d="M415 157 V190 H362"></path>
              <path class="empty-link l-child" d="M415 190 H468"></path>
              <path class="empty-flow-path" d="M196 190 C255 190 303 190 362 190"></path>
            </svg>

            <div class="demo-node demo-root">
              <span>Germany</span><strong>2.22M EUR</strong>
            </div>
            <div class="demo-node demo-left">
              <span>Business</span><strong>1.27M EUR</strong>
            </div>
            <div class="demo-node demo-right">
              <span>Home</span>
              <strong class="demo-home-value">
                <span class="home-before">1.02M EUR</span>
                <span class="home-after">1.09M EUR</span>
              </strong>
            </div>
            <div class="demo-leaf demo-l1">Software</div>
            <div class="demo-leaf demo-r1">PC</div>
            <div class="demo-leaf demo-r2">Mouse</div>

            <div class="demo-leaf demo-moving">
              <span>Printers</span>
              <b>67.9K</b>
            </div>

            <div class="demo-impact">+67.9K EUR</div>
            <div class="demo-pulse"></div>
          </div>

          <div class="empty-kicker">What-if prototype for controllers</div>
          <div class="empty-title">Hierarchy SHIFT</div>
          <div class="empty-copy"><strong>SAP BW Live hierarchy scenarios in SAP Analytics Cloud.</strong> Explore alternative hierarchy structures and KPI impact locally. No BW writeback.</div>

          <div class="empty-bind">
            <span>Bind</span>
            <b>1 KPI</b>
            <i>+</i>
            <b>1 Time Dimension</b>
            <i>+</i>
            <b>1 SAP BW Live Hierarchy</b>
          </div>

          <div class="empty-capabilities">
            <span>Structural What-If</span>
            <span>No BW Writeback</span>
            <span>Save Local Scenario</span>
          </div>

          <div class="empty-hint"><strong>Designed for SAP BW hierarchies in Live mode.</strong> SHIFT automatically follows the current SAC filter context.</div>
        </div>`;
    }

    _render() {
      const previousWorkspace = this._root.querySelector('.workspace');
      if (previousWorkspace && this._scrollByView?.[this._viewMode]) {
        this._scrollByView[this._viewMode] = {
          top: previousWorkspace.scrollTop,
          left: previousWorkspace.scrollLeft
        };
      }

      this._renderedOnce = true;
      const model = this._model;

      const css = `
        :host {
          --bg:#f5faff;
          --panel:#ffffff;
          --ink:#102544;
          --ink-2:#17345c;
          --blue:#0a6ed1;
          --blue-2:#0d5db8;
          --blue-soft:#eaf4ff;
          --line:#86b8ec;
          --line-soft:#c6e0fb;
          --green:#0f7d43;
          display:block;
          width:100%;
          height:100%;
          min-width:820px;
          min-height:520px;
          box-sizing:border-box;
          font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;
          color:var(--ink);
          background:var(--bg);
        }

        * { box-sizing:border-box; }

        .shell {
          position:relative;
          width:100%;
          height:100%;
          display:flex;
          flex-direction:column;
          background:var(--bg);
          overflow:hidden;
        }

        .topbar {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:14px;
          padding:11px 14px;
          background:#ffffff;
          border-bottom:1px solid var(--line-soft);
        }

        .hero {
          display:flex;
          align-items:center;
          gap:12px;
          min-width:0;
        }

        .hero-mark {
          width:48px;
          height:48px;
          border-radius:14px;
          background:#ffffff;
          border:1px solid #8fc0f2;
          position:relative;
          box-shadow:0 5px 16px rgba(10,110,209,.12);
          flex:0 0 auto;
          overflow:hidden;
        }

        .hero-tree-line {
          position:absolute;
          height:2px;
          background:#0a6ed1;
          transform-origin:left center;
          border-radius:2px;
          opacity:.95;
        }

        .hero-tree-line.root-left { left:23px; top:14px; width:16px; transform:rotate(137deg); }
        .hero-tree-line.root-right { left:25px; top:14px; width:16px; transform:rotate(43deg); }
        .hero-tree-line.left-child { left:12px; top:28px; width:14px; transform:rotate(69deg); animation:heroOldLink 3.2s ease-in-out infinite; }
        .hero-tree-line.right-child { left:35px; top:28px; width:14px; transform:rotate(111deg); animation:heroNewLink 3.2s ease-in-out infinite; }

        .hero-tree-node {
          position:absolute;
          width:8px;
          height:8px;
          border-radius:3px;
          background:#0a6ed1;
          box-shadow:0 0 0 3px rgba(10,110,209,.12);
        }

        .hero-tree-node.root { left:20px; top:7px; width:9px; height:9px; background:#0757a6; }
        .hero-tree-node.left { left:7px; top:24px; }
        .hero-tree-node.right { left:33px; top:24px; }
        .hero-tree-node.shift {
          left:8px;
          top:38px;
          width:7px;
          height:7px;
          background:#0f7d43;
          box-shadow:0 0 0 3px rgba(15,125,67,.13);
          animation:heroShiftNode 3.2s cubic-bezier(.55,.05,.2,1) infinite;
        }

        .eyebrow {
          font-size:10.5px;
          font-weight:900;
          letter-spacing:.14em;
          text-transform:uppercase;
          color:var(--blue-2);
          margin-bottom:2px;
        }

        .title {
          font-size:25px;
          line-height:1;
          font-weight:900;
          letter-spacing:-.03em;
          color:var(--ink);
        }

        .subtitle {
          margin-top:4px;
          font-size:12.5px;
          color:var(--ink-2);
          line-height:1.3;
        }

        .toolbar {
          display:flex;
          align-items:center;
          gap:6px;
          flex-wrap:wrap;
          justify-content:flex-end;
        }

        button {
          border:1px solid #8fc0f2;
          background:#ffffff;
          color:var(--ink);
          border-radius:9px;
          padding:7px 10px;
          min-height:34px;
          font-size:11.5px;
          font-weight:800;
          cursor:pointer;
        }

        button:hover:not(:disabled) { background:#eef6ff; }
        button:disabled { opacity:.42; cursor:default; }

        button.primary {
          background:linear-gradient(135deg,#0a6ed1,#0858ad);
          border-color:#0a6ed1;
          color:#ffffff;
          box-shadow:0 5px 14px rgba(10,110,209,.22);
        }

        button.primary:hover:not(:disabled) {
          background:linear-gradient(135deg,#0b75df,#074f9e);
          transform:translateY(-1px);
        }

        button.active-tool {
          color:#0b5eae;
          background:#eaf4ff;
          border-color:#67a9e8;
          box-shadow:0 0 0 2px rgba(10,110,209,.08);
        }

        .view-switch,
        .orientation-switch,
        .zoom-controls {
          display:flex;
          padding:2px;
          gap:2px;
          background:#eaf4ff;
          border:1px solid #acd0f7;
          border-radius:10px;
        }

        .view-switch button,
        .orientation-switch button,
        .zoom-controls button {
          border:0;
          box-shadow:none;
          background:transparent;
          padding:5px 8px;
          color:var(--blue-2);
        }

        .view-switch button.active,
        .orientation-switch button.active {
          background:#ffffff;
          color:var(--ink);
          box-shadow:0 2px 7px rgba(10,110,209,.18);
        }

        .zoom-label {
          display:flex;
          align-items:center;
          justify-content:center;
          min-width:44px;
          padding:0 5px;
          font-size:10.5px;
          font-weight:900;
          color:var(--ink);
          cursor:pointer;
        }

        .meta-strip {
          display:flex;
          align-items:center;
          gap:7px;
          padding:7px 14px;
          background:#f8fcff;
          border-bottom:1px solid var(--line-soft);
          overflow:auto;
        }

        .pill {
          white-space:nowrap;
          font-size:11.5px;
          color:var(--ink);
          background:#ffffff;
          border:1px solid #b9d8f8;
          border-radius:999px;
          padding:4px 8px;
        }

        .pill strong { color:var(--blue-2); }

        .bw-live-pill {
          background:#eaf4ff;
          border-color:#8fc0f2;
        }

        .bw-live-pill strong {
          color:#0a5fb6;
        }


        .hierarchy-nav {
          position:relative;
          z-index:30;
          display:flex;
          align-items:center;
          gap:7px;
          flex-wrap:wrap;
          padding:7px 14px;
          background:#ffffff;
          border-bottom:1px solid var(--line-soft);
        }

        .multi-selection-status {
          display:flex;
          align-items:center;
          gap:7px;
          min-height:34px;
          padding:3px 5px 3px 10px;
          border:1px solid #67a9e8;
          border-radius:10px;
          background:#eaf4ff;
          color:#102544;
          box-shadow:0 3px 10px rgba(10,110,209,.08);
        }

        .multi-selection-status strong {
          color:#0b5eae;
          font-size:11px;
          font-weight:1000;
        }

        .multi-selection-status span {
          color:#102544;
          font-size:11px;
          font-weight:900;
        }

        .multi-selection-status button {
          min-height:28px;
          padding:4px 8px;
        }

        .selection-notice {
          max-width:420px;
          border:1px solid #e6c26a;
          border-radius:9px;
          background:#fff8e7;
          color:#6f4d00;
          padding:7px 9px;
          font-size:10.5px;
          font-weight:900;
          line-height:1.3;
        }

        .hierarchy-search {
          position:relative;
          min-width:230px;
          flex:0 1 330px;
        }

        .hierarchy-search input,
        .move-search {
          width:100%;
          height:36px;
          border:1px solid #9bc6f3;
          border-radius:9px;
          padding:0 10px;
          background:#ffffff;
          color:var(--ink);
          outline:none;
          font-size:12.5px;
          font-weight:700;
        }

        .hierarchy-search input:focus,
        .move-search:focus {
          border-color:#0a6ed1;
          box-shadow:0 0 0 3px rgba(10,110,209,.10);
        }

        .hierarchy-search-results {
          display:none;
          position:absolute;
          left:0;
          right:0;
          top:36px;
          max-height:320px;
          overflow:auto;
          border:1px solid #9bc6f3;
          border-radius:11px;
          background:#ffffff;
          box-shadow:0 12px 30px rgba(16,36,68,.18);
          padding:5px;
          z-index:100;
        }

        .hierarchy-search-results.open { display:block; }

        .search-result,
        .move-target {
          width:100%;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          text-align:left;
          border:0;
          border-radius:8px;
          padding:8px 9px;
          background:#ffffff;
        }

        .search-result:hover,
        .move-target:hover {
          background:#eef6ff;
        }

        .search-result span,
        .move-target span {
          min-width:0;
          display:flex;
          flex-direction:column;
          gap:2px;
        }

        .search-result strong,
        .move-target strong {
          color:var(--ink);
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }

        .search-result small,
        .move-target small {
          color:#0b5eae;
          font-size:9px;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }

        .search-result b,
        .move-target b {
          color:#0a6ed1;
          font-size:10px;
          white-space:nowrap;
        }

        .search-empty {
          padding:12px;
          color:var(--ink-2);
          font-size:11px;
          line-height:1.4;
        }

        .level-control {
          display:flex;
          align-items:center;
          gap:6px;
          height:36px;
          border:1px solid #b8d7f7;
          border-radius:9px;
          padding:0 7px 0 9px;
          background:#f8fcff;
          white-space:nowrap;
        }

        .level-control span {
          font-size:11px;
          font-weight:900;
          color:#0b5eae;
        }

        .level-control select {
          border:0;
          background:transparent;
          color:var(--ink);
          font-size:11.5px;
          font-weight:900;
          outline:none;
        }

        .focus-active,
        .active-filter {
          background:#eaf4ff;
          border-color:#67a9e8;
          color:#0b5eae;
        }

        .breadcrumb {
          display:flex;
          align-items:center;
          gap:4px;
          min-width:0;
          max-width:420px;
          overflow:hidden;
          color:#0b5eae;
          font-size:10px;
          font-weight:800;
        }

        .breadcrumb span {
          min-width:0;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }

        .breadcrumb i {
          font-style:normal;
          color:#75a8d9;
        }

        .performance-pill {
          margin-left:auto;
          border:1px solid #a7dabc;
          background:#eefaf4;
          color:#0f7d43;
          border-radius:999px;
          padding:4px 8px;
          font-size:9.5px;
          font-weight:900;
          white-space:nowrap;
        }

        .prototype-status {
          display:inline-flex;
          align-items:center;
          gap:6px;
          margin-top:6px;
          padding:4px 8px;
          border:1px solid #0a6ed1;
          border-radius:999px;
          background:#eef6ff;
          color:#0757a6;
          font-size:10px;
          line-height:1;
          font-weight:900;
          letter-spacing:.04em;
          white-space:nowrap;
        }

        .prototype-status .status-dot {
          width:7px;
          height:7px;
          border-radius:999px;
          background:#0f7d43;
          box-shadow:0 0 0 3px rgba(15,125,67,.12);
        }

        .info-dialog-backdrop {
          position:absolute;
          inset:0;
          z-index:650;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:24px;
          background:rgba(5,18,38,.46);
          backdrop-filter:blur(5px);
        }

        .info-dialog {
          width:min(760px,94%);
          max-height:84%;
          overflow:auto;
          border:1px solid #6aa8e7;
          border-radius:18px;
          background:#ffffff;
          box-shadow:0 24px 70px rgba(5,18,38,.30);
          padding:18px;
          color:#102544;
        }

        .info-dialog-head {
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:14px;
          padding-bottom:12px;
          border-bottom:1px solid #b9d8f8;
        }

        .info-dialog-head span {
          display:block;
          color:#0a5fb6;
          font-size:10px;
          font-weight:900;
          letter-spacing:.12em;
          text-transform:uppercase;
          margin-bottom:4px;
        }

        .info-dialog-head strong {
          color:#102544;
          font-size:22px;
          line-height:1.15;
        }

        .info-grid {
          display:grid;
          grid-template-columns:repeat(3,minmax(0,1fr));
          gap:10px;
          margin-top:14px;
        }

        .info-section {
          border:1px solid #b8d7f7;
          border-radius:12px;
          background:#f8fcff;
          padding:12px;
        }

        .info-section h3 {
          margin:0 0 8px;
          color:#0757a6;
          font-size:13px;
        }

        .info-section ul {
          margin:0;
          padding-left:18px;
          color:#102544;
          font-size:11.5px;
          line-height:1.55;
          font-weight:700;
        }

        .info-warning {
          margin-top:12px;
          border:1px solid #0a6ed1;
          border-radius:11px;
          padding:10px 12px;
          background:#eaf4ff;
          color:#102544;
          font-size:11.5px;
          line-height:1.45;
          font-weight:800;
        }

        /* High-contrast dark mode. No grey typography is used. */
        .theme-dark {
          --bg:#06101f;
          --panel:#0d2039;
          --ink:#ffffff;
          --ink-2:#9fd0ff;
          --blue:#55aaff;
          --blue-2:#8bc7ff;
          --blue-soft:#123454;
          --line:#438cd2;
          --line-soft:#244f7c;
          --green:#43d68d;
          background:#06101f;
          color:#ffffff;
        }

        .theme-dark .topbar,
        .theme-dark .hierarchy-nav,
        .theme-dark .side,
        .theme-dark .compact-table,
        .theme-dark .search-result,
        .theme-dark .move-target,
        .theme-dark .hint-card,
        .theme-dark .impact,
        .theme-dark .scenario-card,
        .theme-dark .move-dialog,
        .theme-dark .save-dialog,
        .theme-dark .info-dialog {
          background:#0d2039;
          color:#ffffff;
          border-color:#438cd2;
        }

        .theme-dark .meta-strip,
        .theme-dark .level-control,
        .theme-dark .hierarchy-search-results,
        .theme-dark .scenario-compare,
        .theme-dark .summary-hero,
        .theme-dark .summary-item,
        .theme-dark .impact-list-row,
        .theme-dark .history-item,
        .theme-dark .technical-grid,
        .theme-dark .info-section,
        .theme-dark .info-warning {
          background:#102b49;
          color:#ffffff;
          border-color:#438cd2;
        }

        .theme-dark .workspace {
          background:#07182b;
        }

        .theme-dark .workspace.orientation-horizontal,
        .theme-dark .workspace.orientation-vertical {
          background-color:#07182b;
          background-image:radial-gradient(circle,#2d679d 1px,transparent 1px);
        }

        .theme-dark button,
        .theme-dark .pill,
        .theme-dark .pan-hint,
        .theme-dark .compact-child-count,
        .theme-dark .performance-pill {
          background:#143454;
          color:#ffffff;
          border-color:#5aa9f0;
        }

        .theme-dark button:hover:not(:disabled),
        .theme-dark .search-result:hover,
        .theme-dark .move-target:hover {
          background:#1a4975;
          color:#ffffff;
        }

        .theme-dark button.primary {
          background:#0a6ed1;
          border-color:#74b9ff;
          color:#ffffff;
        }

        .theme-dark .view-switch,
        .theme-dark .orientation-switch,
        .theme-dark .zoom-controls {
          background:#102b49;
          border-color:#438cd2;
        }

        .theme-dark .view-switch button.active,
        .theme-dark .orientation-switch button.active,
        .theme-dark .side-tabs button.active {
          background:#ffffff;
          color:#08213d;
        }

        .theme-dark .hierarchy-search input,
        .theme-dark .move-search,
        .theme-dark .save-field input,
        .theme-dark .save-field textarea,
        .theme-dark .scenario-compare-selects select {
          background:#07182b;
          color:#ffffff;
          border-color:#5aa9f0;
        }

        .theme-dark input::placeholder,
        .theme-dark textarea::placeholder {
          color:#9fd0ff;
          opacity:1;
        }

        .theme-dark .compact-sticky-context,
        .theme-dark .compact-head {
          background:#143454;
          color:#ffffff;
          border-color:#438cd2;
          box-shadow:0 5px 16px rgba(0,0,0,.24);
        }

        .theme-dark .compact-sticky-context span,
        .theme-dark .compact-sticky-context strong,
        .theme-dark .compact-sticky-context small,
        .theme-dark .compact-head,
        .theme-dark .compact-head span,
        .theme-dark .compact-label,
        .theme-dark .compact-value,
        .theme-dark .compact-row.root-row .compact-label,
        .theme-dark .compact-row.root-row .compact-value,
        .theme-dark .compact-row.branch-row .compact-label,
        .theme-dark .compact-row.branch-row .compact-value {
          color:#ffffff;
        }

        .theme-dark .compact-row {
          background:#0d2039;
          color:#ffffff;
          border-bottom-color:#244f7c;
        }

        .theme-dark .compact-row.branch-row {
          background:#123454;
          border-bottom-color:#438cd2;
        }

        .theme-dark .compact-row.root-row {
          background:#17466f;
          box-shadow:inset 4px 0 0 #43d68d;
        }

        .theme-dark .node-card,
        .theme-dark .node-card.branch,
        .theme-dark .node-card.root {
          background:#102b49;
          color:#ffffff;
          border-color:#5aa9f0;
          box-shadow:0 8px 24px rgba(0,0,0,.24);
        }

        .theme-dark .node-label,
        .theme-dark .node-value,
        .theme-dark .side-title,
        .theme-dark .impact-name,
        .theme-dark .metric-value,
        .theme-dark .compare-title,
        .theme-dark .compare-row,
        .theme-dark .summary-node-name,
        .theme-dark .history-copy strong,
        .theme-dark .technical-grid > strong,
        .theme-dark .technical-grid > code,
        .theme-dark .scenario-card-name,
        .theme-dark .info-dialog-head strong,
        .theme-dark .info-section ul,
        .theme-dark .info-warning {
          color:#ffffff;
        }

        .theme-dark .subtitle,
        .theme-dark .hint-card,
        .theme-dark .scenario-note,
        .theme-dark .metric-sub,
        .theme-dark .scenario-description,
        .theme-dark .history-copy small,
        .theme-dark .search-empty,
        .theme-dark .preview-placeholder,
        .theme-dark .move-hint {
          color:#9fd0ff;
        }

        .theme-dark .pill strong,
        .theme-dark .eyebrow,
        .theme-dark .level-control span,
        .theme-dark .breadcrumb,
        .theme-dark .side-title,
        .theme-dark .summary-section-title,
        .theme-dark .info-dialog-head span,
        .theme-dark .info-section h3 {
          color:#8bc7ff;
        }

        .theme-dark .node-delta.up,
        .theme-dark .compact-delta.up,
        .theme-dark .impact-delta.up,
        .theme-dark .impact-gain {
          color:#ffffff;
          background:#0d5032;
          border-color:#43d68d;
        }

        .theme-dark .node-delta.down,
        .theme-dark .compact-delta.down,
        .theme-dark .impact-delta.down,
        .theme-dark .impact-loss {
          color:#ffffff;
          background:#5b1d27;
          border-color:#ff7182;
        }

        .theme-dark .technical-grid > span {
          background:#143454;
          color:#8bc7ff;
        }

        .theme-dark .hero-mark {
          background:#0d2039;
          border-color:#5aa9f0;
        }

        .theme-dark .prototype-status {
          background:#123454;
          color:#ffffff;
          border-color:#5aa9f0;
        }

        .content {
          flex:1;
          min-height:0;
          display:grid;
          grid-template-columns:minmax(0,1fr) 330px;
        }

        .workspace {
          position:relative;
          min-width:0;
          min-height:0;
          background:#f7fbff;
          overflow:auto;
          scroll-behavior:auto;
        }

        .workspace.compact-dragging {
          overscroll-behavior:contain;
        }

        .workspace[class*="orientation-"] {
          cursor:grab;
          touch-action:pan-x pan-y;
          overscroll-behavior:contain;
        }

        .workspace[class*="orientation-"].panning {
          cursor:grabbing;
          user-select:none;
        }

        .workspace[class*="orientation-"] .node-card {
          cursor:pointer;
        }

        .workspace[class*="orientation-"] .node-card[draggable="true"] {
          cursor:grab;
        }

        .pan-hint {
          position:sticky;
          left:12px;
          top:10px;
          z-index:20;
          width:max-content;
          pointer-events:none;
          padding:5px 8px;
          border:1px solid #b8d7f7;
          border-radius:999px;
          background:rgba(255,255,255,.92);
          color:#0b5eae;
          font-size:10px;
          font-weight:800;
          box-shadow:0 3px 10px rgba(16,36,68,.06);
          backdrop-filter:blur(5px);
        }

        .canvas {
          position:relative;
          background-image:radial-gradient(circle at 1px 1px, rgba(134,184,236,.30) 1px, transparent 0);
          background-size:18px 18px;
        }

        .zoom-stage {
          position:absolute;
          left:0;
          top:0;
          transform-origin:top left;
        }

        svg.edges {
          position:absolute;
          inset:0;
          pointer-events:none;
          overflow:visible;
          animation:edgeIn 260ms ease;
        }

        .edge {
          fill:none;
          stroke:#7eafe3;
          stroke-width:2;
        }

        .node-card {
          position:absolute;
          width:${NODE_W}px;
          height:${NODE_H}px;
          border-radius:14px;
          background:#ffffff;
          border:1px solid #9ac7f3;
          box-shadow:0 6px 18px rgba(16,36,68,.08);
          padding:8px 10px;
          cursor:pointer;
          user-select:none;
          will-change:transform,opacity;
          transition:border-color 150ms ease, box-shadow 150ms ease, background 150ms ease;
        }

        .node-card.branch {
          background:linear-gradient(180deg,#f7fbff,#edf6ff);
          border-color:#7fb6ed;
        }

        .node-card.root {
          background:linear-gradient(145deg,#ffffff,#e6f4ff);
          border-color:#4d9ce5;
          box-shadow:0 8px 24px rgba(10,110,209,.14);
        }

        .node-card.changed {
          box-shadow:0 8px 24px rgba(10,110,209,.16);
        }

        .node-card::before {
          content:"";
          position:absolute;
          left:0;
          top:9px;
          bottom:9px;
          width:3px;
          border-radius:0 3px 3px 0;
          background:var(--blue);
        }

        .node-card.root::before { background:var(--green); }
        .node-card[draggable="true"] { cursor:grab; }
        .node-card[draggable="true"]:active { cursor:grabbing; }

        .node-card:hover,
        .compact-row:hover {
          border-color:#4d9ce5;
          background:#f8fcff;
        }

        .node-card.selected,
        .compact-row.selected {
          outline:3px solid rgba(10,110,209,.18);
          border-color:var(--blue);
          box-shadow:0 9px 28px rgba(10,110,209,.18);
        }

        .selection-badge {
          position:absolute;
          top:-9px;
          right:-9px;
          z-index:5;
          width:24px;
          height:24px;
          display:grid;
          place-items:center;
          border-radius:999px;
          border:2px solid #ffffff;
          background:#0a6ed1;
          color:#ffffff;
          font-size:13px;
          font-weight:1000;
          box-shadow:0 4px 12px rgba(10,110,209,.28);
        }

        .multi-check,
        .multi-check-spacer {
          width:20px;
          height:20px;
          flex:0 0 20px;
          margin-right:7px;
        }

        .multi-check {
          display:grid;
          place-items:center;
          padding:0;
          border:2px solid #5f9fdf;
          border-radius:5px;
          background:#ffffff;
          color:#ffffff;
          font-size:12px;
          font-weight:1000;
          line-height:1;
          box-shadow:none;
        }

        .multi-check:hover { background:#eaf4ff; }
        .multi-check.checked {
          border-color:#0a6ed1;
          background:#0a6ed1;
          color:#ffffff;
        }

        .multi-check-spacer { display:inline-block; }


        .node-card.drop-target,
        .compact-row.drop-target {
          outline:4px solid rgba(15,125,67,.18);
          border-color:var(--green);
          background:#effcf5;
          box-shadow:0 0 0 6px rgba(15,125,67,.08), 0 10px 28px rgba(15,125,67,.16);
          animation:dropPulse 900ms ease-in-out infinite;
        }

        .node-card.dragging,
        .compact-row.dragging { opacity:.36; }

        .branch-closing {
          transition:opacity 145ms ease, transform 145ms ease !important;
          opacity:0 !important;
          transform:translateX(-10px) scale(.93) !important;
          transform-origin:left center;
        }

        .orientation-vertical .branch-closing {
          transform:translateY(-10px) scale(.93) !important;
          transform-origin:center top;
        }

        .node-top {
          display:flex;
          align-items:center;
          gap:5px;
          min-width:0;
        }

        .toggle-btn {
          width:18px;
          height:18px;
          border-radius:999px;
          border:1px solid #8ec0f1;
          background:#eef6ff;
          color:#0a5fb6;
          font-size:11px;
          font-weight:900;
          display:flex;
          align-items:center;
          justify-content:center;
          line-height:1;
          padding:0;
          box-shadow:none;
          flex:0 0 auto;
        }

        .toggle-spacer {
          width:18px;
          height:18px;
          flex:0 0 auto;
        }

        .drag-grip {
          color:#0a5fb6;
          font-size:11px;
          line-height:1;
          width:9px;
          flex:0 0 auto;
        }

        .drag-spacer {
          width:9px;
          height:1px;
          flex:0 0 auto;
        }

        .node-label {
          min-width:0;
          flex:1;
          font-size:13px;
          line-height:1.15;
          font-weight:900;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
          color:var(--ink);
        }

        .node-value-row {
          margin-top:6px;
          padding-left:32px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:5px;
          min-width:0;
        }

        .node-value {
          min-width:0;
          font-size:14.5px;
          line-height:1;
          font-weight:900;
          letter-spacing:-.01em;
          color:var(--ink);
          white-space:nowrap;
          font-variant-numeric:tabular-nums;
        }

        .node-delta,
        .compact-delta,
        .impact-delta {
          display:inline-flex;
          align-items:center;
          justify-content:center;
          white-space:nowrap;
          border-radius:999px;
          padding:2px 5px;
          font-size:8.5px;
          line-height:1.2;
          font-weight:900;
          font-variant-numeric:tabular-nums;
        }

        .node-delta.up,
        .compact-delta.up,
        .impact-delta.up {
          color:#0b6d3b;
          background:#e6f7ee;
          border:1px solid #a6ddbf;
        }

        .node-delta.down,
        .compact-delta.down,
        .impact-delta.down {
          color:#a52a2a;
          background:#fff0f0;
          border:1px solid #f0bbbb;
        }

        .node-descendants {
          position:absolute;
          right:7px;
          bottom:-9px;
          border:1px solid #a8cdf7;
          background:#ffffff;
          border-radius:999px;
          padding:2px 5px;
          color:#0b5eae;
          font-size:8px;
          font-weight:900;
          box-shadow:0 3px 8px rgba(16,36,68,.06);
        }

        .located {
          animation:locatedPulse 1.05s ease !important;
        }

        .compact-sticky-context {
          position:sticky;
          top:0;
          z-index:18;
          display:grid;
          grid-template-columns:auto minmax(0,1fr) auto;
          align-items:center;
          gap:8px;
          min-height:42px;
          padding:0 14px;
          border-bottom:1px solid #acd0f6;
          background:rgba(255,255,255,.97);
          box-shadow:0 5px 16px rgba(16,36,68,.06);
          backdrop-filter:blur(7px);
        }
        .compact-sticky-context span { color:#0b5eae; font-size:10px; font-weight:900; letter-spacing:.10em; text-transform:uppercase; }
        .compact-sticky-context strong { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--ink); font-size:12px; }
        .compact-sticky-context small { color:#17345c; font-size:9.5px; font-weight:700; white-space:nowrap; }

        .compact-wrap {
          min-width:560px;
          padding:12px 14px 18px;
        }

        .compact-table {
          width:100%;
          max-width:960px;
          background:#ffffff;
          border:1px solid #add0f5;
          border-radius:13px;
          overflow:visible;
          box-shadow:0 5px 18px rgba(16,36,68,.05);
        }

        .compact-head {
          position:sticky;
          top:42px;
          z-index:17;
          display:grid;
          grid-template-columns:minmax(300px,1fr) 230px;
          align-items:center;
          min-height:40px;
          padding:0 12px;
          background:#eef6ff;
          border-bottom:1px solid #b9d8f8;
          color:var(--blue-2);
          font-size:11px;
          font-weight:900;
          letter-spacing:.09em;
          text-transform:uppercase;
        }

        .compact-head { border-radius:13px 13px 0 0; box-shadow:0 4px 12px rgba(16,36,68,.06); }
        .compact-head span:last-child { text-align:right; }

        .compact-row {
          height:${COMPACT_ROW_H}px;
          min-height:${COMPACT_ROW_H}px;
          content-visibility:auto;
          contain-intrinsic-size:auto ${COMPACT_ROW_H}px;
          display:grid;
          grid-template-columns:minmax(300px,1fr) 230px;
          align-items:center;
          padding:0 12px;
          border:0;
          border-bottom:1px solid #dbeafb;
          background:#ffffff;
          cursor:pointer;
          user-select:none;
          will-change:transform,opacity;
        }

        .compact-row:last-child { border-bottom:0; }
        .compact-row[draggable="true"] { cursor:grab; }

        .compact-row.branch-row {
          background:#eef6ff;
          border-bottom-color:#bfdcff;
        }

        .compact-row.branch-row .compact-label {
          color:#0b4f94;
          font-weight:900;
        }

        .compact-row.branch-row .compact-value {
          color:#0b4f94;
          font-weight:900;
        }

        .compact-row.root-row {
          background:#dfeeff;
          box-shadow:inset 4px 0 0 #0f7d43;
        }

        .compact-row.root-row .compact-label,
        .compact-row.root-row .compact-value {
          color:#102544;
        }

        .compact-main {
          display:flex;
          align-items:center;
          min-width:0;
          padding-left:calc(var(--depth) * 22px);
        }

        .compact-label {
          min-width:0;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
          font-size:13.5px;
          font-weight:800;
          color:var(--ink);
        }

        .compact-child-count {
          margin-left:7px;
          border:1px solid #b8d7f7;
          border-radius:999px;
          padding:1px 5px;
          color:#0b5eae;
          background:#ffffff;
          font-size:8.5px;
          font-weight:900;
          flex:0 0 auto;
        }

        .virtual-spacer {
          width:100%;
          pointer-events:none;
        }

        .compact-value-wrap {
          display:flex;
          align-items:center;
          justify-content:flex-end;
          gap:7px;
          min-width:0;
        }

        .compact-value {
          text-align:right;
          font-size:13.5px;
          font-weight:900;
          white-space:nowrap;
          color:var(--ink);
          font-variant-numeric:tabular-nums;
        }

        .compact-delta {
          font-size:9px;
          padding:2px 6px;
        }

        .side {
          border-left:1px solid #c5ddfa;
          background:#ffffff;
          padding:17px;
          overflow:auto;
        }

        .side-title {
          font-size:13px;
          font-weight:900;
          color:var(--blue-2);
          text-transform:uppercase;
          letter-spacing:.10em;
          margin-bottom:10px;
        }

        .hint-card,
        .impact {
          border:1px solid #a8cdf7;
          background:#ffffff;
          border-radius:14px;
          padding:13px;
          box-shadow:0 5px 16px rgba(16,36,68,.05);
        }

        .hint-card {
          color:var(--ink-2);
          font-size:13px;
          line-height:1.5;
        }

        .hint-card strong {
          display:block;
          color:var(--ink);
          font-size:17px;
          line-height:1.2;
          margin-bottom:7px;
        }

        .impact-name {
          font-size:20px;
          line-height:1.1;
          font-weight:900;
          color:var(--ink);
          margin-bottom:5px;
        }

        .impact-path {
          font-size:12.5px;
          color:var(--ink-2);
          line-height:1.45;
          margin-bottom:13px;
          font-weight:700;
        }

        .metric {
          padding:10px 0;
          border-top:1px solid #d7e9ff;
        }

        .metric:first-of-type {
          border-top:0;
          padding-top:0;
        }

        .metric-label {
          font-size:10px;
          text-transform:uppercase;
          letter-spacing:.1em;
          font-weight:900;
          color:#0d5db8;
        }

        .metric-value {
          margin-top:4px;
          font-size:23px;
          line-height:1.05;
          font-weight:900;
          color:var(--ink);
          animation:impactPop 320ms cubic-bezier(.22,.8,.28,1);
        }

        .metric-sub {
          margin-top:3px;
          font-size:12px;
          color:var(--ink-2);
          font-weight:700;
        }

        .compare {
          margin-top:12px;
          display:grid;
          gap:9px;
        }

        .compare-card {
          border:1px solid #b9d7f8;
          border-radius:11px;
          padding:9px;
          background:#f7fbff;
        }

        .compare-head {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:7px;
        }

        .compare-title {
          min-width:0;
          font-size:12.5px;
          font-weight:900;
          color:var(--ink);
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        }

        .compare-card.impact-loss { border-left:4px solid #d04a4a; }
        .compare-card.impact-gain { border-left:4px solid #15945a; }

        .impact-delta {
          flex:0 0 auto;
          font-size:9px;
          padding:3px 6px;
        }

        .compare-row {
          margin-top:7px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:8px;
          font-size:12px;
          color:var(--ink-2);
          font-weight:700;
        }

        .compare-row strong { color:var(--ink); }

        .scenario-note {
          margin-top:11px;
          padding:10px;
          border-radius:11px;
          background:#eef6ff;
          border:1px solid #b6d6fb;
          color:var(--ink);
          font-size:11.5px;
          line-height:1.4;
          font-weight:700;
        }

        .selected-actions {
          margin-top:12px;
          display:flex;
          flex-wrap:wrap;
          gap:6px;
        }

        .selected-actions button {
          font-size:10.5px;
          padding:6px 8px;
        }

        .side-tabs {
          display:grid;
          grid-template-columns:repeat(3,minmax(0,1fr));
          gap:3px;
          padding:3px;
          margin-bottom:11px;
          border:1px solid #b8d7f7;
          background:#eef6ff;
          border-radius:10px;
        }

        .side-tabs button {
          border:0;
          background:transparent;
        }

        .side-tabs.four-tabs { grid-template-columns:repeat(4,minmax(0,1fr)); }
        .side-tabs button { min-width:0; padding:6px 5px; font-size:9px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .side-tabs button.active {
          background:#ffffff;
          color:var(--ink);
          box-shadow:0 2px 7px rgba(10,110,209,.14);
        }

        .summary-hero {
          display:flex;
          align-items:baseline;
          gap:7px;
          padding:11px 12px;
          border:1px solid #9bc6f3;
          border-radius:12px;
          background:linear-gradient(145deg,#ffffff,#eef6ff);
        }

        .summary-hero strong {
          font-size:28px;
          line-height:1;
          color:#0a6ed1;
        }

        .summary-hero span {
          color:var(--ink-2);
          font-size:11px;
          font-weight:800;
        }

        .summary-section-title {
          margin:14px 0 6px;
          color:#0b5eae;
          font-size:9.5px;
          font-weight:900;
          letter-spacing:.10em;
          text-transform:uppercase;
        }

        .summary-list,
        .impact-list {
          display:grid;
          gap:5px;
        }

        .summary-item,
        .impact-list-row {
          width:100%;
          border:1px solid #c4def9;
          border-radius:9px;
          background:#ffffff;
          padding:8px;
          text-align:left;
        }

        .summary-item {
          display:flex;
          flex-direction:column;
          gap:3px;
        }

        .summary-node-name {
          color:var(--ink);
          font-size:11.5px;
          font-weight:900;
        }

        .summary-path {
          color:#0b5eae;
          font-size:9.5px;
          font-weight:700;
        }

        .impact-list-row {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:8px;
          color:var(--ink);
          font-size:10.5px;
          font-weight:800;
        }

        .impact-list-row strong.up { color:#0f7d43; }
        .impact-list-row strong.down { color:#a52a2a; }

        .scenario-description { margin-top:3px; color:var(--ink-2); font-size:10.5px; line-height:1.35; font-weight:700; }
        .scenario-compare { border:1px solid #b8d7f7; border-radius:12px; padding:10px; background:#f8fcff; }
        .scenario-compare-selects { display:grid; grid-template-columns:1fr 1fr; gap:7px; }
        .scenario-compare-selects label { display:grid; gap:4px; }
        .scenario-compare-selects span { color:#0b5eae; font-size:9px; font-weight:900; text-transform:uppercase; letter-spacing:.08em; }
        .scenario-compare-selects select { min-width:0; height:30px; border:1px solid #a8cdf7; border-radius:8px; background:#ffffff; color:var(--ink); font-size:10px; font-weight:800; padding:0 7px; }
        .scenario-compare-result { margin-top:9px; display:grid; gap:7px; }
        .compare-summary-head { display:flex; align-items:baseline; gap:7px; }
        .compare-summary-head strong { color:#0a6ed1; font-size:22px; }
        .compare-summary-head span { color:var(--ink-2); font-size:10px; font-weight:800; }
        .scenario-warning { border:1px solid #e6c26a; background:#fff8e7; color:#7b5700; border-radius:9px; padding:8px; font-size:10px; line-height:1.35; font-weight:800; }
        .history-list { display:grid; gap:5px; }
        .history-item { width:100%; display:grid; grid-template-columns:24px minmax(0,1fr) auto; align-items:center; gap:7px; text-align:left; border:1px solid #c6def8; background:#ffffff; border-radius:9px; padding:7px; }
        .history-index { width:22px; height:22px; display:grid; place-items:center; border-radius:999px; background:#eaf4ff; color:#0b5eae; font-size:9px; font-weight:900; }
        .history-copy { min-width:0; display:grid; gap:2px; }
        .history-copy strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--ink); font-size:10.5px; }
        .history-copy small { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#0b5eae; font-size:9px; font-weight:700; }
        .history-item > b { color:var(--ink); font-size:9.5px; white-space:nowrap; }
        .history-actions { margin-top:8px; }
        .technical-grid { display:grid; grid-template-columns:108px minmax(0,1fr); gap:0; border:1px solid #bfdafa; border-radius:10px; overflow:hidden; background:#ffffff; }
        .technical-grid > * { min-width:0; padding:7px 8px; border-bottom:1px solid #e0edfb; font-size:9.5px; }
        .technical-grid > *:nth-last-child(-n+2) { border-bottom:0; }
        .technical-grid > span { color:#0b5eae; font-weight:900; background:#f4f9ff; }
        .technical-grid > strong, .technical-grid > code { color:var(--ink); overflow-wrap:anywhere; }
        .technical-copy { margin-top:8px; width:100%; }
        .move-preview-live { display:none; margin-top:12px; }
        .move-preview-live.open { display:block; }
        .move-preview-card { border:1px solid #75b1ed; border-radius:12px; background:linear-gradient(150deg,#ffffff,#f2f8ff); padding:10px; box-shadow:0 7px 20px rgba(10,110,209,.08); }
        .move-preview-card.compact-preview { box-shadow:none; }
        .move-preview-eyebrow { color:#0b5eae; font-size:8.5px; font-weight:900; letter-spacing:.10em; text-transform:uppercase; }
        .move-preview-title { margin-top:3px; color:var(--ink); font-size:13px; font-weight:900; line-height:1.2; }
        .preview-kpi { margin-top:8px; display:flex; align-items:center; justify-content:space-between; gap:8px; border-top:1px solid #d6e8fb; border-bottom:1px solid #d6e8fb; padding:7px 0; }
        .preview-kpi span { color:#0b5eae; font-size:9px; font-weight:900; text-transform:uppercase; }
        .preview-kpi strong { color:var(--ink); font-size:14px; }
        .preview-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:7px; }
        .preview-grid > div { min-width:0; display:grid; gap:3px; border:1px solid #c8e0fa; border-radius:8px; padding:7px; background:#ffffff; }
        .preview-grid span { color:var(--ink); font-size:9.5px; font-weight:900; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .preview-grid small { color:var(--ink-2); font-size:8.5px; font-weight:700; }
        .preview-grid b { font-size:9.5px; }
        .preview-grid b.up { color:#0f7d43; }
        .preview-grid b.down { color:#a52a2a; }
        .preview-warnings, .preview-ok, .preview-invalid, .preview-placeholder { margin-top:7px; border-radius:8px; padding:7px; font-size:9px; line-height:1.35; font-weight:800; }
        .preview-warnings { display:grid; gap:3px; border:1px solid #e6c26a; background:#fff8e7; color:#7b5700; }
        .preview-ok { border:1px solid #a6d7b8; background:#eefaf3; color:#0f7040; }
        .preview-invalid { border:1px solid #efb8b8; background:#fff1f1; color:#9d2b2b; }
        .preview-placeholder { border:1px dashed #a8cdf7; background:#f8fcff; color:var(--ink-2); }
        .move-dialog-preview { max-height:220px; overflow:auto; }
        .save-dialog-backdrop { position:absolute; inset:0; z-index:520; display:flex; align-items:center; justify-content:center; padding:24px; background:rgba(16,37,68,.20); backdrop-filter:blur(4px); }
        .save-dialog { width:min(520px,90%); display:grid; gap:11px; border:1px solid #7fb6ed; border-radius:16px; background:#ffffff; box-shadow:0 22px 55px rgba(16,36,68,.25); padding:14px; }
        .save-field { display:grid; gap:5px; }
        .save-field > span { color:#0b5eae; font-size:9px; font-weight:900; letter-spacing:.08em; text-transform:uppercase; }
        .save-field input, .save-field textarea { width:100%; box-sizing:border-box; border:1px solid #9bc6f3; border-radius:9px; background:#ffffff; color:var(--ink); outline:none; font:inherit; font-size:11.5px; font-weight:700; padding:8px 9px; }
        .save-field textarea { min-height:74px; resize:vertical; line-height:1.4; }
        .save-field input:focus, .save-field textarea:focus { border-color:#0a6ed1; box-shadow:0 0 0 3px rgba(10,110,209,.10); }
        .save-summary { display:flex; align-items:baseline; gap:7px; padding:8px 10px; border:1px solid #c7e0fa; border-radius:9px; background:#f5faff; }
        .save-summary strong { color:#0a6ed1; font-size:20px; }
        .save-summary span { color:var(--ink-2); font-size:10px; font-weight:800; }
        .save-actions { display:flex; justify-content:flex-end; gap:7px; }

        .preview-source-list {
          display:flex;
          flex-wrap:wrap;
          gap:5px;
          margin-top:7px;
        }

        .preview-source-list span {
          border:1px solid #b8d7f7;
          border-radius:999px;
          background:#ffffff;
          color:#102544;
          padding:3px 6px;
          font-size:8.8px;
          font-weight:800;
        }

        .preview-source-list b { color:#0b5eae; }
        .multi-preview-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }

        .multi-impact-list {
          display:grid;
          gap:5px;
          margin-top:10px;
        }

        .multi-impact-row {
          display:grid;
          grid-template-columns:minmax(0,1fr) auto auto;
          align-items:center;
          gap:7px;
          border:1px solid #c5def8;
          border-radius:8px;
          background:#ffffff;
          padding:7px;
        }

        .multi-impact-row span {
          min-width:0;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
          color:#102544;
          font-size:10px;
          font-weight:900;
        }

        .multi-impact-row small { color:#365775; font-size:8.8px; font-weight:800; white-space:nowrap; }
        .multi-impact-row b { font-size:9.5px; white-space:nowrap; }
        .multi-impact-row b.up { color:#0f7d43; }
        .multi-impact-row b.down { color:#a52a2a; }

        .move-dialog-backdrop {
          position:absolute;
          inset:0;
          z-index:500;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:24px;
          background:rgba(16,37,68,.20);
          backdrop-filter:blur(4px);
        }

        .move-dialog {
          width:min(560px,90%);
          max-height:74%;
          display:flex;
          flex-direction:column;
          gap:10px;
          border:1px solid #7fb6ed;
          border-radius:16px;
          background:#ffffff;
          box-shadow:0 22px 55px rgba(16,36,68,.25);
          padding:14px;
        }

        .move-dialog-head {
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:12px;
        }

        .move-dialog-head div {
          display:flex;
          flex-direction:column;
          gap:3px;
        }

        .move-dialog-head span {
          color:#0b5eae;
          font-size:9px;
          font-weight:900;
          letter-spacing:.11em;
          text-transform:uppercase;
        }

        .move-dialog-head strong {
          color:var(--ink);
          font-size:20px;
          line-height:1.15;
        }

        .move-dialog-head > button {
          width:32px;
          height:32px;
          padding:0;
          font-size:20px;
          line-height:1;
        }

        .move-results {
          min-height:80px;
          max-height:330px;
          overflow:auto;
          border:1px solid #d0e5fb;
          border-radius:11px;
          padding:5px;
          background:#f8fcff;
        }

        .move-hint {
          color:var(--ink-2);
          font-size:9.5px;
          line-height:1.4;
          font-weight:700;
        }

        .scenario-manager {
          display:flex;
          flex-direction:column;
          gap:10px;
        }

        .scenario-manager-head {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:8px;
          margin-bottom:2px;
        }

        .scenario-count {
          font-size:11px;
          font-weight:900;
          color:var(--blue-2);
          white-space:nowrap;
        }

        .scenario-card {
          border:1px solid #a8cdf7;
          background:#ffffff;
          border-radius:13px;
          padding:11px;
          box-shadow:0 4px 14px rgba(16,36,68,.05);
        }

        .scenario-card.active {
          border-color:#0a6ed1;
          box-shadow:0 0 0 2px rgba(10,110,209,.12);
        }

        .scenario-card-name {
          font-size:15px;
          font-weight:900;
          color:var(--ink);
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        }

        .scenario-card-id {
          margin-top:3px;
          font-size:10px;
          line-height:1.35;
          font-weight:800;
          color:var(--blue-2);
          word-break:break-all;
        }

        .scenario-card-meta {
          margin-top:7px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:6px;
          color:var(--ink-2);
          font-size:10.5px;
          font-weight:700;
        }

        .scenario-card-actions {
          margin-top:9px;
          display:flex;
          flex-wrap:wrap;
          gap:5px;
        }

        .scenario-card-actions button {
          padding:5px 7px;
          font-size:10.5px;
        }

        .scenario-import {
          margin-top:2px;
          display:flex;
          gap:6px;
        }

        .scenario-empty {
          border:1px dashed #8fc0f2;
          border-radius:12px;
          padding:14px;
          background:#f8fcff;
          color:var(--ink-2);
          font-size:12px;
          line-height:1.45;
        }

        .empty {
          position:relative;
          height:100%;
          min-height:520px;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          text-align:center;
          padding:38px;
          background:
            radial-gradient(circle at 50% 32%, rgba(10,110,209,.10), transparent 32%),
            linear-gradient(180deg,#f9fcff,#f2f8ff);
          overflow:hidden;
        }

        .empty-grid {
          position:absolute;
          inset:0;
          background-image:radial-gradient(circle at 1px 1px, rgba(68,143,218,.22) 1px, transparent 0);
          background-size:22px 22px;
          mask-image:linear-gradient(to bottom, transparent 1%, #000 22%, #000 74%, transparent 100%);
          opacity:.52;
          pointer-events:none;
        }

        .empty-aurora {
          position:absolute;
          width:330px;
          height:330px;
          border-radius:999px;
          filter:blur(52px);
          opacity:.17;
          pointer-events:none;
          animation:auroraFloat 7s ease-in-out infinite;
        }

        .empty-aurora.a1 {
          left:12%;
          top:10%;
          background:#2c92ec;
        }

        .empty-aurora.a2 {
          right:10%;
          top:25%;
          background:#58b7ff;
          animation-delay:-3.4s;
        }

        .empty-stage {
          position:relative;
          width:min(560px,82vw);
          height:220px;
          margin-bottom:18px;
          z-index:2;
          filter:drop-shadow(0 12px 25px rgba(10,110,209,.08));
        }

        .empty-stage-links {
          position:absolute;
          inset:0;
          width:100%;
          height:100%;
          overflow:visible;
        }

        .empty-link {
          fill:none;
          stroke:#8cbce9;
          stroke-width:2;
          stroke-linecap:round;
          stroke-linejoin:round;
        }

        .empty-link.target-link {
          stroke:#4e9ee6;
          animation:targetLink 4.8s ease-in-out infinite;
        }

        .empty-flow-path {
          fill:none;
          stroke:#0a6ed1;
          stroke-width:3;
          stroke-linecap:round;
          stroke-dasharray:7 10;
          opacity:0;
          animation:flowDash 4.8s ease-in-out infinite;
        }

        .demo-node {
          position:absolute;
          width:150px;
          height:52px;
          border:1px solid #7fb6ed;
          border-radius:13px;
          background:rgba(255,255,255,.96);
          box-shadow:0 9px 24px rgba(16,36,68,.10);
          padding:8px 10px;
          text-align:left;
          color:var(--ink);
        }

        .demo-node span {
          display:block;
          font-size:11px;
          font-weight:900;
        }

        .demo-node strong {
          display:block;
          margin-top:5px;
          font-size:12px;
          color:#0b5eae;
        }

        .demo-root {
          left:205px;
          top:16px;
          border-color:#0a6ed1;
          background:linear-gradient(145deg,#ffffff,#e5f3ff);
          animation:rootGlow 4.8s ease-in-out infinite;
        }

        .demo-left { left:70px; top:105px; }

        .demo-right {
          right:70px;
          top:105px;
          overflow:hidden;
          animation:homeCardPulse 4.8s ease-in-out infinite;
        }

        .demo-home-value {
          position:relative;
          display:block;
          margin-top:5px;
          min-height:14px;
        }

        .demo-home-value span {
          position:absolute;
          left:0;
          top:0;
          white-space:nowrap;
          display:block;
          font-size:12px;
          color:#0b5eae;
          font-weight:900;
        }

        .demo-home-value .home-before {
          opacity:1;
          animation:homeValueBefore 4.8s ease-in-out infinite;
        }

        .demo-home-value .home-after {
          opacity:0;
          transform:translateY(6px) scale(.96);
          color:#0f7d43;
          animation:homeValueAfter 4.8s ease-in-out infinite;
        }

        .demo-leaf {
          position:absolute;
          height:30px;
          min-width:94px;
          padding:7px 10px;
          border:1px solid #b5d5f4;
          border-radius:9px;
          background:#ffffff;
          color:var(--ink);
          font-size:10px;
          font-weight:900;
          box-shadow:0 5px 13px rgba(16,36,68,.06);
          white-space:nowrap;
        }

        .demo-l1 { left:20px; bottom:0; }
        .demo-r1 { right:151px; bottom:0; }
        .demo-r2 { right:22px; bottom:0; }

        .demo-moving {
          left:145px;
          bottom:0;
          min-width:104px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:7px;
          border-color:#0a6ed1;
          color:#0b5eae;
          animation:shiftNode 4.8s cubic-bezier(.22,.8,.28,1) infinite;
          z-index:5;
        }

        .demo-moving b {
          font-size:9px;
          color:var(--ink);
        }

        .demo-impact {
          position:absolute;
          right:103px;
          bottom:38px;
          border-radius:999px;
          padding:5px 8px;
          background:#e7f8ef;
          border:1px solid #9fd9ba;
          color:#0f7d43;
          font-size:9px;
          font-weight:900;
          opacity:0;
          transform:translateY(6px) scale(.9);
          animation:impactAppear 4.8s ease-in-out infinite;
          z-index:6;
        }

        .demo-pulse {
          position:absolute;
          right:120px;
          bottom:3px;
          width:72px;
          height:38px;
          border-radius:12px;
          border:2px solid rgba(15,125,67,.45);
          opacity:0;
          animation:targetPulse 4.8s ease-in-out infinite;
        }

        .empty-kicker {
          position:relative;
          z-index:2;
          font-size:10px;
          font-weight:900;
          letter-spacing:.16em;
          text-transform:uppercase;
          color:var(--blue-2);
        }

        .empty-title {
          position:relative;
          z-index:2;
          margin-top:5px;
          font-size:31px;
          line-height:1;
          font-weight:950;
          letter-spacing:-.04em;
          color:var(--ink);
        }

        .empty-copy {
          position:relative;
          z-index:2;
          max-width:700px;
          margin-top:9px;
          font-size:15px;
          color:var(--ink-2);
          line-height:1.5;
          font-weight:700;
        }

        .empty-bind {
          position:relative;
          z-index:2;
          margin-top:17px;
          display:flex;
          align-items:center;
          justify-content:center;
          flex-wrap:wrap;
          gap:7px;
          padding:7px 10px;
          border:1px solid #b3d5f6;
          border-radius:999px;
          background:rgba(255,255,255,.86);
          box-shadow:0 5px 18px rgba(16,36,68,.05);
          color:var(--ink-2);
          font-size:11px;
        }

        .empty-bind span {
          color:var(--blue-2);
          font-weight:900;
          text-transform:uppercase;
          letter-spacing:.08em;
        }

        .empty-bind b { color:var(--ink); }
        .empty-bind i { color:#6c9ed1; font-style:normal; font-weight:900; }

        .empty-capabilities {
          position:relative;
          z-index:2;
          margin-top:11px;
          display:flex;
          flex-wrap:wrap;
          justify-content:center;
          gap:7px;
        }

        .empty-capabilities span {
          border:1px solid #b9d8f8;
          background:#ffffff;
          border-radius:999px;
          padding:5px 9px;
          color:#0b5eae;
          font-size:10.5px;
          font-weight:900;
          box-shadow:0 3px 10px rgba(10,110,209,.05);
        }


        .empty-hint {
          position:relative;
          z-index:2;
          max-width:560px;
          margin-top:10px;
          font-size:11.5px;
          color:var(--blue-2);
          font-weight:800;
        }

        @keyframes pulse1 {
          0%,100% { transform:translate(0,0); }
          50% { transform:translate(1px,-2px); }
        }

        @keyframes pulse2 {
          0%,100% { transform:translate(0,0); }
          50% { transform:translate(-1px,2px); }
        }

        @keyframes pulse3 {
          0%,100% { transform:translate(0,0); }
          50% { transform:translate(-2px,-1px); }
        }

        @keyframes spin {
          from { transform:rotate(0deg); }
          to { transform:rotate(360deg); }
        }

        /* Final dark-mode overrides are deliberately placed last.
           This prevents any later component rule from producing low contrast. */
        .theme-dark .side-tabs,
        .theme-dark .compare-card,
        .theme-dark .scenario-note,
        .theme-dark .move-preview-card,
        .theme-dark .preview-grid > div,
        .theme-dark .save-summary,
        .theme-dark .move-results,
        .theme-dark .scenario-warning,
        .theme-dark .preview-warnings,
        .theme-dark .preview-ok,
        .theme-dark .preview-invalid,
        .theme-dark .preview-placeholder,
        .theme-dark .history-index,
        .theme-dark .toggle-btn,
        .theme-dark .node-descendants {
          background:#102b49;
          color:#ffffff;
          border-color:#5aa9f0;
        }

        .theme-dark .side-tabs button {
          background:transparent;
          color:#ffffff;
        }

        .theme-dark .side-tabs button.active {
          background:#ffffff;
          color:#08213d;
        }

        .theme-dark .compare-row,
        .theme-dark .compare-row strong,
        .theme-dark .scenario-note,
        .theme-dark .summary-hero span,
        .theme-dark .compare-summary-head span,
        .theme-dark .scenario-warning,
        .theme-dark .history-index,
        .theme-dark .history-item > b,
        .theme-dark .move-preview-title,
        .theme-dark .preview-kpi strong,
        .theme-dark .preview-grid span,
        .theme-dark .preview-grid small,
        .theme-dark .preview-warnings,
        .theme-dark .preview-ok,
        .theme-dark .preview-invalid,
        .theme-dark .preview-placeholder,
        .theme-dark .save-summary span,
        .theme-dark .toggle-btn,
        .theme-dark .node-descendants {
          color:#ffffff;
        }

        .theme-dark .metric-label,
        .theme-dark .summary-path,
        .theme-dark .scenario-compare-selects span,
        .theme-dark .move-preview-eyebrow,
        .theme-dark .preview-kpi span,
        .theme-dark .save-field > span,
        .theme-dark .drag-grip {
          color:#8bc7ff;
        }

        .theme-dark .summary-hero {
          background:#143454;
          border-color:#5aa9f0;
        }

        .theme-dark .summary-hero strong,
        .theme-dark .compare-summary-head strong,
        .theme-dark .save-summary strong {
          color:#ffffff;
        }

        .theme-dark .selection-badge {
          border-color:#081a2d;
          background:#38a7ff;
          color:#07192a;
        }

        .theme-dark .multi-check {
          border-color:#6ec1ff;
          background:#102f4e;
          color:#ffffff;
        }

        .theme-dark .multi-check:hover { background:#17466f; }
        .theme-dark .multi-check.checked {
          border-color:#7dcbff;
          background:#7dcbff;
          color:#07192a;
        }

        .theme-dark .multi-selection-status {
          border-color:#69bfff;
          background:#123a60;
          color:#ffffff;
        }
        .theme-dark .multi-selection-status strong,
        .theme-dark .multi-selection-status span { color:#ffffff; }
        .theme-dark .selection-notice {
          border-color:#f1c75b;
          background:#3b2d08;
          color:#ffffff;
        }
        .theme-dark .preview-source-list span,
        .theme-dark .multi-impact-row {
          border-color:#4a92c9;
          background:#102f4e;
          color:#ffffff;
        }
        .theme-dark .preview-source-list span,
        .theme-dark .preview-source-list b,
        .theme-dark .multi-impact-row span,
        .theme-dark .multi-impact-row small { color:#ffffff; }

        .theme-dark .node-card:hover,
        .theme-dark .compact-row:hover {
          background:#1a4975;
          color:#ffffff;
          border-color:#74b9ff;
        }

        .theme-dark .node-card.drop-target,
        .theme-dark .compact-row.drop-target {
          background:#0d5032;
          color:#ffffff;
          border-color:#43d68d;
        }

        .theme-dark .scenario-warning,
        .theme-dark .preview-warnings {
          background:#5a4308;
          color:#ffffff;
          border-color:#ffd25f;
        }

        .theme-dark .preview-ok {
          background:#0d5032;
          color:#ffffff;
          border-color:#43d68d;
        }

        .theme-dark .preview-invalid {
          background:#5b1d27;
          color:#ffffff;
          border-color:#ff7182;
        }

        .theme-dark .impact-list-row strong.up,
        .theme-dark .preview-grid b.up {
          color:#64f0aa;
        }

        .theme-dark .impact-list-row strong.down,
        .theme-dark .preview-grid b.down {
          color:#ff8b98;
        }

        .theme-dark .metric,
        .theme-dark .preview-kpi,
        .theme-dark .info-dialog-head {
          border-color:#438cd2;
        }

        @media (max-width: 1180px) {
          .topbar {
            align-items:flex-start;
            flex-wrap:wrap;
          }
          .toolbar {
            width:100%;
            justify-content:flex-start;
          }
        }

        @keyframes heroShiftNode {
          0%, 24% { transform:translateX(0); }
          42%, 72% { transform:translateX(26px); }
          90%, 100% { transform:translateX(0); }
        }

        @keyframes heroOldLink {
          0%,24% { opacity:1; }
          38%,74% { opacity:.12; }
          90%,100% { opacity:1; }
        }

        @keyframes heroNewLink {
          0%,24% { opacity:.12; }
          42%,72% { opacity:1; }
          90%,100% { opacity:.12; }
        }

        @keyframes edgeIn {
          from { opacity:.15; }
          to { opacity:1; }
        }


        @keyframes locatedPulse {
          0%,100% { box-shadow:0 6px 18px rgba(16,36,68,.08); }
          30%,70% { box-shadow:0 0 0 7px rgba(10,110,209,.14), 0 10px 28px rgba(10,110,209,.18); }
        }

        @keyframes dropPulse {
          0%,100% { box-shadow:0 0 0 4px rgba(15,125,67,.08), 0 10px 28px rgba(15,125,67,.14); }
          50% { box-shadow:0 0 0 9px rgba(15,125,67,.12), 0 12px 32px rgba(15,125,67,.20); }
        }

        @keyframes impactPop {
          from { opacity:.25; transform:translateY(4px) scale(.94); }
          to { opacity:1; transform:translateY(0) scale(1); }
        }

        @keyframes auroraFloat {
          0%,100% { transform:translate3d(0,0,0) scale(1); }
          50% { transform:translate3d(20px,-12px,0) scale(1.08); }
        }

        @keyframes rootGlow {
          0%,100% { box-shadow:0 9px 24px rgba(16,36,68,.10); }
          50% { box-shadow:0 12px 30px rgba(10,110,209,.22); }
        }

        @keyframes shiftNode {
          0%,24% { transform:translateX(0); }
          42%,68% { transform:translateX(217px); }
          86%,100% { transform:translateX(0); }
        }

        @keyframes flowDash {
          0%,24% { opacity:0; stroke-dashoffset:20; }
          32%,62% { opacity:.8; stroke-dashoffset:-28; }
          70%,100% { opacity:0; stroke-dashoffset:-45; }
        }

        @keyframes targetPulse {
          0%,35%,76%,100% { opacity:0; transform:scale(.92); }
          44%,66% { opacity:1; transform:scale(1.08); }
        }

        @keyframes targetLink {
          0%,30%,78%,100% { stroke:#8cbce9; stroke-width:2; }
          42%,68% { stroke:#15945a; stroke-width:3; }
        }

        @keyframes impactAppear {
          0%,40%,74%,100% { opacity:0; transform:translateY(6px) scale(.9); }
          49%,67% { opacity:1; transform:translateY(0) scale(1); }
        }

        @keyframes homeCardPulse {
          0%,42%,100% {
            border-color:#7fb6ed;
            box-shadow:0 9px 24px rgba(16,36,68,.10);
            transform:scale(1);
          }
          54%,68% {
            border-color:#15945a;
            box-shadow:0 12px 28px rgba(21,148,90,.20);
            transform:scale(1.03);
          }
          78% {
            border-color:#7fb6ed;
            box-shadow:0 9px 24px rgba(16,36,68,.10);
            transform:scale(1);
          }
        }

        @keyframes homeValueBefore {
          0%,46% {
            opacity:1;
            transform:translateY(0) scale(1);
          }
          54%,74% {
            opacity:0;
            transform:translateY(-6px) scale(.96);
          }
          86%,100% {
            opacity:1;
            transform:translateY(0) scale(1);
          }
        }

        @keyframes homeValueAfter {
          0%,48% {
            opacity:0;
            transform:translateY(6px) scale(.96);
          }
          58%,74% {
            opacity:1;
            transform:translateY(0) scale(1);
          }
          86%,100% {
            opacity:0;
            transform:translateY(6px) scale(.96);
          }
        }

        @media (max-width:1080px) {
          .compact-sticky-context small { display:none; }
          .scenario-compare-selects { grid-template-columns:1fr; }
          .info-grid { grid-template-columns:1fr; }
          .content { grid-template-columns:minmax(0,1fr) 265px; }
          .subtitle { display:none; }
          .toolbar { gap:4px; }
        }
      `;

      if (!model) {
        this._root.innerHTML =
          `<style>${css}</style><div class="shell" tabindex="0" style="${this._uiScaleStyle()}">${this._emptyState()}</div>`;
        return;
      }

      if (!this._hierarchyIndex) this._rebuildHierarchyIndex();

      const visibilityOptions = this._visibilityOptions(true);
      const layout = layoutTree(
        model.nodes,
        this._collapsed,
        this._graphOrientation,
        this._hierarchyIndex,
        visibilityOptions
      );
      const visibleIds = new Set(Object.keys(layout.positions));
      const rows = compactRows(
        model.nodes,
        this._collapsed,
        this._hierarchyIndex,
        visibilityOptions
      );
      this._compactVirtualRows = rows.length;

      const nodeHtml = Object.values(model.nodes)
        .filter(node => visibleIds.has(node.id))
        .map(node => {
          const pos = layout.positions[node.id];
          const isRoot = !node.parentId || !model.nodes[node.parentId];
          const canDrag = !isRoot;
          const expandable = hasChildren(model.nodes, node.id, this._hierarchyIndex);
          const isCollapsed = !!this._collapsed[node.id];
          const descendantCount = expandable
            ? descendantSet(model.nodes, node.id, this._hierarchyIndex).size
            : 0;
          const scenarioValue = this._scenarioValue(node.id);
          const delta = Number(node.scenarioDelta || 0);
          const deltaText = delta
            ? `${delta > 0 ? '+' : '−'}${formatNumber(Math.abs(delta), model.unit)}`
            : '';

          return `
            <div class="node-card ${node.isNode === true ? 'branch' : 'leaf'} ${isRoot ? 'root' : ''} ${delta ? 'changed' : ''} ${this._isSelected(node.id) ? 'selected' : ''}"
                 data-id="${esc(node.id)}"
                 draggable="${canDrag ? 'true' : 'false'}"
                 style="left:${pos.x}px;top:${pos.y}px">
              ${this._isSelected(node.id) ? `<span class="selection-badge" title="Selected">✓</span>` : ''}
              <div class="node-top">
                ${expandable
                  ? `<button class="toggle-btn" type="button" title="${isCollapsed ? 'Expand' : 'Collapse'}">${isCollapsed ? '▸' : '▾'}</button>`
                  : `<span class="toggle-spacer"></span>`}
                ${canDrag ? '<span class="drag-grip">⋮⋮</span>' : '<span class="drag-spacer"></span>'}
                <span class="node-label" title="${esc(node.label)}">${esc(node.label)}</span>
              </div>
              <div class="node-value-row">
                <span class="node-value">${esc(formatNumber(scenarioValue, model.unit))}</span>
                ${delta ? `<span class="node-delta ${delta > 0 ? 'up' : 'down'}">${esc(deltaText)}</span>` : ''}
              </div>
              ${expandable && (isCollapsed || (this._maxVisibleDepth > 0 && pos.depth >= this._maxVisibleDepth))
                ? `<div class="node-descendants">${descendantCount.toLocaleString()} descendant${descendantCount === 1 ? '' : 's'}</div>`
                : ''}
            </div>`;
        })
        .join('');

      const edgeHtml = Object.values(model.nodes)
        .filter(node => visibleIds.has(node.id))
        .map(node => {
          if (!node.parentId ||
              !model.nodes[node.parentId] ||
              !visibleIds.has(node.parentId)) return '';

          const p = layout.positions[node.parentId];
          const c = layout.positions[node.id];
          if (!p || !c) return '';

          if (this._graphOrientation === 'vertical') {
            const x1 = p.x + NODE_W / 2;
            const y1 = p.y + NODE_H;
            const x2 = c.x + NODE_W / 2;
            const y2 = c.y;
            const mid = y1 + (y2 - y1) / 2;
            return `<path class="edge" d="M ${x1} ${y1} V ${mid} H ${x2} V ${y2}" />`;
          }

          const x1 = p.x + NODE_W;
          const y1 = p.y + NODE_H / 2;
          const x2 = c.x;
          const y2 = c.y + NODE_H / 2;
          const mid = x1 + (x2 - x1) / 2;

          return `<path class="edge" d="M ${x1} ${y1} H ${mid} V ${y2} H ${x2}" />`;
        })
        .join('');

      const compactVirtualized = rows.length > COMPACT_VIRTUAL_THRESHOLD;

      if (compactVirtualized) {
        const maxStart = Math.max(0, rows.length - COMPACT_VIRTUAL_WINDOW);
        this._compactWindowStart = Math.min(
          maxStart,
          Math.max(0, Number(this._compactWindowStart || 0))
        );
      } else {
        this._compactWindowStart = 0;
      }

      const compactStart = compactVirtualized ? this._compactWindowStart : 0;
      const compactEnd = compactVirtualized
        ? Math.min(rows.length, compactStart + COMPACT_VIRTUAL_WINDOW)
        : rows.length;

      const compactSlice = rows.slice(compactStart, compactEnd);

      const compactHtml = compactSlice.map(({ node, depth }) => {
        const isRoot = !node.parentId || !model.nodes[node.parentId] || node.id === this._focusRootId;
        const canDrag = !!node.parentId;
        const expandable = hasChildren(model.nodes, node.id, this._hierarchyIndex);
        const isCollapsed = !!this._collapsed[node.id];
        const delta = Number(node.scenarioDelta || 0);
        const descendantCount = expandable
          ? descendantSet(model.nodes, node.id, this._hierarchyIndex).size
          : 0;
        const deltaText = delta
          ? `${delta > 0 ? '+' : '−'}${formatNumber(Math.abs(delta), model.unit)}`
          : '';

        return `
          <div class="compact-row ${node.isNode === true ? 'branch-row' : 'leaf-row'} ${isRoot ? 'root-row' : ''} ${this._isSelected(node.id) ? 'selected' : ''}"
               data-id="${esc(node.id)}"
               draggable="${canDrag ? 'true' : 'false'}">
            <div class="compact-main" style="--depth:${depth}">
              ${canDrag ? `<button class="multi-check ${this._isSelected(node.id) ? 'checked' : ''}" type="button" draggable="false" title="${this._isSelected(node.id) ? 'Remove from selection' : 'Add to multi-selection'}" aria-label="Toggle selection">${this._isSelected(node.id) ? '✓' : ''}</button>` : `<span class="multi-check-spacer"></span>`}
              ${expandable
                ? `<button class="toggle-btn" type="button" title="${isCollapsed ? 'Expand' : 'Collapse'}">${isCollapsed ? '▸' : '▾'}</button>`
                : `<span class="toggle-spacer"></span>`}
              ${canDrag ? '<span class="drag-grip">⋮⋮</span>' : '<span class="drag-spacer"></span>'}
              <span class="compact-label" title="${esc(node.label)}">${esc(node.label)}</span>
              ${expandable && isCollapsed
                ? `<span class="compact-child-count">${descendantCount.toLocaleString()}</span>`
                : ''}
            </div>
            <div class="compact-value-wrap">
              <span class="compact-value">${esc(formatNumber(this._scenarioValue(node.id), model.unit))}</span>
              ${delta ? `<span class="compact-delta ${delta > 0 ? 'up' : 'down'}">${esc(deltaText)}</span>` : ''}
            </div>
          </div>`;
      }).join('');

      const compactTopSpacer = compactVirtualized
        ? `<div class="virtual-spacer" style="height:${compactStart * COMPACT_ROW_H}px"></div>`
        : '';

      const compactBottomSpacer = compactVirtualized
        ? `<div class="virtual-spacer" style="height:${Math.max(0, rows.length - compactEnd) * COMPACT_ROW_H}px"></div>`
        : '';

      const move = this._lastMove;
      const savedScenarios = this._readScenarioStore();

      const compareAId = this._compareScenarioAId || savedScenarios[0]?.id || '';
      const compareBId = this._compareScenarioBId || savedScenarios.find(s => s.id !== compareAId)?.id || '';
      this._compareScenarioAId = compareAId;
      this._compareScenarioBId = compareBId;
      const scenarioComparison = compareAId && compareBId ? this._scenarioComparison(compareAId, compareBId) : null;

      const comparisonHtml = scenarioComparison ? `
        <div class="scenario-compare-result">
          ${scenarioComparison.sameContext ? `
            <div class="compare-summary-head"><strong>${scenarioComparison.structural.length}</strong><span>structural difference${scenarioComparison.structural.length === 1 ? '' : 's'}</span></div>
            ${scenarioComparison.structural.length ? `<div class="summary-list">${scenarioComparison.structural.slice(0,15).map(item => `
              <button class="summary-item" data-summary-node="${esc(item.id)}" type="button">
                <span class="summary-node-name">${esc(item.label)}</span>
                <span class="summary-path">${esc(item.aParentLabel)} → ${esc(item.bParentLabel)}</span>
              </button>`).join('')}</div>` : `<div class="scenario-empty">The two scenarios use the same structure.</div>`}
            ${scenarioComparison.impacts.length ? `<div class="summary-section-title">Largest KPI differences, B vs A</div><div class="impact-list">${scenarioComparison.impacts.slice(0,12).map(item => `
              <button class="impact-list-row" data-summary-node="${esc(item.id)}" type="button"><span>${esc(item.label)}</span><strong class="${item.difference > 0 ? 'up' : 'down'}">${item.difference > 0 ? '+' : '−'}${esc(formatNumber(Math.abs(item.difference), model.unit))}</strong></button>`).join('')}</div>` : ''}
          ` : `<div class="scenario-warning">Scenario comparison requires the same SAC data context in which both scenarios were saved.</div>`}
        </div>` : '';

      const scenarioManagerHtml = `
        <div class="scenario-manager">
          <div class="scenario-manager-head">
            <div><div class="side-title">Saved scenarios</div><div class="scenario-count">${savedScenarios.length} local scenario${savedScenarios.length === 1 ? '' : 's'}</div></div>
            <button data-action="scenario-manager">Close</button>
          </div>

          ${savedScenarios.length >= 2 ? `<div class="scenario-compare">
            <div class="summary-section-title">Compare scenarios</div>
            <div class="scenario-compare-selects">
              <label><span>Scenario A</span><select data-action="compare-a">${savedScenarios.map(s => `<option value="${esc(s.id)}" ${s.id===compareAId?'selected':''}>${esc(s.name||s.id)}</option>`).join('')}</select></label>
              <label><span>Scenario B</span><select data-action="compare-b">${savedScenarios.map(s => `<option value="${esc(s.id)}" ${s.id===compareBId?'selected':''}>${esc(s.name||s.id)}</option>`).join('')}</select></label>
            </div>${comparisonHtml}</div>` : ''}

          <div class="scenario-actions"><button class="primary" data-action="save-scenario">Save current</button><button data-action="import-scenario">Import JSON</button><input data-action="import-scenario-file" type="file" accept="application/json,.json" hidden></div>

          ${savedScenarios.length ? `<div class="scenario-list">${savedScenarios.map(scenario => `
            <div class="scenario-card ${this._activeScenarioId === scenario.id ? 'active' : ''}">
              <div class="scenario-card-main">
                <div class="scenario-card-name">${esc(scenario.name || scenario.id)}</div>
                ${scenario.description ? `<div class="scenario-description">${esc(scenario.description)}</div>` : ''}
                <div class="scenario-card-meta">${esc(scenario.id)} • ${(scenario.changes || []).length} change${(scenario.changes || []).length===1?'':'s'}${this._activeScenarioId===scenario.id && this._scenarioDirty ? ' • modified' : ''}</div>
              </div>
              <div class="scenario-card-actions"><button class="primary" data-load-scenario="${esc(scenario.id)}">Load</button><button data-export-scenario="${esc(scenario.id)}">Export JSON</button><button data-delete-scenario="${esc(scenario.id)}">Delete</button></div>
            </div>`).join('')}</div>` : `<div class="scenario-empty">No saved scenarios yet. Build a structure, then save it with a meaningful name.</div>`}
          <div class="scenario-note">Scenarios are stored locally in this browser. JSON export/import can be used to share or archive them.</div>
        </div>`;

      const selectedIds = this._selectedList();
      const selectedNodes = selectedIds.map(id => model.nodes[id]).filter(Boolean);
      const selected = selectedIds.length === 1 ? selectedNodes[0] : null;
      const selectedValue = this._selectionValue(selectedIds);
      const currentChanges = this._currentChanges();
      const scenarioImpacts = Object.values(model.nodes)
        .map(node => ({
          node,
          delta: Number(node.scenarioDelta || 0)
        }))
        .filter(item => Math.abs(item.delta) > 1e-9)
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

      const sideTabs = (this._hasScenarioChanges() || this._debugMode)
        ? `<div class="side-tabs ${this._debugMode ? 'four-tabs' : 'three-tabs'}">
             <button data-side-tab="impact" class="${this._sideTab === 'impact' ? 'active' : ''}">Last Move</button>
             <button data-side-tab="summary" class="${this._sideTab === 'summary' ? 'active' : ''}">Summary</button>
             <button data-side-tab="history" class="${this._sideTab === 'history' ? 'active' : ''}">History</button>
             ${this._debugMode ? `<button data-side-tab="technical" class="${this._sideTab === 'technical' ? 'active' : ''}">Technical</button>` : ''}
           </div>`
        : '';

      const selectedActions = selectedIds.length
        ? `<div class="selected-actions">
             ${selectedNodes.every(node => !!node.parentId) ? `<button data-action="move-selected">${selectedIds.length > 1 ? `Move ${selectedIds.length} nodes…` : 'Move to…'}</button>` : ''}
             ${selectedIds.length === 1 ? `<button data-action="focus-selected">Focus here</button>` : ''}
             ${selectedIds.length === 1 && this._hasScenarioChanges() ? `<button data-action="reset-branch">Reset branch</button>` : ''}
             ${selectedIds.length > 1 ? `<button data-action="clear-selection">Clear selection</button>` : ''}
           </div>`
        : '';

      const scenarioSummaryHtml = `
        <div class="side-title">Scenario summary</div>
        ${sideTabs}
        <div class="summary-hero">
          <strong>${currentChanges.length}</strong>
          <span>structural change${currentChanges.length === 1 ? '' : 's'}</span>
        </div>

        ${currentChanges.length
          ? `<div class="summary-section-title">Moved nodes</div>
             <div class="summary-list">
               ${currentChanges.slice(0, 30).map(change => `
                 <button class="summary-item" data-summary-node="${esc(change.nodeId)}" type="button">
                   <span class="summary-node-name">${esc(change.nodeLabel)}</span>
                   <span class="summary-path">${esc(change.fromParentLabel)} → ${esc(change.toParentLabel)}</span>
                 </button>`).join('')}
             </div>`
          : `<div class="scenario-empty">No structural changes in the current scenario.</div>`}

        ${scenarioImpacts.length
          ? `<div class="summary-section-title">Largest KPI impacts</div>
             <div class="impact-list">
               ${scenarioImpacts.slice(0, 16).map(item => `
                 <button class="impact-list-row" data-summary-node="${esc(item.node.id)}" type="button">
                   <span>${esc(item.node.label)}</span>
                   <strong class="${item.delta > 0 ? 'up' : 'down'}">${item.delta > 0 ? '+' : '−'}${esc(formatNumber(Math.abs(item.delta), model.unit))}</strong>
                 </button>`).join('')}
             </div>`
          : ''}

        <div class="scenario-note">The scenario remains local to SHIFT. The source SAP BW hierarchy is unchanged.</div>`;

      const historyHtml = `
        <div class="side-title">Move history</div>${sideTabs}
        ${(this._scenarioMoves || []).length ? `<div class="history-list">${(this._scenarioMoves || []).map((entry,index) => {
          const batchIds=Array.isArray(entry.sourceIds)?entry.sourceIds:[];
          const source=this._model.nodes[entry.sourceId]; const target=this._model.nodes[entry.targetId];
          const sourceLabel=batchIds.length ? `${batchIds.length} nodes` : (entry.sourceLabel||source?.label||entry.sourceId);
          const fromLabel=batchIds.length ? (entry.originLabels?.length ? entry.originLabels.join(', ') : 'Multiple parents') : (entry.fromParentLabel||(entry.fromParentId&&this._model.nodes[entry.fromParentId]?this._model.nodes[entry.fromParentId].label:'Previous parent'));
          const targetLabel=entry.targetLabel||target?.label||entry.targetId;
          const locateId=batchIds[0]||entry.sourceId||'';
          return `<button class="history-item" data-summary-node="${esc(locateId)}" type="button"><span class="history-index">${index+1}</span><span class="history-copy"><strong>${esc(sourceLabel)}</strong><small>${esc(fromLabel)} → ${esc(targetLabel)}</small></span>${Number.isFinite(Number(entry.shiftedValue))?`<b>${esc(formatNumber(Number(entry.shiftedValue),model.unit))}</b>`:''}</button>`;
        }).join('')}</div><div class="history-actions"><button data-action="undo" ${this._history.length?'':'disabled'}>Undo last move</button></div>` : `<div class="scenario-empty">No moves in the current scenario yet.</div>`}
        <div class="scenario-note">History follows the current SHIFT scenario. Undo removes the latest reversible move.</div>`;

      const debugSelected = selectedIds.length === 1 ? selectedNodes[0] : null;
      const debugBaselineParentId = debugSelected ? (this._baselineParents?.[debugSelected.id] || null) : null;
      const debugCurrentParentId = debugSelected?.parentId || null;
      const debugChildren = debugSelected ? childrenOf(model.nodes, debugSelected.id, this._hierarchyIndex) : [];
      const technicalHtml = `
        <div class="side-title">Technical mode</div>${sideTabs}
        ${debugSelected ? `<div class="technical-grid">
          <span>Label</span><strong>${esc(debugSelected.label)}</strong>
          <span>Member ID</span><code>${esc(debugSelected.id)}</code>
          <span>BW parent</span><code>${esc(debugBaselineParentId || 'Root')}</code>
          <span>Current parent</span><code>${esc(debugCurrentParentId || 'Root')}</code>
          <span>BW level</span><strong>${Number(this._baselineIndex?.depth?.get(debugSelected.id) ?? 0)+1}</strong>
          <span>Current level</span><strong>${Number(this._hierarchyIndex?.depth?.get(debugSelected.id) ?? 0)+1}</strong>
          <span>Node type</span><strong>${debugSelected.isNode ? 'Branch' : 'Leaf'}</strong>
          <span>Loaded children</span><strong>${debugChildren.length}</strong>
          <span>Value source</span><strong>${esc(debugSelected.valueSource || 'unknown')}</strong>
          <span>Direct KPI</span><strong>${debugSelected.hasDirectValue ? esc(formatNumber(Number(debugSelected.directValue||0),model.unit)) : 'none'}</strong>
          <span>Baseline KPI</span><strong>${esc(formatNumber(Number(debugSelected.value||0),model.unit))}</strong>
          <span>Scenario delta</span><strong>${esc(formatNumber(Number(debugSelected.scenarioDelta||0),model.unit))}</strong>
          <span>Scenario KPI</span><strong>${esc(formatNumber(this._scenarioValue(debugSelected.id),model.unit))}</strong>
        </div><button class="technical-copy" data-action="copy-technical">Copy technical info</button>` : `<div class="scenario-empty">Select a hierarchy node to inspect its technical state.</div>`}
        <div class="scenario-note">Technical mode is intended for testing and troubleshooting the current SAC BW Live binding.</div>`;

      let sideHtml;

      if (this._scenarioManagerOpen) {
        sideHtml = scenarioManagerHtml;
      } else if (this._sideTab === 'technical' && this._debugMode) {
        sideHtml = technicalHtml;
      } else if (this._sideTab === 'history') {
        sideHtml = historyHtml;
      } else if (this._sideTab === 'summary' && this._hasScenarioChanges()) {
        sideHtml = scenarioSummaryHtml;
      } else if (!move) {
        sideHtml = `
          <div class="side-title">Scenario impact</div>
          ${sideTabs}
          <div class="hint-card">
            <strong>${selectedIds.length > 1 ? `${selectedIds.length} hierarchy nodes selected` : selected ? esc(selected.label) : 'Start a restructuring scenario'}</strong>
            ${selectedIds.length > 1
              ? `Combined value: <b>${esc(formatNumber(selectedValue, model.unit))}</b><br><br>Move all selected nodes to one target parent as a single scenario action.`
              : selected
                ? `${esc(selected.isNode ? 'Branch' : 'Leaf')} value: <b>${esc(formatNumber(this._scenarioValue(selected.id), model.unit))}</b><br><br>Explore this node, focus the subtree, or move it to another valid parent.`
                : 'Use Graphical for orientation or Compact for dense controller work. Ctrl/Cmd click or the Compact checkboxes enable multi-selection.'}
            ${selectedActions}
          </div>
          <div class="scenario-note">SHIFT uses the current SAC filter context. The source BW hierarchy and master data remain unchanged.</div>`;
      } else if (move.isMulti) {
        sideHtml = `
          <div class="side-title">Scenario impact</div>
          ${sideTabs}
          <div class="impact">
            <div class="impact-name">${move.sourceCount} nodes moved together</div>
            <div class="impact-path">Moved to <b>${esc(move.newParentLabel)}</b> as one scenario action</div>
            <div class="metric"><div class="metric-label">Combined shifted value</div><div class="metric-value">${esc(formatNumber(move.shiftedValue,model.unit))}</div><div class="metric-sub">${esc(model.measureLabel)}</div></div>
            <div class="metric"><div class="metric-label">Affected structure</div><div class="metric-value">${move.affectedNodes}</div><div class="metric-sub">nodes across ${move.sourceCount} selected branches / leaves</div></div>
            <div class="multi-impact-list">
              ${(move.impacts||[]).slice(0,8).map(item => `<div class="multi-impact-row"><span>${esc(item.label)}</span><small>${esc(formatNumber(item.before,model.unit))} → ${esc(formatNumber(item.after,model.unit))}</small><b class="${item.delta>=0?'up':'down'}">${item.delta>=0?'+':'−'}${esc(formatNumber(Math.abs(item.delta),model.unit))}</b></div>`).join('')}
            </div>
            ${selectedActions}
          </div>
          <div class="scenario-note">The multi move is one local SHIFT scenario action. No BW writeback is performed.</div>`;
      } else {
        sideHtml = `
          <div class="side-title">Scenario impact</div>
          ${sideTabs}
          <div class="impact">
            <div class="impact-name">${esc(move.sourceLabel)}</div>
            <div class="impact-path">Moved from <b>${esc(move.oldParentLabel)}</b> to <b>${esc(move.newParentLabel)}</b></div>

            <div class="metric">
              <div class="metric-label">Shifted value</div>
              <div class="metric-value">${esc(formatNumber(move.shiftedValue, model.unit))}</div>
              <div class="metric-sub">${esc(model.measureLabel)}</div>
            </div>

            <div class="metric">
              <div class="metric-label">Affected structure</div>
              <div class="metric-value">${move.affectedNodes}</div>
              <div class="metric-sub">node${move.affectedNodes === 1 ? '' : 's'} moved with this branch</div>
            </div>

            <div class="compare">
              <div class="compare-card impact-loss">
                <div class="compare-head">
                  <div class="compare-title">${esc(move.oldParentLabel)}</div>
                  <span class="impact-delta down">−${esc(formatNumber(Math.abs(move.oldParentAfter - move.oldParentBefore), model.unit))}</span>
                </div>
                <div class="compare-row"><span>Before</span><strong>${esc(formatNumber(move.oldParentBefore, model.unit))}</strong></div>
                <div class="compare-row"><span>Scenario</span><strong>${esc(formatNumber(move.oldParentAfter, model.unit))}</strong></div>
              </div>

              <div class="compare-card impact-gain">
                <div class="compare-head">
                  <div class="compare-title">${esc(move.newParentLabel)}</div>
                  <span class="impact-delta up">+${esc(formatNumber(Math.abs(move.newParentAfter - move.newParentBefore), model.unit))}</span>
                </div>
                <div class="compare-row"><span>Before</span><strong>${esc(formatNumber(move.newParentBefore, model.unit))}</strong></div>
                <div class="compare-row"><span>Scenario</span><strong>${esc(formatNumber(move.newParentAfter, model.unit))}</strong></div>
              </div>
            </div>

            ${selectedActions}
          </div>

          <div class="scenario-note">All scenario calculations are local to this widget. No BW writeback is performed.</div>`;
      }

      const baseW = Math.max(layout.width, 720);
      const baseH = Math.max(layout.height, 390);
      this._lastLayoutBounds = { width: baseW, height: baseH };
      const scaledW = Math.ceil(baseW * this._zoom);
      const scaledH = Math.ceil(baseH * this._zoom);

      const graphicalView = `
        <div class="workspace orientation-${this._graphOrientation}">
          <div class="pan-hint">Drag background to pan</div>
          <div class="canvas" style="width:${scaledW}px;height:${scaledH}px">
            <div class="zoom-stage"
                 style="width:${baseW}px;height:${baseH}px;transform:scale(${this._zoom})">
              <svg class="edges" width="${baseW}" height="${baseH}">${edgeHtml}</svg>
              ${nodeHtml}
            </div>
          </div>
        </div>`;

      const compactInitialContext = rows[0]
        ? this._nodePath(rows[0].node.id, rows[0].node.isNode === true)
        : model.hierarchyLabel;

      const compactView = `
        <div class="workspace">
          <div class="compact-sticky-context">
            <span>Context</span>
            <strong data-sticky-path>${esc(compactInitialContext || model.hierarchyLabel)}</strong>
            <small>/ search • Ctrl/Cmd multi-select • ↑↓ navigate • Enter expand/collapse</small>
          </div>
          <div class="compact-wrap">
            <div class="compact-table">
              <div class="compact-head">
                <span>${esc(model.hierarchyLabel)}</span>
                <span>${esc(model.measureLabel)}${model.unit ? ` • ${esc(model.unit)}` : ''}</span>
              </div>
              ${compactTopSpacer}
              ${compactHtml}
              ${compactBottomSpacer}
            </div>
          </div>
        </div>`;

      this._root.innerHTML = `
        <style>${css}
        /* ================================================================
           v0.8.1 READABILITY PASS
           Larger type and click targets across the complete widget.
           Colors are intentionally untouched so the strict contrast rules
           from v0.8.0 remain unchanged in both Light and Dark Mode.
           ================================================================ */

        .eyebrow {
          font-size:12px;
        }

        .title {
          font-size:29px;
          line-height:1.05;
        }

        .subtitle {
          font-size:14px;
          line-height:1.4;
        }

        button {
          min-height:38px;
          padding:8px 12px;
          font-size:13px;
        }

        .pill {
          font-size:12.5px;
          padding:5px 10px;
        }

        .whatif-badge,
        .prototype-badge {
          font-size:11px;
        }

        .hierarchy-search input,
        .move-search {
          height:42px;
          padding:0 12px;
          font-size:14px;
        }

        .level-control {
          min-height:40px;
          padding:0 10px;
        }

        .level-control span {
          font-size:12px;
        }

        .level-control select {
          font-size:13px;
        }

        .breadcrumb {
          font-size:12px;
        }

        .performance-pill {
          font-size:11px;
        }

        .compact-sticky-context {
          min-height:48px;
          gap:10px;
          padding:0 14px;
        }

        .compact-sticky-context span {
          font-size:11px;
        }

        .compact-sticky-context strong {
          font-size:14px;
        }

        .compact-sticky-context small {
          font-size:11.5px;
        }

        .compact-head {
          top:48px;
          min-height:46px;
          padding:0 14px;
        }

        .compact-head span {
          font-size:12.5px;
          letter-spacing:.07em;
        }

        .compact-main {
          padding-left:calc(var(--depth) * 24px);
        }

        .compact-label {
          font-size:15px;
        }

        .compact-value {
          font-size:15px;
        }

        .compact-delta {
          font-size:10.5px;
          padding:3px 7px;
        }

        .compact-child-count {
          font-size:10.5px;
          padding:2px 6px;
        }

        .toggle-btn {
          width:26px;
          height:26px;
          min-width:26px;
          min-height:26px;
          padding:0;
          font-size:14px;
        }

        .drag-grip {
          font-size:14px;
        }

        .node-label {
          font-size:14.5px;
          line-height:1.2;
        }

        .node-value {
          font-size:16px;
        }

        .node-delta {
          font-size:10px;
          padding:3px 6px;
        }

        .node-descendants {
          font-size:9.5px;
          padding:3px 6px;
        }

        .side-title {
          font-size:14px;
          margin-bottom:12px;
        }

        .side-tabs button {
          padding:9px 7px;
          font-size:11.5px;
        }

        .hint-card,
        .impact {
          font-size:13.5px;
          line-height:1.5;
        }

        .impact-name {
          font-size:22px;
        }

        .impact-path {
          font-size:14px;
          line-height:1.5;
        }

        .metric-label {
          font-size:11.5px;
        }

        .metric-value {
          font-size:29px;
        }

        .metric-sub {
          font-size:13px;
        }

        .compare-title {
          font-size:13.5px;
        }

        .compare-row {
          font-size:13px;
        }

        .scenario-note {
          font-size:12px;
          line-height:1.5;
        }

        .summary-section-title {
          font-size:11px;
        }

        .summary-node-name {
          font-size:13px;
        }

        .summary-path {
          font-size:11.5px;
        }

        .impact-list-row {
          font-size:12.5px;
        }

        .history-copy strong {
          font-size:12.5px;
        }

        .history-copy small {
          font-size:11px;
        }

        .history-item > b {
          font-size:11.5px;
        }

        .technical-grid > * {
          font-size:11.5px;
          padding:8px 9px;
        }

        .scenario-card-name {
          font-size:13.5px;
        }

        .scenario-description {
          font-size:12px;
        }

        .scenario-card-meta {
          font-size:10.5px;
        }
        .move-dialog-head span,
        .save-field > span {
          font-size:10.5px;
        }

        .move-dialog-head strong {
          font-size:23px;
        }

        .save-field input,
        .save-field textarea {
          font-size:14px;
          padding:10px 11px;
        }

        .move-target strong,
        .search-result strong {
          font-size:13px;
        }

        .move-target small,
        .search-result small {
          font-size:11px;
        }

        .move-target b,
        .search-result b {
          font-size:11.5px;
        }

        .move-preview-title {
          font-size:15px;
        }

        .preview-kpi span {
          font-size:10.5px;
        }

        .preview-kpi strong {
          font-size:16px;
        }

        .preview-grid span {
          font-size:11px;
        }

        .preview-grid small {
          font-size:10px;
        }

        .preview-grid b {
          font-size:11px;
        }

        .preview-warnings,
        .preview-ok,
        .preview-invalid,
        .preview-placeholder {
          font-size:10.5px;
        }

        .multi-select-status,
        .selection-status,
        .selection-summary {
          font-size:12.5px;
        }

        .compact-checkbox,
        .multi-checkbox {
          width:22px;
          height:22px;
          min-width:22px;
          min-height:22px;
        }

        @media (max-width: 980px) {
          .title {
            font-size:25px;
          }

          .toolbar button {
            font-size:12px;
          }

          .compact-sticky-context small {
            display:none;
          }
        }


        /* ================================================================
           v0.8.2 RESPONSIVE TEXT SCALE + COMPACT ACTION BAR
           Content text can be adjusted from 85% to 120%. The primary top
           toolbar is deliberately excluded so actions remain compact and
           stay on one line on normal desktop SAC story canvases.
           ================================================================ */

        .topbar {
          gap:10px;
          padding:9px 12px;
        }

        .hero {
          flex:1 1 430px;
        }

        .toolbar {
          position:relative;
          flex:0 1 auto;
          flex-wrap:nowrap;
          gap:4px;
          white-space:nowrap;
        }

        .toolbar > button,
        .toolbar .view-switch button,
        .toolbar .orientation-switch button,
        .toolbar .zoom-controls button,
        .toolbar .scale-control > button {
          min-height:30px;
          height:30px;
          padding:4px 8px;
          border-radius:8px;
          font-size:10.8px;
          line-height:1;
        }

        .toolbar .view-switch,
        .toolbar .orientation-switch,
        .toolbar .zoom-controls {
          flex:0 0 auto;
          padding:1px;
          gap:1px;
          border-radius:9px;
        }

        .toolbar .zoom-label {
          min-width:38px;
          font-size:10.5px;
        }

        .scale-control {
          position:relative;
          flex:0 0 auto;
        }

        .scale-control > button {
          display:flex;
          align-items:center;
          gap:5px;
        }

        .scale-control > button .scale-aa {
          font-weight:950;
          letter-spacing:-.04em;
        }

        .scale-control > button [data-scale-label] {
          font-variant-numeric:tabular-nums;
        }

        .scale-popover {
          position:absolute;
          z-index:240;
          right:0;
          top:36px;
          width:272px;
          padding:12px;
          border:1px solid #75afe8;
          border-radius:13px;
          background:#ffffff;
          color:#102544;
          box-shadow:0 16px 36px rgba(16,36,68,.18);
          white-space:normal;
        }

        .scale-popover-head {
          display:flex;
          align-items:baseline;
          justify-content:space-between;
          gap:10px;
          margin-bottom:10px;
        }

        .scale-popover-head strong {
          font-size:13px;
          color:#102544;
        }

        .scale-popover-head span {
          font-size:11px;
          font-weight:900;
          color:#0b5eae;
        }

        .scale-range {
          width:100%;
          accent-color:#0a6ed1;
          cursor:pointer;
        }

        .scale-range-labels {
          display:flex;
          justify-content:space-between;
          margin-top:3px;
          color:#17345c;
          font-size:10px;
          font-weight:800;
        }

        .scale-presets {
          display:grid;
          grid-template-columns:repeat(3,1fr);
          gap:5px;
          margin-top:10px;
        }

        .scale-presets button {
          min-height:30px;
          padding:5px 6px;
          font-size:10.5px;
        }

        .scale-presets button.active {
          background:#e7f3ff;
          border-color:#4b9be4;
          color:#083f79;
        }

        .scale-help {
          margin-top:9px;
          font-size:10px;
          line-height:1.35;
          font-weight:700;
          color:#17345c;
        }

        /* Scaled content typography */
        .eyebrow { font-size:var(--shift-fs-eyebrow); }
        .title { font-size:var(--shift-fs-title); }
        .subtitle { font-size:var(--shift-fs-subtitle); }
        .pill { font-size:var(--shift-fs-pill); }

        .hierarchy-search input,
        .move-search,
        .level-control select,
        .breadcrumb,
        .performance-pill { font-size:var(--shift-fs-nav); }

        .level-control span,
        .search-result small,
        .move-target small { font-size:var(--shift-fs-nav-small); }

        .compact-sticky-context strong { font-size:var(--shift-fs-context); }
        .compact-sticky-context span,
        .compact-sticky-context small { font-size:var(--shift-fs-context-small); }
        .compact-head span { font-size:var(--shift-fs-table-head); }
        .compact-label,
        .compact-value { font-size:var(--shift-fs-compact); }
        .compact-delta,
        .compact-child-count { font-size:var(--shift-fs-compact-delta); }

        .node-label { font-size:var(--shift-fs-node); }
        .node-value { font-size:var(--shift-fs-node-value); }
        .node-delta,
        .node-descendants { font-size:var(--shift-fs-node-small); }

        .side-title { font-size:var(--shift-fs-side-title); }
        .hint-card,
        .impact,
        .impact-path,
        .metric-sub,
        .compare-title,
        .compare-row,
        .summary-node-name,
        .impact-list-row,
        .scenario-description,
        .history-copy strong,
        .technical-grid > * { font-size:var(--shift-fs-side); }

        .metric-label,
        .scenario-note,
        .summary-section-title,
        .summary-path,
        .history-copy small,
        .history-item > b,
        .scenario-card-meta { font-size:var(--shift-fs-side-small); }

        .metric-value { font-size:var(--shift-fs-side-kpi); }
        .move-dialog-head strong { font-size:var(--shift-fs-dialog-title); }
        .save-field input,
        .save-field textarea,
        .move-target strong,
        .search-result strong,
        .move-preview-title { font-size:var(--shift-fs-dialog); }
        .move-dialog-head span,
        .save-field > span,
        .move-target b,
        .search-result b,
        .preview-kpi span,
        .preview-grid small,
        .preview-warnings,
        .preview-ok,
        .preview-invalid,
        .preview-placeholder { font-size:var(--shift-fs-dialog-small); }

        /* Keep the action bar compact regardless of text scale. */
        .toolbar,
        .toolbar button,
        .toolbar .zoom-label,
        .toolbar .scale-popover,
        .toolbar .scale-popover * {
          --shift-toolbar-fixed:1;
        }

        .theme-dark .scale-popover {
          background:#0e2946;
          color:#ffffff;
          border-color:#69bfff;
        }
        .theme-dark .scale-popover-head strong,
        .theme-dark .scale-range-labels,
        .theme-dark .scale-help {
          color:#ffffff;
        }
        .theme-dark .scale-popover-head span {
          color:#8bc7ff;
        }
        .theme-dark .scale-presets button {
          background:#123a60;
          color:#ffffff;
          border-color:#5aa9f0;
        }
        .theme-dark .scale-presets button.active {
          background:#ffffff;
          color:#08213d;
          border-color:#ffffff;
        }

        @media (max-width:1380px) {
          .toolbar {
            flex-wrap:wrap;
            justify-content:flex-end;
          }
        }


        .header-purpose {
          margin-top:4px;
          font-size:12px;
          line-height:1.35;
          font-weight:750;
          color:var(--ink-2);
        }

        [data-theme="dark"] .header-purpose,
        .shell.dark .header-purpose,
        .dark .header-purpose {
          color:#ffffff;
        }

</style>
        <div class="shell ${this._themeMode === 'dark' ? 'theme-dark' : ''}" style="${this._uiScaleStyle()}">
          <div class="topbar">
            <div class="hero">
              <div class="hero-mark" aria-hidden="true" title="Hierarchy node shifts between branches">
                <div class="hero-tree-line root-left"></div>
                <div class="hero-tree-line root-right"></div>
                <div class="hero-tree-line left-child"></div>
                <div class="hero-tree-line right-child"></div>
                <div class="hero-tree-node root"></div>
                <div class="hero-tree-node left"></div>
                <div class="hero-tree-node right"></div>
                <div class="hero-tree-node shift"></div>
              </div>

              <div>
                <div class="eyebrow">What-if prototype for controllers</div>
                <div class="title">Hierarchy SHIFT</div>
                <div class="subtitle">SAP BW Live hierarchy scenarios in SAP Analytics Cloud</div>
                <div class="header-purpose">Explore alternative hierarchy structures and KPI impact locally. No BW writeback.</div>
                <div class="prototype-status"><span class="status-dot"></span>WHAT-IF PROTOTYPE · NO BW WRITEBACK</div>
              </div>
            </div>

            <div class="toolbar">
              <div class="view-switch">
                <button data-action="view-graphical" class="${this._viewMode === 'graphical' ? 'active' : ''}">Graphical</button>
                <button data-action="view-compact" class="${this._viewMode === 'compact' ? 'active' : ''}">Compact</button>
              </div>

              ${this._viewMode === 'graphical' ? `
                <div class="orientation-switch" title="Hierarchy direction">
                  <button data-action="orientation-horizontal" class="${this._graphOrientation === 'horizontal' ? 'active' : ''}" title="Left to right">→</button>
                  <button data-action="orientation-vertical" class="${this._graphOrientation === 'vertical' ? 'active' : ''}" title="Top to bottom">↓</button>
                </div>

                <div class="zoom-controls">
                  <button data-action="zoom-out" title="Zoom out">−</button>
                  <span class="zoom-label" data-action="zoom-reset" title="Reset zoom">${Math.round(this._zoom * 100)}%</span>
                  <button data-action="zoom-in" title="Zoom in">+</button>
                  <button data-action="zoom-fit" title="Fit hierarchy to view">Fit</button>
                </div>` : ''}

              <button data-action="expand-all">Expand all</button>
              <button data-action="collapse-all">Collapse</button>
              <button data-action="undo" ${this._history.length ? '' : 'disabled'}>Undo</button>
              <button data-action="reset" ${this._hasScenarioChanges() ? '' : 'disabled'}>Reset</button>
              ${this._viewMode === 'compact' ? `<button data-action="export-excel">Export Excel</button>` : ''}

              <div class="scale-control">
                <button data-action="toggle-scale" class="${this._scalePopoverOpen ? 'active-tool' : ''}" title="Adjust SHIFT text size">
                  <span class="scale-aa">Aa</span><span data-scale-label>${this._uiScalePercent}%</span>
                </button>
                ${this._scalePopoverOpen ? `
                  <div class="scale-popover" role="dialog" aria-label="SHIFT text size">
                    <div class="scale-popover-head">
                      <strong>Text size</strong>
                      <span data-scale-label>${this._uiScalePercent}%</span>
                    </div>
                    <input class="scale-range" data-action="ui-scale" type="range" min="85" max="120" step="5" value="${this._uiScalePercent}" aria-label="SHIFT text size percentage">
                    <div class="scale-range-labels"><span>85%</span><span>120%</span></div>
                    <div class="scale-presets">
                      <button type="button" data-scale-preset="90" class="${this._uiScalePercent === 90 ? 'active' : ''}">Compact 90%</button>
                      <button type="button" data-scale-preset="100" class="${this._uiScalePercent === 100 ? 'active' : ''}">Default 100%</button>
                      <button type="button" data-scale-preset="115" class="${this._uiScalePercent === 115 ? 'active' : ''}">Large 115%</button>
                    </div>
                    <div class="scale-help">Changes SHIFT content text only. The action bar stays compact.</div>
                  </div>` : ''}
              </div>

              <button data-action="open-info" title="What SHIFT does, does not do, and prototype boundaries">Info</button>
              <button data-action="toggle-theme" class="${this._themeMode === 'dark' ? 'active-tool' : ''}" title="Toggle high-contrast theme">${this._themeMode === 'dark' ? 'Light Mode' : 'Dark Mode'}</button>
              <button data-action="toggle-debug" class="${this._debugMode ? 'active-tool' : ''}">Technical</button>
              <button data-action="scenario-manager">Scenarios (${savedScenarios.length})</button>
              <button class="primary" data-action="save-scenario">Save Scenario</button>
            </div>
          </div>

          <div class="meta-strip">
            <span class="pill"><strong>${esc(model.hierarchyLabel)}</strong></span>
            <span class="pill">KPI: <strong>${esc(model.measureLabel)}</strong></span>
            <span class="pill bw-live-pill">Source: <strong>SAP BW Live Hierarchy</strong></span>
            <span class="pill">Context: <strong>SAC filters</strong></span>
            <span class="pill">Visible: <strong>${rows.length}</strong></span>
            <span class="pill">Hierarchy nodes: <strong>${Object.keys(model.nodes).length}</strong></span>
            ${this._activeScenarioId
              ? `<span class="pill">Scenario: <strong>${esc(this._activeScenarioName())}${this._scenarioDirty ? ' • modified' : ''}</strong></span>`
              : ''}
          </div>

          <div class="hierarchy-nav">
            <div class="hierarchy-search">
              <input
                data-action="hierarchy-search"
                type="search"
                autocomplete="off"
                placeholder="Search loaded hierarchy…"
                value="${esc(this._searchQuery)}">
              <div class="hierarchy-search-results"></div>
            </div>

            <label class="level-control">
              <span>Show to level</span>
              <select data-action="level-limit">
                <option value="0" ${this._maxVisibleDepth === 0 ? 'selected' : ''}>All</option>
                ${Array.from({ length: this._maxLevelOption() }, (_, i) => i + 1)
                  .map(level => `<option value="${level}" ${this._maxVisibleDepth === level ? 'selected' : ''}>${level}</option>`)
                  .join('')}
              </select>
            </label>

            ${selectedIds.length === 1
              ? `<button data-action="focus-selected">Focus on ${esc(model.nodes[this._selectedId]?.label || 'selected')}</button>`
              : ''}

            ${selectedIds.length > 1
              ? `<div class="multi-selection-status"><strong>${selectedIds.length} selected</strong><span>${esc(formatNumber(selectedValue,model.unit))}</span><button data-action="move-selected">Move all…</button><button data-action="clear-selection">Clear</button></div>`
              : ''}
            ${this._selectionNotice ? `<div class="selection-notice">${esc(this._selectionNotice)}</div>` : ''}

            ${this._focusRootId
              ? `<button data-action="clear-focus" class="focus-active">← Full hierarchy</button>`
              : ''}

            <button
              data-action="show-changed"
              class="${this._showChangedOnly ? 'active-filter' : ''}"
              ${this._hasScenarioChanges() ? '' : 'disabled'}>
              Changed only
            </button>

            ${this._focusRootId
              ? `<div class="breadcrumb">
                   ${this._focusBreadcrumb().map((node, index, arr) =>
                     `<span>${esc(node.label)}</span>${index < arr.length - 1 ? '<i>›</i>' : ''}`
                   ).join('')}
                 </div>`
              : ''}

            ${compactVirtualized && this._viewMode === 'compact'
              ? `<span class="performance-pill">Windowed rendering • ${rows.length.toLocaleString()} rows</span>`
              : ''}
          </div>

          <div class="content">
            ${this._viewMode === 'graphical' ? graphicalView : compactView}
            <aside class="side">${sideHtml}<div class="move-preview-live"></div></aside>
          </div>

          ${this._moveDialogOpen && this._moveSourceIds?.length
            ? `<div class="move-dialog-backdrop">
                 <div class="move-dialog">
                   <div class="move-dialog-head">
                     <div>
                       <span>${this._moveSourceIds.length > 1 ? 'Move selected hierarchy nodes' : 'Move hierarchy node'}</span>
                       <strong>${this._moveSourceIds.length > 1 ? `${this._moveSourceIds.length} nodes · ${esc(formatNumber(this._selectionValue(this._moveSourceIds),model.unit))}` : esc(model.nodes[this._moveSourceId]?.label || '')}</strong>
                     </div>
                     <button data-action="close-move-dialog" type="button">×</button>
                   </div>

                   <input
                     class="move-search"
                     data-action="move-search"
                     type="search"
                     autocomplete="off"
                     placeholder="Search target parent…">

                   <div class="move-results"></div>
                   <div class="move-dialog-preview"><div class="preview-placeholder">Hover a valid target to preview the KPI impact before moving.</div></div>
                   <div class="move-hint">Search is limited to hierarchy nodes currently loaded into SHIFT. Invalid descendants and the current parent are excluded. Level changes are shown as a warning, not blocked.</div>
                 </div>
               </div>`
            : ''}

          ${this._infoOpen ? `<div class="info-dialog-backdrop">
               <div class="info-dialog" role="dialog" aria-modal="true" aria-label="About Hierarchy SHIFT">
                 <div class="info-dialog-head">
                   <div>
                     <span>Hierarchy SHIFT</span>
                     <strong>SAP BW Live structural what-if analysis, not hierarchy maintenance</strong>
                   </div>
                   <button data-action="close-info" type="button" aria-label="Close">×</button>
                 </div>

                 <div class="info-grid">
                   <section class="info-section">
                     <h3>What SHIFT does</h3>
                     <ul>
                       <li>Explores alternative hierarchy structures locally inside the widget.</li>
                       <li>Lets controllers move one or multiple nodes and inspect the resulting KPI impact.</li>
                       <li>Supports focused analysis with Search, Focus, Level Limit and scenarios.</li>
                       <li>Exports the current Compact analysis and scenario comparison to Excel.</li>
                     </ul>
                   </section>

                   <section class="info-section">
                     <h3>What SHIFT does not do</h3>
                     <ul>
                       <li>It does not change the productive SAP BW hierarchy.</li>
                       <li>It performs no BW writeback and no master data maintenance.</li>
                       <li>It is not a replacement for BW hierarchy modeling.</li>
                       <li>It is not an SAC Planning simulation engine.</li>
                     </ul>
                   </section>

                   <section class="info-section">
                     <h3>Prototype boundaries</h3>
                     <ul>
                       <li>SHIFT works with hierarchy data delivered to the Custom Widget in the current SAC context.</li>
                       <li>The KPI impact logic is primarily intended for additive measures.</li>
                       <li>Calculated key figures, ratios and exception aggregations require separate validation.</li>
                       <li>For very large hierarchies, use Search, Focus and Level Limit instead of displaying everything at once.</li>
                     </ul>
                   </section>
                 </div>

                 <div class="info-warning"><strong>Prototype:</strong> SHIFT demonstrates what a controller-focused structural what-if experience can look like for SAP BW Live hierarchies in SAP Analytics Cloud. Scenario changes remain local to SHIFT unless explicitly exported.</div>

                 <div class="save-actions">
                   <button class="primary" data-action="close-info">Got it</button>
                 </div>
               </div>
             </div>` : ''}

          ${this._saveDialogOpen ? `<div class="save-dialog-backdrop">
            <div class="save-dialog">
              <div class="move-dialog-head"><div><span>Save scenario</span><strong>Name this controller scenario</strong></div><button data-action="close-save-dialog" type="button">×</button></div>
              <label class="save-field"><span>Scenario name</span><input data-action="scenario-name" type="text" maxlength="80" value="${esc(this._scenarioNameDraft)}" placeholder="e.g. FY27 Product Structure"></label>
              <label class="save-field"><span>Description</span><textarea data-action="scenario-description" maxlength="280" placeholder="Optional note about the structural assumption">${esc(this._scenarioDescriptionDraft)}</textarea></label>
              <div class="save-summary"><strong>${this._currentChanges().length}</strong><span>structural change${this._currentChanges().length===1?'':'s'} in the current scenario</span></div>
              <div class="save-actions"><button data-action="close-save-dialog">Cancel</button><button class="primary" data-action="confirm-save-scenario">Save Scenario</button></div>
            </div>
          </div>` : ''}
        </div>`;

      this._wireEvents();

      const restoredWorkspace = this._root.querySelector('.workspace');
      const savedScroll = this._scrollByView?.[this._viewMode] || { top: 0, left: 0 };

      if (restoredWorkspace) {
        restoredWorkspace.scrollTop = savedScroll.top;
        restoredWorkspace.scrollLeft = savedScroll.left;

        requestAnimationFrame(() => {
          if (!restoredWorkspace.isConnected) return;
          restoredWorkspace.scrollTop = savedScroll.top;
          restoredWorkspace.scrollLeft = savedScroll.left;
        });
      }

      if (this._pendingLocateId) {
        const locateId = this._pendingLocateId;
        this._pendingLocateId = null;

        requestAnimationFrame(() => {
          const target = Array.from(
            this._root.querySelectorAll('.node-card, .compact-row')
          ).find(el => el.dataset.id === locateId);

          const workspace = this._root.querySelector('.workspace');
          if (!target || !workspace) return;

          if (this._viewMode === 'compact') {
            target.scrollIntoView({ block: 'center', behavior: 'smooth' });
          } else {
            const targetRect = target.getBoundingClientRect();
            const wsRect = workspace.getBoundingClientRect();
            workspace.scrollLeft +=
              targetRect.left - wsRect.left - (wsRect.width - targetRect.width) / 2;
            workspace.scrollTop +=
              targetRect.top - wsRect.top - (wsRect.height - targetRect.height) / 2;

            this._scrollByView.graphical = {
              top: workspace.scrollTop,
              left: workspace.scrollLeft
            };
          }

          target.classList.add('located');
          setTimeout(() => target.classList.remove('located'), 1100);
        });
      }

      this._runPendingAnimation();
    }
  }

  if (!customElements.get(TAG)) customElements.define(TAG, HierarchyShift);
})();