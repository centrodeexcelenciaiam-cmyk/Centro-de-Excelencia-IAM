import { test } from 'node:test';
import assert from 'node:assert/strict';
import { iamPatients, calculateIntervals, classifyIntervals, summarizeIAM, getIAMBlockTimes, consolidateIAM } from './iam';

test('reconciles against independently recalculated workbook control totals', () => {
  assert.equal(iamPatients.length, 7000);
  assert.equal(new Set(iamPatients.map(p => p.id)).size, 7000);
  const summary = summarizeIAM(iamPatients);
  assert.equal(summary.valid, 7000);
  assert.equal(summary.totalOK, 2834);
  assert.equal(summary.allOK, 17);
  assert.ok(Math.abs(summary.mean! - 41.86114285714286) < 1e-10);
  assert.equal(summary.median, 42);
  assert.equal(summary.p90, 49);
  assert.deepEqual(summary.stages.map(s=>s.count), [3908,2886,2746,3553,2380,3108,2983,2834]);
  for (const p of iamPatients) {
    assert.equal(p.minutes[7], [0,1,3,4,5,6].reduce((sum,i)=>sum+p.minutes[i]!,0));
    assert.ok(p.compliant.every(v=>v!==null));
  }
});
test('keeps strict EKG threshold and inclusive remaining thresholds', () => {
  assert.deepEqual(classifyIntervals([8,2,2,10,3,10,5,40]), [false,true,true,true,true,true,true,true]);
  assert.equal(classifyIntervals([7.99,2,2,10,3,10,5,40])[0], true);
  assert.equal(classifyIntervals([7,2,2,10,3,10,5,40.01])[7], false);
  assert.equal(classifyIntervals([-1,2,2,10,3,10,5,40])[0], null);
});
test('handles midnight, missing timestamps and inverted events without false compliance', () => {
  const events = ['2026-01-01T23:58:00','2026-01-02T00:03:00',null,null,null,null,null,'2026-01-02T00:38:00'];
  assert.equal(calculateIntervals(events)[0], 5);
  assert.equal(calculateIntervals(events)[7], 40);
  assert.equal(calculateIntervals(events)[1], null);
  assert.equal(calculateIntervals(['2026-01-02T00:03:00','2026-01-01T23:58:00'])[0], null);
  assert.equal(classifyIntervals(calculateIntervals(events))[1], null);
});
test('filtered populations and empty populations have correct denominators', () => {
  const hospital = summarizeIAM(iamPatients.filter(p=>p.service==='Hospitalización'));
  assert.equal(hospital.count, 1421);
  const route = summarizeIAM(iamPatients.filter(p=>p.totalOK));
  assert.equal(route.count, 2834);
  assert.equal(route.totalOK, 2834);
  assert.equal(route.allOK, 17);
  const empty = summarizeIAM([]);
  assert.equal(empty.mean, null);
  assert.equal(empty.p90, null);
  assert.equal(empty.valid, 0);
});

test('area consolidations reconcile to original timestamps without adding parallel activation', () => {
  const result = consolidateIAM(iamPatients);
  assert.equal(result.count, 7000);
  assert.equal(result.excluded, 0);
  assert.ok(Math.abs(result.blocks[0].mean! - 24.884) < 1e-10);
  assert.ok(Math.abs(result.blocks[1].mean! - 16.97714285714286) < 1e-10);
  assert.ok(Math.abs(result.routeMean! - summarizeIAM(iamPatients).mean!) < 1e-10);
  assert.deepEqual(getIAMBlockTimes(iamPatients[0]), [25,16]);
  for (const p of iamPatients) {
    const [urgent, hemo] = getIAMBlockTimes(p);
    assert.equal(urgent, (Date.parse(p.events[5]!+'Z')-Date.parse(p.events[0]!+'Z'))/60000);
    assert.equal(hemo, (Date.parse(p.events[7]!+'Z')-Date.parse(p.events[5]!+'Z'))/60000);
    assert.equal(urgent!+hemo!, p.minutes[7]);
  }
});

test('area consolidations use matching denominators and handle empty filters', () => {
  const invalid = {...iamPatients[0], minutes:[...iamPatients[0].minutes]};
  invalid.minutes[5] = null;
  const paired = consolidateIAM([iamPatients[0], invalid]);
  assert.equal(paired.count,1);
  assert.equal(paired.excluded,1);
  assert.equal(paired.blocks[0].mean,25);
  assert.equal(paired.blocks[1].mean,16);
  const filtered = consolidateIAM(iamPatients.filter(p=>p.service==='Urgencias'));
  assert.equal(filtered.count,4150);
  assert.ok(Math.abs(filtered.blocks[0].mean!+filtered.blocks[1].mean!-filtered.routeMean!)<1e-10);
  const empty = consolidateIAM([]);
  assert.equal(empty.count,0);
  assert.equal(empty.blocks[0].mean,null);
  assert.equal(empty.blocks[1].p90,null);
  assert.equal(empty.routeMean,null);
});
