/* WHY - SAC Custom Widget v1.0.0
 * Deterministic SAC variance signal analysis with an executive briefing experience, query-derived period timeline, semantic impact direction, lifecycle flags, stable impact ranking, overlap grouping, and click-to-explore evidence.
 * No AI. No backend. No writeback. Reads only the bound result set.
 */
(function () {
  'use strict';

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

  var AGGREGATE_LABELS = [
    'total','totals','subtotal','subtotals','result','overall result',
    'grand total','sum','gesamtergebnis','zwischensumme'
  ];
  var AGGREGATE_IDS = [
    '@totalmember','@resultmember','$$result$$','$$total$$',
    'total','result','overall_result','grand_total','summe'
  ];

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
    for (var i=0;i<flagKeys.length;i++) if (obj[flagKeys[i]] === true) return true;
    return false;
  }

  function isAggregateCell(cell) {
    if (!cell) return true;
    if (aggregateFlag(cell)) return true;
    var id = cell.id == null ? '' : String(cell.id).trim();
    var label = cell.label == null ? '' : String(cell.label).trim();
    var idLow = id.toLowerCase();
    var labelLow = label.toLowerCase();
    if (!id && !label && cell.raw == null) return true;
    if (idLow !== '#' && AGGREGATE_IDS.indexOf(idLow) !== -1) return true;
    if (AGGREGATE_LABELS.indexOf(labelLow) !== -1) return true;
    if (idLow.indexOf('@totalmember') !== -1 || idLow.indexOf('@resultmember') !== -1) return true;
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
    return alias;
  }

  function resolveMeasureLabel(binding, alias) {
    var members = binding && binding.metadata && binding.metadata.mainStructureMembers;
    var meta = members && members[alias];
    if (meta) return meta.description || meta.label || meta.id || alias;
    return alias;
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
    return String(raw == null ? '' : raw).trim().replace(/^[A-Z0-9_]+\./i, '').replace(/^\[|\]$/g, '').trim();
  }

  function makePeriod(year, granularity, p1, p2, label, id) {
    var key = String(year);
    var ordinal = year * 1000;
    if (granularity === 'quarter') { key += '-Q' + p1; ordinal += p1 * 100; }
    if (granularity === 'month') { key += '-' + String(p1).padStart(2,'0'); ordinal += p1 * 10; }
    if (granularity === 'week') { key += '-W' + String(p1).padStart(2,'0'); ordinal += p1; }
    if (granularity === 'day') { key += '-' + String(p1).padStart(2,'0') + '-' + String(p2).padStart(2,'0'); ordinal = Math.floor(Date.UTC(year,p1-1,p2)/86400000); }
    return {year:year,granularity:granularity,month:granularity==='month'||granularity==='day'?p1:null,quarter:granularity==='quarter'?p1:null,week:granularity==='week'?p1:null,day:granularity==='day'?p2:null,key:key,ordinal:ordinal,label:label||id||key};
  }

  function parseTemporalCell(cell, hint) {
    if (!cell || isAggregateCell(cell)) return null;
    var candidates = [cell.id, cell.label];
    hint = hint || 'unknown';
    for (var i=0;i<candidates.length;i++) {
      var s = cleanTemporalRaw(candidates[i]).replace(/\s+/g,' ').trim();
      if (!s) continue;
      var m,y,a,b;
      m=s.match(/^((?:19|20|21)\d{2})[-/.]?([01]\d)[-/.]?([0-3]\d)$/);
      if(m&&(hint==='day'||s.length>=8)){y=+m[1];a=+m[2];b=+m[3];if(a>=1&&a<=12&&b>=1&&b<=31)return makePeriod(y,'day',a,b,cell.label,cell.id);}
      m=s.match(/^([0-3]\d)[./-]([01]\d)[./-]((?:19|20|21)\d{2})$/);
      if(m){y=+m[3];a=+m[2];b=+m[1];if(a>=1&&a<=12&&b>=1&&b<=31)return makePeriod(y,'day',a,b,cell.label,cell.id);}
      m=s.match(/^((?:19|20|21)\d{2})\s*[-/]?\s*Q([1-4])$/i)||s.match(/^Q([1-4])\s*[-/]?\s*((?:19|20|21)\d{2})$/i);
      if(m){if(/^Q/i.test(s)){y=+m[2];a=+m[1];}else{y=+m[1];a=+m[2];}return makePeriod(y,'quarter',a,null,cell.label,cell.id);}
      m=s.match(/^((?:19|20|21)\d{2})\s*[-/]?\s*W?([0-5]\d)$/i);
      if(m&&(hint==='week'||+m[2]>12)){y=+m[1];a=+m[2];if(a>=1&&a<=53)return makePeriod(y,'week',a,null,cell.label,cell.id);}
      m=s.match(/^((?:19|20|21)\d{2})\s*[-/.]?\s*([01]?\d)$/);
      if(m&&(hint==='month'||+m[2]<=12)){y=+m[1];a=+m[2];if(a>=1&&a<=12)return makePeriod(y,'month',a,null,cell.label,cell.id);}
      m=s.match(/^([01]?\d)\s*[-/.]\s*((?:19|20|21)\d{2})$/);
      if(m){y=+m[2];a=+m[1];if(a>=1&&a<=12)return makePeriod(y,'month',a,null,cell.label,cell.id);}
      m=s.toLowerCase().match(/^([a-zäöüß]+)\s+((?:19|20|21)\d{2})$/i);
      if(m&&MONTH_NAMES[m[1]])return makePeriod(+m[2],'month',MONTH_NAMES[m[1]],null,cell.label,cell.id);
      m=s.match(/^((?:19|20|21)\d{2})(\d{2})$/);
      if(m){y=+m[1];a=+m[2];if(hint==='week'&&a>=1&&a<=53)return makePeriod(y,'week',a,null,cell.label,cell.id);if(a>=1&&a<=12)return makePeriod(y,'month',a,null,cell.label,cell.id);}
      m=s.match(/^((?:19|20|21)\d{2})$/);
      if(m)return makePeriod(+m[1],'year',null,null,cell.label,cell.id);
    }
    return null;
  }

  function periodPositionWithinYear(period) {
    if(!period)return null;
    if(period.granularity==='quarter')return period.quarter;
    if(period.granularity==='month')return period.month;
    if(period.granularity==='week')return period.week;
    if(period.granularity==='day')return (period.month||0)*100+(period.day||0);
    return null;
  }

  function comparablePeriod(period, year, latest) {
    if(!period||!latest||period.year!==year||period.granularity!==latest.granularity)return false;
    if(period.granularity==='year')return true;
    var pos=periodPositionWithinYear(period),limit=periodPositionWithinYear(latest);
    return pos!=null&&limit!=null&&pos<=limit;
  }

  function matchingPriorPeriod(period) {
    if(!period)return null;
    return makePeriod(period.year-1,period.granularity,period.quarter||period.month||period.week,period.day,null,null);
  }

  function monthShort(month) {
    return ['', 'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month]||'';
  }

  function scopeLabel(period) {
    if(!period)return '';
    if(period.granularity==='year')return String(period.year);
    if(period.granularity==='quarter')return 'Q1-Q'+period.quarter+' '+period.year;
    if(period.granularity==='month')return 'Jan-'+monthShort(period.month)+' '+period.year;
    if(period.granularity==='week')return 'W1-W'+period.week+' '+period.year;
    if(period.granularity==='day')return 'Through '+monthShort(period.month)+' '+period.day+', '+period.year;
    return period.label||period.key;
  }

  function isCumulativeMeasureLabel(label) {
    var s=String(label||'').toLowerCase();
    return /\bytd\b|year\s*[- ]?to\s*[- ]?date|year to date|cumulative|kumuliert/.test(s);
  }

  function formatNumber(value) {
    if(value==null||!isFinite(value))return '—';
    var abs=Math.abs(value),opts={maximumFractionDigits:abs>=1000?1:abs>=100?0:1};
    if(abs>=1000)opts.notation='compact';
    return new Intl.NumberFormat('en',opts).format(value);
  }

  function formatPctRatio(value) {
    if(value==null||!isFinite(value))return '—';
    return (value>0?'+':'')+new Intl.NumberFormat('en',{style:'percent',maximumFractionDigits:1,minimumFractionDigits:1}).format(value);
  }

  function formatShare(value) {
    if(value==null||!isFinite(value))return '—';
    return new Intl.NumberFormat('en',{style:'percent',maximumFractionDigits:0}).format(value);
  }

  function formatPp(rate) {
    if(rate==null||!isFinite(rate))return '—';
    var pp=rate*100;
    return (pp>0?'+':'')+new Intl.NumberFormat('en',{maximumFractionDigits:1,minimumFractionDigits:1}).format(pp)+' pp';
  }

  function pctDelta(current, prior) {
    if(prior==null||!isFinite(prior)||Math.abs(prior)<1e-9)return null;
    return (current-prior)/Math.abs(prior);
  }

  function detectUnitFromText(text) {
    var s=String(text||'');
    if(/€|\bEUR\b/i.test(s))return 'EUR';
    if(/\$|\bUSD\b/i.test(s))return 'USD';
    if(/£|\bGBP\b/i.test(s))return 'GBP';
    if(/\bCHF\b/i.test(s))return 'CHF';
    if(/\bJPY\b|¥/.test(s))return 'JPY';
    if(/\bCAD\b/i.test(s))return 'CAD';
    if(/\bAUD\b/i.test(s))return 'AUD';
    return '';
  }

  function unitFromBinding(binding, alias) {
    var members=binding&&binding.metadata&&binding.metadata.mainStructureMembers;
    var meta=members&&members[alias];
    if(meta){
      var keys=['unit','currency','unitOfMeasure','currencyUnit','unitCode'];
      for(var i=0;i<keys.length;i++)if(meta[keys[i]])return String(meta[keys[i]]);
      var fromMeta=detectUnitFromText(meta.formatted||meta.description||'');
      if(fromMeta)return fromMeta;
    }
    var rows=binding&&binding.data||[];
    for(var r=0;r<rows.length;r++){
      var cell=rows[r]&&rows[r][alias];
      if(!cell)continue;
      if(cell.unit)return String(cell.unit);
      if(cell.currency)return String(cell.currency);
      if(cell.unitOfMeasure)return String(cell.unitOfMeasure);
      var found=detectUnitFromText(cell.formatted||cell.formattedValue||cell.displayValue||'');
      if(found)return found;
    }
    return '';
  }

  function unitPrefix(unit) {
    var u=String(unit||'').toUpperCase();
    if(u==='EUR')return '€';
    if(u==='USD')return '$';
    if(u==='GBP')return '£';
    if(u==='JPY')return '¥';
    if(u==='CHF')return 'CHF ';
    if(u==='CAD')return 'C$';
    if(u==='AUD')return 'A$';
    return '';
  }

  function genericUnitSuffix(unit) {
    var u=String(unit||'').trim();
    return !u||unitPrefix(u)?'':' '+u;
  }

  function formatValue(value, unit) {
    if(value==null||!isFinite(value))return '—';
    return unitPrefix(unit)+formatNumber(value)+genericUnitSuffix(unit);
  }

  function formatDelta(value, unit) {
    if(value==null||!isFinite(value))return '—';
    var sign=value>0?'+':value<0?'-':'';
    return sign+unitPrefix(unit)+formatNumber(Math.abs(value))+genericUnitSuffix(unit);
  }

  function looksLikeHierarchyNode(cell) {
    if(!cell||typeof cell!=='object')return false;
    if(cell.isNode===true||cell.hasChildren===true||cell.expandable===true)return true;
    if(cell.isLeaf===false)return true;
    return false;
  }

  function rowKey(members, aliases) {
    return aliases.map(function(alias){var m=members[alias];return alias+'='+String(m&&m.id!=null?m.id:'');}).join('\u001f');
  }

  function aggregateEntries(entries, predicate, aliases) {
    var map={};
    entries.forEach(function(entry){
      if(!predicate(entry))return;
      var key=rowKey(entry.members,aliases);
      if(!map[key])map[key]={members:entry.members,value:0};
      map[key].value+=entry.value;
    });
    return Object.keys(map).map(function(k){return map[k];});
  }

  function pathMatches(row, path) {
    for(var i=0;i<path.length;i++){
      var step=path[i],m=row.members[step.alias];
      if(!m||String(m.id)!==String(step.id))return false;
    }
    return true;
  }

  function sumRows(rows) {
    var n=0;for(var i=0;i<rows.length;i++)n+=rows[i].value;return n;
  }

  function groupsForAlias(currentRows, priorRows, alias, path) {
    var current={},prior={},labels={};
    currentRows.forEach(function(row){
      if(!pathMatches(row,path))return;
      var m=row.members[alias];if(!m)return;
      var id=String(m.id);labels[id]=m.label||id;current[id]=(current[id]||0)+row.value;
    });
    priorRows.forEach(function(row){
      if(!pathMatches(row,path))return;
      var m=row.members[alias];if(!m)return;
      var id=String(m.id);labels[id]=m.label||id;prior[id]=(prior[id]||0)+row.value;
    });
    var ids={};Object.keys(current).forEach(function(id){ids[id]=true;});Object.keys(prior).forEach(function(id){ids[id]=true;});
    return Object.keys(ids).map(function(id){
      var c=current[id]||0,p=prior[id]||0;
      return {id:id,label:labels[id]||id,current:c,prior:p,delta:c-p,deltaPct:pctDelta(c,p)};
    });
  }

  function aliasCombinations(aliases, maxDepth) {
    var out=[];
    function walk(start, combo) {
      if(combo.length){ out.push(combo.slice()); if(combo.length>=maxDepth)return; }
      for(var i=start;i<aliases.length;i++){ combo.push(aliases[i]); walk(i+1,combo); combo.pop(); }
    }
    walk(0,[]);
    return out;
  }

  function aggregateByAliases(rows, aliases, fullAliases) {
    var map={};
    fullAliases=fullAliases&&fullAliases.length?fullAliases:aliases;
    rows.forEach(function(row){
      var parts=[],assignments=[],ok=true;
      for(var i=0;i<aliases.length;i++){
        var alias=aliases[i],m=row.members[alias];
        if(!m){ok=false;break;}
        var id=String(m.id);parts.push(alias+'='+id);
        assignments.push({alias:alias,id:id,label:m.label||id});
      }
      if(!ok)return;
      var key=parts.join('\u001f');
      if(!map[key])map[key]={assignments:assignments,value:0,coverage:{}};
      map[key].value+=row.value;
      map[key].coverage[rowKey(row.members,fullAliases)]=true;
    });
    return map;
  }

  function coverageOverlap(a,b) {
    var ak=a&&a.coverageKeys||[],bk=b&&b.coverageKeys||[];
    if(!ak.length||!bk.length)return 0;
    var small=ak.length<=bk.length?ak:bk,large=ak.length<=bk.length?bk:ak,set={};
    large.forEach(function(k){set[k]=true;});
    var inter=0;small.forEach(function(k){if(set[k])inter++;});
    return inter/Math.max(1,small.length);
  }

  function relatedCandidate(a,b) {
    if(coverageOverlap(a,b)>=0.80)return true;
    // Fallback for sparse bindings: exact assignment containment still means the
    // two candidates are different cuts of the same underlying segment.
    function contains(x,y){
      return y.assignments.every(function(ya){
        return x.assignments.some(function(xa){return xa.alias===ya.alias&&String(xa.id)===String(ya.id);});
      });
    }
    return contains(a,b)||contains(b,a);
  }

  function candidateImpact(c) {
    return c&&c.impactRate!=null&&isFinite(c.impactRate)?Math.abs(c.impactRate):0;
  }

  function signOf(value) {
    if(value==null||!isFinite(value)||Math.abs(value)<1e-12)return 0;
    return value>0?1:-1;
  }

  function candidateKey(c) {
    if(!c||!c.assignments)return '';
    return c.assignments.map(function(a){return a.alias+'='+String(a.id);}).sort().join('|');
  }

  function memberKey(a) {
    return a.alias+'='+String(a.id);
  }

  function signalKind(candidate, overallRate) {
    if(!candidate||candidate.deltaPct==null||!isFinite(candidate.deltaPct))return 'signal';
    var actual=candidate.deltaPct;
    if(overallRate>1e-9&&actual<0)return 'countertrend';
    if(overallRate<-1e-9&&actual>0)return 'countertrend';
    if(actual>overallRate+0.0005)return 'above';
    if(actual<overallRate-0.0005)return 'below';
    return 'near';
  }

  function lifecycleKind(candidate) {
    if(!candidate)return null;
    var prior=Number(candidate.prior),current=Number(candidate.current);
    if(!isFinite(prior)||!isFinite(current))return null;
    var scale=Math.max(1,Math.abs(prior),Math.abs(current));
    var eps=scale*1e-10;
    if(prior>eps&&Math.abs(current)<=eps)return 'disappeared';
    if(Math.abs(prior)<=eps&&current>eps)return 'new';
    return null;
  }

  function lifecycleLabel(kind) {
    return kind==='disappeared'?'Disappeared':kind==='new'?'New':'';
  }

  function lifecycleHelp(kind) {
    if(kind==='disappeared')return 'Present in the comparison period but no current value. This can reflect a genuine business change or a structural/master-data change.';
    if(kind==='new')return 'No comparison-period value but present in the current period. This can reflect a genuine business change or a structural/master-data change.';
    return '';
  }

  function groupContainsMember(group, key) {
    var seen={};
    ([group.lead].concat(group.evidence||[]).concat(group.members||[])).forEach(function(c){
      if(!c||!c.assignments)return;
      c.assignments.forEach(function(a){seen[memberKey(a)]=true;});
    });
    return !!seen[key];
  }

  function assignmentsContain(specific,broad) {
    if(!specific||!broad||!specific.assignments||!broad.assignments)return false;
    return broad.assignments.every(function(ba){
      return specific.assignments.some(function(sa){return sa.alias===ba.alias&&String(sa.id)===String(ba.id);});
    });
  }

  function sameMovement(a,b) {
    if(!a||!b)return false;
    if(signOf(a.impactRate)!==signOf(b.impactRate))return false;
    if(signOf(a.surprise)!==signOf(b.surprise))return false;
    var aContainsB=assignmentsContain(a,b),bContainsA=assignmentsContain(b,a);
    if(aContainsB||bContainsA){
      var specific=aContainsB?a:b,broad=aContainsB?b:a;
      var impactRatio=candidateImpact(broad)>1e-12?candidateImpact(specific)/candidateImpact(broad):0;
      var surpriseRatio=Math.abs(broad.surprise)>1e-9?Math.abs(specific.surprise)/Math.abs(broad.surprise):0;
      return impactRatio>=0.65&&surpriseRatio>=0.65;
    }
    return coverageOverlap(a,b)>=0.80;
  }

  function displayImpactBucket(candidate) {
    // formatPp shows one decimal place. Candidates that would display with the
    // same tenth of a percentage point are treated as a visual tie.
    return Math.round(candidateImpact(candidate)*1000);
  }

  function candidateStableCompare(a,b) {
    var bucketDiff=displayImpactBucket(b)-displayImpactBucket(a);
    if(bucketDiff)return bucketDiff;
    var lifeA=lifecycleKind(a)?1:0,lifeB=lifecycleKind(b)?1:0;
    if(lifeB!==lifeA)return lifeB-lifeA;
    if((b.assignments||[]).length!==(a.assignments||[]).length)return (b.assignments||[]).length-(a.assignments||[]).length;
    var surpriseDiff=Math.abs(b.surprise||0)-Math.abs(a.surprise||0);
    if(Math.abs(surpriseDiff)>1e-9)return surpriseDiff;
    return candidateKey(a).localeCompare(candidateKey(b));
  }

  function promoteSpecificLead(group) {
    if(!group||!group.members||!group.members.length)return group;
    var lead=group.lead;
    group.members.forEach(function(c){
      if(!lead||c===lead||c.assignments.length<=lead.assignments.length)return;
      if(!assignmentsContain(c,lead)&&coverageOverlap(c,lead)<0.80)return;
      if(signOf(c.impactRate)!==signOf(lead.impactRate)||signOf(c.surprise)!==signOf(lead.surprise))return;
      var impactRatio=candidateImpact(lead)>1e-12?candidateImpact(c)/candidateImpact(lead):0;
      var surpriseRatio=Math.abs(lead.surprise)>1e-9?Math.abs(c.surprise)/Math.abs(lead.surprise):0;
      if(impactRatio>=0.65&&surpriseRatio>=0.65)lead=c;
    });
    if(lead!==group.lead)group.lead=lead;
    var evidence=[],seen={};
    group.members.slice().sort(candidateStableCompare).forEach(function(c){
      var key=candidateKey(c);
      if(c===group.lead||seen[key])return;
      seen[key]=true;
      evidence.push(c);
    });
    group.evidence=evidence.slice(0,8);
    return group;
  }

  function groupsRelated(a,b) {
    var am=(a&&a.members)||[],bm=(b&&b.members)||[];
    for(var i=0;i<am.length;i++)for(var j=0;j<bm.length;j++)if(sameMovement(am[i],bm[j]))return true;
    return false;
  }

  function groupIndependentSignals(candidates, limit) {
    var sorted=candidates.slice().sort(candidateStableCompare),groups=[];
    sorted.forEach(function(c){
      var group=null;
      for(var i=0;i<groups.length;i++){
        if(sameMovement(c,groups[i].lead)){group=groups[i];break;}
      }
      if(!group){groups.push({lead:c,evidence:[],members:[c]});}
      else{group.members.push(c);promoteSpecificLead(group);}
    });
    groups.forEach(promoteSpecificLead);
    groups.sort(function(a,b){return candidateStableCompare(a.lead,b.lead);});
    return groups.slice(0,limit||5);
  }

  function groupCommonMembers(group) {
    var cuts=[group.lead].concat(group.evidence||[]),stats={};
    cuts.forEach(function(c){
      var seen={};
      (c.assignments||[]).forEach(function(a){
        var key=memberKey(a);if(seen[key])return;seen[key]=true;
        if(!stats[key])stats[key]={key:key,alias:a.alias,id:a.id,label:a.label,count:0,singleBaseShare:Infinity};
        stats[key].count++;
        if(c.assignments&&c.assignments.length===1&&c.baseShare!=null&&isFinite(c.baseShare))stats[key].singleBaseShare=Math.min(stats[key].singleBaseShare,c.baseShare);
      });
    });
    var threshold=Math.max(2,Math.ceil(cuts.length*0.60));
    return Object.keys(stats).map(function(k){return stats[k];}).filter(function(st){return st.count>=threshold;}).sort(function(a,b){
      if(b.count!==a.count)return b.count-a.count;
      var as=isFinite(a.singleBaseShare)?a.singleBaseShare:1,bs=isFinite(b.singleBaseShare)?b.singleBaseShare:1;
      if(Math.abs(as-bs)>1e-12)return as-bs;
      return String(a.label).localeCompare(String(b.label));
    });
  }

  function recurringGroupPatterns(groups) {
    var patterns=[];
    groups.forEach(function(group,groupIndex){
      var common=groupCommonMembers(group);
      if(!common.length||(group.evidence||[]).length<2)return;
      patterns.push({groupIndex:groupIndex,groupKey:candidateKey(group.lead),member:common[0],count:common[0].count,cutCount:1+(group.evidence||[]).length,impact:candidateImpact(group.lead),kind:group.kind||'signal'});
    });
    patterns.sort(function(a,b){
      var ac=a.kind==='countertrend'?1:0,bc=b.kind==='countertrend'?1:0;
      if(bc!==ac)return bc-ac;
      if(b.count!==a.count)return b.count-a.count;
      return b.impact-a.impact;
    });
    return patterns;
  }

  function recurringMembers(groups) {
    return recurringGroupPatterns(groups).map(function(p){return {key:p.member.key,alias:p.member.alias,id:p.member.id,label:p.member.label,count:p.count,totalImpact:p.impact,groupIndexes:[p.groupIndex]};});
  }

  function groupForKey(groups,key) {
    for(var i=0;i<groups.length;i++)if(candidateKey(groups[i].lead)===key)return groups[i];
    return null;
  }

  function strongestPath(model, maxDepth) {
    var currentRows=model.currentRows,priorRows=model.priorRows,aliases=model.dimAliases.slice();
    var totalCurrent=sumRows(currentRows),totalPrior=sumRows(priorRows),totalDelta=totalCurrent-totalPrior;
    var totalDeltaPct=pctDelta(totalCurrent,totalPrior);
    var result={
      path:[],topSignals:[],topSignalGroups:[],countertrendGroups:[],allCandidates:[],totalCurrent:totalCurrent,totalPrior:totalPrior,totalDelta:totalDelta,totalDeltaPct:totalDeltaPct,
      overallRate:null,dominant:false,countertrend:false,distributed:true,classification:'distributed',trueCountertrendGroups:[],positiveImpactGroups:[],negativeImpactGroups:[],recurringMembers:[],primaryRecurring:null,recurringPatterns:[],primaryRecurringPattern:null,editorialSignalKey:null,largestRelativeDeclineKey:null,segmentCurrent:0,segmentPrior:0,segmentDelta:0,segmentExpectedDelta:0,segmentSurprise:0,
      otherCurrent:totalCurrent,otherPrior:totalPrior,otherDelta:totalDelta,otherDeltaPct:totalDeltaPct,topCandidate:null,independentSignalCount:0
    };
    if(Math.abs(totalPrior)<1e-9)return result;
    var overallRate=totalDelta/totalPrior;
    result.overallRate=overallRate;
    if(Math.abs(totalDelta)<1e-9)return result;

    var combos=aliasCombinations(aliases,Math.min(maxDepth||3,aliases.length));
    var candidates=[];
    combos.forEach(function(combo){
      var cMap=aggregateByAliases(currentRows,combo,aliases),pMap=aggregateByAliases(priorRows,combo,aliases),keys={};
      Object.keys(cMap).forEach(function(k){keys[k]=true;});Object.keys(pMap).forEach(function(k){keys[k]=true;});
      Object.keys(keys).forEach(function(key){
        var c=cMap[key],p=pMap[key],current=c?c.value:0,prior=p?p.value:0;
        var assignments=(c&&c.assignments)||(p&&p.assignments)||[];
        var delta=current-prior,expectedDelta=prior*overallRate,surprise=delta-expectedDelta;
        var baseShare=Math.max(Math.abs(prior)/(Math.abs(totalPrior)||1),Math.abs(current)/(Math.abs(totalCurrent)||1));
        var surpriseShare=Math.abs(surprise)/(Math.abs(totalDelta)||1);
        var restPrior=totalPrior-prior,restCurrent=totalCurrent-current;
        var restDelta=restCurrent-restPrior;
        var restRate=Math.abs(restPrior)>Math.max(1e-9,Math.abs(totalPrior)*0.02)?restDelta/restPrior:null;
        var impactRate=restRate==null?null:overallRate-restRate;
        var aligned=impactRate!=null?impactRate*overallRate>0:surprise*totalDelta>0;
        var offset=impactRate!=null?impactRate*overallRate<0:surprise*totalDelta<0;
        var coverage={};
        if(c&&c.coverage)Object.keys(c.coverage).forEach(function(k){coverage[k]=true;});
        if(p&&p.coverage)Object.keys(p.coverage).forEach(function(k){coverage[k]=true;});
        candidates.push({
          aliases:combo.slice(),assignments:assignments,current:current,prior:prior,delta:delta,deltaPct:pctDelta(current,prior),
          expectedDelta:expectedDelta,surprise:surprise,surpriseShare:surpriseShare,baseShare:baseShare,aligned:aligned,offset:offset,
          restCurrent:restCurrent,restPrior:restPrior,restDelta:restDelta,restRate:restRate,impactRate:impactRate,
          excessContributionRate:surprise/totalPrior,coverageKeys:Object.keys(coverage)
        });
      });
    });

    // First require a real deviation from the overall trend, then rank the
    // surviving signals by their leave-one-out impact on the total KPI.
    var minSurprise=Math.max(Math.abs(totalDelta)*0.03,Math.abs(totalPrior)*0.001);
    var minImpact=Math.max(0.0025,Math.abs(overallRate)*0.05); // at least 0.25 pp or 5% of total rate
    var material=candidates.filter(function(c){
      return c.baseShare>=0.005&&Math.abs(c.surprise)>=minSurprise&&c.impactRate!=null&&Math.abs(c.impactRate)>=minImpact;
    });
    var groups=groupIndependentSignals(material,5);
    groups.forEach(function(g){g.kind=signalKind(g.lead,overallRate);g.key=candidateKey(g.lead);});
    result.topSignalGroups=groups;
    result.topSignals=groups.map(function(g){return g.lead;});
    result.independentSignalCount=groups.length;

    var alignedGroups=groups.filter(function(g){return g.lead.aligned;});
    var topAligned=alignedGroups[0]||null;
    var globalTop=groups[0]||null,globalSecond=groups[1]||null;
    var dominant=false;
    if(topAligned){
      var top=topAligned.lead;
      var dominanceRatio=Math.abs(overallRate)>1e-9?Math.abs(top.impactRate)/Math.abs(overallRate):0;
      var impactFloor=Math.max(0.0075,Math.abs(overallRate)*0.35);
      var impactMaterial=Math.abs(top.impactRate)>=impactFloor&&dominanceRatio>=0.45;
      var surpriseMaterial=top.surpriseShare>=0.20;
      var isGlobalTop=!!globalTop&&candidateKey(top)===candidateKey(globalTop.lead);
      var globalGap=globalSecond?candidateImpact(top)-candidateImpact(globalSecond.lead):candidateImpact(top);
      var globallySeparated=!globalSecond||(candidateImpact(top)>=candidateImpact(globalSecond.lead)*1.35&&globalGap>=0.02);
      dominant=impactMaterial&&surpriseMaterial&&isGlobalTop&&globallySeparated;
      result.impactFloor=impactFloor;
      result.dominanceRatio=dominanceRatio;
      result.dominanceGap=globalGap;
    }

    var counterFloor=Math.max(0.005,Math.abs(overallRate)*0.12);
    var trueCounterGroups=groups.filter(function(g){return g.kind==='countertrend'&&candidateImpact(g.lead)>=counterFloor;});
    var positiveImpactGroups=groups.filter(function(g){return signOf(g.lead.impactRate)>0;});
    var negativeImpactGroups=groups.filter(function(g){return signOf(g.lead.impactRate)<0;});
    var trueCounterImpact=trueCounterGroups.slice(0,3).reduce(function(sum,g){return sum+candidateImpact(g.lead);},0);
    var mixedSides=positiveImpactGroups.length>0&&negativeImpactGroups.length>0;
    var mixedImpact=(positiveImpactGroups.slice(0,2).reduce(function(sum,g){return sum+candidateImpact(g.lead);},0)+negativeImpactGroups.slice(0,2).reduce(function(sum,g){return sum+candidateImpact(g.lead);},0));
    var hasPattern=!dominant&&((trueCounterGroups.length&&trueCounterImpact>=Math.max(0.0075,Math.abs(overallRate)*0.12))||(mixedSides&&mixedImpact>=Math.max(0.015,Math.abs(overallRate)*0.30)));

    result.dominant=!!dominant;
    result.countertrend=false;
    result.distributed=!dominant&&!hasPattern;
    result.classification=dominant?'dominant':hasPattern?'mixed':'distributed';
    result.trueCountertrendGroups=trueCounterGroups;
    result.positiveImpactGroups=positiveImpactGroups;
    result.negativeImpactGroups=negativeImpactGroups;
    result.counterImpact=trueCounterImpact;

    var recurringPatterns=recurringGroupPatterns(groups);
    result.recurringPatterns=recurringPatterns;
    result.primaryRecurringPattern=recurringPatterns[0]||null;
    result.recurringMembers=recurringMembers(groups);
    result.primaryRecurring=result.recurringMembers[0]||null;

    var largestRelativeDecline=null;
    groups.forEach(function(g){
      var c=g.lead;
      if(c.deltaPct==null||!isFinite(c.deltaPct)||c.deltaPct>=0)return;
      if(!largestRelativeDecline||c.deltaPct<largestRelativeDecline.lead.deltaPct)largestRelativeDecline=g;
    });
    result.largestRelativeDeclineKey=largestRelativeDecline?candidateKey(largestRelativeDecline.lead):null;

    var editorialGroup=null;
    if(dominant&&topAligned)editorialGroup=topAligned;
    if(!editorialGroup&&trueCounterGroups.length)editorialGroup=trueCounterGroups[0];
    if(!editorialGroup&&result.primaryRecurringPattern)editorialGroup=groups[result.primaryRecurringPattern.groupIndex]||null;
    if(!editorialGroup)editorialGroup=groups[0]||null;
    result.editorialSignalKey=editorialGroup?candidateKey(editorialGroup.lead):null;

    var chosen=editorialGroup?editorialGroup.lead:null;
    if(chosen){
      result.path=chosen.assignments.map(function(a){return {alias:a.alias,id:a.id,label:a.label,dimensionLabel:model.dimLabels[a.alias]||a.alias};});
      result.segmentCurrent=chosen.current;result.segmentPrior=chosen.prior;result.segmentDelta=chosen.delta;
      result.segmentExpectedDelta=chosen.expectedDelta;result.segmentSurprise=chosen.surprise;result.segmentSurpriseShare=chosen.surpriseShare;
      result.segmentDeltaPct=chosen.deltaPct;result.otherCurrent=chosen.restCurrent;result.otherPrior=chosen.restPrior;
      result.otherDelta=chosen.restDelta;result.otherDeltaPct=chosen.restRate;result.topCandidate=chosen;
    }
    result.allCandidates=candidates;result.minSurprise=minSurprise;result.minImpact=minImpact;
    return result;
  }

  function buildModel(widget) {
    var binding=widget.whyData;
    if(!binding||!binding.metadata||(binding.state&&binding.state!=='success'))throw new Error('Bind analyzable SAC data to WHY.');
    var measureAliases=feedValues(binding,'measures');
    var timeAliases=feedValues(binding,'time');
    var dimAliases=feedValues(binding,'dimensions');
    if(!measureAliases.length)throw new Error('Bind at least one KPI measure.');
    if(timeAliases.length!==1)throw new Error('Bind exactly one time dimension.');
    if(!dimAliases.length)throw new Error('Bind at least one analysis dimension.');
    if(!widget._selectedMeasureAlias||measureAliases.indexOf(widget._selectedMeasureAlias)===-1)widget._selectedMeasureAlias=measureAliases[0];

    var measureAlias=widget._selectedMeasureAlias,timeAlias=timeAliases[0],timeLabel=resolveDimLabel(binding,timeAlias),timeHint=inferTemporalGranularity(timeLabel);
    var sourceRows=binding.data||[],entries=[];

    sourceRows.forEach(function(source){
      if(!source)return;
      var value=numericRaw(source[measureAlias]);if(value==null)return;
      var period=parseTemporalCell(source[timeAlias],timeHint);if(!period)return;
      var members={},valid=true;
      for(var d=0;d<dimAliases.length;d++){
        var alias=dimAliases[d],cell=source[alias];
        if(!cell||isAggregateCell(cell)){valid=false;break;}
        // Native BW hierarchy result sets often include parent nodes as already aggregated rows.
        // If SAC explicitly identifies a row as a hierarchy node, keep leaf/detail rows only so WHY does not double-count parent + child values.
        if(looksLikeHierarchyNode(cell)){valid=false;break;}
        var id=cell.id==null?String(cell.label||''):String(cell.id),label=String(cell.label||id).trim();
        if(!id&&!label){valid=false;break;}
        members[alias]={id:id,label:label};
      }
      if(valid)entries.push({value:value,period:period,members:members});
    });

    if(!entries.length)throw new Error('No analyzable detail rows were returned. Use a flat time dimension (hierarchy off) and detail-level analysis dimensions.');
    var periodMap={};entries.forEach(function(e){periodMap[e.period.key]=e.period;});
    var periods=Object.keys(periodMap).map(function(k){return periodMap[k];}).sort(function(a,b){return a.ordinal-b.ordinal;});
    var currentPeriod=periods[periods.length-1],priorPeriod=matchingPriorPeriod(currentPeriod);
    var currentRows,priorRows;
    var cumulative=isCumulativeMeasureLabel(resolveMeasureLabel(binding,measureAlias));
    if(currentPeriod.granularity==='year'){
      currentRows=aggregateEntries(entries,function(e){return e.period.granularity==='year'&&e.period.year===currentPeriod.year;},dimAliases);
      priorRows=aggregateEntries(entries,function(e){return e.period.granularity==='year'&&e.period.year===currentPeriod.year-1;},dimAliases);
    }else if(cumulative){
      currentRows=aggregateEntries(entries,function(e){return e.period.key===currentPeriod.key;},dimAliases);
      priorRows=aggregateEntries(entries,function(e){return priorPeriod&&e.period.key===priorPeriod.key;},dimAliases);
    }else{
      currentRows=aggregateEntries(entries,function(e){return comparablePeriod(e.period,currentPeriod.year,currentPeriod);},dimAliases);
      priorRows=aggregateEntries(entries,function(e){return priorPeriod&&comparablePeriod(e.period,priorPeriod.year,priorPeriod);},dimAliases);
    }
    if(!currentRows.length)throw new Error('No current-period detail rows found.');
    if(!priorRows.length)throw new Error('No matching prior-year detail rows found.');

    var dimLabels={};dimAliases.forEach(function(a){dimLabels[a]=resolveDimLabel(binding,a);});
    return {
      binding:binding,measureAlias:measureAlias,measureAliases:measureAliases.slice(),measureLabel:resolveMeasureLabel(binding,measureAlias),
      measureOptions:measureAliases.map(function(a){return {alias:a,label:resolveMeasureLabel(binding,a)};}),
      timeAlias:timeAlias,currentPeriod:currentPeriod,priorPeriod:priorPeriod,currentScopeLabel:scopeLabel(currentPeriod),priorScopeLabel:scopeLabel(priorPeriod),
      dimAliases:dimAliases.slice(),dimLabels:dimLabels,currentRows:currentRows,priorRows:priorRows,entries:entries.slice(),cumulative:cumulative,timeHint:timeHint,unit:unitFromBinding(binding,measureAlias)
    };
  }

  var STYLES = `
    :host{display:block;width:100%;height:100%;min-width:700px;min-height:430px;box-sizing:border-box;font-family:72,Arial,Helvetica,sans-serif;color:#17324d;--blue:#0a6ed1;--ink:#102a43;--muted:#60788e;--line:#dce7f0;--red:#e71d49;--redSoft:#fff2f5;--green:#0a8f55;--greenSoft:#effaf5;--panel:#f8fbfd;background:transparent}
    *{box-sizing:border-box}button,select{font:inherit}.why{width:100%;height:100%;background:#fff;border:1px solid #dbe6ee;border-radius:18px;box-shadow:0 10px 28px rgba(28,60,86,.09);overflow:hidden;display:grid;grid-template-rows:auto auto minmax(0,1fr)}
    .top{height:68px;padding:0 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e8eff5;background:linear-gradient(180deg,#fff,#fbfdff)}
    .brand{display:flex;align-items:baseline;gap:12px}.brand strong{font-size:29px;letter-spacing:-.04em;color:var(--ink)}.brand span{font-size:13px;color:#6f879b;font-weight:700}.pill{font-size:11px;font-weight:800;color:#46647e;background:#f0f5f9;border:1px solid #dce8f1;padding:7px 10px;border-radius:999px}
    .hero{margin:14px 16px 0;border:1px solid #d7e4ef;border-radius:15px;background:linear-gradient(135deg,#fbfdff 0%,#f6faff 100%);padding:17px 18px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:center}
    .hero-left{display:flex;align-items:center;gap:20px;min-width:0}.measure-block{min-width:180px}.measure-label{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#698398;font-weight:900;margin-bottom:4px}.measure-name{font-size:21px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.measure-select{height:36px;min-width:190px;border:1px solid #cadbe8;border-radius:9px;background:#fff;color:#17324d;font-weight:800;padding:0 32px 0 10px}
    .variance{display:flex;align-items:baseline;gap:12px;border-left:1px solid #dce7f0;padding-left:20px}.delta-big{font-size:38px;line-height:1;font-weight:950;letter-spacing:-.035em}.delta-pct{font-size:21px;font-weight:900}.neg{color:var(--red)}.pos{color:var(--green)}.neutral{color:#60788e}.compare{font-size:12px;color:#71889c;font-weight:700;margin-top:5px}.why-btn{height:52px;min-width:132px;border:0;border-radius:13px;background:linear-gradient(135deg,#0a6ed1,#0854c6);color:#fff;font-weight:950;font-size:18px;letter-spacing:.01em;box-shadow:0 8px 18px rgba(10,110,209,.24);cursor:pointer;transition:transform .18s ease,box-shadow .18s ease}.why-btn:hover{transform:translateY(-1px);box-shadow:0 11px 23px rgba(10,110,209,.28)}.why-btn:active{transform:translateY(0)}
    .body{min-height:0;padding:14px 16px 16px;display:grid;grid-template-columns:minmax(280px,.9fr) minmax(360px,1.1fr);gap:14px}.card{border:1px solid #e0e9f1;border-radius:15px;background:#fff;min-height:0}.path-card{padding:16px;overflow:auto}.eyebrow{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#6b8499;font-weight:950}.section-title{font-size:18px;color:var(--ink);font-weight:950;margin-top:4px}.empty{height:calc(100% - 40px);min-height:220px;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;color:#71899e;padding:24px}.empty-mark{width:58px;height:58px;border-radius:18px;background:#eef6ff;color:var(--blue);display:grid;place-items:center;font-size:28px;font-weight:950;margin-bottom:13px}.empty b{color:#304d66;font-size:16px;margin-bottom:5px}.empty span{max-width:330px;font-size:13px;line-height:1.45}
    .steps{margin-top:14px;display:flex;flex-direction:column;gap:8px}.step{position:relative;border:1px solid #d8e5ef;border-radius:13px;padding:12px 13px;background:#fbfdff;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;opacity:0;transform:translateY(8px);animation:reveal .34s ease forwards}.step.final{border-color:#74aee8;background:linear-gradient(135deg,#f4f9ff,#fff);box-shadow:0 0 0 2px rgba(10,110,209,.07)}.step.final::after{content:'FINDING';position:absolute;top:-9px;right:12px;background:#eaf4ff;border:1px solid #b9d8f6;color:#0a6ed1;border-radius:999px;padding:2px 7px;font-size:9px;font-weight:950;letter-spacing:.08em}.step-dim{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#6f879b;font-weight:900}.step-name{font-size:17px;font-weight:950;color:#17324d;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.step-num{text-align:right}.step-num b{display:block;font-size:18px}.step-num span{font-size:12px;font-weight:800;color:#758da1}.arrow{height:18px;display:grid;place-items:center;color:#7fa8c9;font-size:18px;font-weight:900}.arrow::before{content:'↓'}.why-path{margin-top:16px;padding-top:14px;border-top:1px solid #e6eef4}.why-path-title{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:950;color:#17324d;margin-bottom:9px}.why-path-title i{width:22px;height:22px;border-radius:8px;background:#eef6ff;color:#0a6ed1;display:grid;place-items:center;font-style:normal;font-size:13px}.why-reason{display:grid;grid-template-columns:24px minmax(0,1fr);gap:8px;padding:8px 0;border-top:1px solid #edf2f6}.why-reason:first-of-type{border-top:0}.why-n{width:22px;height:22px;border-radius:50%;background:#edf5fc;color:#0a6ed1;display:grid;place-items:center;font-size:11px;font-weight:950}.why-copy{font-size:12px;line-height:1.42;color:#526d83}.why-copy b{color:#17324d}.why-copy .metric{font-weight:950}.why-summary{margin-top:9px;padding:9px 10px;border-radius:10px;background:#f7fafc;color:#60788e;font-size:11px;line-height:1.4;border:1px solid #e4edf4}
    .result-card{padding:16px;background:linear-gradient(135deg,#f8fbff 0%,#fff 55%);overflow:auto}.finding-status{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:5px 8px;font-size:10px;font-weight:950;letter-spacing:.05em;text-transform:uppercase;margin-bottom:8px}.finding-status.focused{background:#eaf4ff;color:#0a6ed1;border:1px solid #c9e0f6}.finding-status.distributed{background:#f4f6f8;color:#61788d;border:1px solid #dde5eb}.scan{height:100%;min-height:220px;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center}.scanner{width:58px;height:58px;border-radius:50%;border:5px solid #e4eef6;border-top-color:var(--blue);animation:spin .8s linear infinite;margin-bottom:14px}.scan strong{font-size:17px}.scan span{font-size:12px;color:#71899e;margin-top:5px}.finding{animation:fade .28s ease}.finding-label{color:var(--blue);font-size:15px;font-weight:950;margin-bottom:10px}.finding-main{font-size:22px;line-height:1.2;font-weight:950;color:var(--ink)}.finding-value{font-size:40px;line-height:1;margin-top:6px;font-weight:950;letter-spacing:-.035em}.share-line{margin-top:6px;font-size:18px;font-weight:900;color:#17324d}.share-bar{height:9px;background:#e8eef3;border-radius:999px;margin-top:13px;overflow:hidden}.share-bar i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#ff728d,#e71d49);width:0;animation:grow .7s .15s ease forwards}.without{margin-top:14px;padding:11px 13px;border-radius:11px;border:1px solid #cfe8da;background:var(--greenSoft);font-size:14px;color:#305b46;font-weight:800}.without b{color:var(--green);font-size:17px}.evidence{margin-top:14px;border-top:1px solid #e5edf3;padding-top:12px}.evidence-title{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#6b8499;font-weight:950;margin-bottom:7px}.e-row{display:grid;grid-template-columns:minmax(0,1fr) 88px 88px 92px;gap:8px;padding:8px 4px;border-top:1px solid #edf2f6;align-items:center;font-size:12px}.e-row.head{border-top:0;color:#748ca0;font-weight:900}.e-row b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.e-row span{text-align:right}.footnote{margin-top:9px;font-size:11px;color:#7a91a4;line-height:1.35}
    .signal-math{margin-top:15px;border:1px solid #dce8f2;background:linear-gradient(135deg,#f8fbff,#fff);border-radius:13px;padding:13px}.math-title{font-size:12px;text-transform:uppercase;letter-spacing:.07em;color:#6b8499;font-weight:950;margin-bottom:9px}.math-grid{display:grid;grid-template-columns:1fr auto;gap:7px 12px;font-size:12px;align-items:center}.math-grid span{color:#688096}.math-grid b{text-align:right;color:#17324d;font-size:13px}.math-grid .surprise{font-size:16px;color:#0a6ed1}.math-note{margin-top:9px;border-top:1px solid #e4edf4;padding-top:9px;color:#526d83;font-size:12px;line-height:1.45}.path-inline{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:13px}.path-chip{border:1px solid #cfe0ee;background:#f8fbfe;border-radius:11px;padding:8px 10px}.path-chip small{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.07em;color:#7790a4;font-weight:900}.path-chip b{display:block;margin-top:2px;font-size:14px;color:#17324d}.path-sep{color:#7ca4c4;font-weight:950}.signals{margin-top:14px;border-top:1px solid #e5edf3;padding-top:12px}.signals-title{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px}.signals-title b{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#6b8499}.signals-title span{font-size:11px;color:#8095a7}.signal-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;padding:9px 0;border-top:1px solid #edf2f6;align-items:center}.signal-row:first-of-type{border-top:0}.signal-name{font-size:12px;font-weight:900;color:#17324d;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.signal-sub{font-size:10px;color:#7890a3;margin-top:3px}.signal-num{text-align:right}.signal-num b{display:block;font-size:15px;color:#17324d}.signal-num span{display:inline-block;margin-top:2px;padding:2px 6px;border-radius:999px;font-size:9px;font-weight:950;letter-spacing:.03em}.signal-num span.amplify{background:#eaf4ff;color:#0a6ed1}.signal-num span.offset{background:#fff4df;color:#9a6500}.rest{margin-top:13px;padding:10px 12px;border-radius:10px;border:1px solid #dfe8ef;background:#f7f9fb;color:#526d83;font-size:13px;font-weight:800}.rest b{color:#17324d}.surprise-bar{height:9px;background:#e8eef3;border-radius:999px;margin-top:12px;overflow:hidden}.surprise-bar i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#63a8ea,#0a6ed1);width:0;animation:grow .7s .15s ease forwards}.finding-status.focused::before{content:'●';font-size:8px}.finding-status.distributed::before{content:'●';font-size:8px}.trend-line{margin-top:7px;font-size:13px;color:#61798f}.trend-line b{color:#17324d}.dominance{margin-top:7px;font-size:17px;font-weight:950;color:#17324d}.no-cause{margin-top:10px;font-size:13px;color:#60788e;line-height:1.45}

    .impact-hero{margin-top:14px;border:1px solid #cfe1f1;background:linear-gradient(135deg,#eef6ff,#f8fbff);border-radius:13px;padding:12px 14px;display:flex;align-items:baseline;justify-content:space-between;gap:16px}.impact-hero span{font-size:12px;color:#5d7890;font-weight:850}.impact-hero b{font-size:25px;color:#0a6ed1;letter-spacing:-.02em}.impact-hero.quiet{background:#f7f9fb;border-color:#dfe8ef}.impact-hero.quiet b{color:#536f86}.signal-num small{display:block;margin-top:2px;font-size:10px;color:#71899e;font-weight:800}.signal-num span{margin-left:auto}.finding-main{max-width:680px}.why-summary{font-weight:750}.path-sep{font-size:14px}
    .finding-status.countertrend{background:#fff7e6;color:#8a5b00;border:1px solid #f0d9a6}.finding-status.countertrend::before{content:'●';font-size:8px}.signal-row{grid-template-columns:minmax(0,1fr) 118px}.signal-meta{margin-top:4px;font-size:10px;color:#6f879b;font-weight:750}.signal-evidence{margin-top:5px;font-size:10px;line-height:1.35;color:#60788e}.signal-evidence b{color:#46647e}.signal-num b{font-size:16px}.signal-num em{display:block;margin-top:3px;font-size:10px;color:#71899e;font-style:normal;font-weight:800}.pattern-note{margin-top:12px;padding:10px 12px;border-radius:10px;background:#fff9ec;border:1px solid #f0ddb4;color:#6c5525;font-size:12px;line-height:1.4}.pattern-note b{color:#8a5b00}.math-grid .surprise.pos{color:var(--green)}.math-grid .surprise.neg{color:var(--red)}.impact-hero b.pos{color:var(--green)}.impact-hero b.neg{color:var(--red)}
    .signal-block{margin-top:13px}.signal-block-title{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0 5px;border-bottom:1px solid #e7eef4}.signal-block-title b{font-size:12px;text-transform:uppercase;letter-spacing:.075em;color:#5e778d}.signal-block-title span{font-size:10px;color:#8799a9}.signal-row{cursor:pointer;border-radius:10px;padding:10px 8px;margin:2px -8px;transition:background .16s ease,box-shadow .16s ease}.signal-row:hover{background:#f7fbff}.signal-row.selected{background:#f1f7fd;box-shadow:inset 3px 0 0 #0a6ed1}.signal-kind{display:inline-flex;align-items:center;margin-top:5px;padding:2px 6px;border-radius:999px;font-size:9px;font-weight:950;letter-spacing:.03em;background:#f1f4f7;color:#60788e}.signal-kind.countertrend{background:#fff0f3;color:#b42343}.signal-kind.above{background:#eef6ff;color:#0a6ed1}.signal-kind.below{background:#fff7e6;color:#946200}.relative-marker{display:inline-flex;margin-left:6px;padding:2px 6px;border-radius:999px;background:#fff0f3;color:#b42343;font-size:9px;font-weight:950}.recurring-callout{margin-top:11px;padding:10px 12px;border:1px solid #cfe2f5;background:#f5faff;border-radius:11px;color:#45647e;font-size:12px;line-height:1.4}.recurring-callout b{color:#0a6ed1}.recurring-callout strong{color:#17324d}.detail-evidence{margin-top:13px;border-top:1px solid #e7eef4;padding-top:11px}.detail-evidence-title{font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6f879b;font-weight:950;margin-bottom:7px}.detail-evidence-row{font-size:11px;color:#536f86;padding:5px 0;border-top:1px solid #edf2f6}.detail-evidence-row:first-of-type{border-top:0}.detail-evidence-row b{color:#17324d}.detail-recurring{margin-top:10px;padding:9px 10px;border-radius:10px;background:#f5faff;border:1px solid #d6e6f5;font-size:11px;color:#526d83}.detail-recurring b{color:#0a6ed1}.finding-status.mixed{background:#eef6ff;color:#0a6ed1;border:1px solid #c9e0f6}.finding-status.mixed::before{content:'●';font-size:8px}.pattern-summary{margin-top:9px;color:#60788e;font-size:13px;line-height:1.45}.signals-title{margin-bottom:2px}.signal-num small{display:block;margin-top:1px;font-size:9px;color:#7b91a4;font-weight:800}.selected-hint{font-size:10px;color:#8296a7;margin-top:3px}.detail-title-row{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}.detail-kind{font-size:9px;font-weight:950;padding:3px 7px;border-radius:999px;background:#f1f4f7;color:#60788e;text-transform:uppercase;letter-spacing:.04em}.detail-kind.countertrend{background:#fff0f3;color:#b42343}.detail-kind.above{background:#eef6ff;color:#0a6ed1}.detail-kind.below{background:#fff7e6;color:#946200}
    .error{margin:18px;padding:18px;border:1px solid #f0c6cf;background:#fff5f7;border-radius:13px;color:#8b2338}.error b{display:block;margin-bottom:5px}
    @keyframes spin{to{transform:rotate(360deg)}}@keyframes fade{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}@keyframes reveal{to{opacity:1;transform:none}}@keyframes grow{to{width:var(--share)}}
    @media(max-width:850px){:host{min-width:620px}.body{grid-template-columns:1fr}.hero-left{gap:12px}.variance{padding-left:12px}.delta-big{font-size:32px}}
    /* v0.5 answer-first editorial pass */
    .compact-finding .finding-main{font-size:24px;max-width:none;margin-top:2px}
    .compact-finding .pattern-summary{margin-top:5px;font-size:13px;color:#60788e}
    .recurring-inline{margin-top:7px;font-size:12px;color:#526d83}.recurring-inline b{color:#17324d}
    .compact-finding .signals{margin-top:12px;padding-top:9px}
    .compact-finding .signals-title{margin-bottom:2px}.compact-finding .signals-title b{font-size:11px}
    .method-info{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;border:1px solid #d6e3ed;background:#fff;color:#6d8598;font-size:11px;font-weight:950;cursor:help}
    .compact-row{padding:9px 8px;margin:1px -8px}.compact-row .signal-name{font-size:13px}.compact-row .signal-meta{font-size:11px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.compact-row .signal-num{min-width:72px}.compact-row .signal-num b{font-size:18px}
    .compact-math{margin-top:13px;padding:12px}.compact-math .math-grid{gap:8px 14px}.compact-math .math-grid span{font-size:12px}.compact-math .math-grid b{font-size:14px}.compact-math .math-grid .surprise{font-size:16px}
    .detail-evidence{margin-top:11px;padding-top:9px}.detail-evidence-row{display:flex;justify-content:space-between;gap:10px;font-size:11px}.detail-evidence-row span{font-weight:900;white-space:nowrap}
    .detail-recurring{margin-top:9px;padding:8px 9px}.relative-marker{font-size:8px;padding:2px 5px}
    .signal-block{margin-top:10px}.signal-block-title{padding:7px 0 4px}.signal-block-title b{font-size:11px}.signal-block-title span{font-size:10px}
    .path-card,.result-card{padding:15px}.path-inline{margin-top:11px}.path-chip{padding:7px 9px}.path-chip b{font-size:13px}
    .footnote,.selected-hint,.recurring-callout,.signal-kind,.signal-evidence,.math-note,.why-summary{display:none!important}
    @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}.step{opacity:1;transform:none}.share-bar i{width:var(--share)}}
  `;

  function WHYWidget() {
    var self=Reflect.construct(HTMLElement,[],WHYWidget);
    self._selectedMeasureAlias=null;
    self._model=null;
    self._analysis=null;
    self._revealed=false;
    self._scanning=false;
    self._selectedSignalKey=null;
    self._timer=null;
    return self;
  }
  WHYWidget.prototype=Object.create(HTMLElement.prototype);
  WHYWidget.prototype.constructor=WHYWidget;
  Object.setPrototypeOf(WHYWidget,HTMLElement);

  WHYWidget.prototype._ensure=function(){
    if(this.shadowRoot)return;
    this.attachShadow({mode:'open'});
    this.shadowRoot.innerHTML='<style>'+STYLES+'</style><div class="why"><div class="top"><div class="brand"><strong>WHY</strong><span>Variance Signal Analysis</span></div><div class="pill">BW Live · deterministic</div></div><div id="root"></div></div>';
  };

  WHYWidget.prototype._schedule=function(){
    var self=this;if(self._timer)clearTimeout(self._timer);
    self._timer=setTimeout(function(){self._timer=null;self._render();},30);
  };

  WHYWidget.prototype._classForDelta=function(delta){return delta<0?'neg':delta>0?'pos':'neutral';};


  /* v0.6.2 layout correction: symmetric diverging scale, blue-only palette, protected endpoint labels, wider names */
  STYLES += `
    .impact-axis{--label-col:300px;--axis-gap:18px;position:relative}
    .impact-axis::before{left:calc(var(--label-col) + var(--axis-gap) + (100% - var(--label-col) - var(--axis-gap))/2);width:1.5px;background:#0b4f7a;top:0;bottom:0;z-index:3}
    .impact-row{grid-template-columns:var(--label-col) minmax(400px,1fr);gap:var(--axis-gap);min-height:47px}
    .impact-label{min-width:0;padding-left:2px}
    .impact-name-row{display:flex;align-items:center;gap:6px;min-width:0}
    .impact-name-text{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:950;color:#0b2740}
    .impact-name-row .event-marker,.impact-name-row .impact-marker{flex:0 0 auto;margin-left:0}
    .impact-track{height:22px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);position:relative;overflow:visible}
    .track-half{min-width:0;overflow:visible}
    .impact-fill{height:7px;border-radius:1px;z-index:2}
    .impact-fill.drag{background:#0b2740}.impact-fill.raise{background:#0a6ed1}
    .impact-end-value{color:#0b2740}.track-half.right .impact-end-value{color:#0a6ed1}
    .impact-row.selected .impact-name-text,.impact-row.selected .impact-end-value{color:#0057b8}
    .impact-row.selected .impact-fill.drag,.impact-row.selected .impact-fill.raise{background:#0057b8}
    .impact-row:hover{background:#f2f9ff}.impact-row.selected{background:transparent}
    @media(max-width:900px){
      .impact-axis{--label-col:230px;--axis-gap:14px}
      .impact-row{grid-template-columns:var(--label-col) minmax(340px,1fr);gap:var(--axis-gap)}
      .impact-axis::before{left:calc(var(--label-col) + var(--axis-gap) + (100% - var(--label-col) - var(--axis-gap))/2)}
    }
  `;



  /* v0.6.3 precision pass: exact symmetric scale, selection-only accent, wider labels, quieter rows */
  STYLES += `
    .impact-axis{
      --label-col:310px;
      --row-gap:16px;
      --value-gutter:58px;
      position:relative;
    }
    .impact-axis::before{
      left:calc(var(--label-col) + var(--row-gap) + (100% - var(--label-col) - var(--row-gap))/2);
      width:1.5px;
      background:#245b82;
      top:0;
      bottom:0;
      z-index:3;
    }
    .impact-row{
      grid-template-columns:var(--label-col) minmax(420px,1fr);
      gap:var(--row-gap);
      min-height:49px;
      border-top:0;
      background:transparent;
    }
    .impact-row + .impact-row{margin-top:1px}
    .impact-row:hover{background:#f2f9ff}
    .impact-row.selected{background:transparent}

    .impact-label{min-width:0;padding-left:2px}
    .impact-name-row{display:flex;align-items:center;gap:6px;min-width:0}
    .impact-name-text{
      min-width:0;
      max-width:100%;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
      font-size:13px;
      font-weight:950;
      color:#0b2740;
    }
    .event-marker,.impact-marker{flex:0 0 auto;margin-left:0}

    .impact-track{
      height:22px;
      display:grid;
      grid-template-columns:minmax(0,1fr) minmax(0,1fr);
      column-gap:0;
      position:relative;
      overflow:visible;
      min-width:0;
    }
    .track-half{
      position:relative;
      display:grid;
      align-items:center;
      min-width:0;
      overflow:visible;
      padding:0!important;
    }
    .track-half.left{grid-template-columns:var(--value-gutter) minmax(0,1fr)}
    .track-half.right{grid-template-columns:minmax(0,1fr) var(--value-gutter)}

    .impact-fill,
    .impact-fill.drag,
    .impact-fill.raise{
      height:7px;
      border-radius:1px;
      background:#173f5f;
      z-index:2;
      max-width:100%;
    }
    .track-half.left .impact-fill{
      grid-column:2;
      grid-row:1;
      justify-self:end;
      transform-origin:right center;
    }
    .track-half.right .impact-fill{
      grid-column:1;
      grid-row:1;
      justify-self:start;
      transform-origin:left center;
    }
    .impact-end-value{
      position:static;
      transform:none;
      top:auto;
      left:auto;
      right:auto;
      font-size:13px;
      font-weight:950;
      color:#173f5f;
      white-space:nowrap;
      z-index:4;
    }
    .track-half.left .impact-end-value{
      grid-column:1;
      grid-row:1;
      justify-self:end;
      margin-right:8px;
    }
    .track-half.right .impact-end-value{
      grid-column:2;
      grid-row:1;
      justify-self:start;
      margin-left:8px;
    }

    .impact-row.selected .impact-name-text,
    .impact-row.selected .impact-end-value{color:#0a6ed1}
    .impact-row.selected .impact-fill,
    .impact-row.selected .impact-fill.drag,
    .impact-row.selected .impact-fill.raise{background:#0a6ed1}

    @media(max-width:1050px){
      .impact-axis{--label-col:260px;--row-gap:14px;--value-gutter:54px}
      .impact-row{grid-template-columns:var(--label-col) minmax(340px,1fr);gap:var(--row-gap)}
      .impact-axis::before{left:calc(var(--label-col) + var(--row-gap) + (100% - var(--label-col) - var(--row-gap))/2)}
    }
  `;

  WHYWidget.prototype._heroHtml=function(model,analysis){
    var cls=this._classForDelta(analysis.totalDelta),measureControl='';
    if(model.measureOptions.length>1){
      measureControl='<select id="why-measure" class="measure-select">'+model.measureOptions.map(function(o){return '<option value="'+esc(o.alias)+'"'+(o.alias===model.measureAlias?' selected':'')+'>'+esc(o.label)+'</option>';}).join('')+'</select>';
    }else measureControl='<div class="measure-name">'+esc(model.measureLabel)+'</div>';
    return '<div class="hero"><div class="hero-left"><div class="measure-block"><div class="measure-label">Measure</div>'+measureControl+'<div class="compare">'+esc(model.currentScopeLabel)+' vs '+esc(model.priorScopeLabel)+'</div></div><div class="variance"><div class="delta-big '+cls+'">'+esc(formatDelta(analysis.totalDelta,model.unit))+'</div><div><div class="delta-pct '+cls+'">'+esc(formatPctRatio(analysis.totalDeltaPct))+'</div><div class="compare">Total variance</div></div></div></div><button id="why-run" class="why-btn">WHY?</button></div>';
  };

  WHYWidget.prototype._signalKindLabel=function(kind){
    if(kind==='countertrend')return 'Opposite direction';
    if(kind==='above')return 'Above overall trend';
    if(kind==='below')return 'Below overall trend';
    if(kind==='near')return 'Near overall trend';
    return 'Material signal';
  };

  WHYWidget.prototype._selectedGroup=function(analysis){
    var key=this._selectedSignalKey||analysis.editorialSignalKey;
    return groupForKey(analysis.topSignalGroups||[],key)||(analysis.topSignalGroups&&analysis.topSignalGroups[0])||null;
  };

  WHYWidget.prototype._pathHtml=function(model,analysis){
    if(!this._revealed){
      return '<div class="eyebrow">Signal detail</div><div class="section-title">Select a finding to inspect</div><div class="empty"><div class="empty-mark">?</div><b>'+analysis.dimensionCount+' dimensions ready</b><span>Press WHY? to scan the bound BW Live result set.</span></div>';
    }
    var group=this._selectedGroup(analysis);
    if(!group){
      return '<div class="eyebrow">Signal detail</div><div class="section-title">No material signal</div><div class="empty"><div class="empty-mark">≈</div><b>Broadly distributed</b><span>No single analyzed segment materially changes the total KPI.</span></div>';
    }
    var c=group.lead,unit=model.unit,kind=group.kind||signalKind(c,analysis.overallRate);
    var chips=c.assignments.map(function(a,i){return (i?'<span class="path-sep">×</span>':'')+'<div class="path-chip"><small>'+esc(model.dimLabels[a.alias]||a.alias)+'</small><b>'+esc(a.label)+'</b></div>';}).join('');
    var impactText=c.impactRate==null?'—':formatPp(c.impactRate);
    var surpriseCls=this._classForDelta(c.surprise),impactCls=this._classForDelta(c.impactRate||0),actualCls=this._classForDelta(c.delta||0);
    var evidence='';
    if(group.evidence&&group.evidence.length){
      evidence='<div class="detail-evidence"><div class="detail-evidence-title">Supporting cuts</div>'+group.evidence.slice(0,4).map(function(e){
        var label=e.assignments.map(function(a){return a.label;}).join(' × ');
        return '<div class="detail-evidence-row"><b>'+esc(label)+'</b><span>'+esc(formatPp(e.impactRate))+'</span></div>';
      }).join('')+'</div>';
    }
    var recurring='';
    var common=groupCommonMembers(group);
    if(common.length&&(group.evidence||[]).length>=2){
      recurring='<div class="detail-recurring"><b>'+esc(common[0].label)+'</b> recurs across '+common[0].count+' supporting cuts.</div>';
    }
    return '<div class="eyebrow">Signal detail</div><div class="detail-title-row"><div class="section-title">'+esc(c.assignments.map(function(a){return a.label;}).join(' × '))+'</div><span class="detail-kind '+esc(kind)+'">'+esc(this._signalKindLabel(kind))+'</span></div><div class="path-inline">'+chips+'</div><div class="signal-math compact-math"><div class="math-grid"><span>Expected change</span><b>'+esc(formatDelta(c.expectedDelta,unit))+'</b><span>Actual change</span><b class="'+actualCls+'">'+esc(formatDelta(c.delta,unit))+'</b><span>Deviation</span><b class="surprise '+surpriseCls+'">'+esc(formatDelta(c.surprise,unit))+'</b><span>Impact</span><b class="'+impactCls+'">'+esc(impactText)+'</b></div></div>'+recurring+evidence;
  };

  WHYWidget.prototype._resultHtml=function(model,analysis){
    if(this._scanning)return '<div class="scan"><div class="scanner"></div><strong>Scanning '+analysis.dimensionCount+' dimensions…</strong></div>';
    if(!this._revealed)return '<div class="empty"><div class="empty-mark">→</div><b>'+analysis.dimensionCount+' dimensions ready</b><span>Press WHY?</span></div>';
    var unit=model.unit;
    if(!analysis.topSignalGroups||!analysis.topSignalGroups.length){
      return '<div class="finding compact-finding"><div class="finding-main">No material signal stands out.</div><div class="pattern-summary">Movement is broadly distributed.</div></div>';
    }

    var groups=analysis.topSignalGroups,selectedKey=this._selectedSignalKey||analysis.editorialSignalKey;
    var positive=groups.filter(function(g){return signOf(g.lead.impactRate)>0;});
    var negative=groups.filter(function(g){return signOf(g.lead.impactRate)<0;});
    var headline,summary='';
    if(analysis.classification==='dominant'){
      var dg=groupForKey(groups,analysis.editorialSignalKey)||groups[0],dn=dg.lead.assignments.map(function(a){return a.label;}).join(' × ');
      headline=dn+' has the strongest impact.';
      summary='Changes the total rate by '+formatPp(dg.lead.impactRate)+'.';
    }else if(analysis.classification==='mixed'){
      headline='No dominant driver. '+negative.length+' signal'+(negative.length===1?' lowers':'s lower')+' the total rate, '+positive.length+' raise'+(positive.length===1?'s':'')+' it.';
      var tc=(analysis.trueCountertrendGroups||[]).length;
      summary=tc?tc+' move'+(tc===1?'s':'')+' in the opposite direction to the overall trend.':'Material performance differences remain.';
    }else{
      headline='No dominant driver.';
      summary='Movement is broadly distributed.';
    }

    function rowHtml(group,self){
      var c=group.lead,key=candidateKey(c),name=c.assignments.map(function(a){return a.label;}).join(' × ');
      var imp=c.impactRate==null?'—':formatPp(c.impactRate),impactCls=c.impactRate<0?'neg':c.impactRate>0?'pos':'neutral',growthCls=c.deltaPct<0?'neg':c.deltaPct>0?'pos':'neutral';
      var kind=group.kind||signalKind(c,analysis.overallRate),kindLabel=self._signalKindLabel(kind);
      var marker=(analysis.largestRelativeDeclineKey===key)?'<span class="relative-marker">Largest relative decline</span>':'';
      var kindText=kind==='countertrend'?' · Opposite direction':kind==='above'?' · Above trend':kind==='below'?' · Below trend':'';
      return '<div class="signal-row compact-row '+(key===selectedKey?'selected':'')+'" data-signal-key="'+esc(key)+'"><div><div class="signal-name">'+esc(name)+marker+'</div><div class="signal-meta"><span class="'+growthCls+'">'+esc(formatPctRatio(c.deltaPct))+'</span> vs '+esc(formatPctRatio(analysis.overallRate))+' overall'+esc(kindText)+'</div></div><div class="signal-num"><b class="'+impactCls+'">'+esc(imp)+'</b></div></div>';
    }

    var blocks='';
    if(positive.length)blocks+='<div class="signal-block"><div class="signal-block-title"><b>Raises total rate</b><span>'+positive.length+'</span></div>'+positive.map(function(g){return rowHtml(g,this);},this).join('')+'</div>';
    if(negative.length)blocks+='<div class="signal-block"><div class="signal-block-title"><b>Lowers total rate</b><span>'+negative.length+'</span></div>'+negative.map(function(g){return rowHtml(g,this);},this).join('')+'</div>';

    var recurring='';
    if(analysis.primaryRecurringPattern){
      var rp=analysis.primaryRecurringPattern;
      recurring='<div class="recurring-inline"><b>'+esc(rp.member.label)+'</b> recurs across '+rp.count+' supporting cuts.</div>';
    }
    var info='Expected change = prior value × overall growth. Impact = difference between total growth and growth without the segment. Overlapping cuts are grouped. WHY reports signals, not causality.';
    return '<div class="finding compact-finding"><div class="finding-main">'+esc(headline)+'</div><div class="pattern-summary">'+esc(summary)+'</div>'+recurring+'<div class="signals"><div class="signals-title"><b>Findings</b><span class="method-info" title="'+esc(info)+'">ⓘ</span></div>'+blocks+'</div></div>';
  };

  WHYWidget.prototype._render=function(){
    this._ensure();var root=this.shadowRoot.querySelector('#root');if(!root)return;
    try{
      this._model=buildModel(this);
      var raw=strongestPath(this._model,3);raw.dimensionCount=this._model.dimAliases.length;this._analysis=raw;
      root.innerHTML=this._heroHtml(this._model,raw)+'<div class="body"><section class="card path-card">'+this._pathHtml(this._model,raw)+'</section><section class="card result-card">'+this._resultHtml(this._model,raw)+'</section></div>';
      this._bind();
    }catch(err){
      this._model=null;this._analysis=null;
      root.innerHTML='<div class="error"><b>WHY is waiting for analyzable data.</b>'+esc(err&&err.message?err.message:String(err))+'</div>';
    }
  };

  WHYWidget.prototype._bind=function(){
    var self=this,run=self.shadowRoot.querySelector('#why-run'),sel=self.shadowRoot.querySelector('#why-measure');
    if(sel)sel.addEventListener('change',function(){self._selectedMeasureAlias=sel.value;self._selectedSignalKey=null;self._revealed=false;self._scanning=false;self._schedule();});
    if(run)run.addEventListener('click',function(){
      if(self._scanning)return;
      self._selectedSignalKey=null;
      self._scanning=true;self._revealed=false;self._render();
      setTimeout(function(){self._scanning=false;self._revealed=true;self._render();},650);
    });
    Array.prototype.forEach.call(self.shadowRoot.querySelectorAll('[data-signal-key]'),function(row){
      row.addEventListener('click',function(){self._selectedSignalKey=row.getAttribute('data-signal-key');self._render();});
    });
  };



  /* v0.7 hero signal identity: one strong answer, one real timeline, supporting evidence beneath */
  STYLES += `
    :host{--why-ink:#071f38;--why-navy:#062b52;--why-navy2:#031c37;--why-blue:#0a6ed1;--why-cyan:#23a8ff;--why-sky:#82ccff;--why-pale:#eef8ff;--why-line:#cce9fb;--why-soft:#f7fcff}
    .why{border-color:#bfe2f7;border-radius:18px;box-shadow:0 16px 42px rgba(0,72,128,.13);background:#fff}
    .top{height:64px;padding:0 22px;border-bottom:1px solid var(--why-line);background:#fff}
    .brand strong{font-size:30px;color:var(--why-ink)}.brand span{color:#2b6d99}.pill{color:#155f91;background:#f0f9ff;border-color:#bfe4fa}

    .hero{margin:0 22px;padding:17px 0 16px;border:0;border-radius:0;border-bottom:1px solid var(--why-line);background:#fff}
    .hero-left{gap:22px}.measure-label,.compare{color:#376f96}.measure-name{color:var(--why-ink)}.variance{border-left-color:#bfe2f7}
    .delta-big,.delta-pct,.delta-big.pos,.delta-pct.pos,.delta-big.neg,.delta-pct.neg{color:var(--why-ink)}
    .why-btn{height:50px;min-width:128px;border-radius:13px;background:linear-gradient(135deg,#1494ef 0%,#0865cf 60%,#0754bd 100%);box-shadow:0 10px 26px rgba(10,110,209,.27)}
    .why-btn:hover{box-shadow:0 14px 32px rgba(10,110,209,.34)}

    .why-stage{min-height:420px;padding:24px 28px 30px;background:#fff}
    .idle-stage,.scan-stage{display:grid;place-items:center;text-align:center;min-height:390px}
    .idle-orbit{width:98px;height:98px;border-radius:50%;position:relative;display:grid;place-items:center;color:var(--why-blue);font-size:38px;font-weight:950;background:radial-gradient(circle,#fff 0 36%,#dff3ff 37% 39%,#fff 40% 100%)}
    .idle-orbit::before,.idle-orbit::after{content:'';position:absolute;inset:9px;border:1px solid #73c4f6;border-radius:50%}.idle-orbit::after{inset:-7px;border-color:#c4e9fb}
    .idle-title{margin-top:18px;font-size:22px;font-weight:950;color:var(--why-ink)}.idle-copy{margin-top:6px;font-size:12px;color:#34709a}
    .scan-core{width:min(660px,85%)}.scan-total{font-size:42px;line-height:1;font-weight:950;color:var(--why-ink);letter-spacing:-.04em}.scan-caption{margin-top:8px;font-size:12px;color:#34709a;font-weight:800}
    .scan-line{height:3px;margin:22px auto 14px;background:#dff3ff;position:relative;overflow:hidden;border-radius:99px}.scan-line::after{content:'';position:absolute;inset:0 auto 0 -24%;width:24%;background:linear-gradient(90deg,transparent,#0a6ed1,#32b7ff,transparent);animation:whyScan 1s linear infinite}
    .scan-dims{display:flex;justify-content:center;gap:8px;flex-wrap:wrap}.scan-dim{padding:5px 9px;border:1px solid #bde4fa;border-radius:999px;background:#f4fbff;color:#1f6795;font-size:10px;font-weight:900;opacity:0;animation:whyDim .26s ease forwards}

    .answer-strip{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:14px}
    .answer-text{font-size:13px;color:#2d6b96;font-weight:800}.answer-text b{font-size:15px;color:var(--why-ink)}
    .method-info{width:21px;height:21px;border:1px solid #8dcdf2;color:#15689c;background:#fff;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:950;cursor:help;flex:0 0 auto}

    .hero-signal{position:relative;overflow:hidden;border-radius:20px;padding:24px 26px 20px;background:linear-gradient(135deg,#083f78 0%,#062f5e 46%,#041f3f 100%);color:#fff;box-shadow:0 18px 38px rgba(2,45,83,.22);isolation:isolate}
    .hero-signal::before{content:'';position:absolute;inset:-35% -20% auto 38%;height:280px;background:radial-gradient(circle,rgba(36,170,255,.38) 0%,rgba(36,170,255,.08) 38%,transparent 68%);z-index:-1}
    .hero-signal::after{content:'';position:absolute;width:220px;height:220px;left:42%;top:18%;border:1px solid rgba(86,194,255,.30);border-radius:50%;opacity:0;pointer-events:none}
    .reveal-burst .hero-signal{animation:heroArrive .58s cubic-bezier(.18,.8,.24,1) both}.reveal-burst .hero-signal::after{animation:heroBurst .75s ease-out both}
    .hero-signal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px}
    .signal-kicker{font-size:10px;text-transform:uppercase;letter-spacing:.11em;font-weight:950;color:#82d1ff}.signal-title{margin-top:6px;font-size:30px;line-height:1.08;font-weight:950;letter-spacing:-.025em;color:#fff;max-width:760px}
    .event-marker{display:inline-flex;align-items:center;padding:4px 8px;border:1px solid #75c7f7;border-radius:999px;background:#0b4f86;color:#d7f2ff;font-size:9px;font-weight:950;letter-spacing:.045em;text-transform:uppercase;white-space:nowrap}
    .hero-signal-main{display:grid;grid-template-columns:minmax(210px,.52fr) minmax(420px,1.48fr);gap:28px;margin-top:18px;align-items:stretch}
    .hero-impact{display:flex;flex-direction:column;justify-content:flex-start;min-width:0}.hero-impact-value{font-size:58px;line-height:.98;font-weight:950;letter-spacing:-.045em;color:#fff}.hero-impact-label{margin-top:6px;font-size:11px;color:#83d0ff;font-weight:850;text-transform:uppercase;letter-spacing:.08em}
    .hero-context{margin-top:15px;font-size:14px;line-height:1.45;color:#e4f5ff;font-weight:800}.hero-context small{display:block;margin-top:4px;font-size:11px;color:#8fd5ff;font-weight:750}
    .hero-metrics{margin-top:18px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.hero-metric{border-top:1px solid rgba(133,210,255,.28);padding-top:9px}.hero-metric small{display:block;font-size:8px;color:#7fc9f5;text-transform:uppercase;letter-spacing:.10em;font-weight:950}.hero-metric b{display:block;margin-top:4px;font-size:16px;color:#fff}

    .timeline{min-width:0;display:flex;flex-direction:column}.timeline-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:7px}.timeline-title{font-size:11px;font-weight:950;color:#dff4ff}.timeline-legend{display:flex;gap:13px;font-size:9px;color:#8fd5ff;font-weight:800}.legend-item{display:flex;align-items:center;gap:5px}.legend-swatch{width:16px;height:2px;background:#23a8ff}.legend-swatch.prior{background:#82ccff;opacity:.78;border-top:1px dashed #82ccff;height:0}
    .timeline-svg{display:block;width:100%;height:168px;overflow:visible}.timeline-grid{stroke:#1c5e91;stroke-width:1;opacity:.62}.timeline-zero{stroke:#3e8fc5;stroke-width:1;opacity:.8}.timeline-prior{fill:none;stroke:#82ccff;stroke-width:2.1;stroke-dasharray:5 5;opacity:.78}.timeline-current{fill:none;stroke:#23a8ff;stroke-width:3}.timeline-dot{fill:#23a8ff;stroke:#dff5ff;stroke-width:1.4}.timeline-prior-dot{fill:#82ccff;opacity:.72}.reveal-burst .timeline-current{stroke-dasharray:1;stroke-dashoffset:1;animation:lineDraw .82s .16s ease-out forwards}.reveal-burst .timeline-dot{opacity:0;animation:dotIn .2s .65s ease forwards}.timeline-x{font-size:9px;fill:#8bcff6;font-weight:800}.timeline-empty{height:168px;display:grid;place-items:center;border:1px solid rgba(117,199,247,.22);border-radius:12px;color:#8fd5ff;font-size:11px;font-weight:800}
    .hero-confirm{margin-top:13px;font-size:10px;color:#8fd5ff;font-weight:800}.hero-confirm b{color:#fff}

    .support-wrap{margin-top:20px}.support-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:7px}.support-head b{font-size:12px;color:var(--why-ink);text-transform:uppercase;letter-spacing:.09em}.support-head span{font-size:10px;color:#2d6b96}
    .support-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 12px}
    .support-row{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center;padding:10px 12px;border:1px solid #cae9fa;border-radius:12px;background:#fff;cursor:pointer;min-height:58px;transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease}
    .support-row:hover{transform:translateY(-1px);border-color:#6fbceb;box-shadow:0 8px 18px rgba(10,96,157,.10)}.support-row.selected{border-color:#0a6ed1;box-shadow:inset 3px 0 0 #0a6ed1}
    .support-name-row{display:flex;align-items:center;gap:6px;min-width:0}.support-name{font-size:12px;font-weight:950;color:var(--why-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.support-context{margin-top:3px;font-size:9px;color:#3e779c;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .support-impact{font-size:18px;font-weight:950;color:var(--why-ink);white-space:nowrap}.support-bar{height:4px;background:#dff3ff;border-radius:99px;margin-top:6px;overflow:hidden}.support-bar i{display:block;height:100%;background:#0b4f7a;border-radius:99px}.support-row:hover .support-bar i,.support-row.selected .support-bar i{background:#0a6ed1}
    .support-event{display:inline-flex;padding:2px 5px;border:1px solid #86cdf4;border-radius:999px;color:#146a9f;background:#f1faff;font-size:7px;font-weight:950;letter-spacing:.04em;text-transform:uppercase;flex:0 0 auto}
    .reveal-burst .support-row{opacity:0;transform:translateY(7px);animation:supportIn .32s ease forwards;animation-delay:var(--delay,0ms)}

    .near-tie-note{margin-top:9px;font-size:10px;color:#39769c;font-weight:800}

    @keyframes whyScan{to{left:100%}}@keyframes whyDim{to{opacity:1}}
    @keyframes heroArrive{from{opacity:0;transform:translateY(10px) scale(.992)}to{opacity:1;transform:none}}
    @keyframes heroBurst{0%{opacity:.0;transform:scale(.2)}35%{opacity:.8}100%{opacity:0;transform:scale(2.15)}}
    @keyframes lineDraw{to{stroke-dashoffset:0}}@keyframes dotIn{to{opacity:1}}@keyframes supportIn{to{opacity:1;transform:none}}
    @media(max-width:1050px){.hero-signal-main{grid-template-columns:1fr}.support-list{grid-template-columns:1fr}.signal-title{font-size:26px}.hero-impact-value{font-size:50px}}
    @media(prefers-reduced-motion:reduce){.reveal-burst .hero-signal,.reveal-burst .hero-signal::after,.reveal-burst .timeline-current,.reveal-burst .timeline-dot,.reveal-burst .support-row,.scan-line::after,.scan-dim{animation:none!important;opacity:1!important;transform:none!important;stroke-dashoffset:0!important}}
  `;

  function entryMatchesCandidate(entry,candidate){
    if(!entry||!candidate||!candidate.assignments)return false;
    return candidate.assignments.every(function(a){
      var m=entry.members&&entry.members[a.alias];
      return m&&String(m.id)===String(a.id);
    });
  }

  function trendPosition(period){
    if(!period)return null;
    if(period.granularity==='month')return period.month;
    if(period.granularity==='quarter')return period.quarter;
    if(period.granularity==='week')return period.week;
    if(period.granularity==='day')return (period.month||0)*100+(period.day||0);
    return period.year;
  }

  function trendLabel(period){
    if(!period)return '';
    if(period.granularity==='month')return monthShort(period.month);
    if(period.granularity==='quarter')return 'Q'+period.quarter;
    if(period.granularity==='week')return 'W'+period.week;
    if(period.granularity==='day')return period.day===1?monthShort(period.month):(monthShort(period.month)+' '+period.day);
    return String(period.year);
  }

  function signalTrend(model,candidate){
    if(!model||!candidate||!model.entries||!model.currentPeriod)return null;
    var currentYear=model.currentPeriod.year,priorYear=currentYear-1,gran=model.currentPeriod.granularity;
    if(gran==='year')return null;
    var global={},cur={},pri={};
    model.entries.forEach(function(e){
      if(!e||e.period.granularity!==gran)return;
      if(e.period.year!==currentYear&&e.period.year!==priorYear)return;
      if(e.period.year===currentYear&&!comparablePeriod(e.period,currentYear,model.currentPeriod))return;
      if(e.period.year===priorYear&&!comparablePeriod(e.period,priorYear,matchingPriorPeriod(model.currentPeriod)))return;
      var pos=trendPosition(e.period);if(pos==null)return;
      if(!global[pos])global[pos]={period:e.period,pos:pos};
      if(!entryMatchesCandidate(e,candidate))return;
      var map=e.period.year===currentYear?cur:pri;
      map[pos]=(map[pos]||0)+e.value;
    });
    var positions=Object.keys(global).map(Number).sort(function(a,b){return a-b;});
    if(!positions.length)return null;
    // Keep the chart readable for daily/weekly queries while preserving endpoints.
    if(positions.length>12){
      var sampled=[],last=-1;
      for(var i=0;i<12;i++){
        var idx=Math.round(i*(positions.length-1)/11);
        if(idx!==last){sampled.push(positions[idx]);last=idx;}
      }
      positions=sampled;
    }
    return positions.map(function(pos){return {label:trendLabel(global[pos].period),current:cur[pos]||0,prior:pri[pos]||0,pos:pos};});
  }

  function pointsForSeries(series,key,width,height,pad){
    if(!series||!series.length)return {points:'',dots:'',zeroY:height-pad};
    var vals=[];series.forEach(function(d){vals.push(Number(d.current)||0,Number(d.prior)||0);});
    var min=Math.min.apply(Math,[0].concat(vals)),max=Math.max.apply(Math,[0].concat(vals));
    if(Math.abs(max-min)<1e-9){max=min+1;}
    var span=max-min,xSpan=Math.max(1,series.length-1),pts=[],dots=[];
    series.forEach(function(d,i){
      var x=pad+(width-2*pad)*(i/xSpan),v=Number(d[key])||0,y=pad+(height-2*pad)*(1-(v-min)/span);
      pts.push(x.toFixed(1)+','+y.toFixed(1));dots.push({x:x,y:y});
    });
    var zeroY=pad+(height-2*pad)*(1-(0-min)/span);
    return {points:pts.join(' '),dots:dots,zeroY:zeroY,min:min,max:max};
  }

  WHYWidget.prototype._heroHtml=function(model,analysis){
    var measureControl='';
    if(model.measureOptions.length>1){
      measureControl='<select id="why-measure" class="measure-select">'+model.measureOptions.map(function(o){return '<option value="'+esc(o.alias)+'"'+(o.alias===model.measureAlias?' selected':'')+'>'+esc(o.label)+'</option>';}).join('')+'</select>';
    }else measureControl='<div class="measure-name">'+esc(model.measureLabel)+'</div>';
    return '<div class="hero"><div class="hero-left"><div class="measure-block"><div class="measure-label">Measure</div>'+measureControl+'<div class="compare">'+esc(model.currentScopeLabel)+' vs '+esc(model.priorScopeLabel)+'</div></div><div class="variance"><div class="delta-big">'+esc(formatDelta(analysis.totalDelta,model.unit))+'</div><div><div class="delta-pct">'+esc(formatPctRatio(analysis.totalDeltaPct))+'</div><div class="compare">Total variance</div></div></div></div><button id="why-run" class="why-btn">WHY?</button></div>';
  };

  WHYWidget.prototype._selectedGroup=function(analysis){
    var key=this._selectedSignalKey||analysis.editorialSignalKey;
    return groupForKey(analysis.topSignalGroups||[],key)||(analysis.topSignalGroups&&analysis.topSignalGroups[0])||null;
  };

  WHYWidget.prototype._answerText=function(analysis){
    var groups=analysis.topSignalGroups||[];
    if(!groups.length)return '<b>No material signal stands out.</b> Movement is broadly distributed.';
    if(analysis.classification==='dominant')return '<b>One signal stands out.</b> The strongest impact is materially separated from the rest.';
    if(analysis.classification==='mixed')return '<b>No dominant driver.</b> Several material signals move the total rate.';
    return '<b>No dominant driver.</b> Movement is broadly distributed.';
  };

  WHYWidget.prototype._timelineHtml=function(model,candidate){
    var series=signalTrend(model,candidate);
    if(!series||series.length<2)return '<div class="timeline"><div class="timeline-head"><div class="timeline-title">Period view</div></div><div class="timeline-empty">No period-level trend available for this signal.</div></div>';
    var W=720,H=168,P=14,cur=pointsForSeries(series,'current',W,H,P),pri=pointsForSeries(series,'prior',W,H,P);
    var labels=series.map(function(d,i){var x=P+(W-2*P)*(i/Math.max(1,series.length-1));return '<text class="timeline-x" x="'+x.toFixed(1)+'" y="164" text-anchor="middle">'+esc(d.label)+'</text>';}).join('');
    var curDots=cur.dots.map(function(p){return '<circle class="timeline-dot" cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="3.4"></circle>';}).join('');
    var priorDots=pri.dots.map(function(p){return '<circle class="timeline-prior-dot" cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="2.2"></circle>';}).join('');
    var grid=[.25,.5,.75].map(function(r){var y=(P+(H-2*P)*r).toFixed(1);return '<line class="timeline-grid" x1="'+P+'" y1="'+y+'" x2="'+(W-P)+'" y2="'+y+'"></line>';}).join('');
    return '<div class="timeline"><div class="timeline-head"><div class="timeline-title">'+esc(model.measureLabel)+' by period</div><div class="timeline-legend"><span class="legend-item"><i class="legend-swatch prior"></i>Prior</span><span class="legend-item"><i class="legend-swatch"></i>Current</span></div></div><svg class="timeline-svg" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none">'+grid+'<line class="timeline-zero" x1="'+P+'" y1="'+cur.zeroY.toFixed(1)+'" x2="'+(W-P)+'" y2="'+cur.zeroY.toFixed(1)+'"></line><polyline class="timeline-prior" pathLength="1" points="'+pri.points+'"></polyline>'+priorDots+'<polyline class="timeline-current" pathLength="1" points="'+cur.points+'"></polyline>'+curDots+labels+'</svg></div>';
  };

  WHYWidget.prototype._heroSignalHtml=function(model,analysis,group){
    if(!group)return '<div class="hero-signal"><div class="signal-title">No material signal stands out.</div></div>';
    var c=group.lead,key=candidateKey(c),life=lifecycleKind(c),name=c.assignments.map(function(a){return a.label;}).join(' × ');
    var kicker=analysis.classification==='dominant'&&key===analysis.editorialSignalKey?'Dominant signal':'Strongest signal';
    var lifeHtml=life?'<span class="event-marker" title="'+esc(lifecycleHelp(life))+'">'+esc(lifecycleLabel(life))+'</span>':'';
    var context=life?(formatValue(c.prior,model.unit)+' → '+formatValue(c.current,model.unit)):(formatPctRatio(c.deltaPct)+' vs '+formatPctRatio(analysis.overallRate)+' overall');
    var common=groupCommonMembers(group),evidenceCount=(group.evidence||[]).length,confirm='';
    if(evidenceCount){
      if(common.length)confirm='<div class="hero-confirm"><b>'+esc(common[0].label)+'</b> confirms the same movement across '+evidenceCount+' supporting cut'+(evidenceCount===1?'':'s')+'.</div>';
      else confirm='<div class="hero-confirm">Same movement confirmed across <b>'+evidenceCount+'</b> supporting cut'+(evidenceCount===1?'':'s')+'.</div>';
    }
    return '<div class="hero-signal"><div class="hero-signal-head"><div><div class="signal-kicker">'+esc(kicker)+'</div><div class="signal-title">'+esc(name)+'</div></div>'+lifeHtml+'</div><div class="hero-signal-main"><div class="hero-impact"><div class="hero-impact-value">'+esc(formatPp(c.impactRate))+'</div><div class="hero-impact-label">Impact on total rate</div><div class="hero-context">'+esc(context)+'<small>'+esc(this._signalKindLabel(group.kind||signalKind(c,analysis.overallRate)))+'</small></div><div class="hero-metrics"><div class="hero-metric"><small>Expected</small><b>'+esc(formatDelta(c.expectedDelta,model.unit))+'</b></div><div class="hero-metric"><small>Actual</small><b>'+esc(formatDelta(c.delta,model.unit))+'</b></div><div class="hero-metric"><small>Deviation</small><b>'+esc(formatDelta(c.surprise,model.unit))+'</b></div></div>'+confirm+'</div>'+this._timelineHtml(model,c)+'</div></div>';
  };

  WHYWidget.prototype._supportHtml=function(model,analysis,selectedGroup){
    var groups=(analysis.topSignalGroups||[]).slice(),selectedKey=selectedGroup?candidateKey(selectedGroup.lead):'',maxImpact=groups.reduce(function(m,g){return Math.max(m,candidateImpact(g.lead));},0)||1;
    var others=groups.filter(function(g){return candidateKey(g.lead)!==selectedKey;});
    var rows=others.map(function(group,index){
      var c=group.lead,key=candidateKey(c),name=c.assignments.map(function(a){return a.label;}).join(' × '),life=lifecycleKind(c),ctx=life?(formatValue(c.prior,model.unit)+' → '+formatValue(c.current,model.unit)):(formatPctRatio(c.deltaPct)+' vs '+formatPctRatio(analysis.overallRate)+' overall'),w=Math.max(5,Math.min(100,candidateImpact(c)/maxImpact*100));
      var event=life?'<span class="support-event">'+esc(lifecycleLabel(life))+'</span>':'';
      return '<div class="support-row" data-signal-key="'+esc(key)+'" style="--delay:'+(140+index*70)+'ms"><div><div class="support-name-row"><span class="support-name" title="'+esc(name)+'">'+esc(name)+'</span>'+event+'</div><div class="support-context">'+esc(ctx)+'</div><div class="support-bar"><i style="width:'+w.toFixed(1)+'%"></i></div></div><div class="support-impact">'+esc(formatPp(c.impactRate))+'</div></div>';
    }).join('');
    return '<div class="support-wrap"><div class="support-head"><b>Other signals</b><span>Click to explore</span></div><div class="support-list">'+rows+'</div></div>';
  };

  WHYWidget.prototype._resultHtml=function(model,analysis){
    var group=this._selectedGroup(analysis),info='WHY scans the bound SAC result set, groups overlapping cuts, and ranks material signals by leave-one-out impact on the total growth rate. New and Disappeared flag lifecycle changes that can reflect genuine business movement or structural/master-data changes. WHY reports signals, not causality.';
    return '<div class="why-stage result-stage '+(this._animateReveal?'reveal-burst':'')+'"><div class="answer-strip"><div class="answer-text">'+this._answerText(analysis)+'</div><span class="method-info" title="'+esc(info)+'">ⓘ</span></div>'+this._heroSignalHtml(model,analysis,group)+this._supportHtml(model,analysis,group)+'</div>';
  };

  WHYWidget.prototype._idleHtml=function(analysis){
    return '<div class="why-stage idle-stage"><div><div class="idle-orbit">?</div><div class="idle-title">'+analysis.dimensionCount+' dimensions ready</div><div class="idle-copy">Press WHY? to reveal the strongest variance signals.</div></div></div>';
  };

  WHYWidget.prototype._scanHtml=function(model,analysis){
    var dims=model.dimAliases.map(function(a,i){return '<span class="scan-dim" style="animation-delay:'+(i*85)+'ms">'+esc(model.dimLabels[a]||a)+'</span>';}).join('');
    return '<div class="why-stage scan-stage"><div class="scan-core"><div class="scan-total">'+esc(formatDelta(analysis.totalDelta,model.unit))+'</div><div class="scan-caption">Scanning '+analysis.dimensionCount+' dimensions</div><div class="scan-line"></div><div class="scan-dims">'+dims+'</div></div></div>';
  };

  WHYWidget.prototype._render=function(){
    this._ensure();var root=this.shadowRoot.querySelector('#root');if(!root)return;
    try{
      this._model=buildModel(this);
      var raw=strongestPath(this._model,3);raw.dimensionCount=this._model.dimAliases.length;this._analysis=raw;
      var body=this._scanning?this._scanHtml(this._model,raw):(this._revealed?this._resultHtml(this._model,raw):this._idleHtml(raw));
      root.innerHTML=this._heroHtml(this._model,raw)+body;
      this._bind();
    }catch(err){
      this._model=null;this._analysis=null;
      root.innerHTML='<div class="error"><b>WHY is waiting for analyzable data.</b>'+esc(err&&err.message?err.message:String(err))+'</div>';
    }
  };

  WHYWidget.prototype._bind=function(){
    var self=this,run=self.shadowRoot.querySelector('#why-run'),sel=self.shadowRoot.querySelector('#why-measure');
    if(sel)sel.addEventListener('change',function(){self._selectedMeasureAlias=sel.value;self._selectedSignalKey=null;self._revealed=false;self._scanning=false;self._animateReveal=false;self._schedule();});
    if(run)run.addEventListener('click',function(){
      if(self._scanning)return;
      self._selectedSignalKey=null;self._animateReveal=false;self._scanning=true;self._revealed=false;self._render();
      setTimeout(function(){
        self._scanning=false;self._revealed=true;
        if(self._analysis)self._selectedSignalKey=self._analysis.editorialSignalKey||((self._analysis.topSignalGroups||[])[0]&&candidateKey(self._analysis.topSignalGroups[0].lead))||null;
        self._animateReveal=true;self._render();setTimeout(function(){self._animateReveal=false;},1100);
      },720);
    });
    Array.prototype.forEach.call(self.shadowRoot.querySelectorAll('[data-signal-key]'),function(row){
      row.addEventListener('click',function(){self._selectedSignalKey=row.getAttribute('data-signal-key');self._animateReveal=true;self._render();setTimeout(function(){self._animateReveal=false;},900);});
    });
  };



  /* v0.8.0 executive experience redesign
   * Clean data-cube identity, three deliberate states, functional help, manager-friendly language,
   * strong selected-signal affordance, and a restrained executive visual system.
   */
  function whyCubeSvg(extraClass){
    return '<span class="why-cube '+(extraClass||'')+'" aria-hidden="true"><svg viewBox="0 0 64 64" role="img">'
      +'<polygon class="cube-top" points="32,6 55,18 32,31 9,18"></polygon>'
      +'<polygon class="cube-left" points="9,18 32,31 32,58 9,45"></polygon>'
      +'<polygon class="cube-right" points="55,18 32,31 32,58 55,45"></polygon>'
      +'<path class="cube-grid" d="M20.5 12L43.5 24.5M43.5 12L20.5 24.5M20.5 24.5V51.5M43.5 24.5V51.5M9 31.5L32 44.5L55 31.5"></path>'
      +'</svg></span>';
  }

  STYLES += `
    :host{--v8-ink:#071f38;--v8-blue:#0a6ed1;--v8-deep:#062c57;--v8-deep2:#003d77;--v8-cyan:#13a7e8;--v8-sky:#7bd4ff;--v8-line:#c8e8fb;--v8-pale:#f4fbff;--v8-white:#ffffff}
    .why{border:1px solid #b9e0f6;border-radius:18px;background:#fff;box-shadow:0 12px 36px rgba(0,73,128,.11);overflow:visible}

    .top{position:relative;height:74px;padding:0 22px;border-bottom:1px solid var(--v8-line);background:#fff;display:flex;align-items:center;justify-content:space-between}
    .brand{display:flex;align-items:center;gap:13px}.brand-copy{display:flex;align-items:baseline;gap:12px;min-width:0}.brand strong{font-size:30px;letter-spacing:-.035em;color:var(--v8-ink)}.brand span{font-size:12px;color:#2a6d98;font-weight:800;white-space:nowrap}
    .why-cube{display:inline-grid;place-items:center;flex:0 0 auto}.why-cube svg{display:block;width:100%;height:100%;transform-origin:50% 55%;animation:whyCubeBreath 3s ease-in-out infinite}
    .why-cube-sm{width:42px;height:42px}.why-cube-lg{width:112px;height:112px}.why-cube-md{width:76px;height:76px}
    .cube-top{fill:#1698e7;stroke:#d9f4ff;stroke-width:1.2}.cube-left{fill:#0a6ed1;stroke:#d9f4ff;stroke-width:1.2}.cube-right{fill:#074d9b;stroke:#d9f4ff;stroke-width:1.2}.cube-grid{fill:none;stroke:rgba(255,255,255,.58);stroke-width:1;stroke-linecap:round;stroke-linejoin:round}
    .info-button{width:30px;height:30px;border-radius:50%;border:1px solid #87c9ef;background:#fff;color:#0a6ed1;font-size:15px;font-weight:950;cursor:pointer;display:grid;place-items:center;transition:background .15s ease,box-shadow .15s ease,transform .15s ease}.info-button:hover,.info-button[aria-expanded="true"]{background:#eef9ff;box-shadow:0 6px 16px rgba(10,110,209,.13);transform:translateY(-1px)}
    .info-popover{position:absolute;right:22px;top:62px;width:min(430px,calc(100vw - 60px));padding:15px 16px;border:1px solid #a9d9f4;border-radius:14px;background:#fff;box-shadow:0 18px 42px rgba(0,55,100,.18);z-index:50;color:#174360;display:none}.info-popover.open{display:block}.info-popover b{display:block;color:var(--v8-ink);font-size:13px;margin-bottom:7px}.info-popover p{margin:0 0 8px;font-size:11px;line-height:1.48}.info-popover dl{margin:8px 0 0;display:grid;grid-template-columns:110px 1fr;gap:5px 9px;font-size:10px;line-height:1.35}.info-popover dt{font-weight:900;color:#0b5f93}.info-popover dd{margin:0;color:#245a7a}.info-meta{margin-top:10px;padding-top:8px;border-top:1px solid #d4ecfa;color:#2c6c95;font-size:9px;font-weight:850}

    .hero{margin:0 22px;padding:16px 0 17px;border:0;border-bottom:1px solid var(--v8-line);border-radius:0;background:#fff;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:18px}
    .hero-left{display:flex;align-items:center;gap:24px}.measure-block{min-width:185px}.measure-label{color:#2f6c95;font-size:10px;letter-spacing:.11em}.measure-name{font-size:21px;color:var(--v8-ink)}.compare{color:#2c6d97}.variance{border-left:1px solid #bfe4f8;padding-left:24px;display:flex;align-items:baseline;gap:13px}.delta-big,.delta-pct,.delta-big.pos,.delta-pct.pos,.delta-big.neg,.delta-pct.neg{color:var(--v8-ink)}.delta-big{font-size:39px}.delta-pct{font-size:20px}
    .why-btn{position:relative;height:52px;min-width:132px;border-radius:13px;background:linear-gradient(135deg,#1199ef,#0a6ed1 58%,#0755bd);box-shadow:0 10px 24px rgba(10,110,209,.25);font-size:17px;letter-spacing:.01em;padding-right:37px}.why-btn::after{content:'›';position:absolute;right:18px;top:50%;transform:translateY(-54%);font-size:26px;font-weight:400}.why-btn:hover{box-shadow:0 13px 28px rgba(10,110,209,.32)}

    .v8-stage{position:relative;min-height:410px;background:#fff}
    .v8-idle{overflow:hidden;display:grid;place-items:center;text-align:center;padding:28px 28px 38px;min-height:420px;background:linear-gradient(180deg,#fff 0%,#fbfeff 55%,#f5fbff 100%)}
    .v8-idle::before,.v8-idle::after{content:'';position:absolute;border-radius:50%;border:1px solid #cceafa;pointer-events:none}.v8-idle::before{width:310px;height:310px;left:50%;top:46%;transform:translate(-50%,-50%);opacity:.55}.v8-idle::after{width:235px;height:235px;left:50%;top:46%;transform:translate(-50%,-50%);opacity:.8}
    .v8-idle-inner{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;max-width:760px}.v8-idle-cube{position:relative;width:132px;height:132px;display:grid;place-items:center}.v8-idle-cube::after{content:'';position:absolute;left:50%;bottom:5px;width:95px;height:20px;transform:translateX(-50%);background:radial-gradient(ellipse,rgba(10,110,209,.18),transparent 70%);filter:blur(3px)}
    .v8-idle-title{margin-top:18px;font-size:30px;line-height:1.1;font-weight:950;letter-spacing:-.035em;color:var(--v8-ink)}.v8-idle-sub{margin-top:8px;font-size:13px;color:#346f97;line-height:1.45}.v8-dims{margin-top:18px;display:flex;justify-content:center;gap:8px;flex-wrap:wrap}.v8-dim{padding:6px 11px;border:1px solid #b9e2f8;border-radius:999px;background:#fff;color:#155e8e;font-size:10px;font-weight:900;box-shadow:0 4px 12px rgba(0,80,140,.04)}

    .v8-scan{display:grid;place-items:center;text-align:center;padding:28px;min-height:420px;background:linear-gradient(180deg,#fff 0%,#fbfeff 100%);overflow:hidden}.v8-scan-inner{width:min(760px,92%);position:relative;z-index:2}.v8-scan-cube{margin:0 auto;position:relative;width:96px;height:96px;display:grid;place-items:center}.v8-scan-cube::before{content:'';position:absolute;inset:-24px;border:1px solid #90d2f5;border-radius:50%;animation:whyRing 1.45s ease-in-out infinite}.v8-scan-cube::after{content:'';position:absolute;inset:-9px;border:1px solid #d0ecfb;border-radius:50%;animation:whyRing 1.45s .25s ease-in-out infinite}.v8-scan-title{margin-top:24px;font-size:28px;font-weight:950;color:var(--v8-ink);letter-spacing:-.025em}.v8-scan-sub{margin-top:7px;font-size:12px;color:#356f96}.v8-progress{margin:30px auto 0;display:grid;grid-template-columns:repeat(3,1fr);max-width:720px;position:relative}.v8-progress::before{content:'';position:absolute;left:16.66%;right:16.66%;top:13px;height:2px;background:#c5e6f8}.v8-progress::after{content:'';position:absolute;left:16.66%;top:13px;height:2px;background:#0a6ed1;width:calc((var(--scan-step,0) / 2) * 66.68%);transition:width .35s ease}.v8-step{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;gap:8px;color:#4b7e9f}.v8-step-dot{width:27px;height:27px;border-radius:50%;border:2px solid #abd8f2;background:#fff;display:grid;place-items:center;font-size:12px;font-weight:950}.v8-step.active,.v8-step.done{color:#074f8d}.v8-step.active .v8-step-dot{border-color:#0a6ed1;box-shadow:0 0 0 6px rgba(10,110,209,.09);color:#0a6ed1}.v8-step.done .v8-step-dot{border-color:#0a6ed1;background:#0a6ed1;color:#fff}.v8-step b{font-size:11px}.v8-step span{font-size:9px;color:#4d82a4}

    .v8-result{padding:18px 22px 26px;min-height:420px}.v8-answer{display:flex;align-items:center;gap:10px;margin:0 2px 12px;color:#174e75;font-size:13px}.v8-answer b{color:var(--v8-ink);font-size:16px}.v8-answer-mark{width:25px;height:25px;border-radius:8px;background:#e8f7ff;color:#0a6ed1;display:grid;place-items:center;font-weight:950}
    .v8-hero{position:relative;overflow:hidden;border-radius:18px;background:linear-gradient(135deg,#062a53 0%,#06386d 55%,#07549d 100%);box-shadow:0 18px 38px rgba(0,50,95,.20);color:#fff;padding:22px 24px 18px}.v8-hero::before{content:'';position:absolute;right:-8%;top:-45%;width:68%;height:170%;background:repeating-linear-gradient(128deg,rgba(71,184,255,.09) 0 1px,transparent 1px 18px);transform:rotate(-3deg);pointer-events:none}.v8-hero-head{position:relative;z-index:1;display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.v8-kicker{font-size:9px;text-transform:uppercase;letter-spacing:.12em;font-weight:950;color:#83d6ff}.v8-title{margin-top:5px;font-size:29px;line-height:1.08;font-weight:950;letter-spacing:-.025em}.v8-life{display:inline-flex;align-items:center;padding:5px 9px;border:1px solid #78c9f4;border-radius:999px;background:rgba(5,78,134,.72);font-size:8px;font-weight:950;letter-spacing:.06em;text-transform:uppercase;color:#e3f7ff;white-space:nowrap;cursor:help}
    .v8-hero-main{position:relative;z-index:1;display:grid;grid-template-columns:minmax(220px,.48fr) minmax(400px,1.52fr);gap:28px;margin-top:16px}.v8-impact{font-size:58px;line-height:.95;font-weight:950;letter-spacing:-.05em}.v8-impact-label{margin-top:7px;font-size:10px;text-transform:uppercase;letter-spacing:.09em;font-weight:900;color:#86d6ff}.v8-context{margin-top:13px;font-size:14px;font-weight:850;color:#e9f8ff}.v8-context small{display:block;margin-top:4px;color:#91d8ff;font-size:10px}.v8-metrics{margin-top:17px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;border-top:1px solid rgba(147,216,255,.30);padding-top:11px}.v8-metric{padding-right:12px}.v8-metric+.v8-metric{border-left:1px solid rgba(147,216,255,.24);padding-left:12px}.v8-metric small{display:block;font-size:8px;text-transform:uppercase;letter-spacing:.09em;color:#8bd6ff;font-weight:950}.v8-metric b{display:block;margin-top:4px;font-size:17px;color:#fff}.v8-related{margin-top:13px;font-size:10px;color:#9bdefe;font-weight:800}.v8-related b{color:#fff}
    .v8-hero .timeline{position:relative;z-index:1}.v8-hero .timeline-title{color:#e8f7ff}.v8-hero .timeline-legend,.v8-hero .timeline-x{color:#92d8ff;fill:#92d8ff}.v8-hero .timeline-grid{stroke:#2f6f9f;opacity:.55}.v8-hero .timeline-zero{stroke:#4c96c8}.v8-hero .timeline-prior{stroke:#96d9ff}.v8-hero .timeline-current{stroke:#1bb0ff}.v8-hero .timeline-dot{fill:#1bb0ff}.v8-hero .timeline-prior-dot{fill:#96d9ff}

    .v8-signals{margin-top:18px}.v8-signal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}.v8-signal-head b{font-size:11px;text-transform:uppercase;letter-spacing:.10em;color:var(--v8-ink)}.v8-signal-head span{font-size:10px;color:#2e7099}.v8-signal-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:10px}.v8-card{position:relative;min-width:0;border:1px solid #bfe4f8;border-radius:13px;background:#fff;padding:11px 12px 10px;cursor:pointer;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease,background .16s ease}.v8-card:hover{transform:translateY(-2px);border-color:#67bce9;box-shadow:0 9px 20px rgba(0,81,140,.11)}.v8-card.selected{border:2px solid #0a6ed1;background:#f3fbff;box-shadow:0 8px 20px rgba(10,110,209,.11);padding:10px 11px 9px}.v8-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:6px}.v8-card-name{font-size:11px;font-weight:950;color:var(--v8-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.v8-card-arrow{font-size:20px;line-height:1;color:#0a6ed1}.v8-card-life{display:inline-flex;margin-top:5px;padding:2px 5px;border-radius:999px;border:1px solid #8ed0f4;color:#0b669b;background:#f5fcff;font-size:7px;font-weight:950;text-transform:uppercase}.v8-card-context{margin-top:5px;min-height:14px;font-size:9px;color:#34729a;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.v8-card-bottom{margin-top:7px;display:flex;align-items:center;justify-content:space-between;gap:8px}.v8-card-impact{font-size:17px;font-weight:950;color:var(--v8-ink)}.v8-mini{height:4px;flex:1;background:#d8f0fc;border-radius:99px;overflow:hidden}.v8-mini i{display:block;height:100%;background:#0a6ed1;border-radius:99px}.v8-card.selected .v8-mini i{background:#008fd3}

    .reveal-burst .v8-hero{animation:v8HeroIn .52s cubic-bezier(.18,.82,.25,1) both}.reveal-burst .v8-card{opacity:0;animation:v8CardIn .28s ease forwards;animation-delay:var(--delay,0ms)}
    @keyframes whyCubeBreath{0%,78%,100%{transform:translateY(0) scale(1);filter:drop-shadow(0 4px 7px rgba(10,110,209,.12))}88%{transform:translateY(-2px) scale(1.02);filter:drop-shadow(0 7px 11px rgba(10,110,209,.19))}}
    @keyframes whyRing{0%,100%{transform:scale(.9);opacity:.18}50%{transform:scale(1.08);opacity:.75}}
    @keyframes v8HeroIn{from{opacity:0;transform:translateY(10px) scale(.992)}to{opacity:1;transform:none}}
    @keyframes v8CardIn{to{opacity:1}}
    @media(max-width:1000px){.v8-hero-main{grid-template-columns:1fr}.v8-signal-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.v8-title{font-size:25px}.v8-impact{font-size:50px}.brand-copy{gap:8px}.brand span{display:none}}
    @media(max-width:720px){.hero-left{gap:12px}.variance{padding-left:12px}.v8-signal-grid{grid-template-columns:1fr}.v8-idle-title{font-size:25px}.v8-progress{grid-template-columns:1fr;gap:12px}.v8-progress::before,.v8-progress::after{display:none}.v8-step{flex-direction:row;justify-content:flex-start}.v8-hero{padding:18px}.v8-metrics{grid-template-columns:1fr;gap:8px}.v8-metric+.v8-metric{border-left:0;padding-left:0}}
    @media(prefers-reduced-motion:reduce){.why-cube svg,.v8-scan-cube::before,.v8-scan-cube::after,.reveal-burst .v8-hero,.reveal-burst .v8-card{animation:none!important}}
  `;

  WHYWidget.prototype._ensure=function(){
    if(this.shadowRoot)return;
    this.attachShadow({mode:'open'});
    var info='<div id="why-info-pop" class="info-popover" role="dialog" aria-label="About WHY"><b>How WHY works</b><p>WHY analyzes the bound BW Live result set, groups overlapping findings and ranks material variance signals by their impact on the total rate. It highlights patterns worth investigating, not causes.</p><dl><dt>Trend baseline</dt><dd>Change the segment would show if it followed the overall trend.</dd><dt>Actual change</dt><dd>Observed change versus the comparison period.</dd><dt>Gap to trend</dt><dd>Difference between actual change and the trend baseline.</dd><dt>New / Disappeared</dt><dd>Lifecycle flags that can reflect genuine business movement or structural/master-data changes.</dd></dl><div class="info-meta">Deterministic signal logic · no AI required</div></div>';
    this.shadowRoot.innerHTML='<style>'+STYLES+'</style><div class="why"><div class="top"><div class="brand">'+whyCubeSvg('why-cube-sm')+'<div class="brand-copy"><strong>WHY</strong><span>Variance Signal Analysis</span></div></div><button id="why-info" class="info-button" type="button" aria-label="About WHY" aria-expanded="false">i</button>'+info+'</div><div id="root"></div></div>';
  };

  WHYWidget.prototype._heroHtml=function(model,analysis){
    var measureControl='';
    if(model.measureOptions.length>1){
      measureControl='<select id="why-measure" class="measure-select">'+model.measureOptions.map(function(o){return '<option value="'+esc(o.alias)+'"'+(o.alias===model.measureAlias?' selected':'')+'>'+esc(o.label)+'</option>';}).join('')+'</select>';
    }else measureControl='<div class="measure-name">'+esc(model.measureLabel)+'</div>';
    return '<div class="hero"><div class="hero-left"><div class="measure-block"><div class="measure-label">Measure</div>'+measureControl+'<div class="compare">'+esc(model.currentScopeLabel)+' vs '+esc(model.priorScopeLabel)+'</div></div><div class="variance"><div class="delta-big">'+esc(formatDelta(analysis.totalDelta,model.unit))+'</div><div><div class="delta-pct">'+esc(formatPctRatio(analysis.totalDeltaPct))+'</div><div class="compare">Total variance</div></div></div></div><button id="why-run" class="why-btn" type="button">WHY?</button></div>';
  };

  WHYWidget.prototype._idleHtml=function(model,analysis){
    var dims=model.dimAliases.map(function(a){return '<span class="v8-dim">'+esc(model.dimLabels[a]||a)+'</span>';}).join('');
    return '<div class="v8-stage v8-idle"><div class="v8-idle-inner"><div class="v8-idle-cube">'+whyCubeSvg('why-cube-lg')+'</div><div class="v8-idle-title">What stands out behind this change?</div><div class="v8-idle-sub">'+analysis.dimensionCount+' analysis dimensions are connected. Press WHY? to surface the strongest variance signals.</div><div class="v8-dims">'+dims+'</div></div></div>';
  };

  WHYWidget.prototype._scanHtml=function(model,analysis){
    var step=Math.max(0,Math.min(2,Number(this._scanStep)||0));
    function stepClass(i){return i<step?'done':i===step?'active':'';}
    function dot(i){return i<step?'✓':String(i+1);}
    return '<div class="v8-stage v8-scan" style="--scan-step:'+step+'"><div class="v8-scan-inner"><div class="v8-scan-cube">'+whyCubeSvg('why-cube-md')+'</div><div class="v8-scan-title">Analyzing variance signals</div><div class="v8-scan-sub">Scanning '+analysis.dimensionCount+' dimensions, grouping related views and ranking material signals.</div><div class="v8-progress"><div class="v8-step '+stepClass(0)+'"><span class="v8-step-dot">'+dot(0)+'</span><b>Scan &amp; compare</b><span>Reviewing bound dimensions</span></div><div class="v8-step '+stepClass(1)+'"><span class="v8-step-dot">'+dot(1)+'</span><b>Group related views</b><span>Consolidating overlaps</span></div><div class="v8-step '+stepClass(2)+'"><span class="v8-step-dot">'+dot(2)+'</span><b>Rank material signals</b><span>Prioritizing impact</span></div></div></div></div>';
  };

  WHYWidget.prototype._answerText=function(analysis){
    var groups=analysis.topSignalGroups||[];
    if(!groups.length)return '<b>No material signal stands out.</b> The movement is broadly distributed.';
    if(analysis.classification==='dominant')return '<b>One signal stands out.</b> Its impact is materially separated from the rest.';
    if(analysis.classification==='mixed')return '<b>No dominant driver.</b> Several material signals are moving the total rate.';
    return '<b>No dominant driver.</b> The movement is broadly distributed.';
  };

  WHYWidget.prototype._heroSignalHtml=function(model,analysis,group){
    if(!group)return '<div class="v8-hero"><div class="v8-title">No material signal stands out.</div></div>';
    var c=group.lead,key=candidateKey(c),life=lifecycleKind(c),name=c.assignments.map(function(a){return a.label;}).join(' × ');
    var kicker=analysis.classification==='dominant'&&key===analysis.editorialSignalKey?'Dominant signal':'Strongest signal';
    var lifeHtml=life?'<span class="v8-life" title="'+esc(lifecycleHelp(life))+'">'+esc(lifecycleLabel(life))+'</span>':'';
    var context=life?(formatValue(c.prior,model.unit)+' → '+formatValue(c.current,model.unit)):(formatPctRatio(c.deltaPct)+' vs '+formatPctRatio(analysis.overallRate)+' overall');
    var evidenceCount=(group.evidence||[]).length,related=evidenceCount?'<div class="v8-related">Same pattern appears in <b>'+evidenceCount+'</b> related view'+(evidenceCount===1?'':'s')+'.</div>':'';
    return '<div class="v8-hero"><div class="v8-hero-head"><div><div class="v8-kicker">'+esc(kicker)+'</div><div class="v8-title">'+esc(name)+'</div></div>'+lifeHtml+'</div><div class="v8-hero-main"><div><div class="v8-impact">'+esc(formatPp(c.impactRate))+'</div><div class="v8-impact-label">Impact on total rate</div><div class="v8-context">'+esc(context)+'<small>'+esc(this._signalKindLabel(group.kind||signalKind(c,analysis.overallRate)))+'</small></div><div class="v8-metrics"><div class="v8-metric" title="Change if this segment followed the overall trend"><small>Trend baseline</small><b>'+esc(formatDelta(c.expectedDelta,model.unit))+'</b></div><div class="v8-metric" title="Observed change versus the comparison period"><small>Actual change</small><b>'+esc(formatDelta(c.delta,model.unit))+'</b></div><div class="v8-metric" title="Actual change minus trend baseline"><small>Gap to trend</small><b>'+esc(formatDelta(c.surprise,model.unit))+'</b></div></div>'+related+'</div>'+this._timelineHtml(model,c)+'</div></div>';
  };

  WHYWidget.prototype._supportHtml=function(model,analysis,selectedGroup){
    var groups=(analysis.topSignalGroups||[]).slice(0,5),selectedKey=selectedGroup?candidateKey(selectedGroup.lead):'',maxImpact=groups.reduce(function(m,g){return Math.max(m,candidateImpact(g.lead));},0)||1;
    var cards=groups.map(function(group,index){
      var c=group.lead,key=candidateKey(c),name=c.assignments.map(function(a){return a.label;}).join(' × '),life=lifecycleKind(c),ctx=life?(formatValue(c.prior,model.unit)+' → '+formatValue(c.current,model.unit)):(formatPctRatio(c.deltaPct)+' vs '+formatPctRatio(analysis.overallRate)+' overall'),w=Math.max(7,Math.min(100,candidateImpact(c)/maxImpact*100));
      var lifeHtml=life?'<span class="v8-card-life" title="'+esc(lifecycleHelp(life))+'">'+esc(lifecycleLabel(life))+'</span>':'';
      return '<div class="v8-card '+(key===selectedKey?'selected':'')+'" data-signal-key="'+esc(key)+'" style="--delay:'+(100+index*55)+'ms"><div class="v8-card-top"><div class="v8-card-name" title="'+esc(name)+'">'+esc(name)+'</div><span class="v8-card-arrow">›</span></div>'+lifeHtml+'<div class="v8-card-context">'+esc(ctx)+'</div><div class="v8-card-bottom"><div class="v8-mini"><i style="width:'+w.toFixed(1)+'%"></i></div><div class="v8-card-impact">'+esc(formatPp(c.impactRate))+'</div></div></div>';
    }).join('');
    return '<div class="v8-signals"><div class="v8-signal-head"><b>Material signals</b><span>Select a signal to explore</span></div><div class="v8-signal-grid">'+cards+'</div></div>';
  };

  WHYWidget.prototype._resultHtml=function(model,analysis){
    var group=this._selectedGroup(analysis);
    return '<div class="v8-stage v8-result '+(this._animateReveal?'reveal-burst':'')+'"><div class="v8-answer"><span class="v8-answer-mark">↗</span><div>'+this._answerText(analysis)+'</div></div>'+this._heroSignalHtml(model,analysis,group)+this._supportHtml(model,analysis,group)+'</div>';
  };

  WHYWidget.prototype._render=function(){
    this._ensure();var root=this.shadowRoot.querySelector('#root');if(!root)return;
    try{
      this._model=buildModel(this);
      var raw=strongestPath(this._model,3);raw.dimensionCount=this._model.dimAliases.length;this._analysis=raw;
      var body=this._scanning?this._scanHtml(this._model,raw):(this._revealed?this._resultHtml(this._model,raw):this._idleHtml(this._model,raw));
      root.innerHTML=this._heroHtml(this._model,raw)+body;
      this._bind();
    }catch(err){
      this._model=null;this._analysis=null;
      root.innerHTML='<div class="error"><b>WHY is waiting for analyzable data.</b>'+esc(err&&err.message?err.message:String(err))+'</div>';
      this._bindInfoOnly();
    }
  };

  WHYWidget.prototype._bindInfoOnly=function(){
    var self=this,info=self.shadowRoot&&self.shadowRoot.querySelector('#why-info'),pop=self.shadowRoot&&self.shadowRoot.querySelector('#why-info-pop');
    if(info&&!info.dataset.bound){
      info.dataset.bound='1';
      info.addEventListener('click',function(e){e.stopPropagation();var open=pop.classList.toggle('open');info.setAttribute('aria-expanded',open?'true':'false');});
    }
  };

  WHYWidget.prototype._bind=function(){
    var self=this,run=self.shadowRoot.querySelector('#why-run'),sel=self.shadowRoot.querySelector('#why-measure');
    self._bindInfoOnly();
    if(sel)sel.addEventListener('change',function(){self._selectedMeasureAlias=sel.value;self._selectedSignalKey=null;self._revealed=false;self._scanning=false;self._animateReveal=false;self._scanStep=0;self._schedule();});
    if(run)run.addEventListener('click',function(){
      if(self._scanning)return;
      self._selectedSignalKey=null;self._animateReveal=false;self._scanning=true;self._revealed=false;self._scanStep=0;self._render();
      setTimeout(function(){if(!self._scanning)return;self._scanStep=1;self._render();},1000);
      setTimeout(function(){if(!self._scanning)return;self._scanStep=2;self._render();},2000);
      setTimeout(function(){
        if(!self._scanning)return;
        self._scanning=false;self._revealed=true;
        if(self._analysis)self._selectedSignalKey=self._analysis.editorialSignalKey||((self._analysis.topSignalGroups||[])[0]&&candidateKey(self._analysis.topSignalGroups[0].lead))||null;
        self._animateReveal=true;self._render();setTimeout(function(){self._animateReveal=false;},900);
      },3000);
    });
    Array.prototype.forEach.call(self.shadowRoot.querySelectorAll('[data-signal-key]'),function(card){
      card.addEventListener('click',function(){self._selectedSignalKey=card.getAttribute('data-signal-key');self._animateReveal=true;self._render();setTimeout(function(){self._animateReveal=false;},720);});
    });
  };




  /* v0.8.1 experience polish
   * User-feedback pass only: stronger executive start screen, WHY wordmark identity,
   * magnifier signal visual, real-data preview charts, and pixel-aligned signal cards.
   * Core signal mathematics is unchanged.
   */
  function whyLensSvg(extraClass){
    return '<div class="why-lens '+(extraClass||'')+'" aria-hidden="true"><svg viewBox="0 0 1000 270" role="img">'
      +'<defs><linearGradient id="whyWaveA" x1="0" x2="1"><stop offset="0" stop-color="#8bdcff" stop-opacity="0"/><stop offset=".32" stop-color="#1aa7ec" stop-opacity=".78"/><stop offset=".68" stop-color="#0a6ed1" stop-opacity=".78"/><stop offset="1" stop-color="#8bdcff" stop-opacity="0"/></linearGradient><radialGradient id="whyLensGlow"><stop offset="0" stop-color="#10a8ef" stop-opacity=".28"/><stop offset="1" stop-color="#10a8ef" stop-opacity="0"/></radialGradient></defs>'
      +'<path class="lens-wave w1" d="M0 146 C120 70 220 220 345 142 C430 89 455 115 500 135 C555 163 600 111 675 136 C785 173 855 208 1000 126"/>'
      +'<path class="lens-wave w2" d="M0 177 C120 105 228 190 355 149 C438 123 463 128 500 139 C560 157 617 132 690 152 C815 187 900 130 1000 151"/>'
      +'<path class="lens-wave w3" d="M0 118 C112 170 240 69 354 132 C424 170 463 157 500 140 C562 111 620 161 704 126 C820 79 900 189 1000 171"/>'
      +'<circle class="lens-glow" cx="500" cy="136" r="122" fill="url(#whyLensGlow)"/>'
      +'<circle class="lens-ring r3" cx="500" cy="136" r="108"/><circle class="lens-ring r2" cx="500" cy="136" r="83"/><circle class="lens-ring r1" cx="500" cy="136" r="59"/>'
      +'<circle class="lens-core" cx="500" cy="136" r="39"/>'
      +'<circle class="lens-mag" cx="494" cy="130" r="14"/><path class="lens-handle" d="M505 141 L519 155"/>'
      +'<circle class="lens-dot d1" cx="188" cy="151" r="5"/><circle class="lens-dot d2" cx="347" cy="139" r="7"/><circle class="lens-dot d3" cx="640" cy="135" r="7"/><circle class="lens-dot d4" cx="846" cy="171" r="6"/>'
      +'</svg></div>';
  }

  function overallTrend(model){
    if(!model||!model.entries||!model.currentPeriod)return null;
    var currentYear=model.currentPeriod.year,priorYear=currentYear-1,gran=model.currentPeriod.granularity;
    if(gran==='year')return null;
    var global={},cur={},pri={},priorLimit=matchingPriorPeriod(model.currentPeriod);
    model.entries.forEach(function(e){
      if(!e||e.period.granularity!==gran)return;
      if(e.period.year!==currentYear&&e.period.year!==priorYear)return;
      if(e.period.year===currentYear&&!comparablePeriod(e.period,currentYear,model.currentPeriod))return;
      if(e.period.year===priorYear&&(!priorLimit||!comparablePeriod(e.period,priorYear,priorLimit)))return;
      var pos=trendPosition(e.period);if(pos==null)return;
      if(!global[pos])global[pos]={period:e.period,pos:pos};
      var map=e.period.year===currentYear?cur:pri;map[pos]=(map[pos]||0)+e.value;
    });
    var positions=Object.keys(global).map(Number).sort(function(a,b){return a-b;});
    if(positions.length>12){var sampled=[],last=-1;for(var i=0;i<12;i++){var idx=Math.round(i*(positions.length-1)/11);if(idx!==last){sampled.push(positions[idx]);last=idx;}}positions=sampled;}
    return positions.map(function(pos){return {label:trendLabel(global[pos].period),current:cur[pos]||0,prior:pri[pos]||0,pos:pos};});
  }

  function whyMiniTrend(model){
    var series=overallTrend(model);
    if(!series||series.length<2)return '<div class="v81-mini-empty">Period trend</div>';
    var W=260,H=58,P=4,cur=pointsForSeries(series,'current',W,H,P),pri=pointsForSeries(series,'prior',W,H,P);
    return '<svg class="v81-spark" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none"><polyline class="v81-spark-prior" points="'+pri.points+'"></polyline><polyline class="v81-spark-current" points="'+cur.points+'"></polyline></svg>';
  }

  function whyCoverage(model){
    var dims=model.dimAliases.slice(0,3),counts=dims.map(function(alias){var seen={};model.currentRows.forEach(function(r){var m=r.members&&r.members[alias];if(m)seen[String(m.id)]=1;});return {alias:alias,label:model.dimLabels[alias]||alias,count:Object.keys(seen).length};});
    var max=counts.reduce(function(m,d){return Math.max(m,d.count);},1)||1;
    return counts.map(function(d){var w=Math.max(12,d.count/max*100);return '<div class="v81-cov-row"><span>'+esc(d.label)+'</span><i><b style="width:'+w.toFixed(1)+'%"></b></i><em>'+d.count+'</em></div>';}).join('');
  }

  WHYWidget.prototype._ensure=function(){
    if(this.shadowRoot)return;
    this.attachShadow({mode:'open'});
    var info='<div id="why-info-pop" class="info-popover" role="dialog" aria-label="About WHY"><b>How WHY works</b><p>WHY analyzes the bound BW Live result set, groups overlapping findings and ranks material variance signals by their impact on the total rate. It highlights patterns worth investigating, not causes.</p><dl><dt>Trend baseline</dt><dd>Change the segment would show if it followed the overall trend.</dd><dt>Actual change</dt><dd>Observed change versus the comparison period.</dd><dt>Gap to trend</dt><dd>Difference between actual change and the trend baseline.</dd><dt>New / Disappeared</dt><dd>Lifecycle flags that can reflect genuine business movement or structural/master-data changes.</dd></dl><div class="info-meta">Deterministic signal logic · no AI required</div></div>';
    this.shadowRoot.innerHTML='<style>'+STYLES+'</style><div class="why"><div class="top"><div class="brand v81-brand"><strong class="v81-wordmark">WHY</strong><span>Variance Signal Analysis</span></div><button id="why-info" class="info-button" type="button" aria-label="About WHY" aria-expanded="false">i</button>'+info+'</div><div id="root"></div></div>';
  };

  WHYWidget.prototype._idleHtml=function(model,analysis){
    var dimNames=model.dimAliases.map(function(a){return esc(model.dimLabels[a]||a);}).join(' · ');
    var cur=Math.abs(analysis.totalCurrent||0),pri=Math.abs(analysis.totalPrior||0),mx=Math.max(cur,pri,1),curH=Math.max(12,cur/mx*100),priH=Math.max(12,pri/mx*100);
    return '<div class="v8-stage v81-idle">'
      +'<div class="v81-idle-main">'+whyLensSvg('v81-main-lens')
      +'<div class="v81-idle-title">What stands out behind this change?</div>'
      +'<div class="v81-dimnames">'+dimNames+'</div>'
      +'<div class="v81-ready-ticks"><i></i><i></i><i></i></div>'
      +'<div class="v81-ready"><b>'+analysis.dimensionCount+' dimensions ready</b><span>Press WHY? to reveal the strongest variance signals.</span></div></div>'
      +'<div class="v81-preview-grid">'
      +'<div class="v81-preview"><div class="v81-preview-head"><b>'+esc(model.measureLabel)+' trend</b><span>Live</span></div>'+whyMiniTrend(model)+'</div>'
      +'<div class="v81-preview"><div class="v81-preview-head"><b>Current vs prior</b><span>'+esc(model.currentScopeLabel)+'</span></div><div class="v81-bars"><div><i style="height:'+priH.toFixed(1)+'%"></i><span>Prior</span></div><div><i class="current" style="height:'+curH.toFixed(1)+'%"></i><span>Current</span></div><strong>'+esc(formatPctRatio(analysis.totalDeltaPct))+'</strong></div></div>'
      +'<div class="v81-preview"><div class="v81-preview-head"><b>Dimension coverage</b><span>'+analysis.dimensionCount+' dimensions</span></div><div class="v81-coverage">'+whyCoverage(model)+'</div></div>'
      +'</div></div>';
  };

  WHYWidget.prototype._scanHtml=function(model,analysis){
    var step=Math.max(0,Math.min(2,Number(this._scanStep)||0));
    function stepClass(i){return i<step?'done':i===step?'active':'';} function dot(i){return i<step?'✓':String(i+1);}
    return '<div class="v8-stage v81-scan" style="--scan-step:'+step+'"><div class="v81-scan-inner">'+whyLensSvg('v81-scan-lens')+'<div class="v81-scan-title">Finding the strongest signals…</div><div class="v81-scan-sub">WHY is reviewing the bound BW Live result set.</div><div class="v8-progress v81-progress"><div class="v8-step '+stepClass(0)+'"><span class="v8-step-dot">'+dot(0)+'</span><b>Scan &amp; compare</b><span>Reviewing '+analysis.dimensionCount+' dimensions</span></div><div class="v8-step '+stepClass(1)+'"><span class="v8-step-dot">'+dot(1)+'</span><b>Group related views</b><span>Consolidating overlaps</span></div><div class="v8-step '+stepClass(2)+'"><span class="v8-step-dot">'+dot(2)+'</span><b>Rank material signals</b><span>Prioritizing impact</span></div></div></div></div>';
  };

  WHYWidget.prototype._supportHtml=function(model,analysis,selectedGroup){
    var groups=(analysis.topSignalGroups||[]).slice(0,5),selectedKey=selectedGroup?candidateKey(selectedGroup.lead):'',maxImpact=groups.reduce(function(m,g){return Math.max(m,candidateImpact(g.lead));},0)||1;
    var cards=groups.map(function(group,index){
      var c=group.lead,key=candidateKey(c),name=c.assignments.map(function(a){return a.label;}).join(' × '),life=lifecycleKind(c),ctx=life?(formatValue(c.prior,model.unit)+' → '+formatValue(c.current,model.unit)):(formatPctRatio(c.deltaPct)+' vs '+formatPctRatio(analysis.overallRate)+' overall'),w=Math.max(7,Math.min(100,candidateImpact(c)/maxImpact*100));
      var lifeHtml=life?'<span class="v8-card-life" title="'+esc(lifecycleHelp(life))+'">'+esc(lifecycleLabel(life))+'</span>':'<span class="v81-life-placeholder" aria-hidden="true">&nbsp;</span>';
      return '<div class="v8-card v81-card '+(key===selectedKey?'selected':'')+'" data-signal-key="'+esc(key)+'" style="--delay:'+(100+index*55)+'ms"><div class="v8-card-top"><div class="v8-card-name" title="'+esc(name)+'">'+esc(name)+'</div><span class="v8-card-arrow">›</span></div><div class="v81-life-slot">'+lifeHtml+'</div><div class="v8-card-context">'+esc(ctx)+'</div><div class="v8-card-bottom"><div class="v8-mini"><i style="width:'+w.toFixed(1)+'%"></i></div><div class="v8-card-impact">'+esc(formatPp(c.impactRate))+'</div></div></div>';
    }).join('');
    return '<div class="v8-signals v81-signals"><div class="v8-signal-head"><b>Material signals</b><span>Select a signal to explore</span></div><div class="v8-signal-grid">'+cards+'</div></div>';
  };

  STYLES += `
    /* v0.8.1 collected-feedback pass */
    .v81-brand{gap:13px;align-items:baseline}.v81-brand>span{font-size:12px;color:#286b98;font-weight:800;white-space:nowrap}.v81-wordmark{font-size:34px!important;letter-spacing:-.055em!important;font-weight:950!important;background:linear-gradient(90deg,#071f38 0%,#071f38 36%,#0a6ed1 50%,#071f38 64%,#071f38 100%);background-size:260% 100%;background-position:100% 50%;-webkit-background-clip:text;background-clip:text;color:transparent!important;animation:v81Wordmark 3s ease-in-out infinite}

    .v81-idle{min-height:500px;padding:16px 22px 20px;display:grid;grid-template-rows:minmax(270px,1fr) 112px;gap:15px;background:linear-gradient(180deg,#fff 0%,#fbfeff 72%,#f5fbff 100%);overflow:hidden}
    .v81-idle-main{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;min-height:0;z-index:1}.v81-idle-main::before{content:'';position:absolute;inset:8% -4% 0;background:radial-gradient(ellipse at 50% 45%,rgba(16,166,235,.08),transparent 48%);z-index:-1;pointer-events:none}
    .why-lens{width:100%;max-width:1080px;height:215px;display:block}.why-lens svg{width:100%;height:100%;overflow:visible}.lens-wave{fill:none;stroke:url(#whyWaveA);stroke-width:1.35}.lens-wave.w2{opacity:.68;stroke-width:1}.lens-wave.w3{opacity:.44;stroke-width:.9}.lens-ring{fill:none;stroke:#55bdf1;stroke-width:1;transform-box:fill-box;transform-origin:center;animation:v81Ring 3s ease-in-out infinite}.lens-ring.r2{opacity:.72;animation-delay:.12s}.lens-ring.r3{opacity:.42;animation-delay:.24s}.lens-core{fill:#0a6ed1;filter:drop-shadow(0 7px 13px rgba(10,110,209,.27))}.lens-mag{fill:none;stroke:#fff;stroke-width:4}.lens-handle{stroke:#fff;stroke-width:5;stroke-linecap:round}.lens-dot{fill:#08a8e8;filter:drop-shadow(0 2px 5px rgba(10,110,209,.25));animation:v81Dot 3s ease-in-out infinite}.lens-dot.d2{animation-delay:.18s}.lens-dot.d3{animation-delay:.34s}.lens-dot.d4{animation-delay:.52s}
    .v81-idle-title{margin-top:-1px;font-size:29px;line-height:1.08;font-weight:950;letter-spacing:-.035em;color:#071f38}.v81-dimnames{margin-top:7px;font-size:15px;color:#4a7ba0;font-weight:700}.v81-ready-ticks{display:flex;gap:9px;margin-top:13px}.v81-ready-ticks i{width:33px;height:6px;border-radius:99px;background:#0a6ed1}.v81-ready-ticks i:nth-child(2){background:#45bfe9}.v81-ready-ticks i:nth-child(3){background:#8edcf7}.v81-ready{display:flex;flex-direction:column;gap:3px;margin-top:10px}.v81-ready b{font-size:18px;color:#071f38}.v81-ready span{font-size:11px;color:#2f6f99;font-weight:700}
    .v81-preview-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;align-self:end}.v81-preview{height:112px;border:1px solid #bfe5fa;border-radius:14px;background:rgba(255,255,255,.96);padding:10px 12px;box-shadow:0 6px 16px rgba(0,78,137,.06);overflow:hidden}.v81-preview-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px}.v81-preview-head b{font-size:11px;color:#071f38}.v81-preview-head span{font-size:8px;color:#3f7b9f;font-weight:850;white-space:nowrap}.v81-spark{width:100%;height:63px;overflow:visible}.v81-spark-current{fill:none;stroke:#0a6ed1;stroke-width:2.8}.v81-spark-prior{fill:none;stroke:#79cff4;stroke-width:1.8;stroke-dasharray:4 4}.v81-mini-empty{height:63px;display:grid;place-items:center;font-size:10px;color:#2f719a}.v81-bars{height:68px;display:grid;grid-template-columns:44px 44px 1fr;justify-content:center;align-items:end;gap:10px}.v81-bars>div{height:58px;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:3px}.v81-bars i{display:block;width:22px;min-height:8px;background:#78d0f5;border-radius:4px 4px 1px 1px}.v81-bars i.current{background:#0a6ed1}.v81-bars span{font-size:7px;color:#34739c;font-weight:800}.v81-bars strong{align-self:center;font-size:20px;color:#0a6ed1}.v81-coverage{display:grid;gap:6px}.v81-cov-row{display:grid;grid-template-columns:70px minmax(0,1fr) 22px;align-items:center;gap:7px}.v81-cov-row span{font-size:8px;color:#205e89;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.v81-cov-row i{height:5px;background:#d7f0fc;border-radius:99px;overflow:hidden}.v81-cov-row i b{display:block;height:100%;background:#0a6ed1;border-radius:99px}.v81-cov-row em{font-size:8px;color:#0a6ed1;font-style:normal;font-weight:950;text-align:right}

    .v81-scan{min-height:500px;display:grid;place-items:center;padding:18px 28px 28px;background:linear-gradient(180deg,#fff,#f8fcff);overflow:hidden}.v81-scan-inner{width:min(880px,94%);text-align:center}.v81-scan-lens{height:200px;margin:0 auto -7px;max-width:850px}.v81-scan-title{font-size:28px;font-weight:950;letter-spacing:-.03em;color:#071f38}.v81-scan-sub{margin-top:6px;font-size:12px;color:#3d769c}.v81-progress{margin-top:25px}

    .v81-signals .v8-signal-grid{grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}.v81-card{height:106px!important;min-height:106px!important;padding:10px 11px!important;border-width:1px!important;display:grid!important;grid-template-rows:20px 15px 16px 26px!important;row-gap:3px!important;align-content:start!important;box-sizing:border-box!important}.v81-card.selected{padding:10px 11px!important;border-width:1px!important;border-color:#0a6ed1!important;box-shadow:0 0 0 1px #0a6ed1,0 9px 20px rgba(10,110,209,.11)!important;background:#f5fbff!important}.v81-card .v8-card-top{height:20px;min-height:20px;align-items:center}.v81-card .v8-card-name{line-height:16px}.v81-life-slot{height:15px;min-height:15px;display:flex;align-items:center;overflow:hidden}.v81-life-slot .v8-card-life{margin-top:0}.v81-life-placeholder{display:block;height:13px;visibility:hidden}.v81-card .v8-card-context{margin-top:0;min-height:16px;height:16px;line-height:14px}.v81-card .v8-card-bottom{margin-top:0;height:26px;min-height:26px;align-self:end;display:grid;grid-template-columns:minmax(0,1fr) 62px;align-items:center;gap:8px}.v81-card .v8-mini{height:4px}.v81-card .v8-card-impact{font-size:17px;line-height:20px;text-align:right;align-self:center}.v81-card .v8-card-arrow{line-height:18px}

    @keyframes v81Wordmark{0%,72%,100%{background-position:100% 50%}80%{background-position:48% 50%}88%{background-position:0% 50%}}
    @keyframes v81Ring{0%,72%,100%{transform:scale(1);opacity:.46}82%{transform:scale(1.035);opacity:.9}90%{transform:scale(1);opacity:.55}}
    @keyframes v81Dot{0%,72%,100%{opacity:.68;transform:scale(1)}82%{opacity:1;transform:scale(1.35)}90%{opacity:.72;transform:scale(1)}}
    @media(max-width:1100px){.v81-signals .v8-signal-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.v81-idle{grid-template-rows:minmax(280px,1fr) auto}.v81-preview-grid{grid-template-columns:repeat(3,minmax(180px,1fr));overflow-x:auto;padding-bottom:2px}}
    @media(max-width:780px){.v81-preview-grid{grid-template-columns:1fr}.v81-idle{min-height:700px}.why-lens{height:180px}.v81-idle-title{font-size:25px}.v81-signals .v8-signal-grid{grid-template-columns:1fr}}
    @media(prefers-reduced-motion:reduce){.v81-wordmark,.lens-ring,.lens-dot{animation:none!important}}
  `;




  /* v0.9.0 release-candidate polish
   * Manager-first semantics, specific-beats-container grouping, model-neutral copy,
   * readable typography, subtle motion, and a selection-aware explanation panel.
   */

  function v9SameMovement(a,b){
    if(!a||!b)return false;
    if(signOf(a.impactRate)!==signOf(b.impactRate))return false;
    if(signOf(a.surprise)!==signOf(b.surprise))return false;
    var aContainsB=assignmentsContain(a,b),bContainsA=assignmentsContain(b,a);
    if(aContainsB||bContainsA){
      var specific=aContainsB?a:b,broad=aContainsB?b:a;
      var broadGap=Math.abs(broad.surprise||0),specificGap=Math.abs(specific.surprise||0);
      var explanationRatio=broadGap>1e-9?specificGap/broadGap:0;
      var impactRatio=candidateImpact(broad)>1e-12?candidateImpact(specific)/candidateImpact(broad):0;
      return explanationRatio>=0.85&&impactRatio>=0.50;
    }
    if(coverageOverlap(a,b)<0.80)return false;
    var gapA=Math.abs(a.surprise||0),gapB=Math.abs(b.surprise||0),mx=Math.max(gapA,gapB,1e-9),mn=Math.min(gapA,gapB);
    return mn/mx>=0.80;
  }

  function v9ExplainedBySpecific(broad,members){
    if(!broad||!members)return false;
    for(var i=0;i<members.length;i++){
      var s=members[i];
      if(s===broad||(s.assignments||[]).length<=(broad.assignments||[]).length)continue;
      if(!assignmentsContain(s,broad))continue;
      if(signOf(s.impactRate)!==signOf(broad.impactRate)||signOf(s.surprise)!==signOf(broad.surprise))continue;
      var broadGap=Math.abs(broad.surprise||0),specificGap=Math.abs(s.surprise||0);
      if(broadGap>1e-9&&specificGap/broadGap>=0.85)return true;
    }
    return false;
  }

  function v9ChooseLead(members){
    var viable=members.filter(function(c){return !v9ExplainedBySpecific(c,members);});
    if(!viable.length)viable=members.slice();
    viable.sort(candidateStableCompare);
    return viable[0]||members[0]||null;
  }

  sameMovement=v9SameMovement;
  groupIndependentSignals=function(candidates,limit){
    var sorted=candidates.slice().sort(candidateStableCompare),n=sorted.length,parent=[];
    for(var i=0;i<n;i++)parent[i]=i;
    function find(x){while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x];}return x;}
    function union(a,b){a=find(a);b=find(b);if(a!==b)parent[b]=a;}
    for(var a=0;a<n;a++)for(var b=a+1;b<n;b++)if(v9SameMovement(sorted[a],sorted[b]))union(a,b);
    var comps={};
    for(var j=0;j<n;j++){var r=find(j);if(!comps[r])comps[r]=[];comps[r].push(sorted[j]);}
    var groups=Object.keys(comps).map(function(k){
      var members=comps[k],lead=v9ChooseLead(members),evidence=members.filter(function(c){return c!==lead;}).sort(candidateStableCompare);
      return {lead:lead,members:members,evidence:evidence.slice(0,8)};
    });
    groups.sort(function(a,b){return candidateStableCompare(a.lead,b.lead);});
    return groups.slice(0,limit||5);
  };

  function v9BrandIcon(){
    return '<span class="v9-brand-icon" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M16 3 27 9.5 16 16 5 9.5Z"/><path d="M5 9.5 16 16v13L5 22.5Z"/><path d="M27 9.5 16 16v13l11-6.5Z"/></svg></span>';
  }

  function v9LensSvg(extraClass){
    return '<div class="v9-lens '+(extraClass||'')+'" aria-hidden="true"><svg viewBox="0 0 1000 250">'
      +'<defs><linearGradient id="v9WaveA" x1="0" x2="1"><stop offset="0" stop-color="#8edcff" stop-opacity="0"/><stop offset=".28" stop-color="#42bdf1" stop-opacity=".75"/><stop offset=".70" stop-color="#0a6ed1" stop-opacity=".75"/><stop offset="1" stop-color="#8edcff" stop-opacity="0"/></linearGradient><radialGradient id="v9LensGlow"><stop offset="0" stop-color="#19aceb" stop-opacity=".22"/><stop offset="1" stop-color="#19aceb" stop-opacity="0"/></radialGradient></defs>'
      +'<path class="v9-wave w1" d="M0 138 C125 72 225 202 348 137 C425 96 459 115 500 132 C558 156 611 111 686 136 C792 171 872 195 1000 126"/>'
      +'<path class="v9-wave w2" d="M0 167 C118 111 228 183 355 147 C432 125 465 126 500 137 C560 155 620 133 695 150 C812 176 900 139 1000 151"/>'
      +'<path class="v9-wave w3" d="M0 114 C112 160 240 76 354 129 C425 162 462 154 500 138 C561 114 623 154 705 125 C820 84 900 179 1000 166"/>'
      +'<circle cx="500" cy="133" r="115" fill="url(#v9LensGlow)"/>'
      +'<circle class="v9-ring r3" cx="500" cy="133" r="102"/><circle class="v9-ring r2" cx="500" cy="133" r="78"/><circle class="v9-ring r1" cx="500" cy="133" r="55"/>'
      +'<circle class="v9-core" cx="500" cy="133" r="38"/><circle class="v9-mag" cx="494" cy="127" r="14"/><path class="v9-handle" d="M505 138 L519 152"/>'
      +'</svg></div>';
  }

  function v9DimensionType(model,candidate){
    return (candidate.assignments||[]).map(function(a){return model.dimLabels[a.alias]||a.alias;}).join(' × ');
  }

  function v9Role(group,analysis){
    if(!group||!group.lead)return 'MATERIAL SIGNAL';
    var c=group.lead,key=candidateKey(c),actual=c.deltaPct,overall=analysis.overallRate,impact=c.impactRate;
    if(analysis.classification==='dominant'&&key===analysis.editorialSignalKey)return 'DOMINANT DRIVER';
    if(overall>1e-9){
      if(impact>0)return 'AMPLIFIES GROWTH';
      if(impact<0&&actual!=null&&actual<0)return 'COUNTERTREND';
      if(impact<0)return 'SLOWS GROWTH';
    }
    if(overall<-1e-9){
      if(impact<0)return 'AMPLIFIES DECLINE';
      if(impact>0)return 'OFFSETS DECLINE';
    }
    return 'MATERIAL SIGNAL';
  }

  function v9RoleClass(role){
    role=String(role||'').toLowerCase();
    if(role.indexOf('dominant')>=0)return 'dominant';
    if(role.indexOf('counter')>=0)return 'counter';
    if(role.indexOf('offset')>=0||role.indexOf('slows')>=0)return 'offset';
    return 'amplify';
  }

  function v9Explanation(model,analysis,group){
    if(!group||!group.lead)return '';
    var c=group.lead,name=c.assignments.map(function(a){return a.label;}).join(' × '),life=lifecycleKind(c),role=v9Role(group,analysis),impact=formatPp(c.impactRate),actual=formatPctRatio(c.deltaPct),overall=formatPctRatio(analysis.overallRate),related=(group.evidence||[]).length;
    var sentence='';
    if(analysis.classification==='dominant'&&candidateKey(c)===analysis.editorialSignalKey){
      sentence='<b>'+esc(name)+'</b> is the dominant driver. Its <b>'+esc(impact)+'</b> impact on the total rate is materially separated from the other signals.';
    }else if(life==='disappeared'){
      sentence='<b>'+esc(name)+'</b> is no longer present in the current period ('+esc(formatValue(c.prior,model.unit))+' → '+esc(formatValue(c.current,model.unit))+'). WHY flags this separately because it may reflect a business change or a structural/master-data change.';
    }else if(life==='new'){
      sentence='<b>'+esc(name)+'</b> is new in the current period ('+esc(formatValue(c.prior,model.unit))+' → '+esc(formatValue(c.current,model.unit))+'). WHY flags this separately because it may reflect a business change or a structural/master-data change.';
    }else if(analysis.overallRate>0&&c.impactRate<0){
      sentence='<b>'+esc(name)+'</b> moved '+esc(actual)+' while the overall result moved '+esc(overall)+'. Its '+esc(impact)+' impact lowers the total growth rate.';
    }else if(analysis.overallRate<0&&c.impactRate>0){
      sentence='<b>'+esc(name)+'</b> moved '+esc(actual)+' while the overall result moved '+esc(overall)+'. Its '+esc(impact)+' impact offsets part of the decline.';
    }else{
      sentence='<b>'+esc(name)+'</b> moved '+esc(actual)+' versus '+esc(overall)+' overall and changes the total rate by <b>'+esc(impact)+'</b>.';
    }
    return '<div class="v9-explain"><div class="v9-explain-copy"><span>WHY THIS SIGNAL APPEARS</span><p>'+sentence+'</p></div><div class="v9-explain-facts"><div><small>Dimension</small><b>'+esc(v9DimensionType(model,c))+'</b></div><div><small>Signal role</small><b>'+esc(role)+'</b></div><div><small>Related views</small><b>'+related+'</b></div></div></div>';
  }

  WHYWidget.prototype._answerText=function(analysis){
    var groups=analysis.topSignalGroups||[];
    if(!groups.length)return '<b>No material signal stands out.</b> The movement is broadly distributed.';
    if(analysis.classification==='dominant'){
      var g=groupForKey(groups,analysis.editorialSignalKey)||groups[0],c=g.lead,name=c.assignments.map(function(a){return a.label;}).join(' × ');
      return '<b>'+esc(name)+' is the dominant driver.</b> Its '+esc(formatPp(c.impactRate))+' impact is materially separated from the rest.';
    }
    if(analysis.classification==='mixed'){
      var lower=groups.filter(function(g){return g.lead.impactRate<0;}).length,raise=groups.filter(function(g){return g.lead.impactRate>0;}).length;
      return '<b>No dominant driver.</b> '+lower+' signal'+(lower===1?'':'s')+' lower the total rate, '+raise+' raise it.';
    }
    return '<b>No material signal stands out.</b> The movement is broadly distributed.';
  };

  WHYWidget.prototype._heroSignalHtml=function(model,analysis,group){
    if(!group){
      var dims=model.dimAliases.map(function(a){return '<span>'+esc(model.dimLabels[a]||a)+'</span>';}).join('');
      return '<div class="v9-distributed"><div class="v9-distributed-mark">≈</div><div><b>No material signal stands out</b><p>The movement is broadly distributed across the bound dimensions.</p><div class="v9-dim-chips">'+dims+'</div></div></div>';
    }
    var c=group.lead,key=candidateKey(c),life=lifecycleKind(c),name=c.assignments.map(function(a){return a.label;}).join(' × '),isDominant=analysis.classification==='dominant'&&key===analysis.editorialSignalKey,role=v9Role(group,analysis);
    var kicker=isDominant?'Dominant driver':'Selected signal';
    var lifeHtml=life?'<span class="v9-life" title="'+esc(lifecycleHelp(life))+'">'+esc(lifecycleLabel(life))+'</span>':'';
    var context=life?(formatValue(c.prior,model.unit)+' → '+formatValue(c.current,model.unit)):(formatPctRatio(c.deltaPct)+' vs '+formatPctRatio(analysis.overallRate)+' overall');
    var related=(group.evidence||[]).length?'<div class="v9-related">Seen in <b>'+(group.evidence||[]).length+'</b> related view'+((group.evidence||[]).length===1?'':'s')+'.</div>':'';
    return '<div class="v9-hero"><div class="v9-hero-head"><div><div class="v9-kicker">'+esc(kicker)+'</div><div class="v9-signal-name">'+esc(name)+'</div><div class="v9-dimension-type">'+esc(v9DimensionType(model,c))+'</div></div><div class="v9-hero-badges"><span class="v9-role '+v9RoleClass(role)+'">'+esc(role)+'</span>'+lifeHtml+'</div></div><div class="v9-hero-main"><div class="v9-impact-col"><div class="v9-impact">'+esc(formatPp(c.impactRate))+'</div><div class="v9-impact-label">Impact on total rate</div><div class="v9-context">'+esc(context)+'</div><div class="v9-metrics"><div title="Change if this segment followed the overall trend"><small>Trend baseline</small><b>'+esc(formatDelta(c.expectedDelta,model.unit))+'</b></div><div title="Observed change versus the comparison period"><small>Actual change</small><b>'+esc(formatDelta(c.delta,model.unit))+'</b></div><div title="Actual change minus the trend baseline"><small>Gap to trend</small><b>'+esc(formatDelta(c.surprise,model.unit))+'</b></div></div>'+related+'</div>'+this._timelineHtml(model,c)+'</div></div>';
  };

  WHYWidget.prototype._supportHtml=function(model,analysis,selectedGroup){
    var groups=(analysis.topSignalGroups||[]).slice(0,5),selectedKey=selectedGroup?candidateKey(selectedGroup.lead):'',maxImpact=groups.reduce(function(m,g){return Math.max(m,candidateImpact(g.lead));},0)||1;
    if(!groups.length)return '';
    var cards=groups.map(function(group,index){
      var c=group.lead,key=candidateKey(c),name=c.assignments.map(function(a){return a.label;}).join(' × '),life=lifecycleKind(c),role=v9Role(group,analysis),ctx=life?(formatValue(c.prior,model.unit)+' → '+formatValue(c.current,model.unit)):(formatPctRatio(c.deltaPct)+' vs '+formatPctRatio(analysis.overallRate)+' overall'),w=Math.max(7,Math.min(100,candidateImpact(c)/maxImpact*100));
      var lifeHtml=life?'<span class="v9-card-life">'+esc(lifecycleLabel(life))+'</span>':'';
      return '<div class="v9-card '+(key===selectedKey?'selected':'')+'" data-signal-key="'+esc(key)+'" style="--delay:'+(100+index*55)+'ms"><div class="v9-card-top"><div class="v9-card-name" title="'+esc(name)+'">'+esc(name)+'</div><span class="v9-card-arrow">›</span></div><div class="v9-card-dim">'+esc(v9DimensionType(model,c))+'</div><div class="v9-card-flags"><span class="v9-card-role '+v9RoleClass(role)+'">'+esc(role)+'</span>'+lifeHtml+'</div><div class="v9-card-context">'+esc(ctx)+'</div><div class="v9-card-bottom"><div class="v9-card-bar"><i style="width:'+w.toFixed(1)+'%"></i></div><div class="v9-card-impact">'+esc(formatPp(c.impactRate))+'</div></div></div>';
    }).join('');
    return '<div class="v9-signals"><div class="v9-signal-head"><b>Signals</b><span>Select a signal to explore</span></div><div class="v9-signal-grid">'+cards+'</div></div>'+v9Explanation(model,analysis,selectedGroup);
  };

  WHYWidget.prototype._resultHtml=function(model,analysis){
    var group=this._selectedGroup(analysis);
    return '<div class="v9-stage v9-result '+(this._animateReveal?'reveal-burst':'')+'"><div class="v9-answer"><span class="v9-answer-mark">↗</span><div>'+this._answerText(analysis)+'</div></div>'+this._heroSignalHtml(model,analysis,group)+this._supportHtml(model,analysis,group)+'</div>';
  };

  WHYWidget.prototype._idleHtml=function(model,analysis){
    var dimNames=model.dimAliases.map(function(a){return esc(model.dimLabels[a]||a);}).join(' · ');
    var cur=Math.abs(analysis.totalCurrent||0),pri=Math.abs(analysis.totalPrior||0),mx=Math.max(cur,pri,1),curH=Math.max(10,cur/mx*100),priH=Math.max(10,pri/mx*100);
    return '<div class="v9-stage v9-idle"><div class="v9-idle-main">'+v9LensSvg('v9-main-lens')+'<div class="v9-idle-title">What stands out behind this change?</div><div class="v9-dimnames">'+dimNames+'</div><div class="v9-ready"><b>'+analysis.dimensionCount+' dimension'+(analysis.dimensionCount===1?'':'s')+' ready</b><span>Press WHY? to reveal the strongest variance signals.</span></div></div><div class="v9-preview-grid">'
      +'<div class="v9-preview trend"><div class="v9-preview-head"><b>'+esc(model.measureLabel)+' trend</b><span>Current vs prior</span></div>'+whyMiniTrend(model)+'</div>'
      +'<div class="v9-preview compare"><div class="v9-preview-head"><b>Current vs prior</b><span>'+esc(model.currentScopeLabel)+'</span></div><div class="v9-bars"><div><i style="height:'+priH.toFixed(1)+'%"></i><span>Prior</span></div><div><i class="current" style="height:'+curH.toFixed(1)+'%"></i><span>Current</span></div><strong>'+esc(formatPctRatio(analysis.totalDeltaPct))+'</strong></div></div>'
      +'<div class="v9-preview coverage"><div class="v9-preview-head"><b>Dimension coverage</b><span>'+analysis.dimensionCount+' bound</span></div><div class="v9-coverage">'+whyCoverage(model)+'</div></div>'
      +'</div></div>';
  };

  WHYWidget.prototype._scanHtml=function(model,analysis){
    var step=Math.max(0,Math.min(2,Number(this._scanStep)||0));
    function stepClass(i){return i<step?'done':i===step?'active':'';} function dot(i){return i<step?'✓':String(i+1);}
    return '<div class="v9-stage v9-scan"><div class="v9-scan-inner">'+v9LensSvg('v9-scan-lens')+'<div class="v9-scan-title">Finding the strongest signals…</div><div class="v9-scan-sub">Reviewing the bound result set across '+analysis.dimensionCount+' dimension'+(analysis.dimensionCount===1?'':'s')+'.</div><div class="v9-progress"><div class="v9-step '+stepClass(0)+'"><span>'+dot(0)+'</span><b>Scan &amp; compare</b><small>Reviewing period-aligned movements</small></div><div class="v9-step '+stepClass(1)+'"><span>'+dot(1)+'</span><b>Group related views</b><small>Consolidating overlapping signals</small></div><div class="v9-step '+stepClass(2)+'"><span>'+dot(2)+'</span><b>Rank material signals</b><small>Prioritizing impact on the total rate</small></div></div></div></div>';
  };

  WHYWidget.prototype._ensure=function(){
    if(this.shadowRoot)return;
    this.attachShadow({mode:'open'});
    var info='<div id="why-info-pop" class="info-popover v9-info" role="dialog" aria-label="About WHY"><b>How WHY works</b><p>WHY analyzes the bound SAC result set, compares segment performance with the overall trend, consolidates overlapping findings and ranks material signals by their impact on the total rate.</p><dl><dt>Trend baseline</dt><dd>Change the segment would show if it followed the overall trend.</dd><dt>Actual change</dt><dd>Observed change versus the comparison period.</dd><dt>Gap to trend</dt><dd>Difference between actual change and the trend baseline.</dd><dt>New / Disappeared</dt><dd>Lifecycle flags that can reflect genuine business movement or structural/master-data changes.</dd></dl><div class="info-meta">Deterministic signal logic · no AI required · signals, not causality</div></div>';
    this.shadowRoot.innerHTML='<style>'+STYLES+'</style><div class="why v9-shell"><div class="top v9-top"><div class="brand v9-brand">'+v9BrandIcon()+'<strong class="v9-wordmark">WHY</strong><span>Variance Signal Analysis</span></div><button id="why-info" class="info-button v9-info-button" type="button" aria-label="About WHY" aria-expanded="false">i</button>'+info+'</div><div id="root"></div></div>';
  };

  STYLES += `
    /* v0.9.0 manager-first visual system */
    :host{--v9-ink:#071f38;--v9-blue:#0a6ed1;--v9-cyan:#18a9e6;--v9-pale:#eff9ff;--v9-line:#cdeaff;--v9-soft:#e6f5ff;--v9-muted:#3f7398}
    .v9-shell{border-color:#b9e1f8!important;box-shadow:0 12px 30px rgba(0,91,150,.09)!important;border-radius:16px!important}
    .v9-top{height:70px!important;padding:0 22px!important;border-bottom:1px solid var(--v9-line)!important;background:#fff!important}
    .v9-brand{display:flex;align-items:center!important;gap:11px!important}.v9-brand>span{font-size:13px!important;color:#2f6d98!important;font-weight:800!important}.v9-wordmark{font-size:32px!important;color:var(--v9-ink)!important;letter-spacing:-.05em!important;font-weight:950!important}
    .v9-brand-icon{width:32px;height:32px;display:grid;place-items:center;filter:drop-shadow(0 4px 8px rgba(10,110,209,.16));animation:v9Cube 3s ease-in-out infinite}.v9-brand-icon svg{width:29px;height:29px}.v9-brand-icon path:nth-child(1){fill:#29b7ef}.v9-brand-icon path:nth-child(2){fill:#0a6ed1}.v9-brand-icon path:nth-child(3){fill:#0754b8}
    .v9-info-button{width:30px!important;height:30px!important;border-color:#83c9f2!important;color:#0a6ed1!important;background:#fff!important;font-size:14px!important}.v9-info{color:var(--v9-ink)!important;background:#fff!important;border-color:#9dd6f6!important;box-shadow:0 12px 28px rgba(0,93,156,.14)!important}.v9-info p,.v9-info dd,.v9-info .info-meta{color:#356f98!important}
    .hero{margin:12px 18px 0!important;border-color:var(--v9-line)!important;background:linear-gradient(135deg,#fff,#f6fbff)!important;padding:15px 18px!important}.measure-label{font-size:12px!important;color:#2e6f9a!important}.measure-name{font-size:21px!important;color:var(--v9-ink)!important}.variance{border-left-color:#bfe4f8!important}.delta-big{font-size:35px!important;color:var(--v9-ink)!important}.delta-pct{font-size:19px!important;color:var(--v9-blue)!important}.compare{font-size:12px!important;color:#3f7398!important}.why-btn{height:50px!important;min-width:130px!important;font-size:17px!important}

    .v9-stage{padding:14px 18px 18px}.v9-idle{min-height:500px;display:grid;grid-template-rows:minmax(285px,1fr) 96px;gap:14px;background:linear-gradient(180deg,#fff 0%,#fbfeff 70%,#f1faff 100%);overflow:hidden}.v9-idle-main{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;min-height:0}.v9-lens{width:100%;max-width:1040px;height:200px}.v9-lens svg{width:100%;height:100%;overflow:visible}.v9-wave{fill:none;stroke:url(#v9WaveA);stroke-width:1.25;transform-box:fill-box;transform-origin:center;animation:v9Wave 7s ease-in-out infinite}.v9-wave.w2{opacity:.65;animation-duration:8.4s;animation-direction:alternate-reverse}.v9-wave.w3{opacity:.45;animation-duration:9.6s}.v9-ring{fill:none;stroke:#5fc5f3;stroke-width:1;opacity:.64}.v9-ring.r2{opacity:.47}.v9-ring.r3{opacity:.26}.v9-core{fill:#0a6ed1;filter:drop-shadow(0 7px 12px rgba(10,110,209,.20))}.v9-mag{fill:none;stroke:#fff;stroke-width:4}.v9-handle{stroke:#fff;stroke-width:5;stroke-linecap:round}.v9-idle-title{margin-top:-3px;font-size:28px;line-height:1.1;font-weight:950;letter-spacing:-.03em;color:var(--v9-ink)}.v9-dimnames{margin-top:7px;font-size:15px;color:#3c78a1;font-weight:800}.v9-ready{margin-top:10px;display:flex;flex-direction:column;gap:3px}.v9-ready b{font-size:17px;color:var(--v9-ink)}.v9-ready span{font-size:12.5px;color:#2f719d;font-weight:750}
    .v9-preview-grid{display:grid;grid-template-columns:1.35fr .82fr 1fr;gap:11px}.v9-preview{height:96px;border:1px solid #b9e3fa;border-radius:13px;background:#fff;padding:9px 11px;box-shadow:0 5px 14px rgba(0,87,145,.05);overflow:hidden}.v9-preview-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px}.v9-preview-head b{font-size:12.5px;color:var(--v9-ink)}.v9-preview-head span{font-size:10.5px;color:#3d769d;font-weight:800;white-space:nowrap}.v9-preview .v81-spark{height:60px}.v9-bars{height:62px;display:grid;grid-template-columns:38px 38px 1fr;align-items:end;justify-content:center;gap:8px}.v9-bars>div{height:52px;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:3px}.v9-bars i{display:block;width:19px;min-height:7px;background:#7fd5f6;border-radius:3px 3px 1px 1px}.v9-bars i.current{background:#0a6ed1}.v9-bars span{font-size:10px;color:#316f99;font-weight:800}.v9-bars strong{align-self:center;font-size:19px;color:#0a6ed1}.v9-coverage{display:grid;gap:5px;padding-top:2px}.v9-coverage .v81-cov-row{grid-template-columns:84px minmax(0,1fr) 24px;gap:7px}.v9-coverage .v81-cov-row span{font-size:11px;color:#225f8b}.v9-coverage .v81-cov-row i{height:4px;background:#d7effc}.v9-coverage .v81-cov-row em{font-size:10.5px}

    .v9-scan{min-height:500px;display:grid;place-items:center;background:linear-gradient(180deg,#fff,#f4fbff)}.v9-scan-inner{width:min(920px,95%);text-align:center}.v9-scan-lens{height:185px;margin:0 auto -5px}.v9-scan-title{font-size:27px;font-weight:950;letter-spacing:-.025em;color:var(--v9-ink)}.v9-scan-sub{margin-top:6px;font-size:14px;color:#3a769e;font-weight:650}.v9-progress{margin-top:26px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;position:relative}.v9-progress::before{content:'';position:absolute;left:16.6%;right:16.6%;top:19px;height:2px;background:#c9e8f9}.v9-step{position:relative;z-index:1;display:grid;place-items:center;text-align:center}.v9-step>span{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;border:2px solid #acd8f4;background:#fff;color:#3777a2;font-size:13px;font-weight:950}.v9-step b{margin-top:8px;font-size:14px;color:#1c5178}.v9-step small{margin-top:3px;font-size:12px;color:#467b9d;line-height:1.25}.v9-step.active>span,.v9-step.done>span{border-color:#0a6ed1;background:#0a6ed1;color:#fff;box-shadow:0 0 0 5px #e7f5ff}.v9-step.active b,.v9-step.done b{color:var(--v9-ink)}

    .v9-result{padding-top:12px}.v9-answer{display:flex;align-items:center;gap:10px;margin-bottom:10px;padding:9px 10px;border-radius:11px;background:#f1f9ff;color:#285e84;font-size:15px;line-height:1.35}.v9-answer b{font-size:16px;color:var(--v9-ink)}.v9-answer-mark{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:#dff3ff;color:#0a6ed1;font-weight:950}
    .v9-hero{border-radius:16px;background:linear-gradient(135deg,#073862 0%,#0b4f7a 46%,#075b94 100%);padding:18px 20px;color:#fff;box-shadow:0 14px 28px rgba(2,54,91,.13);overflow:hidden;position:relative}.v9-hero::after{content:'';position:absolute;right:-8%;top:-38%;width:55%;height:100%;background:radial-gradient(circle,rgba(29,173,235,.18),transparent 62%);pointer-events:none}.v9-hero-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;position:relative;z-index:1}.v9-kicker{font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:#8fdcff;font-weight:950}.v9-signal-name{margin-top:3px;font-size:24px;line-height:1.08;font-weight:950;letter-spacing:-.025em}.v9-dimension-type{margin-top:5px;font-size:12.5px;color:#9fdcf7;font-weight:750}.v9-hero-badges{display:flex;align-items:center;gap:7px;flex-wrap:wrap;justify-content:flex-end}.v9-role,.v9-life{display:inline-flex;align-items:center;border-radius:999px;padding:5px 9px;font-size:10.5px;letter-spacing:.035em;font-weight:950;text-transform:uppercase;border:1px solid rgba(255,255,255,.32)}.v9-role{color:#e9f8ff}.v9-role.dominant{background:#0a6ed1}.v9-role.counter{background:#0754b8}.v9-role.offset{background:#146a9f}.v9-role.amplify{background:#0b789e}.v9-life{color:#fff;background:#0a6ed1}
    .v9-hero-main{display:grid;grid-template-columns:280px minmax(0,1fr);gap:25px;align-items:center;margin-top:10px;position:relative;z-index:1}.v9-impact{font-size:43px;line-height:.95;font-weight:950;letter-spacing:-.045em}.v9-impact-label{margin-top:7px;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#95d9fa;font-weight:900}.v9-context{margin-top:10px;font-size:13.5px;color:#e0f5ff;font-weight:800}.v9-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px;padding-top:11px;border-top:1px solid rgba(139,216,250,.30)}.v9-metrics small{display:block;font-size:11px;color:#9bdcf8;font-weight:800}.v9-metrics b{display:block;margin-top:2px;font-size:16px;color:#fff}.v9-related{margin-top:10px;font-size:12px;color:#a7e1fb;font-weight:750}.v9-hero .timeline{min-width:0}.v9-hero .timeline-title{font-size:13px!important}.v9-hero .timeline-legend{font-size:11px!important}.v9-hero .timeline-x{font-size:10px!important}.v9-hero .timeline-empty{font-size:12px!important}

    .v9-signals{margin-top:14px}.v9-signal-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:7px}.v9-signal-head b{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:var(--v9-ink)}.v9-signal-head span{font-size:12px;color:#34739c}.v9-signal-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px}.v9-card{height:132px;border:1px solid #bfe4f8;border-radius:12px;background:#fff;padding:10px 11px;display:grid;grid-template-rows:21px 16px 20px 17px 27px;row-gap:3px;cursor:pointer;transition:border-color .16s ease,box-shadow .16s ease,transform .16s ease}.v9-card:hover{border-color:#64b9ec;box-shadow:0 8px 17px rgba(0,92,154,.09);transform:translateY(-1px)}.v9-card.selected{border-color:#0a6ed1;box-shadow:0 0 0 1px #0a6ed1,0 9px 20px rgba(10,110,209,.11);background:#f5fbff}.v9-card-top{display:flex;align-items:center;gap:7px;min-width:0}.v9-card-name{font-size:13.5px;line-height:17px;color:var(--v9-ink);font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:1}.v9-card-arrow{font-size:20px;color:#0a6ed1}.v9-card-dim{font-size:11.5px;color:#3e769b;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.v9-card-flags{display:flex;gap:5px;align-items:center;overflow:hidden}.v9-card-role,.v9-card-life{display:inline-flex;align-items:center;border-radius:999px;padding:2px 6px;font-size:9.5px;font-weight:950;letter-spacing:.025em;white-space:nowrap}.v9-card-role{background:#e8f6ff;color:#075b94}.v9-card-role.dominant{background:#0a6ed1;color:#fff}.v9-card-role.counter{background:#dff3ff;color:#0754b8}.v9-card-role.offset{background:#e6f7ff;color:#146a9f}.v9-card-life{border:1px solid #7bc7f2;color:#075b94;background:#fff}.v9-card-context{font-size:11.5px;color:#3d7398;font-weight:750;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.v9-card-bottom{display:grid;grid-template-columns:minmax(0,1fr) 62px;gap:8px;align-items:center}.v9-card-bar{height:4px;border-radius:99px;background:#dff2fc;overflow:hidden}.v9-card-bar i{display:block;height:100%;border-radius:99px;background:#0a6ed1}.v9-card-impact{text-align:right;font-size:17px;line-height:20px;font-weight:950;color:var(--v9-ink)}
    .v9-explain{margin-top:12px;border:1px solid #bee4f9;border-radius:13px;background:linear-gradient(135deg,#fff,#f4fbff);padding:14px 16px;display:grid;grid-template-columns:minmax(0,1.35fr) minmax(360px,.65fr);gap:20px;align-items:center}.v9-explain-copy>span{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#33769e;font-weight:950}.v9-explain-copy p{margin:5px 0 0;font-size:14px;line-height:1.45;color:#2a6288}.v9-explain-copy p b{color:var(--v9-ink)}.v9-explain-facts{display:grid;grid-template-columns:1.2fr 1.1fr .6fr;gap:10px}.v9-explain-facts div{padding-left:10px;border-left:2px solid #d4eefc}.v9-explain-facts small{display:block;font-size:10.5px;color:#477b9d;font-weight:800}.v9-explain-facts b{display:block;margin-top:2px;font-size:12.5px;color:var(--v9-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .v9-distributed{min-height:260px;border:1px solid #bfe5fa;border-radius:16px;background:linear-gradient(135deg,#fff,#f3fbff);display:flex;align-items:center;justify-content:center;gap:18px;text-align:left;padding:34px}.v9-distributed-mark{width:62px;height:62px;border-radius:18px;background:#e4f5ff;color:#0a6ed1;display:grid;place-items:center;font-size:35px;font-weight:950}.v9-distributed b{font-size:23px;color:var(--v9-ink)}.v9-distributed p{margin:5px 0 9px;font-size:14px;color:#39769e}.v9-dim-chips{display:flex;gap:7px;flex-wrap:wrap}.v9-dim-chips span{padding:5px 8px;border-radius:999px;background:#e8f6ff;color:#166a9d;font-size:11px;font-weight:850}

    .error{margin:18px;border:1px solid #8fd3f6!important;background:#f2fbff!important;color:#1d5f89!important;border-radius:12px!important;font-size:13px!important;line-height:1.45}.error b{display:block;color:var(--v9-ink)!important;font-size:15px!important;margin-bottom:3px}
    @keyframes v9Cube{0%,72%,100%{transform:translateY(0) rotate(0deg)}82%{transform:translateY(-1px) rotate(2deg)}90%{transform:translateY(0) rotate(0deg)}}
    @keyframes v9Wave{0%,100%{transform:translate3d(-3px,1px,0) scaleX(1)}50%{transform:translate3d(3px,-1px,0) scaleX(1.008)}}
    @media(max-width:1100px){.v9-signal-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.v9-hero-main{grid-template-columns:1fr}.v9-explain{grid-template-columns:1fr}.v9-preview-grid{grid-template-columns:1.3fr .8fr 1fr;overflow-x:auto}.v9-preview{min-width:220px}}
    @media(max-width:780px){.v9-signal-grid{grid-template-columns:1fr}.v9-preview-grid{grid-template-columns:1fr}.v9-idle{min-height:720px}.v9-signal-name{font-size:21px}.v9-impact{font-size:38px}.v9-explain-facts{grid-template-columns:1fr}}
    @media(prefers-reduced-motion:reduce){.v9-brand-icon,.v9-wave{animation:none!important}}
  `;


  /* v0.10.0 executive briefing pass */
  function v10DirectionClass(value){
    value=Number(value)||0;
    if(value>1e-12)return 'positive';
    if(value<-1e-12)return 'negative';
    return 'neutral';
  }

  function v10RoleLabel(group,analysis){
    if(!group||!group.lead)return 'Material signal';
    var c=group.lead,key=candidateKey(c),actual=c.deltaPct,overall=analysis.overallRate,impact=c.impactRate;
    if(analysis.classification==='dominant'&&key===analysis.editorialSignalKey)return 'Dominant driver';
    if(overall>1e-9){
      if(impact>0)return 'Amplifies growth';
      if(impact<0&&actual!=null&&actual<0)return 'Countertrend';
      if(impact<0)return 'Slows growth';
    }
    if(overall<-1e-9){
      if(impact<0)return 'Amplifies decline';
      if(impact>0)return 'Offsets decline';
    }
    return 'Material signal';
  }

  function v10RoleClass(role){
    role=String(role||'').toLowerCase();
    if(role.indexOf('dominant')>=0)return 'dominant';
    if(role.indexOf('counter')>=0||role.indexOf('slows')>=0||(role.indexOf('decline')>=0&&role.indexOf('amplifies')>=0))return 'negative';
    if(role.indexOf('offset')>=0||role.indexOf('growth')>=0&&role.indexOf('amplifies')>=0)return 'positive';
    return 'neutral';
  }

  function v10SignalSentence(model,analysis,group){
    if(!group||!group.lead)return '';
    var c=group.lead,name=c.assignments.map(function(a){return a.label;}).join(' × '),life=lifecycleKind(c),impact=formatPp(c.impactRate),actual=formatPctRatio(c.deltaPct),overall=formatPctRatio(analysis.overallRate);
    if(analysis.classification==='dominant'&&candidateKey(c)===analysis.editorialSignalKey){
      var movement=analysis.overallRate<0?'decline':(analysis.overallRate>0?'increase':'change');
      return '<b>'+esc(name)+'</b> is the dominant driver of the '+movement+'. Its <b class="v10-inline '+v10DirectionClass(c.impactRate)+'">'+esc(impact)+'</b> impact is materially separated from the other signals.';
    }
    if(life==='disappeared')return '<b>'+esc(name)+'</b> disappeared in the current period. The move from <b>'+esc(formatValue(c.prior,model.unit))+'</b> to <b>'+esc(formatValue(c.current,model.unit))+'</b> can reflect a genuine business movement or a structural data change.';
    if(life==='new')return '<b>'+esc(name)+'</b> is new in the current period. The move from <b>'+esc(formatValue(c.prior,model.unit))+'</b> to <b>'+esc(formatValue(c.current,model.unit))+'</b> can reflect a genuine business movement or a structural data change.';
    if(analysis.overallRate>0&&c.impactRate<0)return '<b>'+esc(name)+'</b> moved '+esc(actual)+' while the overall result moved '+esc(overall)+'. It lowers the total growth rate by <b class="v10-inline negative">'+esc(impact)+'</b>.';
    if(analysis.overallRate<0&&c.impactRate>0)return '<b>'+esc(name)+'</b> moved '+esc(actual)+' while the overall result moved '+esc(overall)+'. It offsets <b class="v10-inline positive">'+esc(impact.replace(/^\+/,''))+'</b> of the decline.';
    return '<b>'+esc(name)+'</b> moved '+esc(actual)+' versus '+esc(overall)+' overall and changes the total rate by <b class="v10-inline '+v10DirectionClass(c.impactRate)+'">'+esc(impact)+'</b>.';
  }

  WHYWidget.prototype._ensure=function(){
    if(this.shadowRoot)return;
    this.attachShadow({mode:'open'});
    var info='<div id="why-info-pop" class="info-popover v9-info v10-info" role="dialog" aria-label="About WHY"><b>How WHY works</b><p>WHY analyzes the bound SAC result set, compares segment performance with the overall trend, consolidates overlapping findings and ranks material signals by their impact on the total rate.</p><dl><dt>Trend baseline</dt><dd>Change the segment would show if it followed the overall trend.</dd><dt>Actual change</dt><dd>Observed change versus the comparison period.</dd><dt>Gap to trend</dt><dd>Difference between actual change and the trend baseline.</dd><dt>Color</dt><dd>Green and red indicate positive or negative impact direction. They do not imply business favorability.</dd><dt>New / Disappeared</dt><dd>Lifecycle flags that can reflect genuine business movement or structural/master-data changes.</dd></dl><div class="info-meta">Deterministic signal logic · no AI required · signals, not causality</div></div>';
    this.shadowRoot.innerHTML='<style>'+STYLES+'</style><div class="why v9-shell v10-shell"><div class="top v9-top v10-top"><div class="brand v9-brand v10-brand">'+v9BrandIcon()+'<strong class="v9-wordmark v10-wordmark">WHY</strong><span>Variance Signal Analysis</span></div><button id="why-info" class="info-button v9-info-button v10-info-button" type="button" aria-label="About WHY" aria-expanded="false">i</button>'+info+'</div><div id="root"></div></div>';
  };

  WHYWidget.prototype._heroHtml=function(model,analysis){
    var measureControl='';
    if(model.measureOptions.length>1){
      measureControl='<select id="why-measure" class="measure-select">'+model.measureOptions.map(function(o){return '<option value="'+esc(o.alias)+'"'+(o.alias===model.measureAlias?' selected':'')+'>'+esc(o.label)+'</option>';}).join('')+'</select>';
    }else measureControl='<div class="measure-name">'+esc(model.measureLabel)+'</div>';
    var d=v10DirectionClass(analysis.totalDeltaPct);
    return '<div class="hero v10-kpi"><div class="hero-left"><div class="measure-block"><div class="measure-label">Measure</div>'+measureControl+'<div class="compare">'+esc(model.currentScopeLabel)+' vs '+esc(model.priorScopeLabel)+'</div></div><div class="variance"><div class="delta-big v10-kpi-value '+d+'">'+esc(formatDelta(analysis.totalDelta,model.unit))+'</div><div><div class="delta-pct v10-kpi-rate '+d+'">'+esc(formatPctRatio(analysis.totalDeltaPct))+'</div><div class="compare">Total variance</div></div></div></div><button id="why-run" class="why-btn v10-run" type="button">WHY?</button></div>';
  };

  WHYWidget.prototype._answerText=function(analysis){
    var groups=analysis.topSignalGroups||[];
    if(!groups.length)return '<b>No material signal stands out.</b> The change is broadly distributed across the bound dimensions.';
    if(analysis.classification==='dominant'){
      var g=groupForKey(groups,analysis.editorialSignalKey)||groups[0],c=g.lead,name=c.assignments.map(function(a){return a.label;}).join(' × '),movement=analysis.overallRate<0?'decline':(analysis.overallRate>0?'increase':'change');
      return '<b>One dominant driver explains the '+movement+'.</b> '+esc(name)+' changes the total rate by <span class="v10-inline '+v10DirectionClass(c.impactRate)+'">'+esc(formatPp(c.impactRate))+'</span>.';
    }
    if(analysis.classification==='mixed')return '<b>No single driver dominates.</b> Several material signals are moving the total rate.';
    return '<b>No material signal stands out.</b> The change is broadly distributed across the bound dimensions.';
  };

  WHYWidget.prototype._heroSignalHtml=function(model,analysis,group){
    if(!group){
      var dims=model.dimAliases.map(function(a){return '<span>'+esc(model.dimLabels[a]||a)+'</span>';}).join('');
      return '<div class="v9-distributed v10-distributed"><div class="v9-distributed-mark">≈</div><div><b>No material signal stands out</b><p>The change is broadly distributed across the bound dimensions.</p><div class="v9-dim-chips">'+dims+'</div></div></div>';
    }
    var c=group.lead,key=candidateKey(c),life=lifecycleKind(c),name=c.assignments.map(function(a){return a.label;}).join(' × '),isDominant=analysis.classification==='dominant'&&key===analysis.editorialSignalKey,role=v10RoleLabel(group,analysis),impactDir=v10DirectionClass(c.impactRate);
    var kicker=isDominant?'Dominant driver':'Selected signal';
    var lifeHtml=life?'<span class="v10-life" title="'+esc(lifecycleHelp(life))+'">'+esc(lifecycleLabel(life))+'</span>':'';
    var context=life?(formatValue(c.prior,model.unit)+' → '+formatValue(c.current,model.unit)):(formatPctRatio(c.deltaPct)+' vs '+formatPctRatio(analysis.overallRate)+' overall');
    var related=(group.evidence||[]).length?'<div class="v9-related v10-related">Confirmed across <b>'+(group.evidence||[]).length+'</b> related view'+((group.evidence||[]).length===1?'':'s')+'.</div>':'';
    var roleHtml='<span class="v10-status '+v10RoleClass(role)+'"><i></i>'+esc(role)+'</span>';
    return '<div class="v9-hero v10-hero"><div class="v9-hero-head v10-hero-head"><div><div class="v9-kicker v10-kicker">'+esc(kicker)+'</div><div class="v9-signal-name v10-signal-name">'+esc(name)+'</div><div class="v9-dimension-type v10-dimension-type">'+esc(v9DimensionType(model,c))+'</div></div><div class="v10-hero-status">'+roleHtml+lifeHtml+'</div></div><div class="v9-hero-main v10-hero-main"><div class="v9-impact-col"><div class="v9-impact v10-impact '+impactDir+'">'+esc(formatPp(c.impactRate))+'</div><div class="v9-impact-label v10-impact-label">Impact on total rate</div><div class="v9-context v10-context">'+esc(context)+'</div><div class="v9-metrics v10-metrics"><div title="Change if this segment followed the overall trend"><small>Trend baseline</small><b>'+esc(formatDelta(c.expectedDelta,model.unit))+'</b></div><div title="Observed change versus the comparison period"><small>Actual change</small><b>'+esc(formatDelta(c.delta,model.unit))+'</b></div><div title="Actual change minus the trend baseline"><small>Gap to trend</small><b>'+esc(formatDelta(c.surprise,model.unit))+'</b></div></div>'+related+'</div>'+this._timelineHtml(model,c)+'</div></div>';
  };

  WHYWidget.prototype._supportHtml=function(model,analysis,selectedGroup){
    var groups=(analysis.topSignalGroups||[]).slice(0,5),selectedKey=selectedGroup?candidateKey(selectedGroup.lead):'',maxImpact=groups.reduce(function(m,g){return Math.max(m,candidateImpact(g.lead));},0)||1;
    if(!groups.length)return '';
    var cards=groups.map(function(group,index){
      var c=group.lead,key=candidateKey(c),name=c.assignments.map(function(a){return a.label;}).join(' × '),life=lifecycleKind(c),role=v10RoleLabel(group,analysis),ctx=life?(formatValue(c.prior,model.unit)+' → '+formatValue(c.current,model.unit)):(formatPctRatio(c.deltaPct)+' vs '+formatPctRatio(analysis.overallRate)+' overall'),w=Math.max(7,Math.min(100,candidateImpact(c)/maxImpact*100)),dir=v10DirectionClass(c.impactRate);
      var lifeHtml=life?'<span class="v10-card-life">'+esc(lifecycleLabel(life))+'</span>':'';
      return '<div class="v9-card v10-card '+(key===selectedKey?'selected':'')+'" data-signal-key="'+esc(key)+'" style="--delay:'+(100+index*55)+'ms"><div class="v9-card-top"><div class="v9-card-name v10-card-name" title="'+esc(name)+'">'+esc(name)+'</div><span class="v9-card-arrow v10-card-arrow">›</span></div><div class="v9-card-dim v10-card-dim">'+esc(v9DimensionType(model,c))+'</div><div class="v10-card-role '+v10RoleClass(role)+'"><i></i>'+esc(role)+lifeHtml+'</div><div class="v9-card-context v10-card-context">'+esc(ctx)+'</div><div class="v9-card-bottom"><div class="v9-card-bar v10-card-bar"><i class="'+dir+'" style="width:'+w.toFixed(1)+'%"></i></div><div class="v9-card-impact v10-card-impact '+dir+'">'+esc(formatPp(c.impactRate))+'</div></div></div>';
    }).join('');
    return '<div class="v9-signals v10-signals"><div class="v9-signal-head v10-signal-head"><b>Signals</b><span>Select a signal to explore</span></div><div class="v9-signal-grid v10-signal-grid">'+cards+'</div></div>'+v10Explanation(model,analysis,selectedGroup);
  };

  function v10Explanation(model,analysis,group){
    if(!group||!group.lead)return '';
    var c=group.lead,role=v10RoleLabel(group,analysis),related=(group.evidence||[]).length;
    return '<div class="v10-explain"><div class="v10-explain-copy"><span>Why this signal matters</span><p>'+v10SignalSentence(model,analysis,group)+'</p></div><div class="v10-explain-facts"><div><small>Dimension</small><b>'+esc(v9DimensionType(model,c))+'</b></div><div><small>Role</small><b>'+esc(role)+'</b></div><div><small>Related views</small><b>'+related+'</b></div></div></div>';
  }

  WHYWidget.prototype._resultHtml=function(model,analysis){
    var group=this._selectedGroup(analysis);
    return '<div class="v9-stage v9-result v10-result '+(this._animateReveal?'reveal-burst':'')+'"><div class="v9-answer v10-answer"><span class="v10-answer-mark"></span><div>'+this._answerText(analysis)+'</div></div>'+this._heroSignalHtml(model,analysis,group)+this._supportHtml(model,analysis,group)+'</div>';
  };

  WHYWidget.prototype._idleHtml=function(model,analysis){
    var dimNames=model.dimAliases.map(function(a){return esc(model.dimLabels[a]||a);}).join(' · '),cur=Math.abs(analysis.totalCurrent||0),pri=Math.abs(analysis.totalPrior||0),mx=Math.max(cur,pri,1),curH=Math.max(10,cur/mx*100),priH=Math.max(10,pri/mx*100),rateDir=v10DirectionClass(analysis.totalDeltaPct);
    return '<div class="v9-stage v9-idle v10-idle"><div class="v9-idle-main v10-idle-main">'+v9LensSvg('v9-main-lens v10-main-lens')+'<div class="v9-idle-title v10-idle-title">What stands out behind this change?</div><div class="v9-dimnames v10-dimnames">'+dimNames+'</div><div class="v9-ready v10-ready"><b>'+analysis.dimensionCount+' dimension'+(analysis.dimensionCount===1?'':'s')+' ready</b><span>Press WHY? to surface the strongest variance signals.</span></div></div><div class="v10-preview-grid">'
      +'<div class="v10-preview trend"><div class="v10-preview-head"><b>'+esc(model.measureLabel)+' trend</b><span>Current vs prior</span></div>'+whyMiniTrend(model)+'</div>'
      +'<div class="v10-preview compact"><div class="v10-preview-head"><b>YoY change</b><span>'+esc(model.currentScopeLabel)+'</span></div><div class="v10-yoy '+rateDir+'">'+esc(formatPctRatio(analysis.totalDeltaPct))+'</div><div class="v10-yoy-sub">'+esc(formatDelta(analysis.totalDelta,model.unit))+' total variance</div></div>'
      +'<div class="v10-preview compact"><div class="v10-preview-head"><b>Dimensions</b><span>'+analysis.dimensionCount+' bound</span></div><div class="v10-dim-strip">'+model.dimAliases.map(function(a){return '<span>'+esc(model.dimLabels[a]||a)+'</span>';}).join('')+'</div></div>'
      +'<div class="v10-preview compact"><div class="v10-preview-head"><b>Period coverage</b><span>YoY</span></div><div class="v10-period"><b>'+esc(model.currentScopeLabel)+'</b><span>compared with</span><b>'+esc(model.priorScopeLabel)+'</b></div></div>'
      +'</div></div>';
  };

  WHYWidget.prototype._scanHtml=function(model,analysis){
    var step=Math.max(0,Math.min(2,Number(this._scanStep)||0));
    function stepClass(i){return i<step?'done':i===step?'active':'';} function dot(i){return i<step?'✓':String(i+1);}
    return '<div class="v9-stage v9-scan v10-scan"><div class="v9-scan-inner v10-scan-inner">'+v9LensSvg('v9-scan-lens v10-scan-lens')+'<div class="v9-scan-title v10-scan-title">Analyzing variance signals</div><div class="v9-scan-sub v10-scan-sub">Reviewing '+analysis.dimensionCount+' bound dimension'+(analysis.dimensionCount===1?'':'s')+' and prioritizing material movements.</div><div class="v9-progress v10-progress"><div class="v9-step v10-step '+stepClass(0)+'"><span>'+dot(0)+'</span><b>Scan dimensions</b><small>Compare period-aligned movements</small></div><div class="v9-step v10-step '+stepClass(1)+'"><span>'+dot(1)+'</span><b>Group related movements</b><small>Consolidate overlapping views</small></div><div class="v9-step v10-step '+stepClass(2)+'"><span>'+dot(2)+'</span><b>Rank material signals</b><small>Prioritize impact on the total rate</small></div></div></div></div>';
  };

  STYLES += `
    /* v0.10.0 executive briefing design */
    :host{--v10-navy:#082f55;--v10-ink:#0b2742;--v10-blue:#0a6ed1;--v10-cyan:#20a9e8;--v10-pale:#f4fbff;--v10-line:#cbe8f8;--v10-green:#18864b;--v10-green-dark:#0f6f3d;--v10-red:#c73838;--v10-red-dark:#a72d2d}
    .v10-shell{border-radius:10px!important;border-color:#bcdff3!important;box-shadow:0 8px 24px rgba(0,73,128,.07)!important}
    .v10-top{height:62px!important;padding:0 18px!important;background:#fff!important;border-bottom:1px solid #cfe9f8!important}
    .v10-brand{gap:9px!important}.v10-brand .v9-brand-icon{width:27px!important;height:27px!important;filter:none!important}.v10-brand .v9-brand-icon svg{width:26px!important;height:26px!important}.v10-wordmark{font-size:28px!important;letter-spacing:-.045em!important}.v10-brand>span{font-size:12px!important;color:#2b678f!important;font-weight:750!important}
    .v10-info-button{width:28px!important;height:28px!important;box-shadow:none!important}.v10-info{border-radius:9px!important;box-shadow:0 12px 28px rgba(0,55,100,.14)!important}.v10-info b{font-size:14px!important}.v10-info p,.v10-info dd{font-size:11.5px!important}.v10-info dl{font-size:11px!important;grid-template-columns:112px 1fr!important}

    .v10-kpi{margin:0 18px!important;padding:13px 0 14px!important;border-bottom:1px solid #cfe9f8!important;gap:14px!important}.v10-kpi .measure-block{min-width:205px!important}.v10-kpi .measure-label{font-size:10.5px!important}.v10-kpi .measure-name{font-size:20px!important}.v10-kpi .compare{font-size:11px!important;color:#2d6c95!important}.v10-kpi .variance{padding-left:22px!important;gap:12px!important}.v10-kpi .delta-big{font-size:35px!important;letter-spacing:-.04em!important}.v10-kpi .delta-pct{font-size:18px!important}.v10-kpi-value.positive,.v10-kpi-rate.positive{color:var(--v10-green)!important}.v10-kpi-value.negative,.v10-kpi-rate.negative{color:var(--v10-red)!important}.v10-kpi-value.neutral,.v10-kpi-rate.neutral{color:var(--v10-ink)!important}.v10-run{height:48px!important;min-width:126px!important;border-radius:8px!important;box-shadow:0 7px 17px rgba(10,110,209,.18)!important}

    .v10-result{padding:11px 18px 18px!important}.v10-answer{margin:0 0 10px!important;padding:7px 4px 9px!important;border-radius:0!important;background:#fff!important;border-bottom:1px solid #d6edf9!important;color:#2a6288!important;font-size:14px!important}.v10-answer b{font-size:15.5px!important;color:var(--v10-ink)!important}.v10-answer-mark{width:4px;height:24px;border-radius:99px;background:var(--v10-blue);flex:0 0 auto}.v10-inline{font-weight:950}.v10-inline.positive{color:var(--v10-green)}.v10-inline.negative{color:var(--v10-red)}

    .v10-hero{border-radius:10px!important;background:linear-gradient(135deg,#072e52 0%,#0a426e 62%,#07598b 100%)!important;padding:18px 20px 17px!important;box-shadow:0 10px 24px rgba(0,47,84,.13)!important;border-top:2px solid #1aa8e8}.v10-hero::after{display:none!important}.v10-hero-head{align-items:flex-start!important}.v10-kicker{font-size:11px!important;letter-spacing:.055em!important;text-transform:none!important;color:#8bd8f7!important}.v10-signal-name{font-size:22px!important;line-height:1.12!important;letter-spacing:-.018em!important;margin-top:4px!important}.v10-dimension-type{font-size:12px!important;color:#a3daf2!important;margin-top:5px!important}.v10-hero-status{display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:flex-end}.v10-status{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:800;color:#dff5ff;white-space:nowrap}.v10-status i{width:6px;height:6px;border-radius:50%;background:#48bfea}.v10-status.positive i{background:#52c98a}.v10-status.negative i{background:#ff8585}.v10-status.dominant i{background:#23b7f1}.v10-life{display:inline-flex;align-items:center;padding:3px 7px;border:1px solid #65c3ee;border-radius:5px;font-size:10px;font-weight:800;color:#eafaff;background:rgba(10,110,209,.18);text-transform:none!important}.v10-hero-main{grid-template-columns:310px minmax(0,1fr)!important;gap:26px!important;margin-top:12px!important}.v10-impact{font-size:38px!important;letter-spacing:-.035em!important}.v10-impact.positive{color:#62d99c!important}.v10-impact.negative{color:#ff8b8b!important}.v10-impact.neutral{color:#fff!important}.v10-impact-label{font-size:11px!important;letter-spacing:.045em!important;text-transform:none!important;color:#9edcf5!important}.v10-context{font-size:13px!important;color:#e8f8ff!important;margin-top:8px!important}.v10-metrics{margin-top:13px!important;padding-top:10px!important}.v10-metrics small{font-size:11.5px!important;color:#9edcf5!important}.v10-metrics b{font-size:15px!important}.v10-related{font-size:11.5px!important;color:#a8dff6!important;margin-top:9px!important}.v10-hero .timeline-title{font-size:13px!important;color:#fff!important}.v10-hero .timeline-legend{font-size:11.5px!important;color:#c9ebfa!important}.v10-hero .timeline-x{font-size:10.5px!important;color:#c9ebfa!important}

    .v10-signals{margin-top:12px!important}.v10-signal-head{margin-bottom:6px!important}.v10-signal-head b{font-size:12px!important;text-transform:none!important;letter-spacing:.02em!important}.v10-signal-head span{font-size:11.5px!important}.v10-signal-grid{gap:8px!important}.v10-card{height:124px!important;border-radius:8px!important;padding:10px 10px!important;grid-template-rows:20px 15px 19px 17px 25px!important;row-gap:3px!important;box-shadow:none!important;transition:border-color .15s ease,background .15s ease!important}.v10-card:hover{transform:none!important;box-shadow:none!important;border-color:#61bce9!important}.v10-card.selected{border-color:#0a6ed1!important;border-left:3px solid #0a6ed1!important;box-shadow:none!important;background:#f5fbff!important}.v10-card-name{font-size:13px!important}.v10-card-arrow{font-size:18px!important}.v10-card-dim{font-size:11px!important;color:#2e6a91!important}.v10-card-role{display:flex;align-items:center;gap:5px;font-size:10.5px;font-weight:800;color:#2b6a91;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.v10-card-role i{width:5px;height:5px;border-radius:50%;background:#42bce9;flex:0 0 auto}.v10-card-role.positive{color:var(--v10-green-dark)}.v10-card-role.positive i{background:var(--v10-green)}.v10-card-role.negative{color:var(--v10-red-dark)}.v10-card-role.negative i{background:var(--v10-red)}.v10-card-role.dominant{color:#075a95}.v10-card-life{margin-left:5px;padding-left:6px;border-left:1px solid #9fd8f4;color:#176b98;font-size:9.5px;font-weight:800}.v10-card-context{font-size:11px!important;color:#356f95!important}.v10-card-bar{height:3px!important;background:#dff2fc!important}.v10-card-bar i.positive{background:var(--v10-green)!important}.v10-card-bar i.negative{background:var(--v10-red)!important}.v10-card-bar i.neutral{background:var(--v10-blue)!important}.v10-card-impact{font-size:16px!important}.v10-card-impact.positive{color:var(--v10-green)!important}.v10-card-impact.negative{color:var(--v10-red)!important}.v10-card-impact.neutral{color:var(--v10-ink)!important}

    .v10-explain{margin-top:14px;padding:13px 4px 2px 13px;border:0;border-top:1px solid #d5edf9;border-left:3px solid #0a6ed1;background:#fff;display:grid;grid-template-columns:minmax(0,1.45fr) minmax(330px,.55fr);gap:20px;align-items:center}.v10-explain-copy>span{font-size:12px;color:var(--v10-ink);font-weight:900}.v10-explain-copy p{margin:5px 0 0;font-size:13.5px;line-height:1.42;color:#2d678f}.v10-explain-copy p b{color:var(--v10-ink)}.v10-explain-facts{display:grid;grid-template-columns:1.35fr 1fr .55fr;gap:8px}.v10-explain-facts div{padding-left:9px;border-left:1px solid #cce9f8}.v10-explain-facts small{display:block;font-size:10.5px;color:#4b7ea0;font-weight:750}.v10-explain-facts b{display:block;margin-top:2px;font-size:12px;color:var(--v10-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

    .v10-idle{min-height:500px!important;grid-template-rows:minmax(280px,1fr) 88px!important;gap:12px!important;padding:12px 18px 18px!important;background:linear-gradient(180deg,#fff 0%,#fbfeff 75%,#f4fbff 100%)!important}.v10-main-lens{height:190px!important}.v10-idle-title{font-size:27px!important}.v10-dimnames{font-size:14px!important}.v10-ready{margin-top:8px!important}.v10-ready b{font-size:16px!important}.v10-ready span{font-size:12px!important}.v10-preview-grid{display:grid;grid-template-columns:1.35fr .72fr 1fr 1fr;gap:8px}.v10-preview{height:88px;border:1px solid #c6e6f7;border-radius:8px;background:#fff;padding:8px 10px;overflow:hidden}.v10-preview-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px}.v10-preview-head b{font-size:11.5px;color:var(--v10-ink)}.v10-preview-head span{font-size:9.5px;color:#3e769d;font-weight:750;white-space:nowrap}.v10-preview .v81-spark{height:55px!important}.v10-yoy{font-size:24px;font-weight:950;line-height:1;margin-top:7px}.v10-yoy.positive{color:var(--v10-green)}.v10-yoy.negative{color:var(--v10-red)}.v10-yoy.neutral{color:var(--v10-ink)}.v10-yoy-sub{margin-top:5px;font-size:10.5px;color:#356f95;font-weight:700}.v10-dim-strip{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}.v10-dim-strip span{font-size:10px;font-weight:800;color:#135f8f;border-bottom:2px solid #28afe8;padding-bottom:2px}.v10-period{display:grid;gap:3px;margin-top:7px}.v10-period b{font-size:11px;color:var(--v10-ink)}.v10-period span{font-size:9.5px;color:#457b9d}

    .v10-scan{min-height:500px!important;background:linear-gradient(180deg,#fff,#f8fcff)!important}.v10-scan-lens{height:170px!important}.v10-scan-title{font-size:25px!important}.v10-scan-sub{font-size:13px!important}.v10-progress{margin-top:24px!important}.v10-step>span{width:34px!important;height:34px!important;box-shadow:none!important}.v10-step b{font-size:13px!important}.v10-step small{font-size:11px!important}.v10-step.active>span,.v10-step.done>span{box-shadow:0 0 0 4px #e8f6ff!important}
    .v10-distributed{border-radius:10px!important;box-shadow:none!important}
    @media(max-width:1100px){.v10-preview-grid{grid-template-columns:repeat(4,minmax(180px,1fr));overflow-x:auto}.v10-hero-main{grid-template-columns:1fr!important}.v10-explain{grid-template-columns:1fr}.v10-signal-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
    @media(max-width:780px){.v10-preview-grid{grid-template-columns:1fr}.v10-signal-grid{grid-template-columns:1fr!important}.v10-explain-facts{grid-template-columns:1fr}.v10-impact{font-size:34px!important}.v10-signal-name{font-size:20px!important}}
  `;



  /* v0.11.0 executive experience elevation pass */
  WHYWidget.prototype._idleHtml=function(model,analysis){
    var dimChips=model.dimAliases.map(function(a){return '<span>'+esc(model.dimLabels[a]||a)+'</span>';}).join('');
    var rateDir=v10DirectionClass(analysis.totalDeltaPct);
    return '<div class="v9-stage v9-idle v10-idle v11-idle">'
      +'<div class="v9-idle-main v10-idle-main v11-idle-main">'
      +v9LensSvg('v9-main-lens v10-main-lens v11-main-lens')
      +'<div class="v9-idle-title v10-idle-title v11-idle-title">What stands out behind this change?</div>'
      +'<div class="v11-scope-line"><b>'+analysis.dimensionCount+' dimension'+(analysis.dimensionCount===1?'':'s')+' connected</b></div>'
      +'<div class="v11-dim-chips">'+dimChips+'</div>'
      +'<div class="v11-ready-copy">Press WHY? to surface the strongest variance signals.</div>'
      +'</div>'
      +'<div class="v11-preview-grid">'
      +'<div class="v11-preview trend"><div class="v11-preview-head"><b>'+esc(model.measureLabel)+' trend</b><span>Current vs prior</span></div>'+whyMiniTrend(model)+'</div>'
      +'<div class="v11-preview compact"><div class="v11-preview-head"><b>YoY change</b><span>'+esc(model.currentScopeLabel)+'</span></div><div class="v11-yoy '+rateDir+'">'+esc(formatPctRatio(analysis.totalDeltaPct))+'</div><div class="v11-yoy-sub">'+esc(formatDelta(analysis.totalDelta,model.unit))+' total variance</div></div>'
      +'<div class="v11-preview compact"><div class="v11-preview-head"><b>Period coverage</b><span>YoY comparison</span></div><div class="v11-period"><b>'+esc(model.currentScopeLabel)+'</b><span>vs</span><b>'+esc(model.priorScopeLabel)+'</b></div></div>'
      +'</div></div>';
  };

  WHYWidget.prototype._scanHtml=function(model,analysis){
    var step=Math.max(0,Math.min(2,Number(this._scanStep)||0));
    function stepClass(i){return i<step?'done':i===step?'active':'';} function dot(i){return i<step?'✓':String(i+1);}
    return '<div class="v9-stage v9-scan v10-scan v11-scan"><div class="v9-scan-inner v10-scan-inner v11-scan-inner">'
      +v9LensSvg('v9-scan-lens v10-scan-lens v11-scan-lens')
      +'<div class="v9-scan-title v10-scan-title v11-scan-title">Analyzing variance signals</div>'
      +'<div class="v9-scan-sub v10-scan-sub v11-scan-sub">Comparing '+analysis.dimensionCount+' business dimension'+(analysis.dimensionCount===1?'':'s')+' across the selected periods.</div>'
      +'<div class="v9-progress v10-progress v11-progress">'
      +'<div class="v9-step v10-step v11-step '+stepClass(0)+'"><span>'+dot(0)+'</span><b>Scan dimensions</b><small>Compare period-aligned movements</small></div>'
      +'<div class="v9-step v10-step v11-step '+stepClass(1)+'"><span>'+dot(1)+'</span><b>Group related movements</b><small>Consolidate overlapping views</small></div>'
      +'<div class="v9-step v10-step v11-step '+stepClass(2)+'"><span>'+dot(2)+'</span><b>Rank material signals</b><small>Prioritize impact on the total rate</small></div>'
      +'</div></div></div>';
  };

  STYLES += `
    /* v0.11.0 premium executive visual system */
    :host{--v11-ink:#071f38;--v11-navy:#06365d;--v11-blue:#0a6ed1;--v11-cyan:#22aae8;--v11-sky:#eaf8ff;--v11-line:#bfe5f8;--v11-green:#128447;--v11-red:#ca3434}

    /* Brand / header */
    .v10-top{height:74px!important;padding:0 22px!important;background:linear-gradient(180deg,#ffffff 0%,#fbfeff 100%)!important;border-bottom:1px solid #bfe5f8!important}
    .v10-brand{position:relative;gap:12px!important;align-items:center!important}
    .v10-brand .v9-brand-icon{width:36px!important;height:36px!important;filter:drop-shadow(0 6px 12px rgba(10,110,209,.18))!important;animation:v11BrandPulse 3.2s cubic-bezier(.2,.7,.25,1) infinite!important}
    .v10-brand .v9-brand-icon svg{width:34px!important;height:34px!important}
    .v10-wordmark{font-size:34px!important;line-height:1!important;letter-spacing:-.055em!important;font-weight:950!important;background:linear-gradient(120deg,#071f38 0%,#0a6ed1 68%,#20a9e8 100%);-webkit-background-clip:text;background-clip:text;color:transparent!important}
    .v10-brand>span{font-size:14px!important;color:#1f628f!important;font-weight:760!important;letter-spacing:.01em!important}
    .v10-info-button{width:32px!important;height:32px!important;font-size:15px!important;border-color:#69c1ef!important}
    @keyframes v11BrandPulse{0%,72%,100%{transform:translateY(0) scale(1);filter:drop-shadow(0 5px 10px rgba(10,110,209,.14))}82%{transform:translateY(-1px) scale(1.045);filter:drop-shadow(0 8px 15px rgba(10,110,209,.28))}91%{transform:translateY(0) scale(1)}}

    /* KPI strip */
    .v10-kpi{margin:0 20px!important;padding:16px 0!important;min-height:82px!important}
    .v10-kpi .measure-block{min-width:245px!important}
    .v10-kpi .measure-label{font-size:12px!important;letter-spacing:.08em!important}
    .v10-kpi .measure-name{font-size:23px!important;line-height:1.08!important}
    .v10-kpi .compare{font-size:13px!important;line-height:1.25!important}
    .v10-kpi .variance{padding-left:26px!important;gap:14px!important}
    .v10-kpi .delta-big{font-size:38px!important}
    .v10-kpi .delta-pct{font-size:20px!important}
    .v10-run{height:52px!important;min-width:136px!important;font-size:17px!important;border-radius:10px!important;box-shadow:0 10px 24px rgba(10,110,209,.19)!important}

    /* Executive answer line */
    .v10-result{padding:14px 20px 20px!important}
    .v10-answer{padding:10px 2px 12px!important;margin-bottom:12px!important;gap:12px!important;font-size:16px!important;line-height:1.4!important}
    .v10-answer b{font-size:18px!important;letter-spacing:-.012em!important}
    .v10-answer-mark{height:30px!important;width:4px!important}

    /* Hero */
    .v10-hero{padding:22px 24px 21px!important;border-radius:12px!important;background:radial-gradient(circle at 82% 6%,rgba(42,181,236,.15),transparent 34%),linear-gradient(135deg,#062f53 0%,#08436f 62%,#075985 100%)!important;box-shadow:0 16px 38px rgba(0,47,84,.16)!important}
    .v10-kicker{font-size:13px!important;letter-spacing:.02em!important;color:#9be0fb!important}
    .v10-signal-name{font-size:28px!important;line-height:1.08!important;margin-top:6px!important;max-width:760px}
    .v10-dimension-type{font-size:14px!important;margin-top:7px!important;color:#b3e7fb!important}
    .v10-status{font-size:13px!important}.v10-status i{width:7px!important;height:7px!important}
    .v10-life{font-size:12px!important;padding:4px 8px!important}
    .v10-hero-main{grid-template-columns:335px minmax(0,1fr)!important;gap:34px!important;margin-top:18px!important}
    .v10-impact{font-size:44px!important}
    .v10-impact-label{font-size:13px!important;letter-spacing:.02em!important}
    .v10-context{font-size:15px!important;line-height:1.35!important;margin-top:9px!important}
    .v10-metrics{gap:14px!important;margin-top:17px!important;padding-top:13px!important}
    .v10-metrics small{font-size:13px!important}.v10-metrics b{font-size:17px!important;margin-top:3px!important}
    .v10-related{font-size:13px!important;margin-top:11px!important}
    .v10-hero .timeline-title{font-size:15px!important}.v10-hero .timeline-legend{font-size:13px!important}.v10-hero .timeline-x{font-size:12px!important}

    /* Signal rail */
    .v10-signals{margin-top:16px!important}
    .v10-signal-head{margin-bottom:9px!important}.v10-signal-head b{font-size:15px!important}.v10-signal-head span{font-size:13px!important}
    .v10-signal-grid{gap:10px!important}
    .v10-card{height:142px!important;padding:12px 12px!important;border-radius:10px!important;grid-template-rows:24px 18px 22px 19px 30px!important;row-gap:3px!important;border-color:#b9e2f7!important}
    .v10-card-name{font-size:15px!important;line-height:20px!important}.v10-card-arrow{font-size:20px!important}
    .v10-card-dim{font-size:12.5px!important}.v10-card-role{font-size:12px!important}.v10-card-life{font-size:11px!important}.v10-card-context{font-size:12.5px!important}
    .v10-card-bar{height:4px!important}.v10-card-impact{font-size:18px!important}
    .v10-card.selected{background:#f1faff!important;border-left:4px solid #0a6ed1!important;box-shadow:0 8px 22px rgba(10,110,209,.09)!important}

    /* Explanation becomes a balanced executive briefing, never a squeezed corner */
    .v10-explain{margin-top:18px!important;padding:17px 0 0!important;border-left:0!important;border-top:1px solid #bfe5f8!important;display:grid!important;grid-template-columns:1fr!important;gap:14px!important}
    .v10-explain-copy{padding:0 2px!important}
    .v10-explain-copy>span{font-size:15px!important;letter-spacing:-.005em!important}
    .v10-explain-copy p{font-size:15px!important;line-height:1.5!important;margin-top:6px!important;max-width:1100px!important}
    .v10-explain-facts{display:grid!important;grid-template-columns:minmax(0,2fr) minmax(180px,1fr) minmax(150px,.8fr)!important;gap:0!important;border-top:1px solid #d8effb!important;padding-top:12px!important}
    .v10-explain-facts div{padding:0 18px!important;border-left:1px solid #c7e8f8!important;min-width:0!important}
    .v10-explain-facts div:first-child{padding-left:2px!important;border-left:0!important}
    .v10-explain-facts small{font-size:12px!important}.v10-explain-facts b{font-size:14px!important;margin-top:4px!important;white-space:normal!important;line-height:1.3!important;overflow:visible!important}

    /* Start screen: bigger copy, dimensions once, three meaningful previews */
    .v11-idle{min-height:535px!important;grid-template-rows:minmax(330px,1fr) 112px!important;gap:16px!important;padding:16px 20px 22px!important;background:linear-gradient(180deg,#fff 0%,#fbfeff 73%,#eef9ff 100%)!important}
    .v11-idle-main{justify-content:center!important}
    .v11-main-lens{height:205px!important;margin-bottom:-5px!important}
    .v11-idle-title{font-size:31px!important;letter-spacing:-.032em!important}
    .v11-scope-line{margin-top:12px;font-size:16px;color:#1c5f8d}
    .v11-scope-line b{font-weight:850}
    .v11-dim-chips{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:10px}
    .v11-dim-chips span{display:inline-flex;align-items:center;min-height:34px;padding:0 13px;border:1px solid #8ed3f5;border-radius:999px;background:#f5fbff;color:#075a93;font-size:14px;font-weight:850;box-shadow:0 3px 10px rgba(10,110,209,.05)}
    .v11-ready-copy{margin-top:12px;font-size:14px;line-height:1.35;color:#2d6d98;font-weight:720}
    .v11-preview-grid{display:grid;grid-template-columns:1.5fr .8fr 1fr;gap:12px;align-items:stretch}
    .v11-preview{height:112px;border:1px solid #b8e2f8;border-radius:11px;background:#fff;padding:12px 14px;overflow:hidden;box-shadow:0 7px 18px rgba(0,87,145,.045)}
    .v11-preview-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px}
    .v11-preview-head b{font-size:14px;color:var(--v11-ink)}.v11-preview-head span{font-size:12px;color:#2f6f99;font-weight:760;white-space:nowrap}
    .v11-preview .v81-spark{height:69px!important}
    .v11-yoy{font-size:30px;font-weight:950;line-height:1;margin-top:9px}.v11-yoy.positive{color:var(--v11-green)}.v11-yoy.negative{color:var(--v11-red)}.v11-yoy.neutral{color:var(--v11-ink)}
    .v11-yoy-sub{margin-top:8px;font-size:13px;color:#2f6f99;font-weight:720}
    .v11-period{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;margin-top:18px}
    .v11-period b{font-size:14px;line-height:1.25;color:var(--v11-ink)}.v11-period span{font-size:13px;color:#2f6f99;font-weight:800}

    /* Loading: readable and deliberately paced */
    .v11-scan{min-height:535px!important;background:linear-gradient(180deg,#fff 0%,#f3fbff 100%)!important}
    .v11-scan-lens{height:190px!important}.v11-scan-title{font-size:30px!important}.v11-scan-sub{font-size:15px!important;line-height:1.45!important;max-width:760px;margin:8px auto 0!important}
    .v11-progress{margin-top:30px!important;gap:18px!important}.v11-step>span{width:38px!important;height:38px!important;font-size:14px!important}.v11-step b{font-size:15px!important;margin-top:10px!important}.v11-step small{font-size:13px!important;margin-top:5px!important;line-height:1.35!important}

    @media(max-width:1100px){.v11-preview-grid{grid-template-columns:repeat(3,minmax(220px,1fr));overflow-x:auto}.v10-hero-main{grid-template-columns:1fr!important}.v10-explain-facts{grid-template-columns:1fr 1fr 1fr!important}.v10-signal-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
    @media(max-width:780px){.v11-preview-grid{grid-template-columns:1fr}.v10-signal-grid{grid-template-columns:1fr!important}.v10-explain-facts{grid-template-columns:1fr!important}.v10-explain-facts div{border-left:0!important;border-top:1px solid #d8effb!important;padding:10px 0!important}.v10-signal-name{font-size:23px!important}.v10-impact{font-size:38px!important}}
    @media(prefers-reduced-motion:reduce){.v10-brand .v9-brand-icon{animation:none!important}}
  `;



  /* ================================================================
   * v0.12.0 - BOLD EXECUTIVE PRODUCT PASS
   * Visual target: the premium WHY mockup approved in chat.
   * No signal mathematics changed here. This layer is presentation,
   * default selection, timeline rendering and interaction polish only.
   * ================================================================ */

  function v12InsightIcon(){
    return '<span class="v12-insight-icon" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M7 22h4l3-7 4 4 7-10"/><path d="M20 9h5v5"/></svg></span>';
  }

  function v12ReasonIcon(){
    return '<span class="v12-reason-icon" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M10 19c-2.2-1.8-3.5-4.5-3.5-7.3A9.5 9.5 0 0 1 16 2.5a9.5 9.5 0 0 1 9.5 9.2c0 3-1.4 5.7-3.7 7.5-1.5 1.2-2.3 2.5-2.5 4.1h-6.5c-.2-1.7-1.1-3-2.8-4.3Z"/><path d="M12.8 26h6.4M13.8 29h4.4"/></svg></span>';
  }

  function v12Sparkline(model,candidate,dir){
    var series=signalTrend(model,candidate);
    if(!series||series.length<2)return '<div class="v12-spark-empty"></div>';
    var W=118,H=28,P=2,pts=pointsForSeries(series,'current',W,H,P);
    return '<svg class="v12-spark" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" aria-hidden="true"><polyline class="v12-spark-path '+esc(dir)+'" points="'+pts.points+'"></polyline></svg>';
  }

  function v12PrettyRole(role){
    role=String(role||'');
    if(!role)return 'Material signal';
    return role.charAt(0).toUpperCase()+role.slice(1).toLowerCase();
  }

  /* In MIXED, do not open on a lifecycle event when an equally material
     ordinary business signal exists. The ranking remains unchanged. */
  WHYWidget.prototype._selectedGroup=function(analysis){
    var groups=analysis.topSignalGroups||[];
    if(this._selectedSignalKey){
      return groupForKey(groups,this._selectedSignalKey)||groups[0]||null;
    }
    if(analysis.classification==='dominant'){
      return groupForKey(groups,analysis.editorialSignalKey)||groups[0]||null;
    }
    if(analysis.classification==='mixed'&&groups.length){
      var topImpact=candidateImpact(groups[0].lead)||0;
      for(var i=0;i<groups.length;i++){
        var g=groups[i],c=g.lead;
        if(!lifecycleKind(c) && candidateImpact(c)>=topImpact*0.88)return g;
      }
    }
    return groupForKey(groups,analysis.editorialSignalKey)||groups[0]||null;
  };

  WHYWidget.prototype._timelineHtml=function(model,candidate){
    var series=signalTrend(model,candidate);
    if(!series||series.length<2)return '<div class="timeline v12-timeline"><div class="timeline-head"><div class="timeline-title">'+esc(model.measureLabel)+' by period</div></div><div class="timeline-empty">No period-level trend available for this signal.</div></div>';
    var W=760,H=220,L=62,R=16,T=24,B=42;
    var cur=pointsForSeries(series,'current',W,H,L),pri=pointsForSeries(series,'prior',W,H,L);
    var min=cur.min,max=cur.max,span=max-min||1;
    function y(v){return T+(H-T-B)*(1-(v-min)/span);}
    var tickVals=[];
    for(var ti=0;ti<4;ti++)tickVals.push(min+(span*ti/3));
    var grid=tickVals.map(function(v){var yy=y(v);return '<line class="v12-grid" x1="'+L+'" y1="'+yy.toFixed(1)+'" x2="'+(W-R)+'" y2="'+yy.toFixed(1)+'"></line><text class="v12-ylabel" x="'+(L-12)+'" y="'+(yy+4).toFixed(1)+'" text-anchor="end">'+esc(formatValue(v,model.unit))+'</text>';}).join('');
    var xSpan=Math.max(1,series.length-1);
    var labels=series.map(function(d,i){var x=L+(W-L-R)*(i/xSpan);return '<text class="timeline-x v12-xlabel" x="'+x.toFixed(1)+'" y="'+(H-10)+'" text-anchor="middle">'+esc(d.label)+'</text>';}).join('');
    var curDots=cur.dots.map(function(p){return '<circle class="timeline-dot v12-current-dot" cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="4.4"></circle>';}).join('');
    var priorDots=pri.dots.map(function(p){return '<circle class="timeline-prior-dot v12-prior-dot" cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="3"></circle>';}).join('');
    var area='';
    if(cur.dots.length){
      var baseY=(H-B).toFixed(1),poly=L+','+baseY+' '+cur.points+' '+(W-R)+','+baseY;
      area='<polygon class="v12-current-area" points="'+poly+'"></polygon>';
    }
    return '<div class="timeline v12-timeline"><div class="timeline-head v12-timeline-head"><div class="timeline-title">'+esc(model.measureLabel)+' by period</div><div class="timeline-legend"><span class="legend-item"><i class="legend-swatch prior"></i>Prior</span><span class="legend-item"><i class="legend-swatch"></i>Current</span></div></div><svg class="timeline-svg v12-timeline-svg" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none">'+grid+area+'<polyline class="timeline-prior v12-prior" pathLength="1" points="'+pri.points+'"></polyline>'+priorDots+'<polyline class="timeline-current v12-current" pathLength="1" points="'+cur.points+'"></polyline>'+curDots+labels+'</svg></div>';
  };

  WHYWidget.prototype._heroSignalHtml=function(model,analysis,group){
    if(!group){
      var dims=model.dimAliases.map(function(a){return '<span>'+esc(model.dimLabels[a]||a)+'</span>';}).join('');
      return '<div class="v9-distributed v10-distributed v12-distributed"><div class="v9-distributed-mark">≈</div><div><b>No material signal stands out</b><p>The change is broadly distributed across the bound dimensions.</p><div class="v9-dim-chips">'+dims+'</div></div></div>';
    }
    var c=group.lead,key=candidateKey(c),life=lifecycleKind(c),name=c.assignments.map(function(a){return a.label;}).join(' × '),isDominant=analysis.classification==='dominant'&&key===analysis.editorialSignalKey,role=v10RoleLabel(group,analysis),impactDir=v10DirectionClass(c.impactRate);
    var kicker=isDominant?'Dominant driver':'Selected signal';
    var lifeHtml=life?'<span class="v12-life" title="'+esc(lifecycleHelp(life))+'">'+esc(lifecycleLabel(life))+'</span>':'';
    var context=life?(formatValue(c.prior,model.unit)+' → '+formatValue(c.current,model.unit)):(formatPctRatio(c.deltaPct)+' vs '+formatPctRatio(analysis.overallRate)+' overall');
    var related=(group.evidence||[]).length?'<div class="v12-related">Seen in <b>'+(group.evidence||[]).length+'</b> related view'+((group.evidence||[]).length===1?'':'s')+'.</div>':'';
    var roleHtml='<span class="v12-role '+v10RoleClass(role)+'"><i></i>'+esc(v12PrettyRole(role))+'</span>';
    return '<section class="v12-hero"><div class="v12-hero-left"><div class="v12-kicker">'+esc(kicker)+'</div><div class="v12-signal-name">'+esc(name)+'</div><div class="v12-dimension-type">'+esc(v9DimensionType(model,c))+'</div><div class="v12-tags">'+roleHtml+lifeHtml+'</div><div class="v12-impact '+impactDir+'">'+esc(formatPp(c.impactRate))+'</div><div class="v12-impact-label">Impact on total rate</div><div class="v12-context">'+esc(context)+'</div><div class="v12-metrics"><div><small>Trend baseline</small><b>'+esc(formatDelta(c.expectedDelta,model.unit))+'</b></div><div><small>Actual change</small><b>'+esc(formatDelta(c.delta,model.unit))+'</b></div><div><small>Gap to trend</small><b>'+esc(formatDelta(c.surprise,model.unit))+'</b></div></div>'+related+'</div><div class="v12-hero-chart">'+this._timelineHtml(model,c)+'</div></section>';
  };

  function v12Explanation(model,analysis,group){
    if(!group||!group.lead)return '';
    var c=group.lead,role=v10RoleLabel(group,analysis),related=(group.evidence||[]).length;
    return '<div class="v12-explain"><div class="v12-explain-main">'+v12ReasonIcon()+'<div><span>Why this signal matters</span><p>'+v10SignalSentence(model,analysis,group)+'</p></div></div><div class="v12-explain-facts"><div><small>Dimension</small><b>'+esc(v9DimensionType(model,c))+'</b></div><div><small>Signal role</small><b>'+esc(v12PrettyRole(role))+'</b></div><div><small>Related views</small><b>'+related+'</b></div></div></div>';
  }

  WHYWidget.prototype._supportHtml=function(model,analysis,selectedGroup){
    var groups=(analysis.topSignalGroups||[]).slice(0,5),selectedKey=selectedGroup?candidateKey(selectedGroup.lead):'',maxImpact=groups.reduce(function(m,g){return Math.max(m,candidateImpact(g.lead));},0)||1;
    if(!groups.length)return '';
    var cards=groups.map(function(group,index){
      var c=group.lead,key=candidateKey(c),name=c.assignments.map(function(a){return a.label;}).join(' × '),life=lifecycleKind(c),role=v10RoleLabel(group,analysis),ctx=life?(formatValue(c.prior,model.unit)+' → '+formatValue(c.current,model.unit)):(formatPctRatio(c.deltaPct)+' vs '+formatPctRatio(analysis.overallRate)+' overall'),dir=v10DirectionClass(c.impactRate);
      var lifeHtml=life?'<span class="v12-card-life">'+esc(lifecycleLabel(life))+'</span>':'';
      return '<button type="button" class="v12-card '+(key===selectedKey?'selected':'')+'" data-signal-key="'+esc(key)+'" style="--delay:'+(100+index*55)+'ms"><div class="v12-card-top"><div class="v12-card-name" title="'+esc(name)+'">'+esc(name)+'</div><span class="v12-card-arrow">›</span></div><div class="v12-card-dim">'+esc(v9DimensionType(model,c))+'</div><div class="v12-card-tags"><span class="v12-card-role '+v10RoleClass(role)+'"><i></i>'+esc(v12PrettyRole(role))+'</span>'+lifeHtml+'</div><div class="v12-card-context">'+esc(ctx)+'</div><div class="v12-card-bottom">'+v12Sparkline(model,c,dir)+'<div class="v12-card-impact '+dir+'">'+esc(formatPp(c.impactRate))+'</div></div></button>';
    }).join('');
    return '<section class="v12-signals"><div class="v12-signal-head"><b>Signals</b><span>Select a signal to explore</span></div><div class="v12-signal-grid">'+cards+'</div></section>'+v12Explanation(model,analysis,selectedGroup);
  };

  WHYWidget.prototype._resultHtml=function(model,analysis){
    var group=this._selectedGroup(analysis);
    return '<div class="v12-result '+(this._animateReveal?'reveal-burst':'')+'"><div class="v12-answer">'+v12InsightIcon()+'<div>'+this._answerText(analysis)+'</div></div>'+this._heroSignalHtml(model,analysis,group)+this._supportHtml(model,analysis,group)+'</div>';
  };

  WHYWidget.prototype._idleHtml=function(model,analysis){
    var dims=model.dimAliases.map(function(a){return '<span>'+esc(model.dimLabels[a]||a)+'</span>';}).join('');
    var rateDir=v10DirectionClass(analysis.totalDeltaPct);
    return '<div class="v12-idle"><div class="v12-idle-main">'+v9LensSvg('v12-lens')+'<div class="v12-idle-title">What stands out behind this change?</div><div class="v12-dim-chips">'+dims+'</div><div class="v12-ready">'+analysis.dimensionCount+' dimensions connected · Press WHY? to reveal the strongest signals</div></div><div class="v12-preview-grid"><div class="v12-preview trend"><div class="v12-preview-head"><b>'+esc(model.measureLabel)+' trend</b><span>Current vs prior</span></div>'+whyMiniTrend(model)+'</div><div class="v12-preview yoy"><div class="v12-preview-head"><b>YoY change</b><span>'+esc(model.currentScopeLabel)+'</span></div><div class="v12-preview-yoy '+rateDir+'">'+esc(formatPctRatio(analysis.totalDeltaPct))+'</div><div class="v12-preview-sub">'+esc(formatDelta(analysis.totalDelta,model.unit))+' total variance</div></div><div class="v12-preview period"><div class="v12-preview-head"><b>Period coverage</b><span>YoY</span></div><div class="v12-period"><b>'+esc(model.currentScopeLabel)+'</b><span>vs</span><b>'+esc(model.priorScopeLabel)+'</b></div></div></div></div>';
  };

  WHYWidget.prototype._scanHtml=function(model,analysis){
    var step=Math.max(0,Math.min(2,Number(this._scanStep)||0));
    function sc(i){return i<step?'done':i===step?'active':'';}
    function dot(i){return i<step?'✓':String(i+1);}
    return '<div class="v12-scan"><div class="v12-scan-inner">'+v9LensSvg('v12-scan-lens')+'<div class="v12-scan-title">Analyzing variance signals</div><div class="v12-scan-sub">Turning '+analysis.dimensionCount+' dimensions into a ranked executive view.</div><div class="v12-progress"><div class="v12-step '+sc(0)+'"><span>'+dot(0)+'</span><b>Scan dimensions</b><small>Compare period-aligned movement</small></div><div class="v12-step '+sc(1)+'"><span>'+dot(1)+'</span><b>Connect related signals</b><small>Consolidate overlapping views</small></div><div class="v12-step '+sc(2)+'"><span>'+dot(2)+'</span><b>Reveal what matters</b><small>Rank material impact</small></div></div></div></div>';
  };

  STYLES += `
    /* v0.12.0 - premium executive visual system */
    :host{--v12-navy:#062f55;--v12-navy2:#07527f;--v12-blue:#0a6ed1;--v12-cyan:#20b6ef;--v12-ink:#071f38;--v12-soft:#f5fbff;--v12-line:#b9e2f7;--v12-green:#0f914f;--v12-red:#df3d43;--v12-red-soft:#ff7e82;--v12-green-soft:#45cf8a}
    .v10-shell{border:1px solid #b9e2f7!important;border-radius:15px!important;box-shadow:0 14px 36px rgba(1,72,125,.10)!important;background:#fff!important;overflow:hidden!important}
    .v10-top{height:72px!important;padding:0 22px!important;border-bottom:1px solid #cae9f8!important;background:linear-gradient(180deg,#fff 0%,#fbfeff 100%)!important}
    .v10-brand{gap:13px!important}.v10-brand .v9-brand-icon{width:40px!important;height:40px!important;animation:v12Cube 3.2s cubic-bezier(.2,.8,.2,1) infinite!important;filter:drop-shadow(0 8px 16px rgba(10,110,209,.22))!important}.v10-brand .v9-brand-icon svg{width:38px!important;height:38px!important}
    .v10-wordmark{font-size:38px!important;line-height:1!important;letter-spacing:-.055em!important;font-weight:950!important;background:linear-gradient(120deg,#064a85,#0a6ed1 58%,#19aee9)!important;-webkit-background-clip:text!important;background-clip:text!important;color:transparent!important}
    .v10-brand>span{font-size:16px!important;font-weight:780!important;color:#215f8e!important;border-left:1px solid #9bd6f3;padding-left:16px!important}
    .v10-info-button{width:36px!important;height:36px!important;font-size:17px!important;border:1px solid #70c5ef!important;color:#0a6ed1!important;background:#fff!important}
    @keyframes v12Cube{0%,74%,100%{transform:rotate(0deg) scale(1)}84%{transform:rotate(-4deg) scale(1.055)}92%{transform:rotate(0deg) scale(1)}}

    .v10-kpi{margin:0 22px!important;padding:18px 0!important;min-height:92px!important;border-bottom:1px solid #c9e9f8!important}
    .v10-kpi .measure-block{min-width:270px!important}.v10-kpi .measure-label{font-size:13px!important}.v10-kpi .measure-name{font-size:25px!important}.v10-kpi .compare{font-size:14px!important}.v10-kpi .variance{padding-left:30px!important;gap:18px!important}.v10-kpi .delta-big{font-size:42px!important}.v10-kpi .delta-pct{font-size:22px!important}.v10-run{height:56px!important;min-width:148px!important;font-size:18px!important;border-radius:12px!important;background:linear-gradient(135deg,#1596e8,#075bc7)!important;box-shadow:0 12px 26px rgba(10,110,209,.26)!important}

    .v12-result{padding:14px 20px 24px;background:linear-gradient(180deg,#fff 0%,#fbfeff 100%)}
    .v12-answer{display:flex;align-items:center;gap:13px;padding:11px 14px;margin-bottom:12px;border:1px solid #c9e9f8;border-radius:10px;background:linear-gradient(90deg,#f3fbff,#fff);font-size:16px;color:#164f79;line-height:1.35}.v12-answer b{font-size:18px;color:var(--v12-ink);letter-spacing:-.012em}.v12-insight-icon{width:34px;height:34px;border-radius:9px;background:#e9f7ff;display:grid;place-items:center;flex:0 0 auto}.v12-insight-icon svg{width:20px;height:20px;fill:none;stroke:#0a6ed1;stroke-width:2.3;stroke-linecap:round;stroke-linejoin:round}

    .v12-hero{display:grid;grid-template-columns:minmax(300px,35%) minmax(0,65%);gap:30px;padding:24px 26px 22px;border-radius:14px;background:radial-gradient(circle at 78% 12%,rgba(22,174,236,.24),transparent 34%),linear-gradient(135deg,#052b50 0%,#064572 54%,#075b8d 100%);box-shadow:0 18px 42px rgba(0,47,84,.19);border-top:2px solid #23b9ef;position:relative;overflow:hidden}.v12-hero:after{content:'';position:absolute;inset:0;background:linear-gradient(115deg,transparent 0%,rgba(255,255,255,.035) 40%,transparent 58%);pointer-events:none}.v12-hero-left,.v12-hero-chart{position:relative;z-index:1;min-width:0}.v12-kicker{font-size:13px;font-weight:850;color:#a7e5fb;letter-spacing:.04em;text-transform:uppercase}.v12-signal-name{font-size:29px;line-height:1.06;font-weight:950;color:#fff;letter-spacing:-.03em;margin-top:6px}.v12-dimension-type{font-size:14px;color:#b8e8fb;font-weight:760;margin-top:7px}.v12-tags{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px}.v12-role,.v12-life{display:inline-flex;align-items:center;gap:7px;border-radius:999px;padding:5px 10px;font-size:12px;font-weight:850;border:1px solid rgba(255,255,255,.22);color:#eefaff;background:rgba(255,255,255,.07)}.v12-role i{width:7px;height:7px;border-radius:50%;background:#20b6ef}.v12-role.negative i{background:#ff7177}.v12-role.positive i{background:#43cf88}.v12-role.dominant i{background:#20b6ef}.v12-life{border-color:#65c8ef;background:rgba(10,110,209,.2)}
    .v12-impact{font-size:48px;line-height:.95;font-weight:950;letter-spacing:-.045em;margin-top:14px}.v12-impact.negative{color:#ff7f82}.v12-impact.positive{color:#55d798}.v12-impact.neutral{color:#fff}.v12-impact-label{font-size:14px;font-weight:820;color:#9eddf8;margin-top:8px}.v12-context{font-size:16px;font-weight:800;color:#fff;margin-top:9px}.v12-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;border-top:1px solid rgba(154,224,250,.34);margin-top:16px;padding-top:13px}.v12-metrics small{display:block;font-size:13px;color:#9eddf8;font-weight:800}.v12-metrics b{display:block;font-size:18px;color:#fff;margin-top:4px}.v12-related{margin-top:11px;font-size:13px;color:#b4e7fa;font-weight:760}
    .v12-hero-chart{display:flex;align-items:center}.v12-timeline{width:100%}.v12-timeline-head{margin-bottom:6px}.v12-timeline .timeline-title{font-size:16px!important;color:#fff!important;font-weight:850!important}.v12-timeline .timeline-legend{font-size:13px!important;color:#d9f2fc!important;gap:18px!important}.v12-timeline-svg{height:235px!important;overflow:visible}.v12-grid{stroke:rgba(164,224,248,.16);stroke-width:1}.v12-ylabel{fill:#c5eaf9;font-size:11px;font-weight:700}.v12-xlabel{fill:#d7f3fd!important;font-size:12px!important;font-weight:800!important}.v12-current-area{fill:rgba(32,182,239,.08)}.v12-current{stroke:#20b6ef!important;stroke-width:4!important}.v12-prior{stroke:#8cccec!important;stroke-width:2.2!important;stroke-dasharray:5 5!important}.v12-current-dot{fill:#20b6ef!important;stroke:#fff!important;stroke-width:2!important}.v12-prior-dot{fill:#8cccec!important}

    .v12-signals{margin-top:14px}.v12-signal-head{display:flex;justify-content:space-between;align-items:center;margin:0 2px 9px}.v12-signal-head b{font-size:17px;color:var(--v12-ink)}.v12-signal-head span{font-size:13px;color:#316f98;font-weight:700}.v12-signal-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}.v12-card{appearance:none;text-align:left;border:1px solid #b8e3f8;background:#fff;border-radius:11px;padding:12px 13px;height:150px;display:grid;grid-template-rows:25px 20px 24px 22px 36px;row-gap:2px;min-width:0;color:var(--v12-ink);font:inherit;cursor:pointer;transition:.18s ease;box-shadow:0 5px 14px rgba(0,77,133,.045)}.v12-card:hover{transform:translateY(-1px);box-shadow:0 11px 24px rgba(0,83,143,.10)}.v12-card.selected{border:2px solid #0a6ed1;padding:11px 12px;background:#f5fbff;box-shadow:0 0 0 1px rgba(10,110,209,.09),0 12px 25px rgba(10,110,209,.12)}.v12-card-top{display:flex;align-items:center;gap:6px;min-width:0}.v12-card-name{font-size:15px;line-height:20px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}.v12-card-arrow{margin-left:auto;font-size:22px;line-height:1;color:#0a6ed1}.v12-card-dim{font-size:12.5px;color:#276992;font-weight:760;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.v12-card-tags{display:flex;gap:6px;align-items:center;min-width:0;overflow:hidden}.v12-card-role{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:850;white-space:nowrap}.v12-card-role i{width:6px;height:6px;border-radius:50%;background:#20b6ef}.v12-card-role.negative{color:#c8353c}.v12-card-role.negative i{background:#df3d43}.v12-card-role.positive{color:#0b7b43}.v12-card-role.positive i{background:#0f914f}.v12-card-role.dominant{color:#075bc7}.v12-card-life{padding:3px 7px;border-radius:6px;background:#eaf7ff;color:#075b96;font-size:10.5px;font-weight:850;white-space:nowrap}.v12-card-context{font-size:12.5px;font-weight:760;color:#255e86;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.v12-card-bottom{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:end}.v12-spark{width:100%;height:30px;overflow:visible}.v12-spark-path{fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}.v12-spark-path.negative{stroke:#df3d43}.v12-spark-path.positive{stroke:#0f914f}.v12-spark-path.neutral{stroke:#0a6ed1}.v12-spark-empty{height:30px}.v12-card-impact{font-size:18px;font-weight:950;white-space:nowrap}.v12-card-impact.negative{color:#df3d43}.v12-card-impact.positive{color:#0f914f}.v12-card-impact.neutral{color:#0a6ed1}

    .v12-explain{margin-top:14px;border:1px solid #c7e8f8;border-radius:11px;background:linear-gradient(180deg,#fff,#f9fdff);padding:14px 16px;display:grid;grid-template-columns:minmax(0,1.65fr) minmax(360px,.85fr);gap:18px;align-items:center}.v12-explain-main{display:grid;grid-template-columns:42px minmax(0,1fr);gap:12px;align-items:center}.v12-reason-icon{width:40px;height:40px;border-radius:50%;border:1px solid #74c8ef;background:#effaff;display:grid;place-items:center}.v12-reason-icon svg{width:22px;height:22px;fill:none;stroke:#0a6ed1;stroke-width:2.1;stroke-linecap:round;stroke-linejoin:round}.v12-explain-main span{font-size:15px;font-weight:900;color:var(--v12-ink)}.v12-explain-main p{font-size:14px;line-height:1.48;color:#174f78;margin:4px 0 0}.v12-explain-facts{display:grid;grid-template-columns:1.45fr 1fr .65fr;border-left:1px solid #c9e8f8;min-width:0}.v12-explain-facts>div{padding:0 14px;border-left:1px solid #d5eef9;min-width:0}.v12-explain-facts>div:first-child{border-left:0}.v12-explain-facts small{display:block;font-size:11.5px;color:#34749d;font-weight:800}.v12-explain-facts b{display:block;font-size:13px;color:var(--v12-ink);margin-top:4px;line-height:1.3;white-space:normal}

    .v12-idle{min-height:560px;padding:12px 20px 22px;display:grid;grid-template-rows:minmax(345px,1fr) 118px;gap:14px;background:linear-gradient(180deg,#fff 0%,#fcfeff 72%,#f3fbff 100%)}.v12-idle-main{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;min-width:0}.v12-lens{height:220px!important;max-width:1120px!important}.v12-lens .v9-wave{animation:v12Wave 8s ease-in-out infinite;transform-box:fill-box;transform-origin:center}.v12-lens .v9-wave.w2{animation-delay:-2s}.v12-lens .v9-wave.w3{animation-delay:-4s}.v12-lens .v9-ring{animation:v12Ring 3.4s ease-in-out infinite}.v12-idle-title{font-size:32px;font-weight:950;color:var(--v12-ink);letter-spacing:-.035em;margin-top:-6px}.v12-dim-chips{display:flex;gap:9px;flex-wrap:wrap;justify-content:center;margin-top:12px}.v12-dim-chips span{min-height:36px;display:inline-flex;align-items:center;padding:0 14px;border-radius:999px;border:1px solid #8ed4f5;background:#f5fbff;color:#075c96;font-size:15px;font-weight:850}.v12-ready{margin-top:12px;font-size:14px;color:#326f98;font-weight:760}.v12-preview-grid{display:grid;grid-template-columns:1.5fr .8fr 1.2fr;gap:12px}.v12-preview{height:118px;border:1px solid #b9e3f8;border-radius:12px;background:#fff;padding:12px 14px;box-shadow:0 7px 18px rgba(0,84,143,.05);overflow:hidden}.v12-preview-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px}.v12-preview-head b{font-size:14px;color:var(--v12-ink)}.v12-preview-head span{font-size:12px;color:#32719b;font-weight:760;white-space:nowrap}.v12-preview .v81-spark{height:72px!important}.v12-preview-yoy{font-size:32px;font-weight:950;line-height:1;margin-top:8px}.v12-preview-yoy.negative{color:#df3d43}.v12-preview-yoy.positive{color:#0f914f}.v12-preview-yoy.neutral{color:#0a6ed1}.v12-preview-sub{font-size:13px;margin-top:8px;color:#2d6992;font-weight:760}.v12-period{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;margin-top:22px}.v12-period b{font-size:15px;color:var(--v12-ink);line-height:1.25}.v12-period span{font-size:13px;color:#35759e;font-weight:800}
    @keyframes v12Wave{0%,100%{transform:translateY(0) scaleY(1)}50%{transform:translateY(2px) scaleY(1.035)}}@keyframes v12Ring{0%,75%,100%{opacity:.5;transform:scale(1)}86%{opacity:.9;transform:scale(1.025)}}

    .v12-scan{min-height:560px;display:grid;place-items:center;padding:18px 28px;background:linear-gradient(180deg,#fff,#f4fbff)}.v12-scan-inner{width:min(900px,94%);text-align:center}.v12-scan-lens{height:210px!important}.v12-scan-lens .v9-wave{animation:v12Wave 6s ease-in-out infinite}.v12-scan-title{font-size:32px;font-weight:950;letter-spacing:-.03em;color:var(--v12-ink)}.v12-scan-sub{font-size:16px;color:#316f98;margin-top:8px}.v12-progress{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:30px}.v12-step{padding:13px 12px;border-top:2px solid #cceafa;text-align:left}.v12-step>span{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:#effaff;color:#0a6ed1;font-size:14px;font-weight:900;border:1px solid #8ed2f4}.v12-step b{display:block;margin-top:9px;font-size:15px;color:var(--v12-ink)}.v12-step small{display:block;margin-top:4px;font-size:13px;color:#3b759c;line-height:1.35}.v12-step.active{border-top-color:#0a6ed1}.v12-step.active>span{background:#0a6ed1;color:#fff;box-shadow:0 6px 16px rgba(10,110,209,.18)}.v12-step.done{border-top-color:#20b6ef}.v12-step.done>span{background:#eafaff;color:#0a6ed1}

    @media(max-width:1150px){.v12-hero{grid-template-columns:1fr}.v12-signal-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.v12-explain{grid-template-columns:1fr}.v12-explain-facts{border-left:0;border-top:1px solid #d4edf9;padding-top:12px}.v12-preview-grid{grid-template-columns:repeat(3,minmax(220px,1fr));overflow-x:auto}.v12-timeline-svg{height:220px!important}}
    @media(max-width:760px){.v12-signal-grid{grid-template-columns:1fr}.v12-preview-grid{grid-template-columns:1fr}.v12-explain-facts{grid-template-columns:1fr}.v12-explain-facts>div{border-left:0;border-top:1px solid #d5eef9;padding:10px 0}.v12-impact{font-size:42px}.v12-signal-name{font-size:24px}.v12-idle-title{font-size:27px}.v12-progress{grid-template-columns:1fr}}
    @media(prefers-reduced-motion:reduce){.v10-brand .v9-brand-icon,.v12-lens .v9-wave,.v12-lens .v9-ring,.v12-scan-lens .v9-wave{animation:none!important}}
  `;



  /* ================================================================
   * v0.13.0 - EXECUTIVE CLARITY + FAMILY MOTION PASS
   * User-feedback pass only. Signal mathematics and ranking stay intact.
   * Adds transparent related-view evidence, stronger native-unit handling,
   * a Hierarchy Pulse family mark, cleaner KPI hierarchy and a calmer CTA.
   * ================================================================ */

  function v13NormalizeUnit(value){
    if(value==null)return '';
    if(typeof value==='object'){
      var objectKeys=['id','code','currency','unit','unitCode','symbol','value','label','text'];
      for(var oi=0;oi<objectKeys.length;oi++){
        if(Object.prototype.hasOwnProperty.call(value,objectKeys[oi])){
          var nested=v13NormalizeUnit(value[objectKeys[oi]]);
          if(nested)return nested;
        }
      }
      return '';
    }
    var raw=String(value).trim();
    if(!raw)return '';
    var detected=detectUnitFromText(raw);
    if(detected)return detected;
    if(raw==='€')return 'EUR';
    if(raw==='$')return 'USD';
    if(raw==='£')return 'GBP';
    if(raw==='¥')return 'JPY';
    var upper=raw.toUpperCase();
    if(/^[A-Z]{3}$/.test(upper))return upper;
    if(/^(CURRENCY|UNIT|MEASURE|NONE|NULL|UNDEFINED)$/i.test(raw))return '';
    if(raw.length<=10 && /^[A-Za-z0-9°%/_-]+$/.test(raw))return raw;
    return '';
  }

  function v13SearchNestedUnit(root){
    var stack=[root],seen=[];
    while(stack.length){
      var obj=stack.pop();
      if(!obj||typeof obj!=='object'||seen.indexOf(obj)>=0)continue;
      seen.push(obj);
      var keys=Object.keys(obj);
      for(var i=0;i<keys.length;i++){
        var key=keys[i],value=obj[key];
        if(/unit|currency/i.test(key)){
          var found=v13NormalizeUnit(value);
          if(found)return found;
        }
        if(value&&typeof value==='object')stack.push(value);
      }
    }
    return '';
  }

  unitFromBinding=function(binding,alias){
    var members=binding&&binding.metadata&&binding.metadata.mainStructureMembers;
    var meta=members&&members[alias];
    var directKeys=['unit','currency','unitOfMeasure','currencyUnit','unitCode','measureUnit','displayUnit'];
    if(meta){
      for(var i=0;i<directKeys.length;i++){
        var direct=v13NormalizeUnit(meta[directKeys[i]]);
        if(direct)return direct;
      }
      var nested=v13SearchNestedUnit(meta);
      if(nested)return nested;
      var metaText=detectUnitFromText([meta.formatted,meta.formattedValue,meta.description,meta.label].filter(Boolean).join(' '));
      if(metaText)return metaText;
    }
    var rows=binding&&binding.data||[];
    for(var r=0;r<rows.length;r++){
      var cell=rows[r]&&rows[r][alias];
      if(!cell)continue;
      for(var ck=0;ck<directKeys.length;ck++){
        var cellUnit=v13NormalizeUnit(cell[directKeys[ck]]);
        if(cellUnit)return cellUnit;
      }
      var nestedCell=v13SearchNestedUnit(cell);
      if(nestedCell)return nestedCell;
      var foundText=detectUnitFromText([cell.formatted,cell.formattedValue,cell.displayValue,cell.label].filter(Boolean).join(' '));
      if(foundText)return foundText;
    }
    return '';
  };

  function v13PulseMark(){
    return '<span class="v13-family-pulse" aria-hidden="true" title="Hierarchy Pulse family"><svg viewBox="0 0 28 22"><path class="track" d="M1 12h5l2.3-7 4.2 14 3.2-10 2.5 6H27"></path><path pathLength="1" class="run" d="M1 12h5l2.3-7 4.2 14 3.2-10 2.5 6H27"></path></svg></span>';
  }

  function v13EvidenceName(candidate){
    return (candidate&&candidate.assignments||[]).map(function(a){return a.label;}).join(' × ');
  }

  function v13RelatedViewsHtml(model,group){
    var evidence=(group&&group.evidence||[]).slice(0,8);
    if(!evidence.length)return '';
    var rows=evidence.map(function(e){
      var dir=v10DirectionClass(e.impactRate),name=v13EvidenceName(e),dim=v9DimensionType(model,e);
      return '<div class="v13-related-row"><div><b>'+esc(name)+'</b><span>'+esc(dim)+'</span></div><strong class="'+esc(dir)+'">'+esc(formatPp(e.impactRate))+'</strong></div>';
    }).join('');
    return '<details class="v13-related"><summary><span>Related evidence</span><b>'+evidence.length+' view'+(evidence.length===1?'':'s')+'</b><em>View</em></summary><div class="v13-related-list">'+rows+'</div></details>';
  }

  function v13SignalSentence(model,analysis,group){
    if(!group||!group.lead)return '';
    var c=group.lead,name=v13EvidenceName(c),life=lifecycleKind(c),impact=formatPp(c.impactRate),actual=formatPctRatio(c.deltaPct),overall=formatPctRatio(analysis.overallRate);
    if(analysis.classification==='dominant'&&candidateKey(c)===analysis.editorialSignalKey){
      return '<b>'+esc(name)+'</b> has the largest measured impact on the total rate at <b class="v13-inline '+v10DirectionClass(c.impactRate)+'">'+esc(impact)+'</b>. The other material signals are meaningfully smaller.';
    }
    if(life==='disappeared')return '<b>'+esc(name)+'</b> is no longer present in the current period. The move from <b>'+esc(formatValue(c.prior,model.unit))+'</b> to <b>'+esc(formatValue(c.current,model.unit))+'</b> may reflect business movement or a structural data change.';
    if(life==='new')return '<b>'+esc(name)+'</b> is new in the current period. The move from <b>'+esc(formatValue(c.prior,model.unit))+'</b> to <b>'+esc(formatValue(c.current,model.unit))+'</b> may reflect business movement or a structural data change.';
    if(analysis.overallRate>0&&c.impactRate<0)return '<b>'+esc(name)+'</b> moved '+esc(actual)+' while the overall result moved '+esc(overall)+'. Its measured impact lowers the total growth rate by <b class="v13-inline negative">'+esc(impact)+'</b>.';
    if(analysis.overallRate<0&&c.impactRate>0)return '<b>'+esc(name)+'</b> moved '+esc(actual)+' while the overall result moved '+esc(overall)+'. Its measured impact offsets <b class="v13-inline positive">'+esc(impact.replace(/^\+/,''))+'</b> of the decline.';
    return '<b>'+esc(name)+'</b> moved '+esc(actual)+' versus '+esc(overall)+' overall and changes the total rate by <b class="v13-inline '+v10DirectionClass(c.impactRate)+'">'+esc(impact)+'</b>.';
  }

  WHYWidget.prototype._ensure=function(){
    if(this.shadowRoot)return;
    this.attachShadow({mode:'open'});
    var info='<div id="why-info-pop" class="info-popover v9-info v10-info v13-info" role="dialog" aria-label="About WHY"><b>How WHY works</b><p>WHY analyzes the bound SAC result set, compares period-aligned segment movement, consolidates overlapping findings and ranks material signals by measured impact on the total rate.</p><dl><dt>Trend baseline</dt><dd>Change the segment would show if it followed the overall trend.</dd><dt>Actual change</dt><dd>Observed change versus the comparison period.</dd><dt>Gap to trend</dt><dd>Difference between actual change and the trend baseline.</dd><dt>Related evidence</dt><dd>Grouped overlapping views are listed directly on the selected signal, so the evidence can be inspected.</dd><dt>Color</dt><dd>Green and red indicate positive or negative impact direction. They do not imply business favorability.</dd><dt>New / Disappeared</dt><dd>Lifecycle flags that can reflect genuine business movement or structural/master-data changes.</dd></dl><div class="info-meta">Deterministic signal logic · no AI required · signals, not causality</div></div>';
    this.shadowRoot.innerHTML='<style>'+STYLES+'</style><div class="why v9-shell v10-shell v13-shell"><div class="top v9-top v10-top v13-top"><div class="brand v9-brand v10-brand v13-brand">'+v9BrandIcon()+'<strong class="v9-wordmark v10-wordmark v13-wordmark">WHY</strong><span>Variance Signal Analysis</span></div><div class="v13-top-tools">'+v13PulseMark()+'<button id="why-info" class="info-button v9-info-button v10-info-button v13-info-button" type="button" aria-label="About WHY" aria-expanded="false">i</button></div>'+info+'</div><div id="root"></div></div>';
  };

  WHYWidget.prototype._heroHtml=function(model,analysis){
    var measureControl='';
    if(model.measureOptions.length>1){
      measureControl='<select id="why-measure" class="measure-select v13-measure-select">'+model.measureOptions.map(function(o){return '<option value="'+esc(o.alias)+'"'+(o.alias===model.measureAlias?' selected':'')+'>'+esc(o.label)+'</option>';}).join('')+'</select>';
    }else measureControl='<div class="measure-name v13-measure-name">'+esc(model.measureLabel)+'</div>';
    var d=v10DirectionClass(analysis.totalDeltaPct);
    var unitNote=model.unit?'':'<span class="v13-unit-note" title="The bound measure did not provide a unit or currency.">Unit not supplied by model</span>';
    return '<div class="hero v10-kpi v13-kpi"><div class="v13-measure-block"><div class="measure-label">Measure</div>'+measureControl+'<div class="v13-scope">'+esc(model.currentScopeLabel)+' <span>vs</span> '+esc(model.priorScopeLabel)+'</div>'+unitNote+'</div><div class="v13-kpi-metrics"><div class="v13-kpi-cell"><small>Total variance</small><strong class="'+d+'">'+esc(formatDelta(analysis.totalDelta,model.unit))+'</strong></div><div class="v13-kpi-cell rate"><small>YoY change</small><strong class="'+d+'">'+esc(formatPctRatio(analysis.totalDeltaPct))+'</strong></div></div><button id="why-run" class="why-btn v10-run v13-run" type="button"><span class="v13-run-main">WHY?</span><span class="v13-run-sub">Analyze</span><span class="v13-run-arrow">→</span></button></div>';
  };

  WHYWidget.prototype._answerText=function(analysis){
    var groups=analysis.topSignalGroups||[];
    if(!groups.length)return '<b>No material signal stands out.</b> The change is broadly distributed across the bound dimensions.';
    if(analysis.classification==='dominant'){
      var g=groupForKey(groups,analysis.editorialSignalKey)||groups[0],c=g.lead,name=v13EvidenceName(c),movement=analysis.overallRate<0?'decline':(analysis.overallRate>0?'increase':'change');
      return '<b>One dominant signal stands out in the '+movement+'.</b> '+esc(name)+' has a measured impact of <span class="v13-inline '+v10DirectionClass(c.impactRate)+'">'+esc(formatPp(c.impactRate))+'</span> on the total rate.';
    }
    if(analysis.classification==='mixed')return '<b>No single signal dominates.</b> Several material movements are affecting the total rate.';
    return '<b>No material signal stands out.</b> The change is broadly distributed across the bound dimensions.';
  };

  WHYWidget.prototype._heroSignalHtml=function(model,analysis,group){
    if(!group){
      var dims=model.dimAliases.map(function(a){return '<span>'+esc(model.dimLabels[a]||a)+'</span>';}).join('');
      return '<div class="v9-distributed v10-distributed v12-distributed v13-distributed"><div class="v9-distributed-mark">≈</div><div><b>No material signal stands out</b><p>The change is broadly distributed across the bound dimensions.</p><div class="v9-dim-chips">'+dims+'</div></div></div>';
    }
    var c=group.lead,key=candidateKey(c),life=lifecycleKind(c),name=v13EvidenceName(c),isDominant=analysis.classification==='dominant'&&key===analysis.editorialSignalKey,role=v10RoleLabel(group,analysis),impactDir=v10DirectionClass(c.impactRate);
    var kicker=isDominant?'Dominant driver':'Selected signal';
    var lifeHtml=life?'<span class="v12-life" title="'+esc(lifecycleHelp(life))+'">'+esc(lifecycleLabel(life))+'</span>':'';
    var context=life?(formatValue(c.prior,model.unit)+' → '+formatValue(c.current,model.unit)):(formatPctRatio(c.deltaPct)+' vs '+formatPctRatio(analysis.overallRate)+' overall');
    var roleHtml='<span class="v12-role '+v10RoleClass(role)+'"><i></i>'+esc(v12PrettyRole(role))+'</span>';
    return '<section class="v12-hero v13-hero"><div class="v12-hero-left v13-hero-left"><div class="v12-kicker">'+esc(kicker)+'</div><div class="v12-signal-name">'+esc(name)+'</div><div class="v12-dimension-type">'+esc(v9DimensionType(model,c))+'</div><div class="v12-tags">'+roleHtml+lifeHtml+'</div><div class="v12-impact '+impactDir+'">'+esc(formatPp(c.impactRate))+'</div><div class="v12-impact-label">Impact on total rate</div><div class="v12-context">'+esc(context)+'</div><div class="v12-metrics v13-metrics"><div><small>Trend baseline</small><b>'+esc(formatDelta(c.expectedDelta,model.unit))+'</b></div><div><small>Actual change</small><b>'+esc(formatDelta(c.delta,model.unit))+'</b></div><div><small>Gap to trend</small><b>'+esc(formatDelta(c.surprise,model.unit))+'</b></div></div>'+v13RelatedViewsHtml(model,group)+'</div><div class="v12-hero-chart v13-hero-chart">'+this._timelineHtml(model,c)+'</div></section>';
  };

  function v13Explanation(model,analysis,group){
    if(!group||!group.lead)return '';
    var c=group.lead,role=v10RoleLabel(group,analysis),related=(group.evidence||[]).length;
    var evidenceText=related?(related+' inspectable view'+(related===1?'':'s')):'No additional grouped view';
    return '<div class="v13-explain"><div class="v13-explain-main">'+v12ReasonIcon()+'<div><span>Why this signal matters</span><p>'+v13SignalSentence(model,analysis,group)+'</p></div></div><div class="v13-explain-facts"><div><small>Dimension</small><b>'+esc(v9DimensionType(model,c))+'</b></div><div><small>Signal role</small><b>'+esc(v12PrettyRole(role))+'</b></div><div><small>Evidence</small><b>'+esc(evidenceText)+'</b></div></div></div>';
  }

  WHYWidget.prototype._supportHtml=function(model,analysis,selectedGroup){
    var groups=(analysis.topSignalGroups||[]).slice(0,5),selectedKey=selectedGroup?candidateKey(selectedGroup.lead):'',maxImpact=groups.reduce(function(m,g){return Math.max(m,candidateImpact(g.lead));},0)||1;
    if(!groups.length)return '';
    var cards=groups.map(function(group,index){
      var c=group.lead,key=candidateKey(c),name=v13EvidenceName(c),life=lifecycleKind(c),role=v10RoleLabel(group,analysis),ctx=life?(formatValue(c.prior,model.unit)+' → '+formatValue(c.current,model.unit)):(formatPctRatio(c.deltaPct)+' vs '+formatPctRatio(analysis.overallRate)+' overall'),dir=v10DirectionClass(c.impactRate);
      var lifeHtml=life?'<span class="v12-card-life">'+esc(lifecycleLabel(life))+'</span>':'';
      return '<button type="button" class="v12-card v13-card '+(key===selectedKey?'selected':'')+'" data-signal-key="'+esc(key)+'" style="--delay:'+(100+index*55)+'ms"><div class="v12-card-top"><div class="v12-card-name" title="'+esc(name)+'">'+esc(name)+'</div><span class="v12-card-arrow">›</span></div><div class="v12-card-dim">'+esc(v9DimensionType(model,c))+'</div><div class="v12-card-tags"><span class="v12-card-role '+v10RoleClass(role)+'"><i></i>'+esc(v12PrettyRole(role))+'</span>'+lifeHtml+'</div><div class="v12-card-context">'+esc(ctx)+'</div><div class="v12-card-bottom">'+v12Sparkline(model,c,dir)+'<div class="v12-card-impact '+dir+'">'+esc(formatPp(c.impactRate))+'</div></div></button>';
    }).join('');
    return '<section class="v12-signals v13-signals"><div class="v12-signal-head v13-signal-head"><b>Material signals</b><span>Select a signal to inspect its own trend and evidence</span></div><div class="v12-signal-grid v13-signal-grid">'+cards+'</div></section>'+v13Explanation(model,analysis,selectedGroup);
  };

  WHYWidget.prototype._idleHtml=function(model,analysis){
    var dims=model.dimAliases.map(function(a){return '<span>'+esc(model.dimLabels[a]||a)+'</span>';}).join('');
    var rateDir=v10DirectionClass(analysis.totalDeltaPct);
    return '<div class="v12-idle v13-idle"><div class="v12-idle-main v13-idle-main">'+v9LensSvg('v12-lens v13-lens')+'<div class="v12-idle-title v13-idle-title">What stands out behind this change?</div><div class="v13-connected"><b>'+analysis.dimensionCount+' dimension'+(analysis.dimensionCount===1?'':'s')+' connected</b></div><div class="v12-dim-chips v13-dim-chips">'+dims+'</div><div class="v12-ready v13-ready">Press WHY? to surface the strongest variance signals</div></div><div class="v12-preview-grid v13-preview-grid"><div class="v12-preview v13-preview trend"><div class="v12-preview-head v13-preview-head"><b>'+esc(model.measureLabel)+' trend</b><span>Current vs prior</span></div>'+whyMiniTrend(model)+'</div><div class="v12-preview v13-preview yoy"><div class="v12-preview-head v13-preview-head"><b>YoY change</b><span>'+esc(model.currentScopeLabel)+'</span></div><div class="v12-preview-yoy '+rateDir+'">'+esc(formatPctRatio(analysis.totalDeltaPct))+'</div><div class="v12-preview-sub">'+esc(formatDelta(analysis.totalDelta,model.unit))+' total variance</div></div><div class="v12-preview v13-preview period"><div class="v12-preview-head v13-preview-head"><b>Period coverage</b><span>YoY</span></div><div class="v12-period v13-period"><b>'+esc(model.currentScopeLabel)+'</b><span>vs</span><b>'+esc(model.priorScopeLabel)+'</b></div></div></div></div>';
  };

  WHYWidget.prototype._scanHtml=function(model,analysis){
    var step=Math.max(0,Math.min(2,Number(this._scanStep)||0));
    function sc(i){return i<step?'done':i===step?'active':'';}
    function dot(i){return i<step?'✓':String(i+1);}
    return '<div class="v12-scan v13-scan"><div class="v12-scan-inner v13-scan-inner">'+v9LensSvg('v12-scan-lens v13-scan-lens')+'<div class="v12-scan-title v13-scan-title">Analyzing variance signals</div><div class="v12-scan-sub v13-scan-sub">Comparing '+analysis.dimensionCount+' bound dimension'+(analysis.dimensionCount===1?'':'s')+' across the selected periods.</div><div class="v12-progress v13-progress"><div class="v12-step v13-step '+sc(0)+'"><span>'+dot(0)+'</span><b>Scanning dimensions</b><small>Compare period-aligned movements</small></div><div class="v12-step v13-step '+sc(1)+'"><span>'+dot(1)+'</span><b>Grouping related movements</b><small>Consolidate overlapping views</small></div><div class="v12-step v13-step '+sc(2)+'"><span>'+dot(2)+'</span><b>Ranking material signals</b><small>Prioritize impact on the total rate</small></div></div></div></div>';
  };

  STYLES += `
    /* v0.13.0 - clarity, premium restraint, no neutral grey surfaces */
    :host{--v13-ink:#061f39;--v13-navy:#052f55;--v13-navy2:#074f7e;--v13-blue:#0a6ed1;--v13-cyan:#20b6ef;--v13-pale:#f3fbff;--v13-line:#b9e4f8;--v13-line2:#d5f0fb;--v13-green:#0f914f;--v13-red:#df3d43}
    .v13-shell{background:#fff!important;border-color:#9fd8f4!important;box-shadow:0 16px 40px rgba(0,73,128,.12)!important}
    .v13-top{height:72px!important;background:#fff!important;border-bottom:1px solid var(--v13-line)!important}
    .v13-brand .v9-brand-icon{animation:none!important;width:38px!important;height:38px!important;filter:drop-shadow(0 6px 13px rgba(10,110,209,.18))!important}
    .v13-wordmark{font-size:37px!important}.v13-brand>span{font-size:15px!important;color:#155d8f!important}
    .v13-top-tools{display:flex;align-items:center;gap:14px}
    .v13-family-pulse{display:grid;place-items:center;width:42px;height:30px;padding:3px 4px;border-radius:9px;background:#f4fbff;border:1px solid #a6dcf6;overflow:visible}
    .v13-family-pulse svg{width:32px;height:25px;overflow:visible}.v13-family-pulse .track{fill:none;stroke:#b9e4f8;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.v13-family-pulse .run{fill:none;stroke:#0a6ed1;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1;stroke-dashoffset:1;animation:v13Pulse 4.8s cubic-bezier(.2,.7,.2,1) infinite}
    @keyframes v13Pulse{0%,70%{stroke-dashoffset:1;opacity:.2}76%{opacity:1}88%{stroke-dashoffset:0;opacity:1}96%,100%{stroke-dashoffset:-1;opacity:.15}}
    .v13-info-button{width:34px!important;height:34px!important;background:#fff!important;border-color:#70c9f1!important}
    .v13-info{top:64px!important;font-size:13px!important;border-color:#8fd4f5!important}.v13-info b{font-size:15px!important}.v13-info p{font-size:13px!important}.v13-info dl{font-size:12px!important;grid-template-columns:118px 1fr!important;gap:7px 10px!important}.v13-info .info-meta{font-size:11px!important;color:#155d8f!important}

    .v13-kpi{margin:0 22px!important;padding:16px 0!important;min-height:104px!important;background:#fff!important;display:grid!important;grid-template-columns:minmax(250px,1.15fr) minmax(330px,1.25fr) auto!important;align-items:center!important;gap:26px!important;border-bottom:1px solid var(--v13-line)!important}
    .v13-measure-block{min-width:0}.v13-measure-name{font-size:22px!important;font-weight:920!important;color:var(--v13-ink)!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.v13-measure-select{font-size:17px!important;font-weight:850!important;min-height:38px!important}
    .v13-scope{font-size:13px;color:#216a96;font-weight:760;margin-top:6px}.v13-scope span{color:#0a6ed1;font-weight:900;margin:0 4px}.v13-unit-note{display:inline-flex;margin-top:6px;padding:3px 7px;border-radius:6px;border:1px solid #8fd3f4;background:#f2fbff;color:#075b92;font-size:11px;font-weight:800}
    .v13-kpi-metrics{display:grid;grid-template-columns:minmax(180px,1.3fr) minmax(130px,.75fr);border-left:1px solid #aee0f7;border-right:1px solid #aee0f7;min-height:64px}.v13-kpi-cell{display:flex;flex-direction:column;justify-content:center;padding:0 24px}.v13-kpi-cell+.v13-kpi-cell{border-left:1px solid #c7ebfa}.v13-kpi-cell small{font-size:13px;color:#236b96;font-weight:820;margin-bottom:5px}.v13-kpi-cell strong{font-size:32px;line-height:1;color:var(--v13-ink);font-weight:950;letter-spacing:-.035em;white-space:nowrap}.v13-kpi-cell.rate strong{font-size:25px}.v13-kpi-cell strong.positive{color:var(--v13-green)}.v13-kpi-cell strong.negative{color:var(--v13-red)}.v13-kpi-cell strong.neutral{color:var(--v13-blue)}
    .v13-run{height:54px!important;min-width:150px!important;border-radius:10px!important;background:#063b67!important;border:1px solid #0a6ed1!important;box-shadow:0 8px 20px rgba(4,61,104,.16)!important;color:#fff!important;padding:0 42px 0 17px!important;display:grid!important;grid-template-columns:1fr!important;align-content:center!important;justify-items:start!important;position:relative!important;transition:transform .16s ease,box-shadow .16s ease,background .16s ease!important}.v13-run:hover{background:#074a7c!important;box-shadow:0 11px 24px rgba(4,61,104,.22)!important;transform:translateY(-1px)}.v13-run::after{display:none!important}.v13-run-main{font-size:18px;line-height:1;font-weight:950}.v13-run-sub{font-size:10.5px;line-height:1;margin-top:4px;color:#aee4fa;font-weight:800;letter-spacing:.04em;text-transform:uppercase}.v13-run-arrow{position:absolute;right:16px;top:50%;transform:translateY(-52%);font-size:21px;color:#7dd8f8}

    .v13-idle{min-height:558px!important;background:linear-gradient(180deg,#fff 0%,#fbfeff 72%,#effaff 100%)!important;grid-template-rows:minmax(342px,1fr) 116px!important}.v13-idle-main{justify-content:center!important}.v13-lens{height:214px!important}.v13-lens .v9-wave{animation-duration:11s!important;stroke-width:1.05!important}.v13-lens .v9-wave.w2{animation-duration:13s!important}.v13-lens .v9-wave.w3{animation-duration:15s!important}.v13-lens .v9-ring{animation-duration:5.4s!important}.v13-idle-title{font-size:31px!important;color:var(--v13-ink)!important}.v13-connected{margin-top:11px;font-size:16px;color:#155d8f}.v13-connected b{font-weight:900}.v13-dim-chips{margin-top:10px!important;gap:8px!important}.v13-dim-chips span{min-height:35px!important;padding:0 14px!important;background:#fff!important;border:1px solid #64c2ee!important;color:#064f82!important;font-size:14px!important;box-shadow:0 4px 12px rgba(10,110,209,.07)!important}.v13-ready{margin-top:11px!important;font-size:14px!important;color:#286e99!important}
    .v13-preview-grid{grid-template-columns:1.5fr .82fr 1.18fr!important;gap:12px!important}.v13-preview{height:116px!important;border-color:#9ed9f5!important;border-radius:11px!important;background:#fff!important;box-shadow:0 7px 18px rgba(0,84,143,.055)!important}.v13-preview-head b{font-size:14px!important}.v13-preview-head span{font-size:12px!important;color:#1e6997!important}.v13-preview .v81-spark{height:70px!important}.v13-period{margin-top:19px!important}.v13-period b{font-size:14px!important;color:var(--v13-ink)!important}.v13-period span{color:#0a6ed1!important}

    .v13-scan{background:linear-gradient(180deg,#fff,#f2fbff)!important}.v13-scan-lens{height:196px!important}.v13-scan-lens .v9-wave{animation-duration:9s!important}.v13-scan-title{font-size:31px!important;color:var(--v13-ink)!important}.v13-scan-sub{font-size:15px!important;color:#206a97!important}.v13-progress{gap:16px!important}.v13-step{border-top-color:#b7e4f8!important}.v13-step b{font-size:15px!important;color:#0b4774!important}.v13-step small{font-size:13px!important;color:#2a709b!important}.v13-step.active{border-top-color:#0a6ed1!important}.v13-step.done{border-top-color:#20b6ef!important}

    .v13-hero{grid-template-columns:minmax(350px,.92fr) minmax(520px,1.55fr)!important;gap:30px!important;padding:22px 24px!important;border-radius:14px!important;background:linear-gradient(135deg,#052e53 0%,#073f6d 50%,#075d91 100%)!important;box-shadow:0 16px 32px rgba(3,57,96,.18)!important}.v13-hero::before{opacity:.55!important}.v13-hero-left{min-width:0}.v13-hero-chart{min-width:0}.v13-metrics{gap:0!important}.v13-metrics>div{padding-right:12px}.v13-metrics>div+div{padding-left:12px;border-left:1px solid rgba(137,214,249,.28)}
    .v13-related{margin-top:13px;border-top:1px solid rgba(135,214,249,.34);padding-top:11px;color:#d9f4ff}.v13-related summary{list-style:none;display:grid;grid-template-columns:auto auto 1fr;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:800}.v13-related summary::-webkit-details-marker{display:none}.v13-related summary span{color:#aee7fb}.v13-related summary b{color:#fff}.v13-related summary em{justify-self:end;color:#7dd8f8;font-style:normal;font-size:12px;font-weight:900}.v13-related[open] summary em::after{content:' less'}.v13-related-list{margin-top:9px;display:grid;gap:4px}.v13-related-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:7px 9px;border:1px solid rgba(133,214,249,.20);border-radius:8px;background:rgba(255,255,255,.055)}.v13-related-row b{display:block;font-size:12.5px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.v13-related-row span{display:block;margin-top:2px;font-size:11px;color:#aee4fa}.v13-related-row strong{font-size:13px;white-space:nowrap}.v13-related-row strong.positive{color:#55d798}.v13-related-row strong.negative{color:#ff8387}.v13-related-row strong.neutral{color:#8edfff}

    .v13-signals{margin-top:15px!important}.v13-signal-head{margin-bottom:9px!important}.v13-signal-head b{font-size:17px!important;color:var(--v13-ink)!important}.v13-signal-head span{font-size:13px!important;color:#206a97!important}.v13-signal-grid{gap:10px!important}.v13-card{height:152px!important;border-color:#a8ddf6!important;background:#fff!important;grid-template-rows:26px 20px 24px 22px 38px!important;row-gap:2px!important}.v13-card.selected{background:#f3fbff!important;border-color:#0a6ed1!important}.v13-card .v12-card-name{font-size:15px!important}.v13-card .v12-card-dim{font-size:12.5px!important;color:#236a96!important}.v13-card .v12-card-context{font-size:12.5px!important;color:#175e8c!important}.v13-card .v12-card-impact{font-size:18px!important}

    .v13-explain{margin-top:15px;border:1px solid #a9def6;border-radius:11px;background:#fff;padding:15px 17px;display:grid;grid-template-columns:1fr;gap:13px}.v13-explain-main{display:grid;grid-template-columns:42px minmax(0,1fr);gap:12px;align-items:center}.v13-explain-main>div>span{font-size:15px;font-weight:920;color:var(--v13-ink)}.v13-explain-main p{font-size:14px;line-height:1.48;color:#164f79;margin:4px 0 0}.v13-inline.positive{color:var(--v13-green);font-weight:900}.v13-inline.negative{color:var(--v13-red);font-weight:900}.v13-inline.neutral{color:var(--v13-blue);font-weight:900}.v13-explain-facts{display:grid;grid-template-columns:1.5fr 1fr 1.15fr;border-top:1px solid #c9ebfa;padding-top:12px}.v13-explain-facts>div{padding:0 18px;border-left:1px solid #d5f0fb;min-width:0}.v13-explain-facts>div:first-child{border-left:0;padding-left:2px}.v13-explain-facts small{display:block;font-size:12px;color:#2b719b;font-weight:820}.v13-explain-facts b{display:block;margin-top:4px;font-size:14px;line-height:1.3;color:var(--v13-ink);white-space:normal}
    .v13-distributed{background:#f4fbff!important;border-color:#a8ddf6!important;color:var(--v13-ink)!important}
    .error{background:#f3fbff!important;color:#124f7a!important;border-color:#9ed9f5!important}

    @media(max-width:1180px){.v13-kpi{grid-template-columns:1fr auto!important}.v13-kpi-metrics{grid-column:1/2;grid-row:2;border-left:0;border-right:0;border-top:1px solid #c7ebfa;padding-top:10px}.v13-run{grid-column:2;grid-row:1/3}.v13-hero{grid-template-columns:1fr!important}.v13-signal-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
    @media(max-width:780px){.v13-kpi{grid-template-columns:1fr!important}.v13-kpi-metrics{grid-column:1;grid-row:auto;grid-template-columns:1fr 1fr}.v13-run{grid-column:1;grid-row:auto;width:100%}.v13-preview-grid{grid-template-columns:1fr!important}.v13-signal-grid{grid-template-columns:1fr!important}.v13-explain-facts{grid-template-columns:1fr}.v13-explain-facts>div{border-left:0;border-top:1px solid #d5f0fb;padding:10px 0}.v13-explain-facts>div:first-child{border-top:0}.v13-family-pulse{display:none}}
    @media(prefers-reduced-motion:reduce){.v13-family-pulse .run,.v13-lens .v9-wave,.v13-lens .v9-ring,.v13-scan-lens .v9-wave{animation:none!important}}
  `;


  /* ================================================================
   * v0.14.0 - coherence, evidence and interaction pass
   * - Hierarchy Pulse family mark becomes the WHY brand mark
   * - related signal cuts merge transitively into inspectable evidence
   * - positive/negative total story stays coherent with the opened signal
   * - compact hero, clickable timeline nodes and period value matrix
   * - 4.8s executive analysis reveal with a restrained focus moment
   * ================================================================ */

  var v14BaseGroupIndependentSignals=groupIndependentSignals;
  groupIndependentSignals=function(candidates,limit){
    var wanted=limit||5;
    var provisional=v14BaseGroupIndependentSignals(candidates,Math.max(20,wanted*4));
    var changed=true;
    while(changed){
      changed=false;
      outer:for(var i=0;i<provisional.length;i++){
        for(var j=i+1;j<provisional.length;j++){
          if(!groupsRelated(provisional[i],provisional[j]))continue;
          var merged=[],seen={};
          [provisional[i],provisional[j]].forEach(function(g){
            (g.members||[g.lead]).forEach(function(c){
              var k=candidateKey(c);if(seen[k])return;seen[k]=true;merged.push(c);
            });
          });
          merged.sort(candidateStableCompare);
          var group={lead:merged[0],members:merged,evidence:[]};
          promoteSpecificLead(group);
          provisional.splice(j,1);
          provisional.splice(i,1,group);
          changed=true;
          break outer;
        }
      }
    }
    provisional.forEach(promoteSpecificLead);
    provisional.sort(function(a,b){return candidateStableCompare(a.lead,b.lead);});
    return provisional.slice(0,wanted);
  };

  function v14PulseMark(){
    return '<svg class="v14-brand-pulse" viewBox="0 0 28 22" aria-hidden="true"><path class="track" d="M1 12h5l2.3-7 4.2 14 3.2-10 2.5 6H27"></path><path pathLength="1" class="run" d="M1 12h5l2.3-7 4.2 14 3.2-10 2.5 6H27"></path></svg>';
  }

  function v14AlignedGroup(analysis){
    var groups=analysis&&analysis.topSignalGroups||[],direction=signOf(analysis&&analysis.overallRate);
    if(!groups.length)return null;
    if(analysis.classification==='dominant'){
      var dominantGroup=groupForKey(groups,analysis.editorialSignalKey);
      if(dominantGroup)return dominantGroup;
    }
    var best=null;
    groups.forEach(function(g){
      var c=g.lead;if(!c||signOf(c.impactRate)!==direction)return;
      if(!best)best=g;
      else if(lifecycleKind(best.lead)&&!lifecycleKind(c))best=g;
      else if(!!lifecycleKind(best.lead)===!!lifecycleKind(c)&&candidateImpact(c)>candidateImpact(best.lead))best=g;
    });
    return best||groupForKey(groups,analysis.editorialSignalKey)||groups[0]||null;
  }

  function v14OppositeGroup(analysis,primary){
    var groups=analysis&&analysis.topSignalGroups||[],direction=signOf(analysis&&analysis.overallRate),best=null;
    groups.forEach(function(g){
      if(!g||g===primary||!g.lead||signOf(g.lead.impactRate)!==-direction)return;
      if(!best||candidateImpact(g.lead)>candidateImpact(best.lead))best=g;
    });
    return best;
  }

  WHYWidget.prototype._selectedGroup=function(analysis){
    var groups=analysis.topSignalGroups||[];
    if(this._selectedSignalKey)return groupForKey(groups,this._selectedSignalKey)||groups[0]||null;
    return v14AlignedGroup(analysis);
  };

  WHYWidget.prototype._answerText=function(analysis){
    var groups=analysis.topSignalGroups||[];
    if(!groups.length)return '<b>No material signal stands out.</b> The change is broadly distributed across the bound dimensions.';
    var primary=v14AlignedGroup(analysis),opposite=v14OppositeGroup(analysis,primary),c=primary&&primary.lead,name=c?v13EvidenceName(c):'',movement=analysis.overallRate>0?'increase':analysis.overallRate<0?'decline':'change';
    if(analysis.classification==='dominant'&&primary){
      var text='<b>One dominant signal stands out in the '+movement+'.</b> '+esc(name)+' has a measured impact of <span class="v13-inline '+v10DirectionClass(c.impactRate)+'">'+esc(formatPp(c.impactRate))+'</span> on the total rate.';
      if(opposite&&candidateImpact(opposite.lead)>=Math.max(.005,candidateImpact(c)*.35)){
        text+=' <span class="v14-answer-contrast">At the same time, '+esc(v13EvidenceName(opposite.lead))+' moves against the '+movement+' at <b class="v13-inline '+v10DirectionClass(opposite.lead.impactRate)+'">'+esc(formatPp(opposite.lead.impactRate))+'</b>.</span>';
      }
      return text;
    }
    if(analysis.classification==='mixed'){
      var total=formatPctRatio(analysis.overallRate),globalStrongest=groups[0]||null;
      if(primary&&signOf(primary.lead.impactRate)===signOf(analysis.overallRate)){
        if(globalStrongest&&signOf(globalStrongest.lead.impactRate)===-signOf(analysis.overallRate)){
          var movementWord=analysis.overallRate>0?'grew':'declined';
          var despite='<b>The total '+movementWord+' '+esc(total)+' despite a '+esc(formatPp(globalStrongest.lead.impactRate))+' drag from '+esc(v13EvidenceName(globalStrongest.lead))+'.</b> The strongest aligned signal is '+esc(v13EvidenceName(primary.lead))+' at <span class="v13-inline '+v10DirectionClass(primary.lead.impactRate)+'">'+esc(formatPp(primary.lead.impactRate))+'</span>.';
          return despite;
        }
        var mixed='<b>The total moved '+esc(total)+'.</b> The strongest aligned signal is '+esc(v13EvidenceName(primary.lead))+' at <span class="v13-inline '+v10DirectionClass(primary.lead.impactRate)+'">'+esc(formatPp(primary.lead.impactRate))+'</span>.';
        if(opposite)mixed+=' '+esc(v13EvidenceName(opposite.lead))+' moves against the total at <span class="v13-inline '+v10DirectionClass(opposite.lead.impactRate)+'">'+esc(formatPp(opposite.lead.impactRate))+'</span>.';
        return mixed;
      }
      return '<b>No single signal dominates.</b> Several material movements are affecting the total rate.';
    }
    return '<b>No material signal stands out.</b> The change is broadly distributed across the bound dimensions.';
  };

  function v14SignalSentence(model,analysis,group){
    if(!group||!group.lead)return '';
    var c=group.lead,name=v13EvidenceName(c),life=lifecycleKind(c),impact=formatPp(c.impactRate),actual=formatPctRatio(c.deltaPct),overall=formatPctRatio(analysis.overallRate);
    if(analysis.classification==='dominant'&&candidateKey(c)===analysis.editorialSignalKey){
      var opposite=v14OppositeGroup(analysis,group);
      var sentence='<b>'+esc(name)+'</b> is the strongest measured signal aligned with the overall '+(analysis.overallRate>=0?'increase':'decline')+' at <b class="v13-inline '+v10DirectionClass(c.impactRate)+'">'+esc(impact)+'</b>.';
      if(opposite)sentence+=' The strongest opposing signal is <b>'+esc(v13EvidenceName(opposite.lead))+'</b> at <b class="v13-inline '+v10DirectionClass(opposite.lead.impactRate)+'">'+esc(formatPp(opposite.lead.impactRate))+'</b>.';
      return sentence;
    }
    if(life==='disappeared')return '<b>'+esc(name)+'</b> is no longer present in the current period. The move from <b>'+esc(formatValue(c.prior,model.unit))+'</b> to <b>'+esc(formatValue(c.current,model.unit))+'</b> may reflect business movement or a structural data change.';
    if(life==='new')return '<b>'+esc(name)+'</b> is new in the current period. The move from <b>'+esc(formatValue(c.prior,model.unit))+'</b> to <b>'+esc(formatValue(c.current,model.unit))+'</b> may reflect business movement or a structural data change.';
    if(analysis.overallRate>0&&c.impactRate<0)return '<b>'+esc(name)+'</b> moved '+esc(actual)+' while the overall result moved '+esc(overall)+'. Its measured impact lowers the total growth rate by <b class="v13-inline negative">'+esc(formatPp(Math.abs(c.impactRate)).replace(/^\+/,''))+'</b>.';
    if(analysis.overallRate<0&&c.impactRate>0)return '<b>'+esc(name)+'</b> moved '+esc(actual)+' while the overall result moved '+esc(overall)+'. Its measured impact offsets <b class="v13-inline positive">'+esc(impact.replace(/^\+/,''))+'</b> of the decline.';
    return '<b>'+esc(name)+'</b> moved '+esc(actual)+' versus '+esc(overall)+' overall and changes the total rate by <b class="v13-inline '+v10DirectionClass(c.impactRate)+'">'+esc(impact)+'</b>.';
  }

  function v14RelatedViewsHtml(model,group){
    var allEvidence=(group&&group.evidence||[]).slice();
    if(!allEvidence.length)return '';
    function rowHtml(e,index){
      var dir=v10DirectionClass(e.impactRate),name=v13EvidenceName(e),dim=v9DimensionType(model,e);
      return '<div class="v14-related-row"><span class="v14-related-index">'+(index+1)+'</span><div><b>'+esc(name)+'</b><span>'+esc(dim)+'</span></div><strong class="'+esc(dir)+'">'+esc(formatPp(e.impactRate))+'</strong></div>';
    }
    var initial=allEvidence.slice(0,8),extra=allEvidence.slice(8);
    var rows=initial.map(rowHtml).join('');
    var more=extra.length?'<details class="v15-related-more"><summary>+'+extra.length+' more</summary><div class="v15-related-more-list">'+extra.map(function(e,i){return rowHtml(e,i+8);}).join('')+'</div></details>':'';
    return '<details class="v14-related"><summary><span>Related evidence</span><b>'+allEvidence.length+' inspectable view'+(allEvidence.length===1?'':'s')+'</b><em>Open</em></summary><div class="v14-related-list">'+rows+'</div>'+more+'</details>';
  }

  WHYWidget.prototype._timelineHtml=function(model,candidate){
    var series=signalTrend(model,candidate);
    if(!series||series.length<2)return '<div class="timeline v12-timeline v14-timeline"><div class="timeline-head"><div class="timeline-title">'+esc(model.measureLabel)+' by period</div></div><div class="timeline-empty">No period-level trend available for this signal.</div></div>';
    var W=760,H=188,L=62,R=16,T=22,B=36;
    var cur=pointsForSeries(series,'current',W,H,L),pri=pointsForSeries(series,'prior',W,H,L);
    var min=cur.min,max=cur.max,span=max-min||1;
    function y(v){return T+(H-T-B)*(1-(v-min)/span);}
    var tickVals=[];for(var ti=0;ti<4;ti++)tickVals.push(min+(span*ti/3));
    var grid=tickVals.map(function(v){var yy=y(v);return '<line class="v12-grid" x1="'+L+'" y1="'+yy.toFixed(1)+'" x2="'+(W-R)+'" y2="'+yy.toFixed(1)+'"></line><text class="v12-ylabel" x="'+(L-12)+'" y="'+(yy+4).toFixed(1)+'" text-anchor="end">'+esc(formatValue(v,model.unit))+'</text>';}).join('');
    var xSpan=Math.max(1,series.length-1);
    var labels=series.map(function(d,i){var x=L+(W-L-R)*(i/xSpan);return '<text class="timeline-x v12-xlabel" x="'+x.toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle">'+esc(d.label)+'</text>';}).join('');
    var selected=Number(this._timelinePointIndex);if(!isFinite(selected)||selected<0||selected>=series.length)selected=-1;
    function dots(points,cls){return points.map(function(p,i){var active=i===selected?' active':'';return '<circle class="v14-point-hit" data-timeline-index="'+i+'" cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="11"></circle><circle class="'+cls+active+'" cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="'+(active?'5.8':cls.indexOf('current')>=0?'4.4':'3.2')+'"></circle>';}).join('');}
    var area='';if(cur.dots.length){var baseY=(H-B).toFixed(1),poly=L+','+baseY+' '+cur.points+' '+(W-R)+','+baseY;area='<polygon class="v12-current-area" points="'+poly+'"></polygon>';}
    var pointDetail='<span class="v14-point-hint">Click a point for exact values</span>',pointPopover='';
    if(selected>=0){
      var d=series[selected],delta=d.current-d.prior,activePoint=cur.dots[selected];
      pointDetail='<span class="v14-point-detail"><b>'+esc(d.label)+'</b><span>Prior '+esc(formatValue(d.prior,model.unit))+'</span><span>Current '+esc(formatValue(d.current,model.unit))+'</span><strong class="'+v10DirectionClass(delta)+'">'+esc(formatDelta(delta,model.unit))+'</strong></span>';
      if(activePoint){
        var popLeft=Math.max(12,Math.min(88,activePoint.x/W*100));
        var popTop=Math.max(6,Math.min(H-64,activePoint.y-52));
        pointPopover='<div class="v15-point-pop" style="left:'+popLeft.toFixed(1)+'%;top:'+popTop.toFixed(1)+'px"><b>'+esc(d.label)+'</b><span>Prior '+esc(formatValue(d.prior,model.unit))+'</span><span>Current <strong>'+esc(formatValue(d.current,model.unit))+'</strong></span></div>';
      }
    }
    var header='<div class="timeline-head v12-timeline-head v14-timeline-head"><div><div class="timeline-title">'+esc(model.measureLabel)+' by period</div><div class="timeline-legend"><span class="legend-item"><i class="legend-swatch prior"></i>Prior</span><span class="legend-item"><i class="legend-swatch"></i>Current</span></div></div>'+pointDetail+'</div>';
    var cols='style="grid-template-columns:58px repeat('+series.length+',minmax(0,1fr))"';
    var monthRow='<span class="row-label"></span>'+series.map(function(d){return '<b>'+esc(d.label)+'</b>';}).join('');
    var priorRow='<span class="row-label">Prior</span>'+series.map(function(d){return '<span>'+esc(formatValue(d.prior,model.unit))+'</span>';}).join('');
    var currentRow='<span class="row-label">Current</span>'+series.map(function(d){return '<span class="current">'+esc(formatValue(d.current,model.unit))+'</span>';}).join('');
    return '<div class="timeline v12-timeline v14-timeline">'+header+'<div class="v15-chart-wrap"><svg class="timeline-svg v12-timeline-svg v14-timeline-svg" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none">'+grid+area+'<polyline class="timeline-prior v12-prior" pathLength="1" points="'+pri.points+'"></polyline>'+dots(pri.dots,'timeline-prior-dot v12-prior-dot v14-prior-dot')+'<polyline class="timeline-current v12-current" pathLength="1" points="'+cur.points+'"></polyline>'+dots(cur.dots,'timeline-dot v12-current-dot v14-current-dot')+labels+'</svg>'+pointPopover+'</div><div class="v14-value-matrix"><div class="v14-value-row months" '+cols+'>'+monthRow+'</div><div class="v14-value-row prior" '+cols+'>'+priorRow+'</div><div class="v14-value-row current" '+cols+'>'+currentRow+'</div></div></div>';
  };

  WHYWidget.prototype._heroSignalHtml=function(model,analysis,group){
    if(!group){
      var dims=model.dimAliases.map(function(a){return '<span>'+esc(model.dimLabels[a]||a)+'</span>';}).join('');
      return '<div class="v9-distributed v10-distributed v12-distributed v13-distributed"><div class="v9-distributed-mark">≈</div><div><b>No material signal stands out</b><p>The change is broadly distributed across the bound dimensions.</p><div class="v9-dim-chips">'+dims+'</div></div></div>';
    }
    var c=group.lead,key=candidateKey(c),life=lifecycleKind(c),name=v13EvidenceName(c),isDominant=analysis.classification==='dominant'&&key===analysis.editorialSignalKey,role=v10RoleLabel(group,analysis),impactDir=v10DirectionClass(c.impactRate);
    var kicker=isDominant?'Dominant driver':'Selected signal';
    var lifeHtml=life?'<span class="v12-life" title="'+esc(lifecycleHelp(life))+'">'+esc(lifecycleLabel(life))+'</span>':'';
    var context=life?(formatValue(c.prior,model.unit)+' → '+formatValue(c.current,model.unit)):(formatPctRatio(c.deltaPct)+' vs '+formatPctRatio(analysis.overallRate)+' overall');
    var roleHtml='<span class="v12-role '+v10RoleClass(role)+'"><i></i>'+esc(v12PrettyRole(role))+'</span>';
    return '<section class="v12-hero v13-hero v14-hero"><div class="v12-hero-left v13-hero-left v14-hero-left"><div class="v12-kicker">'+esc(kicker)+'</div><div class="v12-signal-name v14-signal-name">'+esc(name)+'</div><div class="v12-dimension-type">'+esc(v9DimensionType(model,c))+'</div><div class="v12-tags">'+roleHtml+lifeHtml+'</div><div class="v12-impact v14-impact '+impactDir+'">'+esc(formatPp(c.impactRate))+'</div><div class="v12-impact-label">Impact on total rate</div><div class="v12-context">'+esc(context)+'</div><div class="v12-metrics v13-metrics v14-metrics"><div><small>Trend baseline</small><b>'+esc(formatDelta(c.expectedDelta,model.unit))+'</b></div><div><small>Actual change</small><b>'+esc(formatDelta(c.delta,model.unit))+'</b></div><div><small>Gap to trend</small><b>'+esc(formatDelta(c.surprise,model.unit))+'</b></div></div>'+v14RelatedViewsHtml(model,group)+'</div><div class="v12-hero-chart v13-hero-chart v14-hero-chart">'+this._timelineHtml(model,c)+'</div></section>';
  };

  function v14Explanation(model,analysis,group){
    if(!group||!group.lead)return '';
    var c=group.lead,role=v10RoleLabel(group,analysis),related=(group.evidence||[]).length;
    var evidenceText=related?(related+' related view'+(related===1?'':'s')+' available above'):'No additional grouped view';
    return '<div class="v13-explain v14-explain"><div class="v13-explain-main">'+v12ReasonIcon()+'<div><span>Why this signal matters</span><p>'+v14SignalSentence(model,analysis,group)+'</p></div></div><div class="v13-explain-facts"><div><small>Dimension</small><b>'+esc(v9DimensionType(model,c))+'</b></div><div><small>Signal role</small><b>'+esc(v12PrettyRole(role))+'</b></div><div><small>Evidence</small><b>'+esc(evidenceText)+'</b></div></div></div>';
  }

  WHYWidget.prototype._supportHtml=function(model,analysis,selectedGroup){
    var groups=(analysis.topSignalGroups||[]).slice(0,5),selectedKey=selectedGroup?candidateKey(selectedGroup.lead):'',maxImpact=groups.reduce(function(m,g){return Math.max(m,candidateImpact(g.lead));},0)||1;
    if(!groups.length)return '';
    var cards=groups.map(function(group,index){
      var c=group.lead,key=candidateKey(c),name=v13EvidenceName(c),life=lifecycleKind(c),role=v10RoleLabel(group,analysis),ctx=life?(formatValue(c.prior,model.unit)+' → '+formatValue(c.current,model.unit)):(formatPctRatio(c.deltaPct)+' vs '+formatPctRatio(analysis.overallRate)+' overall'),dir=v10DirectionClass(c.impactRate);
      var lifeHtml=life?'<span class="v12-card-life">'+esc(lifecycleLabel(life))+'</span>':'';
      return '<button type="button" class="v12-card v13-card v14-card '+(key===selectedKey?'selected':'')+'" data-signal-key="'+esc(key)+'" style="--delay:'+(100+index*55)+'ms"><div class="v12-card-top"><div class="v12-card-name" title="'+esc(name)+'">'+esc(name)+'</div><span class="v12-card-arrow">›</span></div><div class="v12-card-dim">'+esc(v9DimensionType(model,c))+'</div><div class="v12-card-tags"><span class="v12-card-role '+v10RoleClass(role)+'"><i></i>'+esc(v12PrettyRole(role))+'</span>'+lifeHtml+'</div><div class="v12-card-context">'+esc(ctx)+'</div><div class="v12-card-bottom">'+v12Sparkline(model,c,dir)+'<div class="v12-card-impact '+dir+'">'+esc(formatPp(c.impactRate))+'</div></div></button>';
    }).join('');
    return '<section class="v12-signals v13-signals v14-signals"><div class="v12-signal-head v13-signal-head"><b>Material signals</b><span>Select a signal to inspect its own trend and evidence</span></div><div class="v12-signal-grid v13-signal-grid v14-signal-grid">'+cards+'</div></section>'+v14Explanation(model,analysis,selectedGroup);
  };

  WHYWidget.prototype._scanHtml=function(model,analysis){
    var step=Math.max(0,Math.min(3,Number(this._scanStep)||0));
    function sc(i){return i<step?'done':i===step?'active':'';}
    function dot(i){return i<step?'✓':String(i+1);}
    var focus=step===3?' focus':'';
    return '<div class="v12-scan v13-scan v14-scan'+focus+'"><div class="v12-scan-inner v13-scan-inner v14-scan-inner"><div class="v14-scan-pulse">'+v14PulseMark()+'</div>'+v9LensSvg('v12-scan-lens v13-scan-lens v14-scan-lens')+'<div class="v14-focus-line" aria-hidden="true"></div><div class="v12-scan-title v13-scan-title">Analyzing variance signals</div><div class="v12-scan-sub v13-scan-sub">Comparing '+analysis.dimensionCount+' bound dimension'+(analysis.dimensionCount===1?'':'s')+' across the selected periods.</div><div class="v12-progress v13-progress v14-progress"><div class="v12-step v13-step '+sc(0)+'"><span>'+dot(0)+'</span><b>Scanning dimensions</b><small>Compare period-aligned movements</small></div><div class="v12-step v13-step '+sc(1)+'"><span>'+dot(1)+'</span><b>Grouping related movements</b><small>Consolidate overlapping views</small></div><div class="v12-step v13-step '+sc(2)+'"><span>'+dot(2)+'</span><b>Ranking material signals</b><small>Prioritize impact on the total rate</small></div></div><div class="v14-focus-copy">Focus on what matters</div></div></div>';
  };

  WHYWidget.prototype._ensure=function(){
    if(this.shadowRoot)return;
    this.attachShadow({mode:'open'});
    var info='<div id="why-info-pop" class="info-popover v9-info v10-info v13-info" role="dialog" aria-label="About WHY"><b>How WHY works</b><p>WHY analyzes the bound SAC result set, compares period-aligned segment movement, consolidates overlapping findings and ranks material signals by measured impact on the total rate.</p><dl><dt>Trend baseline</dt><dd>Change the segment would show if it followed the overall trend.</dd><dt>Actual change</dt><dd>Observed change versus the comparison period.</dd><dt>Gap to trend</dt><dd>Difference between actual change and the trend baseline.</dd><dt>Related evidence</dt><dd>Open the selected signal to inspect every grouped view behind the evidence count.</dd><dt>Color</dt><dd>Green and red indicate positive or negative impact direction. They do not imply business favorability.</dd><dt>New / Disappeared</dt><dd>Lifecycle flags that can reflect genuine business movement or structural/master-data changes.</dd></dl><div class="info-meta">Deterministic signal logic · no AI required · signals, not causality</div></div>';
    this.shadowRoot.innerHTML='<style>'+STYLES+'</style><div class="why v9-shell v10-shell v13-shell v14-shell"><div class="top v9-top v10-top v13-top v14-top"><div class="brand v9-brand v10-brand v13-brand v14-brand">'+v14PulseMark()+'<strong class="v9-wordmark v10-wordmark v13-wordmark v14-wordmark">WHY</strong><span>Variance Signal Analysis</span></div><div class="v14-top-tools"><button id="why-info" class="info-button v9-info-button v10-info-button v13-info-button" type="button" aria-label="About WHY" aria-expanded="false">i</button></div>'+info+'</div><div id="root"></div></div>';
  };

  WHYWidget.prototype._bind=function(){
    var self=this,run=self.shadowRoot.querySelector('#why-run'),sel=self.shadowRoot.querySelector('#why-measure');
    self._bindInfoOnly();
    if(sel)sel.addEventListener('change',function(){self._selectedMeasureAlias=sel.value;self._selectedSignalKey=null;self._timelinePointIndex=-1;self._revealed=false;self._scanning=false;self._animateReveal=false;self._scanStep=0;self._schedule();});
    if(run)run.addEventListener('click',function(){
      if(self._scanning)return;
      self._selectedSignalKey=null;self._timelinePointIndex=-1;self._animateReveal=false;self._scanning=true;self._revealed=false;self._scanStep=0;self._render();
      setTimeout(function(){if(!self._scanning)return;self._scanStep=1;self._render();},1400);
      setTimeout(function(){if(!self._scanning)return;self._scanStep=2;self._render();},2850);
      setTimeout(function(){if(!self._scanning)return;self._scanStep=3;self._render();},4050);
      setTimeout(function(){
        if(!self._scanning)return;
        self._scanning=false;self._revealed=true;
        if(self._analysis){var g=v14AlignedGroup(self._analysis);self._selectedSignalKey=g?candidateKey(g.lead):null;}
        self._animateReveal=true;self._render();setTimeout(function(){self._animateReveal=false;},900);
      },5800);
    });
    Array.prototype.forEach.call(self.shadowRoot.querySelectorAll('[data-signal-key]'),function(card){
      card.addEventListener('click',function(){self._selectedSignalKey=card.getAttribute('data-signal-key');self._timelinePointIndex=-1;self._animateReveal=true;self._render();setTimeout(function(){self._animateReveal=false;},720);});
    });
    Array.prototype.forEach.call(self.shadowRoot.querySelectorAll('[data-timeline-index]'),function(point){
      point.addEventListener('click',function(ev){ev.stopPropagation();self._timelinePointIndex=Number(point.getAttribute('data-timeline-index'));self._render();});
    });
  };

  STYLES += `
    /* v0.14.0 - coherent product pass */
    .v14-shell{display:grid!important;grid-template-rows:auto minmax(0,1fr)!important;overflow:hidden!important}
    .v14-shell #root{min-height:0;overflow:auto;scrollbar-width:thin;scrollbar-color:#69c7ef transparent}
    .v14-top{height:70px!important;padding:0 24px!important}.v14-brand{align-items:center!important;gap:0!important}.v14-brand-pulse{width:38px;height:30px;flex:0 0 auto;overflow:visible;margin-right:18px}.v14-brand-pulse .track{fill:none;stroke:#b7def1;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.v14-brand-pulse .run{fill:none;stroke:#0a6ed1;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1;stroke-dashoffset:1;animation:v14TitleSignal 4.8s cubic-bezier(.2,.7,.2,1) infinite}.v14-wordmark{margin:0!important}.v14-brand>span{margin-left:17px!important;padding-left:17px!important;border-left:1px solid #9bd9f5!important}.v14-top-tools{display:flex;align-items:center}.v14-top .v13-family-pulse,.v14-top .v9-brand-icon{display:none!important}
    @keyframes v14TitleSignal{0%,70%{stroke-dashoffset:1;opacity:.2}76%{opacity:1}88%{stroke-dashoffset:0;opacity:1}96%,100%{stroke-dashoffset:-1;opacity:.15}}

    .v14-shell .v13-kpi{grid-template-columns:minmax(235px,.95fr) minmax(330px,1.2fr) auto!important}.v13-kpi-metrics{min-height:60px!important}.v13-kpi-cell{padding:0 22px!important}.v13-kpi-cell small{font-size:12.5px!important;margin-bottom:4px!important}.v13-kpi-cell strong{font-size:29px!important}.v13-kpi-cell.rate strong{font-size:24px!important}.v13-run{box-shadow:0 7px 16px rgba(4,61,104,.13)!important}

    .v12-result{padding:12px 20px 18px!important}.v12-answer{margin-bottom:10px!important;padding:9px 12px!important;font-size:15px!important}.v12-answer b{font-size:16.5px!important}.v14-answer-contrast{color:#2a6d96}
    .v14-hero{grid-template-columns:minmax(300px,.78fr) minmax(540px,1.62fr)!important;gap:24px!important;padding:18px 22px 17px!important}.v14-signal-name{font-size:22px!important;line-height:1.12!important;letter-spacing:-.018em!important;margin-top:5px!important}.v14-impact{font-size:35px!important;line-height:1!important;margin-top:11px!important;letter-spacing:-.035em!important}.v14-metrics{margin-top:12px!important;padding-top:10px!important}.v14-metrics small{font-size:11.5px!important}.v14-metrics b{font-size:15px!important}.v14-hero .v12-dimension-type{font-size:12.5px!important;margin-top:5px!important}.v14-hero .v12-tags{margin-top:9px!important}.v14-hero .v12-context{font-size:14px!important;margin-top:7px!important}.v14-hero .v12-impact-label{font-size:12px!important;margin-top:5px!important}

    .v14-related{margin-top:10px;border-top:1px solid rgba(135,214,249,.34);padding-top:9px;color:#d9f4ff}.v14-related summary{list-style:none;display:grid;grid-template-columns:auto auto 1fr;align-items:center;gap:8px;cursor:pointer;font-size:12.5px;font-weight:850}.v14-related summary::-webkit-details-marker{display:none}.v14-related summary span{color:#aee7fb}.v14-related summary b{color:#fff}.v14-related summary em{justify-self:end;color:#7dd8f8;font-style:normal;font-size:11.5px;font-weight:900}.v14-related[open] summary em{font-size:0}.v14-related[open] summary em::after{content:'Close';font-size:11.5px}.v14-related-list{margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:5px}.v14-related-row{display:grid;grid-template-columns:20px minmax(0,1fr) auto;gap:8px;align-items:center;padding:6px 8px;border:1px solid rgba(133,214,249,.20);border-radius:8px;background:rgba(255,255,255,.055)}.v14-related-index{width:19px;height:19px;border-radius:50%;display:grid;place-items:center;border:1px solid rgba(142,223,255,.46);color:#aee7fb;font-size:9.5px;font-weight:900}.v14-related-row b{display:block;font-size:11.5px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.v14-related-row div span{display:block;margin-top:1px;font-size:10px;color:#aee4fa}.v14-related-row strong{font-size:12px;white-space:nowrap}.v14-related-row strong.positive{color:#55d798}.v14-related-row strong.negative{color:#ff8387}

    .v14-timeline{width:100%;min-width:0}.v14-timeline-head{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;align-items:start!important;gap:14px!important;margin-bottom:3px!important}.v14-timeline-head .timeline-legend{margin-top:3px}.v14-point-hint{font-size:10.5px;color:#a9def5;font-weight:750;padding-top:3px}.v14-point-detail{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap;font-size:10.5px;color:#c7ecfa}.v14-point-detail>b{color:#fff;font-size:11px}.v14-point-detail span{padding-left:8px;border-left:1px solid rgba(149,221,249,.28)}.v14-point-detail strong{font-size:11px}.v14-point-detail strong.positive{color:#55d798}.v14-point-detail strong.negative{color:#ff8387}.v14-timeline-svg{height:188px!important;overflow:visible}.v14-point-hit{fill:transparent;stroke:transparent;cursor:pointer;pointer-events:all}.v14-current-dot,.v14-prior-dot{pointer-events:none;transition:r .16s ease,stroke-width .16s ease}.v14-current-dot.active,.v14-prior-dot.active{stroke:#fff!important;stroke-width:2.6!important;filter:drop-shadow(0 0 4px rgba(126,220,255,.75))}.v14-value-matrix{margin-top:2px;border-top:1px solid rgba(144,215,246,.24);padding-top:5px}.v14-value-row{display:grid;align-items:center;min-width:0}.v14-value-row>*{min-width:0;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.v14-value-row .row-label{text-align:left!important;color:#a8ddf4;font-size:10.5px;font-weight:850}.v14-value-row.months{margin-bottom:2px}.v14-value-row.months b{font-size:10.5px;color:#bfe9fa;font-weight:800}.v14-value-row.prior span:not(.row-label){font-size:10.5px;color:#a7d8ed;font-weight:750}.v14-value-row.current span:not(.row-label){font-size:10.5px;color:#fff;font-weight:850}.v14-value-row.current{margin-top:2px}

    .v14-signals{margin-top:12px!important}.v14-card{height:140px!important;grid-template-rows:24px 18px 22px 20px 34px!important}.v14-explain{margin-top:12px!important;padding:13px 15px!important;gap:10px!important}.v14-explain .v13-explain-main p{font-size:13.5px!important;line-height:1.42!important}.v14-explain .v13-explain-facts{padding-top:10px!important}.v14-explain .v13-explain-facts small{font-size:11.5px!important}.v14-explain .v13-explain-facts b{font-size:13px!important}

    .v14-scan{min-height:545px!important;background:linear-gradient(180deg,#fff 0%,#eefaff 100%)!important}.v14-scan-inner{position:relative!important;overflow:hidden!important;max-width:1040px!important}.v14-scan-pulse{height:34px;display:flex;justify-content:center;align-items:center;margin-bottom:-4px}.v14-scan-pulse .v14-brand-pulse{margin:0!important;width:46px;height:34px}.v14-scan-pulse .v14-brand-pulse .run{animation-duration:2.6s}.v14-scan-lens{height:190px!important;transition:transform .65s cubic-bezier(.2,.8,.2,1),filter .65s ease}.v14-scan .v9-wave{animation-duration:5.6s!important}.v14-scan .v9-ring{animation-duration:3.8s!important}.v14-focus-line{position:absolute;left:15%;right:15%;top:234px;height:1px;background:linear-gradient(90deg,transparent,#20b6ef,#0a6ed1,#20b6ef,transparent);transform:scaleX(.18);opacity:.25;animation:v14FocusSweep 2.1s ease-in-out infinite;transform-origin:center}.v14-focus-copy{height:20px;margin-top:15px;text-align:center;font-size:12px;color:#0a6ed1;font-weight:850;letter-spacing:.02em;opacity:0;transform:translateY(5px);transition:.4s ease}.v14-scan.focus .v14-scan-lens{transform:scale(.95);filter:drop-shadow(0 9px 18px rgba(10,110,209,.12))}.v14-scan.focus .v14-focus-line{animation:v14Converge .72s cubic-bezier(.2,.8,.2,1) both}.v14-scan.focus .v14-focus-copy{opacity:1;transform:none}.v14-progress{margin-top:26px!important}.v14-progress .v13-step.active>span{transform:scale(1.08);box-shadow:0 0 0 5px #e8f7ff,0 8px 18px rgba(10,110,209,.16)!important}.v14-progress .v13-step.done>span{background:#e8f8ff!important;color:#075e96!important;border-color:#64c8ef!important}
    @keyframes v14FocusSweep{0%,100%{transform:scaleX(.18);opacity:.16}50%{transform:scaleX(.68);opacity:.55}}@keyframes v14Converge{0%{transform:scaleX(.72);opacity:.55}70%{transform:scaleX(.12);opacity:1}100%{transform:scaleX(.03);opacity:0}}

    @media(max-width:1180px){.v14-hero{grid-template-columns:1fr!important}.v14-related-list{grid-template-columns:1fr}.v14-timeline-head{grid-template-columns:1fr!important}.v14-point-detail{justify-content:flex-start}.v14-value-row>*{font-size:9.5px!important}}
    @media(max-width:780px){.v14-brand-pulse{width:32px;height:24px;margin-right:12px}.v14-brand>span{margin-left:12px!important;padding-left:12px!important}.v14-value-matrix{overflow-x:auto}.v14-value-row{min-width:680px}.v14-related-list{grid-template-columns:1fr}}
    @media(prefers-reduced-motion:reduce){.v14-brand-pulse .run,.v14-focus-line,.v14-scan-lens{animation:none!important;transition:none!important}.v14-scan.focus .v14-focus-copy{opacity:1;transform:none}}
  `;


  STYLES += `
    /* v0.15.0 - compact executive result + clipping fix */
    .v14-shell #root{overflow:auto!important;overscroll-behavior:contain}
    .v12-result{padding:9px 18px 12px!important}
    .v12-answer{margin-bottom:8px!important;padding:7px 11px!important;gap:10px!important;font-size:14px!important;line-height:1.28!important}
    .v12-answer b{font-size:15px!important}.v12-insight-icon{width:30px!important;height:30px!important}.v12-insight-icon svg{width:18px!important;height:18px!important}

    .v14-hero{grid-template-columns:minmax(280px,.72fr) minmax(540px,1.68fr)!important;gap:20px!important;padding:14px 20px 13px!important;align-items:start!important}
    .v14-signal-name{font-size:19px!important;line-height:1.08!important;letter-spacing:-.012em!important;margin-top:4px!important;max-width:360px}
    .v14-impact{font-size:30px!important;line-height:.98!important;margin-top:8px!important;letter-spacing:-.028em!important}
    .v14-hero .v12-kicker{font-size:11.5px!important}.v14-hero .v12-dimension-type{font-size:11.5px!important;margin-top:4px!important}
    .v14-hero .v12-tags{margin-top:7px!important;gap:6px!important}.v14-hero .v12-role,.v14-hero .v12-life{padding:3px 8px!important;font-size:10.5px!important}
    .v14-hero .v12-impact-label{font-size:10.5px!important;margin-top:4px!important}.v14-hero .v12-context{font-size:12.5px!important;margin-top:5px!important}
    .v14-metrics{margin-top:8px!important;padding-top:7px!important}.v14-metrics>div{padding-right:9px!important}.v14-metrics>div+div{padding-left:9px!important}.v14-metrics small{font-size:10px!important}.v14-metrics b{font-size:13px!important;margin-top:2px!important}
    .v14-related{margin-top:7px!important;padding-top:7px!important}.v14-related summary{font-size:11.5px!important}.v14-related summary em{font-size:10.5px!important}.v14-related[open] summary em::after{font-size:10.5px!important}.v14-related-list{margin-top:6px!important;gap:4px!important}.v14-related-row{padding:5px 7px!important}.v14-related-row b{font-size:10.8px!important}.v14-related-row div span{font-size:9.8px!important}.v14-related-row strong{font-size:11px!important}
    .v15-related-more{margin-top:5px}.v15-related-more>summary{display:block!important;color:#7dd8f8!important;font-size:10.5px!important;font-weight:900!important;cursor:pointer}.v15-related-more-list{margin-top:5px;display:grid;grid-template-columns:1fr 1fr;gap:4px}

    .v14-timeline-head{gap:10px!important;margin-bottom:1px!important}.v14-timeline .timeline-title{font-size:14px!important}.v14-timeline .timeline-legend{font-size:11.5px!important;gap:14px!important}.v14-point-hint{font-size:9.8px!important}.v14-point-detail{font-size:9.8px!important;gap:6px!important}.v14-point-detail>b,.v14-point-detail strong{font-size:10.2px!important}
    .v15-chart-wrap{position:relative;min-width:0}.v14-timeline-svg{height:158px!important}.v15-point-pop{position:absolute;z-index:4;transform:translate(-50%,-100%);min-width:126px;padding:7px 9px;border-radius:8px;border:1px solid rgba(132,221,255,.62);background:#063c67;color:#dff6ff;box-shadow:0 8px 18px rgba(0,24,49,.22);font-size:9.8px;line-height:1.3;pointer-events:none;white-space:nowrap}.v15-point-pop:after{content:'';position:absolute;left:50%;bottom:-5px;width:8px;height:8px;background:#063c67;border-right:1px solid rgba(132,221,255,.62);border-bottom:1px solid rgba(132,221,255,.62);transform:translateX(-50%) rotate(45deg)}.v15-point-pop b{display:block;color:#fff;font-size:10.5px;margin-bottom:3px}.v15-point-pop span{display:block}.v15-point-pop strong{color:#fff}
    .v14-value-matrix{padding-top:4px!important}.v14-value-row.months{margin-bottom:1px!important}.v14-value-row .row-label,.v14-value-row.months b,.v14-value-row.prior span:not(.row-label),.v14-value-row.current span:not(.row-label){font-size:9.8px!important}.v14-value-row.current{margin-top:1px!important}

    .v14-signals{margin-top:8px!important;padding-top:0!important;border-top:0!important}.v13-signal-head{margin-bottom:6px!important}.v13-signal-head b{font-size:15px!important}.v13-signal-head span{font-size:11.5px!important}
    .v14-card{height:118px!important;padding:9px 10px!important;grid-template-rows:21px 16px 18px 17px 28px!important;row-gap:1px!important}.v14-card.selected{padding:8px 9px!important}.v14-card .v12-card-name{font-size:13.2px!important;line-height:17px!important}.v14-card .v12-card-dim{font-size:10.8px!important}.v14-card .v12-card-role{font-size:10.2px!important}.v14-card .v12-card-life{font-size:9.5px!important;padding:2px 6px!important}.v14-card .v12-card-context{font-size:10.8px!important}.v14-card .v12-card-impact{font-size:16px!important}.v14-card .v12-spark{height:24px!important}.v14-card .v12-card-arrow{font-size:19px!important}

    .v14-explain{margin-top:8px!important;padding:9px 13px!important;gap:7px!important}.v14-explain .v13-explain-main{grid-template-columns:34px minmax(0,1fr)!important;gap:9px!important}.v14-explain .v13-explain-main>div>span{font-size:13.5px!important}.v14-explain .v13-explain-main p{font-size:12.2px!important;line-height:1.32!important;margin-top:3px!important}.v14-explain .v13-explain-facts{padding-top:7px!important}.v14-explain .v13-explain-facts>div{padding:0 13px!important}.v14-explain .v13-explain-facts>div:first-child{padding-left:1px!important}.v14-explain .v13-explain-facts small{font-size:10.5px!important}.v14-explain .v13-explain-facts b{font-size:11.8px!important;line-height:1.2!important;margin-top:2px!important}

    .v14-shell .v13-kpi{min-height:94px!important;padding:12px 0!important}.v13-kpi-metrics{min-height:54px!important}.v13-kpi-cell{padding:0 19px!important}.v13-kpi-cell small{font-size:11.5px!important;margin-bottom:3px!important}.v13-kpi-cell strong{font-size:27px!important}.v13-kpi-cell.rate strong{font-size:22px!important}.v13-run{height:50px!important}.v13-run-main{font-size:17px!important}.v13-run-sub{font-size:9.8px!important}

    @media(max-width:1180px){.v14-hero{grid-template-columns:1fr!important}.v15-related-more-list{grid-template-columns:1fr}.v14-timeline-svg{height:150px!important}}
    @media(max-width:780px){.v15-related-more-list{grid-template-columns:1fr}.v14-card{height:auto!important;min-height:116px}.v14-explain .v13-explain-facts>div{padding:8px 0!important}}
  `;



  /* ================================================================
   * v0.16.1 - final clarity + robust period coverage pass
   * - YTD-aware labels for monthly data carried in SAC Date fields
   * - explicit separation of overall YoY (%) and signal impact (pp)
   * - clearer dominant narrative and grouped-signal wording
   * - Countertrend definition in the info panel
   * - materially upgraded 4.8s executive loading experience
   * ================================================================ */

  function v16MonthlyDateCoverage(model){
    var entries=model&&model.entries||[],periods={},current=model&&model.currentPeriod,prior=model&&model.priorPeriod;
    if(!entries.length||!current||!prior||current.granularity!=='day'||prior.granularity!=='day'||current.day!==1||prior.day!==1)return null;
    for(var i=0;i<entries.length;i++){
      var p=entries[i].period;
      if(!p||p.granularity!=='day'||p.day!==1)return null;
      periods[p.key]=p;
    }
    var list=Object.keys(periods).map(function(k){return periods[k];});
    if(list.length<4)return null;

    function monthsFor(year,throughMonth){
      var seen={},months=[];
      for(var j=0;j<list.length;j++){
        var q=list[j];
        if(q.year!==year||q.month>throughMonth)continue;
        if(!seen[q.month]){seen[q.month]=true;months.push(q.month);}
      }
      months.sort(function(a,b){return a-b;});
      return months;
    }
    function contiguous(months){
      if(!months.length)return false;
      for(var k=1;k<months.length;k++)if(months[k]!==months[k-1]+1)return false;
      return true;
    }
    function sameMonths(a,b){
      if(a.length!==b.length)return false;
      for(var k=0;k<a.length;k++)if(a[k]!==b[k])return false;
      return true;
    }

    var currentMonths=monthsFor(current.year,current.month),priorMonths=monthsFor(prior.year,prior.month);
    if(!currentMonths.length||!priorMonths.length)return null;
    return {
      currentMonths:currentMonths,priorMonths:priorMonths,
      currentContiguous:contiguous(currentMonths),priorContiguous:contiguous(priorMonths),
      sameMonths:sameMonths(currentMonths,priorMonths),
      currentStart:currentMonths[0],currentEnd:currentMonths[currentMonths.length-1],
      priorStart:priorMonths[0],priorEnd:priorMonths[priorMonths.length-1]
    };
  }

  function v16YtdLabel(period){
    if(!period)return '';
    return 'YTD through '+monthShort(period.month)+' '+period.year;
  }

  function v161MonthRangeLabel(year,months,contiguous){
    if(!months||!months.length)return String(year||'');
    var first=months[0],last=months[months.length-1];
    if(!contiguous)return 'Available months through '+monthShort(last)+' '+year;
    if(first===last)return monthShort(first)+' '+year;
    return monthShort(first)+' to '+monthShort(last)+' '+year;
  }

  var v16BaseBuildModel=buildModel;
  buildModel=function(widget){
    var model=v16BaseBuildModel(widget),coverage=v16MonthlyDateCoverage(model);
    if(coverage){
      model.monthlyDateProxy=true;
      model.periodCoverage=coverage;
      var isTrueYtd=coverage.sameMonths&&coverage.currentContiguous&&coverage.priorContiguous&&coverage.currentStart===1&&coverage.priorStart===1&&coverage.currentEnd===model.currentPeriod.month&&coverage.priorEnd===model.priorPeriod.month&&coverage.currentEnd===coverage.priorEnd;
      if(isTrueYtd){
        model.currentScopeLabel=v16YtdLabel(model.currentPeriod);
        model.priorScopeLabel=v16YtdLabel(model.priorPeriod);
        model.periodCoverageKind='ytd';
      }else{
        model.currentScopeLabel=v161MonthRangeLabel(model.currentPeriod.year,coverage.currentMonths,coverage.currentContiguous);
        model.priorScopeLabel=v161MonthRangeLabel(model.priorPeriod.year,coverage.priorMonths,coverage.priorContiguous);
        model.periodCoverageKind=coverage.sameMonths&&coverage.currentContiguous&&coverage.priorContiguous?'aligned-range':'available-range';
      }
    }
    return model;
  };

  function v16PlainPct(rate){
    var t=formatPctRatio(rate);
    return t.replace(/^\+/, '');
  }

  WHYWidget.prototype._answerText=function(analysis){
    var groups=analysis.topSignalGroups||[];
    if(!groups.length)return '<b>No material signal stands out.</b> The change is broadly distributed across the bound dimensions.';
    var primary=v14AlignedGroup(analysis),opposite=v14OppositeGroup(analysis,primary),c=primary&&primary.lead,name=c?v13EvidenceName(c):'';
    var measure=this._model&&this._model.measureLabel?this._model.measureLabel:'The total';
    var isYtd=!!(this._model&&/^YTD\b/.test(this._model.currentScopeLabel||''));
    var scopeWord=isYtd?' YTD':'';
    var direction=analysis.overallRate>0?'grew':analysis.overallRate<0?'declined':'was unchanged';
    var totalAbs=v16PlainPct(Math.abs(analysis.overallRate));
    var totalSentence=analysis.overallRate===0?('<b>'+esc(measure)+' was unchanged'+scopeWord+'.</b>'):('<b>'+esc(measure)+' '+direction+' '+esc(totalAbs)+scopeWord+'.</b>');
    if(analysis.classification==='dominant'&&primary){
      var text=totalSentence+' One dominant signal stands out: '+esc(name)+' has a measured impact of <span class="v13-inline '+v10DirectionClass(c.impactRate)+'">'+esc(formatPp(c.impactRate))+'</span> on the total YoY rate.';
      if(opposite&&candidateImpact(opposite.lead)>=Math.max(.005,candidateImpact(c)*.35)){
        text+=' <span class="v14-answer-contrast">This is partly offset by '+esc(v13EvidenceName(opposite.lead))+' at <b class="v13-inline '+v10DirectionClass(opposite.lead.impactRate)+'">'+esc(formatPp(opposite.lead.impactRate))+'</b>.</span>';
      }
      return text;
    }
    if(analysis.classification==='mixed'){
      var globalStrongest=groups[0]||null;
      if(primary&&signOf(primary.lead.impactRate)===signOf(analysis.overallRate)){
        if(globalStrongest&&signOf(globalStrongest.lead.impactRate)===-signOf(analysis.overallRate)){
          return totalSentence+' The strongest opposing signal is '+esc(v13EvidenceName(globalStrongest.lead))+' at <span class="v13-inline '+v10DirectionClass(globalStrongest.lead.impactRate)+'">'+esc(formatPp(globalStrongest.lead.impactRate))+'</span>. The strongest aligned signal is '+esc(v13EvidenceName(primary.lead))+' at <span class="v13-inline '+v10DirectionClass(primary.lead.impactRate)+'">'+esc(formatPp(primary.lead.impactRate))+'</span>.';
        }
        var mixed=totalSentence+' The strongest aligned signal is '+esc(v13EvidenceName(primary.lead))+' at <span class="v13-inline '+v10DirectionClass(primary.lead.impactRate)+'">'+esc(formatPp(primary.lead.impactRate))+'</span>.';
        if(opposite)mixed+=' '+esc(v13EvidenceName(opposite.lead))+' has an opposing impact of <span class="v13-inline '+v10DirectionClass(opposite.lead.impactRate)+'">'+esc(formatPp(opposite.lead.impactRate))+'</span>.';
        return mixed;
      }
      return totalSentence+' <b>No single signal dominates.</b> Several material movements are affecting the total YoY rate.';
    }
    return totalSentence+' <b>No material signal stands out.</b> The change is broadly distributed across the bound dimensions.';
  };

  v14SignalSentence=function(model,analysis,group){
    if(!group||!group.lead)return '';
    var c=group.lead,name=v13EvidenceName(c),life=lifecycleKind(c),impact=formatPp(c.impactRate),actual=formatPctRatio(c.deltaPct),overall=formatPctRatio(analysis.overallRate);
    if(analysis.classification==='dominant'&&candidateKey(c)===analysis.editorialSignalKey){
      var opposite=v14OppositeGroup(analysis,group);
      var sentence='<b>'+esc(name)+'</b> is the most specific signal representing the strongest grouped movement aligned with the overall '+(analysis.overallRate>=0?'increase':'decline')+'. Its measured impact on the total YoY rate is <b class="v13-inline '+v10DirectionClass(c.impactRate)+'">'+esc(impact)+'</b>.';
      if(opposite)sentence+=' The strongest opposing signal is <b>'+esc(v13EvidenceName(opposite.lead))+'</b> at <b class="v13-inline '+v10DirectionClass(opposite.lead.impactRate)+'">'+esc(formatPp(opposite.lead.impactRate))+'</b>.';
      return sentence;
    }
    if(life==='disappeared')return '<b>'+esc(name)+'</b> is no longer present in the current period. The move from <b>'+esc(formatValue(c.prior,model.unit))+'</b> to <b>'+esc(formatValue(c.current,model.unit))+'</b> may reflect business movement or a structural data change.';
    if(life==='new')return '<b>'+esc(name)+'</b> is new in the current period. The move from <b>'+esc(formatValue(c.prior,model.unit))+'</b> to <b>'+esc(formatValue(c.current,model.unit))+'</b> may reflect business movement or a structural data change.';
    if(analysis.overallRate>0&&c.impactRate<0)return '<b>'+esc(name)+'</b> moved '+esc(actual)+' while the overall result moved '+esc(overall)+'. Its measured impact lowers the total YoY growth rate by <b class="v13-inline negative">'+esc(formatPp(Math.abs(c.impactRate)).replace(/^\+/,''))+'</b>.';
    if(analysis.overallRate<0&&c.impactRate>0)return '<b>'+esc(name)+'</b> moved '+esc(actual)+' while the overall result moved '+esc(overall)+'. Its measured impact offsets <b class="v13-inline positive">'+esc(impact.replace(/^\+/,''))+'</b> of the total YoY decline.';
    return '<b>'+esc(name)+'</b> moved '+esc(actual)+' versus '+esc(overall)+' overall and changes the total YoY rate by <b class="v13-inline '+v10DirectionClass(c.impactRate)+'">'+esc(impact)+'</b>.';
  };

  var v16BaseHeroSignalHtml=WHYWidget.prototype._heroSignalHtml;
  WHYWidget.prototype._heroSignalHtml=function(model,analysis,group){
    var html=v16BaseHeroSignalHtml.call(this,model,analysis,group);
    return html.replace('Impact on total rate','Impact on total YoY rate');
  };

  WHYWidget.prototype._scanHtml=function(model,analysis){
    var step=Math.max(0,Math.min(3,Number(this._scanStep)||0));
    var dims=(model.dimAliases||[]).map(function(a){return '<span>'+esc(model.dimLabels[a]||a)+'</span>';}).join('');
    var titles=['Scanning dimensions','Grouping related movements','Ranking material signals','Signal map ready'];
    var subs=['Reading period-aligned movement across the bound dimensions.','Connecting overlapping views without double counting.','Ordering independent signals by measured impact on the total YoY rate.','Converging on the movements that deserve attention first.'];
    function state(i){return i<step?'done':i===step?'active':'';}
    function mark(i){return i<step?'✓':String(i+1);}
    var width=[18,47,78,100][step];
    return '<div class="v16-scan s'+step+'"><div class="v16-scan-inner">'
      +'<div class="v16-scan-brand">'+v14PulseMark()+'<span>WHY SIGNAL SCAN</span></div>'
      +'<div class="v16-visual">'
        +'<div class="v16-dimension-view"><div class="v16-dim-label">BOUND DIMENSIONS</div><div class="v16-dim-rail">'+dims+'<i class="v16-sweep"></i></div></div>'
        +'<div class="v16-merge-view" aria-hidden="true"><svg viewBox="0 0 720 150" preserveAspectRatio="none"><path class="lane a" d="M25 28 C190 28 228 75 350 75 S535 75 695 75"></path><path class="lane b" d="M25 75 C190 75 228 75 350 75 S535 75 695 75"></path><path class="lane c" d="M25 122 C190 122 228 75 350 75 S535 75 695 75"></path><circle class="merge-core" cx="350" cy="75" r="16"></circle></svg><div class="v16-merge-caption">Related views converge into independent signal groups</div></div>'
        +'<div class="v16-rank-view" aria-hidden="true"><div class="v16-rank-row one"><b>01</b><i></i><span>Material impact</span></div><div class="v16-rank-row two"><b>02</b><i></i><span>Opposing impact</span></div><div class="v16-rank-row three"><b>03</b><i></i><span>Supporting signal</span></div></div>'
        +'<div class="v16-ready-view" aria-hidden="true"><div class="v16-ready-mark">'+v14PulseMark()+'</div><div class="v16-ready-title">Signal map ready</div><div class="v16-ready-sub">Focus on what matters first</div><div class="v16-converge-line"></div></div>'
      +'</div>'
      +'<div class="v16-phase"><b>'+titles[step]+'</b><span>'+subs[step]+'</span></div>'
      +'<div class="v16-progress-track"><i style="width:'+width+'%"></i></div>'
      +'<div class="v16-steps"><div class="'+state(0)+'"><em>'+mark(0)+'</em><span><b>Scanning dimensions</b><small>Period-aligned movements</small></span></div><div class="'+state(1)+'"><em>'+mark(1)+'</em><span><b>Grouping movements</b><small>Inspectable related views</small></span></div><div class="'+state(2)+'"><em>'+mark(2)+'</em><span><b>Ranking signals</b><small>Measured impact, no causality</small></span></div></div>'
    +'</div></div>';
  };

  WHYWidget.prototype._ensure=function(){
    if(this.shadowRoot)return;
    this.attachShadow({mode:'open'});
    var info='<div id="why-info-pop" class="info-popover v9-info v10-info v13-info v16-info" role="dialog" aria-label="About WHY"><b>How WHY works</b><p>WHY analyzes the bound SAC result set, compares period-aligned segment movement, consolidates overlapping findings and ranks material signals by measured impact on the total YoY rate.</p><dl><dt>YoY change</dt><dd>The total measure change from the prior comparison period to the current period, shown as a percent.</dd><dt>Signal impact (pp)</dt><dd>How much a signal changes the total YoY rate, shown in percentage points. It is not the signal\'s own growth rate.</dd><dt>Trend baseline</dt><dd>Change the segment would show if it followed the overall trend.</dd><dt>Actual change</dt><dd>Observed change versus the comparison period.</dd><dt>Gap to trend</dt><dd>Difference between actual change and the trend baseline.</dd><dt>Countertrend</dt><dd>A signal whose own movement runs against the overall direction, for example a decline while the total grows. It is descriptive, not causal.</dd><dt>Related evidence</dt><dd>Open the selected signal to inspect every grouped view behind the evidence count.</dd><dt>Color</dt><dd>Green and red indicate positive or negative impact direction. They do not imply business favorability.</dd><dt>New / Disappeared</dt><dd>Lifecycle flags that can reflect genuine business movement or structural/master-data changes.</dd></dl><div class="info-meta">Deterministic signal logic · no AI required · signals, not causality</div></div>';
    this.shadowRoot.innerHTML='<style>'+STYLES+'</style><div class="why v9-shell v10-shell v13-shell v14-shell"><div class="top v9-top v10-top v13-top v14-top"><div class="brand v9-brand v10-brand v13-brand v14-brand">'+v14PulseMark()+'<strong class="v9-wordmark v10-wordmark v13-wordmark v14-wordmark">WHY</strong><span>Variance Signal Analysis</span></div><div class="v14-top-tools"><button id="why-info" class="info-button v9-info-button v10-info-button v13-info-button" type="button" aria-label="About WHY" aria-expanded="false">i</button></div>'+info+'</div><div id="root"></div></div>';
  };

  STYLES += `
    /* v0.16.0 - YTD clarity + executive analysis experience */
    .v16-info{max-height:min(650px,calc(100vh - 100px));overflow:auto!important;scrollbar-width:thin;scrollbar-color:#71c7ed transparent}
    .v16-info dl{grid-template-columns:126px 1fr!important}

    .v16-scan{min-height:545px;height:100%;background:linear-gradient(180deg,#fff 0%,#f5fcff 56%,#eaf8ff 100%);display:flex;align-items:center;justify-content:center;padding:22px 28px;overflow:hidden}
    .v16-scan-inner{width:min(960px,100%);position:relative;text-align:center}
    .v16-scan-brand{display:inline-flex;align-items:center;gap:12px;color:#0a5e95;font-size:11px;font-weight:950;letter-spacing:.12em;margin-bottom:14px}
    .v16-scan-brand .v14-brand-pulse{width:42px;height:27px;margin:0!important}.v16-scan-brand .v14-brand-pulse .run{animation-duration:1.65s!important;stroke-width:2.7}
    .v16-visual{position:relative;height:238px;border-top:1px solid #c7ebfb;border-bottom:1px solid #c7ebfb;background:linear-gradient(180deg,rgba(255,255,255,.86),rgba(235,249,255,.76));overflow:hidden}
    .v16-dimension-view,.v16-merge-view,.v16-rank-view,.v16-ready-view{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;opacity:0;transform:translateY(8px) scale(.99);transition:opacity .38s ease,transform .48s cubic-bezier(.2,.8,.2,1)}
    .v16-scan.s0 .v16-dimension-view,.v16-scan.s1 .v16-merge-view,.v16-scan.s2 .v16-rank-view,.v16-scan.s3 .v16-ready-view{opacity:1;transform:none}
    .v16-dim-label{font-size:10px;color:#3379a4;font-weight:950;letter-spacing:.12em;margin-bottom:16px}
    .v16-dim-rail{position:relative;width:min(720px,88%);display:flex;justify-content:center;align-items:center;gap:12px;padding:28px 18px;border-top:1px solid #bde5f8;border-bottom:1px solid #bde5f8;overflow:hidden}
    .v16-dim-rail span{position:relative;z-index:2;padding:9px 15px;border:1px solid #68c7ef;border-radius:999px;background:#fff;color:#075d94;font-size:13px;font-weight:900;box-shadow:0 4px 11px rgba(10,110,209,.06);animation:v16DimPulse 1.8s ease-in-out infinite}
    .v16-dim-rail span:nth-child(2){animation-delay:.22s}.v16-dim-rail span:nth-child(3){animation-delay:.44s}.v16-dim-rail span:nth-child(4){animation-delay:.66s}.v16-dim-rail span:nth-child(5){animation-delay:.88s}
    .v16-sweep{position:absolute;z-index:1;top:9px;bottom:9px;width:120px;background:linear-gradient(90deg,transparent,rgba(31,178,235,.17),rgba(10,110,209,.28),rgba(31,178,235,.17),transparent);filter:blur(.2px);animation:v16Sweep 1.35s cubic-bezier(.4,0,.2,1) infinite}

    .v16-merge-view svg{width:min(780px,92%);height:150px;overflow:visible}.v16-merge-view .lane{fill:none;stroke:#86d5f4;stroke-width:2;stroke-linecap:round;stroke-dasharray:7 9;animation:v16Flow 1.25s linear infinite}.v16-merge-view .lane.b{stroke:#0a6ed1;stroke-width:2.5;animation-delay:-.35s}.v16-merge-view .lane.c{animation-delay:-.7s}.v16-merge-view .merge-core{fill:#fff;stroke:#0a6ed1;stroke-width:3;filter:drop-shadow(0 5px 10px rgba(10,110,209,.18));animation:v16Core 1.25s ease-in-out infinite}.v16-merge-caption{margin-top:-4px;font-size:12px;font-weight:850;color:#2c719b}

    .v16-rank-view{gap:10px}.v16-rank-row{width:min(650px,82%);display:grid;grid-template-columns:34px minmax(0,1fr) 145px;gap:12px;align-items:center;text-align:left}.v16-rank-row b{color:#0a6ed1;font-size:11px}.v16-rank-row i{display:block;height:12px;border-radius:999px;background:linear-gradient(90deg,#0a6ed1,#27b5ec);transform-origin:left;animation:v16RankGrow .72s cubic-bezier(.2,.8,.2,1) both}.v16-rank-row.one i{width:100%}.v16-rank-row.two i{width:69%;animation-delay:.12s}.v16-rank-row.three i{width:42%;animation-delay:.24s}.v16-rank-row span{font-size:11px;color:#276b93;font-weight:800;white-space:nowrap}

    .v16-ready-view{background:radial-gradient(circle at center,rgba(208,242,255,.68),transparent 44%)}.v16-ready-mark{width:76px;height:56px;display:grid;place-items:center;margin-bottom:5px}.v16-ready-mark .v14-brand-pulse{width:72px;height:46px;margin:0!important}.v16-ready-mark .v14-brand-pulse .run{stroke-width:2.8;animation-duration:1.05s!important}.v16-ready-title{font-size:25px;line-height:1.1;font-weight:950;color:#0b2f4c;letter-spacing:-.02em}.v16-ready-sub{margin-top:7px;font-size:13px;font-weight:850;color:#176b9d}.v16-converge-line{width:min(600px,72%);height:1px;margin-top:19px;background:linear-gradient(90deg,transparent,#5bc7ef,#0a6ed1,#5bc7ef,transparent);animation:v16Converge .8s cubic-bezier(.2,.8,.2,1) both}

    .v16-phase{margin-top:18px;min-height:50px}.v16-phase b{display:block;font-size:20px;color:#0b2f4c;letter-spacing:-.01em}.v16-phase span{display:block;margin-top:5px;font-size:12.5px;color:#39789e;font-weight:700}
    .v16-progress-track{width:min(760px,86%);height:4px;margin:15px auto 13px;border-radius:999px;background:#dff3fc;overflow:hidden}.v16-progress-track i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#52c6ef,#0a6ed1);transition:width .65s cubic-bezier(.2,.8,.2,1);box-shadow:0 0 10px rgba(32,174,232,.22)}
    .v16-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;width:min(820px,92%);margin:0 auto}.v16-steps>div{display:grid;grid-template-columns:30px 1fr;gap:8px;align-items:center;text-align:left;padding:8px 10px;border:1px solid #c9e9f8;border-radius:10px;background:rgba(255,255,255,.76);opacity:.56;transition:.35s ease}.v16-steps>div.active{opacity:1;border-color:#4fc0ed;background:#fff;box-shadow:0 6px 14px rgba(10,110,209,.08);transform:translateY(-2px)}.v16-steps>div.done{opacity:.82}.v16-steps em{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;border:1px solid #8bd6f4;color:#0a6ed1;font-size:11px;font-style:normal;font-weight:950;background:#fff}.v16-steps .done em{background:#e8f8ff}.v16-steps span b{display:block;font-size:11.5px;color:#124a70}.v16-steps span small{display:block;margin-top:2px;font-size:9.8px;color:#5484a2;font-weight:700}

    @keyframes v16Sweep{0%{left:-18%}100%{left:104%}}@keyframes v16DimPulse{0%,100%{transform:translateY(0);box-shadow:0 4px 11px rgba(10,110,209,.06)}50%{transform:translateY(-2px);box-shadow:0 8px 16px rgba(10,110,209,.12)}}@keyframes v16Flow{to{stroke-dashoffset:-32}}@keyframes v16Core{0%,100%{r:15;opacity:.8}50%{r:19;opacity:1}}@keyframes v16RankGrow{from{transform:scaleX(.08);opacity:.35}to{transform:scaleX(1);opacity:1}}@keyframes v16Converge{from{transform:scaleX(.15);opacity:.25}65%{transform:scaleX(1);opacity:1}to{transform:scaleX(.7);opacity:.75}}
    @media(max-width:780px){.v16-scan{padding:18px 16px}.v16-visual{height:226px}.v16-dim-rail{gap:7px;flex-wrap:wrap;padding:20px 10px}.v16-dim-rail span{font-size:11.5px;padding:7px 10px}.v16-steps{grid-template-columns:1fr}.v16-rank-row{grid-template-columns:28px minmax(0,1fr) 105px}.v16-rank-row span{font-size:9.8px}}
    @media(prefers-reduced-motion:reduce){.v16-dim-rail span,.v16-sweep,.v16-merge-view .lane,.v16-merge-view .merge-core,.v16-rank-row i,.v16-ready-mark .run,.v16-converge-line{animation:none!important}.v16-dimension-view,.v16-merge-view,.v16-rank-view,.v16-ready-view{transition:none!important}}

    /* v1.0.0 - public release, functionally equivalent to validated v0.16.2 TEST */
    /* v0.16.2 - no-scroll loader + selected-card clarity */
    .v14-shell #root{min-height:0!important;overflow:hidden!important;overscroll-behavior:none!important;display:grid!important;grid-template-rows:auto minmax(0,1fr)!important;container-type:size}
    .v16-scan{min-height:0!important;height:100%!important;max-height:100%!important}
    .v14-card.selected{background:#fff!important}

    @container (max-height:640px){
      .v16-scan{padding:14px 22px!important}
      .v16-scan-brand{margin-bottom:8px!important}
      .v16-visual{height:200px!important}
      .v16-phase{margin-top:11px!important;min-height:44px!important}
      .v16-phase b{font-size:18px!important}
      .v16-progress-track{margin:10px auto 9px!important}
      .v16-steps>div{padding:6px 8px!important}
    }
    @container (max-height:540px){
      .v16-scan{padding:9px 18px!important}
      .v16-scan-brand{margin-bottom:5px!important}
      .v16-visual{height:166px!important}
      .v16-merge-view svg{height:112px!important}
      .v16-rank-view{gap:7px!important}
      .v16-ready-mark{width:62px!important;height:43px!important;margin-bottom:2px!important}
      .v16-ready-mark .v14-brand-pulse{width:60px!important;height:38px!important}
      .v16-ready-title{font-size:22px!important}
      .v16-ready-sub{margin-top:4px!important;font-size:11.5px!important}
      .v16-converge-line{margin-top:12px!important}
      .v16-phase{margin-top:8px!important;min-height:38px!important}
      .v16-phase b{font-size:16px!important}
      .v16-phase span{margin-top:3px!important;font-size:11px!important}
      .v16-progress-track{margin:8px auto 7px!important}
      .v16-steps{gap:6px!important}
      .v16-steps>div{padding:5px 7px!important;grid-template-columns:26px 1fr!important;gap:6px!important}
      .v16-steps em{width:23px!important;height:23px!important}
      .v16-steps span b{font-size:10.5px!important}
      .v16-steps span small{font-size:9px!important}
    }
    @container (max-height:460px){
      .v16-scan{padding:7px 14px!important}
      .v16-scan-brand{margin-bottom:3px!important}
      .v16-visual{height:138px!important}
      .v16-dim-label{margin-bottom:8px!important}
      .v16-dim-rail{padding:15px 10px!important}
      .v16-dim-rail span{padding:6px 9px!important;font-size:10.5px!important}
      .v16-merge-view svg{height:90px!important}
      .v16-rank-row{gap:8px!important}
      .v16-phase{margin-top:6px!important;min-height:34px!important}
      .v16-phase b{font-size:15px!important}
      .v16-phase span{font-size:10px!important}
      .v16-progress-track{margin:6px auto!important}
      .v16-steps>div{padding:4px 6px!important}
    }
  `;

  WHYWidget.prototype.connectedCallback=function(){this._ensure();this._schedule();};
  WHYWidget.prototype.onCustomWidgetBeforeUpdate=function(){this._ensure();};
  WHYWidget.prototype.onCustomWidgetAfterUpdate=function(){this._selectedSignalKey=null;this._revealed=false;this._scanning=false;this._animateReveal=false;this._schedule();};
  WHYWidget.prototype.onCustomWidgetResize=function(){};
  WHYWidget.prototype.disconnectedCallback=function(){if(this._timer)clearTimeout(this._timer);this._timer=null;};

  if(!customElements.get('com-custom-why'))customElements.define('com-custom-why',WHYWidget);
}());