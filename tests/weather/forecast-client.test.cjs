const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('public/weather/assets/forecast.js', 'utf8');

function browser() {
    let now = Date.parse('2026-09-14T15:43:00Z');
    const elements = {};
    const events = {};
    const requests = [];
    const timers = new Map();
    const delays = [];
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
            return elements[id] || (elements[id] = { textContent: '', style: {} });
        },
        addEventListener(name, callback) { events[name] = callback; }
    };
    const window = { addEventListener(name, callback) { events[name] = callback; } };
    vm.runInNewContext(source, {
        Date: Clock, document, XMLHttpRequest: XHR, window,
        setInterval(callback) { tick = callback; },
        setTimeout(callback, delay) { delays.push(delay); const id = nextId++; timers.set(id, callback); return id; },
        clearTimeout(id) { timers.delete(id); }
    });
    return {
        elements, events, requests, timers, delays, document, window,
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

function forecast(changes = {}) {
    return Object.assign({
        issued_at: Date.parse('2026-09-14T15:40:00Z') / 1000,
        stale: false,
        days: [
            { day_start_local: 0, weekday: 'M', low_f: 74, high_f: 103, precip_percent: 0 },
            { day_start_local: 0, weekday: 'T', low_f: 73, high_f: 93, precip_percent: 10 },
            { day_start_local: 0, weekday: 'W', low_f: 75, high_f: 97, precip_percent: 30 },
            { day_start_local: 0, weekday: 'Th', low_f: 73, high_f: 95, precip_percent: 45 },
            { day_start_local: 0, weekday: 'F', low_f: 74, high_f: 93, precip_percent: 20 },
            { day_start_local: 0, weekday: 'S', low_f: 72, high_f: 94, precip_percent: 45 },
            { day_start_local: 0, weekday: 'S', low_f: 74, high_f: 93, precip_percent: 10 }
        ]
    }, changes);
}

test('fills seven columns and leaves today unlabelled', () => {
    const b = browser();
    b.respond(forecast());
    assert.equal(b.elements['fc-w0'].textContent, ' ');
    assert.equal(b.elements['fc-l0'].textContent, '74');
    assert.equal(b.elements['fc-h0'].textContent, '103');
    assert.equal(b.elements['fc-p0'].textContent, '0%');
    assert.equal(b.elements['fc-w3'].textContent, 'Th');
    assert.equal(b.elements['fc-p3'].textContent, '45%');
    assert.equal(b.elements['fc-w6'].textContent, 'S');
    assert.equal(b.elements['fc-h6'].textContent, '93');
});

test('missing days and values show dashes rather than zeroes', () => {
    const b = browser();
    b.respond(forecast({
        days: [{ day_start_local: 0, weekday: 'M', low_f: null, high_f: 103, precip_percent: 0 }]
    }));
    assert.equal(b.elements['fc-l0'].textContent, '--');
    assert.equal(b.elements['fc-h0'].textContent, '103');
    assert.equal(b.elements['fc-p0'].textContent, '0%');
    assert.equal(b.elements['fc-h1'].textContent, '--');
    assert.equal(b.elements['fc-w1'].textContent, ' ');
});

test('polls every fifteen minutes, retries failures sooner, and keeps the last forecast', () => {
    const b = browser();
    b.respond(forecast());
    assert.deepEqual(b.delays, [900000]);
    b.retry();
    b.requests[1].ontimeout();
    assert.equal(b.elements['fc-h0'].textContent, '103');
    assert.deepEqual(b.delays, [900000, 60000]);
    b.retry();
    b.respond(forecast({ issued_at: Date.parse('2026-09-14T15:41:00Z') / 1000, days: forecast().days.map((d) => Object.assign({}, d, { high_f: 80 })) }));
    assert.equal(b.elements['fc-h0'].textContent, '80');
});

test('rejects malformed payloads and stale out-of-order responses', () => {
    const b = browser();
    b.respond(forecast());
    b.retry();
    b.respond({ error: 'unavailable' }, 503);
    assert.equal(b.elements['fc-h0'].textContent, '103');
    b.retry();
    b.respond('<html>nope</html>');
    assert.equal(b.elements['fc-h0'].textContent, '103');
    b.retry();
    // An older forecast arriving late must not replace a newer one.
    b.respond(forecast({ issued_at: Date.parse('2026-09-14T15:00:00Z') / 1000, days: forecast().days.map((d) => Object.assign({}, d, { high_f: 1 })) }));
    assert.equal(b.elements['fc-h0'].textContent, '103');
});

test('uses the dedicated API, a 20-second timeout, and ES5 syntax', () => {
    const b = browser();
    assert.equal(b.requests[0].url, '/weather/api/forecast');
    assert.equal(b.requests[0].timeout, 20000);
    require('acorn').parse(source, { ecmaVersion: 5 });
});

test('pauses while hidden, resumes on wake, and recovers a request lost to sleep', () => {
    const b = browser();
    b.respond(forecast());
    b.document.hidden = true;
    b.events.visibilitychange();
    assert.equal(b.timers.size, 0);
    b.document.hidden = false;
    b.events.visibilitychange();
    assert.equal(b.requests.length, 2);
    const sleeping = b.requests[1];
    b.advance(3600000);
    assert.equal(sleeping.aborted, true);
    assert.equal(b.requests.length, 3);
});

test('reports an unavailable forecast only when nothing has ever loaded', () => {
    const b = browser();
    assert.equal(b.window.weatherForecast.status(), '');
    b.requests[0].ontimeout();
    assert.match(b.window.weatherForecast.status(), /unavailable/i);
    b.retry();
    b.respond(forecast());
    assert.equal(b.window.weatherForecast.status(), '');
});
