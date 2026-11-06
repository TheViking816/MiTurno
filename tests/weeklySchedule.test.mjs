import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const toModule = source => `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString('base64')}`;
const scheduleUrl = toModule(fs.readFileSync(new URL('../services/weeklySchedule.ts', import.meta.url), 'utf8'));
const { madridWeekday, scheduledLocation, validateScheduledEntry } = await import(scheduleUrl);
const lilly = [null, 'soul', 'soul', 'ke', 'ke', 'ke', null];

test('Lilly: all seven weekdays, assigned restaurants, and days off', () => {
  for (let i = 0; i < 7; i++) {
    const date = new Date(`2026-11-${String(2 + i).padStart(2, '0')}T12:00:00Z`);
    assert.equal(madridWeekday(date), i);
    assert.equal(scheduledLocation(lilly, date), lilly[i]);
    if (lilly[i]) {
      assert.doesNotThrow(() => validateScheduledEntry(lilly, lilly[i], date));
      assert.throws(() => validateScheduledEntry(lilly, lilly[i] === 'ke' ? 'soul' : 'ke', date), /no corresponde/);
    } else assert.throws(() => validateScheduledEntry(lilly, 'soul', date), /día libre/);
  }
});

test('Madrid midnight and summer/winter clock changes use the local weekday', () => {
  assert.equal(madridWeekday(new Date('2026-11-04T23:30:00Z')), 3);
  assert.equal(madridWeekday(new Date('2026-07-01T22:30:00Z')), 3);
  assert.equal(madridWeekday(new Date('2026-10-25T01:30:00Z')), 6);
});

test('existing employees without fixed calendars retain flexible locations', () => {
  assert.equal(scheduledLocation(null), undefined);
  assert.doesNotThrow(() => validateScheduledEntry(null, 'soul'));
});

// Exercise the actual service with a deterministic Supabase transport double.
let results = [];
let queries = [];
globalThis.__turnqrTestClient = {
  from(table) {
    const query = { table, calls: [] };
    queries.push(query);
    const chain = new Proxy({}, { get(_, method) {
      if (method === 'then') return resolve => resolve(results.shift() ?? { data: null, error: null });
      return (...args) => { query.calls.push([method, ...args]); return chain; };
    } });
    return chain;
  }
};
const serviceSource = fs.readFileSync(new URL('../services/supabaseService.ts', import.meta.url), 'utf8')
  .replace("import { createClient } from '@supabase/supabase-js';", 'const createClient = () => globalThis.__turnqrTestClient;')
  .replace("'./weeklySchedule'", JSON.stringify(scheduleUrl));
const { supabaseService } = await import(toModule(serviceSource));
const reset = responses => { results = [...responses]; queries = []; };

test('failed location insertion never deletes the previous assignments', async () => {
  reset([{ data: {}, error: null }, { error: new Error('insert failed') }]);
  await assert.rejects(supabaseService.setEmployeeLocations('lilly', ['soul', 'ke']), /insert failed/);
  assert.equal(queries.some(q => q.calls.some(call => call[0] === 'delete')), false);
});

test('successful location update deduplicates and removes only obsolete assignments last', async () => {
  reset([{ data: {}, error: null }, {}, {}, {}]);
  await supabaseService.setEmployeeLocations('lilly', ['soul', 'ke', 'soul']);
  assert.equal(queries[1].calls.find(call => call[0] === 'upsert')[1].length, 2);
  assert.equal(queries[3].calls[0][0], 'delete');
  assert.deepEqual(queries[3].calls.find(call => call[0] === 'not'), ['not', 'location_id', 'in', '(soul,ke)']);
});

test('cannot remove a restaurant still used in the weekly calendar', async () => {
  reset([{ data: { weekly_schedule: lilly }, error: null }]);
  await assert.rejects(supabaseService.setEmployeeLocations('lilly', ['soul']), /calendario/);
  assert.equal(queries.length, 1);
});

test('location read failures are surfaced instead of granting unrestricted entry', async () => {
  reset([{ error: new Error('offline') }]);
  await assert.rejects(supabaseService.getEmployeeLocations('lilly'), /offline/);
});

test('clock-in rejects an unassigned QR before inserting a session', async () => {
  reset([{ data: null, error: null }, { data: [{ location_id: 'soul', locations: { name: 'Brutal Soul' } }], error: null }]);
  await assert.rejects(supabaseService.clockIn('lilly', 'other'), /No tienes asignado/);
  assert.equal(queries.some(q => q.calls.some(call => call[0] === 'insert')), false);
});

test('an open session is preserved independently of the current calendar', async () => {
  reset([{ data: { id: 'open-session' }, error: null }]);
  assert.deepEqual(await supabaseService.clockIn('lilly', 'ke'), { id: 'open-session' });
  assert.equal(queries.length, 1);
});
