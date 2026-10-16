'use strict';
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

// The widget's computation helpers are intentionally exported for isolated tests.
// A minimal browser registration stub is sufficient; no DOM or SAC tenant is needed.
global.HTMLElement = class {};
let registered;
global.customElements = {
  get: () => undefined,
  define: (tag, klass) => { registered = { tag, klass }; }
};
const core = require('../main.js');
assert.equal(registered.tag, 'com-custom-sac-performanceskyline');
assert.equal(typeof registered.klass, 'function');

const { dateMs, parseBinding, build, yearSegments } = core;
const D = 86400000;
const iso = t => new Date(t).toISOString().slice(0,10);
assert.equal(iso(dateMs('2026-10-16')), '2026-10-16');
assert.equal(iso(dateMs('20261016')), '2026-10-16');
assert.equal(iso(dateMs('16.10.2026')), '2026-10-16');
assert.ok(Number.isNaN(dateMs('202610')));
assert.ok(Number.isNaN(dateMs('2026-02-30')));

function mkBinding(costUnit = 'USD') {
  return { state: 'success', metadata: {
    dimensions: { dimensions_0: { id: '0CALDAY', label: 'Calendar Day' } },
    mainStructureMembers: {
      measures_0: { label: 'Gross Revenue', unit: 'EUR' },
      measures_1: { label: 'Operating Costs', unit: costUnit }
    }
  }, data: [
    { dimensions_0: { id: '20260101' }, measures_0: { raw: 100, formattedValue:'100 EUR' }, measures_1: { raw: 35, formattedValue: `35 ${costUnit}` } },
    { dimensions_0: { id: '20260102' }, measures_0: { raw: 0, formattedValue:'0 EUR' }, measures_1: { raw: 20, formattedValue: `20 ${costUnit}` } },
    { dimensions_0: { id: '20260103' }, measures_0: { raw: -25, formattedValue:'-25 EUR' }, measures_1: { raw: 15, formattedValue: `15 ${costUnit}` } },
    { dimensions_0: { id: '20260104' }, measures_0: { raw: 50, formattedValue:'50 EUR' }, measures_1: { raw: 10, formattedValue: `10 ${costUnit}` } },
    { dimensions_0: { id: '@TotalMember' }, measures_0: { raw: 125 }, measures_1: { raw: 80 } }
  ] };
}
const binding = mkBinding();
const revenue = parseBinding(binding,'measures_0');
assert.equal(revenue.state, 'success');
assert.equal(revenue.measures.length, 2);
assert.equal(revenue.unit, 'EUR');
assert.equal(revenue.data.length, 4);
assert.equal(revenue.data.find(x => x.date==='2026-01-03').count, -25);
assert.equal(revenue.data.find(x => x.date==='2026-01-02').count, 0);
const cost = parseBinding(binding, 'measures_1');
assert.equal(cost.unit,'USD');
assert.equal(cost.commonEnd,revenue.commonEnd);
assert.equal(cost.label,'Operating Costs');
const grid = build(revenue.data,1,revenue.commonEnd);
assert.equal(grid.stats.total,125);
assert.equal(grid.stats.reportedDays,4);
assert.equal(grid.stats.zeroDays,1);
assert.equal(grid.stats.negativeDays,1);
assert.equal(grid.stats.average,31.25);
assert.equal(grid.stats.maximum,100);
assert.ok(grid.stats.missingDays>0);
assert.equal(grid.years.at(-1).year,2026);
const mixed = mkBinding();
mixed.data[1].measures_1.formattedValue = '20 EUR';
assert.equal(parseBinding(mixed,'measures_1').state,'invalid');
assert.equal(parseBinding({state:'success', metadata: binding.metadata, data: []}).state,'empty');
assert.equal(parseBinding({state:'loading'}).state,'waiting');
const jan1 = Date.UTC(2026,0,1);
const segs = yearSegments(jan1-2*D,jan1+2*D);
assert.deepEqual(segs.map(x=>x.year),[2025,2026]);
assert.equal(segs[0].end,segs[1].start);

const manifest=JSON.parse(readFileSync(join(__dirname,'..','skyline.json'),'utf8'));
assert.equal(manifest.version,'0.3.0');
assert.equal(manifest.webcomponents[0].tag,registered.tag);
assert.ok(manifest.dataBindings.dataBinding.feeds.some(x=>x.id==='measures'));
console.log('PASS: registration, manifest, date parsing, multi-measure binding, currency checks, signed values, zero/missing days, statistics, fixed timeline, year guides');
