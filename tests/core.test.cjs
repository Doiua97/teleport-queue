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
    let context = true, loaded = true, blocked = '', result = 'success', deferred = null;
    const a = {
        save() {}, render() {}, message: s => messages.push(s), context: () => context, loaded: () => loaded, blocked: () => blocked,
        items: group => group.items.map(r => inventory.get(r.id)).filter((i, n) => T.matches(i, group.items[n])), ready: T.readyItem,
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
        put(slot, obj = item(slot)) { inventory.set(obj.id, obj); p.slots[slot - 1] = T.groupOf(obj); return obj; },
        result: s => { result = s; }, context: b => { context = b; }, loaded: b => { loaded = b; }, blocked: s => { blocked = s; },
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
    const p = T.load({ schema: 2, config: { auto: true, start: 12, interval: 0 }, state: 'active', next: 2,
        slots: [{ items: [{ id: 1, hid: 2 }] }, { items: [{ id: 1, hid: 2 }] }, { items: [{ id: 'undefined', hid: 2 }] }] });
    assert.equal(p.state, 'paused'); assert.equal(p.next, 12); assert.equal(p.config.interval, 120);
    assert.equal(p.slots.length, 60); assert.equal(p.slots.filter(Boolean).length, 1);
    assert.throws(() => T.load({ schema: 1 }));
});
test('wersja zapisu i klucz postaci nie zależą od wersji kodu', () => {
    assert.equal(T.profileKey({ worldConfig: { getWorldName: () => 'nerthus' }, hero: { d: { id: 42 } } }), 'margo-tp:v2:nerthus:42');
    assert.equal(T.load({ schema: 2, next: 25 }).next, 25);
});
test('schema 2 zachowuje 60 grup, konfigurację i blokady bez modyfikacji wejścia', () => {
    const original = { schema: 2, config: { ...T.defaults(), auto: true, start: 12, interval: 37,
        replaceLock: true, background: '#234567', border: '#abcdef', accent: '#765432' },
        slots: Array.from({ length: 60 }, (_, i) => ({ items: [{ id: String(i + 101), hid: `member-${i}` }] })),
        locked: Array.from({ length: 60 }, (_, i) => i % 2 === 0), next: 35, last: 34, state: 'active', widgetPlaced: true };
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
    assert(text.includes('@version      0.1.4')); assert(text.includes('@author       Doiua'));
    for (const name of ['teleporty.core.js', 'teleporty.css', 'assets/widget.png']) assert(text.includes(`${name}?v=0.1.4`));
    assert(!text.includes('OWNER')); assert(!text.includes('REPO'));
    assert.equal((text.match(/@match /g) || []).length, 2);
});

test('blokady pozycji pomijane w cyklu, bez bezpośredniej próby i ostrzeżeń', async () => {
    const f = fixture(); f.put(1); f.put(3); f.p.locked[0] = true;
    await f.q.manual(1); assert.equal(f.used.length, 0); assert.equal(f.messages.length, 0);
    await f.q.manual(); assert.deepEqual(f.used, ['3']); assert.equal(f.messages.length, 0);
    f.q.stop(); f.p.config.auto = true; await f.q.toggle(); assert.deepEqual(f.used, ['3', '3']); f.q.stop();
});
test('grupa wybiera jednego gotowego członka, odrzucenie nie próbuje drugiego', async () => {
    const f = fixture(); const a = f.put(1, item(1, 'teleport=1;amount=0'));
    const b = item(2, 'teleport=1;amount=7'); const c = item(3, 'teleport=1;amount=5');
    f.inventory.set(b.id, b); f.inventory.set(c.id, c); f.p.slots[0].items.push(T.groupOf(b).items[0], T.groupOf(c).items[0]);
    f.result('rejected'); await f.q.manual(); assert.deepEqual(f.used, ['2']); assert.equal(f.p.next, 1);
    f.inventory.delete(b.id); f.result('success'); await f.q.manual(1); assert.deepEqual(f.used, ['2', '3']);
    assert.equal(a.parseStats().amount, '0');
});
test('po odpowiedzi i długim ładowaniu zaczyna się jeden pełny interwał', async () => {
    const f = fixture(); f.put(1); f.p.config.auto = true; f.result('pending');
    const wait = f.q.toggle(); f.loaded(false); f.q.wait(); f.settle('success'); await wait;
    assert.equal(f.p.state, 'active'); assert.equal(f.p.next, 2); assert.equal(f.timers.size, 0);
    f.q.ready(); assert.equal(f.timers.size, 0);
    f.loaded(true); f.q.ready(); assert.equal(f.timers.size, 1);
    assert.equal([...f.timers.values()][0].delay, 120000); assert.equal(f.used.length, 1);
    f.q.ready(); assert.equal(f.timers.size, 1); f.q.stop();
});
test('gotowa mapa przed późną odpowiedzią nie planuje nowego użycia', async () => {
    const f = fixture(); f.put(1); f.p.config.auto = true; f.result('pending'); const wait = f.q.toggle();
    f.loaded(false); f.q.wait(); f.loaded(true); f.q.ready(); assert.equal(f.timers.size, 0);
    f.settle('success'); await wait; assert.equal(f.timers.size, 1); f.q.stop();
});
test('rozpoczęcie ładowania usuwa wcześniejszy timer, STOP znosi oczekiwanie', async () => {
    const f = fixture(); f.put(1); f.p.config.auto = true; await f.q.toggle(); assert.equal(f.timers.size, 1);
    f.loaded(false); f.q.wait(); assert.equal(f.timers.size, 0); f.q.stop();
    f.loaded(true); f.q.ready(); assert.equal(f.timers.size, 0); assert.equal(f.p.state, 'off');
});
test('grupowanie wymaga amount i pełnej zgodności celu oraz ograniczeń', () => {
    const a = item(1, 'teleport=100,2,3,Ithan;amount=5;lvl=20', { tpl: 10 });
    const b = item(2, 'lvl=20;amount=7;teleport=100,2,3,Ithan', { tpl: 10 });
    assert.equal(T.groupKey(a), T.groupKey(b));
    for (const [stat, tpl] of [['teleport=100,2,4,Ithan;amount=5;lvl=20', 10],
        ['teleport=100,2,3,Ithan;amount=5;lvl=21', 10], ['teleport=100,2,3,Ithan;amount=5;lvl=20;binds=1', 10],
        ['teleport=100,2,3,Ithan;amount=5;lvl=20', 11], ['custom_teleport=100,2,3,Ithan;amount=5;lvl=20', 10]]) {
        assert.notEqual(T.groupKey(a), T.groupKey(item(3, stat, { tpl })));
    }
    assert.equal(T.groupKey(item(4, 'teleport=1;timelimit=180', { tpl: 10 })), null);
    assert.notEqual(T.groupKey(item(5, 'custom_teleport=1,2,3,Ithan;amount=1', { tpl: 10 })),
        T.groupKey(item(6, 'custom_teleport=4,2,3,Tristam;amount=1', { tpl: 10 })));
});
test('nazwy lokacji odczytywane ze statystyk, także z przecinkami i KC bez celu', () => {
    assert.equal(T.destination(item(1, 'teleport=1,2,3,Ithan')), 'Ithan');
    assert.equal(T.destination(item(1, 'custom_teleport=2,2,3, Las, za Ithan')), 'Las, za Ithan');
    assert.equal(T.destination(item(1, 'custom_teleport')), 'wybór miejsca');
});
test('blokady zapisane osobno na postaci, schema 1 pozostaje poza nowym zapisem', () => {
    const p = T.load(null); p.locked[59] = true; p.config.replaceLock = false;
    const copy = T.load(p); assert(copy.locked[59]); assert.equal(copy.locked.length, 60);
    assert.equal(copy.config.replaceLock, false); assert.throws(() => T.load({ schema: 1 }));
    const key = world => T.profileKey({ worldConfig: { getWorldName: () => world }, hero: { d: { id: 42 } } });
    assert.notEqual(key('nerthus'), key('nyras'));
});
const key = (code, extra = {}) => ({ code, ctrl: false, alt: false, shift: false, meta: false, ...extra });
const hotEngine = () => ({ hotKeys: { hotKeys: { Q: 'attack', F9: 'other' },
    getSortedHotKeys: () => [['Q', 'attack', false, 'fight']], getKeyByClbName: name => name === 'move_up' ? 'W' : '' },
    widgetManager: { getDefaultWidgetSet: () => ({}) } });
test('0.1.3: bazowa litera i bezpieczna kombinacja to oddzielne skróty', () => {
    const e = hotEngine();
    for (const code of ['ArrowLeft', 'Digit1', 'Numpad7', 'Enter', 'Escape', 'Tab']) {
        for (const mod of [{}, { ctrl: true }, { alt: true }, { meta: true }]) assert(T.gameConflict(key(code, mod), e));
    }
    assert.equal(T.gameConflict(key('KeyW'), e), 'Ten skrót jest już zajęty.');
    assert.equal(T.gameConflict(key('KeyW', { shift: true }), e), null);
    assert.equal(T.gameConflict(key('KeyQ', { shift: true }), e), null);
    assert.equal(T.gameConflict(key('KeyQ', { alt: true }), e), null);
    assert.equal(T.gameConflict(key('KeyQ', { ctrl: true }), e), null);
    assert.equal(T.gameConflict(key('Digit1', { shift: true }), e), null);
});
test('normalizacja używa rzeczywistego key; konflikt może powstać po zapisaniu', () => {
    const e = hotEngine(); const k = key('KeyZ', { key: 'y' }); e.hotKeys.hotKeys.Y = 'other';
    assert(T.gameConflict(k, e)); assert.equal(T.nativeKey(key('KeyZ'), { key: 'ą' }), 'Ą');
    delete e.hotKeys.hotKeys.F9; assert.equal(T.gameConflict(key('F9'), e), null);
    e.hotKeys.hotKeys.F9 = 'action'; assert(T.gameConflict(key('F9'), e));
});
test('0.1.3: wykrywalna pełna kombinacja w rejestrze Engine blokuje tylko siebie', () => {
    const e = hotEngine(); e.hotKeys.hotKeys['Shift+KeyC'] = 'another_addon';
    assert.equal(T.gameConflict(key('KeyC', { shift: true }), e), 'Ten skrót jest już zajęty.');
    assert.equal(T.gameConflict(key('KeyC', { alt: true }), e), null);
    e.hotKeys.getSortedHotKeys = () => [['Ctrl+G', 'another_addon', false, 'other']];
    assert.equal(T.gameConflict(key('KeyG', { ctrl: true }), e), 'Ten skrót jest już zajęty.');
    assert.equal(T.gameConflict(key('KeyG', { shift: true }), e), null);
});
test('0.1.3: znane skróty przeglądarki/systemu nie stają się bindem', () => {
    const e = hotEngine();
    for (const k of [key('F5'), key('KeyW', { ctrl: true }), key('KeyR', { meta: true }), key('F4', { alt: true }), key('Tab', { alt: true })]) {
        assert.equal(T.gameConflict(k, e), 'Ten skrót jest już zajęty.');
    }
    for (const code of ['KeyC', 'KeyK', 'KeyG']) {
        e.hotKeys.hotKeys[code.slice(3)] = 'native';
        assert(T.gameConflict(key(code), e));
        for (const mod of [{ shift: true }, { alt: true }, { ctrl: true, alt: true }]) {
            assert.equal(T.gameConflict(key(code, mod), e), null);
        }
    }
    assert.equal(T.gameConflict(key('KeyC', { ctrl: true }), e), null);
    assert.equal(T.gameConflict(key('KeyC', { ctrl: true, shift: true }), e), null);
    assert.equal(T.gameConflict(key('KeyK', { ctrl: true, shift: true }), e), 'Ten skrót jest już zajęty.');
    assert.equal(T.gameConflict(key('KeyC', { ctrl: true, shift: true, alt: true }), e), null);
    assert.equal(T.gameConflict(key('F8', { meta: true }), e), null);
});
test('0.1.3: nakładka pokazuje sekundy i minuty bez godzin', () => {
    for (const [seconds, text] of [[15, '15s'], [59, '59s'], [60, '1m'], [90, '2m'], [1800, '30m'],
        [3600, '60m'], [5400, '90m'], [7500, '125m'], [10800, '180m'], [0, ''], [Infinity, '?']]) {
        assert.equal(T.cooldownText(seconds), text);
    }
});
test('0.1.3: wspólny wybór 1 → 2 → 4 → 6 → 1, bez przesuwania przy podglądzie', async () => {
    const f = fixture(); for (const n of [1, 2, 4, 5, 6]) f.put(n); f.p.locked[4] = true;
    for (const expected of [1, 2, 4, 6, 1]) {
        const next = f.p.next; assert.equal(f.q.find().slot, expected); assert.equal(f.p.next, next);
        await f.q.manual(); assert.equal(f.used.at(-1), String(expected));
    }
});
test('0.1.3: zniknięcie wskazanego, blokada i koniec cooldownu zmieniają wybór bez zapisu next', () => {
    const f = fixture(); f.q.setStart(12); f.put(1); f.put(12); f.put(20); f.put(60);
    f.inventory.delete('12'); assert.equal(f.q.find().slot, 20);
    f.p.locked[19] = true; assert.equal(f.q.find().slot, 60);
    f.put(20, item(20, 'teleport=1;timelimit=180,' + (Date.now() / 1000 + 100))); f.p.locked[19] = false;
    assert.equal(f.q.find().slot, 60); f.put(20); assert.equal(f.q.find().slot, 20); assert.equal(f.p.next, 12);
    f.inventory.delete('20'); f.inventory.delete('60'); assert.equal(f.q.find(), null); assert.equal(f.p.next, 12);
    f.put(60); const restored = T.load(f.p); assert.equal(restored.next, 12);
});
test('0.1.4: macierz Ctrl+A–Z i Ctrl+Shift+A–Z rozróżnia zarezerwowane kombinacje', () => {
    const e = hotEngine();
    for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
        e.hotKeys.hotKeys[letter] = 'native';
        for (const shift of [false, true]) {
            const reserved = (shift ? 'KNTW' : 'NTW').includes(letter);
            assert.equal(T.gameConflict(key('Key' + letter, { ctrl: true, shift }), e), reserved ? 'Ten skrót jest już zajęty.' : null,
                'Ctrl+' + (shift ? 'Shift+' : '') + letter);
        }
    }
});
test('0.1.4: AltGraph nie jest Ctrl+Alt, a stare klucze v2 nie wymagają migracji', () => {
    const e = { code: 'KeyA', key: 'ą', ctrlKey: true, altKey: true, shiftKey: false, metaKey: false,
        getModifierState: name => name === 'AltGraph' };
    const altgr = T.keyOf(e); const ctrlalt = key('KeyA', { ctrl: true, alt: true });
    assert.equal(altgr.altGraph, true); assert(!T.sameKey(altgr, ctrlalt));
    assert(T.sameKey(ctrlalt, { ...ctrlalt, altGraph: false }));
    assert.equal(T.gameConflict(altgr, hotEngine(), e), 'Naciśnij poprawną kombinację klawiszy.');
    const p = T.load(null); p.config.manualKey = ctrlalt; assert.deepEqual(T.load(p).config.manualKey, ctrlalt);
    const genuine = T.keyOf({ ...e, key: 'a', getModifierState: () => false });
    assert(T.sameKey(genuine, ctrlalt)); assert.equal(T.gameConflict(genuine, hotEngine()), null);
});
test('0.1.4: jawne Ctrl+K nie blokuje K ani Ctrl+Shift+K w innym zestawie modyfikatorów', () => {
    const e = hotEngine(); e.hotKeys.hotKeys['Control+KeyB'] = 'foreign'; e.hotKeys.hotKeys['Ctrl+K'] = 'foreign';
    assert.equal(T.gameConflict(key('KeyK', { ctrl: true }), e), 'Ten skrót jest już zajęty.');
    assert.equal(T.gameConflict(key('KeyB', { ctrl: true }), e), 'Ten skrót jest już zajęty.');
    assert.equal(T.gameConflict(key('KeyB', { ctrl: true, shift: true }), e), null);
    assert.equal(T.gameConflict(key('KeyK'), e), null);
});
test('0.1.4: nieanulowalny event nie uruchamia konkurencyjnej akcji', () => {
    const app = { p: { config: { autoKey: key('F10') } }, e: hotEngine() };
    const ctrlb = key('KeyB', { ctrl: true });
    assert.equal(T.App.prototype.conflict.call(app, 'manualKey', ctrlb, { cancelable: false }), 'Ten skrót jest już zajęty.');
    assert.equal(T.App.prototype.conflict.call(app, 'manualKey', ctrlb, { cancelable: true }), '');
});
