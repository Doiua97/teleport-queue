(function (root) {
    'use strict';

    const SIZE = 60;
    const VIEW = 'TP_QUEUE_VIEW';
    const WIDGET = 'tp_queue';
    const defaults = () => ({
        start: 1, auto: false, interval: 120,
        manualKey: { code: 'F9', ctrl: false, alt: false, shift: false, meta: false },
        autoKey: { code: 'F10', ctrl: false, alt: false, shift: false, meta: false },
        replaceLock: false, menu: true, doubleClick: true,
        background: '#101216', border: '#777b80', accent: '#d9b457'
    });
    const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
    const keyValid = key => key === null || (key && typeof key.code === 'string' && /^[A-Za-z][A-Za-z0-9]*$/.test(key.code)
        && ['ctrl', 'alt', 'shift', 'meta'].every(name => typeof key[name] === 'boolean'));
    const sameKey = (a, b) => Boolean(a && b && ['code', 'ctrl', 'alt', 'shift', 'meta'].every(k => a[k] === b[k]));
    const keyOf = e => ({ code: e.code, ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey, meta: e.metaKey });
    const keyText = key => key ? [key.ctrl && 'Ctrl', key.alt && 'Alt', key.shift && 'Shift', key.meta && 'Meta',
        key.code.replace(/^Key/, '').replace(/^Digit/, '')].filter(Boolean).join(' + ') : 'Brak';
    const profileKey = e => `margo-tp:v1:${e.worldConfig.getWorldName()}:${e.hero.d.id}`;
    const stats = item => item.parseStats();
    const teleport = item => Boolean(item && Number(item.cl) === 32 &&
        ['teleport', 'custom_teleport'].some(k => Object.hasOwn(stats(item), k)));
    const identity = item => ({ id: String(item.id), hid: String(item.hid) });
    const matches = (item, ref) => Boolean(item && ref && String(item.id) === ref.id && String(item.hid) === ref.hid);
    const cooldown = (item, now = Date.now() / 1000) => {
        const value = stats(item).timelimit;
        if (value == null) return 0;
        const fields = String(value).split(',');
        if (fields.length < 2) return 0;
        const end = Number(fields[1]);
        return Number.isFinite(end) ? Math.max(0, Math.ceil(end - now)) : Infinity;
    };
    const needsTarget = item => {
        const s = stats(item);
        return Object.hasOwn(s, 'custom_teleport') && !s.custom_teleport;
    };
    const readyItem = item => teleport(item) && cooldown(item) === 0 && !item.checkExpires()
        && (!Object.hasOwn(stats(item), 'amount') || Number(stats(item).amount) > 0)
        && !item.$.hasClass('disable-item-mark');
    const advance = (slot, start) => slot < start || slot >= SIZE ? start : slot + 1;
    function load(value) {
        if (value != null && value.schema !== 1) throw new Error('Nieobsługiwana wersja zapisu. Twoje dane pozostają zachowane.');
        const config = defaults();
        const input = value?.config ?? {};
        for (const k of ['auto', 'replaceLock', 'menu', 'doubleClick']) if (typeof input[k] === 'boolean') config[k] = input[k];
        for (const k of ['background', 'border', 'accent']) if (/^#[0-9a-f]{6}$/i.test(input[k])) config[k] = input[k];
        if (integer(input.start, 1, SIZE)) config.start = input.start;
        if (integer(input.interval, 1, 2147483)) config.interval = input.interval;
        for (const k of ['manualKey', 'autoKey']) if (Object.hasOwn(input, k) && keyValid(input[k])) config[k] = input[k];
        if (sameKey(config.manualKey, config.autoKey)) config.autoKey = null;
        const seen = new Set();
        const slots = Array.from({ length: SIZE }, (_, i) => {
            const ref = value?.slots?.[i];
            if (!ref || !['id', 'hid'].every(k => ['number', 'string'].includes(typeof ref[k])
                && String(ref[k]).length && !['undefined', 'null'].includes(String(ref[k])))) return null;
            const id = String(ref.id);
            if (seen.has(id)) return null;
            seen.add(id);
            return { id, hid: String(ref.hid) };
        });
        return { schema: 1, config, slots,
            next: integer(value?.next, config.start, SIZE) ? value.next : config.start,
            last: integer(value?.last, 1, SIZE) ? value.last : null,
            state: config.auto && ['active', 'paused'].includes(value?.state) ? 'paused' : 'off',
            widgetPlaced: value?.widgetPlaced === true };
    }

    class Queue {
        constructor(profile, adapter, clock = globalThis) {
            this.p = profile;
            this.a = adapter;
            this.clock = clock;
            this.timer = null;
            this.flight = null;
            this.epoch = 0;
            this.alive = true;
        }
        change() { this.a.save(this.p); this.a.render(); }
        clear() { if (this.timer !== null) this.clock.clearTimeout(this.timer); this.timer = null; }
        pause(reason) {
            if (this.p.state === 'off') return;
            this.clear();
            this.p.state = 'paused';
            this.change();
            if (reason) this.a.message(reason);
        }
        stop() {
            this.clear();
            this.epoch++;
            this.p.state = 'off';
            this.p.next = this.p.config.start;
            this.change();
        }
        setStart(start) {
            if (!integer(start, 1, SIZE)) return false;
            this.pause();
            this.epoch++;
            this.p.config.start = start;
            this.p.next = start;
            this.change();
            return true;
        }
        toggle() {
            if (this.p.state === 'active') return this.pause();
            if (!this.p.config.auto || this.flight || !this.a.context()) return;
            this.p.state = 'active';
            this.change();
            return this.attempt();
        }
        async manual(slot) {
            if (this.p.state !== 'off') return;
            return this.attempt(slot);
        }
        async attempt(explicit) {
            if (!this.alive || this.flight || !this.a.context()) return;
            this.clear();
            const blocked = this.a.blocked();
            if (blocked) {
                if (this.p.state === 'active') this.pause(blocked);
                else this.a.message(blocked);
                return;
            }
            if (this.a.loaded && !this.a.loaded()) { this.schedule(); return; }
            let candidate = null;
            let removed = false;
            let slot = explicit ?? this.p.next;
            const limit = explicit ? 1 : SIZE - this.p.config.start + 1;
            for (let i = 0; i < limit; i++) {
                const ref = this.p.slots[slot - 1];
                if (ref) {
                    const item = this.a.item(ref);
                    if (!item) { this.p.slots[slot - 1] = null; removed = true; }
                    else if (this.a.ready(item)) { candidate = { item, slot }; break; }
                }
                slot = advance(slot, this.p.config.start);
            }
            if (removed) this.change();
            if (!candidate) {
                this.a.message(this.p.slots.some(Boolean) ? 'Brak gotowego teleportu.' : 'Brak teleportów w kolejce.');
                this.schedule();
                return;
            }
            const { item } = candidate;
            if (needsTarget(item)) {
                this.p.next = candidate.slot;
                this.change();
            }
            const epoch = this.epoch;
            const flight = this.a.use(item);
            this.flight = flight;
            this.a.render();
            const result = await flight.result;
            if (!this.alive || epoch !== this.epoch || !this.a.context()) {
                if (result !== 'timeout') this.flight = null;
                return;
            }
            if (result !== 'timeout') this.flight = null;
            if (result === 'success') {
                this.p.last = candidate.slot;
                this.p.next = advance(candidate.slot, this.p.config.start);
                this.change();
            } else if (result === 'choice') {
                this.p.next = candidate.slot;
                this.pause();
                this.change();
            } else {
                const text = result === 'rejected' ? 'Teleport nie został użyty.' :
                    'Nie udało się potwierdzić teleportacji. Sprawdź grę przed kolejną próbą.';
                if (this.p.state === 'active') this.pause(text);
                else this.a.message(text);
                this.change();
            }
            this.schedule();
        }
        schedule() {
            if (!this.alive || this.p.state !== 'active' || this.flight) return;
            this.timer = this.clock.setTimeout(() => { this.timer = null; void this.attempt(); }, this.p.config.interval * 1000);
        }
        release(flight) {
            if (this.flight === flight) { this.flight = null; this.a.render(); }
        }
        destroy() {
            this.alive = false;
            this.epoch++;
            this.clear();
            this.flight?.cancel();
        }
    }

    function wrap(object, key, around, cleanup) {
        const original = object[key];
        const replacement = function (...args) { return around(original, this, args); };
        object[key] = replacement;
        cleanup.push(() => { if (object[key] === replacement) object[key] = original; });
    }

    function ready(win) {
        const e = win.Engine;
        return Boolean(e?.allInit && e.interface?.getAlreadyInitialised?.() && e.interface.get$alertsLayer()?.length
            && e.widgetManager?.getWidgetLoaded?.() && e.hero?.d?.id && e.worldConfig?.getWorldName?.()
            && e.items?.getItemById && e.heroEquipment?.getHItems && e.heroEquipment.sendUseRequest
            && e.items.getFetchPackageController && !Object.keys(e.items.getFetchPackageController()).length
            && win.API?.addCallbackToEvent && win.API.Templates?.get && win.jQuery?.fn?.pointerDraggable
            && win.jQuery.fn.pointerDroppable);
    }

    class App {
        constructor(env) {
            this.env = env;
            this.win = env.win;
            this.e = this.win.Engine;
            this.$ = this.win.jQuery;
            this.api = this.win.API;
            this.key = profileKey(this.e);
            this.p = load(env.get(this.key, null));
            this.clean = [];
            this.windows = [];
            this.views = new Map();
            this.items = new Map();
            this.held = new Set();
            this.capture = null;
            this.syncTimer = null;
            this.operation = null;
            this.ownTravel = 0;
            this.widgetSaving = false;
            this.dead = false;
            this.q = new Queue(this.p, {
                context: () => this.context(), blocked: () => this.blocked(), item: ref => this.item(ref),
                ready: item => this.available(item), use: item => this.use(item),
                loaded: () => this.e.allInit && !this.e.reload,
                save: () => this.save(), render: () => this.render(), message: text => this.message(text)
            }, this.win);
        }
        context() { return !this.dead && this.win.Engine === this.e && profileKey(this.e) === this.key; }
        save() {
            try { this.env.set(this.key, structuredClone(this.p)); }
            catch { this.q?.clear(); this.p.state = 'paused'; this.message('Nie udało się zapisać ustawień. Sprawdź pamięć dodatku.'); }
        }
        message(text) { this.win.message(text, true); }
        event(name, callback) {
            const event = this.e.apiData[name];
            if (!event) return;
            this.api.addCallbackToEvent(event, callback);
            this.clean.push(() => this.api.removeCallbackFromEvent(event, callback));
        }
        listen(target, name, fn, options) {
            target.addEventListener(name, fn, options);
            this.clean.push(() => target.removeEventListener(name, fn, options));
        }
        item(ref) {
            const item = this.e.items.getItemById(ref.id);
            return matches(item, ref) && this.e.heroEquipment.getHItems()[ref.id] === item && teleport(item) ? item : null;
        }
        available(item) {
            const manager = this.e.disableItemsManager;
            return readyItem(item) && !(manager && manager.checkRequires(item, manager.activeDisableKinds));
        }
        blocked() {
            const e = this.e;
            if (e.hero.d.hp <= 0 || e.dead || e.lock.check('dead')) return 'Postać nie może teraz użyć teleportu.';
            if (e.battle?.isBattleShow() || e.dialogue || e.trade || e.shop || e.depo || e.mails || e.auctions || e.crafting
                || e.interfaceItems?.isInterfaceItemsDisable?.()) return 'Dokończ obecną czynność i wznów teleporty.';
            if (e.lock.check() && !(this.ownTravel && e.lock.list.every(name => name === 'change_location')))
                return 'Gra czeka na Twoją reakcję. Wznów teleporty, gdy będzie można grać dalej.';
            if ((!e.allInit || e.reload) && !this.ownTravel) return 'Poczekaj na załadowanie gry.';
            return '';
        }
        init() {
            this.e.itemsViewData[VIEW] = VIEW;
            this.clean.push(() => { delete this.e.itemsViewData[VIEW]; });
            this.build();
            this.bind();
            this.widget();
            this.sync();
            this.event('ITEM_USED', item => this.accept(item));
            this.event('AFTER_INTERFACE_START', () => this.rebuild());
            for (const event of ['HERO_DEAD', 'OPEN_BATTLE_WINDOW', 'NEW_ASK']) this.event(event, () => {
                this.q.pause('Dokończ obecną czynność i wznów teleporty.');
            });
            // API has no removable batch-update callback; fetch and Item events are removable.
            this.e.items.fetch({ loc: 'g', k: 'TP_QUEUE_FETCH' }, () => this.deferSync());
            this.clean.push(() => this.e.items.removeCallback({ loc: 'g', k: 'TP_QUEUE_FETCH' }));
            wrap(this.e.interface, 'checkTeleport', (original, receiver, args) => {
                const op = this.operation;
                if (op?.response && args[0]?.t === 'reload') op.reload = true;
                return original.apply(receiver, args);
            }, this.clean);
            const tick = this.win.setInterval(() => this.tick(), 1000);
            this.clean.push(() => this.win.clearInterval(tick));
            this.save();
            this.render();
            return this;
        }
        use(item) {
            let finish;
            const op = { item: identity(item), response: false, reload: false, accepted: false,
                choice: needsTarget(item), done: false, result: new Promise(resolve => { finish = resolve; }) };
            op.finish = result => {
                if (op.done) return;
                op.done = true;
                this.win.clearTimeout(op.timer);
                finish(result);
            };
            op.cancel = () => op.finish('cancelled');
            this.operation = op;
            op.timer = this.win.setTimeout(() => op.finish('timeout'), 15000);
            try {
                // A binds confirmation can send independently, so leave it to the player's inventory.
                if (Object.hasOwn(stats(item), 'binds')) {
                    this.message('Najpierw potwierdź przypisanie tego przedmiotu w torbie.');
                    this.operation = null;
                    op.finish('rejected');
                    return op;
                }
                if (this.e.heroEquipment.blockBadTutorialItem(item) || this.e.heroEquipment.checkBlessEquipped(item)) {
                    this.operation = null;
                    op.finish('rejected');
                    return op;
                }
                this.e.heroEquipment.sendUseRequest(item, () => {
                    op.response = true;
                    // sendUseRequest checks alert, checkTeleport and ITEM_USED synchronously after this callback.
                    queueMicrotask(() => {
                        op.response = false;
                        if (this.operation === op) this.operation = null;
                        const choice = op.choice || (this.e.tpScroll?.itemId != null
                            && String(this.e.tpScroll.itemId) === op.item.id && this.e.tpScroll.wnd?.isShow());
                        if (!op.done && op.accepted && op.reload && !choice) this.ownTravel = Date.now();
                        op.finish(op.accepted ? (choice ? 'choice' : op.reload ? 'success' : 'uncertain') : 'rejected');
                        if (op.done) this.q.release(op);
                    });
                });
            } catch {
                this.operation = null;
                op.finish('uncertain');
            }
            return op;
        }
        accept(item) {
            const op = this.operation;
            if (op?.response && matches(item, op.item)) op.accepted = true;
        }
        deferSync() {
            if (this.dead || this.syncTimer !== null) return;
            this.syncTimer = this.win.setTimeout(() => { this.syncTimer = null; this.sync(); }, 0);
        }
        sync() {
            if (!this.context() || !this.e.allInit || Object.keys(this.e.items.getFetchPackageController()).length) return;
            let changed = false;
            const live = new Set();
            for (const item of Object.values(this.e.heroEquipment.getHItems())) {
                if (!teleport(item)) continue;
                live.add(item);
                if (this.items.has(item)) continue;
                const update = () => this.deferSync();
                const remove = () => this.deferSync();
                item.on('afterUpdate', update);
                item.on('delete', remove);
                this.items.set(item, () => {
                    item.unregisterCallback('afterUpdate', update);
                    item.unregisterCallback('delete', remove);
                });
            }
            for (const [item, off] of this.items) if (!live.has(item)) { off(); this.items.delete(item); }
            this.p.slots.forEach((ref, i) => {
                if (ref && !this.item(ref)) { this.p.slots[i] = null; changed = true; }
                this.renderSlot(i);
            });
            if (changed) this.save();
            this.render();
        }
        assign(index, item) {
            if (!this.context() || !teleport(item) || !this.item(identity(item))) return;
            if (this.p.config.replaceLock && this.p.slots[index]) return;
            if (this.p.slots.some((ref, i) => i !== index && ref?.id === String(item.id))) {
                this.message('Ten teleport jest już przypisany do slotu.');
                return;
            }
            this.p.slots[index] = identity(item);
            this.changedSlots(index);
        }
        swap(a, b) {
            if (!this.context() || a === b) return;
            [this.p.slots[a], this.p.slots[b]] = [this.p.slots[b], this.p.slots[a]];
            this.changedSlots(a, b);
        }
        remove(index) {
            if (!this.context()) return;
            this.p.slots[index] = null;
            this.changedSlots(index);
        }
        changedSlots(...indices) {
            for (const i of indices) this.clearSlot(i);
            for (const i of indices) this.renderSlot(i, true);
            this.save();
            this.render();
        }
        button(text, fn, color = 'green') {
            const b = this.api.Templates.get('button').addClass(`small ${color} tp-button`)
                .attr({ role: 'button', tabindex: 0 });
            b.find('.label').text(text);
            const run = e => { if (!b.hasClass('disable')) { e.preventDefault(); fn(); } };
            b.on('click.tp', run).on('keydown.tp', e => { if (['Enter', 'Space'].includes(e.code)) run(e); });
            return b;
        }
        window(kind, title, content, width) {
            const name = `TP_${kind}_${encodeURIComponent(this.e.worldConfig.getWorldName())}_${this.e.hero.d.id}`;
            this.e.windowsData.name[name] = name;
            const wnd = this.e.windowManager.add({
                nameWindow: name, title, content, type: this.e.windowsData.type.TRANSPARENT,
                addClass: `tp-window tp-${kind.toLowerCase()}`,
                manageOpacity: 3, manageShow: false,
                managePosition: { position: this.e.windowsData.position.CENTER_OR_SAVE_IN_STORAGE },
                manageCollapse: { defaultVal: false, callbackFn: () => this.fit() },
                manageSize: { sizeArray: [{ w: width, h: 'auto' }, { w: width, h: 'auto', maxH: '90vh' }],
                    options: { defaultSizeIndex: 0 }, callback: () => this.fit() },
                ...(kind === 'PANEL' ? { widget: WIDGET, manageConfiguration: { fn: () => this.openConfig() } } : {}),
                onclose: function () { this.hide(); },
                onstopdrag: () => this.fit()
            });
            wnd.addToAlertLayer();
            this.windows.push(wnd);
            wnd.updateSizeWindow();
            this.clean.push(() => {
                wnd.$.pointerDraggable('destroy');
                this.e.windowManager.remove(wnd._nameWindow, wnd._idWindow);
                delete this.e.windowsData.name[name];
            });
            return wnd;
        }
        build() {
            const $ = this.$;
            const panel = $('<div>').addClass('tp-body');
            this.status = $('<div>').addClass('tp-status');
            this.detail = $('<div>').addClass('tp-detail');
            this.manualButton = this.button('Użyj ręcznie', () => void this.q.manual());
            this.autoButton = this.button('Start auto', () => void this.q.toggle());
            this.stopButton = this.button('STOP', () => this.q.stop(), 'red');
            const controls = $('<div>').addClass('tp-controls').append(this.manualButton, this.autoButton, this.stopButton);
            this.grid = $('<div>').addClass('tp-grid');
            this.cells = Array.from({ length: SIZE }, (_, i) => {
                const cell = $('<div>').addClass('tp-slot').attr({ 'data-tp-slot': i, tabindex: 0, 'aria-label': `Slot ${i + 1}` });
                cell.append($('<span>').addClass('tp-number').text(i + 1), $('<span>').addClass('tp-cooldown'));
                cell.on('click.tp', () => { this.selected = i; this.render(); });
                cell.on('dblclick.tp', () => { if (this.p.config.doubleClick) void this.q.manual(i + 1); });
                cell.on('contextmenu.tp longpress.tp', e => {
                    e.preventDefault();
                    if (!this.p.config.menu || !this.p.slots[i]) return;
                    const menu = [];
                    if (this.p.state === 'off' && !this.q.flight) menu.push(['Użyj', () => void this.q.manual(i + 1)]);
                    menu.push(['Usuń', () => this.remove(i)]);
                    this.e.interface.showPopupMenu(menu, e);
                });
                cell.pointerDroppable({
                    tolerance: 'pointer',
                    accept: source => source.hasClass('tp-slot') || (source.hasClass('inventory-item')
                        && teleport(source.data('item')) && Boolean(this.item(identity(source.data('item'))))),
                    drop: (e, ui) => {
                        if (ui.draggable.hasClass('tp-slot')) {
                            ui.draggable.data('tp-dropped', true);
                            this.swap(Number(ui.draggable.attr('data-tp-slot')), i);
                        } else this.assign(i, ui.draggable.data('item'));
                    }
                });
                // Source is the shortcut cell, never .item: map zones cannot accept it.
                cell.pointerDraggable({
                    distance: 6, delay: 100, appendTo: 'body', zIndex: 10000,
                    cursorAt: { left: 16, top: 16 },
                    helper: () => {
                        const helper = $('<div>').addClass('tp-drag');
                        const canvas = cell.find('.canvas-icon')[0];
                        if (canvas) {
                            const clone = this.win.document.createElement('canvas');
                            clone.width = clone.height = 32;
                            clone.getContext('2d').drawImage(canvas, 0, 0);
                            helper.append(clone);
                        }
                        return helper[0];
                    },
                    start: () => {
                        cell.data('tp-dropped', false);
                        if (!this.p.slots[i]) return false;
                    },
                    stop: e => {
                        if (e.type === 'pointercancel' || cell.data('tp-dropped')) return;
                        const r = this.panel.$[0].getBoundingClientRect();
                        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) this.remove(i);
                    }
                });
                this.grid.append(cell);
                return cell;
            });
            this.count = $('<div>').addClass('tp-count');
            this.selection = $('<div>').addClass('tp-selection');
            this.startInput = $('<input>').addClass('tp-start').attr({ type: 'number', min: 1, max: SIZE }).val(this.p.config.start);
            const start = $('<label>').addClass('tp-start-row').append('Początek cyklu ', this.startInput,
                this.button('Ustaw', () => {
                    if (!this.q.setStart(Number(this.startInput.val()))) this.message('Wpisz liczbę od 1 do 60.');
                }));
            panel.append(this.status, this.detail, controls, $('<div>').addClass('tp-scroll').append(this.grid), this.count, this.selection, start);
            this.panel = this.window('PANEL', 'Teleporty', panel, 306);
            this.summary = $('<span>').addClass('tp-summary');
            this.panel.$.find('.header-label-positioner').append(this.summary);
            this.configBody = $('<div>').addClass('tp-config-body');
            this.configWindow = this.window('CONFIG', 'Konfiguracja teleportów', this.configBody, 320);
            this.fillConfig(this.p.config);
            this.fit();
        }
        clearSlot(index) {
            const old = this.views.get(index);
            if (this.hover === index) this.hover = null;
            if (old) { this.e.items.deleteViewIconIfExist(old.item.id, VIEW); this.views.delete(index); }
            this.cells[index].find('.tp-icon').remove();
        }
        renderSlot(index, force = false) {
            const ref = this.p.slots[index];
            const item = ref && this.item(ref);
            const old = this.views.get(index);
            if (!force && old?.item === item && old?.icon?.[0]?.isConnected) {
                this.syncIcon(item, old.icon);
                return;
            }
            this.clearSlot(index);
            const cell = this.cells[index];
            cell.find('.tp-icon').remove();
            if (!item) return;
            const view = this.e.items.createViewIcon(item.id, VIEW);
            if (!view) return;
            const icon = view[0];
            // createViewIcon clones handlers and item data. Keep native tips, remove inventory actions.
            icon.off('click dblclick contextmenu longpress touchend pointerdown mouseover mouseleave').pointerDraggable('destroy');
            icon.removeAttr('id').addClass('tp-icon').removeClass('inventory-item bottomItem');
            icon.on('mouseenter.tp', () => { this.hover = index; item.setTip(icon); })
                .on('mouseleave.tp', () => { if (this.hover === index) this.hover = null; });
            this.syncIcon(item, icon);
            cell.prepend(icon);
            this.views.set(index, { item, icon });
        }
        syncIcon(item, icon) {
            icon.find('.cooldown, .amount').remove();
            icon.append(item.$.find('.amount').first().clone(false));
            item.updadeViewAfterUpdateItem(icon);
            this.e.disableItemsManager?.manageItemDisableInHeroEQ(item, icon);
        }
        overlays() {
            if (!this.panel.isShow()) return;
            for (const [i, { item, icon }] of this.views) {
                const left = cooldown(item);
                this.cells[i].toggleClass('tp-unavailable', !this.available(item));
                this.cells[i].find('.tp-cooldown').text(left === Infinity ? '?' : left > 0 ?
                    left >= 3600 ? `${Math.ceil(left / 3600)}h` : left >= 60 ? `${Math.ceil(left / 60)}m` : `${left}s` : '');
                if (this.hover === i) item.setTip(icon);
            }
        }
        render() {
            if (!this.panel || this.dead) return;
            const p = this.p;
            const state = { off: 'Wyłączony', active: 'Aktywny', paused: 'Pauza' }[p.state];
            this.status.text(`Tryb: ${p.state === 'off' ? 'Ręczny' : 'Auto'} · ${state}`);
            this.panel.$.toggleClass('tp-active', p.state === 'active').toggleClass('tp-paused', p.state === 'paused');
            this.summary.text(`Następny: ${p.next}`);
            this.detail.text(`Następny slot: ${p.next} · Początek: ${p.config.start} · Interwał: ${p.config.interval} s`);
            this.manualButton.toggleClass('disable', p.state !== 'off' || Boolean(this.q.flight)).attr('aria-disabled', p.state !== 'off' || Boolean(this.q.flight));
            this.autoButton.find('.label').text({ off: 'Start auto', active: 'Pauza', paused: 'Wznów' }[p.state]);
            this.autoButton.toggleClass('disable', !p.config.auto || (Boolean(this.q.flight) && p.state !== 'active'));
            this.count.text(`Przypisane teleporty: ${p.slots.filter(Boolean).length} / 60`);
            this.selection.text(this.selected == null ? 'Wybierz slot.' : `Wybrany slot: ${this.selected + 1}`);
            this.cells.forEach((cell, i) => {
                cell.toggleClass('tp-next', i === p.next - 1).toggleClass('tp-selected', i === this.selected);
            });
            for (const wnd of this.windows) for (const k of ['background', 'border', 'accent']) wnd.$[0].style.setProperty(`--tp-${k}`, p.config[k]);
            this.overlays();
        }
        fillConfig(config) {
            const $ = this.$;
            this.capture = null;
            this.draft = structuredClone(config);
            this.configBody.empty();
            this.fields = {};
            const section = text => this.configBody.append($('<div>').addClass('tp-section').text(text));
            const field = (name, text, type, attrs = {}) => {
                const input = $('<input>').addClass('tp-input').attr({ type, ...attrs });
                if (type === 'checkbox') input.prop('checked', config[name]); else input.val(config[name]);
                this.fields[name] = input;
                this.configBody.append($('<label>').addClass('tp-field').append($('<span>').text(text), input));
            };
            section('Skróty klawiszowe');
            for (const [name, label] of [['manualKey', 'Użyj ręcznie'], ['autoKey', 'Auto / pauza']]) {
                const button = this.button(keyText(this.draft[name]), () => { this.capture = name; button.find('.label').text('Naciśnij klawisze…'); });
                this.fields[name] = button;
                this.configBody.append($('<div>').addClass('tp-bind-row').append($('<span>').text(label), button,
                    this.button('Wyczyść', () => { this.draft[name] = null; this.capture = null; button.find('.label').text('Brak'); }, 'red')));
            }
            section('Ustawienia cyklu');
            field('start', 'Początek cyklu', 'number', { min: 1, max: SIZE });
            field('auto', 'Włącz tryb automatyczny', 'checkbox');
            field('interval', 'Interwał auto (s)', 'number', { min: 1, max: 2147483, step: 1 });
            section('Zachowanie');
            field('replaceLock', 'Blokuj zastąpienie slotu', 'checkbox');
            field('menu', 'PPM — opcje przedmiotu', 'checkbox');
            field('doubleClick', 'Podwójny klik — użyj', 'checkbox');
            section('Wygląd');
            field('background', 'Kolor tła', 'color');
            field('border', 'Kolor obramowania', 'color');
            field('accent', 'Kolor podświetlenia', 'color');
            this.configBody.append($('<div>').addClass('tp-config-actions').append(
                this.button('Przywróć domyślne', () => this.fillConfig(defaults()), 'red'),
                this.button('Zapisz', () => this.saveConfig())));
        }
        saveConfig() {
            const c = this.draft;
            for (const name of ['start', 'interval']) c[name] = Number(this.fields[name].val());
            if (!integer(c.start, 1, SIZE) || !integer(c.interval, 1, 2147483)) {
                this.message('Początek cyklu: 1–60. Interwał: dodatnia liczba całkowita.'); return;
            }
            if (sameKey(c.manualKey, c.autoKey)) { this.message('Wybierz dwa różne skróty.'); return; }
            for (const name of ['auto', 'replaceLock', 'menu', 'doubleClick']) c[name] = this.fields[name].prop('checked');
            for (const name of ['background', 'border', 'accent']) c[name] = this.fields[name].val();
            const startChanged = c.start !== this.p.config.start;
            const intervalChanged = c.interval !== this.p.config.interval;
            if (startChanged || intervalChanged) this.q.pause();
            if (startChanged) this.q.setStart(c.start);
            this.p.config = structuredClone(c);
            if (!c.auto) this.q.stop();
            this.startInput.val(c.start);
            this.capture = null;
            this.save(); this.render();
            this.message('Ustawienia zapisane.');
        }
        openConfig() {
            this.fillConfig(this.p.config);
            this.configWindow.show(); this.fit();
        }
        togglePanel() {
            this.panel.toggle();
            if (this.panel.isShow()) { this.sync(); this.fit(); }
        }
        bind() {
            // PointerDragDrop dispatches to all intersecting zones, including the map behind a window.
            // Cancel the inventory drag before its pointerup handler when the drop belongs to this panel.
            let incoming = null;
            this.listen(this.win.document, 'pointerdown', e => {
                const source = e.target.closest?.('.inventory-item');
                incoming = e.button === 0 && source && !source.classList.contains('disable-item-mark')
                    ? { source, pointer: e.pointerId, x: e.clientX, y: e.clientY, moved: false } : null;
            }, true);
            this.listen(this.win.document, 'pointermove', e => {
                if (incoming?.pointer === e.pointerId && Math.hypot(e.clientX - incoming.x, e.clientY - incoming.y) >= 24) incoming.moved = true;
            }, true);
            this.listen(this.win.document, 'pointerup', e => {
                const drag = incoming;
                incoming = null;
                if (!drag || !drag.moved || drag.pointer !== e.pointerId || !this.panel.isShow()) return;
                const r = this.panel.$[0].getBoundingClientRect();
                if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
                this.$(drag.source).pointerDraggable('cancel');
                const i = this.cells.findIndex(cell => {
                    const r = cell[0].getBoundingClientRect();
                    return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
                });
                if (i >= 0) this.assign(i, this.$(drag.source).data('item'));
            }, true);
            this.listen(this.win.document, 'pointercancel', () => { incoming = null; }, true);
            this.listen(this.win.document, 'keydown', e => {
                if (!this.context() || e.repeat || this.held.has(e.code)) return;
                this.held.add(e.code);
                if (this.capture) {
                    e.preventDefault(); e.stopImmediatePropagation();
                    if (['ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight'].includes(e.code)) return;
                    if (e.code === 'Escape') { const name = this.capture; this.capture = null; this.fields[name].find('.label').text(keyText(this.draft[name])); return; }
                    const key = keyOf(e);
                    const other = this.capture === 'manualKey' ? 'autoKey' : 'manualKey';
                    if (sameKey(key, this.draft[other])) { this.message('Ten skrót jest już używany przez teleporty.'); return; }
                    this.draft[this.capture] = key;
                    this.fields[this.capture].find('.label').text(keyText(key));
                    this.capture = null; return;
                }
                if (e.composedPath().some(node => node.matches?.('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]'))) return;
                const key = keyOf(e);
                if (sameKey(key, this.p.config.manualKey) && this.p.state === 'off') {
                    e.preventDefault(); e.stopImmediatePropagation(); void this.q.manual();
                } else if (sameKey(key, this.p.config.autoKey) && this.p.config.auto) {
                    e.preventDefault(); e.stopImmediatePropagation(); void this.q.toggle();
                }
            }, true);
            this.listen(this.win.document, 'keyup', e => this.held.delete(e.code), true);
            this.listen(this.win, 'blur', () => this.held.clear());
            this.listen(this.win, 'resize', () => this.fit());
            this.listen(this.win.document, 'visibilitychange', () => { this.held.clear(); if (!this.win.document.hidden) this.overlays(); });
        }
        widget() {
            const manager = this.e.widgetManager;
            const register = () => {
                const set = manager.getDefaultWidgetSet();
                if (set && !set[WIDGET]) manager.addKeyToDefaultWidgetSet(WIDGET, 0, this.e.widgetsData.pos.TOP_LEFT,
                    'Teleporty', this.e.widgetsData.type.RED, () => this.togglePanel());
            };
            const decorate = () => {
                const widget = manager.getAttachWidgetByName(WIDGET)?.getWidget();
                if (widget) {
                    widget.addClass('tp-widget');
                    widget[0].style.setProperty('--tp-widget-icon', `url("${this.env.icon}")`);
                }
            };
            const place = () => {
                if (!this.context() || this.widgetSaving) return;
                const path = manager.getPathToHotWidgetVersion();
                const store = this.e.serverStorage.get(path) || {};
                if (Object.hasOwn(store, WIDGET)) {
                    if (!this.p.widgetPlaced) { this.p.widgetPlaced = true; this.save(); }
                    return;
                }
                if (this.p.widgetPlaced) return;
                const slot = manager.getFirstEmptyWidgetSlot();
                if (!slot) return;
                this.widgetSaving = true;
                this.e.serverStorage.sendData({ [path]: { [WIDGET]: [slot.slot, slot.container] } }, () => {
                    this.widgetSaving = false;
                    if (!this.context()) return;
                    const stored = this.e.serverStorage.get(path);
                    if (!Object.hasOwn(stored || {}, WIDGET)) return;
                    this.p.widgetPlaced = true; this.save();
                    manager.addWidgetButtons();
                });
            };
            wrap(manager, 'initDefaultWidgetSet', (original, receiver, args) => {
                const result = original.apply(receiver, args); register(); return result;
            }, this.clean);
            wrap(manager, 'addWidgetButtons', (original, receiver, args) => {
                register(); const result = original.apply(receiver, args); decorate(); place(); return result;
            }, this.clean);
            register();
            manager.addWidgetButtons();
            this.clean.push(() => {
                const widget = manager.getAttachWidgetByName(WIDGET)?.getWidget();
                widget?.pointerDraggable('destroy').remove();
                manager.removeFromAttachWidgetList(WIDGET);
                delete manager.getDefaultWidgetSet()[WIDGET];
            });
        }
        fit() {
            for (const wnd of this.windows) {
                if (!wnd.isShow()) continue;
                const zoom = this.e.zoomFactor || 1;
                wnd.$[0].style.setProperty('--tp-max-width', `${Math.max(120, this.win.innerWidth / zoom - 16)}px`);
                wnd.$[0].style.setProperty('--tp-max-height', `${Math.max(100, this.win.innerHeight / zoom - 64)}px`);
                if (wnd.checkPassTheScreenBounds()) { wnd.updatePos(); wnd.saveWindowPosition(); }
            }
        }
        rebuild() {
            if (!this.context()) return;
            for (const wnd of this.windows) wnd.addToAlertLayer();
            this.sync(); this.fit();
        }
        tick() {
            if (!this.context()) { this.env.restart(); return; }
            if (this.ownTravel && this.e.allInit && !this.e.reload) this.ownTravel = 0;
            if (this.ownTravel && Date.now() - this.ownTravel > 60000) {
                this.ownTravel = 0;
                this.q.pause('Gra długo się ładuje. Sprawdź ją przed wznowieniem teleportów.');
            }
            if (this.p.state === 'active' && !this.operation) {
                const reason = this.blocked();
                if (reason) this.q.pause(reason);
            }
            this.overlays();
        }
        destroy() {
            if (this.dead) return;
            if (this.p.state === 'active') this.p.state = 'paused';
            this.save();
            this.dead = true;
            this.q.destroy();
            if (this.syncTimer !== null) this.win.clearTimeout(this.syncTimer);
            for (const off of this.items.values()) off();
            for (const { item } of this.views.values()) this.e.items.deleteViewIconIfExist(item.id, VIEW);
            for (const cell of this.cells || []) { cell.pointerDroppable({ disabled: true }); cell.pointerDraggable('cancel'); cell.pointerDraggable('destroy'); }
            for (const off of this.clean.reverse()) off();
            this.items.clear(); this.views.clear(); this.held.clear();
        }
    }

    function boot(env) {
        const win = env.win;
        const marker = '__doiuaTeleportQueueV1';
        if (win[marker]) return win[marker];
        let app = null;
        let timer = null;
        let deadline = 0;
        let api = null;
        let event = null;
        let stopped = false;
        let styled = false;
        const detach = () => { if (api) api.removeCallbackFromEvent(event, check); api = null; };
        const check = () => {
            if (stopped || app) return;
            if (timer !== null) win.clearTimeout(timer);
            timer = null;
            if (!api && win.API && win.Engine?.apiData?.AFTER_INTERFACE_START) {
                api = win.API; event = win.Engine.apiData.AFTER_INTERFACE_START;
                api.addCallbackToEvent(event, check);
            }
            if (ready(win)) {
                detach();
                try {
                    if (!styled) { env.css(); styled = true; }
                    app = new App({ ...env, restart });
                    app.init();
                } catch (error) {
                    app?.destroy(); app = null;
                    win.message(error.message?.startsWith('Nieobsługiwana wersja zapisu') ? error.message :
                        'Teleporty nie mogą się uruchomić w tej wersji gry. Sprawdź aktualizację dodatku.', true);
                    stop();
                }
                return;
            }
            if (Date.now() >= deadline) {
                if (win.Engine?.allInit && typeof win.message === 'function')
                    win.message('Teleporty nie mogły się uruchomić. Odśwież grę lub sprawdź aktualizację dodatku.', true);
                detach(); stop(); return;
            }
            timer = win.setTimeout(check, 250);
        };
        const restart = () => { app?.destroy(); app = null; deadline = Date.now() + 60000; check(); };
        const stop = () => {
            if (stopped) return;
            stopped = true;
            if (timer !== null) win.clearTimeout(timer);
            detach(); app?.destroy(); app = null;
            win.removeEventListener('pagehide', stop);
            delete win[marker];
        };
        const handle = { destroy: stop };
        win[marker] = handle;
        win.addEventListener('pagehide', stop);
        restart();
        return handle;
    }
    root.TeleportQueue = Object.freeze({ boot, Queue, App, load, defaults, cooldown, teleport, readyItem,
        needsTarget, sameKey, keyOf, advance, profileKey, matches, ready });
})(globalThis);
