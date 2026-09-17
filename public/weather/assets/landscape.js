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

    function put(id, value) {
        var element = document.getElementById(id);
        if (element) { element.textContent = value; }
    }
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

    // Compact form for the detail row: NOW, 45M, 6H, 3D.
    function elapsed(epoch) {
        if (!valid(epoch)) { return '--'; }
        if (epoch <= 0) { return 'NONE'; }
        var seconds = Math.max(0, Math.floor(new Date().getTime() / 1000 - epoch));
        if (seconds < 60) { return 'NOW'; }
        if (seconds < 3600) { return Math.floor(seconds / 60) + 'M'; }
        if (seconds < 86400) { return Math.floor(seconds / 3600) + 'H'; }
        return Math.floor(seconds / 86400) + 'D';
    }

    function longElapsed(epoch) {
        if (!valid(epoch) || epoch <= 0) { return 'unknown'; }
        var seconds = Math.max(0, Math.floor(new Date().getTime() / 1000 - epoch));
        if (seconds < 60) { return 'just now'; }
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
        put('day', days[local.getUTCDay()]);
        put('date', months[local.getUTCMonth()] + ' ' + local.getUTCDate());
        if (latest) {
            put('lightning-last', elapsed(latest.lightning_last_epoch));
            var stale = latest.stale || failed || now.getTime() / 1000 - latest.observed_at > 300;
            var windStatus = window.weatherRapidWind ? window.weatherRapidWind.render(latest) : '';
            var forecastStatus = window.weatherForecast ? window.weatherForecast.status() : '';
            put('status', stale ? 'Weather may be out of date. Last reading ' + longElapsed(latest.observed_at) + ' ago. Retrying...' : windStatus || forecastStatus);
        }
    }

    function render(data) {
        var temperature = document.getElementById('temperature');
        temperature.textContent = valid(data.temperature_f) ? data.temperature_f.toFixed(1) : '--.-';
        temperature.setAttribute('aria-label', valid(data.temperature_f) ? data.temperature_f.toFixed(1) + ' degrees Fahrenheit' : 'Temperature unavailable');
        put('rain', data.raining === true ? 'RAIN' : data.raining === false ? 'NO RAIN' : '--');
        put('rain-yesterday', valid(data.rain_yesterday_in) ? data.rain_yesterday_in.toFixed(2) : '--');
        put('rain-today', valid(data.rain_today_in) ? data.rain_today_in.toFixed(2) : '--');
        // Strikes in the last three hours decide the headline, as rain does above.
        put('lightning', valid(data.lightning_count_3hr) ? (data.lightning_count_3hr > 0 ? 'LIGHTNING' : 'NO LIGHTNING') : '--');
        put('lightning-count', valid(data.lightning_count_3hr) ? String(data.lightning_count_3hr) : '--');
        // The provider reports one distance, not a range; it is shown unchanged.
        put('lightning-distance', valid(data.lightning_distance_miles) ? data.lightning_distance_miles.toFixed(0) + ' miles' : '--');
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
            timer = setTimeout(refresh, 5000);
        }
        cancelRequest = function () { complete(false); xhr.abort(); };
        xhr.onload = function () {
            if (finished) { return; }
            if (xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    if (!data || !valid(data.observed_at)) { complete(false); return; }
                    if (latest && data.observed_at < latest.observed_at) { complete(true); return; }
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

    document.addEventListener('visibilitychange', function () { if (!document.hidden) { tick(); refresh(); } });
    window.addEventListener('pageshow', function () { tick(); refresh(); });
    window.addEventListener('online', refresh);
    tick();
    setInterval(function () {
        tick();
        // Safari can suspend XHR timeout delivery while the tablet sleeps.
        if (pending && new Date().getTime() - requestStarted >= 20000) { refresh(); }
    }, 1000);
    refresh();
}());
