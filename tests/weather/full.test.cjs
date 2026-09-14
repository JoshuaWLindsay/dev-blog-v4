const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('public/weather/assets/full.js', 'utf8');

function browser() {
    let now = Date.parse('2026-09-13T15:43:00Z');
    const attributes = {
        'full-air_temperature': { 'data-digits': '1' },
        'full-wind_direction': { 'data-format': 'direction' },
        'full-lightning_strike_last_epoch': { 'data-format': 'elapsed' },
        'full-pressure_trend': { 'data-format': 'trend' },
        'full-precip': { 'data-digits': '3' }
    };
    const elements = {};
    const events = {};
    const requests = [];
    const timers = new Map();
    let tick;
    let nextId = 1;
    class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } }
    function XHR() { requests.push(this); }
    XHR.prototype.open = function(method, url) { this.url = url; };
    XHR.prototype.send = function() {};
    XHR.prototype.abort = function() { this.aborted = true; this.onabort(); };
    const document = {
        body: {}, documentElement: {}, hidden: false,
        getElementById(id) {
            if (id.indexOf('full-') === 0 && !attributes[id]) return null;
            return elements[id] || (elements[id] = {
                textContent: '', hidden: true,
                getAttribute(name) { return (attributes[id] || {})[name] || null; },
                addEventListener(name, handler) { events[id + ':' + name] = handler; }
            });
        },
        addEventListener(name, handler) { events[name] = handler; }
    };
    vm.runInNewContext(source, {
        Date: Clock, document, XMLHttpRequest: XHR,
        window: {addEventListener(name, handler) { events[name] = handler; }},
        setInterval(fn) { tick = fn; },
        setTimeout(fn, delay) { assert.equal(delay, 5000); const id = nextId++; timers.set(id, fn); return id; },
        clearTimeout(id) { timers.delete(id); }
    });
    return {
        document, elements, events, requests, timers,
        advance(ms) { now += ms; tick(); },
        respond(data, status = 200) {
            const req = requests[requests.length - 1];
            req.status = status;
            req.responseText = JSON.stringify(data);
            req.onload();
        },
        retry() { const [id, fn] = timers.entries().next().value; timers.delete(id); fn(); }
    };
}
function sample() {
    return {observed_at: Date.parse('2026-09-13T15:43:00Z') / 1000, stale: false, groups: [{id:'temperature', metrics:[
        {key:'air_temperature', value:91.9}, {key:'wind_direction', value:135},
        {key:'lightning_strike_last_epoch', value:0}, {key:'pressure_trend', value:'Rising'},
        {key:'precip', value:0}, {key:'unknown', value:'<script>alert(1)</script>'}
    ]}]};
}
test('renders full readings, units, missing values and Central Time', () => {
    const b = browser();
    b.respond(sample());
    assert.equal(b.elements['full-air_temperature'].textContent, '91.9');
    assert.equal(b.elements['full-wind_direction'].textContent, 'SE · 135°');
    assert.equal(b.elements['full-lightning_strike_last_epoch'].textContent, 'None reported');
    assert.equal(b.elements['full-precip'].textContent, '0.000');
    assert.equal(b.elements['full-pressure_trend'].textContent, 'Rising');
    assert.equal(b.elements.clock.textContent, '10:43 AM');
    assert.equal(b.elements.date.textContent, 'Sunday, September 13');
    assert.equal(b.elements.connection.textContent, 'Live');
    const missing = sample(); missing.groups[0].metrics[0].value = null;
    b.retry(); b.respond(missing);
    assert.equal(b.elements['full-air_temperature'].textContent, '—');
});
test('five-second polling retains readings during timeouts and recovers', () => {
    const b = browser(); b.respond(sample()); b.retry();
    assert.equal(b.requests[1].url, '/weather/api/full');
    b.requests[1].ontimeout();
    assert.equal(b.elements['full-air_temperature'].textContent, '91.9');
    assert.match(b.elements.connection.textContent, /out of date/);
    b.retry(); b.respond(sample());
    assert.equal(b.elements.connection.textContent, 'Live');
    b.advance(301000);
    assert.match(b.elements.connection.textContent, /out of date/);
});
test('startup errors and malformed responses retry without destroying the display', () => {
    const b = browser(); b.respond({error:'unavailable'}, 503);
    assert.equal(b.elements.connection.textContent, 'Weather unavailable');
    b.retry(); b.respond(sample()); b.retry();
    b.respond({observed_at:1700000000, groups:[null]});
    assert.equal(b.elements['full-air_temperature'].textContent, '91.9');
    assert.match(b.elements.connection.textContent, /out of date/);
});
test('sleep recovery aborts old requests and ignores late results', () => {
    const b = browser(); const old = b.requests[0];
    b.advance(3600000);
    assert.equal(old.aborted, true);
    assert.equal(b.requests.length, 2);
    b.respond(sample());
    old.status = 200; old.responseText = JSON.stringify({error:'late'}); old.onload();
    assert.equal(b.elements['full-air_temperature'].textContent, '91.9');
    assert.equal(b.timers.size, 1);
});
test('old Safari gets ES5 code and no unsupported fullscreen control', () => {
    const b = browser();
    require('acorn').parse(source, {ecmaVersion:5});
    assert.equal(b.elements.fullscreen.hidden, true);
    assert.equal(b.events['fullscreen:click'], undefined);
    assert.equal(b.requests[0].timeout, 20000);
});
