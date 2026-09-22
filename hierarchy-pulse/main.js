/* Hierarchy Pulse - SAC Custom Widget v1.1.1
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
        var member = row.members[alias];
        if (!member) return;
        if (!map[member.id]) map[member.id] = { id:member.id, label:member.label, current:0, prior:0, hasCurrent:false, hasPrior:false };
        map[member.id][side] += row.value;
        map[member.id][side === 'current' ? 'hasCurrent' : 'hasPrior'] = true;
      });
    }
    add(currentRows, 'current'); add(priorRows, 'prior');
    var nodes = Object.keys(map).map(function (id) {
      var item = map[id];
      item.delta = item.hasPrior ? item.current - item.prior : null;
      item.deltaPct = item.hasPrior ? pctDelta(item.current, item.prior) : null;
      item.share = Math.abs(centerCurrent) > 1e-9 ? Math.abs(item.current) / Math.abs(centerCurrent) : 0;
      return item;
    });
    nodes.sort(function (a,b) { return Math.abs(b.current)-Math.abs(a.current); });
    nodes = nodes.slice(0,10);
    return { alias:alias, label:model.navLabels[level], nodes:nodes, centerCurrent:centerCurrent, centerPrior:centerPrior, centerLabel:centerLabel, currentRows:currentRows, priorRows:priorRows };
  }

  function detectUnitFromText(text) {
    var t = String(text == null ? '' : text).trim();
    if (!t) return '';
    if (/€|\bEUR\b/i.test(t)) return 'EUR';
    if (/£|\bGBP\b/i.test(t)) return 'GBP';
    if (/¥|\bJPY\b/i.test(t)) return 'JPY';
    if (/\bCHF\b/i.test(t)) return 'CHF';
    if (/\bUSD\b/i.test(t)) return 'USD';
    if (/\bCAD\b/i.test(t)) return 'CAD';
    if (/\bAUD\b/i.test(t)) return 'AUD';
    if (/\bSEK\b/i.test(t)) return 'SEK';
    if (/\bNOK\b/i.test(t)) return 'NOK';
    if (/\bDKK\b/i.test(t)) return 'DKK';
    return '';
  }

  function unitFromModel(model) {
    var binding = model && model.binding;
    var rows = binding && binding.data || [];
    var alias = model && model.measureAlias;
    var members = binding && binding.metadata && binding.metadata.mainStructureMembers;
    var meta = members && alias && members[alias];
    if (meta) {
      var mk = ['unit','currency','unitOfMeasure','currencyUnit','unitCode'];
      for (var m = 0; m < mk.length; m++) {
        if (meta[mk[m]]) return String(meta[mk[m]]);
      }
      var metaDetected = detectUnitFromText(meta.formatted || meta.description || '');
      if (metaDetected) return metaDetected;
    }
    for (var i = 0; i < rows.length; i++) {
      var cell = alias && rows[i] && rows[i][alias];
      if (!cell) continue;
      if (cell.unit) return String(cell.unit);
      if (cell.currency) return String(cell.currency);
      if (cell.unitOfMeasure) return String(cell.unitOfMeasure);
      var detected = detectUnitFromText(cell.formatted || cell.formattedValue || cell.displayValue || '');
      if (detected) return detected;
    }
    return '';
  }

  function unitPrefix(unit) {
    var u = String(unit || '').toUpperCase();
    if (u === 'EUR') return '€';
    if (u === 'USD') return '$';
    if (u === 'GBP') return '£';
    if (u === 'JPY') return '¥';
    if (u === 'CHF') return 'CHF ';
    if (u === 'CAD') return 'C$';
    if (u === 'AUD') return 'A$';
    return '';
  }

  function genericUnitSuffix(unit) {
    var u = String(unit || '').trim();
    if (!u || unitPrefix(u)) return '';
    return ' ' + u;
  }

  function formatValue(value, unit) {
    if (value == null || !isFinite(value)) return '—';
    return unitPrefix(unit) + formatNumber(value) + genericUnitSuffix(unit);
  }

  function compactDelta(value, unit) {
    if (value == null || !isFinite(value)) return '—';
    var sign = value > 0 ? '+' : value < 0 ? '-' : '';
    return sign + unitPrefix(unit) + formatNumber(Math.abs(value)) + genericUnitSuffix(unit);
  }

  function measureSemanticText(binding, alias) {
    var bits = [resolveMeasureLabel(binding, alias), alias];
    var members = binding && binding.metadata && binding.metadata.mainStructureMembers;
    var meta = members && members[alias];
    if (meta && typeof meta === 'object') {
      ['description','label','id','name','semanticType','measureType','aggregationType','unit','currency'].forEach(function (k) {
        if (meta[k] != null && typeof meta[k] !== 'object') bits.push(String(meta[k]));
      });
    }
    return bits.join(' ').toLowerCase().replace(/[_/.-]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function inferMeasurePolarity(binding, alias) {
    var members = binding && binding.metadata && binding.metadata.mainStructureMembers;
    var meta = members && members[alias] || {};
    var direct = String(meta.performanceDirection || meta.optimizationDirection || meta.goodDirection || meta.polarity || '').toLowerCase();
    if (meta.higherIsBetter === true || /higher|maximize|maximise|positive/.test(direct)) {
      return {direction:'higher', confidence:'metadata', reason:'BW metadata'};
    }
    if (meta.lowerIsBetter === true || /lower|minimize|minimise|negative/.test(direct)) {
      return {direction:'lower', confidence:'metadata', reason:'BW metadata'};
    }

    var text = measureSemanticText(binding, alias);
    // Strong phrases are checked first so, for example, "cost savings" is not treated as cost.
    var higherStrong = [
      /\bcost savings?\b/, /\bsavings?\b/, /\brevenue\b/, /\bsales\b/, /\bturnover\b/,
      /\bnet sales\b/, /\bgross sales\b/, /\bquantity\b/, /\bunits? sold\b/, /\bvolume\b/,
      /\bebitda\b/, /\bebit\b/, /\bprofit\b/, /\bgross profit\b/, /\bmargin\b/,
      /\bfree cash flow\b/, /\bcash flow\b/, /\bproductivity\b/, /\befficiency\b/,
      /\bservice level\b/, /\bon time\b/, /\bavailability\b/, /\bfill rate\b/, /\byield\b/
    ];
    var lowerStrong = [
      /\bcosts?\b/, /\bexpenses?\b/, /\bcogs\b/, /\bdefects?\b/, /\bdefect rate\b/,
      /\bscrap\b/, /\brejects?\b/, /\breturn rate\b/, /\bcomplaints?\b/, /\bdowntime\b/,
      /\blead time\b/, /\bcycle time\b/, /\bresponse time\b/, /\bdso\b/,
      /\bdays sales outstanding\b/, /\bdio\b/, /\bdays inventory outstanding\b/,
      /\boverdue\b/, /\bchurn\b/, /\battrition\b/, /\berror rate\b/, /\bfailure rate\b/
    ];
    var neutralHints = [
      /\binventory\b/, /\bheadcount\b/, /\bworking capital\b/, /\bassets?\b/, /\bliabilities\b/,
      /\bstock balance\b/, /\bbalance sheet\b/
    ];
    var higher = higherStrong.some(function (r) { return r.test(text); });
    var lower = lowerStrong.some(function (r) { return r.test(text); });
    if (higher && !lower) return {direction:'higher', confidence:'name', reason:'measure name'};
    if (lower && !higher) return {direction:'lower', confidence:'name', reason:'measure name'};
    if (neutralHints.some(function (r) { return r.test(text); })) return {direction:'neutral', confidence:'name', reason:'ambiguous business KPI'};
    return {direction:'neutral', confidence:'unknown', reason:'not confidently inferred'};
  }

  function nodeClass(delta) {
    if (delta == null || Math.abs(delta) < 1e-9) return 'neutral';
    return delta > 0 ? 'up' : 'down';
  }

  function truncate(text, max) {
    text = String(text == null ? '' : text);
    return text.length > max ? text.slice(0, max - 1) + '…' : text;
  }

  var STYLES = `
    :host {
      display:block; width:100%; height:100%; min-width:620px; min-height:420px;
      box-sizing:border-box; font-family:72, Arial, Helvetica, sans-serif; color:#1d2d3e;
      --blue:#0a6ed1; --ink:#122b45; --muted:#667b8f; --line:#d9e5ef;
      --green:#0a8f55; --green-soft:#eef8f3; --red:#c9344d; --red-soft:#fff3f5;
      --surface:#ffffff; --panel:#f7fafc;
    }
    * { box-sizing:border-box; }
    button { font-family:inherit; }
    .hp {
      width:100%; height:100%; min-height:0; overflow:hidden; background:#fff;
      border:1px solid #dbe6ee; border-radius:16px; box-shadow:0 8px 24px rgba(24,55,82,.08);
      display:grid; grid-template-rows:auto minmax(0,1fr);
    }
    .head {
      min-height:68px; display:grid; grid-template-columns:auto minmax(0,1fr) auto;
      gap:24px; align-items:center; padding:14px 18px 13px; border-bottom:1px solid #e5edf3; background:#fff;
    }
    .title { color:var(--ink); font-size:25px; line-height:1; font-weight:900; letter-spacing:-.025em; white-space:nowrap; }
    .title b { color:var(--blue); }
    .context { min-width:0; color:#536b80; font-size:13px; font-weight:650; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .actions { display:flex; align-items:center; gap:7px; }
    .btn {
      height:34px; padding:0 12px; border:1px solid #b7cada; border-radius:8px; background:#fff;
      color:#315069; font-size:12px; font-weight:800; cursor:pointer; transition:.16s ease;
    }
    .btn:hover { border-color:var(--blue); color:var(--blue); }
    .btn.active { background:#eef6fd; border-color:#75ace0; color:#075faa; }
    .body { min-height:0; display:grid; grid-template-columns:minmax(0,1fr) 320px; }
    .stage { min-width:0; min-height:0; position:relative; overflow:hidden; background:linear-gradient(180deg,#fff 0%,#fbfdff 100%); }
    .tree-scroll { width:100%; height:100%; overflow:auto; scrollbar-width:thin; scrollbar-color:#bdcedb transparent; cursor:grab; touch-action:none; }
    .tree-scroll.is-panning { cursor:grabbing; user-select:none; }
    .tree-scroll::-webkit-scrollbar { width:9px; height:9px; }
    .tree-scroll::-webkit-scrollbar-thumb { background:#c2d1dd; border-radius:999px; border:2px solid transparent; background-clip:padding-box; }
    .tree-canvas { position:relative; }
    .edge-layer { position:absolute; inset:0; width:100%; height:100%; overflow:visible; pointer-events:none; }
    .edge { fill:none; stroke:#c4d2de; stroke-width:1.4; }
    .edge.path-base { stroke:#8aaac6; stroke-width:2.1; }
    .edge.path-run { fill:none; stroke-width:3.2; stroke-linecap:round; pathLength:1; stroke-dasharray:1; stroke-dashoffset:1; animation:drawEdge .48s cubic-bezier(.2,.72,.25,1) forwards; animation-delay:var(--delay); }
    .edge.path-run.up { stroke:var(--green); }
    .edge.path-run.down { stroke:var(--red); }
    .edge.path-run.neutral { stroke:var(--blue); }
    .focus .edge:not(.path-base):not(.path-run) { opacity:.18; }
    .node-card {
      position:absolute; width:178px; min-height:74px; padding:10px 11px 9px; border:1px solid #cbd9e4;
      border-radius:10px; background:#fff; box-shadow:0 2px 7px rgba(24,60,88,.07); cursor:pointer;
      transform:translateY(-50%); transition:box-shadow .16s ease,border-color .16s ease,opacity .16s ease,transform .16s ease;
    }
    .node-card:hover { border-color:#75a8d4; box-shadow:0 6px 16px rgba(26,67,101,.14); z-index:4; }
    .node-card.selected { border-color:var(--blue); box-shadow:0 0 0 2px rgba(10,110,209,.10),0 7px 18px rgba(26,67,101,.13); }
    .node-card.path-node { z-index:3; animation:pathNode .42s ease both; animation-delay:var(--delay); }
    .node-card.path-node.up { border-color:#6fc59d; box-shadow:0 0 0 2px rgba(10,143,85,.08),0 7px 18px rgba(26,67,101,.10); }
    .node-card.path-node.down { border-color:#e09aa6; box-shadow:0 0 0 2px rgba(201,52,77,.08),0 7px 18px rgba(26,67,101,.10); }
    .node-card.target { transform:translateY(-50%) scale(1.025); }
    .focus .node-card:not(.path-node):not(.selected) { opacity:.24; }
    .node-name { color:#17364f; font-size:13px; line-height:1.15; font-weight:850; min-height:30px; display:flex; align-items:center; overflow-wrap:anywhere; }
    .node-metrics { margin-top:5px; display:flex; align-items:baseline; justify-content:space-between; gap:8px; }
    .node-value { color:#102f49; font-size:15px; line-height:1; font-weight:900; white-space:nowrap; }
    .node-delta { font-size:12px; line-height:1; font-weight:900; white-space:nowrap; }
    .node-card.up .node-delta { color:var(--green); }
    .node-card.down .node-delta { color:var(--red); }
    .node-card.neutral .node-delta { color:#718495; }
    .node-share { margin-top:7px; height:3px; border-radius:99px; background:#edf2f6; overflow:hidden; }
    .node-share i { display:block; height:100%; border-radius:99px; background:#9fb4c5; }
    .node-card.up .node-share i { background:#65bd91; }
    .node-card.down .node-share i { background:#de8796; }
    .panel { min-height:0; overflow:auto; border-left:1px solid #e1e9f0; background:var(--panel); padding:18px; display:flex; flex-direction:column; gap:16px; }
    .crumbs { display:flex; flex-wrap:wrap; gap:5px; color:#698095; font-size:11px; min-height:14px; }
    .crumb { color:var(--blue); font-weight:800; cursor:pointer; }
    .eyebrow { color:#6b8296; font-size:10px; font-weight:850; letter-spacing:.08em; text-transform:uppercase; }
    .panel h2 { margin:3px 0 0; color:#14324c; font-size:24px; font-weight:900; line-height:1.08; letter-spacing:-.02em; }
    .kpi { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:10px; align-items:end; }
    .big { color:#102f49; font-size:34px; line-height:.95; font-weight:900; letter-spacing:-.035em; }
    .period { color:#71869a; font-size:11px; margin-top:6px; }
    .delta-block { text-align:right; }
    .pct { font-size:20px; line-height:1; font-weight:900; }
    .abs { margin-top:5px; font-size:11px; font-weight:800; }
    .delta-block.up .pct,.delta-block.up .abs { color:var(--green); }
    .delta-block.down .pct,.delta-block.down .abs { color:var(--red); }
    .delta-block.neutral .pct,.delta-block.neutral .abs { color:#718495; }
    .section { border-top:1px solid #dce6ee; padding-top:13px; }
    .section-title { color:#17364f; font-size:13px; font-weight:900; margin-bottom:9px; }
    .path-list { display:grid; gap:6px; }
    .path-step { display:grid; grid-template-columns:9px minmax(0,1fr) auto; gap:8px; align-items:center; min-height:27px; }
    .path-dot { width:7px; height:7px; border-radius:50%; background:#8ba6bb; }
    .path-step.up .path-dot { background:var(--green); }
    .path-step.down .path-dot { background:var(--red); }
    .path-name { min-width:0; color:#29475f; font-size:12px; font-weight:750; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .path-val { font-size:11px; font-weight:900; }
    .path-step.up .path-val { color:var(--green); }
    .path-step.down .path-val { color:var(--red); }
    .counter { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; align-items:end; padding:10px 11px; border-radius:9px; background:#fff; border:1px solid #d8e3eb; cursor:pointer; }
    .counter-name { color:#29475f; font-size:12px; font-weight:800; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .counter-val { font-size:12px; font-weight:900; }
    .counter.up .counter-val { color:var(--green); }
    .counter.down .counter-val { color:var(--red); }
    .empty { color:#71869a; font-size:12px; }
    .brand { display:flex; align-items:center; gap:10px; min-width:0; }
    .pulse-mark { width:28px; height:22px; flex:0 0 auto; overflow:visible; }
    .pulse-mark .track { fill:none; stroke:#c7dceb; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
    .pulse-mark .run { fill:none; stroke:var(--blue); stroke-width:2.4; stroke-linecap:round; stroke-linejoin:round; path-length:1; stroke-dasharray:1; stroke-dashoffset:1; animation:titleSignal 4.8s cubic-bezier(.2,.7,.2,1) infinite; }
    .title b { position:relative; }
    .title b::after { content:''; position:absolute; left:0; right:0; bottom:-5px; height:2px; border-radius:99px; background:linear-gradient(90deg,transparent,#0a6ed1,#3bb7d6,transparent); transform:scaleX(0); transform-origin:left; animation:titleSweep 4.8s ease-in-out infinite; }
    .zoom-tools { position:absolute; right:14px; top:14px; z-index:8; display:flex; align-items:center; gap:4px; padding:4px; border:1px solid #d7e3ec; border-radius:10px; background:rgba(255,255,255,.94); box-shadow:0 4px 12px rgba(32,68,96,.08); backdrop-filter:blur(4px); }
    .zoom-btn { width:30px; height:28px; border:0; border-radius:7px; background:transparent; color:#34536c; font-size:16px; font-weight:850; cursor:pointer; }
    .zoom-btn:hover { background:#eef5fb; color:var(--blue); }
    .zoom-fit { width:auto; padding:0 8px; font-size:11px; }
    .zoom-label { min-width:42px; text-align:center; color:#60778c; font-size:11px; font-weight:800; user-select:none; }
    .tree-zoom-wrap { position:relative; }
    .tree-canvas { transform-origin:0 0; }
    .error { width:100%; height:100%; display:flex; align-items:center; justify-content:center; text-align:center; padding:32px; color:#60778d; }
    .error strong { display:block; color:#173651; font-size:21px; margin-bottom:8px; }
    @keyframes drawEdge { to { stroke-dashoffset:0; } }
    @keyframes pathNode { 0% { transform:translateY(-50%) scale(1); } 55% { transform:translateY(-50%) scale(1.035); } 100% { transform:translateY(-50%) scale(1); } }
    @keyframes titleSignal { 0%,70% { stroke-dashoffset:1; opacity:.2; } 76% { opacity:1; } 88% { stroke-dashoffset:0; opacity:1; } 96%,100% { stroke-dashoffset:-1; opacity:.15; } }
    @keyframes titleSweep { 0%,72% { transform:scaleX(0); opacity:0; } 80% { transform:scaleX(.55); opacity:.9; } 90% { transform:scaleX(1); opacity:.7; } 100% { transform:scaleX(1); opacity:0; } }
    @media (max-width: 900px) { .body { grid-template-columns:minmax(0,1fr) 290px; } .head { gap:14px; } .title { font-size:22px; } }
    @media (max-width: 720px) { .body { grid-template-columns:1fr; } .panel { display:none; } .context { display:none; } .head { grid-template-columns:1fr auto; } }
    @media (max-height: 500px) { .head { min-height:56px; padding:10px 14px; } .panel { padding:13px; gap:11px; } .big { font-size:29px; } }
  `;

  STYLES += `
    .hp { grid-template-rows:auto auto minmax(0,1fr); }
    .head { min-height:72px; grid-template-columns:auto minmax(260px,1fr) auto; padding:14px 20px; }
    .brand { gap:12px; }
    .title { font-size:29px; }
    .pulse-mark { width:32px; height:24px; }
    .header-center { min-width:0; display:flex; align-items:center; gap:10px; justify-content:flex-start; }
    .metric-select { height:38px; min-width:190px; max-width:280px; padding:0 34px 0 12px; border:1px solid #bfd0dd; border-radius:9px; background:#fff; color:#17364f; font-size:14px; font-weight:800; outline:none; }
    .metric-select:focus { border-color:var(--blue); box-shadow:0 0 0 2px rgba(10,110,209,.10); }
    .context { font-size:14px; font-weight:750; }
    .actions .btn { height:38px; font-size:13px; padding:0 14px; }

    .summary-strip { display:grid; grid-template-columns:minmax(150px,.8fr) minmax(150px,.8fr) minmax(150px,.8fr) minmax(240px,1.35fr); gap:10px; padding:10px 12px; border-bottom:1px solid #e4edf4; background:#f8fbfd; }
    .summary-card { min-width:0; min-height:82px; padding:12px 14px; border:1px solid #dce7ef; border-radius:12px; background:#fff; display:flex; flex-direction:column; justify-content:center; }
    .summary-label { color:#6b8194; font-size:11px; line-height:1; font-weight:850; letter-spacing:.045em; text-transform:uppercase; }
    .summary-value { margin-top:7px; color:#17364f; font-size:22px; line-height:1; font-weight:900; letter-spacing:-.02em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .summary-sub { margin-top:5px; color:#6b8194; font-size:12px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .summary-card.up .summary-sub strong { color:var(--green); }
    .summary-card.down .summary-sub strong { color:var(--red); }
    .signature-card { position:relative; overflow:hidden; min-height:82px; border-radius:12px; background:linear-gradient(135deg,#0a5aa5 0%,#0a6ed1 52%,#338fd7 100%); color:#fff; padding:11px 14px; box-shadow:inset 0 1px 0 rgba(255,255,255,.16); }
    .signature-card::after { content:''; position:absolute; inset:-35% -10% auto 38%; height:150%; background:radial-gradient(circle,rgba(255,255,255,.16),transparent 60%); pointer-events:none; }
    .signature-head { position:relative; z-index:2; display:flex; justify-content:space-between; gap:10px; align-items:baseline; }
    .signature-title { font-size:11px; font-weight:850; letter-spacing:.055em; text-transform:uppercase; opacity:.78; }
    .signature-node { min-width:0; font-size:14px; font-weight:900; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .signature-svg { position:relative; z-index:2; width:100%; height:46px; margin-top:2px; overflow:visible; }
    .sig-base { stroke:rgba(255,255,255,.28); stroke-width:1.25; fill:none; }
    .sig-flow { fill:none; stroke-linecap:round; stroke-width:3; pathLength:1; stroke-dasharray:1; stroke-dashoffset:1; animation:sigDraw .9s cubic-bezier(.2,.75,.25,1) forwards; animation-delay:var(--sig-delay); }
    .sig-up { stroke:#baf0d2; } .sig-down { stroke:#ffd0d6; } .sig-neutral { stroke:#d9ebfa; }
    .sig-dot { fill:#fff; opacity:.92; }

    .body { grid-template-columns:minmax(0,1fr) 350px; }
    .stage { background:linear-gradient(180deg,#fff 0%,#fbfdff 100%); }
    .node-card { width:214px; min-height:90px; padding:13px 14px 11px; border-radius:12px; }
    .node-name { font-size:15px; line-height:1.18; min-height:35px; }
    .node-value { font-size:18px; }
    .node-delta { font-size:13px; }
    .node-share { height:4px; margin-top:9px; }
    .panel { padding:20px; gap:17px; }
    .crumbs { font-size:12px; min-height:16px; }
    .eyebrow { font-size:11px; }
    .panel h2 { font-size:27px; }
    .big { font-size:38px; }
    .period { font-size:12px; }
    .pct { font-size:23px; }
    .abs { font-size:12px; }
    .comparison-line { margin-top:3px; color:#60788d; font-size:12px; font-weight:750; }
    .section-title { font-size:14px; }
    .path-name { font-size:13px; }
    .path-val { font-size:12px; }
    .contrib-list { display:grid; gap:7px; }
    .contrib { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:10px; align-items:center; padding:8px 9px; border-radius:8px; background:#fff; border:1px solid #e1e9ef; cursor:pointer; }
    .contrib-name { min-width:0; font-size:13px; font-weight:800; color:#29475f; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .contrib-val { font-size:12px; font-weight:900; }
    .contrib.up .contrib-val { color:var(--green); } .contrib.down .contrib-val { color:var(--red); }
    .explore-btn { width:100%; height:38px; border:1px solid #b7cada; border-radius:9px; background:#fff; color:#185f9e; font-size:13px; font-weight:900; cursor:pointer; }
    .explore-btn:hover { border-color:var(--blue); background:#f5faff; }
    .branch-details { display:grid; gap:6px; padding-top:10px; }
    .detail-head, .detail-row { display:grid; grid-template-columns:minmax(0,1fr) 72px 66px 58px; gap:8px; align-items:center; }
    .detail-head { color:#73889a; font-size:10px; font-weight:850; text-transform:uppercase; letter-spacing:.04em; padding:0 6px; }
    .detail-row { padding:8px 6px; border-top:1px solid #e5edf2; font-size:11px; color:#36536a; }
    .detail-row b { font-size:12px; color:#213f58; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .detail-row .pos { color:var(--green); font-weight:900; } .detail-row .neg { color:var(--red); font-weight:900; }

    .overview-card { position:absolute; left:14px; bottom:14px; z-index:9; width:248px; height:126px; padding:9px 10px 10px; border:1px solid #d7e3ec; border-radius:11px; background:rgba(255,255,255,.96); box-shadow:0 5px 16px rgba(32,68,96,.10); user-select:none; }
    .overview-title { color:#5d7589; font-size:10px; font-weight:900; letter-spacing:.055em; text-transform:uppercase; margin-bottom:5px; }
    .overview-svg { width:100%; height:92px; cursor:grab; touch-action:none; }
    .overview-svg:active { cursor:grabbing; }
    .ov-edge { fill:none; stroke:#c5d3de; stroke-width:5; vector-effect:non-scaling-stroke; }
    .ov-node { fill:#7897af; }
    .ov-node.path { fill:#0a6ed1; }
    .ov-view { fill:rgba(10,110,209,.08); stroke:#0a6ed1; stroke-width:8; vector-effect:non-scaling-stroke; }
    .legend { position:static; display:flex; flex-wrap:wrap; gap:12px; align-items:center; padding:10px 12px; border:1px solid #d7e3ec; border-radius:10px; background:#fff; color:#60778a; font-size:11px; font-weight:800; }
    .legend span { display:flex; align-items:center; gap:5px; white-space:nowrap; }
    .legend i { width:8px; height:8px; border-radius:50%; background:#8ca3b5; }
    .legend .lg-up { background:var(--green); } .legend .lg-down { background:var(--red); } .legend .lg-sel { background:var(--blue); }
    .level-label { position:absolute; top:16px; color:#8295a5; font-size:10px; font-weight:900; letter-spacing:.05em; text-transform:uppercase; white-space:nowrap; pointer-events:none; }

    @keyframes sigDraw { to { stroke-dashoffset:0; } }
    @media (max-width:1050px) { .summary-strip { grid-template-columns:repeat(3,minmax(130px,1fr)); } .signature-card { display:none; } .body { grid-template-columns:minmax(0,1fr) 320px; } }
    @media (max-width:820px) { .summary-strip { grid-template-columns:1fr 1fr; } .body { grid-template-columns:1fr; } .panel { display:none; } .header-center .context { display:none; } .head { grid-template-columns:auto minmax(150px,1fr) auto; } }
    @media (max-height:620px) { .summary-strip { display:none; } .overview-card { transform:scale(.88); transform-origin:left bottom; } }
  `;


  STYLES += `
    /* v0.9 executive readability and motion */
    .hp { grid-template-rows:auto auto minmax(0,1fr); border-radius:14px; box-shadow:0 8px 28px rgba(22,54,82,.08); }
    .head { min-height:84px; grid-template-columns:auto minmax(300px,1fr) auto; gap:28px; padding:16px 24px; }
    .title { font-size:34px; letter-spacing:-.035em; }
    .pulse-mark { width:38px; height:30px; }
    .header-center { gap:14px; }
    .metric-static { color:#183a58; font-size:18px; font-weight:900; white-space:nowrap; }
    .metric-select { min-width:250px; height:44px; font-size:17px; border-radius:10px; }
    .context { font-size:17px; font-weight:800; color:#526d84; }
    .actions .btn { height:44px; padding:0 18px; font-size:15px; border-radius:10px; }

    .summary-strip { grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; padding:14px 16px; background:#f7fafc; }
    .summary-card { min-height:112px; padding:17px 19px; border-radius:13px; }
    .summary-label { font-size:13px; }
    .summary-value { margin-top:10px; font-size:29px; overflow:visible; text-overflow:clip; white-space:normal; line-height:1.05; }
    .summary-value.kpi-value { font-size:34px; }
    .summary-sub { margin-top:9px; display:flex; align-items:baseline; gap:12px; font-size:16px; white-space:normal; }
    .summary-sub strong { font-size:18px; }

    .body { grid-template-columns:minmax(0,1fr) 400px; }
    .node-card { width:244px; min-height:108px; padding:15px 16px 13px; border-radius:13px; }
    .node-name { font-size:18px; line-height:1.2; min-height:43px; overflow-wrap:normal; word-break:normal; white-space:normal; }
    .node-value { font-size:23px; }
    .node-delta { font-size:16px; }
    .node-share { height:5px; margin-top:11px; }
    .node-card.selected { border-width:2px; }
    .node-card.path-node { animation:pathNodeExecutive .68s cubic-bezier(.2,.75,.2,1) both; animation-delay:var(--delay); }
    .node-card.path-node.up { box-shadow:0 0 0 3px rgba(10,143,85,.11),0 10px 24px rgba(24,60,88,.13); }
    .node-card.path-node.down { box-shadow:0 0 0 3px rgba(201,52,77,.10),0 10px 24px rgba(24,60,88,.13); }

    .edge { stroke-width:1.8; }
    .edge.path-base { stroke-width:3.2; opacity:.8; }
    .edge.path-run { stroke-width:6; filter:drop-shadow(0 0 2px rgba(10,110,209,.18)); animation:drawEdgeExecutive .72s cubic-bezier(.18,.72,.24,1) forwards; animation-delay:var(--delay); }
    .edge.path-travel { fill:none; stroke-width:3.1; stroke-linecap:round; stroke-dasharray:9 13; opacity:0; animation:pathTravel 1.05s linear infinite, pathTravelReveal .25s ease forwards; animation-delay:calc(var(--delay) + .58s), calc(var(--delay) + .48s); }
    .edge.path-travel.up { stroke:#37a874; } .edge.path-travel.down { stroke:#df6074; } .edge.path-travel.neutral { stroke:#1e83df; }

    .panel { padding:24px 24px 26px; gap:20px; }
    .crumbs { font-size:14px; line-height:1.35; }
    .eyebrow { font-size:12px; }
    .panel h2 { font-size:32px; margin-top:5px; }
    .big { font-size:46px; }
    .period { font-size:14px; margin-top:8px; }
    .pct { font-size:28px; }
    .abs { font-size:15px; margin-top:7px; }
    .comparison-line { margin-top:2px; padding:14px 0 2px; display:grid; grid-template-columns:auto 1fr auto auto 1fr; gap:8px; align-items:baseline; border-top:1px solid #dfe8ef; color:#60778c; font-size:13px; }
    .comparison-line b { color:#193b57; font-size:16px; }
    .compare-arrow { color:#8aa0b1; font-size:19px; text-align:center; }
    .section { padding-top:16px; }
    .section-title { font-size:16px; margin-bottom:11px; }
    .contrib-list { gap:9px; }
    .contrib { padding:11px 12px; border-radius:9px; }
    .contrib-name { font-size:15px; white-space:normal; }
    .contrib-val { font-size:15px; }
    .contrib-val small { font-size:13px; margin-left:5px; }
    .explore-btn { height:44px; font-size:15px; border-radius:10px; }
    .detail-head, .detail-row { grid-template-columns:minmax(0,1fr) 84px 84px 64px; }
    .detail-head { font-size:11px; }
    .detail-row { font-size:13px; }
    .detail-row b { font-size:14px; white-space:normal; }

    .zoom-tools { right:18px; top:18px; padding:6px; gap:5px; border-radius:11px; }
    .zoom-btn { width:36px; height:34px; font-size:18px; }
    .zoom-fit { width:auto; padding:0 11px; font-size:13px; }
    .zoom-label { min-width:52px; font-size:13px; }
    .overview-card { left:18px; bottom:18px; width:300px; height:142px; padding:11px 12px 12px; border-radius:12px; }
    .overview-title { font-size:12px; margin-bottom:6px; }
    .overview-svg { height:103px; }
    .legend { gap:15px; padding:11px 12px; font-size:13px; margin-top:auto; }
    .legend i { width:9px; height:9px; }

    @keyframes drawEdgeExecutive { 0% { stroke-dashoffset:1; opacity:.12; } 30% { opacity:1; } 100% { stroke-dashoffset:0; opacity:1; } }
    @keyframes pathTravel { to { stroke-dashoffset:-44; } }
    @keyframes pathTravelReveal { to { opacity:.92; } }
    @keyframes pathNodeExecutive { 0% { transform:translateY(-50%) scale(1); } 45% { transform:translateY(-50%) scale(1.075); } 72% { transform:translateY(-50%) scale(1.025); } 100% { transform:translateY(-50%) scale(1); } }

    @media (max-width:1100px) { .body { grid-template-columns:minmax(0,1fr) 350px; } .title { font-size:30px; } .node-card { width:224px; } }
    @media (max-height:650px) { .summary-card { min-height:96px; } .overview-card { transform:scale(.9); transform-origin:left bottom; } }
  `;


  STYLES += `
    /* v0.10 compact executive composition */
    .hp { grid-template-rows:auto auto minmax(0,1fr); border-radius:14px; }
    .head { min-height:58px; padding:10px 16px; gap:18px; }
    .brand { gap:10px; }
    .pulse-mark { width:27px; height:21px; }
    .title { font-size:27px; }
    .header-center { gap:12px; }
    .metric-static { color:#17364f; font-size:15px; font-weight:850; white-space:nowrap; }
    .metric-select { height:34px; min-width:180px; font-size:14px; }
    .context { font-size:14px; }
    .actions .btn { height:34px; font-size:12px; }

    .executive-strip { min-height:64px; display:grid; grid-template-columns:minmax(180px,.9fr) minmax(220px,1fr) minmax(220px,1fr); align-items:stretch; border-bottom:1px solid #e4edf4; background:#f8fbfd; }
    .exec-item { min-width:0; display:grid; grid-template-columns:auto minmax(0,1fr) auto; grid-template-rows:auto auto; column-gap:12px; align-items:center; padding:10px 18px; border-right:1px solid #e0e9f0; }
    .exec-item:last-child { border-right:0; }
    .exec-label { grid-column:1; grid-row:1 / span 2; color:#6d8193; font-size:11px; line-height:1; font-weight:900; letter-spacing:.055em; text-transform:uppercase; }
    .exec-name { grid-column:2; grid-row:1; color:#17364f; font-size:20px; line-height:1.05; font-weight:900; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .exec-kpi-value { grid-column:2; grid-row:1; color:#102f49; font-size:27px; line-height:1; font-weight:900; letter-spacing:-.025em; }
    .exec-meta { grid-column:2 / 4; grid-row:2; display:flex; align-items:baseline; gap:10px; color:#687f92; font-size:13px; font-style:normal; font-weight:800; }
    .exec-meta b { font-size:14px; }
    .exec-meta i { font-style:normal; }
    .exec-item.up .exec-meta b { color:var(--green); }
    .exec-item.down .exec-meta b { color:var(--red); }

    .body { grid-template-columns:minmax(0,1fr) 286px; }
    .stage { min-width:0; min-height:0; display:grid; grid-template-rows:minmax(0,1fr) 66px; overflow:hidden; background:#fff; }
    .tree-scroll { grid-row:1; min-height:0; }
    .overview-card { position:relative; left:auto; bottom:auto; grid-row:2; width:auto; height:56px; margin:0 12px 10px; padding:6px 9px 7px; border-radius:9px; box-shadow:none; background:#f8fbfd; }
    .overview-title { display:none; }
    .overview-svg { width:100%; height:42px; }
    .ov-edge { stroke-width:3; }
    .ov-node { r:12; }
    .zoom-tools { right:12px; top:12px; padding:4px; }
    .zoom-btn { width:31px; height:29px; font-size:16px; }
    .zoom-fit { width:auto; padding:0 8px; font-size:12px; }
    .zoom-label { min-width:44px; font-size:12px; }

    .node-card { width:212px; min-height:78px; padding:10px 12px 9px; border-radius:10px; }
    .node-name { font-size:16px; line-height:1.15; min-height:20px; font-weight:900; white-space:normal; }
    .node-metrics { margin-top:5px; }
    .node-value { font-size:20px; }
    .node-delta { font-size:14px; }
    .node-share { height:4px; margin-top:8px; }

    .panel { padding:14px 15px 12px; gap:11px; }
    .crumbs { font-size:11px; min-height:14px; }
    .eyebrow { font-size:10px; }
    .panel h2 { font-size:24px; }
    .big { font-size:33px; }
    .period { font-size:11px; margin-top:4px; }
    .pct { font-size:20px; }
    .abs { font-size:11px; margin-top:3px; }
    .comparison-line { font-size:11px; }
    .section { padding-top:10px; }
    .section-title { font-size:13px; margin-bottom:7px; }
    .contrib-list { gap:5px; }
    .contrib { padding:7px 8px; }
    .contrib-name { font-size:12px; }
    .contrib-val { font-size:11px; }
    .explore-btn { height:34px; font-size:12px; }
    .legend { gap:10px; padding:8px 9px; font-size:11px; margin-top:auto; }
    .legend i { width:8px; height:8px; }
    .level-label { top:10px; font-size:9px; }

    @media (max-width:1100px) {
      .body { grid-template-columns:minmax(0,1fr) 270px; }
      .executive-strip { grid-template-columns:1fr 1fr 1fr; }
      .exec-item { padding:9px 12px; column-gap:8px; }
      .exec-name { font-size:18px; }
      .exec-kpi-value { font-size:24px; }
    }
    @media (max-height:650px) {
      .head { min-height:52px; padding:8px 14px; }
      .executive-strip { min-height:56px; }
      .exec-item { padding-top:7px; padding-bottom:7px; }
      .stage { grid-template-rows:minmax(0,1fr) 54px; }
      .overview-card { height:46px; }
      .overview-svg { height:34px; }
    }
  `;


  STYLES += `
    /* v0.11 executive cleanup: white + SAP blue, true fit, readable labels */
    .hp { --muted:#527595; --line:#d6eafb; --panel:#ffffff; background:#fff; border-color:#cfe4f7; box-shadow:0 8px 24px rgba(10,110,209,.07); }
    .head { border-bottom-color:#dceefe; background:#fff; }
    .context { color:#456d8d; }
    .btn { border-color:#b7d8f2; color:#244f73; background:#fff; }
    .btn:hover { border-color:var(--blue); background:#f3f9ff; }
    .btn.active { background:#eaf5ff; border-color:#62a8e6; color:#075faa; }
    .btn:disabled { opacity:.45; cursor:default; background:#f7fbff; color:#6f92ad; border-color:#d4e8f8; }
    .anim-toggle { min-width:106px; }
    .motion-off .pulse-mark .run, .motion-off .title b::after { animation:none !important; opacity:.22; }

    .executive-strip { background:#fff; border-bottom-color:#dceefe; }
    .exec-item { border-right-color:#dceefe; }
    .exec-label { color:#456f91; text-transform:none; letter-spacing:0; font-size:12px; line-height:1.15; }
    .exec-measure-label { max-width:190px; white-space:normal; }
    .exec-name { color:#123a5c; }
    .exec-meta { color:#527595; }

    .body, .stage, .panel { background:#fff; }
    .body { grid-template-columns:minmax(0,1fr) 300px; }
    .panel { border-left:1px solid #dceefe; }
    .tree-scroll { scrollbar-color:#9bc8eb transparent; }
    .tree-scroll::-webkit-scrollbar-thumb { background:#9bc8eb; }
    .edge { stroke:#c9e1f4; }
    .edge.path-base { stroke:#7eb8e7; }
    .edge.path-static { fill:none; stroke-width:5.5; stroke-linecap:round; opacity:.95; }
    .edge.path-static.up { stroke:var(--green); }
    .edge.path-static.down { stroke:var(--red); }
    .edge.path-static.neutral { stroke:var(--blue); }
    .node-card { border-color:#cfe4f7; box-shadow:0 3px 10px rgba(10,110,209,.06); }
    .node-card:hover { border-color:#6eb0e8; box-shadow:0 7px 18px rgba(10,110,209,.11); }
    .node-card.neutral .node-delta { color:#4d7da4; }
    .node-card.path-static-node.up { border-color:#69c89a; box-shadow:0 0 0 3px rgba(10,143,85,.09),0 7px 18px rgba(10,110,209,.07); }
    .node-card.path-static-node.down { border-color:#e48e9e; box-shadow:0 0 0 3px rgba(201,52,77,.08),0 7px 18px rgba(10,110,209,.07); }
    .node-card.path-static-node.neutral { border-color:#66abe4; box-shadow:0 0 0 3px rgba(10,110,209,.09),0 7px 18px rgba(10,110,209,.07); }
    .node-share { background:#eaf4fc; }

    .zoom-tools { border-color:#cfe4f7; box-shadow:0 4px 12px rgba(10,110,209,.07); }
    .zoom-btn { color:#315f83; }
    .zoom-btn:hover { background:#eef7ff; color:var(--blue); }
    .zoom-label { color:#456f91; }
    .overview-card { background:#f4faff; border-color:#d4e9fa; }
    .ov-edge { stroke:#b8d8f1; }
    .ov-node { fill:#dceefb; }
    .ov-node.path { fill:#78b7e8; }
    .ov-view { stroke:#0a6ed1; fill:rgba(10,110,209,.07); }

    .crumbs, .period, .comparison-line, .eyebrow { color:#527595; }
    .comparison-line { background:#f5faff; border-color:#d8ebfa; }
    .section { border-top-color:#dceefe; }
    .contrib { background:#f8fcff; border-color:#d9ecfa; }
    .explore-btn { border-color:#b8d9f3; color:#0a5fae; background:#fff; }
    .branch-details { border-color:#d8ebfa; background:#fff; }
    .detail-head { background:#f3f9ff; color:#527595; }
    .detail-row { border-top-color:#e4f1fb; }
    .legend { flex-wrap:nowrap; justify-content:space-between; gap:7px; padding:9px 10px; font-size:12px; border-color:#cfe4f7; color:#456f91; background:#fff; overflow:hidden; }
    .legend span { gap:4px; flex:0 1 auto; white-space:nowrap; }
    .legend i { flex:0 0 auto; background:#79a9ce; }
    .legend .lg-up { background:var(--green); } .legend .lg-down { background:var(--red); } .legend .lg-sel { background:var(--blue); }

    @media (max-width:1100px) {
      .body { grid-template-columns:minmax(0,1fr) 282px; }
      .anim-toggle { min-width:96px; }
      .legend { font-size:11px; gap:5px; }
    }
  `;


  STYLES += `
    /* Delta-first executive design */
    :host { --hp-soft-blue:#f5faff; --hp-border:#cfe6f8; --hp-ink:#103a5d; --hp-muted:#4f7594; }
    .hp { border-color:var(--hp-border); box-shadow:0 8px 24px rgba(10,110,209,.055); }
    .head { min-height:56px; padding:9px 15px; gap:14px; border-bottom-color:#d9ecfb; }
    .title { font-size:28px; }
    .metric-static,.metric-select { font-size:15px; font-weight:900; color:var(--hp-ink); }
    .context { font-size:14px; font-weight:750; color:var(--hp-muted); }
    .actions { gap:6px; }
    .btn { height:34px; font-size:13px; border-color:#b9d9f2; }
    .icon-btn { min-width:34px; width:34px; padding:0; font-size:18px; line-height:1; }
    .text-icon-btn { display:inline-flex; align-items:center; justify-content:center; gap:7px; min-width:0; width:auto; padding:0 12px; font-size:13px; font-weight:850; white-space:nowrap; }
    .text-icon-btn svg { width:15px; height:15px; flex:0 0 15px; fill:none; stroke:currentColor; stroke-width:1.9; stroke-linecap:round; stroke-linejoin:round; }
    .anim-control { display:flex; align-items:center; gap:8px; height:34px; padding:0 10px; border:1px solid #b9d9f2; border-radius:8px; background:#fff; color:#244f73; font-size:13px; font-weight:850; cursor:pointer; }
    .anim-control:hover { border-color:var(--blue); background:#f5faff; }
    .toggle-track { width:30px; height:17px; border-radius:99px; background:#c9dfef; padding:2px; display:inline-flex; align-items:center; transition:.18s ease; }
    .toggle-knob { width:13px; height:13px; border-radius:50%; background:#fff; box-shadow:0 1px 3px rgba(16,58,93,.18); transform:translateX(0); transition:.18s ease; }
    .anim-control.active .toggle-track { background:var(--blue); }
    .anim-control.active .toggle-knob { transform:translateX(13px); }

    .executive-strip { min-height:70px; background:#fff; border-bottom-color:#d9ecfb; grid-template-columns:minmax(220px,.95fr) minmax(250px,1fr) minmax(250px,1fr); }
    .exec-item { padding:10px 16px; border-right-color:#d9ecfb; grid-template-columns:minmax(0,1fr) auto; grid-template-rows:auto auto; column-gap:10px; }
    .exec-label { grid-column:1 / 3; grid-row:1; font-size:13px; font-weight:850; color:#4f7594; text-transform:none; letter-spacing:0; }
    .exec-name { grid-column:1; grid-row:2; font-size:18px; font-weight:900; color:#123a5c; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .exec-kpi-value { grid-column:1; grid-row:2; font-size:28px; font-weight:950; color:#103a5d; }
    .exec-meta { grid-column:2; grid-row:2; justify-self:end; gap:8px; font-size:14px; }
    .exec-meta b { font-size:16px; }
    .exec-path { font-size:12px; color:#5d7e9a; margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

    .body { grid-template-columns:minmax(0,1fr) 340px; }
    .stage { grid-template-rows:minmax(0,1fr); background:#fff; }
    .tree-scroll { scrollbar-width:none; background:#fff; }
    .tree-scroll::-webkit-scrollbar { display:none; }
    .overview-card { height:52px; margin:0 12px 8px; padding:5px 8px; background:#f6fbff; border-color:#d6ebfa; }
    .overview-svg { height:40px; }
    .zoom-tools { left:12px; right:auto; top:auto; bottom:12px; border-color:#cfe6f8; background:rgba(255,255,255,.97); }
    .zoom-btn { color:#315f83; }
    .zoom-label { font-size:13px; }
    .zoom-fit { font-size:13px; }

    .edge { stroke:#a9cee9; opacity:.34; stroke-linecap:round; transition:opacity .18s ease,stroke-width .18s ease; }
    .edge.impact.up { stroke:var(--green); }
    .edge.impact.down { stroke:var(--red); }
    .edge.impact.neutral { stroke:#77acd6; }
    .edge.path-base { opacity:.34; }
    .edge.path-run,.edge.path-static { opacity:1; filter:drop-shadow(0 0 2px rgba(10,110,209,.12)); }
    .focus .edge:not(.path-base):not(.path-run):not(.path-static) { opacity:.12; }

    .node-card { width:196px; min-height:104px; padding:10px 11px; border-radius:11px; border-color:#cfe6f8; box-shadow:0 3px 9px rgba(10,110,209,.055); }
    .node-card:hover { border-color:#69abe0; box-shadow:0 7px 18px rgba(10,110,209,.11); }
    .node-card.selected { border-color:var(--blue)!important; box-shadow:0 0 0 3px rgba(10,110,209,.12),0 7px 18px rgba(10,110,209,.10)!important; }
    .node-name { min-height:19px; font-size:16px; line-height:1.16; font-weight:950; color:#113b5d; overflow:visible; }
    .node-delta-main { margin-top:6px; display:flex; align-items:baseline; justify-content:space-between; gap:8px; }
    .node-delta-abs { font-size:20px; line-height:1; font-weight:950; letter-spacing:-.015em; white-space:nowrap; }
    .node-delta-pct { font-size:14px; line-height:1; font-weight:900; white-space:nowrap; }
    .node-card.up .node-delta-abs,.node-card.up .node-delta-pct { color:var(--green); }
    .node-card.down .node-delta-abs,.node-card.down .node-delta-pct { color:var(--red); }
    .node-card.neutral .node-delta-abs,.node-card.neutral .node-delta-pct { color:#4f7fa5; }
    .node-current { margin-top:5px; font-size:14px; line-height:1.1; font-weight:800; color:#527595; white-space:nowrap; }
    .delta-axis { position:relative; height:8px; margin-top:8px; border-radius:99px; background:#eef7fd; overflow:hidden; }
    .delta-axis:after { content:''; position:absolute; left:50%; top:0; bottom:0; width:1px; background:#8db9da; }
    .delta-fill { position:absolute; top:1px; bottom:1px; border-radius:99px; min-width:0; }
    .delta-fill.pos { left:50%; background:var(--green); }
    .delta-fill.neg { right:50%; background:var(--red); }
    .delta-fill.neu { left:50%; background:#77acd6; }

    .panel { padding:15px 16px 12px; gap:12px; border-left-color:#d9ecfb; background:#fff; }
    .crumbs { font-size:14px; line-height:1.25; min-height:18px; color:#527595; }
    .eyebrow { font-size:13px; letter-spacing:.03em; color:#4f7594; }
    .panel h2 { font-size:28px; line-height:1.08; color:#103a5d; }
    .big { font-size:32px; }
    .period { font-size:14px; color:#527595; }
    .pct { font-size:22px; }
    .abs { font-size:14px; }
    .comparison-line { padding:11px 0 3px; font-size:14px; grid-template-columns:auto auto auto auto auto; gap:7px; }
    .comparison-line b { font-size:15px; }
    .section-title { font-size:15px; margin-bottom:8px; }
    .contrib-list { gap:6px; }
    .contrib { padding:8px 9px; border-color:#d8ebfa; background:#fff; }
    .contrib-name { font-size:14px; white-space:normal; }
    .contrib-val { font-size:14px; }
    .contrib-val small { font-size:13px; margin-left:4px; }
    .explore-btn { height:36px; font-size:14px; }
    .branch-details { padding-top:9px; overflow:hidden; }
    .detail-head,.detail-row { grid-template-columns:minmax(110px,1.8fr) minmax(60px,.9fr) minmax(60px,.9fr) minmax(62px,.9fr) minmax(52px,.7fr); gap:6px; align-items:center; }
    .detail-head { padding:7px 6px; font-size:12px; letter-spacing:0; text-transform:none; background:#f3f9ff; border-radius:7px 7px 0 0; }
    .detail-row { padding:8px 6px; font-size:13px; }
    .detail-row b { font-size:14px; white-space:normal; overflow:visible; text-overflow:clip; line-height:1.15; }
    .detail-row span { text-align:right; white-space:nowrap; }
    .detail-head span:not(:first-child) { text-align:right; }
    .legend { font-size:13px; gap:10px; padding:8px 9px; border-color:#cfe6f8; color:#456f91; }
    .legend i { width:9px; height:9px; }

    @media (max-width:1100px) {
      .body { grid-template-columns:minmax(0,1fr) 320px; }
      .executive-strip { grid-template-columns:1fr 1fr 1fr; }
      .exec-item { padding:9px 11px; }
      .exec-name { font-size:16px; }
      .exec-kpi-value { font-size:25px; }
    }
  `;

  function formatDetailValue(value, unit) {
    if (value == null || !isFinite(value)) return '—';
    var abs = Math.abs(value), prefix = unitPrefix(unit), suffix = genericUnitSuffix(unit), n;
    if (abs >= 1000000) {
      n = (value / 1000000).toLocaleString('en', {minimumFractionDigits:3, maximumFractionDigits:3});
      return prefix + n + 'M' + suffix;
    }
    if (abs >= 1000) {
      n = (value / 1000).toLocaleString('en', {minimumFractionDigits:1, maximumFractionDigits:1});
      return prefix + n + 'K' + suffix;
    }
    return prefix + Number(value).toLocaleString('en', {maximumFractionDigits:0}) + suffix;
  }

  STYLES += `
    .polarity-select { height:34px; max-width:220px; padding:0 30px 0 10px; border:1px solid #b9d9f2; border-radius:8px; background:#fff; color:#244f73; font-size:13px; font-weight:850; outline:none; }
    .polarity-select:focus { border-color:var(--blue); box-shadow:0 0 0 2px rgba(10,110,209,.10); }
    .polarity-select.auto-neutral { color:#456f91; }
    .layout-select { max-width:190px; }
    .legend .lg-fav { background:var(--green); }
    .legend .lg-adv { background:var(--red); }
    @media (max-width:1050px) { .polarity-select { max-width:180px; } .layout-select { max-width:165px; } }
  `;

  function HierarchyPulseWidget() {
    var self = Reflect.construct(HTMLElement, [], HierarchyPulseWidget);
    self._model = null;
    self._selectedId = null;
    self._selectedMeasureAlias = null;
    self._detailsOpen = false;
    self._focusPath = false;
    self._animationSeq = 0;
    self._animationEnabled = true;
    self._layoutDirection = 'ltr';
    self._polarityModes = {};
    self._collapsedIds = {};
    self._collapseSignature = null;
    self._zoom = 1;
    self._autoFit = true;
    self._renderTimer = null;
    self._lastSignature = null;
    self._resizeObserver = null;
    return self;
  }
  HierarchyPulseWidget.prototype = Object.create(HTMLElement.prototype);
  HierarchyPulseWidget.prototype.constructor = HierarchyPulseWidget;
  Object.setPrototypeOf(HierarchyPulseWidget, HTMLElement);

  HierarchyPulseWidget.prototype._ensure = function () {
    if (this.shadowRoot) return;
    this.attachShadow({ mode:'open' });
    this.shadowRoot.innerHTML = '<style>' + STYLES + '</style><div id="root" class="hp"></div>';
  };

  HierarchyPulseWidget.prototype._signature = function () {
    var b = this.hierarchyData;
    if (!b || !b.metadata || !b.metadata.feeds) return 'UNBOUND';
    var m = feedValues(b, 'measures'), t = feedValues(b, 'time'), n = feedValues(b, 'hierarchy');
    var rows = b.data || [], sample = [];
    var indexes = rows.length ? [0, Math.floor(rows.length/2), rows.length-1] : [];
    indexes.forEach(function (idx) {
      if (idx < 0 || idx >= rows.length) return;
      var row = rows[idx] || {};
      sample.push(m.concat(t).concat(n).map(function (alias) {
        var c = row[alias] || {};
        return [alias, c.id == null ? '' : String(c.id), c.raw == null ? '' : String(c.raw), c.parentId == null ? '' : String(c.parentId)];
      }));
    });
    return JSON.stringify({state:b.state || '',m:m,t:t,n:n,count:rows.length,sample:sample});
  };

  HierarchyPulseWidget.prototype._schedule = function () {
    var self = this;
    if (self._renderTimer) clearTimeout(self._renderTimer);
    self._renderTimer = setTimeout(function () { self._renderTimer = null; self._refresh(); }, 100);
  };

  HierarchyPulseWidget.prototype._refresh = function () {
    this._ensure();
    var sig = this._signature();
    if (sig !== this._lastSignature) { this._selectedId = null; this._collapseSignature = null; this._collapsedIds = {}; this._lastSignature = sig; }
    try {
      this._model = buildModel(this);
      if (this._model.mode !== 'native') throw new Error('Bind one native BW hierarchy dimension.');
      this._render();
    } catch (err) {
      this._model = null;
      this._renderError(String(err && err.message || err));
    }
  };

  HierarchyPulseWidget.prototype._renderError = function (message) {
    var root = this.shadowRoot.querySelector('#root');
    root.innerHTML = '<div class="error"><div><strong>Hierarchy Pulse</strong>' + esc(message) + '</div></div>';
  };

  HierarchyPulseWidget.prototype._maps = function () {
    return {
      current:nativeNodeMap(this._model.currentEntries || []),
      prior:nativeNodeMap(this._model.priorEntries || []),
      all:nativeNodeMap(this._model.allEntries || [])
    };
  };

  HierarchyPulseWidget.prototype._roots = function () {
    var structure = this._model.hierarchyStructure || {};
    var maps = this._maps();
    return Object.keys(structure).filter(function (id) {
      if (!maps.current[id] && !maps.prior[id]) return false;
      var p = structure[id] && structure[id].parentId;
      return !p || !structure[p];
    });
  };

  HierarchyPulseWidget.prototype._nodeData = function (id) {
    var model = this._model, structure = model.hierarchyStructure || {}, maps = this._maps();
    var cur = maps.current[id], prior = maps.prior[id], any = maps.all[id];
    var current = cur ? cur.value : 0;
    var previous = prior ? prior.value : null;
    return {
      id:id,
      label:(structure[id] && structure[id].label) || (cur && cur.label) || (prior && prior.label) || (any && any.label) || id,
      current:current,
      prior:previous,
      delta:previous == null ? null : current - previous,
      deltaPct:previous == null ? null : pctDelta(current, previous),
      parentId:structure[id] && structure[id].parentId || null,
      childIds:structure[id] && structure[id].childIds || []
    };
  };

  HierarchyPulseWidget.prototype._selected = function () {
    var roots = this._roots();
    if (this._selectedId && this._model.hierarchyStructure[this._selectedId]) return this._nodeData(this._selectedId);
    if (roots.length === 1) return this._nodeData(roots[0]);
    var maps = this._maps(), current = 0, prior = 0, hasPrior = false;
    roots.forEach(function (id) {
      if (maps.current[id]) current += maps.current[id].value;
      if (maps.prior[id]) { prior += maps.prior[id].value; hasPrior = true; }
    });
    return {id:null,label:'Global',current:current,prior:hasPrior?prior:null,delta:hasPrior?current-prior:null,deltaPct:hasPrior?pctDelta(current,prior):null,parentId:null,childIds:roots};
  };

  HierarchyPulseWidget.prototype._pathIds = function (id) {
    if (!id) return [];
    var structure = this._model.hierarchyStructure || {}, out = [], seen = {}, cur = id;
    while (cur && structure[cur] && !seen[cur]) { seen[cur] = true; out.push(cur); cur = structure[cur].parentId || null; }
    return out.reverse();
  };

  HierarchyPulseWidget.prototype._contextText = function () {
    var m = this._model;
    var current = m.currentScopeLabel || (m.currentPeriod ? displayPeriod(m.currentPeriod) : 'Current');
    var prior = m.priorScopeLabel || (m.priorPeriod ? displayPeriod(m.priorPeriod) : '');
    return esc(current + (prior ? ' vs ' + prior : ''));
  };

  HierarchyPulseWidget.prototype._dominantPath = function (startId) {
    var roots = this._roots(), self = this;
    function score(id) {
      var n = self._nodeData(id);
      return n.delta == null ? Math.abs(n.current || 0) : Math.abs(n.delta);
    }
    var current = startId;
    if (!current) {
      if (roots.length === 1) current = roots[0];
      else current = roots.slice().sort(function (a,b) { return score(b)-score(a); })[0] || null;
    }
    if (!current) return [];
    var out = [current], seen = {};
    seen[current] = true;
    while (true) {
      var nd = self._nodeData(current), children = (nd.childIds || []).filter(function (id) { return !seen[id]; });
      if (!children.length) break;
      children.sort(function (a,b) { return score(b)-score(a); });
      var next = children[0];
      if (!next) break;
      out.push(next); seen[next] = true; current = next;
    }
    return out;
  };

  HierarchyPulseWidget.prototype._largestCounterMove = function (pathIds) {
    var self=this, pathSet={}, pathTarget=null;
    (pathIds || []).forEach(function(id){pathSet[id]=true;});
    if (pathIds && pathIds.length) pathTarget=self._nodeData(pathIds[pathIds.length-1]);
    var targetSign = pathTarget && pathTarget.delta != null ? Math.sign(pathTarget.delta) : 0;
    var ids = Object.keys(self._model.hierarchyStructure || {}), best=null;
    ids.forEach(function(id){
      if (pathSet[id]) return;
      var n=self._nodeData(id);
      if (n.delta == null || !isFinite(n.delta) || Math.abs(n.delta)<1e-9) return;
      if (targetSign && Math.sign(n.delta) === targetSign) return;
      if (!best || Math.abs(n.delta) > Math.abs(best.delta)) best=n;
    });
    return best;
  };

  HierarchyPulseWidget.prototype._branchChildren = function (id) {
    var structure=this._model.hierarchyStructure||{}, current=id, guard=0;
    if (!current) { var roots=this._roots(); current=roots.length===1?roots[0]:null; }
    while (current && structure[current] && guard++ < 30) {
      var children=(structure[current].childIds||[]).slice();
      if (children.length !== 1) return {anchorId:current, childIds:children};
      current=children[0];
    }
    return {anchorId:current, childIds:current&&structure[current]?(structure[current].childIds||[]):[]};
  };

  HierarchyPulseWidget.prototype._isStructuralPassThrough = function (id) {
    var structure=this._model.hierarchyStructure||{}, node=structure[id];
    if(!node) return false;
    var parentId=node.parentId, parent=parentId&&structure[parentId];
    if(!parent) return false;
    var siblings=parent.childIds||[];
    if(siblings.length!==1) return false;
    var a=this._nodeData(id), b=this._nodeData(parentId);
    var scale=Math.max(1,Math.abs(a.delta||0),Math.abs(b.delta||0),Math.abs(a.current||0),Math.abs(b.current||0));
    return Math.abs((a.delta||0)-(b.delta||0)) <= scale*0.0005 && Math.abs((a.current||0)-(b.current||0)) <= scale*0.0005;
  };

  HierarchyPulseWidget.prototype._movementSummary = function () {
    var selected=this._selected(), self=this, pos=null, neg=null, rootSet={};
    this._roots().forEach(function(id){rootSet[id]=true;});
    Object.keys(this._model.hierarchyStructure || {}).forEach(function(id){
      var sn=self._model.hierarchyStructure[id];
      if(rootSet[id] || (sn && sn.isNode === false) || self._isStructuralPassThrough(id)) return;
      var n=self._nodeData(id);
      if(n.delta==null || !isFinite(n.delta) || Math.abs(n.delta)<1e-9) return;
      if(n.delta>0 && (!pos || n.delta>pos.delta)) pos=n;
      if(n.delta<0 && (!neg || n.delta<neg.delta)) neg=n;
    });
    return {selected:selected, positive:pos, negative:neg};
  };

  HierarchyPulseWidget.prototype._measureSelectHtml = function () {
    var model=this._model, options=model.measureOptions||[];
    if(options.length <= 1) return '<div class="metric-static">'+esc(model.measureLabel)+'</div>';
    var opts=options.map(function(o){ return '<option value="'+esc(o.alias)+'" '+(o.alias===model.measureAlias?'selected':'')+'>'+esc(o.label)+'</option>'; }).join('');
    return '<select id="hp-measure" class="metric-select" aria-label="KPI measure">'+opts+'</select>';
  };

  HierarchyPulseWidget.prototype._signatureHtml = function () {
    var summary=this._movementSummary(), nodes=summary.nodes.slice().sort(function(a,b){return Math.abs(b.delta||0)-Math.abs(a.delta||0);}).slice(0,5);
    var w=260,h=46,cx=28,cy=23, paths='', dots='';
    if(!nodes.length) return '<div class="signature-card"><div class="signature-head"><span class="signature-title">Branch signature</span><span class="signature-node">'+esc(summary.branchAnchor.label)+'</span></div></div>';
    nodes.forEach(function(n,i){
      var y=7+i*(32/Math.max(1,nodes.length-1||1));
      if(nodes.length===1)y=23;
      var cls=nodeClass(n.delta), ex=238, ey=y;
      var c1=92, c2=172;
      paths+='<path class="sig-base" d="M '+cx+' '+cy+' C '+c1+' '+cy+', '+c2+' '+ey+', '+ex+' '+ey+'"></path>';
      paths+='<path pathLength="1" class="sig-flow sig-'+cls+'" style="--sig-delay:'+(i*100)+'ms" d="M '+cx+' '+cy+' C '+c1+' '+cy+', '+c2+' '+ey+', '+ex+' '+ey+'"></path>';
      dots+='<circle class="sig-dot" cx="'+ex+'" cy="'+ey+'" r="2.8"></circle>';
    });
    return '<div class="signature-card"><div class="signature-head"><span class="signature-title">Branch signature</span><span class="signature-node">'+esc(summary.branchAnchor.label)+'</span></div><svg class="signature-svg" viewBox="0 0 '+w+' '+h+'">'+paths+dots+'</svg></div>';
  };

  HierarchyPulseWidget.prototype._summaryHtml = function () {
    var s=this._movementSummary(), unit=unitFromModel(this._model), selected=s.selected;
    function movement(label,node){
      if(!node) return '<div class="exec-item"><span class="exec-label">'+esc(label)+'</span><strong class="exec-name">—</strong><span class="exec-meta">No material movement</span></div>';
      var cls=nodeClass(node.delta);
      return '<div class="exec-item '+cls+'"><span class="exec-label">'+esc(label)+'</span><strong class="exec-name">'+esc(node.label)+'</strong><span class="exec-meta"><b>'+esc(compactDelta(node.delta,unit))+'</b><i>'+esc(node.deltaPct==null?'—':formatPct(node.deltaPct))+'</i></span></div>';
    }
    var current='<div class="exec-item exec-kpi '+nodeClass(selected.delta)+'"><span class="exec-label exec-measure-label">'+esc(this._model.measureLabel)+'</span><strong class="exec-kpi-value">'+esc(formatValue(selected.current,unit))+'</strong><span class="exec-meta"><b>'+esc(selected.delta==null?'—':compactDelta(selected.delta,unit))+'</b><i>'+esc(selected.deltaPct==null?'—':formatPct(selected.deltaPct))+'</i></span></div>';
    return '<div class="executive-strip">'+current+movement('Largest positive movement',s.positive)+movement('Largest negative movement',s.negative)+'</div>';
  };

  HierarchyPulseWidget.prototype._topContributors = function (id, limit) {
    var self=this, structure=this._model.hierarchyStructure||{};
    var childIds=id && structure[id] ? (structure[id].childIds||[]).slice() : this._roots();
    // Collapse purely structural one-child chains in the executive inspector.
    var guard=0;
    while(childIds.length===1 && guard++<20){
      var only=childIds[0], n=structure[only];
      if(!self._isStructuralPassThrough(only) || !n) break;
      childIds=(n.childIds||[]).slice();
    }
    return childIds.map(this._nodeData.bind(this)).filter(function(n){return n.delta!=null && isFinite(n.delta);}).sort(function(a,b){return Math.abs(b.delta)-Math.abs(a.delta);}).slice(0,limit||5);
  };

  HierarchyPulseWidget.prototype._overviewHtml = function () {
    var layout=this._lastLayout; if(!layout) return '';
    var structure=this._model.hierarchyStructure||{}, path=this._dominantPath(null), pathSet={}; path.forEach(function(id){pathSet[id]=true;});
    var edges='', nodes='';
    layout.ids.forEach(function(id){ var p=structure[id]&&structure[id].parentId; if(!p||!layout.pos[p]||!layout.pos[id])return; edges+='<path class="ov-edge" d="M '+(layout.pos[p].x+layout.cardW)+' '+layout.pos[p].y+' L '+layout.pos[id].x+' '+layout.pos[id].y+'"></path>'; });
    layout.ids.forEach(function(id){ var p=layout.pos[id]; nodes+='<circle class="ov-node '+(pathSet[id]?'path':'')+'" cx="'+(p.x+layout.cardW/2)+'" cy="'+p.y+'" r="18"></circle>'; });
    return '<div class="overview-card"><div class="overview-title">Hierarchy overview</div><svg id="hp-overview" class="overview-svg" viewBox="0 0 '+layout.width+' '+layout.height+'" preserveAspectRatio="none">'+edges+nodes+'<rect id="hp-overview-view" class="ov-view" x="0" y="0" width="1" height="1" rx="10"></rect></svg></div>';
  };

  HierarchyPulseWidget.prototype._updateOverviewViewport = function () {
    var sc=this.shadowRoot&&this.shadowRoot.querySelector('.tree-scroll'), rect=this.shadowRoot&&this.shadowRoot.querySelector('#hp-overview-view'), layout=this._lastLayout;
    if(!sc||!rect||!layout)return;
    var z=this._zoom||1;
    var x=Math.max(0,sc.scrollLeft/z), y=Math.max(0,sc.scrollTop/z), w=Math.min(layout.width,sc.clientWidth/z), h=Math.min(layout.height,sc.clientHeight/z);
    rect.setAttribute('x',x); rect.setAttribute('y',y); rect.setAttribute('width',Math.max(30,w)); rect.setAttribute('height',Math.max(30,h));
  };

  HierarchyPulseWidget.prototype._bindOverview = function () {
    var self=this, svg=self.shadowRoot.querySelector('#hp-overview'), sc=self.shadowRoot.querySelector('.tree-scroll'), layout=self._lastLayout;
    if(!svg||!sc||!layout)return;
    var move=function(ev){ var r=svg.getBoundingClientRect(); if(!r.width||!r.height)return; var nx=(ev.clientX-r.left)/r.width*layout.width; var ny=(ev.clientY-r.top)/r.height*layout.height; sc.scrollLeft=Math.max(0,nx*(self._zoom||1)-sc.clientWidth/2); sc.scrollTop=Math.max(0,ny*(self._zoom||1)-sc.clientHeight/2); self._updateOverviewViewport(); };
    var dragging=false;
    svg.addEventListener('pointerdown',function(ev){dragging=true;svg.setPointerCapture&&svg.setPointerCapture(ev.pointerId);move(ev);});
    svg.addEventListener('pointermove',function(ev){if(dragging)move(ev);});
    svg.addEventListener('pointerup',function(){dragging=false;});
    svg.addEventListener('pointercancel',function(){dragging=false;});
    sc.addEventListener('scroll',function(){self._updateOverviewViewport();},{passive:true});
    self._updateOverviewViewport();
  };

  HierarchyPulseWidget.prototype._bindTreePan = function () {
    var self=this, sc=self.shadowRoot&&self.shadowRoot.querySelector('.tree-scroll');
    if(!sc) return;
    var dragging=false, moved=false, startX=0, startY=0, startLeft=0, startTop=0, pointerId=null;
    function blockedTarget(target){
      return !!(target && target.closest && (target.closest('.node-card') || target.closest('.zoom-tools') || target.closest('button') || target.closest('select')));
    }
    sc.addEventListener('pointerdown',function(ev){
      if(ev.button!==0 || blockedTarget(ev.target)) return;
      dragging=true; moved=false; pointerId=ev.pointerId; startX=ev.clientX; startY=ev.clientY; startLeft=sc.scrollLeft; startTop=sc.scrollTop;
      sc.classList.add('is-panning');
      if(sc.setPointerCapture) try{sc.setPointerCapture(pointerId);}catch(e){}
    });
    sc.addEventListener('pointermove',function(ev){
      if(!dragging || ev.pointerId!==pointerId) return;
      var dx=ev.clientX-startX, dy=ev.clientY-startY;
      if(Math.abs(dx)>3 || Math.abs(dy)>3) moved=true;
      sc.scrollLeft=Math.max(0,startLeft-dx); sc.scrollTop=Math.max(0,startTop-dy);
      self._autoFit=false; self._updateOverviewViewport();
      if(moved) ev.preventDefault();
    });
    function end(ev){
      if(!dragging) return; dragging=false; sc.classList.remove('is-panning');
      if(sc.releasePointerCapture && pointerId!=null) try{sc.releasePointerCapture(pointerId);}catch(e){}
      pointerId=null;
    }
    sc.addEventListener('pointerup',end); sc.addEventListener('pointercancel',end); sc.addEventListener('pointerleave',function(ev){ if(dragging && ev.buttons===0) end(ev); });
    sc.addEventListener('wheel',function(ev){
      if(!(ev.ctrlKey||ev.metaKey)) return;
      ev.preventDefault();
      self._autoFit=false;
      var next=(self._zoom||1)+(ev.deltaY<0?0.08:-0.08);
      self._applyZoom(next,true); self._updateOverviewViewport();
    },{passive:false});
  };

  HierarchyPulseWidget.prototype._levelLabelHtml = function (layout) {
    var model=this._model, base=model.navLabels&&model.navLabels[0]?model.navLabels[0]:'Hierarchy';
    var byDepth={};
    layout.ids.forEach(function(id){var p=layout.pos[id]; if(p)byDepth[p.depth]=p.x;});
    return Object.keys(byDepth).map(function(d){return '<div class="level-label" style="left:'+byDepth[d]+'px">'+esc(base)+' · '+(Number(d)+1)+'</div>';}).join('');
  };

  HierarchyPulseWidget.prototype._layoutTree = function () {
    var model=this._model, structure=model.hierarchyStructure || {}, maps=this._maps();
    var ids=Object.keys(structure).filter(function(id){ return !!maps.current[id] || !!maps.prior[id]; });
    var visible={}; ids.forEach(function(id){visible[id]=true;});
    var order={};
    (model.currentEntries || []).concat(model.priorEntries || []).forEach(function(e){ if(order[e.id]==null) order[e.id]=e.rowIndex; });
    var children={}; ids.forEach(function(id){children[id]=[];});
    ids.forEach(function(id){ var p=structure[id] && structure[id].parentId; if(p && visible[p]) children[p].push(id); });
    Object.keys(children).forEach(function(id){ children[id].sort(function(a,b){ return (order[a] == null ? 1e9 : order[a]) - (order[b] == null ? 1e9 : order[b]); }); });
    var roots=ids.filter(function(id){ var p=structure[id] && structure[id].parentId; return !p || !visible[p]; }).sort(function(a,b){ return (order[a] == null ? 1e9 : order[a]) - (order[b] == null ? 1e9 : order[b]); });

    var cardW=212, cardH=78, xGap=258, yGap=82, marginX=46, marginY=54, leafIndex=0, maxDepth=0, pos={};
    function place(id, depth) {
      maxDepth=Math.max(maxDepth,depth);
      var ch=children[id] || [], y;
      if (!ch.length) { y=marginY + leafIndex*yGap; leafIndex++; }
      else {
        ch.forEach(function(cid){place(cid,depth+1);});
        var total=0; ch.forEach(function(cid){total+=pos[cid].y;});
        y=total/ch.length;
      }
      pos[id]={x:marginX+depth*xGap,y:y,depth:depth};
    }
    roots.forEach(function(id){place(id,0);});
    if (!leafIndex) leafIndex=Math.max(1,roots.length);
    return {
      ids:ids, roots:roots, children:children, pos:pos, cardW:cardW, cardH:cardH,
      width:Math.max(760,marginX*2+maxDepth*xGap+cardW+28),
      height:Math.max(360,marginY*2+Math.max(0,leafIndex-1)*yGap+cardH), maxDepth:maxDepth
    };
  };

  HierarchyPulseWidget.prototype._applyZoom = function (scale, keepCenter) {
    var sc = this.shadowRoot && this.shadowRoot.querySelector('.tree-scroll');
    var wrap = this.shadowRoot && this.shadowRoot.querySelector('.tree-zoom-wrap');
    var canvas = this.shadowRoot && this.shadowRoot.querySelector('.tree-canvas');
    var label = this.shadowRoot && this.shadowRoot.querySelector('#hp-zoom-label');
    if (!sc || !wrap || !canvas) return;
    var oldScale = this._zoom || 1;
    scale = Math.max(.38, Math.min(1.45, Number(scale) || 1));
    var centerX = keepCenter ? (sc.scrollLeft + sc.clientWidth / 2) / oldScale : null;
    var centerY = keepCenter ? (sc.scrollTop + sc.clientHeight / 2) / oldScale : null;
    this._zoom = scale;
    var naturalW = Number(canvas.getAttribute('data-fit-width')) || Number(canvas.getAttribute('data-natural-width')) || canvas.offsetWidth || 1;
    var naturalH = Number(canvas.getAttribute('data-fit-height')) || Number(canvas.getAttribute('data-natural-height')) || canvas.offsetHeight || 1;
    canvas.style.transform = 'scale(' + scale + ')';
    wrap.style.width = Math.ceil(naturalW * scale) + 'px';
    wrap.style.height = Math.ceil(naturalH * scale) + 'px';
    var scaledW = naturalW * scale, scaledH = naturalH * scale;
    wrap.style.marginLeft = Math.max(12, (sc.clientWidth - scaledW) / 2) + 'px';
    wrap.style.marginTop = Math.max(12, (sc.clientHeight - scaledH) / 2) + 'px';
    wrap.style.marginRight = '12px';
    wrap.style.marginBottom = '12px';
    if (label) label.textContent = Math.round(scale * 100) + '%';
    if (keepCenter && centerX != null && centerY != null) {
      sc.scrollLeft = Math.max(0, centerX * scale - sc.clientWidth / 2);
      sc.scrollTop = Math.max(0, centerY * scale - sc.clientHeight / 2);
    }
  };

  HierarchyPulseWidget.prototype._fitTree = function () {
    var sc = this.shadowRoot && this.shadowRoot.querySelector('.tree-scroll');
    var canvas = this.shadowRoot && this.shadowRoot.querySelector('.tree-canvas');
    if (!sc || !canvas) return;
    var layoutW = Number(canvas.getAttribute('data-natural-width')) || canvas.offsetWidth || 1;
    var layoutH = Number(canvas.getAttribute('data-natural-height')) || canvas.offsetHeight || 1;
    canvas.setAttribute('data-fit-width', layoutW);
    canvas.setAttribute('data-fit-height', layoutH);
    // True executive fit: the entire hierarchy is visible at once. Users can then zoom in and pan.
    var availW = Math.max(100, sc.clientWidth - 40);
    var availH = Math.max(100, sc.clientHeight - 40);
    var scale = Math.min(1, availW / layoutW, availH / layoutH);
    scale = Math.max(.16, scale);
    this._applyZoom(scale, false);
    sc.scrollLeft = 0;
    sc.scrollTop = 0;
  };

  HierarchyPulseWidget.prototype._treeHtml = function () {
    var self=this, model=self._model, unit=unitFromModel(model), layout=self._layoutTree(), structure=model.hierarchyStructure || {}, animate=self._animationEnabled !== false;
    var selected=self._selectedId || (layout.roots.length===1?layout.roots[0]:null);
    var path=self._dominantPath(null), pathSet={}, edgeSet={};
    path.forEach(function(id,i){ pathSet[id]=i; if(i) edgeSet[path[i-1]+'>>'+id]=i-1; });
    var target=path.length?path[path.length-1]:null;
    var targetData=target?self._nodeData(target):null;
    var pathCls=nodeClass(targetData && targetData.delta);
    var baseEdges='', runEdges='', nodes='';

    layout.ids.forEach(function(id){
      var parent=structure[id] && structure[id].parentId;
      if(!parent || !layout.pos[parent] || !layout.pos[id]) return;
      var a=layout.pos[parent], b=layout.pos[id];
      var sx=a.x+layout.cardW, sy=a.y, ex=b.x, ey=b.y, c1=sx+52, c2=ex-52;
      var d='M '+sx.toFixed(1)+' '+sy.toFixed(1)+' C '+c1.toFixed(1)+' '+sy.toFixed(1)+', '+c2.toFixed(1)+' '+ey.toFixed(1)+', '+ex.toFixed(1)+' '+ey.toFixed(1);
      var ek=parent+'>>'+id;
      var onPath=edgeSet[ek]!=null;
      baseEdges += '<path class="edge '+(onPath?'path-base':'')+'" d="'+d+'"></path>';
      if(onPath){
        var delay=(edgeSet[ek]*720+240)+'ms';
        if (animate) {
          runEdges += '<path pathLength="1" class="edge path-run '+pathCls+'" style="--delay:'+delay+'" d="'+d+'"></path>';
          runEdges += '<path pathLength="100" class="edge path-travel '+pathCls+'" style="--delay:'+delay+'" d="'+d+'"></path>';
        } else {
          runEdges += '<path class="edge path-static '+pathCls+'" d="'+d+'"></path>';
        }
      }
    });

    layout.ids.forEach(function(id){
      var p=layout.pos[id], nd=self._nodeData(id), cls=nodeClass(nd.delta), inPath=pathSet[id]!=null;
      var pathIndex=inPath?pathSet[id]:-1, delay=(pathIndex*720)+'ms';
      var parent=nd.parentId?self._nodeData(nd.parentId):null;
      var share=parent && parent.current ? Math.min(100,Math.max(0,Math.abs(nd.current)/Math.max(1,Math.abs(parent.current))*100)) : 100;
      var pathClass=inPath ? (animate ? ' path-node' : ' path-static-node') : '';
      var classes='node-card '+cls+(id===selected?' selected':'')+pathClass+(id===target?' target':'');
      nodes += '<div class="'+classes+'" data-tree-node="'+esc(id)+'" style="left:'+p.x+'px;top:'+p.y+'px;'+(inPath&&animate?'--delay:'+delay:'')+'" title="'+esc(nd.label)+'">'
        + '<div class="node-name">'+esc(nd.label)+'</div>'
        + '<div class="node-metrics"><span class="node-value">'+esc(formatValue(nd.current,unit))+'</span><span class="node-delta">'+esc(nd.deltaPct==null?'—':formatPct(nd.deltaPct))+'</span></div>'
        + '<div class="node-share"><i style="width:'+share.toFixed(1)+'%"></i></div></div>';
    });

    return '<div class="tree-zoom-wrap"><div class="tree-canvas '+(self._focusPath?'focus':'')+'" data-natural-width="'+layout.width+'" data-natural-height="'+layout.height+'" style="width:'+layout.width+'px;height:'+layout.height+'px">'
      + '<svg class="edge-layer" viewBox="0 0 '+layout.width+' '+layout.height+'" preserveAspectRatio="none">'+baseEdges+runEdges+'</svg>'+nodes+'</div></div>';
  };

  HierarchyPulseWidget.prototype._panelHtml = function () {
    var self=this, model=self._model, unit=unitFromModel(model), selected=self._selected(), structure=model.hierarchyStructure || {};
    var cls=nodeClass(selected.delta), pathIds=self._pathIds(selected.id), crumbs='';
    if(!pathIds.length) crumbs='<span>Global</span>';
    else pathIds.forEach(function(id,i){ if(i) crumbs+='<span>›</span>'; crumbs+='<span class="crumb" data-crumb-id="'+esc(id)+'">'+esc(structure[id]&&structure[id].label||id)+'</span>'; });
    var contrib=self._topContributors(selected.id,5);
    var contribSection='';
    var details='';
    var explore='';
    if(contrib.length){
      var contribHtml='<div class="contrib-list">'+contrib.map(function(n){return '<div class="contrib '+nodeClass(n.delta)+'" data-panel-node="'+esc(n.id)+'"><span class="contrib-name">'+esc(n.label)+'</span><span class="contrib-val">'+esc(compactDelta(n.delta,unit))+' <small>'+esc(n.deltaPct==null?'—':formatPct(n.deltaPct))+'</small></span></div>';}).join('')+'</div>';
      contribSection='<div class="section"><div class="section-title">Top contributors</div>'+contribHtml+'</div>';
      explore='<button id="hp-explore" class="explore-btn" type="button">'+(self._detailsOpen?'Hide branch details':'Explore branch')+'</button>';
      if(self._detailsOpen){
        var all=self._topContributors(selected.id,999);
        details='<div class="branch-details"><div class="detail-head"><span>Member</span><span>Prior</span><span>Current</span><span>YoY</span></div>'+all.map(function(n){var p=n.deltaPct==null?'—':formatPct(n.deltaPct);return '<div class="detail-row" data-panel-node="'+esc(n.id)+'"><b>'+esc(n.label)+'</b><span>'+esc(formatValue(n.prior,unit))+'</span><span>'+esc(formatValue(n.current,unit))+'</span><span class="'+(n.delta>0?'pos':n.delta<0?'neg':'')+'">'+esc(p)+'</span></div>';}).join('')+'</div>';
      }
    }
    var comparison=(selected.prior==null?'':'<div class="comparison-line"><span>'+esc(model.priorScopeLabel||'Prior')+'</span><b>'+esc(formatValue(selected.prior,unit))+'</b><span class="compare-arrow">→</span><span>'+esc(model.currentScopeLabel||'Current')+'</span><b>'+esc(formatValue(selected.current,unit))+'</b></div>');
    return '<aside class="panel">'
      + '<div class="crumbs">'+crumbs+'</div>'
      + '<div><div class="eyebrow">Selected branch</div><h2>'+esc(selected.label)+'</h2></div>'
      + '<div class="kpi"><div><div class="big">'+esc(formatValue(selected.current,unit))+'</div><div class="period">'+esc(model.currentScopeLabel||'Current')+'</div></div>'
      + '<div class="delta-block '+cls+'"><div class="pct">'+esc(selected.deltaPct==null?'—':formatPct(selected.deltaPct))+'</div><div class="abs">'+esc(selected.delta==null?'—':compactDelta(selected.delta,unit))+'</div></div></div>'+comparison
      + contribSection+explore+details
      + '<div class="legend"><span><i class="lg-up"></i>Positive</span><span><i class="lg-down"></i>Negative</span><span><i></i>Neutral</span><span><i class="lg-sel"></i>Selected</span></div>'
      + '</aside>';
  };

  HierarchyPulseWidget.prototype._render = function () {
    var self=this, model=self._model, root=self.shadowRoot.querySelector('#root');
    self._animationSeq++;
    root.className='hp '+(self._animationEnabled===false?'motion-off':'motion-on');
    root.innerHTML='<div class="head">'
      + '<div class="brand"><svg class="pulse-mark" viewBox="0 0 28 22" aria-hidden="true"><path class="track" d="M1 12h5l2.3-7 4.2 14 3.2-10 2.5 6H27"></path><path pathLength="1" class="run" d="M1 12h5l2.3-7 4.2 14 3.2-10 2.5 6H27"></path></svg><div class="title">Hierarchy <b>Pulse</b></div></div>'
      + '<div class="header-center">'+self._measureSelectHtml()+'<div class="context">'+self._contextText()+'</div></div>'
      + '<div class="actions"><button id="hp-animation" class="btn anim-toggle '+(self._animationEnabled===false?'':'active')+'" type="button">Animation '+(self._animationEnabled===false?'Off':'On')+'</button><button id="hp-replay" class="btn" type="button" '+(self._animationEnabled===false?'disabled':'')+'>Replay</button><button id="hp-root" class="btn" type="button">Reset</button></div>'
      + '</div>'+self._summaryHtml()+'<div class="body"><div class="stage"><div class="zoom-tools"><button id="hp-zoom-out" class="zoom-btn" type="button" title="Zoom out">−</button><span id="hp-zoom-label" class="zoom-label">100%</span><button id="hp-zoom-in" class="zoom-btn" type="button" title="Zoom in">+</button><button id="hp-fit" class="zoom-btn zoom-fit" type="button" title="Fit tree">Fit</button><span class="zoom-divider" aria-hidden="true"></span><button id="hp-expand-all" class="zoom-btn tree-action-btn" type="button" title="Expand all hierarchy nodes">Expand all</button><button id="hp-collapse-all" class="zoom-btn tree-action-btn" type="button" title="Collapse all hierarchy nodes">Collapse all</button></div><div class="tree-scroll">'+self._treeHtml()+'</div></div>'+self._panelHtml()+'</div>';

    var ms=self.shadowRoot.querySelector('#hp-measure');
    if(ms) ms.addEventListener('change',function(){ self._selectedMeasureAlias=ms.value; self._detailsOpen=false; try{self._model=buildModel(self);self._selectedId=self._selectedId&&self._model.hierarchyStructure[self._selectedId]?self._selectedId:null;self._autoFit=true;self._render();}catch(err){self._renderError(String(err&&err.message||err));} });
    var at=self.shadowRoot.querySelector('#hp-animation');
    if(at) at.addEventListener('click',function(){ self._animationEnabled = self._animationEnabled===false ? true : false; self._render(false); });
    var rp=self.shadowRoot.querySelector('#hp-replay');
    if(rp) rp.addEventListener('click',function(){ if(self._animationEnabled!==false) self._render(false); });
    var rb=self.shadowRoot.querySelector('#hp-root');
    if(rb) rb.addEventListener('click',function(){ var roots=self._roots(); self._selectedId=roots.length===1?roots[0]:null; self._detailsOpen=false; self._autoFit=true; self._render(); });
    var zin=self.shadowRoot.querySelector('#hp-zoom-in');
    if(zin) zin.addEventListener('click',function(){ self._autoFit=false; self._applyZoom((self._zoom||1)+.1,true); self._updateOverviewViewport(); });
    var zout=self.shadowRoot.querySelector('#hp-zoom-out');
    if(zout) zout.addEventListener('click',function(){ self._autoFit=false; self._applyZoom((self._zoom||1)-.1,true); self._updateOverviewViewport(); });
    var fit=self.shadowRoot.querySelector('#hp-fit');
    if(fit) fit.addEventListener('click',function(){ self._autoFit=true; self._fitTree(); self._updateOverviewViewport(); });
    var explore=self.shadowRoot.querySelector('#hp-explore');
    if(explore) explore.addEventListener('click',function(){ self._detailsOpen=!self._detailsOpen; self._render(false); });
    Array.prototype.forEach.call(self.shadowRoot.querySelectorAll('[data-tree-node]'),function(el){ el.addEventListener('click',function(){ self._selectedId=el.getAttribute('data-tree-node'); self._detailsOpen=false; self._render(false); }); });
    Array.prototype.forEach.call(self.shadowRoot.querySelectorAll('[data-panel-node]'),function(el){ el.addEventListener('click',function(){ self._selectedId=el.getAttribute('data-panel-node'); self._detailsOpen=false; self._render(false); }); });
    Array.prototype.forEach.call(self.shadowRoot.querySelectorAll('[data-crumb-id]'),function(el){ el.addEventListener('click',function(){ self._selectedId=el.getAttribute('data-crumb-id'); self._detailsOpen=false; self._render(false); }); });

    requestAnimationFrame(function(){
      var sc=self.shadowRoot.querySelector('.tree-scroll');
      if(!sc) return;
      if(self._autoFit) self._fitTree(); else self._applyZoom(self._zoom||1,false);
      if(self._pendingScrollLeft!=null){ sc.scrollLeft=self._pendingScrollLeft; sc.scrollTop=self._pendingScrollTop||0; self._pendingScrollLeft=null; }
      self._bindOverview();
      self._bindTreePan();
      self._updateOverviewViewport();
    });
  };


  HierarchyPulseWidget.prototype._polarityInfo = function () {
    var alias=this._model && this._model.measureAlias;
    var mode=(this._polarityModes && alias && this._polarityModes[alias]) || 'auto';
    if (mode === 'higher' || mode === 'lower' || mode === 'neutral') return {mode:mode,direction:mode,automatic:false,reason:'manual'};
    var inferred=inferMeasurePolarity(this._model && this._model.binding, alias);
    return {mode:'auto',direction:inferred.direction,automatic:true,reason:inferred.reason,confidence:inferred.confidence};
  };

  HierarchyPulseWidget.prototype._businessClass = function (delta) {
    if (delta == null || !isFinite(delta) || Math.abs(delta) < 1e-9) return 'neutral';
    var direction=this._polarityInfo().direction;
    if (direction === 'neutral') return 'neutral';
    var favorable = direction === 'lower' ? delta < 0 : delta > 0;
    return favorable ? 'up' : 'down';
  };

  HierarchyPulseWidget.prototype._polarityControlHtml = function () {
    var info=this._polarityInfo(), resolved=info.direction;
    var resolvedLabel=resolved==='higher'?'Higher is better':resolved==='lower'?'Lower is better':'Neutral';
    var mode=info.mode || 'auto';
    return '<select id="hp-polarity" class="polarity-select '+(mode==='auto'&&resolved==='neutral'?'auto-neutral':'')+'" aria-label="KPI direction" title="Controls whether positive or negative variance is favorable">'
      +'<option value="auto" '+(mode==='auto'?'selected':'')+'>Direction: Auto · '+esc(resolvedLabel)+'</option>'
      +'<option value="higher" '+(mode==='higher'?'selected':'')+'>Direction: Higher is better</option>'
      +'<option value="lower" '+(mode==='lower'?'selected':'')+'>Direction: Lower is better</option>'
      +'<option value="neutral" '+(mode==='neutral'?'selected':'')+'>Direction: Neutral</option>'
      +'</select>';
  };

  HierarchyPulseWidget.prototype._layoutControlHtml = function () {
    var mode=this._layoutDirection==='ttb'?'ttb':'ltr';
    return '<select id="hp-layout" class="polarity-select layout-select" aria-label="Hierarchy layout" title="Controls the hierarchy flow direction">'
      +'<option value="ltr" '+(mode==='ltr'?'selected':'')+'>Layout: Left to right</option>'
      +'<option value="ttb" '+(mode==='ttb'?'selected':'')+'>Layout: Top to bottom</option>'
      +'</select>';
  };

  /* Behavior overrides retained for compatibility */
  HierarchyPulseWidget.prototype._scopeRoot = function () {
    var roots=this._roots(), maps=this._maps(), current=0, prior=0, hasPrior=false, self=this;
    if(roots.length===1) return this._nodeData(roots[0]);
    roots.forEach(function(id){ var n=self._nodeData(id); current+=n.current||0; if(n.prior!=null){prior+=n.prior;hasPrior=true;} });
    return {id:null,label:'Global',current:current,prior:hasPrior?prior:null,delta:hasPrior?current-prior:null,deltaPct:hasPrior?pctDelta(current,prior):null,parentId:null,childIds:roots};
  };

  HierarchyPulseWidget.prototype._displayPath = function (id) {
    var self=this, ids=this._pathIds(id), roots={}; this._roots().forEach(function(r){roots[r]=true;});
    var labels=[];
    ids.forEach(function(pid){
      if(roots[pid] || self._isStructuralPassThrough(pid)) return;
      var n=self._nodeData(pid); if(n&&n.label) labels.push(n.label);
    });
    if(!labels.length && id){ var n=this._nodeData(id); if(n&&n.label) labels=[n.label]; }
    if(labels.length>3) labels=labels.slice(labels.length-3);
    return labels.join(' › ');
  };

  HierarchyPulseWidget.prototype._movementSummary = function () {
    var scope=this._scopeRoot(), selected=this._selected(), self=this, increase=null, decrease=null, rootSet={};
    this._roots().forEach(function(id){rootSet[id]=true;});
    Object.keys(this._model.hierarchyStructure||{}).forEach(function(id){
      var sn=self._model.hierarchyStructure[id];
      if(rootSet[id] || (sn && sn.isNode === false) || self._isStructuralPassThrough(id)) return;
      var n=self._nodeData(id); if(n.delta==null||!isFinite(n.delta)||Math.abs(n.delta)<1e-9)return;
      if(n.delta>0&&(!increase||n.delta>increase.delta))increase=n;
      if(n.delta<0&&(!decrease||n.delta<decrease.delta))decrease=n;
    });
    var info=this._polarityInfo(), favorable=null, adverse=null, favorableLabel='Largest favorable movement', adverseLabel='Largest adverse movement';
    if(info.direction==='higher'){ favorable=increase; adverse=decrease; }
    else if(info.direction==='lower'){ favorable=decrease; adverse=increase; }
    else { favorable=increase; adverse=decrease; favorableLabel='Largest increase'; adverseLabel='Largest decrease'; }
    return {scope:scope,selected:selected,increase:increase,decrease:decrease,favorable:favorable,adverse:adverse,favorableLabel:favorableLabel,adverseLabel:adverseLabel,polarity:info};
  };

  HierarchyPulseWidget.prototype._summaryHtml = function () {
    var self=this,s=this._movementSummary(),unit=unitFromModel(this._model),scope=s.scope;
    function movement(label,node){
      if(!node)return '<div class="exec-item"><span class="exec-label">'+esc(label)+'</span><strong class="exec-name">—</strong><span class="exec-meta">No material movement</span></div>';
      var cls=self._businessClass(node.delta),path=self._displayPath(node.id)||node.label,arrow=node.delta>0?'▲ ':node.delta<0?'▼ ':'';
      return '<div class="exec-item '+cls+'"><span class="exec-label">'+esc(label)+'</span><div><strong class="exec-name">'+esc(path)+'</strong></div><span class="exec-meta"><b>'+esc(compactDelta(node.delta,unit))+'</b><i>'+esc(arrow+(node.deltaPct==null?'—':formatPct(node.deltaPct)))+'</i></span></div>';
    }
    var direction=scope.delta>0?'▲ ':scope.delta<0?'▼ ':'';
    var current='<div class="exec-item exec-kpi '+this._businessClass(scope.delta)+'"><span class="exec-label">'+esc(this._model.measureLabel)+'</span><strong class="exec-kpi-value">'+esc(formatValue(scope.current,unit))+'</strong><span class="exec-meta"><b>'+esc(scope.delta==null?'—':compactDelta(scope.delta,unit))+'</b><i>'+esc(direction+(scope.deltaPct==null?'—':formatPct(scope.deltaPct)))+'</i></span></div>';
    return '<div class="executive-strip">'+current+movement(s.favorableLabel,s.favorable)+movement(s.adverseLabel,s.adverse)+'</div>';
  };

  HierarchyPulseWidget.prototype._layoutTree = function () {
    var self=this,model=this._model,structure=model.hierarchyStructure||{},maps=this._maps();
    var rawIds=Object.keys(structure).filter(function(id){return structure[id] && structure[id].isNode !== false && (!!maps.current[id]||!!maps.prior[id]);});
    var rawVisible={}; rawIds.forEach(function(id){rawVisible[id]=true;});
    var hidden={};
    rawIds.forEach(function(id){ if(self._isStructuralPassThrough(id)) hidden[id]=true; });
    this._roots().forEach(function(id){ delete hidden[id]; });
    var ids=rawIds.filter(function(id){return !hidden[id];}),visible={}; ids.forEach(function(id){visible[id]=true;});
    var order={}; (model.currentEntries||[]).concat(model.priorEntries||[]).forEach(function(e){if(order[e.id]==null)order[e.id]=e.rowIndex;});
    function visibleParent(id){
      var p=structure[id]&&structure[id].parentId,guard=0;
      while(p&&hidden[p]&&guard++<40)p=structure[p]&&structure[p].parentId;
      return p&&visible[p]?p:null;
    }
    var children={},parentOf={}; ids.forEach(function(id){children[id]=[];});
    ids.forEach(function(id){var p=visibleParent(id);parentOf[id]=p;if(p)children[p].push(id);});
    Object.keys(children).forEach(function(id){children[id].sort(function(a,b){var da=Math.abs(self._nodeData(a).delta||0),db=Math.abs(self._nodeData(b).delta||0);if(db!==da)return db-da;return (order[a]==null?1e9:order[a])-(order[b]==null?1e9:order[b]);});});
    var roots=ids.filter(function(id){return !parentOf[id];}).sort(function(a,b){return (order[a]==null?1e9:order[a])-(order[b]==null?1e9:order[b]);});
    var cardW=196,cardH=108,xGap=224,yGap=124,marginX=34,marginY=62,leafIndex=0,maxDepth=0,pos={};
    function place(id,depth){
      maxDepth=Math.max(maxDepth,depth);var ch=children[id]||[],y;
      if(!ch.length){y=marginY+leafIndex*yGap;leafIndex++;}
      else{ch.forEach(function(cid){place(cid,depth+1);});var total=0;ch.forEach(function(cid){total+=pos[cid].y;});y=total/ch.length;}
      pos[id]={x:marginX+depth*xGap,y:y,depth:depth};
    }
    roots.forEach(function(id){place(id,0);}); if(!leafIndex)leafIndex=Math.max(1,roots.length);
    var out={ids:ids,roots:roots,children:children,parentOf:parentOf,pos:pos,cardW:cardW,cardH:cardH,width:Math.max(720,marginX*2+maxDepth*xGap+cardW+24),height:Math.max(330,marginY*2+Math.max(0,leafIndex-1)*yGap+cardH),maxDepth:maxDepth};
    this._lastLayout=out; return out;
  };

  HierarchyPulseWidget.prototype._fitTree = function () {
    var sc=this.shadowRoot&&this.shadowRoot.querySelector('.tree-scroll'),canvas=this.shadowRoot&&this.shadowRoot.querySelector('.tree-canvas');if(!sc||!canvas)return;
    var w=Number(canvas.getAttribute('data-natural-width'))||canvas.offsetWidth||1,h=Number(canvas.getAttribute('data-natural-height'))||canvas.offsetHeight||1;
    canvas.setAttribute('data-fit-width',w);canvas.setAttribute('data-fit-height',h);
    var availW=Math.max(100,sc.clientWidth-28),availH=Math.max(100,sc.clientHeight-28),scale=Math.min(1,availW/w,availH/h);
    // Keep executive typography readable. Very large trees use pan + overview instead of micro text.
    scale=Math.max(.68,scale);
    this._applyZoom(scale,false);
    var wrap=this.shadowRoot.querySelector('.tree-zoom-wrap');
    if(wrap){var sw=w*scale,sh=h*scale;wrap.style.marginLeft=Math.max(12,(sc.clientWidth-sw)/2)+'px';wrap.style.marginTop=Math.max(12,(sc.clientHeight-sh)/2)+'px';}
    sc.scrollLeft=0;sc.scrollTop=0;
  };

  HierarchyPulseWidget.prototype._treeHtml = function () {
    var self=this,model=self._model,unit=unitFromModel(model),layout=self._layoutTree(),animate=self._animationEnabled!==false&&!self._suppressPathAnimationOnce;
    var selected=self._selectedId||(layout.roots.length===1?layout.roots[0]:null);
    var rawPath=self._dominantPath(null),path=rawPath.filter(function(id){return !!layout.pos[id];}),pathSet={},edgeSet={};
    path.forEach(function(id,i){pathSet[id]=i;if(i)edgeSet[path[i-1]+'>>'+id]=i-1;});
    var target=path.length?path[path.length-1]:null,targetData=target?self._nodeData(target):null,pathCls=self._businessClass(targetData&&targetData.delta);
    var maxAbs=1;layout.ids.forEach(function(id){var n=self._nodeData(id);maxAbs=Math.max(maxAbs,Math.abs(n.delta||0));});
    var baseEdges='',runEdges='',nodes='';
    layout.ids.forEach(function(id){
      var parent=layout.parentOf[id];if(!parent||!layout.pos[parent]||!layout.pos[id])return;
      var a=layout.pos[parent],b=layout.pos[id],sx=a.x+layout.cardW,sy=a.y,ex=b.x,ey=b.y,c1=sx+42,c2=ex-42;
      var d='M '+sx.toFixed(1)+' '+sy.toFixed(1)+' C '+c1.toFixed(1)+' '+sy.toFixed(1)+', '+c2.toFixed(1)+' '+ey.toFixed(1)+', '+ex.toFixed(1)+' '+ey.toFixed(1);
      var nd=self._nodeData(id),ratio=Math.sqrt(Math.min(1,Math.abs(nd.delta||0)/maxAbs)),edgeW=(1.6+5.4*ratio).toFixed(2),ek=parent+'>>'+id,onPath=edgeSet[ek]!=null,cls=self._businessClass(nd.delta);
      baseEdges+='<path class="edge impact '+cls+(onPath?' path-base':'')+'" style="stroke-width:'+edgeW+'px" d="'+d+'"></path>';
      if(onPath){var delay=(edgeSet[ek]*620+180)+'ms',runW=(Number(edgeW)+2.1).toFixed(2);if(animate){runEdges+='<path pathLength="1" class="edge path-run '+pathCls+'" style="--delay:'+delay+';stroke-width:'+runW+'px" d="'+d+'"></path><path pathLength="100" class="edge path-travel '+pathCls+'" style="--delay:'+delay+';stroke-width:'+runW+'px" d="'+d+'"></path>';}else{runEdges+='<path class="edge path-static '+pathCls+'" style="stroke-width:'+runW+'px" d="'+d+'"></path>';}}
    });
    layout.ids.forEach(function(id){
      var p=layout.pos[id],nd=self._nodeData(id),cls=self._businessClass(nd.delta),inPath=pathSet[id]!=null,pathIndex=inPath?pathSet[id]:-1,delay=(pathIndex*620)+'ms';
      var ratio=Math.sqrt(Math.min(1,Math.abs(nd.delta||0)/maxAbs)),bar=(48*ratio).toFixed(1),fillCls=cls==='up'?'pos':cls==='down'?'neg':'neu',arrow=nd.delta>0?'▲ ':nd.delta<0?'▼ ':'';
      var pathClass=inPath?(animate?' path-node':' path-static-node'):'',classes='node-card '+cls+(id===selected?' selected':'')+pathClass+(id===target?' target':'');
      nodes+='<div class="'+classes+'" data-tree-node="'+esc(id)+'" style="left:'+p.x+'px;top:'+p.y+'px;'+(inPath&&animate?'--delay:'+delay:'')+'" title="'+esc(nd.label)+'">'
        +'<div class="node-name">'+esc(nd.label)+'</div>'
        +'<div class="node-delta-main"><span class="node-delta-abs">'+esc(nd.delta==null?'—':compactDelta(nd.delta,unit))+'</span><span class="node-delta-pct">'+esc(arrow+(nd.deltaPct==null?'—':formatPct(nd.deltaPct)))+'</span></div>'
        +'<div class="node-current">'+esc(model.currentScopeLabel||'Current')+' '+esc(formatValue(nd.current,unit))+'</div>'
        +'<div class="delta-axis"><i class="delta-fill '+fillCls+'" style="width:'+bar+'%"></i></div></div>';
    });
    return '<div class="tree-zoom-wrap"><div class="tree-canvas" data-natural-width="'+layout.width+'" data-natural-height="'+layout.height+'" style="width:'+layout.width+'px;height:'+layout.height+'px"><svg class="edge-layer" viewBox="0 0 '+layout.width+' '+layout.height+'" preserveAspectRatio="none">'+baseEdges+runEdges+'</svg>'+nodes+'</div></div>';
  };

  HierarchyPulseWidget.prototype._overviewHtml = function () {
    var layout=this._lastLayout;if(!layout)return'';var path=this._dominantPath(null).filter(function(id){return !!layout.pos[id];}),pathSet={};path.forEach(function(id){pathSet[id]=true;});
    var edges='',nodes='';layout.ids.forEach(function(id){var p=layout.parentOf[id];if(!p||!layout.pos[p]||!layout.pos[id])return;edges+='<path class="ov-edge" d="M '+(layout.pos[p].x+layout.cardW)+' '+layout.pos[p].y+' L '+layout.pos[id].x+' '+layout.pos[id].y+'"></path>';});
    layout.ids.forEach(function(id){var p=layout.pos[id];nodes+='<circle class="ov-node '+(pathSet[id]?'path':'')+'" cx="'+(p.x+layout.cardW/2)+'" cy="'+p.y+'" r="12"></circle>';});
    return '<div class="overview-card"><svg id="hp-overview" class="overview-svg" viewBox="0 0 '+layout.width+' '+layout.height+'" preserveAspectRatio="none">'+edges+nodes+'<rect id="hp-overview-view" class="ov-view" x="0" y="0" width="1" height="1" rx="8"></rect></svg></div>';
  };

  HierarchyPulseWidget.prototype._panelHtml = function () {
    var self=this,model=self._model,unit=unitFromModel(model),selected=self._selected(),structure=model.hierarchyStructure||{},cls=self._businessClass(selected.delta),pathIds=self._pathIds(selected.id),crumbs='';
    if(!pathIds.length)crumbs='<span>Global</span>';else pathIds.forEach(function(id,i){if(i)crumbs+='<span>›</span>';crumbs+='<span class="crumb" data-crumb-id="'+esc(id)+'">'+esc(structure[id]&&structure[id].label||id)+'</span>';});
    var contrib=self._topContributors(selected.id,5),contribSection='',details='',explore='';
    if(contrib.length){
      var contribHtml='<div class="contrib-list">'+contrib.map(function(n){var arrow=n.delta>0?'▲ ':n.delta<0?'▼ ':'';return '<div class="contrib '+self._businessClass(n.delta)+'" data-panel-node="'+esc(n.id)+'"><span class="contrib-name">'+esc(n.label)+'</span><span class="contrib-val">'+esc(compactDelta(n.delta,unit))+' <small>'+esc(arrow+(n.deltaPct==null?'—':formatPct(n.deltaPct)))+'</small></span></div>';}).join('')+'</div>';
      contribSection='<div class="section"><div class="section-title">Contributors</div>'+contribHtml+'</div>';
      explore='<button id="hp-explore" class="explore-btn" type="button">'+(self._detailsOpen?'Hide branch details':'Explore branch')+'</button>';
      if(self._detailsOpen){
        var all=self._topContributors(selected.id,999);
        details='<div class="branch-details"><div class="detail-head"><span>Member</span><span>Prior</span><span>Current</span><span>Δ</span><span>Δ%</span></div>'+all.map(function(n){var p=n.deltaPct==null?'—':formatPct(n.deltaPct),arrow=n.delta>0?'▲ ':n.delta<0?'▼ ':'';return '<div class="detail-row" data-panel-node="'+esc(n.id)+'"><b>'+esc(n.label)+'</b><span>'+esc(formatDetailValue(n.prior,unit))+'</span><span>'+esc(formatDetailValue(n.current,unit))+'</span><span class="'+(self._businessClass(n.delta)==='up'?'pos':self._businessClass(n.delta)==='down'?'neg':'')+'">'+esc(compactDelta(n.delta,unit))+'</span><span class="'+(self._businessClass(n.delta)==='up'?'pos':self._businessClass(n.delta)==='down'?'neg':'')+'">'+esc(arrow+p)+'</span></div>';}).join('')+'</div>';
      }
    }
    var comparison=selected.prior==null?'':'<div class="comparison-line"><span>'+esc(model.priorScopeLabel||'Prior')+'</span><b>'+esc(formatDetailValue(selected.prior,unit))+'</b><span class="compare-arrow">→</span><span>'+esc(model.currentScopeLabel||'Current')+'</span><b>'+esc(formatDetailValue(selected.current,unit))+'</b></div>';
    var arrowSel=selected.delta>0?'▲ ':selected.delta<0?'▼ ':'';
    return '<aside class="panel"><div class="crumbs">'+crumbs+'</div><div><div class="eyebrow">Selected branch</div><h2>'+esc(selected.label)+'</h2></div>'
      +'<div class="kpi"><div><div class="big">'+esc(formatValue(selected.current,unit))+'</div><div class="period">'+esc(model.currentScopeLabel||'Current')+'</div></div><div class="delta-block '+cls+'"><div class="pct">'+esc(arrowSel+(selected.deltaPct==null?'—':formatPct(selected.deltaPct)))+'</div><div class="abs">'+esc(selected.delta==null?'—':compactDelta(selected.delta,unit))+'</div></div></div>'+comparison+contribSection+explore+details
      +'<div class="legend"><span><i class="lg-fav"></i>Favorable</span><span><i class="lg-adv"></i>Adverse</span><span><i></i>Neutral</span><span><i class="lg-sel"></i>Selected</span></div></aside>';
  };

  HierarchyPulseWidget.prototype._render = function () {
    var self=this,root=self.shadowRoot.querySelector('#root');self._animationSeq++;root.className='hp '+(self._animationEnabled===false?'motion-off':'motion-on');
    var animOn=self._animationEnabled!==false;
    root.innerHTML='<div class="head"><div class="brand"><svg class="pulse-mark" viewBox="0 0 28 22" aria-hidden="true"><path class="track" d="M1 12h5l2.3-7 4.2 14 3.2-10 2.5 6H27"></path><path pathLength="1" class="run" d="M1 12h5l2.3-7 4.2 14 3.2-10 2.5 6H27"></path></svg><div class="title">Hierarchy <b>Pulse</b></div></div>'
      +'<div class="header-center">'+self._measureSelectHtml()+self._polarityControlHtml()+self._layoutControlHtml()+'<div class="context">'+self._contextText()+'</div></div>'
      +'<div class="actions"><button id="hp-animation" class="anim-control '+(animOn?'active':'')+'" type="button" aria-pressed="'+(animOn?'true':'false')+'"><span>Animation</span><span class="toggle-track"><i class="toggle-knob"></i></span></button><button id="hp-replay" class="btn text-icon-btn" type="button" title="Replay animation" aria-label="Replay animation" '+(animOn?'':'disabled')+'><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0 2 5.5"></path><path d="M20 4v7h-7"></path></svg><span>Replay</span></button><button id="hp-root" class="btn text-icon-btn" type="button" title="Reset selection" aria-label="Reset selection"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"></path><path d="M3 4v6h6"></path></svg><span>Reset</span></button></div></div>'
      +self._summaryHtml()+'<div class="body"><div class="stage"><div class="zoom-tools"><button id="hp-zoom-out" class="zoom-btn" type="button" title="Zoom out">−</button><span id="hp-zoom-label" class="zoom-label">100%</span><button id="hp-zoom-in" class="zoom-btn" type="button" title="Zoom in">+</button><button id="hp-fit" class="zoom-btn zoom-fit" type="button" title="Fit tree">Fit</button></div><div class="tree-scroll">'+self._treeHtml()+'</div>'+self._overviewHtml()+'</div>'+self._panelHtml()+'</div>';
    var ms=self.shadowRoot.querySelector('#hp-measure');if(ms)ms.addEventListener('change',function(){self._selectedMeasureAlias=ms.value;self._detailsOpen=false;try{self._model=buildModel(self);self._selectedId=self._selectedId&&self._model.hierarchyStructure[self._selectedId]?self._selectedId:null;self._autoFit=true;self._render();}catch(err){self._renderError(String(err&&err.message||err));}});
    var ps=self.shadowRoot.querySelector('#hp-polarity');if(ps)ps.addEventListener('change',function(){var alias=self._model&&self._model.measureAlias;if(alias){self._polarityModes=self._polarityModes||{};self._polarityModes[alias]=ps.value;}self._render(false);});
    var ls=self.shadowRoot.querySelector('#hp-layout');if(ls)ls.addEventListener('change',function(){
      var next=ls.value==='ttb'?'ttb':'ltr';
      if(next===self._layoutDirection)return;
      self._pendingTreeTransition=self._captureTreeTransition();
      self._layoutDirection=next;
      self._autoFit=true;
      self._preserveExactViewport=false;
      self._suppressPathAnimationOnce=true;
      try{
        self.dispatchEvent(new CustomEvent('propertiesChanged',{detail:{properties:{layoutDirection:next}}}));
      }catch(e){}
      self._render();
    });
    var at=self.shadowRoot.querySelector('#hp-animation');if(at)at.addEventListener('click',function(){self._animationEnabled=self._animationEnabled===false?true:false;self._preserveExactViewport=true;self._render(false);});
    var rp=self.shadowRoot.querySelector('#hp-replay');if(rp)rp.addEventListener('click',function(){if(self._animationEnabled!==false){self._preserveExactViewport=true;self._render(false);}});
    var rb=self.shadowRoot.querySelector('#hp-root');if(rb)rb.addEventListener('click',function(){var roots=self._roots();self._selectedId=roots.length===1?roots[0]:null;self._detailsOpen=false;self._collapseSignature=null;self._collapsedIds={};self._autoFit=true;self._render();});
    var zin=self.shadowRoot.querySelector('#hp-zoom-in');if(zin)zin.addEventListener('click',function(){self._autoFit=false;self._applyZoom((self._zoom||1)+.1,true);self._updateOverviewViewport();});
    var zout=self.shadowRoot.querySelector('#hp-zoom-out');if(zout)zout.addEventListener('click',function(){self._autoFit=false;self._applyZoom((self._zoom||1)-.1,true);self._updateOverviewViewport();});
    var fit=self.shadowRoot.querySelector('#hp-fit');if(fit)fit.addEventListener('click',function(){self._autoFit=true;self._fitTree();self._updateOverviewViewport();});
    var explore=self.shadowRoot.querySelector('#hp-explore');if(explore)explore.addEventListener('click',function(){self._detailsOpen=!self._detailsOpen;self._render(false);});
    Array.prototype.forEach.call(self.shadowRoot.querySelectorAll('[data-tree-node]'),function(el){el.addEventListener('click',function(){self._selectedId=el.getAttribute('data-tree-node');self._detailsOpen=false;self._render(false);});});
    Array.prototype.forEach.call(self.shadowRoot.querySelectorAll('[data-panel-node]'),function(el){el.addEventListener('click',function(){self._selectedId=el.getAttribute('data-panel-node');self._detailsOpen=false;self._render(false);});});
    Array.prototype.forEach.call(self.shadowRoot.querySelectorAll('[data-crumb-id]'),function(el){el.addEventListener('click',function(){self._selectedId=el.getAttribute('data-crumb-id');self._detailsOpen=false;self._render(false);});});
    requestAnimationFrame(function(){var sc=self.shadowRoot.querySelector('.tree-scroll');if(!sc)return;var preserveExact=!!self._preserveExactViewport;if(preserveExact)self._applyZoom(self._zoom||1,false);else if(self._autoFit)self._fitTree();else self._applyZoom(self._zoom||1,false);if(self._pendingScrollLeft!=null){sc.scrollLeft=self._pendingScrollLeft;sc.scrollTop=self._pendingScrollTop||0;self._pendingScrollLeft=null;}self._bindOverview();self._bindTreePan();self._updateOverviewViewport();self._preserveExactViewport=false;});
  };



  /* Hierarchy expand/collapse controls */
  STYLES += `
    .node-card { padding-right:42px; }
    .node-toggle { position:absolute; top:8px; right:8px; min-width:28px; height:27px; padding:0 6px; display:inline-flex; align-items:center; justify-content:center; gap:3px; border:1px solid #c5e0f4; border-radius:7px; background:#f7fbff; color:#235f8f; font:850 12px/1 Arial,sans-serif; cursor:pointer; z-index:3; }
    .node-toggle:hover { border-color:#6baee0; background:#eaf6ff; color:#0a6ed1; }
    .node-toggle svg { width:12px; height:12px; fill:none; stroke:currentColor; stroke-width:2.1; stroke-linecap:round; stroke-linejoin:round; transition:transform .16s ease; }
    .node-toggle.expanded svg { transform:rotate(90deg); }
    .node-toggle .hidden-count { min-width:16px; text-align:left; }
    .zoom-divider { width:1px; height:22px; margin:0 2px; background:#d6eafa; }
    .tree-action-btn { width:auto; min-width:0; padding:0 9px; font-size:13px; font-weight:850; white-space:nowrap; }
    @media (max-width:1180px) {
      .tree-action-btn { padding:0 7px; font-size:12px; }
      .zoom-divider { display:none; }
    }
  `;

  HierarchyPulseWidget.prototype._expandDominantPath = function () {
    this._collapsedIds=this._collapsedIds||{};
    var self=this, path=this._dominantPath(null)||[], structure=this._model&&this._model.hierarchyStructure||{};
    path.forEach(function(id){ delete self._collapsedIds[id]; var p=structure[id]&&structure[id].parentId,guard=0; while(p&&guard++<60){delete self._collapsedIds[p];p=structure[p]&&structure[p].parentId;} });
  };

  HierarchyPulseWidget.prototype._layoutTree = function () {
    var self=this,model=this._model,structure=model.hierarchyStructure||{},maps=this._maps();
    var rawIds=Object.keys(structure).filter(function(id){return structure[id] && structure[id].isNode !== false && (!!maps.current[id]||!!maps.prior[id]);});
    var hidden={};rawIds.forEach(function(id){if(self._isStructuralPassThrough(id))hidden[id]=true;});
    this._roots().forEach(function(id){delete hidden[id];});
    var fullIds=rawIds.filter(function(id){return !hidden[id];}),fullVisible={};fullIds.forEach(function(id){fullVisible[id]=true;});
    var order={};(model.currentEntries||[]).concat(model.priorEntries||[]).forEach(function(e){if(order[e.id]==null)order[e.id]=e.rowIndex;});
    function visibleParent(id){var p=structure[id]&&structure[id].parentId,guard=0;while(p&&hidden[p]&&guard++<60)p=structure[p]&&structure[p].parentId;return p&&fullVisible[p]?p:null;}
    var fullChildren={},fullParent={};fullIds.forEach(function(id){fullChildren[id]=[];});
    fullIds.forEach(function(id){var p=visibleParent(id);fullParent[id]=p;if(p)fullChildren[p].push(id);});
    Object.keys(fullChildren).forEach(function(id){fullChildren[id].sort(function(a,b){var da=Math.abs(self._nodeData(a).delta||0),db=Math.abs(self._nodeData(b).delta||0);if(db!==da)return db-da;return(order[a]==null?1e9:order[a])-(order[b]==null?1e9:order[b]);});});
    var roots=fullIds.filter(function(id){return !fullParent[id];}).sort(function(a,b){return(order[a]==null?1e9:order[a])-(order[b]==null?1e9:order[b]);});
    var key=fullIds.slice().sort().map(function(id){return id+'>'+String(fullParent[id]||'');}).join('|');
    if(this._collapseSignature!==key){
      this._collapseSignature=key;this._collapsedIds={};
      Object.keys(fullChildren).forEach(function(id){if(fullChildren[id].length)self._collapsedIds[id]=true;});
      roots.forEach(function(id){delete self._collapsedIds[id];});
      this._expandDominantPath();
    }
    var visibleIds=[],visibleSet={};
    function visit(id){if(visibleSet[id])return;visibleSet[id]=true;visibleIds.push(id);if(self._collapsedIds[id])return;(fullChildren[id]||[]).forEach(visit);}
    roots.forEach(visit);
    var children={},parentOf={};visibleIds.forEach(function(id){children[id]=[];});
    visibleIds.forEach(function(id){var p=fullParent[id];if(p&&visibleSet[p]){parentOf[id]=p;children[p].push(id);}else parentOf[id]=null;});
    function descCount(id){var total=0;(fullChildren[id]||[]).forEach(function(cid){total+=1+descCount(cid);});return total;}
    var descendantCount={};fullIds.forEach(function(id){descendantCount[id]=descCount(id);});
    var direction=this._layoutDirection==='ttb'?'ttb':'ltr';
    var cardW=196,cardH=108,depthGap=direction==='ttb'?142:224,breadthGap=direction==='ttb'?228:124,marginX=34,marginY=62,leafIndex=0,maxDepth=0,pos={};
    function place(id,depth){
      maxDepth=Math.max(maxDepth,depth);
      var ch=children[id]||[],x,y,total=0;
      if(direction==='ttb'){
        if(!ch.length){x=marginX+leafIndex*breadthGap;leafIndex++;}
        else{ch.forEach(function(cid){place(cid,depth+1);});ch.forEach(function(cid){total+=pos[cid].x;});x=total/ch.length;}
        y=marginY+depth*depthGap;
      }else{
        if(!ch.length){y=marginY+leafIndex*breadthGap;leafIndex++;}
        else{ch.forEach(function(cid){place(cid,depth+1);});ch.forEach(function(cid){total+=pos[cid].y;});y=total/ch.length;}
        x=marginX+depth*depthGap;
      }
      pos[id]={x:x,y:y,depth:depth};
    }
    roots.forEach(function(id){place(id,0);});if(!leafIndex)leafIndex=Math.max(1,roots.length);
    var layoutWidth=direction==='ttb'?Math.max(720,marginX*2+Math.max(0,leafIndex-1)*breadthGap+cardW+24):Math.max(720,marginX*2+maxDepth*depthGap+cardW+24);
    var layoutHeight=direction==='ttb'?Math.max(330,marginY*2+maxDepth*depthGap+cardH+24):Math.max(330,marginY*2+Math.max(0,leafIndex-1)*breadthGap+cardH);
    var out={ids:visibleIds,roots:roots,children:children,parentOf:parentOf,fullChildren:fullChildren,fullParent:fullParent,descendantCount:descendantCount,pos:pos,cardW:cardW,cardH:cardH,width:layoutWidth,height:layoutHeight,maxDepth:maxDepth,direction:direction};
    this._lastLayout=out;return out;
  };

  HierarchyPulseWidget.prototype._treeHtml = function () {
    var self=this,model=self._model,unit=unitFromModel(model),layout=self._layoutTree(),flowEnabled=self._animationEnabled!==false,animateEntry=flowEnabled&&!self._suppressPathAnimationOnce;
    var selected=self._selectedId||(layout.roots.length===1?layout.roots[0]:null);
    var rawPath=self._dominantPath(null),path=rawPath.filter(function(id){return !!layout.pos[id];}),pathSet={},edgeSet={};
    path.forEach(function(id,i){pathSet[id]=i;if(i)edgeSet[path[i-1]+'>>'+id]=i-1;});
    var target=path.length?path[path.length-1]:null,targetData=target?self._nodeData(target):null,pathCls=self._businessClass(targetData&&targetData.delta);
    var maxAbs=1;layout.ids.forEach(function(id){var n=self._nodeData(id);maxAbs=Math.max(maxAbs,Math.abs(n.delta||0));});
    var baseEdges='',runEdges='',nodes='';
    layout.ids.forEach(function(id){
      var parent=layout.parentOf[id];if(!parent||!layout.pos[parent]||!layout.pos[id])return;
      var a=layout.pos[parent],b=layout.pos[id],sx,sy,ex,ey,c1x,c1y,c2x,c2y;
      if(layout.direction==='ttb'){
        sx=a.x+layout.cardW/2;sy=a.y+layout.cardH/2;ex=b.x+layout.cardW/2;ey=b.y-layout.cardH/2;
        c1x=sx;c1y=sy+42;c2x=ex;c2y=ey-42;
      }else{
        sx=a.x+layout.cardW;sy=a.y;ex=b.x;ey=b.y;
        c1x=sx+42;c1y=sy;c2x=ex-42;c2y=ey;
      }
      var d='M '+sx.toFixed(1)+' '+sy.toFixed(1)+' C '+c1x.toFixed(1)+' '+c1y.toFixed(1)+', '+c2x.toFixed(1)+' '+c2y.toFixed(1)+', '+ex.toFixed(1)+' '+ey.toFixed(1);
      var nd=self._nodeData(id),ratio=Math.sqrt(Math.min(1,Math.abs(nd.delta||0)/maxAbs)),edgeW=(1.6+5.4*ratio).toFixed(2),ek=parent+'>>'+id,onPath=edgeSet[ek]!=null,cls=self._businessClass(nd.delta);
      baseEdges+='<path class="edge impact '+cls+(onPath?' path-base':'')+'" style="stroke-width:'+edgeW+'px" d="'+d+'"></path>';
      if(onPath){
        var delay=(edgeSet[ek]*620+180)+'ms',runW=(Number(edgeW)+2.1).toFixed(2);
        if(animateEntry){
          runEdges+='<path pathLength="1" class="edge path-run '+pathCls+'" style="--delay:'+delay+';stroke-width:'+runW+'px" d="'+d+'"></path>';
        }else{
          runEdges+='<path class="edge path-static '+pathCls+'" style="stroke-width:'+runW+'px" d="'+d+'"></path>';
        }
        if(flowEnabled){
          runEdges+='<path pathLength="100" class="edge path-travel '+pathCls+'" style="--delay:'+(animateEntry?delay:'0ms')+';stroke-width:'+runW+'px" d="'+d+'"></path>';
        }
      }
    });
    layout.ids.forEach(function(id){var p=layout.pos[id],nd=self._nodeData(id),cls=self._businessClass(nd.delta),inPath=pathSet[id]!=null,pathIndex=inPath?pathSet[id]:-1,delay=(pathIndex*620)+'ms';var ratio=Math.sqrt(Math.min(1,Math.abs(nd.delta||0)/maxAbs)),bar=(48*ratio).toFixed(1),fillCls=cls==='up'?'pos':cls==='down'?'neg':'neu',arrow=nd.delta>0?'▲ ':nd.delta<0?'▼ ':'';var pathClass=inPath?(animateEntry?' path-node':' path-static-node'):'',classes='node-card '+cls+(id===selected?' selected':'')+pathClass+(id===target?' target':'');var kids=layout.fullChildren[id]||[],collapsed=!!self._collapsedIds[id],toggle='';if(kids.length){var hiddenCount=layout.descendantCount[id]||kids.length;toggle='<button class="node-toggle '+(collapsed?'collapsed':'expanded')+'" type="button" data-tree-toggle="'+esc(id)+'" aria-expanded="'+(collapsed?'false':'true')+'" title="'+(collapsed?'Expand':'Collapse')+' '+esc(nd.label)+'"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5L10 8l-5 4.5"></path></svg>'+(collapsed?'<span class="hidden-count">+'+hiddenCount+'</span>':'')+'</button>';}
      nodes+='<div class="'+classes+'" data-tree-node="'+esc(id)+'" style="left:'+p.x+'px;top:'+p.y+'px;'+(inPath&&animateEntry?'--delay:'+delay:'')+'" title="'+esc(nd.label)+'">'+toggle+'<div class="node-name">'+esc(nd.label)+'</div><div class="node-delta-main"><span class="node-delta-abs">'+esc(nd.delta==null?'—':compactDelta(nd.delta,unit))+'</span><span class="node-delta-pct">'+esc(arrow+(nd.deltaPct==null?'—':formatPct(nd.deltaPct)))+'</span></div><div class="node-current">'+esc(model.currentScopeLabel||'Current')+' '+esc(formatValue(nd.current,unit))+'</div><div class="delta-axis"><i class="delta-fill '+fillCls+'" style="width:'+bar+'%"></i></div></div>';});
    return '<div class="tree-zoom-wrap"><div class="tree-canvas" data-natural-width="'+layout.width+'" data-natural-height="'+layout.height+'" style="width:'+layout.width+'px;height:'+layout.height+'px"><svg class="edge-layer" viewBox="0 0 '+layout.width+' '+layout.height+'" preserveAspectRatio="none">'+baseEdges+runEdges+'</svg>'+nodes+'</div></div>';
  };

  HierarchyPulseWidget.prototype._overviewHtml = function () {
    var layout=this._lastLayout;if(!layout)return'';var path=this._dominantPath(null).filter(function(id){return !!layout.pos[id];}),pathSet={};path.forEach(function(id){pathSet[id]=true;});var edges='',nodes='';layout.ids.forEach(function(id){var p=layout.parentOf[id];if(!p||!layout.pos[p]||!layout.pos[id])return;edges+='<path class="ov-edge" d="M '+(layout.pos[p].x+layout.cardW)+' '+layout.pos[p].y+' L '+layout.pos[id].x+' '+layout.pos[id].y+'"></path>';});layout.ids.forEach(function(id){var p=layout.pos[id];nodes+='<circle class="ov-node '+(pathSet[id]?'path':'')+'" cx="'+(p.x+layout.cardW/2)+'" cy="'+p.y+'" r="12"></circle>';});return '<div class="overview-card"><svg id="hp-overview" class="overview-svg" viewBox="0 0 '+layout.width+' '+layout.height+'" preserveAspectRatio="none">'+edges+nodes+'<rect id="hp-overview-view" class="ov-view" x="0" y="0" width="1" height="1" rx="8"></rect></svg></div>';
  };

  // Extend rendering with hierarchy expand/collapse controls without changing data semantics.
  var renderBeforeExpandCollapse = HierarchyPulseWidget.prototype._render;
  HierarchyPulseWidget.prototype._render = function (resetViewport) {
    var result=renderBeforeExpandCollapse.call(this, resetViewport),self=this;
    var expand=self.shadowRoot&&self.shadowRoot.querySelector('#hp-expand-all'),collapse=self.shadowRoot&&self.shadowRoot.querySelector('#hp-collapse-all');
    if(expand)expand.addEventListener('click',function(){self._pendingTreeTransition=self._captureTreeTransition();self._collapsedIds={};self._preserveExactViewport=true;self._suppressPathAnimationOnce=true;self._render(false);});
    if(collapse)collapse.addEventListener('click',function(){self._pendingTreeTransition=self._captureTreeTransition();var layout=self._lastLayout;if(layout&&layout.fullChildren){self._collapsedIds={};Object.keys(layout.fullChildren).forEach(function(id){if((layout.fullChildren[id]||[]).length)self._collapsedIds[id]=true;});}var roots=self._roots();self._selectedId=roots.length===1?roots[0]:null;self._detailsOpen=false;self._preserveExactViewport=true;self._suppressPathAnimationOnce=true;self._render(false);});
    Array.prototype.forEach.call(self.shadowRoot.querySelectorAll('[data-tree-toggle]'),function(btn){btn.addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();var id=btn.getAttribute('data-tree-toggle');self._pendingTreeTransition=self._captureTreeTransition();self._collapsedIds=self._collapsedIds||{};if(self._collapsedIds[id])delete self._collapsedIds[id];else{self._collapsedIds[id]=true;if(self._selectedId&&self._selectedId!==id){var path=self._pathIds(self._selectedId)||[];if(path.indexOf(id)>=0)self._selectedId=id;}}self._preserveExactViewport=true;self._suppressPathAnimationOnce=true;self._detailsOpen=false;self._render(false);});});
    return result;
  };

  // Preserve the viewport when only the selection changes.
  var originalRender = HierarchyPulseWidget.prototype._render;
  HierarchyPulseWidget.prototype._render = function (resetViewport) {
    if (resetViewport === false && this.shadowRoot) {
      var sc=this.shadowRoot.querySelector('.tree-scroll');
      if (sc) { this._pendingScrollLeft=sc.scrollLeft; this._pendingScrollTop=sc.scrollTop; }
    } else {
      this._pendingScrollLeft=null; this._pendingScrollTop=0;
    }
    return originalRender.call(this);
  };



  /* Release 1.0 fixes: inspector clarity, leaf visibility, stable replay state, smooth hierarchy transitions */
  STYLES += `
    .section-title-row { display:flex; align-items:baseline; justify-content:space-between; gap:8px; flex-wrap:wrap; }
    .section-sub { margin-top:2px; color:#5d7f9a; font-size:12px; line-height:1.3; font-weight:700; }
    .detail-title { margin:12px 0 6px; color:#254f72; font-size:13px; line-height:1.2; font-weight:900; }
    .transition-ghost { pointer-events:none !important; z-index:7 !important; animation:none !important; }
    .transition-ghost * { pointer-events:none !important; }
    .edge-layer.tree-layout-transition { transition:opacity .28s ease; }
    @media (prefers-reduced-motion: reduce) {
      .transition-ghost, .edge-layer.tree-layout-transition { transition:none !important; }
    }
  `;

  HierarchyPulseWidget.prototype._directChildren = function (id) {
    var self=this,model=this._model,structure=model.hierarchyStructure||{},maps=this._maps();
    var result=[];

    // Structural children stay tied to the native BW parentId tree. Do not
    // relabel hierarchy nodes as products just because the binding stops there.
    var childIds=id&&structure[id]?(structure[id].childIds||[]).slice():this._roots();
    childIds.forEach(function(cid){
      var sn=structure[cid];
      if(!sn || sn.isNode !== true) return;
      var n=self._nodeData(cid);
      n.hasCurrent=!!maps.current[cid];
      n.hasPrior=!!maps.prior[cid];
      n.kind='branch';
      if(n.hasCurrent||n.hasPrior) result.push(n);
    });

    // Leaf members use parent-aware relation keys. A BW member ID can occur
    // below more than one hierarchy node, so id alone is not a safe identity.
    if(id){
      var currentLeaf={},priorLeaf={};
      (model.currentLeafEntries||[]).forEach(function(e){currentLeaf[e.relationKey]=e;});
      (model.priorLeafEntries||[]).forEach(function(e){priorLeaf[e.relationKey]=e;});
      (model.leafRelationsByParent&&model.leafRelationsByParent[id]||[]).forEach(function(rel){
        var key=String(id)+'\u001f'+String(rel.id),c=currentLeaf[key],p=priorLeaf[key];
        var current=c?c.value:null,prior=p?p.value:null,hasCurrent=!!c,hasPrior=!!p;
        result.push({
          id:rel.id,label:rel.label,parentId:id,kind:'product',relationKey:key,
          current:hasCurrent?current:0,prior:hasPrior?prior:null,
          delta:hasCurrent&&hasPrior?current-prior:hasCurrent?current:hasPrior?-prior:null,
          deltaPct:hasPrior?pctDelta(hasCurrent?current:0,prior):null,
          hasCurrent:hasCurrent,hasPrior:hasPrior
        });
      });
    }

    return result.sort(function(a,b){
      var ad=a.delta!=null&&isFinite(a.delta)?Math.abs(a.delta):Math.abs(a.current||0);
      var bd=b.delta!=null&&isFinite(b.delta)?Math.abs(b.delta):Math.abs(b.current||0);
      return bd-ad;
    });
  };

  HierarchyPulseWidget.prototype._topContributors = function (id, limit) {
    return this._directChildren(id).slice(0,limit||5);
  };

  HierarchyPulseWidget.prototype._panelHtml = function () {
    var self=this,model=self._model,unit=unitFromModel(model),selected=self._selected(),structure=model.hierarchyStructure||{},cls=self._businessClass(selected.delta),pathIds=self._pathIds(selected.id),crumbs='';
    if(!pathIds.length)crumbs='<span>Global</span>';else pathIds.forEach(function(id,i){if(i)crumbs+='<span>›</span>';crumbs+='<span class="crumb" data-crumb-id="'+esc(id)+'">'+esc(structure[id]&&structure[id].label||id)+'</span>';});
    var all=self._directChildren(selected.id),contribSection='';
    if(all.length){
      var productCount=all.filter(function(n){return n.kind==='product';}).length;
      var branchCount=all.filter(function(n){return n.kind==='branch';}).length;
      var allProducts=productCount===all.length,allBranches=branchCount===all.length;
      var noun=allProducts?'Products':allBranches?'Branches':'Children';
      var firstColumn=allProducts?'Product':allBranches?'Branch':'Member';
      var title=allProducts?'Direct products contributing to ':allBranches?'Direct child branches contributing to ':'Direct children contributing to ';
      var knownDeltas=all.filter(function(n){return n.delta!=null&&isFinite(n.delta);});
      var childSum=knownDeltas.reduce(function(sum,n){return sum+n.delta;},0);
      var sumText=knownDeltas.length===all.length?noun+' · Sum = '+compactDelta(childSum,unit):noun+' · '+knownDeltas.length+' of '+all.length+' with comparable values · Sum = '+compactDelta(childSum,unit);
      var rows=all.map(function(n){
        var p=n.deltaPct==null?'—':formatPct(n.deltaPct),arrow=n.delta>0?'▲ ':n.delta<0?'▼ ':'';
        var prior=n.hasPrior?formatDetailValue(n.prior,unit):'—',current=n.hasCurrent?formatDetailValue(n.current,unit):'—',delta=n.delta==null?'—':compactDelta(n.delta,unit);
        var rowAttr=n.kind==='branch'?' data-panel-node="'+esc(n.id)+'"':'';
        return '<div class="detail-row"'+rowAttr+'><b>'+esc(n.label)+'</b><span>'+esc(prior)+'</span><span>'+esc(current)+'</span><span class="'+(self._businessClass(n.delta)==='up'?'pos':self._businessClass(n.delta)==='down'?'neg':'')+'">'+esc(delta)+'</span><span class="'+(self._businessClass(n.delta)==='up'?'pos':self._businessClass(n.delta)==='down'?'neg':'')+'">'+esc(arrow+p)+'</span></div>';
      }).join('');
      contribSection='<div class="section"><div class="section-title-row"><div class="section-title">'+title+esc(selected.label)+' variance</div></div><div class="section-sub">'+esc(sumText)+'</div><div class="branch-details"><div class="detail-head"><span>'+firstColumn+'</span><span>Prior</span><span>Current</span><span>Δ</span><span>Δ%</span></div>'+rows+'</div></div>';
    } else {
      contribSection='<div class="section"><div class="section-title">No direct children returned for this node</div><div class="section-sub">The current BW binding does not expose a deeper level below '+esc(selected.label)+'.</div></div>';
    }
    var comparison=selected.prior==null?'':'<div class="comparison-line"><span>'+esc(model.priorScopeLabel||'Prior')+'</span><b>'+esc(formatDetailValue(selected.prior,unit))+'</b><span class="compare-arrow">→</span><span>'+esc(model.currentScopeLabel||'Current')+'</span><b>'+esc(formatDetailValue(selected.current,unit))+'</b></div>';
    var arrowSel=selected.delta>0?'▲ ':selected.delta<0?'▼ ':'';
    return '<aside class="panel"><div class="crumbs">'+crumbs+'</div><div><div class="eyebrow">Selected branch</div><h2>'+esc(selected.label)+'</h2></div>'
      +'<div class="kpi"><div><div class="big">'+esc(formatValue(selected.current,unit))+'</div><div class="period">'+esc(model.currentScopeLabel||'Current')+'</div></div><div class="delta-block '+cls+'"><div class="pct">'+esc(arrowSel+(selected.deltaPct==null?'—':formatPct(selected.deltaPct)))+'</div><div class="abs">'+esc(selected.delta==null?'—':compactDelta(selected.delta,unit))+'</div></div></div>'+comparison+contribSection
      +'<div class="legend"><span><i class="lg-fav"></i>Favorable</span><span><i class="lg-adv"></i>Adverse</span><span><i></i>Neutral</span><span><i class="lg-sel"></i>Selected</span></div></aside>';
  };

  HierarchyPulseWidget.prototype._captureTreeTransition = function () {
    if(!this.shadowRoot||typeof window==='undefined'||(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches))return null;
    var layout=this._lastLayout,canvas=this.shadowRoot.querySelector('.tree-canvas');
    if(!layout||!canvas)return null;
    var items={};
    Array.prototype.forEach.call(canvas.querySelectorAll('[data-tree-node]'),function(el){
      var id=el.getAttribute('data-tree-node'),p=layout.pos&&layout.pos[id];if(!id||!p)return;
      var clone=el.cloneNode(true);clone.removeAttribute('data-tree-node');clone.classList.add('transition-ghost');
      Array.prototype.forEach.call(clone.querySelectorAll('[data-tree-toggle]'),function(b){b.removeAttribute('data-tree-toggle');b.setAttribute('tabindex','-1');});
      items[id]={x:p.x,y:p.y,clone:clone};
    });
    return {items:items};
  };

  HierarchyPulseWidget.prototype._animateTreeTransition = function (state) {
    if(!state||!state.items||!this.shadowRoot)return;
    var canvas=this.shadowRoot.querySelector('.tree-canvas'),layout=this._lastLayout;if(!canvas||!layout)return;
    var newIds={};
    Array.prototype.forEach.call(canvas.querySelectorAll('[data-tree-node]'),function(el){
      var id=el.getAttribute('data-tree-node'),p=layout.pos&&layout.pos[id];if(!id||!p)return;newIds[id]=true;
      var old=state.items[id];
      el.style.animation='none';
      el.style.transition='none';
      if(old){el.style.transform='translate('+(old.x-p.x)+'px,'+(old.y-p.y)+'px)';el.style.opacity='.9';}
      else{el.style.transform='translate(-18px,0) scale(.98)';el.style.opacity='0';}
      requestAnimationFrame(function(){el.style.transition='transform 340ms cubic-bezier(.2,.72,.25,1), opacity 260ms ease';el.style.transform='translate(0,0) scale(1)';el.style.opacity='1';setTimeout(function(){el.style.transition='';el.style.transform='';el.style.opacity='';el.style.animation='';},380);});
    });
    Object.keys(state.items).slice(0,180).forEach(function(id){if(newIds[id])return;var old=state.items[id],ghost=old&&old.clone;if(!ghost)return;ghost.style.left=old.x+'px';ghost.style.top=old.y+'px';ghost.style.opacity='.75';ghost.style.transition='none';canvas.appendChild(ghost);requestAnimationFrame(function(){ghost.style.transition='opacity 220ms ease, transform 300ms cubic-bezier(.2,.72,.25,1)';ghost.style.opacity='0';ghost.style.transform='translate(12px,0) scale(.97)';setTimeout(function(){if(ghost.parentNode)ghost.parentNode.removeChild(ghost);},340);});});
    var edges=canvas.querySelector('.edge-layer');if(edges){edges.classList.add('tree-layout-transition');edges.style.opacity='.12';requestAnimationFrame(function(){edges.style.opacity='1';setTimeout(function(){edges.style.opacity='';edges.classList.remove('tree-layout-transition');},320);});}
  };

  var renderV1Stable = HierarchyPulseWidget.prototype._render;
  HierarchyPulseWidget.prototype._render = function (resetViewport) {
    var transition=this._pendingTreeTransition||null;
    this._pendingTreeTransition=null;
    var result=renderV1Stable.call(this,resetViewport);
    var self=this;
    if(transition){requestAnimationFrame(function(){requestAnimationFrame(function(){self._animateTreeTransition(transition);self._suppressPathAnimationOnce=false;});});}
    else self._suppressPathAnimationOnce=false;
    return result;
  };

  HierarchyPulseWidget.prototype.connectedCallback = function () {
    var self=this; self._ensure(); self._schedule();
    if (typeof ResizeObserver !== 'undefined' && !self._resizeObserver) {
      self._resizeObserver=new ResizeObserver(function(){ if(!self._model) return; if(self._autoFit) self._fitTree(); else self._applyZoom(self._zoom||1,false); });
      self._resizeObserver.observe(self);
    }
  };
  HierarchyPulseWidget.prototype.onCustomWidgetBeforeUpdate = function () { this._ensure(); };
  HierarchyPulseWidget.prototype.onCustomWidgetAfterUpdate = function (changedProps) {
    changedProps=changedProps||{};
    if(changedProps.layoutDirection!==undefined){
      var next=changedProps.layoutDirection==='ttb'?'ttb':'ltr';
      if(next!==this._layoutDirection){
        this._layoutDirection=next;
        this._autoFit=true;
      }
    }
    this._schedule();
  };
  HierarchyPulseWidget.prototype.onCustomWidgetResize = function () { if(!this._model) return; if(this._autoFit) this._fitTree(); else this._applyZoom(this._zoom||1,false); };
  HierarchyPulseWidget.prototype.disconnectedCallback = function () {
    if(this._renderTimer) clearTimeout(this._renderTimer); this._renderTimer=null;
    if(this._resizeObserver) this._resizeObserver.disconnect(); this._resizeObserver=null;
  };

  /* Final RC UI freeze: remove the hierarchy overview/minimap bar completely. */
  HierarchyPulseWidget.prototype._overviewHtml = function () { return ''; };
  HierarchyPulseWidget.prototype._bindOverview = function () {};
  HierarchyPulseWidget.prototype._updateOverviewViewport = function () {};
  STYLES += `
    .overview-card { display:none !important; }
    .stage { grid-template-rows:minmax(0,1fr) !important; }
    .zoom-tools { bottom:12px !important; }
  `;

  if (!customElements.get('com-custom-hierarchy-pulse')) customElements.define('com-custom-hierarchy-pulse', HierarchyPulseWidget);
}());
