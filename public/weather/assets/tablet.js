/* Deliberately ES5: no modules, fetch, promises, arrow functions or polyfills. */
(function () {
    'use strict';
    var latest = null;
    var failed = false;
    var pending = false;
    var requestStarted = 0;
    var cancelRequest;
    var timer;
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    function put(id, value) { document.getElementById(id).textContent = value; }
    function valid(value) { return typeof value === 'number' && isFinite(value); }
    function pad(value) { return value < 10 ? '0' + value : String(value); }

    // US Central time using current US DST rules. No Intl dependency on old iPads.
    function centralTime(now) {
        var year = now.getUTCFullYear();
        var marchSunday = 1 + (7 - new Date(Date.UTC(year, 2, 1)).getUTCDay()) % 7;
        var novemberSunday = 1 + (7 - new Date(Date.UTC(year, 10, 1)).getUTCDay()) % 7;
        var start = Date.UTC(year, 2, marchSunday + 7, 8);
        var end = Date.UTC(year, 10, novemberSunday, 7);
        var offset = now.getTime() >= start && now.getTime() < end ? 5 : 6;
        return new Date(now.getTime() - offset * 3600000);
    }

    function age(epoch) {
        if (!valid(epoch)) { return '--'; }
        if (epoch <= 0) { return 'None'; }
        var seconds = Math.max(0, Math.floor(new Date().getTime() / 1000 - epoch));
        if (seconds < 60) { return 'Just now'; }
        var value = Math.floor(seconds / 60);
        var unit = 'minute';
        if (seconds >= 3600) { value = Math.floor(seconds / 3600); unit = 'hour'; }
        if (seconds >= 86400) { value = Math.floor(seconds / 86400); unit = 'day'; }
        return value + ' ' + unit + (value === 1 ? '' : 's');
    }

    function tick() {
        var now = new Date();
        var local = centralTime(now);
        put('clock', (local.getUTCHours() % 12 || 12) + ':' + pad(local.getUTCMinutes()));
        put('date', days[local.getUTCDay()] + '  ' + months[local.getUTCMonth()] + ' ' + local.getUTCDate());
        if (latest) {
            put('lightning-last', age(latest.lightning_last_epoch));
            var stale = latest.stale || failed || now.getTime() / 1000 - latest.observed_at > 300;
            put('status', stale ? 'Weather may be out of date. Last reading ' + age(latest.observed_at).toLowerCase() + ' ago. Retrying...' : '');
        }
        fitDate();
        // Safari can suspend XHR timeout delivery while the tablet sleeps.
        if (pending && now.getTime() - requestStarted >= 20000) { refresh(); }
    }

    function render(data) {
        put('temperature', valid(data.temperature_f) ? data.temperature_f.toFixed(1) : '--.-');
        document.getElementById('temperature').setAttribute('aria-label', valid(data.temperature_f) ? data.temperature_f.toFixed(1) + ' degrees Fahrenheit' : 'Temperature unavailable');
        put('rain', data.raining === true ? 'YES' : data.raining === false ? 'NONE' : '--');
        put('wind', (data.wind_direction || '--') + ' ' + (valid(data.wind_mph) ? data.wind_mph.toFixed(1) : '--') + ' mph');
        put('lightning-distance', valid(data.lightning_distance_miles) ? data.lightning_distance_miles.toFixed(1) + ' miles' : '--');
        put('lightning-count', valid(data.lightning_count_3hr) ? String(data.lightning_count_3hr) : '--');
        tick();
    }

    function refresh() {
        if (pending) {
            if (new Date().getTime() - requestStarted < 20000) { return; }
            cancelRequest();
        }
        clearTimeout(timer);
        pending = true;
        requestStarted = new Date().getTime();
        var xhr = new XMLHttpRequest();
        var finished = false;
        function complete(ok) {
            if (finished) { return; }
            finished = true;
            pending = false;
            failed = !ok;
            if (!latest) { put('status', 'Weather unavailable. Retrying automatically...'); }
            tick();
            timer = setTimeout(refresh, 60000);
        }
        cancelRequest = function () { complete(false); xhr.abort(); };
        xhr.onload = function () {
            if (finished) { return; }
            if (xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    if (!data || !valid(data.observed_at)) { complete(false); return; }
                    latest = data;
                    failed = false;
                    render(data);
                    complete(true);
                    return;
                } catch (ignore) { /* Keep the previous observation visible. */ }
            }
            complete(false);
        };
        xhr.onerror = xhr.ontimeout = xhr.onabort = function () { complete(false); };
        try {
            xhr.open('GET', '/weather/api', true);
            xhr.timeout = 20000;
            xhr.send();
        } catch (ignore) { complete(false); }
    }

    function fitDate() {
        var element = document.getElementById('date');
        var landscape = window.innerWidth > window.innerHeight;
        var size = landscape ? window.innerHeight * 0.065 : Math.min(window.innerWidth, window.innerHeight * 0.75) * 0.078;
        element.style.fontSize = size + 'px';
        // September / Wednesday must fit just as well as shorter dates.
        if (element.scrollWidth > element.clientWidth) {
            element.style.fontSize = Math.floor(size * element.clientWidth / element.scrollWidth) + 'px';
        }
    }

    document.addEventListener('visibilitychange', function () { if (!document.hidden) { tick(); refresh(); } });
    window.addEventListener('pageshow', function () { tick(); refresh(); });
    window.addEventListener('online', refresh);
    window.addEventListener('resize', fitDate);
    tick();
    setInterval(tick, 1000);
    refresh();
}());
