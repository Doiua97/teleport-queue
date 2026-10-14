const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
require('../teleporty.core.js');
const T = globalThis.TeleportQueue;

const item = (id, stat = 'teleport=1,2,3', extra = {}) => ({ id: String(id), hid: `h${id}`, cl: 32,
    parseStats: () => Object.fromEntries(stat.split(';').map(s => { const [k, v] = s.split('='); return [k, v ?? null]; })),
    checkExpires: () => false, $: { hasClass: () => false }, ...extra });
function fixture() {
    const p = T.load(null);
    const messages = [], used = [], timers = new Map(), inventory = new Map();
    let context = true, blocked = '', result = 'success', deferred = null;
    const a = {
        save() {}, render() {}, message: s => messages.push(s), context: () => context, blocked: () => blocked,
        item: r => { const i = inventory.get(r.id); return T.matches(i, r) ? i : null; }, ready: T.readyItem,
        use: i => {
            used.push(i.id);
            let resolve;
            const promise = result === 'pending' ? new Promise(r => { resolve = r; }) : Promise.resolve(result);
            deferred = resolve;
            return { result: promise, cancel() { resolve?.('cancelled'); } };
        }
    };
    let seq = 0;
    const clock = { setTimeout: (f, delay) => { timers.set(++seq, { f, delay }); return seq; }, clearTimeout: id => timers.delete(id) };
    const q = new T.Queue(p, a, clock);
    return { p, q, used, messages, timers, inventory,
        put(slot, obj = item(slot)) { inventory.set(obj.id, obj); p.slots[slot - 1] = { id: obj.id, hid: obj.hid }; return obj; },
        result: s => { result = s; }, context: b => { context = b; }, blocked: s => { blocked = s; },
        settle: s => deferred(s) };
}

test('rozpoznanie teleportów według klasy i statystyk, KC bez celu', () => {
    assert(T.teleport(item(1)));
    assert(T.teleport(item(2, 'custom_teleport')));
    assert(T.needsTarget(item(2, 'custom_teleport=')));
    assert(!T.needsTarget(item(2, 'custom_teleport=100,10,10')));
    assert(!T.teleport(item(1, 'teleport=1', { cl: 31 })));
    assert(!T.teleport(item(1, 'opis=Kamień Smoka')));
});
test('cooldown: brak, jedna wartość, przyszłość, przeszłość, inne właściwości', () => {
    assert.equal(T.cooldown(item(1, 'timelimit=180'), 100), 0);
    assert.equal(T.cooldown(item(1, 'timelimit=180,110'), 100), 10);
    assert.equal(T.cooldown(item(1, 'timelimit=180,90'), 100), 0);
    assert.equal(T.cooldown(item(1, 'teleport=1'), 100), 0);
    assert.equal(T.cooldown(item(1, 'timelimit_upgmax=999;timelimit_upgs=999;ttl=999;expires=999'), 100), 0);
    assert.equal(T.cooldown(item(1, 'timelimit=180,wrong'), 100), Infinity);
});
test('zużyte, wygasłe i zablokowane przedmioty są niedostępne', () => {
    assert(!T.readyItem(item(1, 'teleport=1;amount=0')));
    assert(!T.readyItem(item(1, 'teleport=1', { checkExpires: () => true })));
    assert(!T.readyItem(item(1, 'teleport=1', { $: { hasClass: k => k === 'disable-item-mark' } })));
    assert(T.readyItem(item(1, 'teleport=1;amount=3')));
});
test('cykl od 1 i od 12 wraca do własnego początku', () => {
    assert.equal(T.advance(60, 1), 1);
    assert.equal(T.advance(60, 12), 12);
    assert.equal(T.advance(12, 12), 13);
    assert.equal(T.advance(1, 12), 12);
});
test('profil odrzuca uszkodzone dane i duplikaty oraz zatrzymuje aktywny automat', () => {
    const p = T.load({ schema: 1, config: { auto: true, start: 12, interval: 0 }, state: 'active', next: 2,
        slots: [{ id: 1, hid: 2 }, { id: 1, hid: 2 }, { id: 'undefined', hid: 2 }] });
    assert.equal(p.state, 'paused'); assert.equal(p.next, 12); assert.equal(p.config.interval, 120);
    assert.equal(p.slots.length, 60); assert.equal(p.slots.filter(Boolean).length, 1);
    assert.throws(() => T.load({ schema: 2 }));
});
test('wersja zapisu i klucz postaci nie zależą od wersji kodu', () => {
    assert.equal(T.profileKey({ worldConfig: { getWorldName: () => 'nerthus' }, hero: { d: { id: 42 } } }), 'margo-tp:v1:nerthus:42');
    assert.equal(T.load({ schema: 1, next: 25 }).next, 25);
});
test('profil 0.1.0 zachowuje 60 przypisań, konfigurację, wskaźnik i widget po aktualizacji', () => {
    const original = { schema: 1, config: { ...T.defaults(), auto: true, start: 12, interval: 37,
        replaceLock: true, background: '#234567', border: '#abcdef', accent: '#765432' },
        slots: Array.from({ length: 60 }, (_, i) => ({ id: String(i + 101), hid: `legacy-${i}` })),
        next: 35, last: 34, state: 'active', widgetPlaced: true };
    const snapshot = structuredClone(original);
    assert.deepEqual(T.load(original), { ...snapshot, state: 'paused' });
    assert.deepEqual(original, snapshot);
});
test('kombinacje używają code i wszystkich modyfikatorów', () => {
    const key = T.keyOf({ code: 'KeyQ', ctrlKey: true, altKey: false, shiftKey: true, metaKey: false });
    assert(T.sameKey(key, { code: 'KeyQ', ctrl: true, alt: false, shift: true, meta: false }));
    assert(!T.sameKey(key, { ...key, alt: true })); assert(!T.sameKey(null, null));
});
test('próba pomija puste i odnowienie; wysyła tylko jeden przedmiot', async () => {
    const f = fixture();
    f.put(2, item(2, `teleport=1;timelimit=180,${Math.ceil(Date.now() / 1000) + 100}`));
    f.put(4); f.put(5);
    await f.q.manual(); assert.deepEqual(f.used, ['4']); assert.equal(f.p.next, 5);
});
test('cykl 12–60 nie używa slotów 1–11', async () => {
    const f = fixture(); f.q.setStart(12); f.put(1); f.put(60);
    await f.q.manual(); assert.deepEqual(f.used, ['60']); assert.equal(f.p.next, 12);
});
for (const result of ['rejected', 'uncertain', 'timeout']) test(`${result}: nie przesuwa wskaźnika i wstrzymuje auto`, async () => {
    const f = fixture(); f.put(4); f.p.config.auto = true; f.result(result);
    await f.q.toggle(); assert.equal(f.p.next, 1); assert.equal(f.p.state, 'paused'); assert.equal(f.timers.size, 0);
    assert.equal(f.messages.length, 1);
});
test('KC bez celu zatrzymuje auto na znalezionym slocie', async () => {
    const f = fixture(); f.put(7, item(7, 'custom_teleport')); f.p.config.auto = true; f.result('choice');
    await f.q.toggle(); assert.equal(f.p.next, 7); assert.equal(f.p.state, 'paused'); assert.equal(f.p.last, null);
    assert.equal(f.timers.size, 0); f.q.stop(); assert.equal(f.p.next, 1);
});
test('KC ręczny ponownie sprawdza ten sam slot', async () => {
    const f = fixture(); f.put(9, item(9, 'custom_teleport')); f.result('choice');
    await f.q.manual(); await f.q.manual(); assert.deepEqual(f.used, ['9', '9']); assert.equal(f.p.next, 9);
});
test('auto startuje natychmiast, planuje od zakończenia odpowiedzi, nie nadrabia prób', async () => {
    const f = fixture(); f.put(1); f.p.config.auto = true; f.result('pending');
    const pending = f.q.toggle(); assert.equal(f.used.length, 1); assert.equal(f.timers.size, 0);
    f.settle('success'); await pending;
    assert.equal(f.timers.size, 1); assert.equal([...f.timers.values()][0].delay, 120000);
});
test('wstrzymany i aktywny automat blokują ręczny bind', async () => {
    const f = fixture(); f.put(1); f.p.config.auto = true;
    await f.q.toggle(); await f.q.manual(); f.q.pause(); await f.q.manual();
    assert.equal(f.used.length, 1); assert.equal(f.timers.size, 0);
});
test('wyłączony checkbox blokuje uruchomienie auto', async () => {
    const f = fixture(); f.put(1); await f.q.toggle(); assert.equal(f.used.length, 0);
});
test('szybkie próby i STOP nie odblokowują trwającego żądania', async () => {
    const f = fixture(); f.put(1); f.result('pending');
    const pending = f.q.manual(); await f.q.manual(); f.q.stop(); await f.q.manual();
    assert.equal(f.used.length, 1); f.settle('success'); await pending;
    assert.equal(f.p.next, 1); assert.equal(f.p.last, null); assert.equal(f.q.flight, null);
});
test('timeout utrzymuje blokadę żądania do późnej odpowiedzi', async () => {
    const f = fixture(); f.put(1); f.result('timeout'); await f.q.manual(); f.q.stop(); await f.q.manual();
    assert.equal(f.used.length, 1); f.q.release(f.q.flight); await f.q.manual(); assert.equal(f.used.length, 2);
});
test('zmiana postaci podczas odpowiedzi nie przesuwa ani nie zapisuje kolejki', async () => {
    const f = fixture(); f.put(1); f.result('pending'); const pending = f.q.manual();
    f.context(false); f.settle('success'); await pending; assert.equal(f.p.next, 1); assert.equal(f.p.last, null);
});
test('zmiana początku w trakcie odpowiedzi unieważnia przesunięcie', async () => {
    const f = fixture(); f.put(1); f.result('pending'); const pending = f.q.manual();
    f.q.setStart(12); f.settle('success'); await pending; assert.equal(f.p.next, 12);
});
test('pusta kolejka i brak gotowych wyświetlają jeden komunikat i zachowują wskaźnik', async () => {
    const f = fixture(); await f.q.manual(); assert.deepEqual(f.messages, ['Brak teleportów w kolejce.']);
    f.put(5, item(5, 'teleport=1;amount=0')); f.messages.length = 0;
    await f.q.manual(); assert.deepEqual(f.messages, ['Brak gotowego teleportu.']); assert.equal(f.p.next, 1);
});
test('pusta kolejka ma pierwszeństwo przed blokadą gry', async () => {
    const f = fixture(); f.blocked('Rzemiosło'); await f.q.manual();
    assert.deepEqual(f.messages, ['Brak teleportów w kolejce.']); assert.equal(f.used.length, 0);
});
test('same cooldowny mają pierwszeństwo przed blokadą, a gotowy przedmiot jest nadal chroniony', async () => {
    const f = fixture(); f.blocked('Rzemiosło');
    const i = f.put(1, item(1, `teleport=1;timelimit=180,${Math.ceil(Date.now() / 1000) + 100}`));
    await f.q.manual(); assert.deepEqual(f.messages, ['Brak gotowego teleportu.']); assert.equal(f.used.length, 0);
    f.put(1, item(i.id)); f.messages.length = 0; await f.q.manual();
    assert.deepEqual(f.messages, ['Rzemiosło']); assert.equal(f.used.length, 0);
});
test('odpowiedź niejednoznaczna zwalnia blokadę kolejnej świadomej próby', async () => {
    const f = fixture(); f.put(1); f.result('uncertain'); await f.q.manual();
    assert.equal(f.q.flight, null); f.result('success'); await f.q.manual();
    assert.equal(f.used.length, 2); assert.equal(f.p.next, 2);
});
test('ten sam tpl lub nazwa nie zastępują brakującego id/hid', async () => {
    const f = fixture(); f.put(4, item(4, 'teleport=1', { tpl: 10, name: 'KC' }));
    f.inventory.delete('4'); f.inventory.set('5', item(5, 'teleport=1', { tpl: 10, name: 'KC' }));
    await f.q.manual(); assert.equal(f.used.length, 0); assert.equal(f.p.slots[3], null);
});
test('walka lub blokada wstrzymuje bez resetu i bez automatycznego wznowienia', async () => {
    const f = fixture(); f.put(12); f.q.setStart(12); f.p.config.auto = true; f.blocked('Walka');
    await f.q.toggle(); assert.equal(f.p.state, 'paused'); assert.equal(f.p.next, 12); assert.equal(f.used.length, 0);
    f.blocked(''); assert.equal(f.timers.size, 0); await f.q.toggle(); assert.equal(f.used.length, 1);
});
test('destroy usuwa zaplanowane próby i unieważnia późne wyniki', async () => {
    const f = fixture(); f.put(1); f.p.config.auto = true; await f.q.toggle(); f.q.destroy();
    assert.equal(f.timers.size, 0); await f.q.manual(); assert.equal(f.used.length, 1);
});
test('loader przekazuje unsafeWindow i zasoby z odrębnego sandboxu bez globalnego Engine', () => {
    const gameWindow = { Engine: { marker: 'game' } };
    const values = new Map(); let received, styled;
    const sandbox = { unsafeWindow: gameWindow, TeleportQueue: { boot: env => { received = env; } },
        GM_addStyle: text => { styled = text; }, GM_getResourceText: name => name === 'tp_css' ? '.tp-window{}' : '',
        GM_getResourceURL: name => `resource:${name}`, GM_getValue: (k, fallback) => values.get(k) ?? fallback,
        GM_setValue: (k, value) => values.set(k, value) };
    vm.runInNewContext(fs.readFileSync(require.resolve('../teleporty.user.js'), 'utf8'), sandbox);
    assert.equal(received.win, gameWindow); assert.equal(received.icon, 'resource:tp_icon');
    received.css(); assert.equal(styled, '.tp-window{}'); received.set('x', 3); assert.equal(received.get('x'), 3);
    assert.equal(Object.hasOwn(sandbox, 'Engine'), false);
});
test('metadane, adresy i wersje zasobów są gotowe do instalacji', () => {
    const text = fs.readFileSync(require.resolve('../teleporty.user.js'), 'utf8');
    assert(text.includes('@version      0.1.1')); assert(text.includes('@author       Doiua'));
    for (const name of ['teleporty.core.js', 'teleporty.css', 'assets/widget.png']) assert(text.includes(`${name}?v=0.1.1`));
    assert(!text.includes('OWNER')); assert(!text.includes('REPO'));
    assert.equal((text.match(/@match /g) || []).length, 2);
});
