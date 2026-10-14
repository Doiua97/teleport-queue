const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const sourceDir = process.env.MARGO_SOURCE_DIR || 'E:/Kod margonem';
const source = fs.readFileSync(path.join(sourceDir, 'main.min.DdoKxU4n.js'), 'utf8');
function moduleCode(name) {
    for (const m of source.matchAll(/\/\/#region ([^\n]+)\n([\s\S]*?)\/\/#endregion/g)) {
        if (m[1].split('/').pop() === `${name}.js`) return m[2];
    }
    throw new Error(`Brak modułu ${name}`);
}
const templates = Object.fromEntries(['border-window', 'button', 'widget-button', 'item'].map(name => {
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
                lock: { list: [], check(name) { return name ? this.list.includes(name) : Boolean(this.list.length); } },
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
            Engine.widgetsData = { pos: { TOP_LEFT: 'top-left' }, type: { RED: 'red' } };
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
        for (const name of ['PointerDragDrop', 'ApiData', 'Api', 'WindowsData', 'StorageFuncWindow', 'WindowManageOpacity', 'WindowManageSize', 'Window', 'WindowManager', 'ItemsManager']) {
            if (name === 'Api') await page.evaluate(() => { Engine.apiData = ApiData_default; });
            await page.addScriptTag({ content: moduleCode(name) });
        }
        await page.evaluate(() => {
            Engine.windowsData = o$4;
            Engine.windowManager = new WindowManager(); Engine.windowManager.init();
            Engine.items = new ItemsManager();
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
            assert.equal(result.width, 306); assert.deepEqual(result.sent[0], { hotWidgets: { tp_queue: [1, 'top-left'] } });
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
