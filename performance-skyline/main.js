/* PERFORMANCE SKYLINE v0.3.0 | SAP Analytics Cloud Custom Widget
 * Standalone Web Component. No React, external assets, network calls, or writeback.
 * Design/implementation: original SAC-oriented adaptation of a 2D-to-3D calendar skyline concept.
 */
(function () {
  'use strict';
  const TAG = 'com-custom-sac-performanceskyline';
  if (customElements.get(TAG)) return;
  const DAY = 86400000;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const utcKey = ms => new Date(ms).toISOString().slice(0, 10);
  const validDay = ms => Number.isFinite(ms) && ms >= Date.UTC(1900,0,1) && ms <= Date.UTC(2100,11,31);
  const css = `
    :host{display:block;width:100%;height:100%;min-width:280px;min-height:240px;box-sizing:border-box;color:#112944;font-family:Inter,Arial,-apple-system,BlinkMacSystemFont,system-ui,sans-serif}
    *,*:before,*:after{box-sizing:border-box}
    .shell{--ink:#122e50;--secondary:#355c82;--soft:#446b91;background:linear-gradient(134deg,#ffffff 0%,#f3f8ff 52%,#eaf3fc 100%);border:1px solid #c4d8ed;border-radius:18px;min-height:100%;padding:clamp(16px,2vw,28px);overflow:hidden;position:relative;box-shadow:0 12px 35px rgba(27,65,114,.09)}
    .shell:before{content:"";position:absolute;top:-185px;right:-85px;width:540px;height:350px;border-radius:50%;pointer-events:none;background:radial-gradient(ellipse,rgba(132,197,246,.22),transparent 70%)}
    .header{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start;justify-content:space-between;position:relative}
    .eyebrow{font-weight:750;letter-spacing:.19em;font-size:10px;color:#225a9c;margin:0 0 8px}
    .title{font-size:clamp(22px,2.4vw,30px);line-height:1.12;font-weight:750;letter-spacing:-.035em;margin:0;color:#102b4d}
    .sub{color:#31577c;font-size:12px;line-height:1.6;margin-top:10px;font-weight:540;letter-spacing:.015em}
    .actions{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:10px}
    .measurePicker{display:flex;align-items:center;gap:9px;border:1px solid #b6d1eb;background:#fff;border-radius:9px;padding:4px 9px;min-height:36px;box-shadow:0 2px 7px rgba(31,92,150,.05)}
    .measurePicker[hidden]{display:none!important}
    .measurePicker label{font-size:10px;letter-spacing:.05em;text-transform:uppercase;font-weight:800;color:#235b93;white-space:nowrap}
    .measurePicker select{min-width:140px;max-width:300px;background:#fff;color:#123e72;font-size:12px;font-weight:750;border:0;outline:0;padding:5px 16px 5px 3px;cursor:pointer;text-overflow:ellipsis}
    .measurePicker:focus-within{outline:2px solid #2d76c2;outline-offset:2px}
    .spotOverlay{position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;padding:clamp(12px,2.8vw,32px);background:rgba(223,239,252,.83);backdrop-filter:blur(7px)}
    .spotOverlay[hidden]{display:none!important}
    .spotCard{position:relative;width:min(535px,100%);max-height:calc(100% - 4px);overflow:auto;background:linear-gradient(150deg,#fff,#eaf5ff);border:1px solid #a5c9eb;border-radius:19px;box-shadow:0 20px 58px rgba(18,63,111,.2);padding:clamp(20px,3vw,30px);color:#102f53}
    .spotHeader{display:flex;justify-content:space-between;align-items:flex-start;gap:15px}
    .spotEyebrow{font-size:10px;font-weight:800;letter-spacing:.13em;color:#2d6093;text-transform:uppercase}
    .spotDate{font-size:clamp(21px,2.2vw,27px);font-weight:800;line-height:1.12;margin:8px 0 0;letter-spacing:-.025em;color:#092f5c}
    .spotClose{width:36px;height:36px;flex:0 0 36px;font:inherit;font-size:24px;line-height:1;background:#f6fbff;color:#1a528a;border:1px solid #b1d0ed;border-radius:50%;cursor:pointer}
    .spotClose:hover{background:#dceeff}
    .spotClose:focus-visible{outline:2px solid #174e83;outline-offset:3px}
    .spotRule{height:1px;background:#b9d6ee;margin:18px 0}
    .spotMeasure{font-size:12px;font-weight:750;color:#285783}
    .spotValue{font-size:clamp(26px,3.2vw,38px);font-weight:800;letter-spacing:-.035em;line-height:1.3;color:#0d3764;overflow-wrap:anywhere;margin-top:5px}
    .spotValue small{font-size:15px;letter-spacing:0;color:#245d95;margin-left:5px}
    .spotGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:18px}
    .spotMetric{padding:13px;background:#f7fbff;border:1px solid #c1dcf3;border-radius:11px;min-width:0}
    .spotMetricLabel{font-size:10px;font-weight:800;color:#315c88;margin-bottom:7px}
    .spotMetricValue{font-size:clamp(17px,2vw,23px);font-weight:790;color:#0e396c;overflow-wrap:anywhere}
    .spotMetricSub{font-size:10px;color:#365e85;line-height:1.5;margin-top:5px}
    .spotNote{font-size:11px;font-weight:570;color:#345a82;line-height:1.6;margin-top:17px}
    @media(max-width:550px){.measurePicker{width:100%;justify-content:space-between}.measurePicker select{min-width:0;max-width:60%}.spotGrid{grid-template-columns:1fr}.spotCard{padding:17px}}
    .mode{display:flex;align-items:center;border-radius:9px;background:#e7f1fb;border:1px solid #b9cee5;padding:3px;gap:3px}
    .mode button,.iconBtn,.palette button{color:#1e4d7c;background:transparent;border:none;font:inherit;cursor:pointer}
    .mode button{padding:7px 13px;min-width:48px;border-radius:6px;font-size:11px;font-weight:800;letter-spacing:.06em}
    .mode button.active{background:#174a85;color:#ffffff;box-shadow:0 2px 5px rgba(29,65,112,.16)}
    .mode button:focus-visible,.iconBtn:focus-visible,.palette button:focus-visible,.canvas:focus-visible{outline:2px solid #155aa4;outline-offset:3px}
    .iconBtn{border:1px solid #b9cee5;border-radius:9px;min-width:36px;height:36px;font-size:18px;line-height:1;background:#eef6ff;color:#19477c}
    .iconBtn:hover{background:#d4e9fb;color:#0b315a}
    .badge{display:inline-flex;align-items:center;gap:7px;color:#15466d;border:1px solid #a8cfdd;background:#e7f8ff;padding:7px 11px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:.03em;white-space:nowrap}
    .badge:before{content:"";width:7px;height:7px;border-radius:50%;background:#1f9caa}
    .badge.demo:before{background:#c77a2a}
    .badge[hidden]{display:none!important}
    .viewport{margin-top:20px;border:1px solid #c9dcef;border-radius:13px;background:linear-gradient(153deg,#f9fcff 0%,#e7f2fe 78%,#eef7ff 100%);position:relative;overflow:hidden;min-height:185px}
    .viewport:after{content:"";position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,#ffffff,transparent);pointer-events:none}
    .plot{position:relative;width:100%;height:100%;overflow:hidden;min-height:160px}
    .canvas{display:block;touch-action:pan-y;outline:none;user-select:none}
    .plotLabel{position:absolute;top:15px;left:17px;color:#24527f;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;pointer-events:none}
    .plotHint{position:absolute;left:17px;bottom:12px;color:#315a83;font-size:10px;font-weight:650;pointer-events:none}
    .tip{position:absolute;display:none;z-index:4;padding:10px 13px;background:#ffffff;color:#14395e;border:1px solid #bdd5ed;border-radius:9px;font-size:11px;line-height:1.5;white-space:nowrap;box-shadow:0 10px 32px rgba(30,68,114,.25);pointer-events:none;transform:translate(-50%,-108%)}
    .tip strong{font-size:14px;color:#103e75}
    .stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:13px}
    .stat{background:linear-gradient(145deg,#ffffff,#edf6ff);border:1px solid #c7dcef;border-radius:11px;padding:14px 15px;min-width:0;position:relative;overflow:hidden}
    .stat:before{content:"";height:3px;position:absolute;left:0;right:60%;top:0;background:var(--accent,#4c91d3)}
    .statLabel{font-size:11px;font-weight:750;color:#285584;line-height:1.35;margin-bottom:7px;min-height:15px}
    .statValue{display:flex;flex-wrap:wrap;align-items:baseline;gap:5px 8px;color:#0d294d;font-weight:760;letter-spacing:-.035em;font-variant-numeric:tabular-nums;line-height:1.12}
    .statNumber{font-size:clamp(19px,2.1vw,28px);overflow-wrap:anywhere}
    .statUnit{font-size:clamp(12px,1vw,15px);font-weight:770;letter-spacing:0;color:#235d9a}
    .statSub{color:#315e89;margin-top:8px;font-size:10px;font-weight:575;line-height:1.45;white-space:normal}
    .bottom{display:flex;flex-wrap:wrap;gap:14px;align-items:center;justify-content:space-between;margin-top:15px}
    .legend{display:flex;align-items:center;flex-wrap:wrap;gap:6px;font-size:10px;color:#285581;font-weight:750}
    .swatches{display:flex;gap:4px;align-items:center}
    .legendSwatch{width:13px;height:13px;border:1px solid #8eb3d7;border-radius:3px;padding:0;cursor:pointer}
    .legendSwatch:focus-visible{outline:2px solid #245c9c;outline-offset:2px}
    .legendExtra{display:inline-flex;align-items:center;gap:6px;margin-left:8px}
    .legendSample{display:inline-block;width:12px;height:12px;border:1px solid #8eb3d7;border-radius:3px}
    .palette{display:flex;align-items:center;gap:8px}
    .palette button{width:17px;height:17px;border:1px solid #86a9ce;border-radius:50%;padding:0}
    .palette button.active{outline:2px solid #194e89;outline-offset:2px}
    .footer{color:#315f8e;font-size:10px;font-weight:580;line-height:1.6;margin-top:13px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}
    .notice{color:#94501c!important;font-weight:750}
    @media(max-width:760px){.stats{grid-template-columns:repeat(2,minmax(0,1fr))}.header{gap:12px}.actions{justify-content:flex-start}.plotHint{font-size:9px}}
    @media(max-width:420px){.stat{padding:12px}.statNumber{font-size:19px}}
    @media(prefers-reduced-motion:reduce){.mode button{transition:none!important}}
  `;
  const PALETTES = {
    azure: ['#d9eafd','#bad9f6','#8dbfec','#5e9cda','#2c6bb8'],
    ocean: ['#d9edf9','#abd8f2','#7ebee6','#4b96d1','#1e6aaf'],
    frost: ['#d9eafa','#bfd9f0','#97bfdf','#679dc9','#326eaa'],
    indigo: ['#e1e8ff','#bccaf4','#90a9e7','#687fd0','#455fab'],
    steel: ['#dce8f3','#bbd1e5','#91b5d4','#6698c2','#3571a4']
  };
  const NEGATIVE = ['#fbece5','#f4c8b7','#edaa91','#d58266','#ae5a44'];
  const MISSING_COLOR='#ecf3fb', ZERO_COLOR='#adc9e1';
  const accent = name => (PALETTES[name] || PALETTES.azure)[3];
  function dateMs(v) {
    if (v == null) return NaN;
    if (v instanceof Date) { const m = Date.UTC(v.getFullYear(),v.getMonth(),v.getDate());return validDay(m)?m:NaN; }
    if (typeof v === 'number') {
      if (v >= 19000101 && v <= 21001231 && Number.isInteger(v)) return dateMs(String(v));
      if (v > 100000000000 && v < 5000000000000) { const d = new Date(v); return dateMs(d); }
      return NaN;
    }
    if (typeof v === 'object') {
      for (const k of ['id','key','raw','date','displayKey','label','description']) {
        if (v[k] !== undefined && v[k] !== null) {const m = dateMs(v[k]);if(Number.isFinite(m)) return m;}
      }
      return NaN;
    }
    const s = String(v).trim();
    let a;
    if ((a = /^(\d{4})(\d{2})(\d{2})$/.exec(s))) return validParts(+a[1],+a[2],+a[3]);
    if ((a = /^(\d{4})[-/.](\d{2})[-/.](\d{2})(?:[T\s].*)?$/.exec(s))) return validParts(+a[1],+a[2],+a[3]);
    if ((a = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s))) return validParts(+a[3],+a[2],+a[1]);
    return NaN; // Explicitly refuse year or month-only data; never synthesize days.
  }
  function validParts(y,m,d){const x=Date.UTC(y,m-1,d);const z=new Date(x);return validDay(x)&&z.getUTCFullYear()===y&&z.getUTCMonth()===m-1&&z.getUTCDate()===d?x:NaN;}
  function num(v) {
    const raw=(v&&typeof v==='object')?(v.raw!==undefined?v.raw:v.value):v;
    if(typeof raw==='number') return Number.isFinite(raw)?raw:NaN;
    if(typeof raw==='string' && /^[+\-]?\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?$/.test(raw.trim())) return Number(raw);
    return NaN;
  }
  function unitText(value) {
    if(value==null)return '';
    if(typeof value==='string')return value.trim().replace(/\s+/g,' ').slice(0,24);
    if(typeof value==='object'){
      for(const key of ['code','id','value','raw','symbol','name','label','description'])if(value[key]!=null){const v=unitText(value[key]);if(v)return v;}
    }
    return '';
  }
  function unitFromFormatted(value) {
    if(typeof value!=='string')return '';
    const t=value.trim().replace(/\u00a0/g,' ');
    const currency='(?:EUR|USD|GBP|CHF|JPY|CNY|CAD|AUD|INR|BRL|TRY|PLN|CZK|SEK|NOK|DKK|AED|SAR|ZAR|MXN|KRW|SGD|HKD|[$€£¥₺]|%)';
    const end=new RegExp('(?:\\s|^)((?:'+currency+'))\\s*$','i').exec(t);
    if(end && /\d/.test(t.slice(0,end.index)))return end[1].toUpperCase();
    const beginning=new RegExp('^('+currency+')\\s*(?=[+\-\d\s.,])','i').exec(t);
    return beginning && /\d/.test(t.slice(beginning[0].length))?beginning[1].toUpperCase():'';
  }
  function measureUnit(row,metadata,key){
    const cell=row&&row[key];
    // Member-level information and the formatted result have priority. The
    // metadata unit is the fallback; otherwise changing currencies per row is lost.
    if(cell&&typeof cell==='object'){
      for(const field of ['currency','currencyCode','unit','unitOfMeasure','unitOfMeasureId','unitCode','formattedUnit']){
        const u=unitText(cell[field]);if(u)return u;
      }
      const formatted=unitFromFormatted(cell.formattedValue??cell.formatted);
      if(formatted)return formatted;
    }
    if(metadata&&typeof metadata==='object'){
      for(const field of ['currency','currencyCode','unit','unitOfMeasure','unitOfMeasureId','unitCode','formattedUnit']){
        const u=unitText(metadata[field]);if(u)return u;
      }
    }
    return '';
  }
  /* Parse all measure aliases independently. Currency and validity checks apply per measure.
     A shared endDate ensures switching measures does not change the calendar axis. */
  function parseBinding(obj, selectedAlias) {
    const b=obj&&obj.dataBinding?obj.dataBinding:obj;
    if(!b||b.state!=='success')return {state:'waiting',message:'Bind a daily Date dimension and one or more additive Measures in the SAC Data panel.'};
    const meta=b.metadata||{},rows=Array.isArray(b.data)?b.data:[];
    const dk=Object.keys(meta.dimensions||{}).filter(k=>!/^@/.test(k));
    const mk=Object.keys(meta.mainStructureMembers||{}).filter(k=>!/^@/.test(k));
    if(dk.length!==1||!mk.length)return {state:'invalid',message:'Bind exactly one daily Date dimension and at least one additive Measure.'};
    if(!rows.length)return {state:'empty',message:'SAC returned no rows. Check model, data availability, and story filters.'};
    const dkey=dk[0], definitions=mk.map(key=>{
      const m=meta.mainStructureMembers[key]||{};
      return {key,label:String(m.label||m.description||m.id||key)};
    });
    const alias=mk.includes(selectedAlias)?selectedAlias:mk[0], measureMeta=meta.mainStructureMembers[alias]||{};
    const agg=new Map(),units=new Set();let skipped=0,totals=0,sharedEnd=NaN;
    for(const row of rows){
      if(!row||typeof row!=='object'){skipped++;continue;}
      const dim=row[dkey],mid=dim&&typeof dim==='object'?String(dim.id??dim.key??''):String(dim??'');
      if(mid==='@TotalMember'||/^(?:total|totals|grand total)$/i.test(mid)){totals++;continue;}
      const dt=dateMs(dim);
      if(!Number.isFinite(dt)){skipped++;continue;}
      // The common period includes valid days of any bound measure, not only this selection.
      if(mk.some(k=>Number.isFinite(num(row[k]))))sharedEnd=Number.isFinite(sharedEnd)?Math.max(dt,sharedEnd):dt;
      const cell=row[alias],n=num(cell);
      if(!Number.isFinite(n)){skipped++;continue;}
      const u=measureUnit(row,measureMeta,alias);if(u)units.add(u);
      const k=utcKey(dt);agg.set(k,(agg.get(k)||0)+n);
    }
    if(units.size>1)return {state:'invalid',message:'Multiple units or currencies detected for '+definitions.find(d=>d.key===alias).label+' ('+Array.from(units).join(', ')+'). Filter or convert before aggregation.',measures:definitions,selectedAlias:alias};
    const unit=units.size?Array.from(units)[0]:unitText(measureMeta.currency||measureMeta.unit||measureMeta.currencyCode||'');
    if(unit==='%')return {state:'invalid',message:'Percentage measures are not additive. Choose an additive KPI such as Revenue, Costs or Quantity.',measures:definitions,selectedAlias:alias};
    if(!agg.size)return {state:'empty',message:'No valid daily values for '+definitions.find(d=>d.key===alias).label+'. Try another measure or check story filters.',measures:definitions,selectedAlias:alias};
    const label=definitions.find(d=>d.key===alias).label;
    return {state:'success',data:Array.from(agg,([date,count])=>({date,count})),label,unit,excluded:skipped,totalRows:rows.length,totals,
      measures:definitions,selectedAlias:alias,commonEnd:sharedEnd};
  }
  function demoData(){
    const today=Date.now(),end=Math.floor(today/DAY)*DAY;let seed=1327;
    const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    const out=[];for(let i=365;i>=0;i--){const ms=end-i*DAY,dow=new Date(ms).getUTCDay();const x=(365-i)/365;
      const waves=0.3+2*Math.exp(-Math.pow((x-.2)/.095,2))+1.8*Math.exp(-Math.pow((x-.64)/.15,2))+.8*Math.exp(-Math.pow((x-.85)/.06,2));
      let count=rand()<(dow===0||dow===6?.32:.87)?Math.floor((2+rand()*8)*waves*(.45+rand())):0;
      if(rand()<.014)count+=30+Math.floor(rand()*28);out.push({date:utcKey(ms),count});}
    return out;
  }
  /** Year bands in continuous week-column coordinates (even across midweek boundaries). */
  function yearSegments(start,end){
    if(!Number.isFinite(start)||!Number.isFinite(end)||end<start)return [];
    const bands=[];const exclusiveEnd=end+DAY;
    let cursor=start;
    while(cursor<exclusiveEnd){
      const year=new Date(cursor).getUTCFullYear();
      const stop=Math.min(exclusiveEnd,Date.UTC(year+1,0,1));
      bands.push({year,start:(cursor-start)/DAY/7,end:(stop-start)/DAY/7});
      cursor=stop;
    }
    return bands;
  }
  function build(data,weekStart,commonEnd){
    const map=new Map();let end=NaN;
    for(const e of data){const t=dateMs(e.date),n=num(e.count);if(!Number.isFinite(t)||!Number.isFinite(n))continue;
      const key=utcKey(t);map.set(key,(map.get(key)||0)+n);end=Number.isFinite(end)?Math.max(t,end):t;}
    if(Number.isFinite(commonEnd))end=commonEnd;
    if(!Number.isFinite(end))return null;
    let start=end-364*DAY;start-=(new Date(start).getUTCDay()-weekStart+7)%7*DAY;
    const cells=[];for(let t=start,i=0;t<=end;t+=DAY,i++){
      const date=utcKey(t),reported=map.has(date),count=reported?map.get(date):null;
      cells.push({date,count,reported,week:Math.floor(i/7),day:i%7});
    }
    const magnitudes=cells.filter(c=>c.reported&&c.count!==0).map(c=>Math.abs(c.count)).sort((a,b)=>a-b);
    const p95=magnitudes.length?magnitudes[Math.floor((magnitudes.length-1)*.95)]:0;
    for(const c of cells){c.sign=!c.reported||c.count===0?0:Math.sign(c.count);
      c.level=!c.reported||c.count===0?0:p95===0?4:Math.min(4,1+Math.floor(Math.abs(c.count)/p95*4));}
    let total=0,reportedDays=0,nonzeroDays=0,negativeDays=0,zeroDays=0,maximum=-Infinity,maxDate='';
    for(const c of cells){if(!c.reported)continue;reportedDays++;total+=c.count;
      if(c.count!==0)nonzeroDays++;else zeroDays++;
      if(c.count<0)negativeDays++;
      if(c.count>maximum){maximum=c.count;maxDate=c.date;}}
    // Month labels and year rules are positioned from exact calendar boundaries.
    // A new year can begin halfway through a week, so do not snap it to a column.
    const month=[];let prev='';
    for (let t=start;t<=end;t+=DAY) {
      const d=new Date(t),ym=utcKey(t).slice(0,7);
      if(ym!==prev){
        month.push({position:(t-start)/DAY/7,label:d.toLocaleDateString('en-US',{month:'short',timeZone:'UTC'})});
        prev=ym;
      }
    }
    const years=yearSegments(start,end);
    return {cells,weeks:cells[cells.length-1].week+1,end,start,month,years,
      magnitudeMax:magnitudes.length?magnitudes[magnitudes.length-1]:0,hasNegative:negativeDays>0,
      stats:{total,reportedDays,nonzeroDays,negativeDays,zeroDays,maximum:reportedDays?maximum:null,maxDate,
        average:reportedDays?total/reportedDays:null,missingDays:cells.length-reportedDays}};
  }
  function hexRgb(h){return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];}
  function shade(h,k){const c=hexRgb(h);return `rgb(${c.map(v=>Math.round(v*k)).join(',')})`;}
  function quadContains(poly,x,y){let pos=false,neg=false;for(let i=0;i<4;i++){const p=poly[i],q=poly[(i+1)%4],r=(q[0]-p[0])*(y-p[1])-(q[1]-p[1])*(x-p[0]);if(r>0)pos=true;if(r<0)neg=true;if(pos&&neg)return false;}return true;}
  function path(ctx,p){ctx.beginPath();ctx.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)ctx.lineTo(p[i][0],p[i][1]);ctx.closePath();}
  class ActivitySkyline extends HTMLElement{
    constructor(){super();this.attachShadow({mode:'open'});this._props={title:'PERFORMANCE SKYLINE',unitLabel:'',measureLabel:'',palette:'azure',weekStart:1};
      this._source=null;this._data=demoData();this._sample=true;this._info=null;this._selectedMeasure=null;this._model=build(this._data,1);this._spotlightIdx=-1;this._spotFocus=null;
      this._target=0;this._morph=0;this._angle=0;this._pitch=0;this._angleGoal=0;this._pitchGoal=0;this._hover=-1;this._pinned=-1;this._level=-1;this._frame=0;this._lastTime=0;this._resizeObs=null;this._drag=null;this._hit=[];this._mounted=false;this._error='';this._hasEverBound=false;
    }
    connectedCallback(){if(this._mounted)return;this._mounted=true;this._mount();this._resizeObs=new ResizeObserver(()=>this._draw());this._resizeObs.observe(this);this._draw();}
    disconnectedCallback(){if(this._resizeObs)this._resizeObs.disconnect();this._resizeObs=null;cancelAnimationFrame(this._frame);this._frame=0;this._mounted=false;this._spotlightIdx=-1;}
    onCustomWidgetBeforeUpdate(){}
    onCustomWidgetAfterUpdate(changed){
      if(!changed||typeof changed!=='object')return;
      let propChange=false;
      for(const p of ['title','unitLabel','measureLabel','palette','weekStart'])if(Object.prototype.hasOwnProperty.call(changed,p)){this._props[p]=changed[p];propChange=true;}
      if(Object.prototype.hasOwnProperty.call(changed,'dataBinding')){this._source=changed.dataBinding;this._hasEverBound=true;this._consume();}
      else if(propChange){if(changed.weekStart!==undefined)this._model=build(this._data,+this._props.weekStart===0?0:1,this._info?.commonEnd);this._refresh();}
    }
    onCustomWidgetDataChanged(db){this._source=db;this._hasEverBound=true;this._consume();}
    onCustomWidgetResize(){this._draw();}
    _consume(){const r=parseBinding(this._source,this._selectedMeasure);this._info=r;
      this._selectedMeasure=r.selectedAlias||null;
      if(r.state==='success'){this._data=r.data;this._model=build(this._data,+this._props.weekStart===0?0:1,r.commonEnd);this._sample=false;this._error='';}
      else{this._sample=false;this._model=null;this._error=r.message||'No available data.';}
      this._closeSpotlight(false);this._hover=this._pinned=-1;this._refresh();
    }
    _setMeasure(alias){
      if(!this._source||alias===this._selectedMeasure)return;
      this._selectedMeasure=alias;
      this._consume();
    }
    _mount(){const root=this.shadowRoot;root.innerHTML=`<style>${css}</style><div class="shell" role="region" aria-label="Performance Skyline visualization">
       <div class="header"><div><div class="eyebrow">BUSINESS PERFORMANCE</div><h2 class="title"></h2><div class="sub"></div></div>
         <div class="actions"><div class="measurePicker" hidden><label for="measurePicker">MEASURE</label><select id="measurePicker" aria-label="Select business measure"></select></div><span class="badge demo">SAMPLE DATA</span><div class="mode" role="group" aria-label="Visualization mode"><button type="button" data-view="0" class="active" aria-pressed="true">2D</button><button type="button" data-view="1" aria-pressed="false">3D</button></div><button type="button" class="iconBtn reset" title="Reset 3D angle" aria-label="Reset 3D angle">↺</button></div>
       </div><div class="viewport"><div class="plot"><canvas class="canvas" tabindex="0" role="img" aria-label="Interactive daily performance skyline"></canvas><div class="plotLabel">DAILY PERFORMANCE</div><div class="plotHint"></div><div class="tip"></div></div></div>
       <div class="stats"></div><div class="bottom"><div class="legend"><span>LOWER</span><span class="swatches"></span><span>HIGHER</span><span class="legendExtras"></span></div><div class="palette" aria-label="Color palette"></div></div>
       <div class="footer"><span class="sourceNotice"></span><span>PERFORMANCE SKYLINE · v0.3.0</span></div>
       <div class="spotOverlay" hidden aria-hidden="true"><div class="spotCard" role="dialog" aria-modal="true" aria-labelledby="spotDate"><div class="spotHeader"><div><div class="spotEyebrow">DAY SPOTLIGHT</div><h3 class="spotDate" id="spotDate"></h3></div><button type="button" class="spotClose" aria-label="Close Day Spotlight">×</button></div><div class="spotRule"></div><div class="spotMeasure"></div><div class="spotValue"></div><div class="spotGrid"></div><div class="spotNote"></div></div></div>
     </div>`;
      this.$=q=>root.querySelector(q);this.canvas=this.$('.canvas');this.ctx=this.canvas.getContext('2d');
      this.$('#measurePicker').addEventListener('change',e=>this._setMeasure(e.target.value));
      this.$('.spotClose').addEventListener('click',()=>this._closeSpotlight());
      this.$('.spotOverlay').addEventListener('click',e=>{if(e.target===this.$('.spotOverlay'))this._closeSpotlight();});
      this.$('.spotOverlay').addEventListener('keydown',e=>this._spotKeys(e));
      root.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>this._view(+b.dataset.view)));
      this.$('.reset').addEventListener('click',()=>{this._angleGoal=this._pitchGoal=0;this._animate();});
      for(const p of Object.keys(PALETTES)){const b=document.createElement('button');b.type='button';b.title=p;b.setAttribute('aria-label',p+' palette');b.style.background=PALETTES[p][3];b.dataset.palette=p;b.addEventListener('click',()=>{this._props.palette=p;this._refresh();});this.$('.palette').appendChild(b);}
      this.canvas.addEventListener('pointerdown',e=>this._pointerDown(e));this.canvas.addEventListener('pointermove',e=>this._pointerMove(e));this.canvas.addEventListener('pointerup',e=>this._pointerUp(e));this.canvas.addEventListener('pointercancel',()=>{this._drag=null;});this.canvas.addEventListener('pointerleave',()=>{if(!this._drag){this._hover=-1;this._tooltip();this._draw();}});
      this.canvas.addEventListener('dblclick',()=>{this._angleGoal=this._pitchGoal=0;this._animate();});
      this.canvas.addEventListener('keydown',e=>this._key(e));
      this._refresh();
    }
    _unit(){return String(this._props.unitLabel||this._info?.unit||'').trim();}
    _measure(){const override=this._info?.measures?.length>1?'':this._props.measureLabel;return String(override|| (this._info?.state==='success'?this._info.label:'Business measure')).trim();}
    _number(v){return v==null?'n/a':new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(v);}
    _refresh(){if(!this._mounted)return;
      this.$('.title').textContent=String(this._props.title||'PERFORMANCE SKYLINE');
      const picker=this.$('.measurePicker'),select=this.$('#measurePicker'),items=this._info?.measures||[];
      picker.hidden=items.length<=1;
      const signature=items.map(d=>d.key+'|'+d.label).join('||');
      if(select.dataset.signature!==signature){select.replaceChildren();for(const d of items){const o=document.createElement('option');o.value=d.key;o.textContent=d.label;select.append(o);}select.dataset.signature=signature;}
      if(items.length>1)select.value=this._selectedMeasure||items[0].key;
      // SAC is the host environment: only show a status badge when it conveys useful information.
      const badge=this.$('.badge');
      badge.hidden=!this._sample&&!this._error;
      badge.textContent=this._sample?'SAMPLE DATA':this._error?'NO VALID DATA':'';
      badge.classList.toggle('demo',this._sample||!!this._error);
      const col=PALETTES[this._props.palette]||PALETTES.azure;this.$('.shell').style.setProperty('--accent',col[3]);
      const sub=this._model?new Date(this._model.start).toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'})+'  /  '+new Date(this._model.end).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}):'DATE SERIES';
      this.$('.sub').textContent=this._error?'CONNECT A DAILY DATE DIMENSION + ADDITIVE MEASURE':sub+'  ·  '+this._measure()+(this._unit()?' ('+this._unit()+')':'');
      this.$('.plotHint').textContent=this._target>0.5?'DRAG TO ORBIT  ·  DOUBLE-CLICK TO RESET':'HOVER A DAY  ·  CLICK TO PIN';
      this.$('.plotLabel').textContent=(this._target>0.5?'3D SKYLINE':'DAILY HEATMAP')+'  /  '+(this._model?.weeks||0)+' WEEKS';
      const s=this._model?.stats;
      this.$('.sourceNotice').textContent=this._sample?'Illustrative sample data, not SAP business data.':this._error?this._error:
        (this._info?.excluded?this._info.excluded+' invalid or unsupported rows excluded.  ':'')+
        (s?.missingDays?s.missingDays+' days without reported data, shown separately from zero.  ':'')+
        'Signed values included. Read-only, story-filtered SAC data.';
      this.$('.sourceNotice').classList.toggle('notice',!!this._error||!!this._info?.excluded);
      this._updateStats();const sl=this.$('.swatches');sl.replaceChildren();
      col.forEach((c,i)=>{if(i===0)return;const b=document.createElement('button');b.type='button';b.className='legendSwatch';b.title='Value intensity '+i;b.style.background=c;b.setAttribute('aria-label',b.title);b.addEventListener('mouseenter',()=>{this._level=i;this._draw();});b.addEventListener('mouseleave',()=>{this._level=-1;this._draw();});b.addEventListener('focus',()=>{this._level=i;this._draw();});b.addEventListener('blur',()=>{this._level=-1;this._draw();});b.addEventListener('click',()=>{this._level=this._level===i?-1:i;this._draw();});sl.appendChild(b);});
      const extras=this.$('.legendExtras');extras.replaceChildren();
      const addKey=(label,color)=>{const entry=document.createElement('span');entry.className='legendExtra';const sw=document.createElement('span');sw.className='legendSample';sw.style.background=color;const t=document.createElement('span');t.textContent=label;entry.append(sw,t);extras.append(entry);};
      addKey('NO DATA',MISSING_COLOR);addKey('ZERO',ZERO_COLOR);if(this._model?.hasNegative)addKey('NEGATIVE',NEGATIVE[3]);
      this.$('.palette').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.palette===(this._props.palette||'azure')));
      this._draw();
    }
    _updateStats(){const el=this.$('.stats');el.replaceChildren();if(!this._model)return;
      const s=this._model.stats,measure=this._measure(),unit=this._unit();
      const bits=[
        ['Total '+measure,s.total,unit,'Total for selected period, signed values included'],
        ['Average per Reported Day',s.average,unit,'Includes explicit zeros; excludes missing days'],
        ['Highest Daily Value',s.maximum,unit,s.maxDate||'No reported values'],
        ['Reported Days',s.reportedDays,'days',s.reportedDays+' / '+this._model.cells.length+' calendar days, including zero']
      ];
      for(const [label,value,metricUnit,sub] of bits){
        const card=document.createElement('div');card.className='stat';
        const a=document.createElement('div');a.className='statLabel';a.textContent=label;
        const b=document.createElement('div');b.className='statValue';const n=document.createElement('span');n.className='statNumber';n.textContent=this._number(value);b.append(n);
        if(metricUnit){const u=document.createElement('span');u.className='statUnit';u.textContent=metricUnit;b.append(u);}
        const c=document.createElement('div');c.className='statSub';c.textContent=sub;card.append(a,b,c);el.append(card);
      }
    }
    _view(v){this._target=v?1:0;this.shadowRoot.querySelectorAll('[data-view]').forEach(b=>{const a=+b.dataset.view===this._target;b.classList.toggle('active',a);b.setAttribute('aria-pressed',String(a));});
      if(!v){this._angleGoal=this._pitchGoal=0;}this._refresh();this._animate();}
    _animate(){if(!this._mounted||this._frame)return;this._lastTime=performance.now();const run=now=>{this._frame=0;const dt=clamp(now-this._lastTime,0,55);this._lastTime=now;const step=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches?1:dt/1350;
       if(Math.abs(this._morph-this._target)>0.0003)this._morph=clamp(this._morph+(this._target>this._morph?step:-step),0,1);else this._morph=this._target;
       const k=1-Math.exp(-dt/125);this._angle+= (this._angleGoal-this._angle)*k;this._pitch+=(this._pitchGoal-this._pitch)*k;this._draw();
       if(Math.abs(this._morph-this._target)>0.0003||Math.abs(this._angle-this._angleGoal)>0.0003||Math.abs(this._pitch-this._pitchGoal)>0.0003)this._frame=requestAnimationFrame(run);
      };this._frame=requestAnimationFrame(run);}
    _plotSize(){const plot=this.$('.plot');const W=Math.max(240,plot.clientWidth||this.clientWidth-40||700),H2=clamp(W*.22+30,194,258),H3=clamp(W*.53+30,280,510);const H=lerp(H2,H3,ease(this._morph));plot.style.height=H+'px';
      const dpr=clamp(window.devicePixelRatio||1,1,2);const w=Math.round(W*dpr),h=Math.round(H*dpr);if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;this.canvas.style.width=W+'px';this.canvas.style.height=H+'px';}return {W,H,dpr};}
    _draw(){if(!this._mounted||!this.ctx)return;const {W,H,dpr}=this._plotSize(),ctx=this.ctx;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);this._hit=[];
      if(this._error){this._drawNoData(W,H);return;}if(!this._model||!this._model.cells.length)return;
      const model=this._model,progress=ease(this._morph),is3d=progress,theta=lerp(0,.72+this._angle,is3d),el=lerp(Math.PI/2,.55+this._pitch,is3d);
      const c=Math.cos(theta),s=Math.sin(theta),se=Math.sin(el),ce=Math.cos(el);
      const proj=(x,y,z)=>[x*c-y*s,(x*s+y*c)*se-z*ce];
      const M=model.weeks,w=lerp(.82,.92,progress),off=(1-w)/2;
      const height=cell=>!cell.reported?.055:cell.count===0?.16:
        .22+Math.pow(Math.abs(cell.count)/Math.max(1e-12,model.magnitudeMax),.73)*9.5;
      const pos=[];let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
      function add(p){minX=Math.min(minX,p[0]);maxX=Math.max(maxX,p[0]);minY=Math.min(minY,p[1]);maxY=Math.max(maxY,p[1]);}
      for(const cell of model.cells){const wave=clamp((this._morph-cell.week/Math.max(1,M-1)*.28-cell.day/6*.045)/.66,0,1),rise=wave*wave*(3-2*wave);const z=height(cell)*rise*(cell.sign||1);
        const x=cell.week+off,y=cell.day+off;const top=[proj(x,y,z),proj(x+w,y,z),proj(x+w,y+w,z),proj(x,y+w,z)];const bottom=[proj(x,y,0),proj(x+w,y,0),proj(x+w,y+w,0),proj(x,y+w,0)];top.forEach(add);bottom.forEach(add);pos.push({cell,top,bottom,z,depth:(cell.week+.5)*s+(cell.day+.5)*c});}
      // Reserve a true calendar-year axis beneath the month labels, for both 2D and 3D.
      add(proj(-.2,10.8,0));add(proj(M,10.8,0));
      const padX=lerp(23,40,progress),padY=lerp(36,24,progress),availW=W-2*padX,availH=H-2*padY;
      const scale=Math.min(availW/Math.max(.001,maxX-minX),availH/Math.max(.001,maxY-minY));const ox=padX+(availW-(maxX-minX)*scale)/2-minX*scale,oy=padY+(availH-(maxY-minY)*scale)/2-minY*scale;
      const tr=p=>[ox+p[0]*scale,oy+p[1]*scale];const palette=PALETTES[this._props.palette]||PALETTES.azure;
      pos.sort((a,b)=>a.depth-b.depth);
      for(const v of pos){const {cell}=v,top=v.top.map(tr),bot=v.bottom.map(tr),i=model.cells.indexOf(cell),hit=i===this._hover||i===this._pinned;
        const dim=this._level>=0&&this._level!==cell.level;ctx.globalAlpha=dim?.22:1;
        const fill=!cell.reported?MISSING_COLOR:cell.count===0?ZERO_COLOR:
          cell.sign<0?NEGATIVE[cell.level]:palette[cell.level];
        const sides=[];
        if(Math.abs(v.z)*ce*scale>.5){
          const yFace=c>=0?[bot[3],bot[2],top[2],top[3]]:[bot[0],bot[1],top[1],top[0]];
          const xFace=s>=0?[bot[1],bot[2],top[2],top[1]]:[bot[0],bot[3],top[3],top[0]];
          sides.push(yFace,xFace);
          path(ctx,yFace);ctx.fillStyle=shade(fill,.87);ctx.fill();
          path(ctx,xFace);ctx.fillStyle=shade(fill,.72);ctx.fill();
        }
        path(ctx,top);ctx.fillStyle=fill;ctx.fill();
        if(progress<.8){ctx.lineWidth=.55;ctx.strokeStyle='#5f83ac'+(progress<.2?'45':'18');ctx.stroke();}
        if(hit){ctx.globalAlpha=1;ctx.strokeStyle='#154e8c';ctx.lineWidth=1.6;ctx.stroke();}
        this._hit.push({idx:i,polys:[top,...sides],top});
      }
      ctx.globalAlpha=1;
      if(progress<.8){ctx.fillStyle=`rgba(32,76,119,${1-progress})`;ctx.font='10px Arial, sans-serif';ctx.textBaseline='middle';ctx.textAlign='right';
        ['MON','WED','FRI'].forEach((n,i)=>{const d=[0,2,4][i];const p=tr(proj(-.1,d+.5,0));if(p[0]>=0)ctx.fillText(n,p[0]-4,p[1]);});}
      ctx.fillStyle=`rgba(33,77,124,${.87+.13*progress})`;ctx.font='10px Arial, sans-serif';ctx.textBaseline='top';ctx.textAlign='left';
      let last=-Infinity;for(const m of model.month){
        const p=tr(proj(m.position+off,7.3,0));
        if(p[0]<last+12||p[0]>W-25)continue;
        ctx.fillText(m.label,p[0],p[1]+(progress>0.4?2:-3));last=p[0]+ctx.measureText(m.label).width;
      }
      // Year guides: each line covers only the columns belonging to that calendar year.
      // Exact day-boundary coordinates keep a Dec/Jan split truthful even within a week.
      for(const band of model.years||[]){
        if(band.end-band.start<.4)continue;
        const x0=band.start+.04,x1=band.end-.04,ym=8.65,labelY=9.65;
        const p0=tr(proj(x0,ym,0)),p1=tr(proj(x1,ym,0));
        const labelPos=tr(proj((band.start+band.end)/2,labelY,0));
        ctx.save();ctx.globalAlpha=.90;
        ctx.strokeStyle='#28639d';ctx.lineWidth=2;ctx.lineCap='round';
        ctx.beginPath();ctx.moveTo(...p0);ctx.lineTo(...p1);ctx.stroke();
        for(const p of [p0,p1]){ctx.beginPath();ctx.moveTo(p[0],p[1]-3);ctx.lineTo(p[0],p[1]+3);ctx.stroke();}
        ctx.fillStyle='#143d71';ctx.textBaseline='top';ctx.textAlign='center';ctx.font='bold 12px Arial, sans-serif';
        ctx.fillText(String(band.year),labelPos[0],labelPos[1]);
        ctx.restore();
      }
      this._tooltip();
    }
    _drawNoData(W,H){const ctx=this.ctx;ctx.textAlign='center';ctx.fillStyle='#16497c';ctx.font='bold 15px Arial';ctx.fillText('CONNECT DAILY DATA',W/2,H/2-10);ctx.fillStyle='#315e89';ctx.font='12px Arial';const msg=this._error||'No data';for(let i=0;i<msg.length;i+=70)ctx.fillText(msg.slice(i,i+70),W/2,H/2+15+(i/70)*17);}
    _tipActive(){return this._hover>=0?this._hover:this._pinned;}
    _tooltip(){const el=this.$('.tip'),idx=this._tipActive();if(!this._model||idx<0||!this._hit.length){el.style.display='none';return;}
      const hit=this._hit.find(x=>x.idx===idx);if(!hit){el.style.display='none';return;}const cell=this._model.cells[idx];
      const p=hit.top.reduce((a,b)=>a[1]<b[1]?a:b);el.replaceChildren();const strong=document.createElement('strong');strong.textContent=!cell.reported?'No data':this._number(cell.count)+(this._unit()?' '+this._unit():'');
      const rest=document.createElement('span');rest.textContent='  ·  '+cell.date+'  ·  '+this._measure();el.append(strong,rest);el.style.left=clamp(p[0],80,Math.max(80,this.canvas.clientWidth-80))+'px';el.style.top=Math.max(47,p[1]-2)+'px';el.style.display='block';}
    _spotKeys(e){
      if(e.key==='Escape'){e.preventDefault();this._closeSpotlight();return;}
      if(e.key==='Tab'){ // Keep keyboard focus inside the modal.
        const b=this.$('.spotClose');if(b){e.preventDefault();b.focus();}
      }
    }
    _closeSpotlight(restoreFocus=true){
      const overlay=this.shadowRoot?.querySelector('.spotOverlay');
      const wasOpen=overlay&&!overlay.hidden;
      if(overlay){overlay.hidden=true;overlay.setAttribute('aria-hidden','true');}
      this._spotlightIdx=-1;
      if(wasOpen){this._pinned=-1;this._hover=-1;if(restoreFocus&&this.canvas)this.canvas.focus();this._draw();}
    }
    _openDaySpotlight(idx){
      if(!this._model||idx<0||idx>=this._model.cells.length||!this._mounted)return;
      const cell=this._model.cells[idx],stats=this._model.stats,unit=this._unit(),measure=this._measure();
      const overlay=this.$('.spotOverlay'),value=this.$('.spotValue'),grid=this.$('.spotGrid');
      this._spotlightIdx=idx;
      const date=new Date(cell.date+'T00:00:00Z').toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric',weekday:'long',timeZone:'UTC'});
      this.$('.spotDate').textContent=date;
      this.$('.spotMeasure').textContent=measure;
      value.replaceChildren();
      const big=document.createElement('span');big.textContent=cell.reported?this._number(cell.count):'No reported data';value.append(big);
      if(cell.reported&&unit){const small=document.createElement('small');small.textContent=unit;value.append(small);}
      grid.replaceChildren();
      const metric=(label,v,sub)=>{const box=document.createElement('div');box.className='spotMetric';
        const l=document.createElement('div');l.className='spotMetricLabel';l.textContent=label;
        const x=document.createElement('div');x.className='spotMetricValue';x.textContent=v;
        const t=document.createElement('div');t.className='spotMetricSub';t.textContent=sub;
        box.append(l,x,t);grid.append(box);};
      if(cell.reported){
        const higher=this._model.cells.filter(d=>d.reported&&d.count>cell.count).length;
        metric('RANK IN PERIOD','#'+(higher+1),'Among '+stats.reportedDays+' reported days · ties share rank');
        const delta=stats.average==null?null:cell.count-stats.average;
        metric('VS. REPORTED-DAY AVERAGE',delta==null?'n/a':(delta>0?'+':'')+this._number(delta)+(unit?' '+unit:''),
          'Average: '+this._number(stats.average)+(unit?' '+unit:''));
        this.$('.spotNote').textContent=cell.count===0?'An explicit zero was returned by the data source. Zero is different from missing data.':
          'Comparison reflects the selected measure and displayed calendar window. Rank is numerical, not a business-value judgment.';
      }else{
        metric('DATA STATUS','Not reported','SAC returned no value for this calendar day.');
        metric('REPORTED DAYS',this._number(stats.reportedDays),'Within the selected window');
        this.$('.spotNote').textContent='No reported data is not the same as a reported value of zero. No value, rank or variance has been inferred for this day.';
      }
      overlay.hidden=false;overlay.setAttribute('aria-hidden','false');this.$('.spotClose').focus();
    }
        _local(e){const b=this.canvas.getBoundingClientRect();return {x:e.clientX-b.left,y:e.clientY-b.top};}
    _pick(e){const {x,y}=this._local(e);for(let i=this._hit.length-1;i>=0;i--)if(this._hit[i].polys.some(q=>quadContains(q,x,y)))return this._hit[i].idx;return -1;}
    _pointerDown(e){if(e.button!==0)return;this._drag={id:e.pointerId,x:e.clientX,y:e.clientY,a:this._angle,p:this._pitch,moved:false,orbit:this._target>0.5};if(this._drag.orbit){try{this.canvas.setPointerCapture(e.pointerId);}catch(_){} }}
    _pointerMove(e){const d=this._drag;if(d&&d.id===e.pointerId&&d.orbit){const dx=e.clientX-d.x,dy=e.clientY-d.y;if(d.moved||Math.hypot(dx,dy)>5){d.moved=true;this._angleGoal=d.a+dx*.012;this._pitchGoal=clamp(d.p+dy*.004,-.24,.65);this._hover=-1;this.canvas.style.cursor='grabbing';this._animate();return;}}
      if(e.pointerType==='mouse'){this._hover=this._pick(e);this.canvas.style.cursor=this._target?'grab':this._hover>=0?'pointer':'default';this._tooltip();this._draw();}}
    _pointerUp(e){const d=this._drag;if(!d||d.id!==e.pointerId)return;this._drag=null;try{if(this.canvas.hasPointerCapture(e.pointerId))this.canvas.releasePointerCapture(e.pointerId);}catch(_){}
      if(d.moved){this.canvas.style.cursor='grab';return;}const idx=this._pick(e);this._pinned=idx;if(e.pointerType!=='mouse')this._hover=-1;this._draw();if(idx>=0)this._openDaySpotlight(idx);}
    _key(e){if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','Escape','Enter',' '].includes(e.key))return;e.preventDefault();if(e.key==='Escape'){this._pinned=this._hover=-1;this._draw();return;}
      if(e.key==='Enter'||e.key===' '){const idx=this._pinned>=0?this._pinned:this._hover;if(idx>=0)this._openDaySpotlight(idx);return;}
      const n=this._model?.cells.length||0;if(!n)return;let i=this._pinned>=0?this._pinned:n-1;if(e.key==='Home')i=0;else if(e.key==='End')i=n-1;else if(e.key==='ArrowLeft')i-=7;else if(e.key==='ArrowRight')i+=7;else if(e.key==='ArrowUp')i-=1;else if(e.key==='ArrowDown')i+=1;this._pinned=clamp(i,0,n-1);this._draw();}
  }
  // Minimal exports for isolated tests, without exposing story data to globals.
  if(typeof module!=='undefined'&&module.exports)module.exports={dateMs,num,parseBinding,build,yearSegments,demoData,unitFromFormatted,measureUnit};
  customElements.define(TAG,ActivitySkyline);
})();
