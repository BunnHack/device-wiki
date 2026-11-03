const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {parseHTML} = require('linkedom');
const read = path => fs.readFileSync(path, 'utf8');
const csv = read('devices.csv');
const shared = read('assets/device-data.js');
const tick = () => new Promise(resolve => setImmediate(resolve));

async function page(file, {search = '', hash = '', data = csv, failure = false, saved = null, blockedStorage = false} = {}) {
  const {document, window} = parseHTML(read(file));
  const storage = new Map(saved === null ? [] : [['device-wiki-appearance', saved]]);
  const ctx = {
    document, URLSearchParams, location: {search, hash}, history: {replaceState() {}},
    localStorage: {
      getItem(key) { if (blockedStorage) throw Error('blocked'); return storage.get(key) || null; },
      setItem(key, value) { if (blockedStorage) throw Error('blocked'); storage.set(key, value); }
    },
    fetch: async () => ({ok: !failure, status: failure ? 503 : 200, text: async () => data})
  };
  vm.createContext(ctx);
  for (const script of document.querySelectorAll('script')) {
    const source = script.getAttribute('src');
    vm.runInContext(source ? read(source) : script.textContent, ctx);
  }
  await tick();
  return {document, window, ctx, storage};
}
function cell(document, table, label) {
  return Array.from(document.querySelectorAll('#' + table + ' tr')).find(row => row.firstElementChild.textContent === label)?.lastElementChild;
}

test('CSV has 29 devices and all 22 columns with unique codenames', () => {
  const ctx = vm.createContext({}); vm.runInContext(shared, ctx);
  const rows = ctx.DeviceData.parseCSV(csv);
  assert.equal(rows.length, 30);
  assert.equal(rows[0].length, 22);
  assert.deepEqual(Array.from(rows[0].slice(-5)), ['Bluetooth', 'GPS', 'CPU', 'Storage', 'Based by']);
  assert.equal(new Set(rows.slice(1).map(row => row[2])).size, 29);
  for (const row of rows) assert.equal(row.length, 22);
});

test('shared CSV parser supports BOM, quotes, commas, CRLF, and rejects unclosed quotes', () => {
  const ctx = vm.createContext({}); vm.runInContext(shared, ctx);
  const rows = ctx.DeviceData.parseCSV('\uFEFFName,Value\r\n"One, Two","say ""hello"""\r\n\r\n');
  assert.equal(rows.length, 2); assert.equal(rows[1][0], 'One, Two'); assert.equal(rows[1][1], 'say "hello"');
  assert.throws(() => ctx.DeviceData.parseCSV('"unfinished'), /Unclosed/);
});

test('support table renders 22 columns, device links, OS tabs, and sortable new fields', async () => {
  for (const os of ['', 'iOS', 'iPadOS', 'watchOS', 'macOS', 'tvOS']) {
    const {ctx, document} = await page('devices.html', {hash: '#' + os});
    assert.equal(ctx.h.children.length, 22); assert.equal(ctx.b.children.length, os ? 1 : 29);
    assert.equal(ctx.tbl.hidden, false);
    for (const row of ctx.b.children) {
      assert.equal(row.children.length, 22);
      const link = row.querySelector('a');
      assert.equal(link.getAttribute('href'), 'device.html?id=' + encodeURIComponent(row.children[2].textContent));
    }
    for (let i = 17; i < 22; i++) {
      ctx.h.children[i].onclick(); assert.equal(ctx.h.children[i].getAttribute('aria-sort'), 'ascending');
      ctx.h.children[i].onclick(); assert.equal(ctx.h.children[i].getAttribute('aria-sort'), 'descending');
    }
    document.querySelector('#tabs button').onclick(); assert.equal(ctx.b.children.length, 29);
  }
});

test('each device link resolves to its own wiki page with specs and all support fields', async () => {
  for (const line of csv.trim().split('\n').slice(1)) {
    const values = line.split(',');
    const {document} = await page('device.html', {search: '?id=' + encodeURIComponent(values[2])});
    assert.equal(document.getElementById('wiki').hidden, false);
    assert.equal(document.getElementById('message').hidden, true);
    assert.equal(document.getElementById('device-title').textContent, values[0] + ' (' + values[2] + ')');
    assert.equal(cell(document, 'specs', 'CPU').textContent, 'Not documented');
    assert.equal(cell(document, 'specs', 'Storage').textContent, 'Not documented');
    assert.equal(cell(document, 'specs', 'Based by').textContent, 'Not documented');
    assert.equal(cell(document, 'features', 'Bluetooth').textContent, 'Untested');
    assert.equal(cell(document, 'features', 'GPS').textContent, 'Untested');
    assert.equal(document.querySelectorAll('#features td').length, 15);
    assert.equal(document.getElementById('sample-notice').hidden, !values[2].startsWith('example-'));
    for (const anchor of document.querySelectorAll('#contents-list a')) assert.ok(document.querySelector(anchor.getAttribute('href')));
  }
});

test('status colors, issue summaries, and based-by links reflect CSV values', async () => {
  const rows = csv.trim().split('\n').map(line => line.split(','));
  const index = name => rows[0].indexOf(name);
  rows[1][index('Based by')] = 'google-sargo';
  rows[1][index('CPU')] = 'Example CPU'; rows[1][index('Storage')] = '128 GB';
  rows[1][index('Bluetooth')] = 'Y'; rows[1][index('GPS')] = 'N';
  const data = rows.map(row => row.join(',')).join('\n');
  const {document} = await page('device.html', {search: '?id=fairphone-fp4', data});
  assert.equal(cell(document, 'specs', 'CPU').textContent, 'Example CPU');
  assert.equal(cell(document, 'specs', 'Storage').textContent, '128 GB');
  assert.equal(cell(document, 'specs', 'Based by').querySelector('a').getAttribute('href'), 'device.html?id=google-sargo');
  assert.equal(cell(document, 'features', 'Bluetooth').className, 'status-Y');
  assert.equal(cell(document, 'features', 'GPS').className, 'status-N');
  assert.equal(cell(document, 'features', 'Wi-Fi').className, 'status-P');
  assert.match(document.getElementById('issue-list').textContent, /GPS: broken/);
  assert.equal(document.getElementById('base-note').hidden, false);
});

test('appearance controls persist settings and both sidebars toggle accessibly', async () => {
  const saved = JSON.stringify({text: 'large', width: 'wide'});
  const {document, window, storage} = await page('device.html', {search: '?id=google-sargo', saved});
  assert.equal(document.body.dataset.text, 'large'); assert.equal(document.body.dataset.width, 'wide');
  const input = document.querySelector('input[value="small"]'); input.checked = true; input.dispatchEvent(new window.Event('change'));
  assert.equal(document.body.dataset.text, 'small'); assert.equal(JSON.parse(storage.get('device-wiki-appearance')).text, 'small');
  for (const button of document.querySelectorAll('[data-toggle]')) {
    const target = document.getElementById(button.dataset.toggle);
    button.click(); assert.equal(target.hidden, true); assert.equal(button.getAttribute('aria-expanded'), 'false');
    button.click(); assert.equal(target.hidden, false); assert.equal(button.textContent, 'hide');
  }
  for (const saved of ['invalid JSON', '"unexpected string"', 'null', '[]']) {
    const {document} = await page('device.html', {search: '?id=google-sargo', saved});
    assert.equal(document.getElementById('wiki').hidden, false); assert.equal(document.body.dataset.text, 'standard');
  }
  const blocked = await page('device.html', {search: '?id=google-sargo', blockedStorage: true});
  assert.equal(blocked.document.getElementById('wiki').hidden, false);
});

test('missing, unknown, failed, and malformed device requests show helpful errors', async () => {
  for (const [options, title] of [
    [{}, 'Choose a device'],
    [{search: '?id=missing'}, 'Device not found'],
    [{search: '?id=google-sargo', failure: true}, 'Unable to load device'],
    [{search: '?id=google-sargo', data: 'bad,headers\n1,2'}, 'Unable to load device']
  ]) {
    const {document} = await page('device.html', options);
    assert.equal(document.querySelector('#message h1').textContent, title);
    assert.equal(document.getElementById('wiki').hidden, true);
    assert.equal(document.querySelector('#message a').getAttribute('href'), 'devices.html');
  }
});

test('CSV names are rendered as text, not HTML', async () => {
  const data = csv.replace('Fairphone 4', '<img src=x onerror=alert(1)>');
  const {document} = await page('device.html', {search: '?id=fairphone-fp4', data});
  assert.equal(document.getElementById('wiki').hidden, false);
  assert.equal(document.querySelector('#device-title img'), null);
  assert.match(document.getElementById('device-title').textContent, /<img/);
});
