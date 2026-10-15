const fs = require('node:fs');
const path = require('node:path');

// Expose closure internals only in the source evaluated by the tests.
// The installed core publishes only its boot function.
module.exports = function coreSource(file = path.resolve(__dirname, '../teleporty.core.js')) {
    const source = fs.readFileSync(file, 'utf8');
    const end = source.lastIndexOf('})(globalThis);');
    if (end < 0) throw new Error('Nie znaleziono końca modułu Teleportów.');
    return source.slice(0, end) + `root.TeleportQueue = Object.freeze({
        boot, Queue, App, load, defaults, cooldown, teleport, readyItem, needsTarget,
        sameKey, keyOf, advance, profileKey, matches, ready, groupKey, groupOf,
        destination, gameConflict, nativeKey, cooldownText
    });\n` + source.slice(end);
};
