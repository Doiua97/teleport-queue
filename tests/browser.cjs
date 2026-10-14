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
const equipment = moduleCode('HeroEquipment');
const useMethod = equipment.slice(equipment.indexOf('this.sendUseRequest = function'),
    equipment.indexOf('this.callCheckCanFinishExternalTutorial ='));
const templates = Object.fromEntries(['border-window', 'button', 'widget-button', 'item', 'input', 'ni-input-text',
    'checkbox-custom', 'c-color-picker', 'scrollbar-wrapper', 'crafting'].map(name => {
    const code = moduleCode('TemplatesData');
    const start = code.indexOf(`TEMPLATES["${name}"] = \``) + `TEMPLATES["${name}"] = \``.length;
    return [name, code.slice(start, code.indexOf('`;', start))];
}));

async function initNativeKeys(page) {
        await page.evaluate(() => {
            window.correctKey = key => key ? key.toUpperCase() : key; window.invertKeyInputOnSpecificMap = () => false;
            window.isPl = () => true;
            window.getAlreadyInitialised = () => true; window.ServerStorageData_default = { HOTKEYS: 'HOTKEYS' };
            const original = Engine.serverStorage.get; window.nativeBindings = {};
            Engine.serverStorage.get = (name, key) => name === 'HOTKEYS' ? nativeBindings[key] ?? null : original(name, key);
            Engine.serverStorage.getDataLoaded = () => true;
            Engine.settings = { getBlockInput: () => false }; Engine.tutorialManager = { checkBlockHotKeys: () => false };
            window.TutorialData_default = { ON_FINISH_REQUIRE: { OPEN_WINDOW: 'open' }, ON_FINISH_TYPE: { REQUIRE: 'require' } };
            Engine.tutorialManager.createTutorialDataTrigger = () => ({}); Engine.rajController = { parseObject() {} };
            Engine.map.onmouseup = () => {}; Engine.battle.getShow = () => false; window.gameActions = 0;
            Engine.widgetManager.widgetOnClick = () => gameActions++;
            $.fn.getTipData = function () { return this.attr('title') || ''; };
            Engine.interfaceItems.doInterfaceItemAcion = () => gameActions++; Engine.battle.endBattle = true;
        });
        for (const name of ['HeroDirectionData', 'HotKeysData', 'InputParser', 'HotKeys']) await page.addScriptTag({ content: moduleCode(name) });
        await page.evaluate(() => { Engine.hotKeys = new HotKeys(); Engine.hotKeys.init(); });
        await page.waitForTimeout(20);
}

async function resetCase(page) {
    await page.evaluate(() => {
        window.app?.destroy(); Engine.hero.d.id = window.testCharacter = (window.testCharacter || 200) + 1;
        Engine.catchChar = false; Engine.shop = false; Engine.lock.list = []; Engine.allInit = true;
        Engine.reload = false; Engine.map.drawable = Engine.map.unlock = true; Engine.map.lock.list = [];
        for (const name of Object.keys(nativeBindings)) delete nativeBindings[name]; Engine.hotKeys.rebuildHotKeys();
        app = new TeleportQueue.App(env).init(); app.panel.show(); app.panel.setWndOnPeak(); app.panel.setContentPos('100px', '40px');
        app.p.config.auto = true; responseType = 'uncertain'; gameActions = 0;
        for (let i = 1; i <= 6; i++) {
            hItems[String(2000 + i)]?.$.remove();
            app.assign(i - 1, makeItem(2000 + i, `teleport=${i},2,3,Lokacja ${i};amount=20`));
        }
        app.q.stop();
    });
}
async function setBind(page, combination, name = 'manualKey') {
    await page.evaluate(name => { app.openConfig(); app.openCapture(name); }, name);
    await page.keyboard.press(combination);
    await page.locator('.tp-bind .tp-button').filter({ hasText: 'Zapisz' }).click();
    assert.equal(await page.evaluate(() => Boolean(app.capture)), false, 'kombinacja musi zostać zapisana');
    await page.evaluate(() => { app.configWindow.hide(); app.panel.setWndOnPeak(); });
    await page.locator('.tp-slot').first().click();
}
async function dragHeader(page, kind, area, collapsed) {
    await page.evaluate(({ kind, collapsed }) => {
        const wnd = kind === 'panel' ? app.panel : kind === 'config' ? app.configWindow : app.bindWindow;
        if (wnd.$.hasClass('window--collapsed') !== collapsed) wnd.$.find('.collapse').trigger('click');
        wnd.show(); wnd.setWndOnPeak(); wnd.setContentPos('100px', '40px'); wnd.saveWindowPosition();
    }, { kind, collapsed });
    const before = await page.locator('.tp-' + kind).boundingBox();
    const selector = area === 'summary' ? '.tp-summary' : area === 'title' ? '.header-label .text' : '.draggable-window-element';
    const handle = await page.locator('.tp-' + kind + ' ' + selector).boundingBox(); assert(handle);
    const x = area === 'empty' ? before.x + 85 : handle.x + handle.width / 2;
    const y = handle.y + handle.height / 2;
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 10, y + 10);
    await page.mouse.move(x + 100, y + 75, { steps: 10 }); await page.mouse.up();
    const after = await page.locator('.tp-' + kind).boundingBox();
    assert(Math.abs(after.x - before.x - 90) < 3 && Math.abs(after.y - before.y - 65) < 3,
        `${kind}/${area}/${collapsed}: nagłówek musi przesunąć okno; ${JSON.stringify({ before, after })}`);
}
async function regressions(page, check) {
    await check('0.1.3: pełne kombinacje C/K/G, obce skróty, powtórzenia i profile', async () => {
        await resetCase(page);
        for (const letter of ['c', 'k', 'g']) {
            await setBind(page, 'Shift+' + letter);
            const before = await page.evaluate(() => ({ requests: requests.length, game: gameActions }));
            await page.keyboard.press('Shift+' + letter);
            assert.deepEqual(await page.evaluate(() => ({ requests: requests.length, game: gameActions })), { requests: before.requests + 1, game: before.game });
            await page.keyboard.press(letter);
            assert.deepEqual(await page.evaluate(() => ({ requests: requests.length, game: gameActions })), { requests: before.requests + 1, game: before.game + 1 });
        }
        for (const combination of ['Control+c', 'Alt+c', 'Meta+F8', 'Control+Alt+k', 'Control+Alt+g']) {
            await setBind(page, combination);
            const before = await page.evaluate(() => ({ requests: requests.length, game: gameActions }));
            await page.keyboard.press(combination);
            assert.deepEqual(await page.evaluate(() => ({ requests: requests.length, game: gameActions })), { requests: before.requests + 1, game: before.game });
        }
        await setBind(page, 'Shift+c');
        const n = await page.evaluate(() => requests.length);
        await page.keyboard.down('Shift'); await page.keyboard.down('c'); await page.keyboard.down('c'); await page.keyboard.down('c');
        await page.keyboard.up('c'); await page.keyboard.up('Shift'); assert.equal(await page.evaluate(() => requests.length), n + 1);
        assert.equal(await page.evaluate(() => app.swallowed.size), 0);
        await page.evaluate(() => { app.p.state = 'paused'; });
        const paused = await page.evaluate(() => ({ requests: requests.length, game: gameActions })); await page.keyboard.press('Shift+c');
        assert.deepEqual(await page.evaluate(() => ({ requests: requests.length, game: gameActions })), { requests: paused.requests, game: paused.game + 1 });
        await page.evaluate(() => { app.q.stop(); app.p.config.auto = false; app.p.config.autoKey = { ...app.p.config.manualKey, code: 'KeyK', key: 'K' }; });
        const disabled = await page.evaluate(() => ({ requests: requests.length, game: gameActions })); await page.keyboard.press('Shift+k');
        assert.deepEqual(await page.evaluate(() => ({ requests: requests.length, game: gameActions })), { requests: disabled.requests, game: disabled.game + 1 });
        for (const selector of ['input', 'textarea', 'magic_input', '[contenteditable]']) {
            await page.evaluate(selector => {
                const tag = selector === '[contenteditable]' ? 'div' : selector;
                const el = document.createElement(tag); el.id = 'edit-probe'; el.tabIndex = 0;
                if (selector === '[contenteditable]') el.contentEditable = 'true'; document.body.append(el); el.focus();
            }, selector);
            const before = await page.evaluate(() => requests.length); await page.keyboard.press('Shift+c');
            assert.equal(await page.evaluate(() => requests.length), before);
            await page.evaluate(() => document.querySelector('#edit-probe').remove());
        }
        await page.locator('.tp-slot').first().click();
        await page.evaluate(() => { Engine.catchChar = {}; }); const catchBefore = await page.evaluate(() => requests.length);
        await page.keyboard.press('Shift+c'); assert.equal(await page.evaluate(() => requests.length), catchBefore);
        await page.evaluate(() => { Engine.catchChar = false; Engine.shop = {}; });
        await page.keyboard.press('Shift+c'); assert.equal(await page.evaluate(() => requests.length), catchBefore);
        await page.evaluate(() => { Engine.shop = false; });
        await page.evaluate(() => {
            window.foreign = e => { if (e.code === 'KeyC' && e.shiftKey) e.preventDefault(); };
            window.addEventListener('keydown', foreign, true);
        });
        await page.keyboard.press('Shift+c'); assert.equal(await page.evaluate(() => requests.length), catchBefore);
        await page.evaluate(() => window.removeEventListener('keydown', foreign, true));
        await page.evaluate(() => { Engine.hotKeys.hotKeys['Shift+KeyC'] = 'foreign-addon'; app.openCapture('manualKey'); });
        await page.keyboard.press('Shift+c'); await page.evaluate(() => app.saveCapture());
        assert.equal(await page.evaluate(() => app.bindError.text()), 'Ten skrót jest już zajęty.');
        await page.keyboard.press('Escape');
        const occupied = await page.evaluate(() => requests.length); await page.keyboard.press('Shift+c');
        assert.equal(await page.evaluate(() => requests.length), occupied);
        assert.equal(await page.evaluate(() => app.p.config.manualKey.code), 'KeyC');
        await page.evaluate(() => { delete Engine.hotKeys.hotKeys['Shift+KeyC']; window.otherCount = 0;
            window.otherShortcut = e => { if (e.code === 'KeyZ' && e.altKey) { if (e.type === 'keydown' && !e.repeat) otherCount++; e.preventDefault(); e.stopImmediatePropagation(); } };
            for (const event of ['keydown', 'keypress', 'keyup']) window.addEventListener(event, otherShortcut, true);
        });
        const other = await page.evaluate(() => requests.length); await page.keyboard.press('Alt+z');
        assert.equal(await page.evaluate(() => otherCount), 1); assert.equal(await page.evaluate(() => requests.length), other);
        await page.evaluate(() => { for (const event of ['keydown', 'keypress', 'keyup']) window.removeEventListener(event, otherShortcut, true); });
        await page.evaluate(() => app.openCapture('autoKey')); await page.keyboard.press('Shift+c'); await page.evaluate(() => app.saveCapture());
        assert.equal(await page.evaluate(() => app.bindError.text()), 'Ten skrót jest już zajęty.'); await page.keyboard.press('Escape');
        await page.keyboard.press('c'); assert.equal(await page.evaluate(() => app.swallowed.size), 0);
        await page.evaluate(() => { window.originalCharacter = Engine.hero.d.id; app.save(); window.profileSnapshot = structuredClone(values.get(app.key));
            app.destroy(); Engine.hero.d.id++; app = new TeleportQueue.App(env).init(); app.panel.show(); app.panel.setWndOnPeak(); app.assign(0, hItems['2001']);
        });
        const switched = await page.evaluate(() => requests.length); await page.locator('.tp-slot').first().click(); await page.keyboard.press('F9');
        assert.equal(await page.evaluate(() => requests.length), switched + 1);
        await page.evaluate(() => { app.destroy(); Engine.hero.d.id = originalCharacter; app = new TeleportQueue.App(env).init(); app.panel.show(); app.panel.setWndOnPeak(); });
        assert.equal(await page.evaluate(() => app.p.config.manualKey.shift), true);
        assert.deepEqual(await page.evaluate(() => values.get(app.key)), await page.evaluate(() => profileSnapshot));
        const restored = await page.evaluate(() => requests.length); await page.locator('.tp-slot').first().click(); await page.keyboard.press('Shift+c');
        assert.equal(await page.evaluate(() => requests.length), restored + 1);
        await setBind(page, 'y'); await page.evaluate(() => { nativeBindings.iconparty = 'Y'; Engine.hotKeys.rebuildHotKeys(); });
        const late = await page.evaluate(() => requests.length); await page.keyboard.press('y'); assert.equal(await page.evaluate(() => requests.length), late);
        assert.equal(await page.evaluate(() => app.p.config.manualKey.code), 'KeyY');
        await page.evaluate(() => { delete nativeBindings.iconparty; Engine.hotKeys.rebuildHotKeys(); });
    });
    await check('0.1.3: odnowienie 90 i 125 minut na prawdziwym widoku ikony', async () => {
        await resetCase(page);
        for (const [seconds, expected] of [[15, '15s'], [59, '59s'], [60, '1m'], [90, '2m'], [1800, '30m'], [3600, '60m'], [5400, '90m'], [7500, '125m'], [10800, '180m']]) {
            const value = await page.evaluate(seconds => {
                hItems['2001'].stat = `teleport=1,2,3,Lokacja 1;amount=20;timelimit=180,${Date.now() / 1000 + seconds}`;
                app.overlays(); return { text: app.cells[0].find('.tp-cooldown').text(), available: app.available(hItems['2001']) };
            }, seconds); assert.equal(value.text, expected); assert.equal(value.available, false);
        }
    });
    await check('0.1.3: rzeczywiste rozmiary PANEL/CONFIG/BIND, scrollbar, pozycja i zapis', async () => {
        await resetCase(page);
        for (const [kind, expected] of [['config', [420, 560, 260]], ['panel', [220, 310, 140]], ['bind', [340, 380, 300]]]) {
            await page.evaluate(kind => {
                app.closeCapture(); app.configWindow.hide();
                if (kind === 'config') app.openConfig(); if (kind === 'bind') app.openCapture('manualKey');
                const wnd = app[kind === 'bind' ? 'bindWindow' : kind === 'config' ? 'configWindow' : 'panel'];
                wnd.show(); wnd.setWndOnPeak(); wnd.setContentPos('100px', '40px'); wnd.saveWindowPosition();
            }, kind);
            const dims = [], windows = [];
            for (let i = 0; i < 3; i++) {
                const rect = await page.locator('.tp-' + kind).evaluate(el => el.getBoundingClientRect().toJSON()); windows.push(kind === 'bind' ? rect.width : rect.height);
                dims.push(kind === 'bind' ? rect.width : (await page.locator(kind === 'config' ? '.tp-config-scroll' : '.tp-scroll').boundingBox()).height);
                assert.equal(rect.x, 100); assert.equal(rect.y, 40);
                await page.locator('.tp-' + kind + ' .toggle-size-button').click();
            }
            assert.deepEqual(dims, expected); assert.equal(new Set(windows).size, 3);
            if (kind !== 'bind') {
                const scroll = page.locator(kind === 'config' ? '.tp-config-scroll' : '.tp-scroll');
                assert.equal(await scroll.locator('.scrollbar-wrapper').count(), 1);
                await scroll.hover(); await page.mouse.wheel(0, 180);
                await page.waitForFunction(selector => document.querySelector(selector + ' .scroll-pane').scrollTop > 0, kind === 'config' ? '.tp-config-scroll' : '.tp-scroll');
                assert((await scroll.locator('.scroll-pane').evaluate(el => el.scrollTop)) > 0);
            }
            await page.locator('.tp-' + kind + ' .toggle-size-button').click();
            await page.evaluate(kind => { const wnd = kind === 'config' ? app.configWindow : kind === 'bind' ? app.bindWindow : app.panel; wnd.hide(); wnd.show(); }, kind);
            assert.equal((await page.locator('.tp-' + kind).boundingBox())[kind === 'bind' ? 'width' : 'height'], windows[1]);
        }
        await page.evaluate(() => { app.closeCapture(); app.configWindow.hide(); app.destroy(); app = new TeleportQueue.App(env).init(); app.panel.show(); app.openConfig(); app.openCapture('manualKey'); });
        assert.equal((await page.locator('.tp-bind').boundingBox()).width, 380);
        assert.equal((await page.locator('.tp-config-scroll').boundingBox()).height, 560);
        assert.equal((await page.locator('.tp-scroll').boundingBox()).height, 310);
        await page.setViewportSize({ width: 430, height: 600 });
        await page.evaluate(() => { Engine.zoomFactor = 1.2; app.fit(); });
        for (const kind of ['panel', 'config', 'bind']) {
            const rect = await page.locator('.tp-' + kind).evaluate(el => el.getBoundingClientRect().toJSON()); assert(rect.right <= 430); assert(rect.bottom <= 600);
        }
        await page.setViewportSize({ width: 1000, height: 800 }); await page.evaluate(() => { Engine.zoomFactor = 1; app.fit(); });
        await page.evaluate(() => { app.destroy(); Engine.hero.d.id++; app = new TeleportQueue.App(env).init(); app.panel.show(); app.openConfig(); app.openCapture('manualKey'); });
        assert.equal((await page.locator('.tp-bind').boundingBox()).width, 340);
        assert.equal((await page.locator('.tp-config-scroll').boundingBox()).height, 420);
    });
    await check('0.1.3: fizyczne przeciąganie nagłówków za tytuł, lokację i pustą belkę', async () => {
        await resetCase(page);
        await page.evaluate(() => { hItems['2001'].stat = 'teleport=1,2,3,Bardzo długa nazwa lokacji do testu wielokropka;amount=20'; app.render(); });
        await dragHeader(page, 'panel', 'summary', true);
        assert((await page.locator('.tp-panel .draggable-window-element').getAttribute('title')).includes('Bardzo długa'));
        for (const collapsed of [false, true]) {
            for (const area of ['empty', 'title']) await dragHeader(page, 'panel', area, collapsed);
            for (const kind of ['config', 'bind']) {
                await page.evaluate(kind => { if (kind === 'config') app.openConfig(); else app.openCapture('manualKey'); }, kind);
                await dragHeader(page, kind, 'title', collapsed); await dragHeader(page, kind, 'empty', collapsed);
            }
        }
        await page.evaluate(() => { app.closeCapture(); app.configWindow.hide(); });
        await page.locator('.tp-panel .collapse').click();
        assert.equal(await page.locator('.tp-panel').evaluate(el => el.classList.contains('window--collapsed')), false);
        const opacity = await page.locator('.tp-panel').getAttribute('data-opacity-lvl');
        await page.locator('.tp-panel .increase-opacity').click(); assert.notEqual(await page.locator('.tp-panel').getAttribute('data-opacity-lvl'), opacity);
        await page.locator('.tp-panel .manage-configuration-button').click(); assert.equal(await page.locator('.tp-config').isVisible(), true);
        await page.locator('.tp-config .close-button').click(); assert.equal(await page.locator('.tp-config').isVisible(), false);
    });
    await check('0.1.3: numer, podświetlenie i nazwa mają wspólny wybór kolejki', async () => {
        await resetCase(page); await page.evaluate(() => { app.remove(0); app.remove(2); app.toggleLock(4); });
        async function next(expected) {
            const value = await page.evaluate(() => ({ slots: app.cells.flatMap((c, i) => c.hasClass('tp-next') ? [i + 1] : []),
                detail: app.detail.text(), summary: app.summary.text(), actual: app.q.find()?.slot, cursor: app.p.next, count: requests.length }));
            assert.deepEqual(value.slots, expected ? [expected] : []); assert.equal(value.actual, expected || undefined);
            assert(value.detail.startsWith('Następny slot: ' + (expected || 'brak gotowych') + ' ·'));
            assert.equal(value.summary, 'Następna: ' + (expected ? 'Lokacja ' + expected : 'brak gotowych')); return value;
        }
        const first = await next(2); assert.equal(first.cursor, 1);
        await page.evaluate(() => app.q.manual()); await next(4);
        await page.evaluate(() => app.q.manual()); await next(6);
        await page.evaluate(() => app.q.manual()); await next(2);
        await page.evaluate(() => { app.toggleLock(1); }); await next(4);
        await page.evaluate(() => { app.toggleLock(1); }); await next(2);
        await page.evaluate(() => { hItems['2002'].stat = `teleport=2,2,3,Lokacja 2;amount=20;timelimit=180,${Date.now() / 1000 + 100}`; app.overlays(); }); await next(4);
        await page.evaluate(() => { hItems['2002'].stat = 'teleport=2,2,3,Lokacja 2;amount=20'; app.overlays(); }); await next(2);
        await page.evaluate(() => { app.swap(1, 3); });
        assert.equal(await page.evaluate(() => app.q.find().slot), 2); assert.equal(await page.evaluate(() => app.summary.text()), 'Następna: Lokacja 4');
        await page.evaluate(() => { app.swap(1, 3); app.q.setStart(4); }); await next(4);
        await page.evaluate(() => app.q.manual()); await next(6); await page.evaluate(() => app.q.manual()); await next(4);
        await page.evaluate(() => { hItems['2004'].trigger('delete'); delete hItems['2004']; delete Engine.items.test().items['2004']; app.sync(); }); await next(6);
        await page.evaluate(() => { app.toggleLock(5); }); const empty = await next(null);
        const before = await page.evaluate(() => requests.length); await page.evaluate(() => { app.overlays(); app.render(); app.togglePanel(); app.togglePanel(); });
        assert.equal(await page.evaluate(() => app.p.next), empty.cursor); assert.equal(await page.evaluate(() => requests.length), before);
        await page.evaluate(() => { app.save(); app.destroy(); app = new TeleportQueue.App(env).init(); app.panel.show(); app.panel.setWndOnPeak(); app.toggleLock(5); }); await next(6);
        await page.evaluate(() => { app.destroy(); });
    });
}

async function ctrlRegressions(page, check) {
    await check('0.1.4: dostępne Ctrl+A–Z i Ctrl+Shift+A–Z zapisują i wykonują jeden skrót', async () => {
        await resetCase(page);
        for (const shift of [false, true]) for (const letter of 'abcdefghijklmnopqrstuvwxyz') {
            if ((shift ? 'kntw' : 'ntw').includes(letter)) continue;
            const combination = 'Control+' + (shift ? 'Shift+' : '') + letter;
            await setBind(page, combination);
            assert.equal(await page.evaluate(() => app.p.config.manualKey.ctrl), true);
            const before = await page.evaluate(() => ({ requests: requests.length, game: gameActions }));
            await page.keyboard.press(combination);
            assert.deepEqual(await page.evaluate(() => ({ requests: requests.length, game: gameActions })),
                { requests: before.requests + 1, game: before.game }, combination);
            assert.equal(await page.evaluate(() => input.getMoveDirection()), null);
            assert.equal(await page.evaluate(() => app.swallowed.size), 0);
        }
        await setBind(page, 'Control+k');
        const n = await page.evaluate(() => ({ requests: requests.length, game: gameActions }));
        await page.keyboard.press('k');
        assert.deepEqual(await page.evaluate(() => ({ requests: requests.length, game: gameActions })), { requests: n.requests, game: n.game + 1 });
        await page.evaluate(() => app.openCapture('manualKey')); await page.keyboard.press('Control+w'); await page.evaluate(() => app.saveCapture());
        assert.equal(await page.evaluate(() => app.bindError.text()), 'Ten skrót jest już zajęty.');
        assert.equal(await page.evaluate(() => app.p.config.manualKey.code), 'KeyK'); await page.keyboard.press('Escape');
    });
    await check('0.1.4: Ctrl+B i Ctrl+Shift+B rozdzielają ręczny, automat i przyciski', async () => {
        await resetCase(page); await setBind(page, 'Control+b'); await setBind(page, 'Control+Shift+b', 'autoKey');
        assert.equal(await page.evaluate(() => app.fields.manualKey.find('.label').text()), 'Ctrl + B');
        assert.equal(await page.evaluate(() => app.fields.autoKey.find('.label').text()), 'Ctrl + Shift + B');
        const n = await page.evaluate(() => requests.length);
        await page.locator('.tp-controls .tp-button').first().click(); await page.keyboard.press('Control+b');
        assert.equal(await page.evaluate(() => requests.length), n + 2);
        await page.keyboard.press('Control+Shift+b'); assert.equal(await page.evaluate(() => app.p.state), 'active');
        assert.equal(await page.evaluate(() => requests.length), n + 3);
        await page.keyboard.press('Control+b'); assert.equal(await page.evaluate(() => requests.length), n + 3);
        await page.keyboard.press('Control+Shift+b'); assert.equal(await page.evaluate(() => app.p.state), 'paused');
        await page.keyboard.press('Control+Shift+b'); assert.equal(await page.evaluate(() => requests.length), n + 4);
        await page.locator('.tp-controls .tp-button').last().click(); assert.equal(await page.evaluate(() => app.p.state), 'off');
        await page.locator('.tp-controls .tp-button').nth(1).click(); assert.equal(await page.evaluate(() => requests.length), n + 5);
        await page.locator('.tp-controls .tp-button').last().click();
        await page.evaluate(() => app.openCapture('autoKey')); await page.keyboard.press('Control+b'); await page.evaluate(() => app.saveCapture());
        assert.equal(await page.evaluate(() => app.bindError.text()), 'Ten skrót jest już zajęty.');
        await page.locator('.tp-bind .tp-button').filter({ hasText: 'Anuluj' }).click();
        assert.equal(await page.evaluate(() => app.p.config.autoKey.shift), true);
        await page.evaluate(() => app.configWindow.hide());
        const before = await page.evaluate(() => requests.length);
        await page.keyboard.down('Control'); await page.keyboard.down('b'); await page.keyboard.down('b'); await page.keyboard.down('b');
        await page.keyboard.up('b'); await page.keyboard.up('Control'); assert.equal(await page.evaluate(() => requests.length), before + 1);
        assert.equal(await page.evaluate(() => app.swallowed.size), 0);
        await page.keyboard.down('Control'); await page.keyboard.down('Shift'); await page.keyboard.down('b'); await page.keyboard.down('b'); await page.keyboard.down('b');
        await page.keyboard.up('b'); await page.keyboard.up('Shift'); await page.keyboard.up('Control');
        assert.equal(await page.evaluate(() => requests.length), before + 2); assert.equal(await page.evaluate(() => app.p.state), 'active');
        await page.keyboard.press('Control+Shift+b'); assert.equal(await page.evaluate(() => app.p.state), 'paused');
        assert.equal(await page.evaluate(() => requests.length), before + 2); await page.evaluate(() => app.q.stop());
    });
    await check('0.1.4: Ctrl w edycji i na czacie nie wykonuje teleportu; Ctrl+LPM zachowane', async () => {
        await resetCase(page); await setBind(page, 'Control+b');
        for (const tag of ['input', 'textarea', 'magic_input', 'div']) {
            await page.evaluate(tag => { const el = document.createElement(tag); el.id = 'chat-input'; el.tabIndex = 0;
                if (tag === 'div') el.contentEditable = 'true'; document.body.append(el); el.focus(); }, tag);
            const n = await page.evaluate(() => requests.length); await page.keyboard.press('Control+b');
            assert.equal(await page.evaluate(() => requests.length), n); await page.evaluate(() => document.querySelector('#chat-input').remove());
        }
        const n = await page.evaluate(() => requests.length);
        await page.locator('.tp-slot').nth(3).click({ modifiers: ['Control'] }); assert.equal(await page.evaluate(() => app.p.locked[3]), true);
        await page.locator('.tp-slot').nth(3).click({ modifiers: ['Control'] }); assert.equal(await page.evaluate(() => app.p.locked[3]), false);
        assert.equal(await page.evaluate(() => requests.length), n);
        await page.evaluate(() => {
            document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyB', key: 'b', ctrlKey: true, bubbles: true, cancelable: false }));
            document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyB', key: 'b', ctrlKey: true, bubbles: true, cancelable: true }));
        }); assert.equal(await page.evaluate(() => requests.length), n);
    });
    await check('0.1.4: AltGr jest pisaniem, a jawny Ctrl+Alt zachowuje własną kombinację', async () => {
        await resetCase(page); await setBind(page, 'Control+Alt+a');
        const n = await page.evaluate(() => ({ requests: requests.length, game: gameActions }));
        const result = await page.evaluate(() => {
            window.sendAltGr = (target, explicit = true, key = 'ą') => {
                const base = { ctrlKey: true, altKey: true, bubbles: true, cancelable: true };
                target.dispatchEvent(new KeyboardEvent('keydown', { ...base, code: 'AltRight', key: 'AltGraph', modifierAltGraph: true }));
                let allowed = true;
                for (const type of ['keydown', 'keypress', 'keyup']) {
                    const event = new KeyboardEvent(type, { ...base, code: 'KeyA', key, modifierAltGraph: explicit });
                    target.dispatchEvent(event); allowed &&= !event.defaultPrevented;
                }
                target.dispatchEvent(new KeyboardEvent('keyup', { ...base, code: 'AltRight', key: 'AltGraph', altKey: false, ctrlKey: false }));
                return allowed;
            };
            const standard = sendAltGr(document); const fallback = sendAltGr(document, false);
            return { standard, fallback, released: app.altGraph === false && app.swallowed.size === 0 };
        }); assert(result.standard && result.fallback && result.released);
        assert.deepEqual(await page.evaluate(() => ({ requests: requests.length, game: gameActions })), n);
        await page.evaluate(() => { const input = document.createElement('input'); input.id = 'altgr-input'; document.body.append(input); input.focus(); });
        assert.equal(await page.evaluate(() => sendAltGr(document.querySelector('#altgr-input'))), true);
        await page.keyboard.insertText('ąęłóśźżćń'); assert.equal(await page.locator('#altgr-input').inputValue(), 'ąęłóśźżćń');
        await page.evaluate(() => document.querySelector('#altgr-input').remove());
        await page.evaluate(() => app.openCapture('manualKey')); await page.evaluate(() => sendAltGr(document, true, 'w'));
        assert.equal(await page.evaluate(() => app.bindPreview.text()), 'AltGr + A');
        assert.equal(await page.evaluate(() => app.bindError.text()), 'Naciśnij poprawną kombinację klawiszy.');
        await page.evaluate(() => app.saveCapture()); assert.equal(await page.evaluate(() => Boolean(app.capture)), true);
        assert.deepEqual(await page.evaluate(() => ({ requests: requests.length, game: gameActions })), n);
        await page.locator('.tp-bind .tp-button').filter({ hasText: 'Anuluj' }).click();
        assert.equal(await page.evaluate(() => app.p.config.manualKey.altGraph), undefined);
        await page.evaluate(() => app.configWindow.hide()); await page.locator('.tp-slot').first().click(); await page.keyboard.press('Control+Alt+a');
        assert.equal(await page.evaluate(() => requests.length), n.requests + 1);
        assert.equal(await page.evaluate(() => app.altGraph), false);
        await setBind(page, 'Control+b'); await setBind(page, 'Control+Alt+a', 'autoKey');
        const beforeAuto = await page.evaluate(() => requests.length); await page.evaluate(() => sendAltGr(document));
        assert.equal(await page.evaluate(() => app.p.state), 'off'); assert.equal(await page.evaluate(() => requests.length), beforeAuto);
        await page.keyboard.press('Control+Alt+a'); assert.equal(await page.evaluate(() => app.p.state), 'active');
        assert.equal(await page.evaluate(() => requests.length), beforeAuto + 1); await page.evaluate(() => sendAltGr(document));
        assert.equal(await page.evaluate(() => app.p.state), 'active'); assert.equal(await page.evaluate(() => requests.length), beforeAuto + 1);
        await page.keyboard.press('Control+Alt+a'); assert.equal(await page.evaluate(() => app.p.state), 'paused'); await page.evaluate(() => app.q.stop());
    });
    await check('0.1.4: natychmiastowy zapis, Anuluj, Wyczyść i ponowne logowanie z Ctrl', async () => {
        await resetCase(page); await setBind(page, 'Control+k'); await setBind(page, 'Control+Shift+b', 'autoKey');
        await page.evaluate(() => { app.openConfig(); app.fields.interval.val(89); app.saveConfig(); });
        assert.equal(await page.evaluate(() => app.p.config.manualKey.code), 'KeyK');
        await page.evaluate(() => app.openCapture('manualKey')); await page.keyboard.press('Control+b');
        await page.locator('.tp-bind .tp-button').filter({ hasText: 'Anuluj' }).click();
        assert.equal(await page.evaluate(() => app.p.config.manualKey.code), 'KeyK');
        await page.evaluate(() => app.openCapture('manualKey')); await page.locator('.tp-bind .tp-button').filter({ hasText: 'Wyczyść' }).click();
        assert.equal(await page.evaluate(() => app.p.config.manualKey.code), 'KeyK');
        await page.locator('.tp-bind .tp-button').filter({ hasText: 'Anuluj' }).click();
        const expected = await page.evaluate(() => structuredClone(app.p));
        await page.evaluate(() => { app.destroy(); app = new TeleportQueue.App(env).init(); app.panel.show(); app.panel.setWndOnPeak(); });
        assert.deepEqual(await page.evaluate(() => app.p), expected);
        const n = await page.evaluate(() => requests.length); await page.locator('.tp-slot').first().click(); await page.keyboard.press('Control+k');
        assert.equal(await page.evaluate(() => requests.length), n + 1);
        await page.keyboard.press('Control+Shift+b'); assert.equal(await page.evaluate(() => app.p.state), 'active');
        assert.equal(await page.evaluate(() => requests.length), n + 2); await page.evaluate(() => app.q.stop());
        await page.evaluate(() => app.openCapture('manualKey')); await page.locator('.tp-bind .tp-button').filter({ hasText: 'Wyczyść' }).click();
        await page.locator('.tp-bind .tp-button').filter({ hasText: 'Zapisz' }).click(); assert.equal(await page.evaluate(() => app.p.config.manualKey), null);
        await page.evaluate(() => app.destroy());
    });
}

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
            window.isInt = Number.isInteger;
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
                hotKeys: { hotKeys: {}, getSortedHotKeys: () => [], getKeyByClbName: () => '' },
                map: { lock: { list: [], check() { return this.list; } }, getDrawable() { return this.drawable; }, getUnlock() { return this.unlock; }, drawable: true, unlock: true },
                onClear() { this.allInit = false; this.reload = true; this.map.drawable = false; this.map.unlock = false; this.map.lock.list = ['game_init']; this.lock.add('mapLoadedAndAllInit'); },
                startGameThread() { this.allInit = true; this.reload = false; this.map.drawable = true; this.map.unlock = true; this.map.lock.list = []; this.lock.remove('mapLoadedAndAllInit'); },
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
                const item = { id: String(id), hid: 'h' + id, cl: 32, tpl: 'tpl-' + id, loc: 'g', st: 20, stat,
                    $: Templates_default.get('item'), parseStats() { return Object.fromEntries(this.stat.split(';').map(s => { const [k, v] = s.split('='); return [k, v ?? null]; })); },
                    on: (name, fn) => (events[name] ??= []).push(fn),
                    unregisterCallback: (name, fn) => { events[name] = (events[name] || []).filter(f => f !== fn); },
                    trigger(name) { for (const fn of [...events[name] || []]) fn(); },
                    checkExpires: () => false, issetTimelimitStat: () => false, issetExpiresStat: () => false,
                    getAnimationStat: () => false,
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
        await page.addScriptTag({ content: `(() => {
            const self = Engine.heroEquipment;
            self.callCheckCanFinishExternalTutorial = () => {};
            window._g = (query, callback) => {
                requests.push(query.match(/id=([^&]+)/)[1]);
                const respond = () => callback(responseType === 'rejected' ? { alert: 'Odmowa' } :
                    responseType === 'success' ? { t: 'reload' } : {});
                if (responseType === 'delayed') window.reply = respond; else respond();
            };
            (function () { ${useMethod} }).call(self);
        })();` });
        await page.addStyleTag({ content: fs.readFileSync(path.join(sourceDir, 'style.KGLtTzyt.css'), 'utf8') });
        await page.addStyleTag({ path: process.env.TP_CSS_FILE || path.resolve(__dirname, '../teleporty.css') });
        await page.addScriptTag({ path: process.env.TP_CORE_FILE || path.resolve(__dirname, '../teleporty.core.js') });
        const checks = [];
        async function check(name, fn) { await fn(); checks.push(name); console.log('PASS ' + name); }
        if (process.env.TP_PROBE) {
            await initNativeKeys(page);
            const failures = [];
            await (process.env.TP_PROBE === 'ctrl' ? ctrlRegressions : regressions)(page, async (name, fn) => {
                try { await fn(); console.log('PASS ' + name); } catch (error) { failures.push(name); console.log('FAIL ' + name + ': ' + error.message); }
            });
            if (failures.length) throw new Error('Regression probes failed: ' + failures.length);
            assert.deepEqual(errors, []); return;
        }
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
                app.p.config.replaceLock = true; app.assign(0, hItems['2']); const locked = app.p.slots[0].items[0].id === '1';
                app.assign(1, hItems['2']); app.swap(0, 1);
                return { duplicate, locked, refs: app.p.slots.slice(0, 2), icons: document.querySelectorAll('.tp-icon').length,
                    views: Object.values(Engine.items.getViews()).map(v => v.TP_QUEUE_VIEW?.length || 0) };
            });
            assert(result.duplicate && result.locked); assert.equal(result.refs[0].items[0].id, '2'); assert.equal(result.refs[1].items[0].id, '1');
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
            await page.locator('.tp-config .tp-config-actions .tp-button').filter({ hasText: 'Zapisz' }).click();
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
                const retained = app.p.slots[1]?.items[0].id === '1' && app.views.get(1).item === hItems['1'];
                hItems['1'].trigger('delete'); delete hItems['1']; delete Engine.items.test().items['1'];
                Engine.items.deleteViewWithAllIcon('1'); await new Promise(r => setTimeout(r, 10));
                return { amount, retained, removed: app.p.slots[1] === null };
            });
            assert.equal(result.amount, '2'); assert(result.retained && result.removed);
        });
        await check('potwierdzenie sukcesu, alert i ITEM_USED bez t=reload', async () => {
            const result = await page.evaluate(async () => {
                app.p.config.replaceLock = false; app.assign(0, hItems['2']); app.q.stop(); responseType = 'success';
                await app.q.manual(); const success = app.p.next === 2;
                app.q.stop(); responseType = 'rejected'; await app.q.manual(); const rejected = app.p.next === 1;
                responseType = 'uncertain'; await app.q.manual(); return { success, rejected, acceptedWithoutReload: app.p.next === 2 };
            });
            assert(result.success && result.rejected && result.acceptedWithoutReload);
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
                const down = () => document.dispatchEvent(new KeyboardEvent('keydown', { cancelable: true, code: 'F9', bubbles: true }));
                const up = () => document.dispatchEvent(new KeyboardEvent('keyup', { cancelable: true, code: 'F9', bubbles: true }));
                down(); down(); document.dispatchEvent(new KeyboardEvent('keydown', { cancelable: true, code: 'F9', repeat: true, bubbles: true }));
                await Promise.resolve(); up();
                const input = document.createElement('input'); document.body.append(input);
                input.dispatchEvent(new KeyboardEvent('keydown', { cancelable: true, code: 'F9', bubbles: true })); up(); input.remove();
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
            const result = await page.evaluate(() => ({ assigned: app.p.slots[2]?.items[0].id, groundDrops }));
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
                await page.locator('.tp-config .tp-config-actions .tp-button').filter({ hasText: 'Zapisz' }).click();
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
                    const result = await page.evaluate(() => ({ id: app.p.slots[10]?.items[0].id, count: assignCount, groundDrops }));
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
                    assert.equal(await page.evaluate(() => app.p.slots[11]?.items[0].id), '11');
                    assert.equal(await page.evaluate(() => assignCount), 1);
                    // Internal physical drag uses the native plugin and always swaps, even with replacement locked.
                    const a = await page.locator('.tp-slot').nth(10).boundingBox();
                    const b = await page.locator('.tp-slot').nth(11).boundingBox(); assert(a && b);
                    await page.mouse.move(a.x + 18, a.y + 18); await page.mouse.down(); await page.waitForTimeout(120);
                    await page.mouse.move(b.x + 18, b.y + 18, { steps: 6 }); await page.mouse.up();
                    assert.deepEqual(await page.evaluate(() => app.p.slots.slice(10, 12).map(r => r?.items[0].id)), ['11', '10']);
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
            await page.evaluate(() => app.fields.manualKey.trigger('click')); await page.keyboard.press('F9'); await page.evaluate(() => app.saveCapture());
            await page.evaluate(() => app.fields.autoKey.trigger('click')); await page.keyboard.press('F10'); await page.evaluate(() => app.saveCapture());
            await page.locator('.tp-config .tp-config-actions .tp-button').filter({ hasText: 'Zapisz' }).click();
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
                const restored = app.p.slots[4]?.items[0].id === '3'; app.destroy();
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
        await page.evaluate(() => {
            Engine.hero.d.id = 88; app = new TeleportQueue.App(env).init(); app.panel.show(); app.panel.setWndOnPeak(); app.panel.setContentPos('280px', '40px');
            app.assign(0, hItems['2']); app.p.config.auto = true; responseType = 'uncertain';
        });
        await check('0.1.2: zwykły ITEM_USED, binds i aktualizacja cooldownu', async () => {
            const result = await page.evaluate(async () => {
                messages.length = 0; hItems['2'].stat = 'teleport=1,2,3,Ithan;amount=5;binds=1';
                await app.q.manual(); const accepted = app.p.next === 2 && messages.length === 0;
                hItems['2'].stat += ';timelimit=180,' + (Math.ceil(Date.now() / 1000) + 100);
                hItems['2'].trigger('afterUpdate'); await new Promise(r => setTimeout(r, 10));
                const cooldown = app.cells[0].find('.tp-cooldown').text() !== '' && !app.available(hItems['2']);
                hItems['2'].stat = 'teleport=1,2,3,Ithan;amount=5'; app.sync(); app.q.stop();
                return { accepted, cooldown };
            }); assert(result.accepted && result.cooldown);
        });
        await check('0.1.2: onClear i startGameThread, blokady mapy i pełny interwał po gotowości', async () => {
            const result = await page.evaluate(async () => {
                await app.q.toggle(); const before = requests.length; Engine.lock.add('change_location'); Engine.onClear();
                app.tick(); const waiting = app.p.state === 'active' && app.q.timer === null && app.q.waiting;
                await app.q.attempt(); const noRequest = requests.length === before;
                Engine.startGameThread(); await Promise.resolve();
                const stillWaiting = app.q.timer === null && !app.loaded();
                Engine.lock.remove('change_location'); app.tick();
                const ready = app.p.state === 'active' && app.q.timer !== null && app.loaded();
                const warnings = messages.filter(s => s.includes('reakcję') || s.includes('potwierdzić')).length;
                app.q.stop(); return { waiting, noRequest, stillWaiting, ready, warnings };
            }); assert(result.waiting && result.noRequest && result.stillWaiting && result.ready); assert.equal(result.warnings, 0);
        });
        await check('0.1.2: HP=0, HERO_DEAD sec=0, rzeczywista śmierć i ręczne wznowienie', async () => {
            const result = await page.evaluate(async () => {
                Engine.hero.d.hp = 0; await app.q.toggle();
                const hp = app.p.state === 'active' && app.blocked() === '';
                API.callEvent(Engine.apiData.HERO_DEAD, { sec: 0 }); const zero = app.p.state === 'active';
                Engine.dead = true; Engine.lock.add('dead'); API.callEvent(Engine.apiData.HERO_DEAD, { sec: 10 });
                const death = app.p.state === 'paused' && Boolean(app.blocked());
                Engine.dead = false; Engine.lock.remove('dead'); API.callEvent(Engine.apiData.HERO_DEAD, { sec: 0 }); app.tick();
                const noResume = app.p.state === 'paused' && app.q.timer === null;
                app.q.stop(); Engine.hero.d.hp = 100; return { hp, zero, death, noResume };
            }); assert(Object.values(result).every(Boolean));
        });
        await check('0.1.2: Ctrl+LPM blokuje i odblokowuje pusty slot, nie używa przedmiotu', async () => {
            const before = await page.evaluate(() => requests.length);
            await page.locator('.tp-slot').nth(2).click({ modifiers: ['Control'] });
            assert.equal(await page.evaluate(() => app.p.locked[2]), true);
            assert.equal(await page.locator('.tp-import-row .tp-button').filter({ hasText: 'Odblokuj' }).isVisible(), true);
            await page.locator('.tp-slot').nth(2).click({ modifiers: ['Control'] });
            assert.equal(await page.evaluate(() => app.p.locked[2]), false);
            assert.equal(await page.evaluate(() => requests.length), before);
        });
        await check('0.1.2: blokada pozycji chroni użycie, pozostaje przy zamianie i zapisie', async () => {
            await page.locator('.tp-slot').nth(0).click({ modifiers: ['Control'] });
            const before = await page.evaluate(() => requests.length);
            await page.locator('.tp-slot').nth(0).dblclick(); await page.locator('.tp-slot').nth(0).click({ button: 'right' });
            const result = await page.evaluate(async () => {
                const menu = !lastMenu.some(row => row[0] === 'Użyj'); await app.q.manual(1);
                app.assign(0, hItems['3']); const retained = app.p.locked[0] && app.p.slots[0].items[0].id === '3';
                app.assign(1, hItems['2']); app.swap(0, 1); const stayed = app.p.locked[0] && !app.p.locked[1];
                const saved = values.get(app.key).locked[0];
                await app.q.manual(); const skipped = requests.at(-1) === '3';
                const refs = JSON.stringify(app.p.slots); app.unlockAll();
                return { menu, retained, stayed, saved, skipped, refs: refs === JSON.stringify(app.p.slots), locks: app.p.locked.some(Boolean) };
            }); assert(result.menu && result.retained && result.stayed && result.saved && result.skipped && result.refs); assert(!result.locks);
            assert.equal(await page.evaluate(() => requests.length), before + 1); await page.evaluate(() => app.q.stop());
        });
        await check('0.1.2: import od początku i zawinięcie, brak duplikatów i zmiany ręcznej kolejności', async () => {
            const result = await page.evaluate(() => {
                app.q.setStart(58); const old = structuredClone(app.p.slots);
                app.importItems(); const first = structuredClone(app.p.slots);
                const wrap = app.p.slots[57] && app.p.slots[58];
                app.importItems(); const same = JSON.stringify(first) === JSON.stringify(app.p.slots);
                const ids = app.p.slots.flatMap(g => g?.items.map(r => r.id) || []);
                return { wrap: Boolean(wrap), same, manual: JSON.stringify(old.slice(0, 2)) === JSON.stringify(app.p.slots.slice(0, 2)),
                    unique: ids.length === new Set(ids).size, suffix: app.q.find() ? app.q.find().slot >= 58 : true };
            }); assert(Object.values(result).every(Boolean));
        });
        await check('0.1.2: grupowanie stosów i różnych KC, suma oraz rzeczywisty ekwipunek', async () => {
            const result = await page.evaluate(() => {
                for (const [id, stat, tpl] of [[501, 'teleport=2,3,4,Tristam;amount=5', 'scroll'], [502, 'teleport=2,3,4,Tristam;amount=7', 'scroll'],
                    [503, 'custom_teleport=8,1,2,Ithan;amount=2', 'kc'], [504, 'custom_teleport=9,1,2,Nithal;amount=3', 'kc'],
                    [505, 'teleport=2,3,4,Tristam;timelimit=180', 'stone'], [506, 'teleport=2,3,4,Tristam;timelimit=180', 'stone']]) {
                    makeItem(id, stat).tpl = tpl;
                }
                const bag = JSON.stringify(Object.values(hItems).map(i => [i.id, i.hid, i.stat])); app.importItems();
                window.groupIndex = app.p.slots.findIndex(g => g?.items.some(r => r.id === '501'));
                const g = app.p.slots[groupIndex]; const slotOf = id => app.p.slots.findIndex(g => g?.items.some(r => r.id === id));
                return { members: g.items.length, amount: app.cells[groupIndex].find('.amount').text(),
                    kc: slotOf('503') !== slotOf('504'), stone: slotOf('505') !== slotOf('506'),
                    intact: bag === JSON.stringify(Object.values(hItems).map(i => [i.id, i.hid, i.stat])),
                    separate: hItems['501'] !== hItems['502'], icons: app.cells[groupIndex].find('.tp-icon').length };
            }); assert.equal(result.members, 2); assert.equal(result.amount, '12'); assert(result.kc && result.stone && result.intact && result.separate); assert.equal(result.icons, 1);
        });
        await check('0.1.2: amount grupy, pojedyncze użycie, usunięcie członka i ostatniego', async () => {
            const result = await page.evaluate(async () => {
                hItems['501'].stat = 'teleport=2,3,4,Tristam;amount=0'; hItems['501'].trigger('afterUpdate');
                await new Promise(r => setTimeout(r, 10)); const amount = app.cells[groupIndex].find('.amount').text();
                const before = requests.length; responseType = 'rejected'; await app.q.manual(groupIndex + 1);
                const single = requests.length === before + 1 && requests.at(-1) === '502';
                for (const id of ['501', '502']) {
                    hItems[id].trigger('delete'); hItems[id].$.remove(); delete hItems[id]; delete Engine.items.test().items[id];
                    app.sync(); if (id === '501') window.oneRemaining = app.p.slots[groupIndex].items.length === 1;
                }
                responseType = 'uncertain'; return { amount, single, one: oneRemaining, empty: app.p.slots[groupIndex] === null };
            }); assert.equal(result.amount, '7'); assert(result.single && result.one && result.empty);
        });
        await check('0.1.2: import nie scala dwóch ręcznych pozycji, pełne 60 nie nadpisuje', async () => {
            const result = await page.evaluate(() => {
                for (const id of [507, 508, 509]) makeItem(id, 'teleport=2,3,4,Tristam;amount=3').tpl = 'manual';
                app.assign(10, hItems['507']); app.assign(11, hItems['508']); app.importItems();
                const positions = app.p.slots[10].items.length === 2 && app.p.slots[11].items.length === 1;
                const saved = structuredClone(app.p);
                for (let i = 0; i < 60; i++) { app.remove(i); app.assign(i, makeItem(1000 + i, 'teleport=2,3,4,Tristam;timelimit=180')); }
                const snapshot = JSON.stringify(app.p.slots); messages.length = 0; app.importItems();
                const full = snapshot === JSON.stringify(app.p.slots) && messages.length === 1 && /Dodano teleporty: 0/.test(messages[0])
                    && !/braku miejsca: 0/.test(messages[0]);
                for (let i = 0; i < 60; i++) { const id = String(1000 + i); hItems[id].$.remove(); delete hItems[id]; delete Engine.items.test().items[id]; }
                Object.assign(app.p, saved); app.sync(); return { positions, full };
            }); assert(result.positions && result.full);
        });
        await check('0.1.2: status, następna lokacja, jasny nagłówek i jedna linia stopki', async () => {
            const result = await page.evaluate(() => {
                app.q.stop(); app.q.setStart(1); app.unlockAll(); app.p.next = 1; app.render();
                const manual = app.status.text() === 'Tryb: Ręczny';
                const next = app.summary.text() === 'Następna: Ithan';
                app.p.locked[0] = true; app.render(); const choice = app.summary.text() === 'Następna: wybór miejsca';
                app.p.locked.fill(true); app.render(); const none = app.summary.text() === 'Następna: brak gotowych'; app.unlockAll();
                app.panel.$.find('.collapse').trigger('click');
                const color = getComputedStyle(app.summary[0]).color;
                const ellipsis = getComputedStyle(app.summary[0]).textOverflow === 'ellipsis' && Boolean(app.panel.$.find('.draggable-window-element').attr('title'));
                app.panel.$.find('.collapse').trigger('click');
                const row = app.startInput.closest('.tp-start-row')[0];
                const children = [...row.children].map(e => e.getBoundingClientRect());
                const line = children.every(r => r.top < children[0].bottom && r.bottom > children[0].top) && row.scrollWidth <= row.clientWidth;
                return { manual, next, choice, none, color, ellipsis, line };
            }); assert(result.manual && result.next && result.choice && result.none && result.ellipsis && result.line); assert.equal(result.color, 'rgb(240, 230, 214)');
            if (process.env.TP_SCREENSHOT) {
                await page.evaluate(() => { app.toggleLock(0); app.toggleLock(3); app.selected = 59; app.render(); });
                await page.screenshot({ path: process.env.TP_SCREENSHOT.replace(/\.png$/, '-panel.png') });
                await page.evaluate(() => { app.panel.$.find('.collapse').trigger('click'); });
                await page.screenshot({ path: process.env.TP_SCREENSHOT.replace(/\.png$/, '-collapsed.png') });
                await page.evaluate(() => { app.panel.$.find('.collapse').trigger('click'); app.unlockAll(); });
            }
        });
        await check('0.1.2: trzy natywne rozmiary, scrollbar oraz zapis wariantu i pauzy', async () => {
            const result = await page.evaluate(async () => {
                const heights = [], totals = [], cols = [];
                for (let i = 0; i < 3; i++) {
                    heights.push(app.scroll.height()); totals.push(app.panel.$.height()); cols.push(getComputedStyle(app.grid[0]).gridTemplateColumns.split(' ').length);
                    app.panel.$.find('.toggle-size-button').trigger('click');
                }
                const bars = app.scroll.find('.scrollbar-wrapper').length; app.p.config.auto = true; await app.q.toggle(); app.save();
                const key = app.key; const size = app.panel.$.attr('size-opt'); app.destroy(); app = new TeleportQueue.App(env).init(); app.panel.show(); app.panel.setWndOnPeak();
                return { heights, totals, cols, bars, sizeSaved: app.panel.$.attr('size-opt') === size, paused: app.p.state === 'paused',
                    saved: values.get(key).state === 'paused', locks: app.p.locked.length === 60 };
            }); assert.deepEqual(result.heights, [220, 310, 140]); assert.equal(new Set(result.totals).size, 3); assert.deepEqual(result.cols, [7, 7, 7]);
            assert.equal(result.bars, 1); assert(result.sizeSaved && result.paused && result.saved && result.locks); await page.evaluate(() => app.q.stop());
        });
        await initNativeKeys(page);
        await check('0.1.2: osobne natywne okno, przechwytywanie nie uruchamia InputParser', async () => {
            await page.evaluate(() => { app.openConfig(); app.fields.manualKey[0].focus(); });
            await page.keyboard.press('Enter');
            await page.keyboard.press('Shift+q'); await page.keyboard.press('Control+w');
            const result = await page.evaluate(() => ({ native: app.bindWindow.$.hasClass('transparent'),
                title: app.bindWindow.$.find('.header-label').text().trim(), conflict: app.bindError.text(),
                game: gameActions, move: input.getMoveDirection(), windows: document.querySelectorAll('.tp-bind').length }));
            assert(result.native); assert.equal(result.title, 'Ustaw skrót klawiszowy'); assert(result.conflict.includes('Ten skrót jest już zajęty.'));
            assert.equal(result.game, 0); assert.equal(result.move, null); assert.equal(result.windows, 1);
            await page.evaluate(() => app.saveCapture()); assert.equal(await page.evaluate(() => Boolean(app.capture)), true);
            if (process.env.TP_SCREENSHOT) await page.screenshot({ path: process.env.TP_SCREENSHOT.replace(/\.png$/, '-bind.png') });
        });
        await check('0.1.2: modyfikator, konflikt dodatku, bezpośredni zapis i synchronizacja formularza', async () => {
            await page.keyboard.down('Control'); assert.equal(await page.evaluate(() => Boolean(app.capture)), true); await page.keyboard.up('Control');
            await page.keyboard.press('F10'); assert.equal(await page.evaluate(() => app.bindError.text()), 'Ten skrót jest już zajęty.');
            await page.evaluate(() => app.saveCapture()); assert.equal(await page.evaluate(() => Boolean(app.capture)), true);
            await page.keyboard.press('Shift+F8'); await page.evaluate(() => app.saveCapture());
            const result = await page.evaluate(() => {
                const saved = values.get(app.key).config.manualKey.code === 'F8' && app.p.config.manualKey.shift;
                app.fields.interval.val(19); app.saveConfig();
                return { saved, retained: app.p.config.manualKey.code === 'F8', closed: !app.bindWindow.isShow(), draft: app.draft.manualKey.code === 'F8' };
            }); assert(Object.values(result).every(Boolean));
        });
        await check('0.1.2: Anuluj i Escape, czyszczenie wymaga Zapisz, jedno okno', async () => {
            await page.evaluate(() => app.openCapture('manualKey')); await page.keyboard.press('F7'); await page.keyboard.press('Escape');
            assert.equal(await page.evaluate(() => app.p.config.manualKey.code), 'F8');
            await page.evaluate(() => app.openCapture('manualKey')); await page.locator('.tp-bind .tp-button').filter({ hasText: 'Wyczyść' }).click();
            assert.equal(await page.evaluate(() => app.p.config.manualKey.code), 'F8');
            await page.locator('.tp-bind .tp-button').filter({ hasText: 'Anuluj' }).click();
            await page.evaluate(() => { app.openCapture('manualKey'); app.openCapture('autoKey'); app.openCapture('manualKey'); });
            assert.equal(await page.locator('.tp-bind').count(), 1);
            await page.locator('.tp-bind .tp-button').filter({ hasText: 'Wyczyść' }).click(); await page.locator('.tp-bind .tp-button').filter({ hasText: 'Zapisz' }).click();
            assert.equal(await page.evaluate(() => app.p.config.manualKey), null);
        });
        await check('0.1.2: późniejsza zmiana natywnego skrótu blokuje akcję dodatku', async () => {
            await page.evaluate(() => { app.openCapture('manualKey'); }); await page.keyboard.press('y'); await page.evaluate(() => app.saveCapture());
            assert.equal(await page.evaluate(() => app.p.config.manualKey.code), 'KeyY');
            await page.evaluate(() => { app.configWindow.hide(); nativeBindings.hotAttackNearMob = 'Y'; Engine.hotKeys.rebuildHotKeys(); app.q.stop(); });
            const before = await page.evaluate(() => requests.length); await page.locator('.tp-slot').first().click(); await page.keyboard.press('y');
            assert.equal(await page.evaluate(() => requests.length), before); assert.equal(await page.evaluate(() => gameActions), 1);
            await page.evaluate(() => { app.openCapture('manualKey'); }); await page.keyboard.press('y'); await page.evaluate(() => app.saveCapture());
            assert.equal(await page.evaluate(() => Boolean(app.capture)), true);
            await page.keyboard.press('Escape'); assert.equal(await page.evaluate(() => gameActions), 1);
            await page.evaluate(() => { app.destroy(); });
        });
        await regressions(page, check);
        await ctrlRegressions(page, check);
        assert.deepEqual(errors, []);
        console.log(`Browser: ${checks.length} checks passed; native Window, ItemsManager, PointerDragDrop and API; controlled game/server fixture.`);
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
