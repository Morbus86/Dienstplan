/*
 * Offline-Tests fuer dienstplan_backend.gs – ohne Google, ohne Telegram, ohne API:
 *   node --test
 * Die Apps-Script-Dienste (CalendarApp, UrlFetchApp, ...) werden durch Stubs ersetzt.
 * Getestet wird nur reine Logik: MAPPING, buildEvents_, Prompt-Konsistenz.
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const FILE = path.join(__dirname, '..', 'dienstplan_backend.gs');
const SRC = fs.readFileSync(FILE, 'utf8');

function blackhole() {
  const fn = function () { return proxy; };
  const proxy = new Proxy(fn, { get: () => proxy, set: () => true, apply: () => proxy });
  return proxy;
}

// Apps Script laeuft in Europe/Berlin (Projekteinstellung). Tests ebenso.
process.env.TZ = 'Europe/Berlin';
const sb = {
  CalendarApp: { EventColor: new Proxy({}, { get: (t, k) => String(k) }) },
  UrlFetchApp: blackhole(), Utilities: blackhole(), ContentService: blackhole(),
  CacheService: blackhole(), ScriptApp: blackhole(), Logger: blackhole(), console
};
vm.createContext(sb);
vm.runInContext(SRC + '\n;globalThis.__gs = { CONFIG, MAPPING, COLOR_MAP, buildEvents_ };', sb, { filename: FILE });
const { CONFIG, MAPPING, COLOR_MAP, buildEvents_ } = sb.__gs;

const CODES = ['F4', 'S4', 'N4', 'T4', 'F8', 'S8', 'N8', 'T8'];
const hm = ms => { const d = new Date(ms); return d.getHours() * 60 + d.getMinutes(); };

test('CONFIG enthaelt nur Platzhalter (oeffentliches Repo)', () => {
  for (const k of ['TELEGRAM_TOKEN', 'ANTHROPIC_KEY', 'WEBHOOK_TOKEN', 'APP_PASSPHRASE']) {
    assert.match(CONFIG[k], /^HIER-/, k + ' ist kein Platzhalter!');
  }
});

test('MAPPING enthaelt genau die 8 erlaubten Codes', () => {
  assert.deepEqual(Object.keys(MAPPING).sort(), [...CODES].sort());
});

test('Claude-Prompt nennt genau die Codes aus MAPPING', () => {
  const m = SRC.match(/Erlaubte codes:\s*([A-Z0-9,\s]+)\./);
  assert.ok(m, 'Zeile "Erlaubte codes:" im Prompt nicht gefunden');
  const promptCodes = m[1].split(',').map(s => s.trim()).filter(Boolean).sort();
  assert.deepEqual(promptCodes, Object.keys(MAPPING).sort());
});

test('Jede gesetzte colorId existiert in COLOR_MAP', () => {
  for (const [code, m] of Object.entries(MAPPING)) {
    if (m.colorId !== null) assert.ok(COLOR_MAP[m.colorId], code + ': colorId ' + m.colorId + ' unbekannt');
  }
});

test('Standorte: *4 = Gernsheim, *8 = Moerlenbach', () => {
  for (const code of CODES) {
    const loc = MAPPING[code].loc;
    if (code.endsWith('4')) assert.match(loc, /64579 Gernsheim/);
    else assert.match(loc, /69509 Mörlenbach/);
  }
});

test('buildEvents_: Zeiten laut Mapping, Nachtdienst endet am Folgetag', () => {
  const ev = buildEvents_(CODES.map(code => ({ date: '2026-11-10', code })));
  assert.equal(ev.length, 8);
  const by = Object.fromEntries(ev.map(e => [e.code, e]));
  assert.equal(hm(by.F8.startMs), 6 * 60);       assert.equal(hm(by.F8.endMs), 14 * 60 + 30);
  assert.equal(hm(by.S4.startMs), 14 * 60);      assert.equal(hm(by.S4.endMs), 22 * 60 + 30);
  assert.equal(hm(by.T8.startMs), 6 * 60);       assert.equal(hm(by.T8.endMs), 18 * 60 + 30);
  for (const n of ['N4', 'N8']) {
    assert.equal(hm(by[n].startMs), 22 * 60);
    assert.equal(hm(by[n].endMs), 6 * 60 + 30);
    assert.equal(new Date(by[n].endMs).getDate(), 11, n + ' muss am Folgetag enden');
  }
});

test('buildEvents_: Nachtdienst ueber Zeitumstellung – Uhrzeiten bleiben 22:00–06:30', () => {
  // Sommerzeit endet am 25.10.2026 um 03:00 -> diese Nacht ist real 1 h laenger.
  // Der Kalender soll trotzdem die Wanduhrzeit 22:00–06:30 zeigen (nicht 05:30).
  const [dst] = buildEvents_([{ date: '2026-10-24', code: 'N8' }]);
  assert.equal(hm(dst.startMs), 22 * 60);
  assert.equal(hm(dst.endMs), 6 * 60 + 30);
  assert.equal((dst.endMs - dst.startMs) / 3600000, 9.5);
  const [normal] = buildEvents_([{ date: '2026-10-25', code: 'N8' }]);
  assert.equal((normal.endMs - normal.startMs) / 3600000, 8.5);
});

test('buildEvents_: unbekannte Codes und kaputte Daten werden verworfen', () => {
  const ev = buildEvents_([
    { date: '2026-11-10', code: 'WX' },
    { date: '2026-11-10', code: 'U' },
    { date: '', code: 'F8' },
    { date: 'kaputt', code: 'F8' },
    { date: '2026-11-12', code: 'F8' }
  ]);
  assert.equal(ev.length, 1);
  assert.equal(ev[0].date, '2026-11-12');
});
