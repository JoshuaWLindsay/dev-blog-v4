const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('public/weather/assets/tablet.js', 'utf8');

function browser(time = '2026-09-12T15:43:00Z') {
    let now = Date.parse(time);
    const elements = {};
    const events = {};
    const requests = [];
    const timers = new Map();
    let tick;
    let nextId = 1;
    class Clock extends Date {
        constructor(...args) { super(...(args.length ? args : [now])); }
    }
    function XHR() { requests.push(this); }
    XHR.prototype.open = function (method, url) { this.method = method; this.url = url; };
    XHR.prototype.send = function () {};
    XHR.prototype.abort = function () { this.aborted = true; if (this.onabort) this.onabort(); };
    const document = {
        hidden: false,
        getElementById(id) {
            return elements[id] || (elements[id] = {
                textContent: '', style: {}, clientWidth: 720, scrollWidth: 720,
                setAttribute(name, value) { this[name] = value; }
            });
        },
        addEventListener(name, callback) { events[name] = callback; }
    };
    vm.runInNewContext(source, {
        Date: Clock, document, XMLHttpRequest: XHR,
        window: { innerWidth: 768, innerHeight: 1024,
            addEventListener(name, callback) { events[name] = callback; } },
        setInterval(callback) { tick = callback; },
        setTimeout(callback, delay) { assert.equal(delay, 5000); const id = nextId++; timers.set(id, callback); return id; },
        clearTimeout(id) { timers.delete(id); }
    });
    return {
        elements, events, requests, document, timers,
        advance(ms) { now += ms; tick(); },
        respond(data, status = 200) {
            const request = requests[requests.length - 1];
            request.status = status;
            request.responseText = typeof data === 'string' ? data : JSON.stringify(data);
            request.onload();
        },
        retry() { const [id, callback] = timers.entries().next().value; timers.delete(id); callback(); }
    };
}

function weather(extra = {}) {
    return Object.assign({
        observed_at: Date.parse('2026-09-12T15:43:00Z') / 1000,
        temperature_f: 102.7, raining: false, wind_direction: 'WSW', wind_mph: 4.7,
        lightning_last_epoch: Date.parse('2026-09-11T23:43:00Z') / 1000,
        lightning_distance_miles: 21.5, lightning_count_3hr: 124, stale: false
    }, extra);
}

test('formats the dashboard with a one-line date and advances the clock without a fetch', () => {
    const b = browser();
    b.respond(weather());
    assert.equal(b.elements.temperature.textContent, '102.7');
    assert.equal(b.elements.rain.textContent, 'NO RAIN');
    assert.equal(b.elements.wind.textContent, 'WSW 4.7 mph');
    assert.equal(b.elements.clock.textContent, '10:43');
    assert.equal(b.elements.day.textContent, 'Saturday');
    assert.equal(b.elements.date.textContent, 'September 12');
    assert.equal(b.elements.status.textContent, '');
    b.advance(60000);
    assert.equal(b.elements.clock.textContent, '10:44');
    assert.equal(b.requests.length, 1);
});

test('Central Time changes correctly at both DST boundaries and midnight', () => {
    const spring = browser('2026-03-08T07:59:00Z');
    assert.equal(spring.elements.clock.textContent, '1:59');
    spring.advance(60000);
    assert.equal(spring.elements.clock.textContent, '3:00');
    const fall = browser('2026-11-01T06:59:00Z');
    assert.equal(fall.elements.clock.textContent, '1:59');
    fall.advance(60000);
    assert.equal(fall.elements.clock.textContent, '1:00');
    const midnight = browser('2026-09-13T04:59:00Z');
    midnight.advance(60000);
    assert.equal(midnight.elements.clock.textContent, '12:00');
    assert.equal(midnight.elements.day.textContent, 'Sunday');
    assert.equal(midnight.elements.date.textContent, 'September 13');
});

test('keeps readings during failure, warns, retries, and recovers', () => {
    const b = browser();
    b.respond(weather());
    b.retry();
    b.requests[1].ontimeout();
    assert.equal(b.elements.temperature.textContent, '102.7');
    assert.match(b.elements.status.textContent, /out of date/);
    b.retry();
    b.respond(weather({temperature_f: 99}));
    assert.equal(b.elements.temperature.textContent, '99.0');
    assert.equal(b.elements.status.textContent, '');
    b.advance(301000);
    assert.match(b.elements.status.textContent, /out of date/);
});

test('first-load errors recover and malformed data is rejected', () => {
    const b = browser();
    b.respond('<html>Unavailable</html>', 503);
    assert.match(b.elements.status.textContent, /unavailable/);
    b.retry();
    b.respond({error: 'bad payload'});
    assert.match(b.elements.status.textContent, /unavailable/);
    b.retry();
    b.respond(weather());
    assert.equal(b.elements.status.textContent, '');
});

test('wake and online events refresh without overlapping requests', () => {
    const b = browser();
    b.events.pageshow();
    b.events.online();
    assert.equal(b.requests.length, 1);
    b.respond(weather());
    b.events.visibilitychange();
    assert.equal(b.requests.length, 2);
    assert.equal(b.timers.size, 0);
    b.respond(weather());
    assert.equal(b.timers.size, 1);
});

test('distinguishes missing readings from measured zeroes', () => {
    const b = browser();
    b.respond(weather({temperature_f: null, raining: null, wind_mph: 0,
        lightning_last_epoch: 0, lightning_distance_miles: null, lightning_count_3hr: 0}));
    assert.equal(b.elements.temperature.textContent, '--.-');
    assert.equal(b.elements.rain.textContent, '--');
    assert.equal(b.elements.wind.textContent, 'WSW 0.0 mph');
});

test('uses the dedicated API, a 20-second timeout, and ES5 syntax', () => {
    const b = browser();
    assert.equal(b.requests[0].url, '/weather/api');
    assert.equal(b.requests[0].timeout, 20000);
    require('acorn').parse(source, {ecmaVersion: 5});
});

test('a request suspended by sleep cannot block recovery or overwrite newer readings', () => {
    const b = browser();
    const sleeping = b.requests[0];
    b.advance(3600000);
    assert.equal(sleeping.aborted, true);
    assert.equal(b.requests.length, 2);
    b.respond(weather({temperature_f: 80, observed_at: Date.parse('2026-09-12T16:43:00Z') / 1000}));
    sleeping.status = 200;
    sleeping.responseText = JSON.stringify(weather({temperature_f: 1}));
    sleeping.onload();
    assert.equal(b.elements.temperature.textContent, '80.0');
    assert.equal(b.elements.status.textContent, '');
    assert.equal(b.timers.size, 1);
});
