/* Hierarchy Pulse - SAC Custom Widget v1.0.0
 * Executive BW hierarchy variance flow with auto-detected KPI direction, favorable/adverse business semantics, delta-first visual encoding, impact-weighted edges, native units, animation control, pan/zoom, and concise branch detail.
 * No AI. No backend. No SAC feed mutation. Reads only the bound result set.
 */

(function () {
  'use strict';

  var AGGREGATE_LABELS = [
    'total', 'totals', 'subtotal', 'subtotals', 'result', 'overall result',
    'grand total', 'sum', 'gesamtergebnis', 'zwischensumme'
  ];
  var AGGREGATE_IDS = [
    '@totalmember', '@resultmember', '$$result$$', '$$total$$',
    'total', 'result', 'overall_result', 'grand_total', 'summe'
  ];

  var MONTH_NAMES = {
    january:1, jan:1, januar:1,
    february:2, feb:2, februar:2,
    march:3, mar:3, maerz:3, mrz:3, 'märz':3,
    april:4, apr:4,
    may:5, mai:5,
    june:6, jun:6, juni:6,
    july:7, jul:7, juli:7,
    august:8, aug:8,
    september:9, sep:9, sept:9,
    october:10, oct:10, oktober:10, okt:10,
    november:11, nov:11,
    december:12, dec:12, dezember:12, dez:12
  };

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function aggregateFlag(obj) {
    if (!obj || typeof obj !== 'object') return false;
    var flagKeys = [
      'isTotal','isTotals','isSubtotal','isSubTotal','isGrandTotal','isResult',
      'isAggregate','isAggregated','isResultMember','isTotalMember','isSummary'
    ];
    for (var i = 0; i < flagKeys.length; i++) {
      if (obj[flagKeys[i]] === true) return true;
    }
    var typeKeys = ['type','kind','memberType','nodeType','resultType','semanticType','cellType'];
    for (var j = 0; j < typeKeys.length; j++) {
      var value = obj[typeKeys[j]];
      if (value == null || typeof value === 'object') continue;
      var s = String(value).toLowerCase().replace(/[ _-]+/g, ' ');
      if (/grand total|subtotal|sub total|overall result|result member|total member|(^| )result($| )|(^| )total($| )/.test(s)) return true;
    }
    return false;
  }

  function isAggregateCell(cell) {
    if (!cell) return true;
    var id = cell.id == null ? '' : String(cell.id).trim();
    var label = cell.label == null ? '' : String(cell.label).trim();
    var idLow = id.toLowerCase();
    var labelLow = label.toLowerCase();
    if (!id && !label && cell.raw == null) return true;
    if (aggregateFlag(cell)) return true;
    if (idLow !== '#' && AGGREGATE_IDS.indexOf(idLow) !== -1) return true;
    if (AGGREGATE_LABELS.indexOf(labelLow) !== -1) return true;
    if (idLow.indexOf('@totalmember') !== -1 || idLow.indexOf('@resultmember') !== -1) return true;
    if (/^@.*(total|result)/.test(idLow) || /\$\$.*(total|result).*/.test(idLow)) return true;
    return false;
  }

  function rowLooksAggregate(row, aliases) {
    if (!row || typeof row !== 'object') return true;
    if (aggregateFlag(row)) return true;
    for (var i = 0; i < aliases.length; i++) {
      var alias = aliases[i];
      if (alias && row[alias] && isAggregateCell(row[alias])) return true;
    }
    return false;
  }

  function numericRaw(cell) {
    if (!cell) return null;
    var value = Number(cell.raw);
    return isFinite(value) ? value : null;
  }

  function feedValues(binding, feedId) {
    var feeds = binding && binding.metadata && binding.metadata.feeds;
    var feed = feeds && feeds[feedId];
    return feed && Array.isArray(feed.values) ? feed.values.slice() : [];
  }

  function resolveDimLabel(binding, alias) {
    var dims = binding && binding.metadata && binding.metadata.dimensions;
    var meta = dims && dims[alias];
    if (meta) return meta.description || meta.label || meta.id || alias;
    var rows = binding && binding.data || [];
    for (var i = 0; i < Math.min(rows.length, 30); i++) {
      if (rows[i][alias] && rows[i][alias].description) return rows[i][alias].description;
    }
    return alias;
  }

  function resolveMeasureLabel(binding, alias) {
    var members = binding && binding.metadata && binding.metadata.mainStructureMembers;
    var meta = members && members[alias];
    if (meta) return meta.description || meta.label || meta.id || alias;
    var rows = binding && binding.data || [];
    for (var i = 0; i < Math.min(rows.length, 30); i++) {
      if (rows[i][alias] && rows[i][alias].description) return rows[i][alias].description;
    }
    return alias;
  }

  function isCumulativeMeasureLabel(label) {
    var s = String(label || '').toLowerCase();
    return /\bytd\b|year\s*[- ]?to\s*[- ]?date|year to date|jan(?:uary)?\s*(?:to|[-–])\s*(?:sep|september|[a-z]{3})/.test(s);
  }

  function inferTemporalGranularity(label) {
    var s = String(label || '').toLowerCase();
    if (/year\s*\/\s*month|jahr\s*\/\s*monat|calendar.*month|month|monat/.test(s)) return 'month';
    if (/year\s*\/\s*week|jahr\s*\/\s*woche|calendar.*week|week|woche/.test(s)) return 'week';
    if (/quarter|quartal/.test(s)) return 'quarter';
    if (/date|datum|day|tag/.test(s)) return 'day';
    if (/calendar.*year|year|jahr/.test(s)) return 'year';
    return 'unknown';
  }

  function cleanTemporalRaw(raw) {
    return String(raw == null ? '' : raw)
      .trim()
      .replace(/^[A-Z0-9_]+\./i, '')
      .replace(/^\[|\]$/g, '')
      .trim();
  }

  function periodKey(year, granularity, p1, p2) {
    if (granularity === 'year') return String(year);
    if (granularity === 'quarter') return year + '-Q' + p1;
    if (granularity === 'month') return year + '-' + String(p1).padStart(2, '0');
    if (granularity === 'week') return year + '-W' + String(p1).padStart(2, '0');
    if (granularity === 'day') return year + '-' + String(p1).padStart(2, '0') + '-' + String(p2).padStart(2, '0');
    return String(year);
  }

  function periodOrdinal(year, granularity, p1, p2) {
    if (granularity === 'year') return year * 1000;
    if (granularity === 'quarter') return year * 1000 + p1 * 100;
    if (granularity === 'month') return year * 1000 + p1 * 10;
    if (granularity === 'week') return year * 1000 + p1;
    if (granularity === 'day') return Math.floor(Date.UTC(year, p1 - 1, p2) / 86400000);
    return year * 1000;
  }

  function makePeriod(year, granularity, p1, p2, label, id) {
    return {
      year: year,
      granularity: granularity,
      month: granularity === 'month' || granularity === 'day' ? p1 : null,
      quarter: granularity === 'quarter' ? p1 : null,
      week: granularity === 'week' ? p1 : null,
      day: granularity === 'day' ? p2 : null,
      key: periodKey(year, granularity, p1, p2),
      ordinal: periodOrdinal(year, granularity, p1, p2),
      label: label || id || periodKey(year, granularity, p1, p2)
    };
  }

  function parseTemporalCell(cell, hint) {
    if (!cell || isAggregateCell(cell)) return null;
    var candidates = [cell.id, cell.label];
    hint = hint || 'unknown';

    for (var i = 0; i < candidates.length; i++) {
      var raw = cleanTemporalRaw(candidates[i]);
      if (!raw) continue;
      var s = raw.replace(/\s+/g, ' ').trim();
      var m, y, a, b;

      m = s.match(/^((?:19|20|21)\d{2})[-/.]?([01]\d)[-/.]?([0-3]\d)$/);
      if (m && (hint === 'day' || s.length >= 8)) {
        y = +m[1]; a = +m[2]; b = +m[3];
        if (a >= 1 && a <= 12 && b >= 1 && b <= 31) return makePeriod(y, 'day', a, b, cell.label, cell.id);
      }
      m = s.match(/^([0-3]\d)[./-]([01]\d)[./-]((?:19|20|21)\d{2})$/);
      if (m) {
        y = +m[3]; a = +m[2]; b = +m[1];
        if (a >= 1 && a <= 12 && b >= 1 && b <= 31) return makePeriod(y, 'day', a, b, cell.label, cell.id);
      }
      m = s.match(/^((?:19|20|21)\d{2})\s*[-/]?\s*Q([1-4])$/i) || s.match(/^Q([1-4])\s*[-/]?\s*((?:19|20|21)\d{2})$/i);
      if (m) {
        if (/^Q/i.test(s)) { y = +m[2]; a = +m[1]; } else { y = +m[1]; a = +m[2]; }
        return makePeriod(y, 'quarter', a, null, cell.label, cell.id);
      }
      m = s.match(/^((?:19|20|21)\d{2})\s*[-/]?\s*W?([0-5]\d)$/i);
      if (m && (hint === 'week' || +m[2] > 12)) {
        y = +m[1]; a = +m[2];
        if (a >= 1 && a <= 53) return makePeriod(y, 'week', a, null, cell.label, cell.id);
      }
      m = s.match(/^((?:19|20|21)\d{2})\s*[-/.]?\s*([01]?\d)$/);
      if (m && (hint === 'month' || +m[2] <= 12)) {
        y = +m[1]; a = +m[2];
        if (a >= 1 && a <= 12) return makePeriod(y, 'month', a, null, cell.label, cell.id);
      }
      m = s.match(/^([01]?\d)\s*[-/.]\s*((?:19|20|21)\d{2})$/);
      if (m) {
        y = +m[2]; a = +m[1];
        if (a >= 1 && a <= 12) return makePeriod(y, 'month', a, null, cell.label, cell.id);
      }
      m = s.toLowerCase().match(/^([a-zäöüß]+)\s+((?:19|20|21)\d{2})$/i);
      if (m && MONTH_NAMES[m[1]]) return makePeriod(+m[2], 'month', MONTH_NAMES[m[1]], null, cell.label, cell.id);
      m = s.match(/^((?:19|20|21)\d{2})(\d{2})$/);
      if (m) {
        y = +m[1]; a = +m[2];
        if (hint === 'week' && a >= 1 && a <= 53) return makePeriod(y, 'week', a, null, cell.label, cell.id);
        if (a >= 1 && a <= 12) return makePeriod(y, 'month', a, null, cell.label, cell.id);
      }
      m = s.match(/^((?:19|20|21)\d{2})$/);
      if (m) return makePeriod(+m[1], 'year', null, null, cell.label, cell.id);
    }
    return null;
  }

  function monthShort(month) {
    return ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month] || '';
  }

  function displayPeriod(period) {
    if (!period) return '';
    if (period.granularity === 'year') return String(period.year);
    if (period.granularity === 'quarter') return 'Q' + period.quarter + ' ' + period.year;
    if (period.granularity === 'month') return monthShort(period.month) + ' ' + period.year;
    if (period.granularity === 'week') return 'W' + period.week + ' ' + period.year;
    if (period.granularity === 'day') return monthShort(period.month) + ' ' + period.day + ', ' + period.year;
    return period.label || period.key;
  }

  function sameNaturalPeriod(a, b) {
    if (!a || !b || a.granularity !== b.granularity) return false;
    if (a.granularity === 'year') return true;
    if (a.granularity === 'quarter') return a.quarter === b.quarter;
    if (a.granularity === 'month') return a.month === b.month;
    if (a.granularity === 'week') return a.week === b.week;
    if (a.granularity === 'day') return a.month === b.month && a.day === b.day;
    return false;
  }

  function formatNumber(value) {
    if (value == null || !isFinite(value)) return '—';
    var abs = Math.abs(value);
    var opts = { maximumFractionDigits: abs >= 1000 ? 1 : 0 };
    if (abs >= 1000) opts.notation = 'compact';
    return new Intl.NumberFormat('en', opts).format(value);
  }

  function formatDelta(value) {
    if (value == null || !isFinite(value)) return '—';
    return (value > 0 ? '+' : '') + formatNumber(value);
  }

  function pctDelta(current, prior) {
    if (prior == null || !isFinite(prior) || Math.abs(prior) < 1e-9) return null;
    return (current - prior) / Math.abs(prior);
  }

  function formatPct(value) {
    if (value == null || !isFinite(value)) return '—';
    return (value > 0 ? '+' : '') + new Intl.NumberFormat('en', {
      style: 'percent', maximumFractionDigits: 1, minimumFractionDigits: 1
    }).format(value);
  }

  function sumRows(rows) {
    return rows.reduce(function (sum, row) { return sum + row.value; }, 0);
  }

  function asNumber(value) {
    if (value == null || value === '') return null;
    var n = Number(value);
    return isFinite(n) ? n : null;
  }

  function asBool(value) {
    if (typeof value === 'boolean') return value;
    if (value == null) return null;
    var s = String(value).toLowerCase();
    if (s === 'true' || s === 'yes' || s === '1' || s === 'expanded' || s === 'collapsed') return true;
    if (s === 'false' || s === 'no' || s === '0' || s === 'leaf') return false;
    return null;
  }

  function normalizePathValue(value) {
    if (!value) return null;
    if (Array.isArray(value)) {
      return value.map(function (v) {
        if (v && typeof v === 'object') return String(v.id != null ? v.id : (v.key != null ? v.key : (v.label != null ? v.label : '')));
        return String(v);
      }).filter(Boolean);
    }
    if (typeof value === 'string' && /[>\/|]/.test(value)) {
      return value.split(/[>\/|]/).map(function (v) { return v.trim(); }).filter(Boolean);
    }
    return null;
  }

  function inspectHierarchyMeta(cell, row) {
    var result = { depth: null, parentId: null, path: null, hasChildren: null, evidence: [] };
    var seen = [];

    function visit(obj, prefix, level) {
      if (!obj || typeof obj !== 'object' || level > 4 || seen.indexOf(obj) !== -1) return;
      seen.push(obj);
      Object.keys(obj).forEach(function (key) {
        var value = obj[key];
        var low = key.toLowerCase();
        var full = prefix ? prefix + '.' + key : key;

        if (result.depth == null && /(^|_)(hierarchy)?(level|depth)$|hierarchylevel|nodelevel|displaylevel|levelnumber/.test(low)) {
          var n = asNumber(value);
          if (n != null && n >= 0 && n < 100) { result.depth = n; result.evidence.push(full); }
        }
        if (result.parentId == null && /parent(id|key|member|node)|parentmemberid|parentnodeid/.test(low)) {
          if (value != null && typeof value !== 'object') { result.parentId = String(value); result.evidence.push(full); }
          else if (value && typeof value === 'object') {
            var pid = value.id != null ? value.id : (value.key != null ? value.key : null);
            if (pid != null) { result.parentId = String(pid); result.evidence.push(full); }
          }
        }
        if (result.path == null && /hierarchypath|ancestor|parents$|path$/.test(low)) {
          var p = normalizePathValue(value);
          if (p && p.length) { result.path = p; result.evidence.push(full); }
        }
        if (result.hasChildren == null && /haschildren|childrenavailable|expandable|isleaf|drillstate/.test(low)) {
          var b = asBool(value);
          if (b != null) {
            result.hasChildren = low === 'isleaf' ? !b : b;
            result.evidence.push(full);
          }
        }
        if (value && typeof value === 'object') visit(value, full, level + 1);
      });
    }

    visit(cell, 'cell', 0);
    visit(row, 'row', 0);

    if (result.depth == null && cell && typeof cell.label === 'string') {
      var m = cell.label.match(/^([\s\u00a0\u2002-\u2009]+)/);
      if (m) {
        var width = m[1].replace(/\u00a0/g, ' ').length;
        if (width > 0) {
          result.depth = Math.max(0, Math.floor(width / 2));
          result.evidence.push('label-indent');
        }
      }
    }
    return result;
  }

  function buildNativeTree(entries) {
    // Build one canonical structure across periods. BW parentId is authoritative.
    // If SAC repeats structural metadata across periods, use the most frequent
    // parent relation instead of whichever row happens to arrive first.
    var structure = {};

    entries.forEach(function (entry) {
      if (!structure[entry.id]) {
        structure[entry.id] = {
          id: entry.id,
          label: entry.label,
          parentId: null,
          hasChildren: entry.hasChildren,
          isNode: entry.isNode == null ? null : !!entry.isNode,
          _parentVotes: {}
        };
      }
      var s = structure[entry.id];
      if (!s.label && entry.label) s.label = entry.label;
      if (entry.parentId && entry.parentId !== entry.id) {
        var pid = String(entry.parentId);
        s._parentVotes[pid] = (s._parentVotes[pid] || 0) + 1;
      }
      if (s.hasChildren == null && entry.hasChildren != null) s.hasChildren = entry.hasChildren;
      if (s.isNode == null && entry.isNode != null) s.isNode = !!entry.isNode;
    });

    Object.keys(structure).forEach(function (id) {
      var s = structure[id], best = null, bestCount = -1;
      Object.keys(s._parentVotes).forEach(function (pid) {
        var count = s._parentVotes[pid];
        if (count > bestCount) { best = pid; bestCount = count; }
      });
      if (best && best !== id) s.parentId = best;
    });

    // Fallback only for nodes where BW supplied no parentId at all.
    var byPeriod = {};
    entries.forEach(function (entry) {
      var key = entry.periodKey || '__current__';
      if (!byPeriod[key]) byPeriod[key] = [];
      byPeriod[key].push(entry);
    });

    Object.keys(byPeriod).forEach(function (periodKey) {
      var rows = byPeriod[periodKey].slice().sort(function (a, b) { return a.rowIndex - b.rowIndex; });
      var stack = [];
      var minDepth = null;
      rows.forEach(function (entry) {
        if (entry.depth != null) minDepth = minDepth == null ? entry.depth : Math.min(minDepth, entry.depth);
      });
      if (minDepth == null) minDepth = 0;

      rows.forEach(function (entry) {
        var s = structure[entry.id];
        if (s && s.parentId) return;
        var normalizedDepth = entry.depth == null ? null : Math.max(0, entry.depth - minDepth);
        if (entry.path && entry.path.length > 1) {
          var pid = String(entry.path[entry.path.length - 2]);
          if (pid && pid !== entry.id) s.parentId = pid;
        } else if (normalizedDepth != null && normalizedDepth > 0) {
          var inferred = stack[normalizedDepth - 1] || null;
          if (inferred && inferred !== entry.id) s.parentId = inferred;
        }
        if (normalizedDepth != null) {
          stack[normalizedDepth] = entry.id;
          stack.length = normalizedDepth + 1;
        }
      });
    });

    entries.forEach(function (entry) {
      var s = structure[entry.id];
      entry.parentId = s && s.parentId ? s.parentId : null;
    });

    Object.keys(structure).forEach(function (id) {
      structure[id].childIds = [];
      delete structure[id]._parentVotes;
    });
    Object.keys(structure).forEach(function (id) {
      var node = structure[id];
      if (node.parentId && structure[node.parentId]) structure[node.parentId].childIds.push(id);
    });
    Object.keys(structure).forEach(function (id) {
      var node = structure[id];
      if (node.isNode == null) node.isNode = !!(node.childIds && node.childIds.length);
    });

    return structure;
  }


  function periodPositionWithinYear(period) {
    if (!period) return null;
    if (period.granularity === 'quarter') return period.quarter;
    if (period.granularity === 'month') return period.month;
    if (period.granularity === 'week') return period.week;
    if (period.granularity === 'day') return (period.month || 0) * 100 + (period.day || 0);
    return null;
  }

  function comparablePeriod(period, year, latest) {
    if (!period || !latest || period.year !== year || period.granularity !== latest.granularity) return false;
    var pos = periodPositionWithinYear(period);
    var limit = periodPositionWithinYear(latest);
    return pos != null && limit != null && pos <= limit;
  }

  function scopeLabel(period) {
    if (!period) return '';
    if (period.granularity === 'quarter') return 'Q1-Q' + period.quarter + ' ' + period.year;
    if (period.granularity === 'month') return 'Jan-' + monthShort(period.month) + ' ' + period.year;
    if (period.granularity === 'week') return 'W1-W' + period.week + ' ' + period.year;
    if (period.granularity === 'day') return 'Jan 1-' + monthShort(period.month) + ' ' + period.day + ', ' + period.year;
    return displayPeriod(period);
  }

  function matchingPriorPeriod(period) {
    if (!period) return null;
    var year = period.year - 1;
    if (period.granularity === 'quarter') return makePeriod(year, 'quarter', period.quarter, null, '', '');
    if (period.granularity === 'month') return makePeriod(year, 'month', period.month, null, '', '');
    if (period.granularity === 'week') return makePeriod(year, 'week', period.week, null, '', '');
    if (period.granularity === 'day') return makePeriod(year, 'day', period.month, period.day, '', '');
    return makePeriod(year, 'year', null, null, '', '');
  }

  function aggregateNativeEntries(entries, predicate) {
    // One hierarchy node + one time member is one business value. SAC can expose
    // additional result/total rows alongside detail rows. Never add the same
    // node/period twice.
    var map = {};
    var seenNodePeriod = {};
    entries.forEach(function (e) {
      if (!predicate(e)) return;
      var uniqueKey = e.id + '\u001f' + (e.periodKey || '__no_period__');
      if (seenNodePeriod[uniqueKey]) return;
      seenNodePeriod[uniqueKey] = true;
      if (!map[e.id]) {
        map[e.id] = {
          id:e.id, label:e.label, value:0, period:null, periodKey:null,
          rowIndex:e.rowIndex, depth:e.depth, parentId:e.parentId,
          path:e.path, hasChildren:e.hasChildren
        };
      }
      map[e.id].value += e.value;
      if (e.rowIndex < map[e.id].rowIndex) map[e.id].rowIndex = e.rowIndex;
    });
    return Object.keys(map).map(function (id) { return map[id]; });
  }


  function annotateLeafOccurrenceParents(entries) {
    // BW can omit parentId on repeated hierarchy rows. For leaf members we keep
    // the explicit relation when present and otherwise use the immediately
    // preceding hierarchy node within the same period. This preserves repeated
    // leaf IDs that legitimately occur under different parents.
    var lastNodeByPeriod = {};
    var explicitParents = {};
    entries.forEach(function (e) {
      if (!e || e.isNode === true || !e.id || !e.parentId) return;
      var id = String(e.id), pid = String(e.parentId);
      if (!explicitParents[id]) explicitParents[id] = {};
      explicitParents[id][pid] = true;
    });
    entries.slice().sort(function(a,b){ return a.rowIndex-b.rowIndex; }).forEach(function (e) {
      if (!e || !e.id) return;
      var periodKey = e.periodKey || '__no_period__';
      if (e.isNode === true) {
        lastNodeByPeriod[periodKey] = String(e.id);
        return;
      }
      var parent = e.parentId ? String(e.parentId) : (lastNodeByPeriod[periodKey] || null);
      if (!parent) {
        var candidates = explicitParents[String(e.id)] ? Object.keys(explicitParents[String(e.id)]) : [];
        if (candidates.length === 1) parent = candidates[0];
      }
      e.effectiveParentId = parent;
    });
  }

  function aggregateLeafEntries(entries, predicate) {
    var map = {}, seen = {};
    entries.forEach(function (e) {
      if (!e || e.isNode === true || !e.effectiveParentId || !predicate(e)) return;
      var parentId = String(e.effectiveParentId), id = String(e.id);
      var relationKey = parentId + '\u001f' + id;
      var uniqueKey = relationKey + '\u001f' + (e.periodKey || '__no_period__');
      if (seen[uniqueKey]) return;
      seen[uniqueKey] = true;
      if (!map[relationKey]) {
        map[relationKey] = { relationKey:relationKey, id:id, label:e.label, parentId:parentId, value:0, rowIndex:e.rowIndex };
      }
      map[relationKey].value += e.value;
      if (e.rowIndex < map[relationKey].rowIndex) map[relationKey].rowIndex = e.rowIndex;
    });
    return Object.keys(map).map(function (key) { return map[key]; });
  }

  function leafRelationsByParent(entries) {
    var byParent = {};
    entries.forEach(function (e) {
      if (!e || e.isNode === true || !e.effectiveParentId || !e.id) return;
      var parentId = String(e.effectiveParentId), id = String(e.id);
      if (!byParent[parentId]) byParent[parentId] = {};
      if (!byParent[parentId][id]) byParent[parentId][id] = {id:id,label:e.label,parentId:parentId,rowIndex:e.rowIndex};
      else if (e.rowIndex < byParent[parentId][id].rowIndex) byParent[parentId][id].rowIndex = e.rowIndex;
    });
    Object.keys(byParent).forEach(function (parentId) {
      byParent[parentId] = Object.keys(byParent[parentId]).map(function (id) { return byParent[parentId][id]; })
        .sort(function(a,b){ return a.rowIndex-b.rowIndex; });
    });
    return byParent;
  }

  function scalarMetaText(value, depth) {
    depth = depth || 0;
    if (value == null || depth > 4) return '';
    if (typeof value !== 'object') return String(value);
    if (Array.isArray(value)) return value.map(function(v){ return scalarMetaText(v, depth + 1); }).join(' ');
    return Object.keys(value).map(function(k){ return k + ' ' + scalarMetaText(value[k], depth + 1); }).join(' ');
  }

  function explicitTimeAggregationMode(binding, measureAlias) {
    var members = binding && binding.metadata && binding.metadata.mainStructureMembers;
    var meta = members && members[measureAlias];
    if (!meta) return null;
    var text = scalarMetaText(meta, 0).toLowerCase().replace(/[ _-]+/g, ' ');
    if (/last non empty|lastnonempty|last value|snapshot|closing balance|first non empty|firstnonempty|average|avg|minimum|maximum|min|max/.test(text)) return 'latest';
    if (/aggregation type sum|aggregation sum|(^| )sum($| )|additive/.test(text)) return 'sum';
    return null;
  }

  function likelyCumulativeSeries(entries, latestPeriod) {
    if (!latestPeriod || latestPeriod.granularity === 'year') return false;
    var byNode = {};
    entries.forEach(function(e){
      if (!e.period || e.period.year !== latestPeriod.year || e.period.granularity !== latestPeriod.granularity) return;
      if (!comparablePeriod(e.period, latestPeriod.year, latestPeriod)) return;
      if (!byNode[e.id]) byNode[e.id] = {};
      if (byNode[e.id][e.periodKey] == null) byNode[e.id][e.periodKey] = e.value;
    });
    var tested = 0, cumulative = 0;
    Object.keys(byNode).slice(0, 40).forEach(function(id){
      var rows = Object.keys(byNode[id]).map(function(key){
        var p = entries.find(function(e){ return e.id === id && e.periodKey === key; });
        return p ? {ordinal:p.period.ordinal, value:byNode[id][key]} : null;
      }).filter(Boolean).sort(function(a,b){return a.ordinal-b.ordinal;});
      if (rows.length < 4) return;
      tested++;
      var steps = 0, nonDecreasing = 0, sameSign = true;
      var sign = 0;
      rows.forEach(function(r){ if (Math.abs(r.value) > 1e-9 && !sign) sign = Math.sign(r.value); if (sign && Math.sign(r.value || sign) !== sign) sameSign = false; });
      for (var i=1;i<rows.length;i++) {
        steps++;
        var tolerance = Math.max(1, Math.abs(rows[i-1].value)) * 0.002;
        if (rows[i].value + tolerance >= rows[i-1].value) nonDecreasing++;
      }
      var first = Math.abs(rows[0].value), last = Math.abs(rows[rows.length-1].value);
      var growth = first < 1e-9 ? (last > 0 ? 99 : 1) : last / first;
      if (sameSign && steps && nonDecreasing / steps >= 0.85 && growth >= 1.15) cumulative++;
    });
    return tested >= 1 && cumulative / tested >= 0.7;
  }

  function periodAggregationMode(binding, measureAlias, entries, currentPeriod) {
    var explicit = explicitTimeAggregationMode(binding, measureAlias);
    if (explicit === 'latest') return 'latest';
    if (likelyCumulativeSeries(entries, currentPeriod)) return 'latest';
    if (explicit === 'sum') return 'sum';
    return 'sum';
  }

  function buildModel(widget) {
    var binding = widget.hierarchyData;
    if (!binding || !binding.metadata || (binding.state && binding.state !== 'success')) {
      throw new Error('Bind data to Hierarchy Pulse.');
    }

    var measureAliases = feedValues(binding, 'measures');
    var timeAliases = feedValues(binding, 'time');
    var navAliases = feedValues(binding, 'hierarchy');
    if (!measureAliases.length) throw new Error('Bind at least one KPI measure.');
    if (!navAliases.length) throw new Error('Bind a BW hierarchy dimension.');
    if (timeAliases.length > 1) throw new Error('Bind at most one time dimension.');

    if (!widget._selectedMeasureAlias || measureAliases.indexOf(widget._selectedMeasureAlias) === -1) widget._selectedMeasureAlias = measureAliases[0];
    var measureAlias = widget._selectedMeasureAlias;
    var timeAlias = timeAliases[0] || null;
    var timeLabel = timeAlias ? resolveDimLabel(binding, timeAlias) : null;
    var timeHint = timeAlias ? inferTemporalGranularity(timeLabel) : null;
    var sourceRows = binding.data || [];

    // Native BW hierarchy mode: one hierarchy-enabled dimension, multiple hierarchy nodes in the result set.
    if (navAliases.length === 1) {
      var navAlias = navAliases[0];
      var entries = [];
      var structureEntries = [];
      var evidence = [];
      var sampleKeys = {};

      sourceRows.forEach(function (source, rowIndex) {
        var structureCell = source && source[navAlias];
        if (structureCell && !isAggregateCell(structureCell)) {
          var structureId = structureCell.id == null ? String(structureCell.label || '') : String(structureCell.id);
          var structureLabel = String(structureCell.label || structureId).trim();
          if (structureId || structureLabel) {
            var structureMeta = inspectHierarchyMeta(structureCell, source);
            structureMeta.evidence.forEach(function (e) { if (evidence.indexOf(e) === -1) evidence.push(e); });
            Object.keys(structureCell).forEach(function (k) { sampleKeys[k] = true; });
            structureEntries.push({
              id: structureId,
              label: structureLabel,
              value: 0,
              period: null,
              periodKey: null,
              rowIndex: rowIndex,
              depth: structureMeta.depth,
              parentId: structureMeta.parentId,
              path: structureMeta.path,
              hasChildren: structureMeta.hasChildren,
              isNode: asBool(structureCell.isNode)
            });
          }
        }

        if (rowLooksAggregate(source, [timeAlias, navAlias])) return;
        var value = numericRaw(source[measureAlias]);
        var cell = source[navAlias];
        if (value === null || !cell || isAggregateCell(cell)) return;

        var period = null;
        if (timeAlias) {
          period = parseTemporalCell(source[timeAlias], timeHint);
          if (!period) return;
        }

        var id = cell.id == null ? String(cell.label || '') : String(cell.id);
        var label = String(cell.label || id).trim();
        if (!id && !label) return;
        var meta = inspectHierarchyMeta(cell, source);
        meta.evidence.forEach(function (e) { if (evidence.indexOf(e) === -1) evidence.push(e); });
        Object.keys(cell).forEach(function (k) { sampleKeys[k] = true; });

        entries.push({
          id: id,
          label: label,
          value: value,
          period: period,
          periodKey: period ? period.key : null,
          rowIndex: rowIndex,
          depth: meta.depth,
          parentId: meta.parentId,
          path: meta.path,
          hasChildren: meta.hasChildren,
          isNode: asBool(cell.isNode)
        });
      });

      if (!entries.length) throw new Error('No hierarchy nodes were returned by the binding.');

      var hasNativeMeta = entries.some(function (e) {
        return e.depth != null || e.parentId != null || (e.path && e.path.length) || e.hasChildren != null;
      });
      if (!hasNativeMeta) {
        throw new Error('The BW hierarchy is visible in SAC, but the custom-widget binding did not expose parent/level metadata in the returned cells. Detected Product cell fields: ' + Object.keys(sampleKeys).join(', ') + '.');
      }

      var hierarchyStructure = buildNativeTree(structureEntries.length ? structureEntries : entries);

      if (!timeAlias) {
        throw new Error('Bind Calendar Year/Month or Calendar Day for period-aligned YoY.');
      }
      var periodMap = {};
      entries.forEach(function (row) { if (row.periodKey && row.period) periodMap[row.periodKey] = row.period; });
      var periods = Object.keys(periodMap).map(function (key) { return periodMap[key]; })
        .sort(function (a, b) { return a.ordinal - b.ordinal; });
      if (!periods.length) throw new Error('No valid time members found.');
      var currentPeriod = periods[periods.length - 1];
      var priorPeriod = matchingPriorPeriod(currentPeriod);
      var comparisonLabel = 'YoY';
      var currentEntries;
      var priorEntries;
      var aggregationMode = 'native-year';
      if (currentPeriod.granularity === 'year') {
        // A Calendar Year member already represents the BW/SAC query context for that year.
        currentEntries = aggregateNativeEntries(entries, function (e) {
          return e.period && e.period.granularity === 'year' && e.period.year === currentPeriod.year;
        });
        priorEntries = aggregateNativeEntries(entries, function (e) {
          return e.period && e.period.granularity === 'year' && e.period.year === currentPeriod.year - 1;
        });
      } else {
        var priorMatch = matchingPriorPeriod(currentPeriod);
        aggregationMode = periodAggregationMode(binding, measureAlias, entries, currentPeriod);
        if (aggregationMode === 'latest') {
          // Cumulative or snapshot-like series: the latest returned period is the range value.
          currentEntries = aggregateNativeEntries(entries, function (e) {
            return e.period && e.period.key === currentPeriod.key;
          });
          priorEntries = aggregateNativeEntries(entries, function (e) {
            return e.period && priorMatch && e.period.key === priorMatch.key;
          });
        } else {
          // Additive period series: sum each distinct node/period once over the visible range.
          // Result/total rows are already excluded above, so they cannot be counted again.
          currentEntries = aggregateNativeEntries(entries, function (e) {
            return e.period && comparablePeriod(e.period, currentPeriod.year, currentPeriod);
          });
          priorEntries = aggregateNativeEntries(entries, function (e) {
            return e.period && priorMatch && comparablePeriod(e.period, priorMatch.year, priorMatch);
          });
        }
      }
      if (!currentEntries.length) throw new Error('No current-period hierarchy values found.');
      if (!priorEntries.length) throw new Error('No matching prior-year hierarchy values found.');

      annotateLeafOccurrenceParents(entries);
      var leafRelations = leafRelationsByParent(entries);
      var currentLeafEntries;
      var priorLeafEntries;
      if (currentPeriod.granularity === 'year') {
        currentLeafEntries = aggregateLeafEntries(entries, function (e) {
          return e.period && e.period.granularity === 'year' && e.period.year === currentPeriod.year;
        });
        priorLeafEntries = aggregateLeafEntries(entries, function (e) {
          return e.period && e.period.granularity === 'year' && e.period.year === currentPeriod.year - 1;
        });
      } else if (aggregationMode === 'latest') {
        currentLeafEntries = aggregateLeafEntries(entries, function (e) {
          return e.period && e.period.key === currentPeriod.key;
        });
        priorLeafEntries = aggregateLeafEntries(entries, function (e) {
          return e.period && priorMatch && e.period.key === priorMatch.key;
        });
      } else {
        currentLeafEntries = aggregateLeafEntries(entries, function (e) {
          return e.period && comparablePeriod(e.period, currentPeriod.year, currentPeriod);
        });
        priorLeafEntries = aggregateLeafEntries(entries, function (e) {
          return e.period && priorMatch && comparablePeriod(e.period, priorMatch.year, priorMatch);
        });
      }

      return {
        mode: 'native',
        binding: binding,
        measureAlias: measureAlias,
        measureAliases: measureAliases.slice(),
        measureOptions: measureAliases.map(function(a){ return {alias:a,label:resolveMeasureLabel(binding,a)}; }),
        measureLabel: resolveMeasureLabel(binding, measureAlias),
        timeAlias: timeAlias,
        timeLabel: timeLabel,
        navAliases: navAliases,
        navLabels: [resolveDimLabel(binding, navAlias)],
        nativeAlias: navAlias,
        allEntries: entries,
        currentEntries: currentEntries,
        priorEntries: priorEntries,
        leafRelationsByParent: leafRelations,
        currentLeafEntries: currentLeafEntries,
        priorLeafEntries: priorLeafEntries,
        aggregationMode: aggregationMode,
        currentPeriod: currentPeriod,
        priorPeriod: priorPeriod,
        comparisonLabel: comparisonLabel,
        currentScopeLabel: scopeLabel(currentPeriod),
        priorScopeLabel: scopeLabel(priorPeriod),
        hierarchyEvidence: evidence,
        hierarchyStructure: hierarchyStructure
      };
    }

    // Legacy ordered-level mode retained for models without a native hierarchy.
    var candidates = [];
    sourceRows.forEach(function (source) {
      var value = numericRaw(source[measureAlias]);
      if (value === null) return;
      var period = null;
      if (timeAlias) {
        period = parseTemporalCell(source[timeAlias], timeHint);
        if (!period) return;
      }
      var members = {};
      var depth = 0;
      navAliases.forEach(function (alias) {
        var cell = source[alias];
        if (cell && !isAggregateCell(cell)) {
          var id = cell.id == null ? String(cell.label) : String(cell.id);
          members[alias] = { id: id, label: cell.label || id };
          depth++;
        }
      });
      candidates.push({ value: value, period: period, periodKey: period ? period.key : null, members: members, depth: depth });
    });
    if (!candidates.length) throw new Error('No analyzable detail rows were returned by the binding.');
    var maxDepth = candidates.reduce(function (m, row) { return Math.max(m, row.depth); }, 0);
    var leafRows = candidates.filter(function (row) { return row.depth === maxDepth; });
    if (!leafRows.length) throw new Error('No leaf rows found.');

    var currentPeriodLegacy = null;
    var priorPeriodLegacy = null;
    var comparisonLabelLegacy = '';
    var currentRows = leafRows;
    var priorRows = [];
    if (timeAlias) {
      var periodMapLegacy = {};
      leafRows.forEach(function (row) { periodMapLegacy[row.periodKey] = row.period; });
      var periodsLegacy = Object.keys(periodMapLegacy).map(function (key) { return periodMapLegacy[key]; })
        .sort(function (a, b) { return a.ordinal - b.ordinal; });
      currentPeriodLegacy = periodsLegacy[periodsLegacy.length - 1];
      for (var q = periodsLegacy.length - 2; q >= 0; q--) {
        if (periodsLegacy[q].year === currentPeriodLegacy.year - 1 && sameNaturalPeriod(periodsLegacy[q], currentPeriodLegacy)) {
          priorPeriodLegacy = periodsLegacy[q]; comparisonLabelLegacy = 'YoY'; break;
        }
      }
      if (!priorPeriodLegacy && periodsLegacy.length > 1) { priorPeriodLegacy = periodsLegacy[periodsLegacy.length - 2]; comparisonLabelLegacy = 'Previous'; }
      currentRows = leafRows.filter(function (row) { return row.periodKey === currentPeriodLegacy.key; });
      priorRows = priorPeriodLegacy ? leafRows.filter(function (row) { return row.periodKey === priorPeriodLegacy.key; }) : [];
    }

    return {
      mode: 'ordered', binding: binding, measureAlias: measureAlias,
      measureAliases: measureAliases.slice(),
      measureOptions: measureAliases.map(function(a){ return {alias:a,label:resolveMeasureLabel(binding,a)}; }),
      measureLabel: resolveMeasureLabel(binding, measureAlias), timeAlias: timeAlias, timeLabel: timeLabel,
      navAliases: navAliases, navLabels: navAliases.map(function (alias) { return resolveDimLabel(binding, alias); }),
      leafRows: leafRows, currentRows: currentRows, priorRows: priorRows,
      currentPeriod: currentPeriodLegacy, priorPeriod: priorPeriodLegacy, comparisonLabel: comparisonLabelLegacy
    };
  }

  function filterByPath(rows, path) {
    if (!path.length) return rows.slice();
    return rows.filter(function (row) {
      return path.every(function (step) {
        var member = row.members[step.alias];
        return member && member.id === step.id;
      });
    });
  }

  function nativeNodeMap(entries) {
    var map = {};
    entries.forEach(function (e) {
      if (!map[e.id]) map[e.id] = e;
    });
    return map;
  }

  function nativeChildren(entries, parentId, structure) {
    var expected = null;
    if (structure) {
      expected = Object.keys(structure).filter(function (id) {
        var node = structure[id];
        return parentId == null ? !node.parentId : node.parentId === parentId;
      });
    }
    var allowed = null;
    if (expected) {
      allowed = {};
      expected.forEach(function (id) { allowed[id] = true; });
    }
    return entries.filter(function (e) {
      if (allowed) return !!allowed[e.id];
      return parentId == null ? !e.parentId : e.parentId === parentId;
    });
  }

  function groupNativeLevel(model, path) {
    var currentMap = nativeNodeMap(model.currentEntries);
    var priorMap = nativeNodeMap(model.priorEntries);
    var selectedId = path.length ? path[path.length - 1].id : null;
    var currentSelected = selectedId ? currentMap[selectedId] : null;
    var priorSelected = selectedId ? priorMap[selectedId] : null;

    var currentChildren = nativeChildren(model.currentEntries, selectedId, model.hierarchyStructure);
    var priorChildren = nativeChildren(model.priorEntries, selectedId, model.hierarchyStructure);
    var priorChildrenMap = nativeNodeMap(priorChildren);

    // At Global we sum only top-level hierarchy nodes. We never sum parents plus descendants.
    var centerCurrent = currentSelected ? currentSelected.value : sumRows(currentChildren);
    var centerPrior = priorSelected ? priorSelected.value : (priorChildren.length ? sumRows(priorChildren) : null);
    var centerLabel = currentSelected ? currentSelected.label : (path.length ? path[path.length - 1].label : 'Global');

    var nodes = currentChildren.map(function (entry) {
      var prior = priorChildrenMap[entry.id];
      var item = {
        id: entry.id,
        label: entry.label,
        current: entry.value,
        prior: prior ? prior.value : 0,
        hasCurrent: true,
        hasPrior: !!prior,
        parentId: entry.parentId,
        hasChildren: entry.hasChildren
      };
      item.delta = item.hasPrior ? item.current - item.prior : null;
      item.deltaPct = item.hasPrior ? pctDelta(item.current, item.prior) : null;
      item.share = Math.abs(centerCurrent) > 1e-9 ? Math.abs(item.current) / Math.abs(centerCurrent) : 0;
      return item;
    });

    nodes.sort(function (a, b) { return Math.abs(b.current) - Math.abs(a.current); });
    nodes = nodes.slice(0, 12);

    return {
      alias: model.nativeAlias,
      label: model.navLabels[0],
      nodes: nodes,
      centerCurrent: centerCurrent,
      centerPrior: centerPrior,
      centerLabel: centerLabel,
      currentRows: model.currentEntries,
      priorRows: model.priorEntries,
      native: true
    };
  }

  function groupLevel(model, path) {
    if (model.mode === 'native') return groupNativeLevel(model, path);

    var level = path.length;
    var alias = model.navAliases[level] || null;
    var currentRows = filterByPath(model.currentRows, path);
    var priorRows = filterByPath(model.priorRows, path);
    var centerCurrent = sumRows(currentRows);
    var centerPrior = priorRows.length ? sumRows(priorRows) : null;
    var centerLabel = path.length ? path[path.length - 1].label : 'Global';
    if (!alias) return { alias:null, label:null, nodes:[], centerCurrent:centerCurrent, centerPrior:centerPrior, centerLabel:centerLabel, currentRows:currentRows, priorRows:priorRows };

    var map = {};
    function add(rows, side) {
      rows.forEach(function (row) {