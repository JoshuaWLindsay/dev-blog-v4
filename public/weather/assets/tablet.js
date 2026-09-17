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
        put('day', days[local.getUTCDay()]);
        put('date', months[local.getUTCMonth()] + ' ' + local.getUTCDate());
        if (latest) {
            var stale = latest.stale || failed || now.getTime() / 1000 - latest.observed_at > 300;
            var windStatus = window.weatherRapidWind ? window.weatherRapidWind.render(latest) : '';
            // The live observation outranks wind, which outranks the slow forecast.
            var forecastStatus = window.weatherForecast ? window.weatherForecast.status() : '';
            put('status', stale ? 'Weather may be out of date. Last reading ' + age(latest.observed_at).toLowerCase() + ' ago. Retrying...' : windStatus || forecastStatus);
        }
        fitDisplay();
        // Safari can suspend XHR timeout delivery while the tablet sleeps.
        if (pending && now.getTime() - requestStarted >= 20000) { refresh(); }
    }

    function render(data) {
        put('temperature', valid(data.temperature_f) ? data.temperature_f.toFixed(1) : '--.-');
        document.getElementById('temperature').setAttribute('aria-label', valid(data.temperature_f) ? data.temperature_f.toFixed(1) + ' degrees Fahrenheit' : 'Temperature unavailable');
        put('rain', data.raining === true ? 'YES' : data.raining === false ? 'NO RAIN' : '--');
        put('wind', (data.wind_direction || '--') + ' ' + (valid(data.wind_mph) ? data.wind_mph.toFixed(1) : '--') + ' mph');
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

    function fitDisplay() {
        var element = document.getElementById('date');
        var day = document.getElementById('day');
        var landscape = window.innerWidth > window.innerHeight;
        var size = landscape ? window.innerHeight * 0.079 : Math.min(window.innerWidth, window.innerHeight * 0.75) * 0.095;
        element.style.fontSize = size + 'px';
        day.style.fontSize = size + 'px';
        // Keep both lines equally sized, even for September / Wednesday.
        var scale = Math.min(1, element.clientWidth / element.scrollWidth, day.clientWidth / day.scrollWidth);
        if (scale < 1) {
            element.style.fontSize = day.style.fontSize = Math.floor(size * scale) + 'px';
        }
        // The seven-day strip took height from the two largest readings, which stay
        // as large as fit alongside it. Long values such as 102.7 and 10:43 still fit.
        var shorter = Math.min(window.innerWidth, window.innerHeight * 0.75);
        var portraitSize = shorter * 0.31;
        var ids = ['temperature', 'clock'];
        var sizes = landscape ? [window.innerHeight * 0.24, window.innerHeight * 0.205] : [portraitSize, portraitSize];
        for (var i = 0; i < ids.length; i += 1) {
            var reading = document.getElementById(ids[i]);
            reading.style.fontSize = sizes[i] + 'px';
            if (reading.scrollWidth > reading.clientWidth) {
                reading.style.fontSize = Math.floor(sizes[i] * reading.clientWidth / reading.scrollWidth) + 'px';
            }
        }
        // Seven columns of three digits: shrink the whole strip rather than wrap it.
        var forecast = document.getElementById('forecast');
        if (forecast) {
            var strip = landscape ? window.innerHeight * 0.035 : shorter * 0.04;
            forecast.style.fontSize = strip + 'px';
            if (forecast.scrollWidth > forecast.clientWidth) {
                forecast.style.fontSize = Math.floor(strip * forecast.clientWidth / forecast.scrollWidth) + 'px';
            }
        }
    }

    document.addEventListener('visibilitychange', function () { if (!document.hidden) { tick(); refresh(); } });
    window.addEventListener('pageshow', function () { tick(); refresh(); });
    window.addEventListener('online', refresh);
    window.addEventListener('resize', fitDisplay);
    tick();
    setInterval(tick, 1000);
    refresh();
}());
