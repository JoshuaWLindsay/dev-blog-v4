const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('public/weather/assets/landscape.js', 'utf8');

function browser(time = '2026-09-14T16:47:00Z') {
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
                textContent: '', style: {},
                setAttribute(name, value) { this[name] = value; }
            });
        },
        addEventListener(name, callback) { events[name] = callback; }
    };
    vm.runInNewContext(source, {
        Date: Clock, document, XMLHttpRequest: XHR,
        window: { addEventListener(name, callback) { events[name] = callback; } },
        setInterval(callback) { tick = callback; },
        setTimeout(callback, delay) { assert.equal(delay, 5000); const id = nextId++; timers.set(id, callback); return id; },
        clearTimeout(id) { timers.delete(id); }
    });
    return {
        elements, events, requests, timers,
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
        observed_at: Date.parse('2026-09-14T16:47:00Z') / 1000,
        temperature_f: 85.4, raining: false, wind_direction: 'WSW', wind_mph: 3.4,
        rain_today_in: 0, rain_yesterday_in: 0.34,
        lightning_last_epoch: Date.parse('2026-09-11T16:47:00Z') / 1000,
        lightning_distance_miles: 25.3, lightning_count_3hr: 123, stale: false
    }, extra);
}

test('renders every region of the landscape layout', () => {
    const b = browser();
    b.respond(weather());
    assert.equal(b.elements.clock.textContent, '11:47');
    assert.equal(b.elements.day.textContent, 'Monday');
    assert.equal(b.elements.date.textContent, 'September 14');
    assert.equal(b.elements.temperature.textContent, '85.4');
    assert.equal(b.elements.rain.textContent, 'NO RAIN');
    assert.equal(b.elements['rain-yesterday'].textContent, '0.34');
    assert.equal(b.elements['rain-today'].textContent, '0.00');
    assert.equal(b.elements.lightning.textContent, 'LIGHTNING');
    assert.equal(b.elements['lightning-count'].textContent, '123');
    assert.equal(b.elements['lightning-distance'].textContent, '25 miles');
    assert.equal(b.elements['lightning-last'].textContent, '3D');
    assert.equal(b.elements.status.textContent, '');
});

test('compact elapsed covers every scale and a station that has never detected a strike', () => {
    const cases = [
        [30, 'NOW'], [45 * 60, '45M'], [6 * 3600, '6H'], [3 * 86400, '3D']
    ];
    for (const [ago, expected] of cases) {
        const b = browser();
        b.respond(weather({ lightning_last_epoch: Date.parse('2026-09-14T16:47:00Z') / 1000 - ago }));
        assert.equal(b.elements['lightning-last'].textContent, expected);
    }
    const never = browser();
    never.respond(weather({ lightning_last_epoch: 0 }));
    assert.equal(never.elements['lightning-last'].textContent, 'NONE');
});

test('a quiet three hours reads as no lightning, and rain headlines when it rains', () => {
    const quiet = browser();
    quiet.respond(weather({ lightning_count_3hr: 0 }));
    assert.equal(quiet.elements.lightning.textContent, 'NO LIGHTNING');
    assert.equal(quiet.elements['lightning-count'].textContent, '0');
    const wet = browser();
    wet.respond(weather({ raining: true }));
    assert.equal(wet.elements.rain.textContent, 'RAIN');
});

test('missing readings show dashes rather than zeroes', () => {
    const b = browser();
    b.respond(weather({
        temperature_f: null, raining: null, rain_today_in: null,
        rain_yesterday_in: null, lightning_count_3hr: null,
        lightning_distance_miles: null, lightning_last_epoch: null
    }));
    assert.equal(b.elements.temperature.textContent, '--.-');
    assert.equal(b.elements.rain.textContent, '--');
    assert.equal(b.elements['rain-today'].textContent, '--');
    assert.equal(b.elements.lightning.textContent, '--');
    assert.equal(b.elements['lightning-distance'].textContent, '--');
    assert.equal(b.elements['lightning-last'].textContent, '--');
});

test('shares the observation API, its cadence, a 20-second timeout and ES5 syntax', () => {
    const b = browser();
    assert.equal(b.requests[0].url, '/weather/api');
    assert.equal(b.requests[0].timeout, 20000);
    require('acorn').parse(source, { ecmaVersion: 5 });
});

test('keeps readings during failure, warns with a readable age, and recovers', () => {
    const b = browser();
    b.respond(weather());
    b.retry();
    b.requests[1].ontimeout();
    assert.equal(b.elements.temperature.textContent, '85.4');
    assert.match(b.elements.status.textContent, /out of date/);
    b.retry();
    b.respond(weather({ temperature_f: 99 }));
    assert.equal(b.elements.temperature.textContent, '99.0');
    assert.equal(b.elements.status.textContent, '');
    b.advance(301000);
    assert.match(b.elements.status.textContent, /5 minutes ago/);
});

test('the clock advances without a fetch', () => {
    const b = browser();
    b.respond(weather());
    b.advance(60000);
    assert.equal(b.elements.clock.textContent, '11:48');
    assert.equal(b.requests.length, 1);
});

test('a request suspended by sleep cannot block recovery or overwrite newer readings', () => {
    const b = browser();
    const sleeping = b.requests[0];
    b.advance(3600000);
    assert.equal(sleeping.aborted, true);
    assert.equal(b.requests.length, 2);
    b.respond(weather({ temperature_f: 80, observed_at: Date.parse('2026-09-14T17:47:00Z') / 1000 }));
    sleeping.status = 200;
    sleeping.responseText = JSON.stringify(weather({ temperature_f: 1 }));
    sleeping.onload();
    assert.equal(b.elements.temperature.textContent, '80.0');
});

test('an older observation arriving on a later poll is ignored', () => {
    const b = browser();
    b.respond(weather({ temperature_f: 80, observed_at: Date.parse('2026-09-14T17:47:00Z') / 1000 }));
    b.retry();
    b.respond(weather({ temperature_f: 1 }));
    assert.equal(b.elements.temperature.textContent, '80.0');
});
