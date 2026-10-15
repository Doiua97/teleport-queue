(function (root) {
    'use strict';

    const SIZE = 60;
    const VIEW = 'TP_QUEUE_VIEW';
    const WIDGET = 'tp_queue';
    const LOAD_LOCKS = new Set(['change_location', 'mapLoadedAndAllInit']);
    const MODIFIERS = new Set(['ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight']);
    const OCCUPIED = 'Ten skrót jest już zajęty.';
    const INVALID_KEY = 'Naciśnij poprawną kombinację klawiszy.';
    const WINDOW_SIZES = { PANEL: [140, 220, 310], CONFIG: [260, 420, 560], BIND: [300, 340, 380] };
    const defaults = () => ({
        start: 1, auto: false, interval: 120,
        manualKey: { code: 'F9', ctrl: false, alt: false, shift: false, meta: false },
        autoKey: { code: 'F10', ctrl: false, alt: false, shift: false, meta: false },
        replaceLock: false, menu: true, doubleClick: true,
        background: '#101216', border: '#777b80', accent: '#d9b457'
    });
    const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
    const keyValid = key => key === null || (key && typeof key.code === 'string' && /^[A-Za-z][A-Za-z0-9]*$/.test(key.code)
        && key.code !== 'Unidentified' && !MODIFIERS.has(key.code)
        && (key.altGraph == null || key.altGraph === false)
        && ['ctrl', 'alt', 'shift', 'meta'].every(name => typeof key[name] === 'boolean'));
    const sameKey = (a, b) => Boolean(a && b && ['code', 'ctrl', 'alt', 'shift', 'meta'].every(k => a[k] === b[k])
        && Boolean(a.altGraph) === Boolean(b.altGraph));
    const altGraphOf = e => Boolean(e?.getModifierState?.('AltGraph') || e?.key === 'AltGraph');
    const keyOf = e => ({ code: e.code, key: e.key, ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey, meta: e.metaKey,
        ...(altGraphOf(e) ? { altGraph: true } : {}) });
    const keyText = key => key ? [key.altGraph && 'AltGr', !key.altGraph && key.ctrl && 'Ctrl', !key.altGraph && key.alt && 'Alt', key.shift && 'Shift', key.meta && 'Meta',
        key.code.replace(/^Key/, '').replace(/^Digit/, '')].filter(Boolean).join(' + ') : 'Brak';
    const profileKey = e => `margo-tp:v2:${e.worldConfig.getWorldName()}:${e.hero.d.id}`;
    const stats = item => item.parseStats();
    const teleport = item => Boolean(item && Number(item.cl) === 32 &&
        ['teleport', 'custom_teleport'].some(k => Object.hasOwn(stats(item), k)));
    const identity = item => ({ id: String(item.id), hid: String(item.hid) });
    const matches = (item, ref) => Boolean(item && ref && String(item.id) === ref.id && String(item.hid) === ref.hid);
    const groupOf = item => ({ items: [identity(item)] });
    const quantity = item => Math.max(0, Number(stats(item).amount) || 0);
    function groupKey(item) {
        const s = stats(item);
        if (!teleport(item) || !Object.hasOwn(s, 'amount') || item.tpl == null) return null;
        const fields = Object.keys(s).filter(k => k !== 'amount').sort().map(k =>
            [k, k === 'timelimit' ? String(s[k]).split(',')[0] : s[k]]);
        return JSON.stringify([Number(item.cl), String(item.tpl), fields]);
    }
    function destination(item) {
        if (needsTarget(item)) return 'wybór miejsca';
        const s = stats(item);
        const value = s.custom_teleport || s.teleport;
        return String(value ?? '').split(',').slice(3).join(',').trim() || 'nieznana lokacja';
    }
    function nativeKey(key, event) {
        const observed = event?.key || key?.key;
        if (observed) return observed.toUpperCase();
        const code = key?.code || '';
        if (code.startsWith('Key')) return code.slice(3);
        if (code.startsWith('Digit')) return key.shift ? ')!@#$%^&*('[Number(code.slice(5))] : code.slice(5);
        if (code.startsWith('Numpad') && /\d$/.test(code)) return code.slice(6);
        const symbols = { Space: ' ', Backquote: ['`', '~'], Minus: ['-', '_'], Equal: ['=', '+'],
            BracketLeft: ['[', '{'], BracketRight: [']', '}'], Backslash: ['\\', '|'],
            Semicolon: [';', ':'], Quote: ["'", '"'], Comma: [',', '<'], Period: ['.', '>'], Slash: ['/', '?'] };
        const value = symbols[code];
        return Array.isArray(value) ? value[key.shift ? 1 : 0] : value || code.toUpperCase();
    }
    function registeredKey(value, key, event) {
        if (key.altGraph || altGraphOf(event)) return false;
        if (typeof value !== 'string' || !value.includes('+')) return false;
        const parts = value.toUpperCase().split('+').map(s => s.trim());
        const base = parts.pop();
        const mods = { ctrl: ['CTRL', 'CONTROL'], shift: ['SHIFT'], alt: ['ALT', 'OPTION'], meta: ['META', 'CMD', 'COMMAND'] };
        if (parts.some(part => !Object.values(mods).some(names => names.includes(part)))) return false;
        return Object.entries(mods).every(([name, names]) => key[name] === parts.some(part => names.includes(part)))
            && (base === key.code.toUpperCase() || base === nativeKey(key, event));
    }
    function systemKey(key) {
        const mods = ['ctrl', 'shift', 'alt', 'meta'].filter(name => key[name]).join('+');
        const browser = {
            '': ['F5', 'F11', 'F12'], shift: ['F5', 'Escape'],
            ctrl: ['KeyW', 'KeyT', 'KeyN', 'Tab', 'PageUp', 'PageDown', 'F4', 'F5'],
            'ctrl+shift': ['KeyW', 'KeyT', 'KeyN', 'KeyK', 'Delete', 'Tab', 'PageUp', 'PageDown'],
            alt: ['Tab', 'F4', 'Escape', 'Space', 'ArrowLeft', 'ArrowRight', 'Home', 'KeyD'],
            'shift+alt': ['Tab'], 'ctrl+alt': ['Delete'],
            meta: ['KeyW', 'KeyT', 'KeyN', 'KeyR', 'KeyL', 'KeyP', 'KeyS', 'KeyF', 'KeyG', 'KeyD', 'KeyH', 'KeyJ', 'KeyO', 'KeyU', 'KeyQ', 'Tab', 'Space'],
            'shift+meta': ['KeyC', 'KeyI', 'KeyJ', 'KeyW', 'KeyT', 'KeyN', 'KeyR'],
            'alt+meta': ['KeyC', 'KeyI', 'KeyJ', 'Escape']
        };
        if (browser[mods]?.includes(key.code)) return true;
        const platform = root.navigator?.userAgentData?.platform || root.navigator?.platform || '';
        return /win/i.test(platform) && mods === 'meta' &&
            ['KeyA', 'KeyB', 'KeyC', 'KeyE', 'KeyG', 'KeyH', 'KeyI', 'KeyK', 'KeyM', 'KeyV', 'KeyX', 'KeyZ'].includes(key.code);
    }
    function gameConflict(key, engine, event) {
        if (!key) return null;
        if (key.altGraph || altGraphOf(event)) return INVALID_KEY;
        const value = nativeKey(key, event);
        if (systemKey(key) || ['ENTER', 'ESCAPE', 'TAB', 'ARROWUP', 'ARROWDOWN', 'ARROWLEFT', 'ARROWRIGHT'].includes(value)
            || /^[1-9]$/.test(value)) return OCCUPIED;
        const hot = engine.hotKeys;
        if (!hot) return 'Nie można teraz sprawdzić skrótów Margonem. Poczekaj na załadowanie gry.';
        const rows = hot.getSortedHotKeys?.() || [];
        if ([...Object.keys(hot.hotKeys || {}), ...rows.map(row => row[0])]
            .some(value => registeredKey(value, key, event))) return OCCUPIED;
        // Modified combinations are owned by our capture handlers, including keypress and keyup.
        if (key.ctrl || key.shift || key.alt || key.meta) return null;
        const moves = ['move_up', 'move_down', 'move_left', 'move_right'];
        if (moves.some(name => String(hot.getKeyByClbName?.(name) || '').toUpperCase() === value))
            return OCCUPIED;
        const row = rows.find(row => String(row[0] || '').toUpperCase() === value);
        const clb = hot.hotKeys?.[value] || row?.[1];
        return clb ? OCCUPIED : null;
    }
    const cooldown = (item, now = Date.now() / 1000) => {
        const value = stats(item).timelimit;
        if (value == null) return 0;
        const fields = String(value).split(',');
        if (fields.length < 2) return 0;
        const end = Number(fields[1]);
        return Number.isFinite(end) ? Math.max(0, Math.ceil(end - now)) : Infinity;
    };
    const cooldownText = left => left === Infinity ? '?' : left > 0 ?
        left >= 60 ? `${Math.ceil(left / 60)}m` : `${left}s` : '';
    const needsTarget = item => {
        const s = stats(item);
        return Object.hasOwn(s, 'custom_teleport') && !s.custom_teleport;
    };
    const readyItem = item => teleport(item) && cooldown(item) === 0 && !item.checkExpires()
        && (!Object.hasOwn(stats(item), 'amount') || Number(stats(item).amount) > 0)
        && !item.$.hasClass('disable-item-mark');
    const advance = (slot, start) => slot < start || slot >= SIZE ? start : slot + 1;
    function load(value) {
        if (value != null && value.schema !== 2) throw new Error('Nieobsługiwana wersja zapisu. Twoje dane pozostają zachowane.');
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
            const refs = value?.slots?.[i]?.items;
            if (!Array.isArray(refs)) return null;
            const items = refs.flatMap(ref => {
                if (!ref || !['id', 'hid'].every(k => ['number', 'string'].includes(typeof ref[k])
                    && String(ref[k]).length && !['undefined', 'null'].includes(String(ref[k])))) return [];
                const id = String(ref.id);
                if (seen.has(id)) return [];
                seen.add(id);
                return [{ id, hid: String(ref.hid) }];
            });
            return items.length ? { items } : null;
        });
        return { schema: 2, config, slots, locked: Array.from({ length: SIZE }, (_, i) => value?.locked?.[i] === true),
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
            this.waiting = false;
        }
        change() { this.a.save(this.p); this.a.render(); }
        clear() { if (this.timer !== null) this.clock.clearTimeout(this.timer); this.timer = null; this.waiting = false; }
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
            if (this.p.state !== 'off' || (slot && this.p.locked[slot - 1])) return;
            return this.attempt(slot);
        }
        find(explicit, clean = false) {
            let slot = explicit ?? this.p.next;
            const limit = explicit ? 1 : SIZE - this.p.config.start + 1;
            let removed = false, candidate = null;
            for (let i = 0; i < limit; i++) {
                const group = this.p.slots[slot - 1];
                if (group) {
                    const items = this.a.items(group);
                    if (clean) {
                        const refs = group.items.filter(ref => items.some(item => matches(item, ref)));
                        if (refs.length !== group.items.length) {
                            this.p.slots[slot - 1] = refs.length ? { items: refs } : null; removed = true;
                        }
                    }
                    if (!this.p.locked[slot - 1]) {
                        const item = items.find(item => this.a.ready(item));
                        if (item) { candidate = { item, slot }; break; }
                    }
                }
                slot = advance(slot, this.p.config.start);
            }
            if (removed) this.change();
            return candidate;
        }
        async attempt(explicit) {
            if (!this.alive || this.flight || !this.a.context()) return;
            if (explicit && this.p.locked[explicit - 1]) return;
            this.clear();
            if (!this.p.slots.some(Boolean)) {
                this.a.message('Brak teleportów w kolejce.');
                this.schedule();
                return;
            }
            if (this.a.loaded && !this.a.loaded()) { this.schedule(); return; }
            const candidate = this.find(explicit, true);
            if (!candidate) {
                this.a.message(this.p.slots.some(Boolean) ? 'Brak gotowego teleportu.' : 'Brak teleportów w kolejce.');
                this.schedule();
                return;
            }
            const blocked = this.a.blocked();
            if (blocked) {
                if (this.p.state === 'active') this.pause(blocked);
                else this.a.message(blocked);
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
            this.clear();
            if (this.a.loaded && !this.a.loaded()) { this.waiting = true; this.a.render(); return; }
            this.timer = this.clock.setTimeout(() => { this.timer = null; void this.attempt(); }, this.p.config.interval * 1000);
        }
        wait() {
            if (this.p.state !== 'active') return;
            this.clear(); this.waiting = true; this.a.render();
        }
        ready() {
            if (this.waiting && !this.flight && (!this.a.loaded || this.a.loaded())) this.schedule();
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
            && win.jQuery.fn.pointerDroppable && win.jQuery.fn.addScrollBar);
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
            this.swallowed = new Map();
            this.altGraph = false;
            this.capture = null;
            this.syncTimer = null;
            this.operation = null;
            this.widgetSaving = false;
            this.dead = false;
            this.q = new Queue(this.p, {
                context: () => this.context(), blocked: () => this.blocked(), items: group => this.members(group),
                ready: item => this.available(item), use: item => this.use(item),
                loaded: () => this.loaded(),
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
        members(group) { return group?.items?.map(ref => this.item(ref)).filter(Boolean) || []; }
        loaded() {
            const e = this.e, map = e.map;
            return Boolean(e.allInit && !e.reload && ![...LOAD_LOCKS].some(name => e.lock.check(name))
                && (!map?.lock || !map.lock.check().length)
                && (!map?.getDrawable || map.getDrawable()) && (!map?.getUnlock || map.getUnlock()));
        }
        available(item) {
            const manager = this.e.disableItemsManager;
            return readyItem(item) && !(manager && manager.checkRequires(item, manager.activeDisableKinds));
        }
        blocked() {
            const e = this.e;
            if (e.dead || e.lock.check('dead')) return 'Postać nie może teraz użyć teleportu.';
            const crafting = e.crafting;
            const craftOpen = crafting?.isOpen?.() || ['salvage', 'enhancement', 'extraction',
                'socket_enchantment', 'socket_extraction', 'socket_composition'].some(name => crafting?.[name]);
            if (e.battle?.isBattleShow() || e.dialogue || e.trade || e.shop || e.depo || e.mails || e.auctions || craftOpen
                || e.interfaceItems?.isInterfaceItemsDisable?.()) return 'Dokończ obecną czynność i wznów teleporty.';
            if (e.lock.check() && e.lock.list.some(name => !LOAD_LOCKS.has(name)))
                return 'Gra czeka na Twoją reakcję. Wznów teleporty, gdy będzie można grać dalej.';
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
            this.event('HERO_DEAD', data => {
                if (Number(data?.sec) > 0) this.q.pause('Postać nie może teraz użyć teleportu.');
            });
            for (const event of ['OPEN_BATTLE_WINDOW', 'NEW_ASK']) this.event(event, () => {
                this.q.pause('Dokończ obecną czynność i wznów teleporty.');
            });
            // API has no removable batch-update callback; fetch and Item events are removable.
            this.e.items.fetch({ loc: 'g', k: 'TP_QUEUE_FETCH' }, () => this.deferSync());
            this.clean.push(() => this.e.items.removeCallback({ loc: 'g', k: 'TP_QUEUE_FETCH' }));
            for (const name of ['onClear', 'startGameThread']) if (typeof this.e[name] === 'function') {
                wrap(this.e, name, (original, receiver, args) => {
                    if (name === 'onClear') this.q.wait();
                    const result = original.apply(receiver, args);
                    if (name === 'startGameThread') queueMicrotask(() => {
                        if (this.context()) { this.sync(); this.q.ready(); }
                    });
                    return result;
                }, this.clean);
            }
            const tick = this.win.setInterval(() => this.tick(), 1000);
            this.clean.push(() => this.win.clearInterval(tick));
            this.save();
            this.render();
            return this;
        }
        use(item) {
            let finish;
            const op = { item: identity(item), response: false, accepted: false,
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
                        op.finish(op.accepted ? (choice ? 'choice' : 'success') : 'rejected');
                        this.q.release(op);
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
            if (!this.context() || !this.loaded() || Object.keys(this.e.items.getFetchPackageController()).length) return;
            let changed = false;
            const live = new Set();
            for (const item of Object.values(this.e.heroEquipment.getHItems())) {
                if (!teleport(item)) continue;
                live.add(item);
                if (this.items.has(item)) continue;
                const update = () => this.deferSync();
                item.on('afterUpdate', update);
                item.on('delete', update);
                this.items.set(item, () => {
                    item.unregisterCallback('afterUpdate', update);
                    item.unregisterCallback('delete', update);
                });
            }
            for (const [item, off] of this.items) if (!live.has(item)) { off(); this.items.delete(item); }
            this.p.slots.forEach((group, i) => {
                if (group) {
                    const refs = group.items.filter(ref => this.item(ref));
                    if (refs.length !== group.items.length) {
                        this.p.slots[i] = refs.length ? { items: refs } : null; changed = true;
                    }
                }
                this.renderSlot(i, true);
            });
            if (changed) this.save();
            this.render();
            this.updateScroll();
        }
        assign(index, item) {
            if (!this.context() || !teleport(item) || !this.item(identity(item))) return;
            if (this.p.config.replaceLock && this.p.slots[index]) return;
            if (this.p.slots.some((group, i) => i !== index && group?.items.some(ref => ref.id === String(item.id)))) {
                this.message('Ten teleport jest już przypisany do slotu.');
                return;
            }
            this.p.slots[index] = groupOf(item);
            this.changedSlots(index);
        }
        importItems() {
            if (!this.context() || !this.loaded()) return;
            this.sync();
            const seen = new Set(this.p.slots.flatMap(group => group?.items.map(ref => ref.id) || []));
            const order = Array.from({ length: SIZE }, (_, i) => (this.p.config.start - 1 + i) % SIZE);
            const changed = new Set();
            let added = 0, skipped = 0;
            for (const item of Object.values(this.e.heroEquipment.getHItems())) {
                if (!teleport(item) || !this.item(identity(item)) || seen.has(String(item.id))) continue;
                const key = groupKey(item);
                let index = key === null ? -1 : this.p.slots.findIndex(group => {
                    const members = this.members(group);
                    return members.length && members.every(member => groupKey(member) === key);
                });
                if (index < 0) index = order.find(i => !this.p.slots[i]) ?? -1;
                if (index < 0) { skipped++; continue; }
                if (this.p.slots[index]) this.p.slots[index].items.push(identity(item));
                else this.p.slots[index] = groupOf(item);
                seen.add(String(item.id)); changed.add(index); added++;
            }
            this.changedSlots(...changed);
            this.message(`Dodano teleporty: ${added}. Pominięto z powodu braku miejsca: ${skipped}.`);
        }
        toggleLock(index) {
            if (!this.context()) return;
            this.p.locked[index] = !this.p.locked[index]; this.save(); this.render();
        }
        unlockAll() {
            if (!this.context()) return;
            this.p.locked.fill(false); this.save(); this.render();
        }
        drop(index, source) {
            if (!this.context()) return;
            if (source.hasClass('tp-slot')) {
                source.data('tp-dropped', true);
                this.swap(Number(source.attr('data-tp-slot')), index);
            } else if (source.hasClass('inventory-item')) this.assign(index, source.data('item'));
        }
        hitSlot(x, y) {
            const r = this.scroll[0].getBoundingClientRect();
            if (x < r.left || x > r.right || y < r.top || y > r.bottom) return -1;
            return this.cells.findIndex(cell => {
                const r = cell[0].getBoundingClientRect();
                return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
            });
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
            for (const i of indices) this.renderSlot(i);
            this.save();
            this.render();
            this.updateScroll();
        }
        button(text, fn, color = 'green') {
            const b = this.api.Templates.get('button').addClass(`small ${color} tp-button`)
                .attr({ role: 'button', tabindex: 0 });
            b.find('.label').text(text);
            const run = e => { if (!b.hasClass('disable')) { e.preventDefault(); fn(); } };
            b.on('click.tp', run).on('keydown.tp', e => {
                if (['Enter', 'Space'].includes(e.code) && !e.repeat) { e.stopImmediatePropagation(); run(e); }
            });
            return b;
        }
        number(name, value, attrs, template = 'ni-input-text') {
            const control = this.api.Templates.get(template).addClass('tp-number-input');
            const input = control.find('input').attr({ id: `${this.panel?._nameWindow || this.key}_${name}`, name,
                type: 'number', step: 1, ...attrs }).val(value);
            control.find('.clear-cross').remove();
            return { control, input };
        }
        scrollBar(scroll) {
            scroll.addScrollBar({ track: true });
            this.clean.push(() => {
                scroll.find('.handle').pointerDraggable('cancel').pointerDraggable('destroy');
                scroll.off();
            });
        }
        updateScroll() {
            this.scroll?.trigger('update');
            this.configScroll?.trigger('update');
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
                manageSize: { sizeArray: WINDOW_SIZES[kind].map(size => ({ w: kind === 'BIND' ? size : width, h: 'auto' })),
                    options: { defaultSizeIndex: 1 }, callback: () => this.fit() },
                ...(kind === 'PANEL' ? { widget: WIDGET, manageConfiguration: { fn: e => this.openConfig(e) } } : {}),
                onclose: kind === 'BIND' ? () => this.closeCapture() : function () { this.hide(); },
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
                const cell = $('<div>').addClass('item-slot interface-element-one-item-slot tp-slot')
                    .attr({ 'data-tp-slot': i, tabindex: 0, 'aria-label': `Slot ${i + 1}` });
                cell.append($('<span>').addClass('tp-number').text(i + 1), $('<span>').addClass('tp-cooldown'));
                cell.on('click.tp', e => {
                    if (e.ctrlKey && e.button === 0) { e.preventDefault(); e.stopImmediatePropagation(); this.toggleLock(i); return; }
                    this.selected = i; this.render();
                });
                cell.on('dblclick.tp', e => { if (!e.ctrlKey && this.p.config.doubleClick) void this.q.manual(i + 1); });
                cell.on('contextmenu.tp longpress.tp', e => {
                    e.preventDefault();
                    if (!this.p.config.menu || !this.p.slots[i]) return;
                    const menu = [];
                    if (!this.p.locked[i] && this.p.state === 'off' && !this.q.flight) menu.push(['Użyj', () => void this.q.manual(i + 1)]);
                    menu.push(['Usuń', () => this.remove(i)]);
                    this.e.interface.showPopupMenu(menu, e);
                });
                cell.pointerDroppable({
                    tolerance: 'pointer',
                    accept: source => source.hasClass('tp-slot') || (source.hasClass('inventory-item')
                        && teleport(source.data('item')) && Boolean(this.item(identity(source.data('item'))))),
                    drop: (e, ui) => this.drop(i, ui.draggable)
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
                    start: e => {
                        cell.data('tp-dropped', false);
                        if (e.ctrlKey || !this.p.slots[i]) return false;
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
            this.pendingText = $('<div>').addClass('tp-pending').attr({ role: 'status', 'aria-live': 'polite' });
            const number = this.number('panel_start', this.p.config.start, { min: 1, max: SIZE }, 'input');
            this.startInput = number.input;
            const start = $('<div>').addClass('tp-start-row').append(
                this.selection,
                $('<label>').attr('for', number.input.attr('id')).text('Początek cyklu'), number.control,
                this.button('Ustaw', () => {
                    if (!this.q.setStart(Number(this.startInput.val()))) this.message('Wpisz liczbę od 1 do 60.');
                }));
            this.scroll = $('<div>').addClass('scroll-wrapper tp-scroll')
                .append($('<div>').addClass('scroll-pane').append(this.grid));
            this.unlockButton = this.button('Odblokuj zablokowane', () => this.unlockAll());
            const imports = $('<div>').addClass('tp-import-row').append(
                this.button('Pobierz teleporty', () => this.importItems()), this.unlockButton);
            panel.append(this.status, this.detail, this.pendingText, controls, this.scroll, this.count, start, imports);
            this.panel = this.window('PANEL', 'Teleporty', panel, 320);
            this.summary = $('<span>').addClass('tp-summary');
            this.panel.$.find('.header-label-positioner').append(this.summary);
            this.configBody = $('<div>').addClass('tp-config-body');
            this.configScroll = $('<div>').addClass('scroll-wrapper tp-config-scroll')
                .append($('<div>').addClass('scroll-pane').append(this.configBody));
            this.configWindow = this.window('CONFIG', 'Konfiguracja teleportów', this.configScroll, 320);
            this.fillConfig(this.p.config);
            this.scrollBar(this.scroll);
            this.scrollBar(this.configScroll);
            this.fit();
        }
        clearSlot(index) {
            const old = this.views.get(index);
            if (this.hover === index) this.hover = null;
            if (old) { this.e.items.deleteViewIconIfExist(old.item.id, VIEW); this.views.delete(index); }
            this.cells[index].find('.tp-icon').remove();
        }
        renderSlot(index, refresh = false) {
            const members = this.members(this.p.slots[index]);
            const item = members.find(item => this.available(item)) || members[0];
            const old = this.views.get(index);
            if (old?.item === item && old?.icon?.[0]?.isConnected) {
                if (refresh) this.syncIcon(item, old.icon, members);
                return;
            }
            this.clearSlot(index);
            const cell = this.cells[index];
            if (!item) return;
            const view = this.e.items.createViewIcon(item.id, VIEW);
            if (!view) return;
            const icon = view[0];
            // createViewIcon clones handlers and item data. Keep native tips, remove inventory actions.
            icon.off('click dblclick contextmenu longpress touchend pointerdown mouseover mouseleave').pointerDraggable('destroy');
            icon.removeAttr('id').addClass('tp-icon').removeClass('inventory-item bottomItem');
            icon.on('mouseenter.tp', () => { this.hover = index; item.setTip(icon); })
                .on('mouseleave.tp', () => { if (this.hover === index) this.hover = null; });
            this.syncIcon(item, icon, members);
            cell.prepend(icon);
            this.views.set(index, { item, icon });
        }
        syncIcon(item, icon, members) {
            icon.find('.cooldown, .amount').remove();
            icon.append(item.$.find('.amount').first().clone(false));
            item.updadeViewAfterUpdateItem(icon);
            this.e.disableItemsManager?.manageItemDisableInHeroEQ(item, icon);
            if (Object.hasOwn(stats(item), 'amount')) {
                let amount = icon.find('.amount');
                if (!amount.length) amount = this.$('<span>').addClass('amount').appendTo(icon);
                amount.text(members.reduce((sum, member) => sum + quantity(member), 0));
            }
        }
        overlays() {
            if (!this.panel.isShow()) return;
            for (const i of [...this.views.keys()]) {
                this.renderSlot(i);
                const view = this.views.get(i);
                if (!view) continue;
                const { item, icon } = view;
                const available = this.available(item);
                const text = cooldownText(cooldown(item));
                if (view.available !== available) {
                    this.cells[i].toggleClass('tp-unavailable', !available);
                    view.available = available;
                }
                if (view.cooldown !== text) {
                    this.cells[i].find('.tp-cooldown').text(text);
                    view.cooldown = text;
                }
                if (this.hover === i) item.setTip(icon);
            }
            this.updateNext();
        }
        updateNext() {
            const next = this.q.find();
            const text = `Następna: ${next ? destination(next.item) : 'brak gotowych'}`;
            this.summary.text(text);
            const tip = this.panel.$.hasClass('window--collapsed') ? text : '';
            this.panel.$.find('.draggable-window-element').tip(tip.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'));
            this.detail.text(`Następny slot: ${next?.slot ?? 'brak gotowych'} · Początek: ${this.p.config.start} · Interwał: ${this.p.config.interval} s`);
            this.cells.forEach((cell, i) => cell.toggleClass('tp-next', next?.slot === i + 1));
        }
        render() {
            if (!this.panel || this.dead) return;
            const p = this.p;
            this.status.text({ off: 'Tryb: Ręczny', active: 'Tryb: Auto — Aktywny', paused: 'Tryb: Auto — Pauza' }[p.state]);
            this.panel.$.toggleClass('tp-active', p.state === 'active').toggleClass('tp-paused', p.state === 'paused');
            this.pendingText.text(this.q.flight ? this.q.flight.done ?
                'Brak odpowiedzi. Poczekaj lub odśwież grę przed kolejną próbą.' : 'Czekam na odpowiedź gry…' : '');
            this.manualButton.toggleClass('disable', p.state !== 'off' || Boolean(this.q.flight)).attr('aria-disabled', p.state !== 'off' || Boolean(this.q.flight));
            this.autoButton.find('.label').text({ off: 'Start auto', active: 'Pauza', paused: 'Wznów' }[p.state]);
            this.autoButton.toggleClass('disable', !p.config.auto || (Boolean(this.q.flight) && p.state !== 'active'));
            this.count.text(`Przypisane teleporty: ${p.slots.filter(Boolean).length} / 60`);
            this.selection.text(`Wybrany slot: ${this.selected == null ? '—' : this.selected + 1}`);
            this.unlockButton.toggle(p.locked.some(Boolean));
            this.cells.forEach((cell, i) => {
                cell.toggleClass('tp-selected', i === this.selected)
                    .toggleClass('tp-locked', p.locked[i]);
            });
            for (const wnd of this.windows) for (const k of ['background', 'border', 'accent']) wnd.$[0].style.setProperty(`--tp-${k}`, p.config[k]);
            if (this.panel.isShow()) this.overlays();
            else this.updateNext();
        }
        fillConfig(config) {
            const $ = this.$;
            this.closeCapture();
            this.draft = structuredClone(config);
            this.configBody.empty();
            this.fields = {};
            const section = text => this.configBody.append($('<div>').addClass('tp-section').text(text));
            const field = (name, text, type, attrs = {}) => {
                let control, input;
                const id = `${this.configWindow._nameWindow}_${name}`;
                if (type === 'checkbox') {
                    control = this.api.Templates.get('checkbox-custom').addClass('c-checkbox tp-checkbox');
                    input = control.find('input').attr({ id, name }).prop('checked', config[name]);
                    const label = control.find('label').addClass('c-checkbox__label')
                        .attr({ for: id, tabindex: 0, role: 'checkbox', 'aria-checked': input.prop('checked') }).text(text);
                    input.on('change.tp', () => {
                        label.attr('aria-checked', input.prop('checked'));
                        if (name === 'auto') this.setAuto(input.prop('checked'));
                    });
                    label.on('keydown.tp', e => {
                        if (!['Space', 'Enter'].includes(e.code) || e.repeat) return;
                        e.preventDefault(); e.stopImmediatePropagation(); input.prop('checked', !input.prop('checked')).trigger('change');
                    });
                } else if (type === 'color') {
                    control = this.api.Templates.get('c-color-picker').addClass('tp-field tp-color');
                    input = control.find('input').attr({ id, name }).val(config[name]);
                    control.find('label').attr('for', id).text(text).prependTo(control);
                } else {
                    const number = this.number(name, config[name], attrs);
                    input = number.input.attr('id', id);
                    control = $('<div>').addClass('tp-field').append($('<label>').attr('for', id).text(text), number.control);
                }
                this.fields[name] = input;
                this.configBody.append(control);
            };
            section('Skróty klawiszowe');
            for (const [name, label] of [['manualKey', 'Użyj ręcznie'], ['autoKey', 'Auto / pauza']]) {
                const button = this.button(keyText(this.draft[name]), () => this.openCapture(name));
                this.fields[name] = button;
                this.configBody.append($('<div>').addClass('tp-bind-row').append($('<span>').text(label), button));
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
                this.button('Przywróć domyślne', () => { this.setAuto(false); this.fillConfig(defaults()); }, 'red'),
                this.button('Zapisz', () => this.saveConfig())));
            this.configBody.append($('<div>').addClass('tp-form-note')
                .text('Zmiany zatwierdź przyciskiem Zapisz. Wyłączenie automatu zatrzymuje go od razu.'));
            this.updateScroll();
        }
        setAuto(enabled) {
            if (!this.context()) return;
            this.p.config.auto = enabled;
            if (this.draft) this.draft.auto = enabled;
            if (!enabled) this.q.stop();
            else { this.save(); this.render(); }
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
        openConfig(event) {
            event?.stopPropagation();
            this.fillConfig(this.p.config);
            this.configWindow.show();
            this.configWindow.setWndOnPeak();
            this.fit();
        }
        conflict(name, key, event) {
            if (!keyValid(key) || altGraphOf(event)) return INVALID_KEY;
            if (event?.cancelable === false) return OCCUPIED;
            const other = name === 'manualKey' ? 'autoKey' : 'manualKey';
            if (sameKey(key, this.p.config[other])) return OCCUPIED;
            return gameConflict(key, this.e, event) || '';
        }
        openCapture(name) {
            this.closeCapture();
            const $ = this.$;
            if (!this.bindWindow) {
                const body = $('<div>').addClass('tp-bind-body');
                this.bindFunction = $('<div>').addClass('tp-status');
                this.bindSaved = $('<div>');
                this.bindPreview = $('<div>').addClass('tp-key-preview');
                this.bindError = $('<div>').addClass('tp-key-error').attr({ role: 'status', 'aria-live': 'polite' });
                body.append(this.bindFunction, this.bindSaved, $('<div>').text('Naciśnij wybraną kombinację'),
                    this.bindPreview, this.bindError, $('<div>').addClass('tp-config-actions').append(
                        this.button('Zapisz', () => this.saveCapture()),
                        this.button('Wyczyść', () => { if (this.capture) { this.capture.key = null; this.previewCapture(); } }, 'red'),
                        this.button('Anuluj', () => this.closeCapture())));
                this.bindWindow = this.window('BIND', 'Ustaw skrót klawiszowy', body, 320);
            }
            this.capture = { name, key: structuredClone(this.p.config[name]) };
            this.bindFunction.text(name === 'manualKey' ? 'Użyj ręcznie' : 'Auto / pauza');
            this.bindSaved.text(`Zapisany skrót: ${keyText(this.p.config[name])}`);
            this.previewCapture();
            this.bindWindow.show(); this.bindWindow.setWndOnPeak(); this.fit();
        }
        previewCapture(event) {
            if (!this.capture) return;
            this.bindPreview.text(keyText(this.capture.key));
            this.bindError.text(this.conflict(this.capture.name, this.capture.key, event));
        }
        saveCapture() {
            if (!this.capture || !this.context()) return;
            const { name, key } = this.capture;
            const error = this.conflict(name, key);
            if (error) { this.bindError.text(error); return; }
            this.p.config[name] = structuredClone(key);
            if (this.draft) this.draft[name] = structuredClone(key);
            this.fields[name]?.find('.label').text(keyText(key));
            this.save(); this.closeCapture(); this.render();
        }
        closeCapture() { this.capture = null; this.bindWindow?.hide(); }
        textInput(e) {
            return e.composedPath().some(node => node.matches?.('input, textarea, select, magic_input, [contenteditable]:not([contenteditable="false"]), [role="textbox"]'));
        }
        keyReady() {
            return !this.e.catchChar && !this.e.settings?.getBlockInput?.() && this.loaded() && !this.blocked();
        }
        togglePanel() {
            this.panel.toggle();
            if (this.panel.isShow()) { this.panel.setWndOnPeak(); this.sync(); this.fit(); }
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
                const i = this.hitSlot(e.clientX, e.clientY);
                if (i >= 0) this.drop(i, this.$(drag.source));
            }, true);
            this.listen(this.win.document, 'pointercancel', () => { incoming = null; }, true);
            this.listen(this.win.document, 'keydown', e => {
                if (!this.context() || e.defaultPrevented || this.e.catchChar) return;
                if (e.code === 'AltRight' && altGraphOf(e)) this.altGraph = true;
                const key = { ...keyOf(e), ...((this.altGraph || altGraphOf(e)) ? { altGraph: true } : {}) };
                const swallow = () => { e.preventDefault(); e.stopImmediatePropagation(); };
                if (this.swallowed.has(e.code)) { swallow(); return; }
                if (this.capture) {
                    swallow();
                    this.held.add(e.code);
                    this.swallowed.set(e.code, nativeKey(keyOf(e)));
                    if (MODIFIERS.has(e.code) || e.repeat) return;
                    if (e.code === 'Escape') { this.closeCapture(); return; }
                    this.capture.key = key; this.previewCapture(e); return;
                }
                if (e.repeat || this.held.has(e.code)) return;
                this.held.add(e.code);
                if (key.altGraph) return;
                if (this.textInput(e) || !this.keyReady()) return;
                if (['Space', 'Enter'].includes(e.code) && e.composedPath().some(node => node.matches?.('[role="button"], [role="checkbox"]'))) return;
                const name = sameKey(key, this.p.config.manualKey) ? 'manualKey' : sameKey(key, this.p.config.autoKey) ? 'autoKey' : null;
                if (!name || this.conflict(name, key, e)) return;
                const allowed = name === 'manualKey' ? this.p.state === 'off' && !this.q.flight :
                    this.p.config.auto && (this.p.state === 'active' || !this.q.flight);
                if (!allowed) return;
                this.swallowed.set(e.code, nativeKey(key, e)); swallow();
                if (name === 'manualKey') void this.q.manual(); else void this.q.toggle();
            }, true);
            this.listen(this.win.document, 'keypress', e => {
                if (e.defaultPrevented || this.e.catchChar) return;
                const owned = this.swallowed.has(e.code) || (!e.code && [...this.swallowed.values()].includes(nativeKey(keyOf(e))));
                if (this.capture || owned) { e.preventDefault(); e.stopImmediatePropagation(); }
            }, true);
            this.listen(this.win.document, 'keyup', e => {
                // A key pressed before opening capture still needs its native release.
                const owned = this.swallowed.has(e.code);
                if (!e.defaultPrevented && !this.e.catchChar && (owned || (this.capture && !this.held.has(e.code)))) {
                    e.preventDefault(); e.stopImmediatePropagation();
                }
                this.swallowed.delete(e.code); this.held.delete(e.code);
                if (e.code === 'AltRight') this.altGraph = false;
            }, true);
            this.listen(this.win, 'blur', () => { this.held.clear(); this.swallowed.clear(); this.altGraph = false; });
            this.listen(this.win, 'resize', () => this.fit());
            this.listen(this.win.document, 'visibilitychange', () => { this.held.clear(); this.swallowed.clear(); this.altGraph = false; if (!this.win.document.hidden) this.overlays(); });
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
            this.updateScroll();
            if (this.summary) this.updateNext();
        }
        rebuild() {
            if (!this.context()) return;
            for (const wnd of this.windows) wnd.addToAlertLayer();
            this.sync(); this.fit();
        }
        tick() {
            if (!this.context()) { this.env.restart(); return; }
            if (this.p.state === 'active') {
                const reason = this.blocked();
                if (reason) this.q.pause(reason);
                else if (!this.loaded()) this.q.wait();
                else this.q.ready();
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
            this.items.clear(); this.views.clear(); this.held.clear(); this.swallowed.clear();
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
    root.TeleportQueue = Object.freeze({ boot });
})(globalThis);
