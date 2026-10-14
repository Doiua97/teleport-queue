const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const sourceDir = process.env.MARGO_SOURCE_DIR || 'E:/Kod margonem';
const source = fs.readFileSync(path.join(sourceDir, 'main.min.DdoKxU4n.js'), 'utf8');
function moduleCode(name) {
    for (const m of source.matchAll(/\/\/#region ([^\n]+)\n([\s\S]*?)\/\/#endregion/g)) {
        if ([`${name}.js`, `${name}.ts`].includes(m[1].split('/').pop())) return m[2];
    }
    throw new Error(`Brak modułu ${name}`);
}
const templates = Object.fromEntries(['border-window', 'button', 'widget-button', 'item', 'input', 'ni-input-text',
    'checkbox-custom', 'c-color-picker', 'scrollbar-wrapper', 'crafting'].map(name => {
    const code = moduleCode('TemplatesData');
    const start = code.indexOf(`TEMPLATES["${name}"] = \``) + `TEMPLATES["${name}"] = \``.length;
    return [name, code.slice(start, code.indexOf('`;', start))];
}));

(async () => {
    const browser = await chromium.launch({ headless: true, ...(process.env.TP_BROWSER_CHANNEL ? { channel: process.env.TP_BROWSER_CHANNEL } : {}) });
    try {
        const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route('**/*', async route => {
            const url = new URL(route.request().url());
            const name = path.basename(url.pathname);
            if (['vendors.min.Dme5lfFa.js', 'rolldown-runtime.min.7_rZTKki.js'].includes(name)) {
                return route.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(path.join(sourceDir, name), 'utf8') });
            }
            if (url.pathname === '/') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head></head><body><div id="alerts"></div><div id="bar"></div><div id="bag"></div><div id="ground"></div></body></html>' });
            if (process.env.TP_NATIVE_ASSET_ORIGIN && url.pathname.startsWith('/img/')) {
                const response = await route.fetch({ url: process.env.TP_NATIVE_ASSET_ORIGIN + url.pathname + url.search });
                return route.fulfill({ response });
            }
            return route.abort();
        });
        await page.goto('http://tp.test/');
        await page.addScriptTag({ type: 'module', content: `import { l, c } from '/vendors.min.Dme5lfFa.js'; c(); window.$ = window.jQuery = window.jQuery$1 = l; window.init_jquery_module = c; window.require_jquery_mask = () => {};` });
        await page.waitForFunction(() => Boolean(window.jQuery));
        await page.evaluate(templates => {
            const $ = window.$;
            window.isset = x => x !== undefined;
            window.mobileCheck = window.isMobileApp = () => false;
            window.getClickEventName = () => 'click';
            window.getRightClickEventName = () => 'contextmenu longpress';
            window.getEngine = () => window.Engine;
            window.getEngine$1 = window.getEngine;
            window._t = text => text;
            window.createHamburgerMenuButton = () => $('<div>').addClass('hamburger-menu-button');
            window.errorReport = (...args) => { throw new Error(args.join(' ')); };
            $.fn.tip = function (text) { return this.attr('title', text); };
            $.fn.tipHide = function () { return this; };
            window.Templates_default = { get: name => $(templates[name]) };
            window.o$18 = Object.fromEntries(['ALERTS', 'M_ALERT', 'M_ALERT_MOBILE', 'TUTORIAL', 'CONSOLE', 'CAPTCHA'].map(n => [`$_${n}_LAYER`, n]));
            const storage = new Map();
            window.Storage = {
                easySet: (value, ...keys) => storage.set(keys.join('/'), structuredClone(value)),
                easyGet: (...keys) => storage.get(keys.join('/')) ?? null,
                remove: key => storage.delete(key)
            };
            window.StorageData_default = { WINDOW_DATA: { mainKey: 'WINDOW_DATA', SHOW: 'show', POSITION: 'position', OPACITY: 'opacity', COLLAPSE: 'collapse' } };
            window.message = text => window.messages.push(text);
            window.messages = []; window.sent = []; window.groundDrops = 0;
            window.requests = []; window.responseType = 'success';
            const server = { existing: [0, 'top-left'] };
            window.fullBars = false;
            window.Engine = {
                allInit: true, zoomFactor: 1, windowMaxZIndex: 100,
                hero: { d: { id: 42, hp: 100 } }, worldConfig: { getWorldName: () => 'nerthus' },
                battle: { isBattleShow: () => false },
                interface: {
                    getAlreadyInitialised: () => true, getInterfaceLightMode: () => false,
                    get$alertsLayer: () => $('#alerts'), get$mAlertLayer: () => $('#alerts'), get$mAlertMobileLayer: () => $('#alerts'),
                    get$tutorialLayer: () => $('#alerts'), get$consoleLayer: () => $('#alerts'), get$captchaLayer: () => $('#alerts'),
                    checkTeleport() {}, showPopupMenu: menu => { window.lastMenu = menu; }
                },
                itemsViewData: { BAG_VIEW: 'BAG_VIEW' },
                lock: { list: [], check(name) { return name ? this.list.includes(name) : Boolean(this.list.length); },
                    add(name) { if (!this.list.includes(name)) this.list.push(name); }, remove(name) { this.list = this.list.filter(n => n !== name); } },
                interfaceItems: { isInterfaceItemsDisable: () => false },
                serverStorage: {
                    get: () => server,
                    sendData(data, callback) {
                        window.sent.push(structuredClone(data));
                        Object.assign(server, data.hotWidgets);
                        callback?.();
                    }
                }
            };
            let set = {}, attached = {};
            Engine.widgetsData = { pos: { TOP_LEFT: 'top-left' }, type: { RED: 'red' }, name: { CRAFTING: 'crafting' } };
            Engine.widgetManager = {
                getWidgetLoaded: () => true, getDefaultWidgetSet: () => set,
                getPathToHotWidgetVersion: () => 'hotWidgets',
                getFirstEmptyWidgetSlot: () => window.fullBars ? false : { slot: 1, container: 'top-left' },
                addKeyToDefaultWidgetSet(key, index, pos, txt, type, clb) { set[key] = { keyName: key, index, pos, txt, type, clb, addon: true }; },
                initDefaultWidgetSet() { set = {}; },
                getAttachWidgetByName: name => attached[name],
                removeFromAttachWidgetList: name => { delete attached[name]; },
                manageClassOfWidget(name, active) { attached[name]?.getWidget().toggleClass('window-is-open', active); },
                addWidgetButtons() {
                    $('#bar').empty(); attached = {};
                    for (const [name, data] of Object.entries(set)) {
                        if (!server[name]) continue;
                        const button = Templates_default.get('widget-button').addClass('widget-' + name).on('click', data.clb).appendTo('#bar');
                        attached[name] = { getWidget: () => button };
                    }
                }
            };
            window.ItemCraft = class { close() {} };
            window.Tabs = class { canCardOpen() { return true; } activateCard() {} };
            window.MODULES$1 = { ENHANCEMENT: 'enhancement' };
            window.hItems = {};
            Engine.heroEquipment = {
                getHItems: () => hItems,
                blockBadTutorialItem: () => false, checkBlessEquipped: () => false,
                sendUseRequest(item, callback) {
                    requests.push(item.id);
                    const response = () => {
                        callback();
                        if (responseType === 'rejected') return;
                        if (responseType === 'success') Engine.interface.checkTeleport({ t: 'reload' });
                        API.callEvent(Engine.apiData.ITEM_USED, item);
                    };
                    if (responseType === 'delayed') window.reply = response; else response();
                }
            };
        }, templates);
        for (const name of ['PointerDragDrop', 'AddScrollBar', 'ApiData', 'Api', 'WindowsData', 'StorageFuncWindow', 'WindowManageOpacity', 'WindowManageSize', 'Window', 'WindowManager', 'ItemsManager', 'CraftingWindow', 'Crafting']) {
            if (name === 'Api') await page.evaluate(() => { Engine.apiData = ApiData_default; });
            await page.addScriptTag({ content: moduleCode(name) });
        }
        await page.evaluate(() => {
            Engine.windowsData = o$4;
            Engine.windowManager = new WindowManager(); Engine.windowManager.init();
            Engine.items = new ItemsManager();
            Engine.crafting = new Crafting();
            // Inspect registered native drop callbacks without replacing their execution.
            window.dropOptions = new WeakMap();
            const nativeDrop = $.fn.pointerDroppable;
            $.fn.pointerDroppable = function (options) { this.each((i, el) => dropOptions.set(el, options)); return nativeDrop.call(this, options); };
            window.makeItem = (id, stat = 'teleport=1,10,10;amount=3') => {
                const events = {};
                const item = { id: String(id), hid: 'h' + id, cl: 32, loc: 'g', st: 20, stat,
                    $: Templates_default.get('item'), parseStats() { return Object.fromEntries(this.stat.split(';').map(s => { const [k, v] = s.split('='); return [k, v ?? null]; })); },
                    on: (name, fn) => (events[name] ??= []).push(fn),
                    unregisterCallback: (name, fn) => { events[name] = (events[name] || []).filter(f => f !== fn); },
                    trigger(name) { for (const fn of [...events[name] || []]) fn(); },
                    checkExpires: () => false, issetTimelimitStat: () => false, issetExpiresStat: () => false,
                    drawNotice() {}, updadeViewAfterUpdateItem(icon) { icon.find('.amount').remove(); icon.append($('<div>').addClass('amount').text(this.parseStats().amount)); },
                    setTip: icon => icon.tip('Teleport'),
                    updateDynamicTips() {}
                };
                item.$.data('item', item);
                item.$canvasIcon = item.$.find('.canvas-icon');
                const ctx = item.$canvasIcon[0].getContext('2d'); ctx.fillStyle = '#d43767'; ctx.fillRect(5, 5, 22, 22);
                item.$.addClass('inventory-item').appendTo('#bag').pointerDraggable({ helper: 'clone', appendTo: 'body', distance: 3 });
                item.updadeViewAfterUpdateItem(item.$);
                hItems[item.id] = item; Engine.items.test().items[item.id] = item;
                return item;
            };
            makeItem(1); makeItem(2);
            $('#ground').css({ width: 200, height: 200, position: 'absolute', top: 550, left: 650 }).pointerDroppable({ accept: '.item', drop: () => groundDrops++ });
            window.values = new Map();
            window.env = { win: window, get: (key, value) => structuredClone(values.get(key) ?? value), set: (key, value) => values.set(key, structuredClone(value)),
                icon: '', restart() { throw new Error('unexpected restart'); } };
        });
        await page.addStyleTag({ content: fs.readFileSync(path.join(sourceDir, 'style.KGLtTzyt.css'), 'utf8') });
        await page.addStyleTag({ path: path.resolve(__dirname, '../teleporty.css') });
        await page.addScriptTag({ path: path.resolve(__dirname, '../teleporty.core.js') });
        const checks = [];
        async function check(name, fn) { await fn(); checks.push(name); console.log('PASS ' + name); }
        await check('natywne okna i widget, 60 slotów oraz profil', async () => {
            const result = await page.evaluate(() => {
                window.app = new TeleportQueue.App(env).init(); app.togglePanel();
                return { windows: document.querySelectorAll('.tp-window').length, slots: document.querySelectorAll('.tp-slot').length,
                    sent, transparent: app.panel.$.hasClass('transparent'), width: app.panel.$.outerWidth() };
            });
            assert.equal(result.windows, 2); assert.equal(result.slots, 60); assert(result.transparent);
            assert.equal(result.width, 320); assert.deepEqual(result.sent[0], { hotWidgets: { tp_queue: [1, 'top-left'] } });
        });
        await check('oryginalny Crafting istnieje poza rzemiosłem; pusta kolejka ma poprawny komunikat', async () => {
            const before = await page.evaluate(() => {
                messages.length = 0;
                return { native: Engine.crafting instanceof Crafting, open: Engine.crafting.isOpen(), blocked: app.blocked(), before: requests.length };
            });
            assert(before.native && !before.open); assert.equal(before.blocked, '');
            await page.locator('.tp-controls .tp-button').first().click();
            const result = await page.evaluate(() => ({ messages, requests: requests.length }));
            assert.deepEqual(result.messages, ['Brak teleportów w kolejce.']); assert.equal(result.requests, before.before);
        });
        await check('duplikaty, blokada zastąpienia, zamiana i rejestracja widoków', async () => {
            const result = await page.evaluate(() => {
                app.assign(0, hItems['1']); app.assign(1, hItems['1']); const duplicate = app.p.slots[1] === null;
                app.p.config.replaceLock = true; app.assign(0, hItems['2']); const locked = app.p.slots[0].id === '1';
                app.assign(1, hItems['2']); app.swap(0, 1);
                return { duplicate, locked, refs: app.p.slots.slice(0, 2), icons: document.querySelectorAll('.tp-icon').length,
                    views: Object.values(Engine.items.getViews()).map(v => v.TP_QUEUE_VIEW?.length || 0) };
            });
            assert(result.duplicate && result.locked); assert.equal(result.refs[0].id, '2'); assert.equal(result.refs[1].id, '1');
            assert.equal(result.icons, 2); assert.deepEqual(result.views, [1, 1]);
            if (process.env.TP_SCREENSHOT) await page.screenshot({ path: process.env.TP_SCREENSHOT });
        });
        await check('oryginalny pasek: kółko, przeciąganie suwaka, siedem kolumn i natywne ramki', async () => {
            const initial = await page.evaluate(() => {
                const cell = app.cells[0][0], icon = app.views.get(0).icon[0];
                const c = cell.getBoundingClientRect(), i = icon.getBoundingClientRect();
                return { scrollable: app.scroll.hasClass('scrollable'), bars: app.scroll.find('.scrollbar-wrapper').length,
                    classes: cell.classList.contains('item-slot') && cell.classList.contains('interface-element-one-item-slot'),
                    width: c.width, height: c.height, offset: [i.left - c.left, i.top - c.top],
                    background: getComputedStyle(cell).backgroundImage, grid: getComputedStyle(app.grid[0]).gridTemplateColumns,
                    native: app.scroll.find('.scroll-pane')[0].scrollTop === 0 };
            });
            assert(initial.scrollable && initial.classes && initial.native); assert.equal(initial.bars, 1);
            assert.equal(initial.width, 36); assert.equal(initial.height, 36); assert.deepEqual(initial.offset, [2, 2]);
            assert(initial.background.includes('/img/gui/buttony.png')); assert.equal(initial.grid.split(' ').length, 7);
            await page.locator('.tp-scroll').hover(); await page.mouse.wheel(0, 200);
            await page.waitForFunction(() => app.scroll.find('.scroll-pane')[0].scrollTop > 0);
            const handle = await page.locator('.tp-scroll .handle').boundingBox();
            const track = await page.locator('.tp-scroll .track').boundingBox(); assert(handle && track);
            await page.mouse.move(handle.x + 2, handle.y + 8); await page.mouse.down();
            await page.mouse.move(handle.x + 2, track.y + track.height - 5, { steps: 12 }); await page.mouse.up();
            const end = await page.evaluate(() => {
                const pane = app.scroll.find('.scroll-pane')[0];
                return { top: pane.scrollTop, max: pane.scrollHeight - pane.clientHeight };
            });
            assert(end.top >= end.max - 2);
            await page.evaluate(() => app.scroll.trigger('scrollTop'));
        });
        await check('wszystkie osiem dróg użycia działa przy zamkniętym kontrolerze Crafting', async () => {
            await page.evaluate(() => { app.q.stop(); responseType = 'success'; });
            const start = await page.evaluate(() => requests.length);
            await page.locator('.tp-controls .tp-button').first().click();
            await page.locator('.tp-slot').nth(0).dblclick();
            await page.locator('.tp-slot').nth(0).click({ button: 'right' });
            await page.evaluate(() => lastMenu.find(row => row[0] === 'Użyj')[1]());
            await page.keyboard.press('F9');
            assert.equal(await page.evaluate(() => requests.length), start + 4);
            await page.evaluate(() => app.openConfig());
            await page.locator('.tp-checkbox label').filter({ hasText: 'Włącz tryb automatyczny' }).click();
            await page.evaluate(() => app.configWindow.hide());
            await page.locator('.tp-controls .tp-button').nth(1).click();
            await page.keyboard.press('F10');
            assert.equal(await page.evaluate(() => app.p.state), 'paused');
            await page.keyboard.press('F10');
            await page.evaluate(() => app.q.stop()); await page.keyboard.press('F10');
            assert.equal(await page.evaluate(() => requests.length), start + 7);
            await page.evaluate(() => { app.q.stop(); app.openConfig(); app.fields.interval.val(1); });
            await page.locator('.tp-config-actions .tp-button').filter({ hasText: 'Zapisz' }).click();
            await page.evaluate(() => app.configWindow.hide());
            const beforeInterval = await page.evaluate(() => requests.length);
            await page.locator('.tp-controls .tp-button').nth(1).click();
            await page.waitForFunction(n => requests.length >= n + 2, beforeInterval);
            const final = await page.evaluate(n => { app.q.stop(); return { count: requests.length - n, blocked: app.blocked(), state: app.p.state }; }, beforeInterval);
            assert.equal(final.count, 2); assert.equal(final.blocked, ''); assert.equal(final.state, 'off');
            await page.evaluate(() => { app.openConfig(); app.fields.interval.val(120); app.saveConfig(); app.configWindow.hide(); });
        });
        await check('autopauza dla rzeczywistego okna Crafting i wszystkich sześciu czynności', async () => {
            const result = await page.evaluate(async () => {
                app.q.stop(); const before = requests.length;
                const modules = ['salvage', 'enhancement', 'extraction', 'socket_enchantment', 'socket_extraction', 'socket_composition'];
                const checks = modules.map(name => { Engine.crafting[name] = {}; const blocked = Boolean(app.blocked()); delete Engine.crafting[name]; return blocked; });
                Engine.crafting.window.windowOpen(); await app.q.toggle();
                const paused = app.p.state === 'paused' && app.q.timer === null && requests.length === before;
                Engine.crafting.window.windowClose(); app.tick(); const noResume = app.p.state === 'paused';
                await app.q.toggle(); const resumed = requests.length === before + 1; app.q.stop();
                return { modules: checks.every(Boolean), paused, noResume, resumed, idle: app.blocked() === '' };
            });
            assert(Object.values(result).every(Boolean));
        });
        await check('audyt pozostałych stanów zachowuje walkę, śmierć, handel, dialog i blokady', async () => {
            const result = await page.evaluate(() => {
                const flags = ['dialogue', 'trade', 'shop', 'depo', 'mails', 'auctions', 'dead'];
                const flagsWork = flags.every(name => { const old = Engine[name]; Engine[name] = {}; const blocked = Boolean(app.blocked()); Engine[name] = old; return blocked; });
                const original = Engine.battle.isBattleShow; Engine.battle.isBattleShow = () => true;
                const battle = Boolean(app.blocked()); Engine.battle.isBattleShow = original;
                Engine.lock.add('captcha'); const lock = Boolean(app.blocked()); Engine.lock.remove('captcha');
                const old = Engine.interfaceItems.isInterfaceItemsDisable; Engine.interfaceItems.isInterfaceItemsDisable = () => true;
                const items = Boolean(app.blocked()); Engine.interfaceItems.isInterfaceItemsDisable = old;
                return { flagsWork, battle, lock, items, idle: app.blocked() === '' };
            });
            assert(Object.values(result).every(Boolean));
        });
        await check('aktualizacja amount oraz usunięcie i odtworzenie obiektu między torbami', async () => {
            const result = await page.evaluate(async () => {
                hItems['1'].stat = 'teleport=1;amount=2'; hItems['1'].trigger('afterUpdate');
                await new Promise(r => setTimeout(r, 10));
                const amount = app.cells[1].find('.amount').text();
                const old = hItems['1']; old.trigger('delete'); old.$.remove();
                Engine.items.deleteViewWithAllIcon('1'); delete hItems['1']; delete Engine.items.test().items['1'];
                makeItem(1); await new Promise(r => setTimeout(r, 10));
                const retained = app.p.slots[1]?.id === '1' && app.views.get(1).item === hItems['1'];
                hItems['1'].trigger('delete'); delete hItems['1']; delete Engine.items.test().items['1'];
                Engine.items.deleteViewWithAllIcon('1'); await new Promise(r => setTimeout(r, 10));
                return { amount, retained, removed: app.p.slots[1] === null };
            });
            assert.equal(result.amount, '2'); assert(result.retained && result.removed);
        });
        await check('potwierdzenie sukcesu, alert i ITEM_USED bez teleportacji', async () => {
            const result = await page.evaluate(async () => {
                app.p.config.replaceLock = false; app.assign(0, hItems['2']); app.q.stop(); responseType = 'success';
                await app.q.manual(); const success = app.p.next === 2;
                app.q.stop(); responseType = 'rejected'; await app.q.manual(); const rejected = app.p.next === 1;
                responseType = 'uncertain'; await app.q.manual(); return { success, rejected, uncertain: app.p.next === 1 };
            });
            assert(result.success && result.rejected && result.uncertain);
        });
        await check('KC bez celu uruchamia natywną akcję, pauzuje i zachowuje slot', async () => {
            const result = await page.evaluate(async () => {
                const kc = makeItem(3, 'custom_teleport'); app.assign(4, kc); app.p.next = 5;
                app.p.config.auto = true; responseType = 'uncertain'; await app.q.toggle();
                return { state: app.p.state, next: app.p.next, request: requests.at(-1) };
            });
            assert.deepEqual(result, { state: 'paused', next: 5, request: '3' });
        });
        await check('STOP podczas odpowiedzi i blokada równoległych żądań', async () => {
            const result = await page.evaluate(async () => {
                app.q.stop(); responseType = 'delayed'; const before = requests.length;
                const wait = app.q.manual(); app.q.stop(); await app.q.manual();
                responseType = 'success'; reply(); await wait;
                return { count: requests.length - before, next: app.p.next };
            });
            assert.deepEqual(result, { count: 1, next: 1 });
        });
        await check('skrót: repeat, input, jeden fizyczny klawisz oraz blokada przy pauzie', async () => {
            const result = await page.evaluate(async () => {
                responseType = 'rejected'; const before = requests.length;
                const down = () => document.dispatchEvent(new KeyboardEvent('keydown', { code: 'F9', bubbles: true }));
                const up = () => document.dispatchEvent(new KeyboardEvent('keyup', { code: 'F9', bubbles: true }));
                down(); down(); document.dispatchEvent(new KeyboardEvent('keydown', { code: 'F9', repeat: true, bubbles: true }));
                await Promise.resolve(); up();
                const input = document.createElement('input'); document.body.append(input);
                input.dispatchEvent(new KeyboardEvent('keydown', { code: 'F9', bubbles: true })); up(); input.remove();
                app.p.state = 'paused'; down(); up(); app.p.state = 'off';
                return requests.length - before;
            });
            assert.equal(result, 1);
        });
        await check('własna zmiana mapy zachowuje aktywność, walka wstrzymuje', async () => {
            const result = await page.evaluate(async () => {
                app.q.stop(); responseType = 'success'; await app.q.toggle();
                Engine.allInit = false; Engine.reload = true; Engine.lock.list.push('change_location'); app.tick();
                const travel = app.p.state === 'active';
                const before = requests.length; await app.q.attempt();
                const waiting = requests.length === before;
                Engine.allInit = true; Engine.reload = false; Engine.lock.list = []; app.tick();
                Engine.lock.list.push('battle'); app.tick();
                const paused = app.p.state === 'paused'; Engine.lock.list = []; app.q.stop();
                return { travel, waiting, paused };
            });
            assert(result.travel && result.waiting && result.paused);
        });
        await check('ukrycie panelu zachowuje automat; koło zębate otwiera konfigurację', async () => {
            const result = await page.evaluate(async () => {
                app.q.stop(); responseType = 'success'; await app.q.toggle();
                app.togglePanel(); const active = app.p.state === 'active' && app.q.timer !== null;
                app.panel.$.find('.manage-configuration-button').trigger('click');
                const config = app.configWindow.isShow(); app.q.stop(); app.togglePanel(); return { active, config };
            });
            assert(result.active && result.config);
        });
        await check('natywna przezroczystość, zwijanie, zapis pozycji i menu PPM', async () => {
            const result = await page.evaluate(() => {
                app.panel.$.find('.increase-opacity').trigger('click');
                app.panel.$.find('.collapse').trigger('click');
                const collapsed = app.panel.$.hasClass('window--collapsed') && app.summary.is(':visible');
                app.panel.$.find('.collapse').trigger('click');
                app.panel.setContentPos('50px', '40px'); app.panel.saveWindowPosition();
                app.cells[0].trigger('contextmenu');
                return { opacity: app.panel.$.attr('data-opacity-lvl'), collapsed,
                    position: StorageFuncWindow.getPositionWindow(app.panel._nameWindow), menu: lastMenu.map(row => row[0]) };
            });
            assert.equal(result.opacity, '4'); assert(result.collapsed);
            assert.deepEqual(result.position, { x: 50, y: 40 }); assert.deepEqual(result.menu, ['Użyj', 'Usuń']);
        });
        await check('rejestracja widgetu przetrwa reset definicji, usunięcie jest respektowane', async () => {
            const result = await page.evaluate(() => {
                Engine.widgetManager.initDefaultWidgetSet(); Engine.widgetManager.addWidgetButtons();
                const rebuilt = document.querySelectorAll('.tp-widget').length === 1;
                Engine.serverStorage.get().tp_queue = false; Engine.widgetManager.addWidgetButtons();
                return { rebuilt, removed: !Engine.widgetManager.getAttachWidgetByName('tp_queue'), sends: sent.length };
            });
            assert(result.rebuilt && result.removed); assert.equal(result.sends, 1);
        });
        await check('przeciągnięcie skrótu poza okno nie trafia do GroundItems', async () => {
            await page.evaluate(() => { app.panel.show(); app.fit(); });
            const slot = await page.locator('.tp-slot').nth(0).boundingBox();
            assert(slot);
            await page.mouse.move(slot.x + 18, slot.y + 18); await page.mouse.down();
            await page.waitForTimeout(120);
            await page.mouse.move(740, 650, { steps: 12 }); await page.mouse.up();
            const result = await page.evaluate(() => ({ removed: app.p.slots[0] === null, groundDrops, exists: Boolean(hItems['2']) }));
            assert(result.removed && result.exists); assert.equal(result.groundDrops, 0);
        });
        await check('przeciągnięcie z torby przypisuje teleport bez upuszczenia na mapę pod panelem', async () => {
            await page.evaluate(() => {
                app.panel.setContentPos('380px', '60px');
                $('#ground').css({ top: 0, left: 300, width: 600, height: 750 });
                hItems['2'].$.css({ position: 'absolute', top: 50, left: 40 });
                app.p.config.replaceLock = false;
            });
            const source = await page.locator('#bag .inventory-item').filter({ has: page.locator('.canvas-icon') }).first().boundingBox();
            const target = await page.locator('.tp-slot').nth(2).boundingBox();
            assert(source && target);
            await page.mouse.move(source.x + 16, source.y + 16); await page.mouse.down();
            await page.mouse.move(target.x + 16, target.y + 16, { steps: 15 }); await page.mouse.up();
            const result = await page.evaluate(() => ({ assigned: app.p.slots[2]?.id, groundDrops }));
            assert.equal(result.assigned, '2'); assert.equal(result.groundDrops, 0);
        });
        await check('mała rozdzielczość i zoom nie duplikują okien', async () => {
            await page.setViewportSize({ width: 430, height: 600 });
            const result = await page.evaluate(() => {
                Engine.zoomFactor = 1.2; app.fit(); app.rebuild();
                return { count: document.querySelectorAll('.tp-window').length, rect: app.panel.$[0].getBoundingClientRect().toJSON() };
            });
            assert.equal(result.count, 2); assert(result.rect.right <= 430 && result.rect.bottom <= 600);
        });
        await check('konfiguracja zapisuje dopiero po Zapisz, odrzuca konflikt i nie usuwa slotów', async () => {
            const result = await page.evaluate(() => {
                app.openConfig(); const old = app.p.config.interval;
                app.fields.interval.val(7); const unchanged = app.p.config.interval === old;
                app.fields.start.val(12); app.saveConfig();
                const changed = app.p.config.interval === 7 && app.p.config.start === 12 && app.p.next === 12;
                app.fillConfig(TeleportQueue.defaults()); const retained = app.p.slots.some(Boolean);
                app.draft.manualKey = { code: 'KeyQ', ctrl: true, alt: false, shift: true, meta: false };
                app.draft.autoKey = { ...app.draft.manualKey }; const count = messages.length; app.saveConfig();
                const conflict = messages.length === count + 1 && app.p.config.interval === 7;
                app.draft.autoKey = null; app.saveConfig();
                const defaults = app.p.config.interval === 120 && app.p.slots.some(Boolean);
                return { unchanged, changed, retained, conflict, defaults };
            });
            assert(Object.values(result).every(Boolean));
        });
        await page.setViewportSize({ width: 1000, height: 800 });
        await page.evaluate(() => { Engine.zoomFactor = 1; app.q.stop(); app.configWindow.hide(); app.panel.show(); app.fit(); app.panel.setContentPos('280px', '60px'); });
        await check('koło zębate podnosi konfigurację nad panel, natywne kontrolki są czytelne', async () => {
            await page.locator('.tp-slot').nth(0).click();
            await page.locator('.tp-panel .manage-configuration-button').click();
            const result = await page.evaluate(() => {
                const label = app.fields.replaceLock.next('label')[0];
                return { top: app.configWindow.checkWndOnPeak() && !app.panel.checkWndOnPeak(),
                    checkbox: app.fields.replaceLock.closest('.checkbox-custom.c-checkbox').length === 1,
                    labelFor: label.getAttribute('for') === app.fields.replaceLock.attr('id'),
                    numbers: app.fields.interval.closest('.ni-input').length === 1 && app.startInput.closest('.input-wrapper').length === 1,
                    picker: app.fields.background.closest('.c-color-picker').length === 1,
                    font: getComputedStyle(label).fontSize, color: getComputedStyle(label).color,
                    bodyBackground: getComputedStyle(app.panel.getContent()[0]).backgroundColor,
                    bodyBorder: getComputedStyle(app.panel.getContent()[0]).borderTopStyle };
            });
            assert(result.top && result.checkbox && result.labelFor && result.numbers && result.picker);
            assert.equal(result.font, '12px'); assert.equal(result.color, 'rgb(240, 230, 214)');
            assert.equal(result.bodyBackground, 'rgba(0, 0, 0, 0)'); assert.equal(result.bodyBorder, 'none');
            if (process.env.TP_SCREENSHOT) {
                await page.evaluate(() => { app.configWindow.setContentPos('620px', '40px'); app.configScroll.trigger('update'); });
                await page.screenshot({ path: process.env.TP_SCREENSHOT.replace(/\.png$/, '-forms.png') });
            }
        });
        await check('zapis blokady przez kliknięcia label i Zapisz oraz obie ścieżki upuszczania', async () => {
            await page.evaluate(() => {
                app.configWindow.hide(); app.remove(10); app.remove(11); makeItem(10); makeItem(11);
                window.assignCount = 0; const assign = app.assign.bind(app);
                app.assign = (...args) => { assignCount++; return assign(...args); };
                hItems['11'].$.css({ position: 'absolute', top: 30, left: 40 });
            });
            for (const lock of [true, false]) {
                await page.evaluate(() => app.openConfig());
                const label = page.locator('.tp-checkbox label').filter({ hasText: 'Blokuj zastąpienie slotu' });
                if ((await page.evaluate(() => app.fields.replaceLock.prop('checked'))) !== lock) await label.click();
                await page.locator('.tp-config-actions .tp-button').filter({ hasText: 'Zapisz' }).click();
                assert.equal(await page.evaluate(() => app.p.config.replaceLock), lock);
                assert.equal(await page.evaluate(() => values.get(app.key).config.replaceLock), lock);
                await page.evaluate(() => app.configWindow.hide());
                for (const captured of [false, true]) {
                    await page.evaluate(() => { app.remove(10); app.remove(11); app.assign(10, hItems['10']); assignCount = 0; app.scroll.trigger('scrollToElement', app.cells[10]); });
                    if (captured) {
                        const source = await page.evaluate(() => hItems['11'].$[0].getBoundingClientRect().toJSON());
                        const target = await page.locator('.tp-slot').nth(10).boundingBox(); assert(target);
                        await page.mouse.move(source.x + 16, source.y + 16); await page.mouse.down();
                        await page.mouse.move(target.x + 18, target.y + 18, { steps: 12 }); await page.mouse.up();
                    } else await page.evaluate(() => dropOptions.get(app.cells[10][0]).drop({}, { draggable: hItems['11'].$ }));
                    const result = await page.evaluate(() => ({ id: app.p.slots[10]?.id, count: assignCount, groundDrops }));
                    assert.equal(result.id, lock ? '10' : '11'); assert.equal(result.count, 1); assert.equal(result.groundDrops, 0);
                    await page.evaluate(() => {
                        app.remove(10); app.assign(10, hItems['10']); assignCount = 0;
                    });
                    if (captured) {
                        const source = await page.evaluate(() => hItems['11'].$[0].getBoundingClientRect().toJSON());
                        const target = await page.locator('.tp-slot').nth(11).boundingBox(); assert(target);
                        await page.mouse.move(source.x + 16, source.y + 16); await page.mouse.down();
                        await page.mouse.move(target.x + 18, target.y + 18, { steps: 12 }); await page.mouse.up();
                    } else await page.evaluate(() => dropOptions.get(app.cells[11][0]).drop({}, { draggable: hItems['11'].$ }));
                    assert.equal(await page.evaluate(() => app.p.slots[11]?.id), '11');
                    assert.equal(await page.evaluate(() => assignCount), 1);
                    // Internal physical drag uses the native plugin and always swaps, even with replacement locked.
                    const a = await page.locator('.tp-slot').nth(10).boundingBox();
                    const b = await page.locator('.tp-slot').nth(11).boundingBox(); assert(a && b);
                    await page.mouse.move(a.x + 18, a.y + 18); await page.mouse.down(); await page.waitForTimeout(120);
                    await page.mouse.move(b.x + 18, b.y + 18, { steps: 6 }); await page.mouse.up();
                    assert.deepEqual(await page.evaluate(() => app.p.slots.slice(10, 12).map(r => r?.id)), ['11', '10']);
                }
            }
            await page.evaluate(() => { app.scroll.trigger('scrollTop'); app.panel.setContentPos('280px', '60px'); });
        });
        await check('upuszczenie nad stopką nie przypisuje do niewidocznego slotu', async () => {
            const before = await page.evaluate(() => app.p.slots);
            const source = await page.evaluate(() => hItems['11'].$[0].getBoundingClientRect().toJSON());
            const footer = await page.locator('.tp-count').boundingBox(); assert(footer);
            await page.mouse.move(source.x + 16, source.y + 16); await page.mouse.down();
            await page.mouse.move(footer.x + 20, footer.y + 6, { steps: 12 }); await page.mouse.up();
            assert.deepEqual(await page.evaluate(() => app.p.slots), before);
            assert.equal(await page.evaluate(() => groundDrops), 0);
        });
        await check('checkbox auto natychmiast zatrzymuje aktywny i wstrzymany automat bez Zapisz', async () => {
            await page.evaluate(() => app.openConfig());
            await page.evaluate(() => app.fields.manualKey.trigger('click')); await page.keyboard.press('F9');
            await page.evaluate(() => app.fields.autoKey.trigger('click')); await page.keyboard.press('F10');
            await page.locator('.tp-config-actions .tp-button').filter({ hasText: 'Zapisz' }).click();
            for (const state of ['active', 'paused']) {
                const before = await page.evaluate(() => requests.length);
                const label = page.locator('.tp-checkbox label').filter({ hasText: 'Włącz tryb automatyczny' });
                if (!(await page.evaluate(() => app.fields.auto.prop('checked')))) await label.click();
                assert.equal(await page.evaluate(() => app.p.state), 'off');
                assert.equal(await page.evaluate(() => requests.length), before);
                await page.evaluate(() => { app.configWindow.hide(); app.p.next = 2; responseType = 'success'; });
                await page.keyboard.press('F10');
                if (state === 'paused') await page.keyboard.press('F10');
                await page.evaluate(() => app.openConfig());
                await label.click();
                const result = await page.evaluate(() => ({ checked: app.fields.auto.prop('checked'), auto: app.p.config.auto,
                    saved: values.get(app.key).config.auto, state: app.p.state, next: app.p.next, start: app.p.config.start,
                    timer: app.q.timer, disabled: app.autoButton.hasClass('disable'), manual: !app.manualButton.hasClass('disable') }));
                assert(!result.checked && !result.auto && !result.saved && result.disabled && result.manual);
                assert.equal(result.state, 'off'); assert.equal(result.timer, null); assert.equal(result.next, result.start);
                const n = await page.evaluate(() => requests.length);
                await page.evaluate(() => app.configWindow.hide()); await page.keyboard.press('F10');
                assert.equal(await page.evaluate(() => requests.length), n);
                await page.keyboard.press('F9'); assert.equal(await page.evaluate(() => requests.length), n + 1);
                await page.evaluate(() => app.openConfig());
            }
            await page.evaluate(() => app.configWindow.hide());
        });
        await check('niejednoznaczna odpowiedź zwalnia interfejs, oczekujące żądanie jest widoczne', async () => {
            const result = await page.evaluate(async () => {
                app.q.stop(); responseType = 'delayed'; const wait = app.q.manual();
                const pending = app.pendingText.text() === 'Czekam na odpowiedź gry…' && app.manualButton.hasClass('disable');
                responseType = 'uncertain'; reply(); await wait;
                const free = !app.q.flight && app.pendingText.text() === '' && !app.manualButton.hasClass('disable');
                const before = requests.length; responseType = 'success'; await app.q.manual();
                return { pending, free, retried: requests.length === before + 1 };
            });
            assert(Object.values(result).every(Boolean));
        });
        await check('natywny checkbox ma fokus i działa ze Space/Enter bez wywoływania kolejki', async () => {
            await page.evaluate(() => app.openConfig());
            const label = page.locator('.tp-checkbox label').filter({ hasText: 'Blokuj zastąpienie slotu' });
            const before = await page.evaluate(() => ({ checked: app.fields.replaceLock.prop('checked'), requests: requests.length, saved: app.p.config.replaceLock }));
            await label.focus(); await page.keyboard.press('Space');
            assert.equal(await page.evaluate(() => app.fields.replaceLock.prop('checked')), !before.checked);
            await page.keyboard.press('Enter');
            const after = await page.evaluate(() => ({ checked: app.fields.replaceLock.prop('checked'), requests: requests.length, saved: app.p.config.replaceLock }));
            assert.deepEqual(after, before);
            await page.evaluate(() => app.configWindow.hide());
        });
        await check('pełne belki nie są zastępowane, oczekiwanie kończy się po zwolnieniu miejsca', async () => {
            const result = await page.evaluate(() => {
                app.destroy(); Engine.hero.d.id = 43; delete Engine.serverStorage.get().tp_queue; fullBars = true;
                const before = sent.length; app = new TeleportQueue.App(env).init();
                const full = sent.length === before && !Engine.widgetManager.getAttachWidgetByName('tp_queue');
                fullBars = false; Engine.widgetManager.addWidgetButtons();
                return { full, placed: sent.length === before + 1, isolated: app.p.slots.every(s => s === null) };
            });
            assert(result.full && result.placed && result.isolated);
        });
        await check('destroy usuwa widoki, okna, callbacki i adaptery; ponowny profil zachowany', async () => {
            const result = await page.evaluate(() => {
                app.destroy(); Engine.hero.d.id = 42; app = new TeleportQueue.App(env).init();
                const restored = app.p.slots[4]?.id === '3'; app.destroy();
                return { restored, windows: document.querySelectorAll('.tp-window').length,
                    views: Object.values(Engine.items.getViews()).every(v => !v.TP_QUEUE_VIEW), registry: !Engine.itemsViewData.TP_QUEUE_VIEW };
            });
            assert(result.restored && result.views && result.registry); assert.equal(result.windows, 0);
        });
        await check('loader czeka na klienta i uruchamia tylko raz', async () => {
            await page.evaluate(() => { Engine.allInit = false; window.styles = 0; });
            const userscript = fs.readFileSync(path.resolve(__dirname, '../teleporty.user.js'), 'utf8');
            await page.addScriptTag({ content: `((unsafeWindow, GM_addStyle, GM_getResourceText, GM_getResourceURL, GM_getValue, GM_setValue) => { ${userscript} })(window, () => styles++, () => '', () => '', env.get, env.set);` });
            const waiting = await page.evaluate(() => document.querySelectorAll('.tp-window').length === 0);
            assert(waiting);
            await page.evaluate(() => { Engine.allInit = true; });
            await page.waitForFunction(() => document.querySelectorAll('.tp-window').length === 2);
            const result = await page.evaluate(() => {
                const first = window.__doiuaTeleportQueueV1;
                const second = TeleportQueue.boot({ ...env, css: () => styles++ });
                const duplicate = first === second && document.querySelectorAll('.tp-window').length === 2 && styles === 1;
                first.destroy(); return { duplicate, destroyed: !window.__doiuaTeleportQueueV1 && !document.querySelector('.tp-window') };
            });
            assert(result.duplicate && result.destroyed);
        });
        assert.deepEqual(errors, []);
        console.log(`Browser: ${checks.length} checks passed; native Window, ItemsManager, PointerDragDrop and API; controlled game/server fixture.`);
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
