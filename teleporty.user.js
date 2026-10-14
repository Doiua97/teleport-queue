// ==UserScript==
// @name         Margonem NI — Teleporty
// @namespace    https://github.com/Doiua97/teleport-queue
// @version      0.1.4
// @description  60 skrótów do teleportów, kolejka ręczna i tryb czasowy.
// @author       Doiua
// @match        https://*.margonem.pl/*
// @match        https://*.margonem.com/*
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/Doiua97/teleport-queue/main/teleporty.user.js
// @downloadURL  https://raw.githubusercontent.com/Doiua97/teleport-queue/main/teleporty.user.js
// @require      https://raw.githubusercontent.com/Doiua97/teleport-queue/c9c9f41797794d8b2e20905004c929fbfc4d626e/teleporty.core.js?v=0.1.4
// @resource     tp_css https://raw.githubusercontent.com/Doiua97/teleport-queue/c9c9f41797794d8b2e20905004c929fbfc4d626e/teleporty.css?v=0.1.4
// @resource     tp_icon https://raw.githubusercontent.com/Doiua97/teleport-queue/c9c9f41797794d8b2e20905004c929fbfc4d626e/assets/widget.png?v=0.1.4
// @grant        unsafeWindow
// @grant        GM_getResourceText
// @grant        GM_getResourceURL
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(() => {
    'use strict';
    globalThis.TeleportQueue.boot({
        win: unsafeWindow,
        css: () => GM_addStyle(GM_getResourceText('tp_css')),
        icon: GM_getResourceURL('tp_icon'),
        get: (key, value) => GM_getValue(key, value),
        set: (key, value) => GM_setValue(key, value)
    });
})();
