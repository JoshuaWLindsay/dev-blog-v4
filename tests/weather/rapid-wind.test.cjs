const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const rapid = fs.readFileSync('public/weather/assets/rapid-wind.js', 'utf8');
const tablet = fs.readFileSync('public/weather/assets/tablet.js', 'utf8');
function browser() {
    let now = Date.parse('2026-09-13T02:00:00Z');
    const elements = {}, events = {}, requests = [], timers = new Map(), intervals = [];
    let nextId = 0;
    class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } }
    function on(name, fn) { (events[name] || (events[name] = [])).push(fn); }
    function XHR() { requests.push(this); }
    XHR.prototype.open = function(method, url) { this.url = url; };
    XHR.prototype.send = function() {};
    XHR.prototype.abort = function() { this.aborted = true; this.onabort(); };
    const document = {hidden: false, addEventListener: on, getElementById(id) {
        return elements[id] || (elements[id] = {textContent: '', style: {}, clientWidth: 720, scrollWidth: 720, setAttribute(key, value) {this[key] = value;}});
    }};
    const context = vm.createContext({Date: Clock, XMLHttpRequest: XHR, document,
        window: {innerWidth: 768, innerHeight: 1024, addEventListener: on},
        setInterval(fn) {intervals.push(fn);},
        setTimeout(fn, delay) {const id = ++nextId; timers.set(id, {fn, delay}); return id;},
        clearTimeout(id) {timers.delete(id);}
    });
    vm.runInContext(rapid, context);
    vm.runInContext(tablet, context);
    return {elements, requests, timers, document, now: () => now,
        advance(ms) {now += ms; intervals.forEach(fn => fn());},
        event(name) {events[name].forEach(fn => fn());},
        respond(url, data, status = 200, request) {
            const xhr = request || requests.filter(r => r.url === url).at(-1);
            xhr.status = status; xhr.responseText = JSON.stringify(data); xhr.onload();
        },
        retry() {const [id, timer] = timers.entries().next().value; timers.delete(id); timer.fn();},
        weather(extra = {}) { return {observed_at: now / 1000, temperature_f: 87.1, raining: false, wind_mph: 2.7, wind_direction: 'SE', stale: false, ...extra}; },
        wind(extra = {}) { return {observed_at: now / 1000, wind_mph: 2.1, wind_direction: 'S', ...extra}; }
    };
}

test('main dashboard uses rapid speed and direction without changing other weather values', () => {
    const b = browser();
    b.respond('/weather/api', b.weather());
    assert.equal(b.elements.wind.textContent, 'SE 2.7 mph');
    assert.match(b.elements.status.textContent, /one-minute average/);
    b.respond('/weather/api/wind', b.wind());
    b.advance(1000);
    assert.equal(b.elements.wind.textContent, 'S 2.1 mph');
    assert.equal(b.elements.temperature.textContent, '87.1');
    assert.equal(b.elements.status.textContent, '');
    b.event('online');
    b.respond('/weather/api', b.weather({wind_mph: 9}));
    assert.equal(b.elements.wind.textContent, 'S 2.1 mph');
});

test('five-second rapid cadence includes network latency', () => {
    const b = browser();
    b.advance(3000);
    b.respond('/weather/api/wind', b.wind());
    assert.equal([...b.timers.values()][0].delay, 2000);
    b.retry();
    assert.equal(b.requests.filter(r => r.url === '/weather/api/wind').length, 2);
});

test('expired wind falls back explicitly and fresh zero readings recover', () => {
    const b = browser();
    b.respond('/weather/api', b.weather());
    b.respond('/weather/api/wind', b.wind());
    b.advance(16000);
    assert.equal(b.elements.wind.textContent, 'SE 2.7 mph');
    assert.match(b.elements.status.textContent, /Live wind unavailable/);
    b.event('online');
    b.respond('/weather/api/wind', b.wind({wind_mph: 0, wind_direction: null}));
    b.advance(1000);
    assert.equal(b.elements.wind.textContent, '-- 0.0 mph');
    assert.equal(b.elements.status.textContent, '');
});

test('hidden and sleeping requests are cancelled; late frames cannot overwrite new readings', () => {
    const b = browser();
    const old = b.requests[0];
    b.document.hidden = true;
    b.event('visibilitychange');
    assert.equal(old.aborted, true);
    b.document.hidden = false;
    b.event('visibilitychange');
    b.respond('/weather/api', b.weather());
    b.respond('/weather/api/wind', b.wind({wind_mph: 4}));
    b.respond('/weather/api/wind', b.wind({wind_mph: 99}), 200, old);
    assert.equal(b.elements.wind.textContent, 'S 4.0 mph');
    b.event('online');
    const sleeping = b.requests.filter(r => r.url === '/weather/api/wind').at(-1);
    b.advance(21000);
    assert.equal(sleeping.aborted, true);
});

test('malformed, stale, and failed wind responses retry without claiming live readings', () => {
    const b = browser();
    b.respond('/weather/api', b.weather());
    b.respond('/weather/api/wind', b.wind({observed_at: b.now() / 1000 - 60}));
    b.advance(1000);
    assert.match(b.elements.status.textContent, /one-minute average/);
    b.event('online');
    b.respond('/weather/api/wind', {error: 'Unavailable'}, 503);
    b.advance(1000);
    assert.equal(b.elements.wind.textContent, 'SE 2.7 mph');
    require('acorn').parse(rapid, {ecmaVersion: 5});
    assert.doesNotMatch(rapid, /ws\.weatherflow|WEATHERFLOW_TOKEN/);
});
