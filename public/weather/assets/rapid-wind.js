/* ES5 and XMLHttpRequest for Safari on iOS 12. Token stays on our server. */
(function () {
    'use strict';
    var latest = null;
    var fallback = null;
    var failed = false;
    var pending = false;
    var started = 0;
    var timer;
    var cancel;
    function valid(value) { return typeof value === 'number' && isFinite(value); }
    function now() { return new Date().getTime(); }
    function fresh() { return latest && now() / 1000 - latest.observed_at <= 15 && latest.observed_at - now() / 1000 <= 5; }
    function render(data) {
        if (data) { fallback = data; }
        var live = fresh();
        var wind = live ? latest : fallback;
        var element = document.getElementById('wind');
        if (wind) {
            element.textContent = (wind.wind_direction || '--') + ' ' + (valid(wind.wind_mph) ? wind.wind_mph.toFixed(1) : '--') + ' mph';
            element.setAttribute('aria-label', (live ? 'Current wind: ' : 'One-minute average wind: ') + element.textContent);
        }
        if (live) { return ''; }
        if (failed || latest) { return fallback ? 'Live wind unavailable; showing one-minute average. Retrying...' : 'Live wind unavailable. Retrying...'; }
        return fallback ? 'Connecting to live wind; showing one-minute average.' : '';
    }
    function refresh() {
        if (document.hidden) { return; }
        if (pending) {
            if (now() - started < 20000) { return; }
            cancel();
        }
        clearTimeout(timer);
        pending = true;
        started = now();
        var xhr = new XMLHttpRequest();
        var finished = false;
        function complete(ok) {
            if (finished) { return; }
            finished = true;
            pending = false;
            failed = !ok;
            render();
            // Start-to-start cadence: time waiting for a sample counts toward 5s.
            timer = setTimeout(refresh, Math.max(100, 5000 - (now() - started)));
        }
        cancel = function () { complete(false); xhr.abort(); };
        xhr.onload = function () {
            if (finished) { return; }
            if (xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    var direction = data && data.wind_direction;
                    if (data && valid(data.observed_at) && now() / 1000 - data.observed_at <= 15 && data.observed_at - now() / 1000 <= 5 && valid(data.wind_mph) && data.wind_mph >= 0 && (direction === null || /^(N|NNE|NE|ENE|E|ESE|SE|SSE|S|SSW|SW|WSW|W|WNW|NW|NNW)$/.test(direction)) && (!latest || data.observed_at >= latest.observed_at)) {
                        latest = data;
                        complete(true);
                        return;
                    }
                } catch (ignore) { /* Preserve the last reading until it expires. */ }
            }
            complete(false);
        };
        xhr.onerror = xhr.ontimeout = xhr.onabort = function () { complete(false); };
        try {
            xhr.open('GET', '/weather/api/wind', true);
            xhr.timeout = 20000;
            xhr.send();
        } catch (ignore) { complete(false); }
    }
    window.weatherRapidWind = { render: render };
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            if (pending) { cancel(); }
            clearTimeout(timer);
        } else { refresh(); }
    });
    window.addEventListener('pageshow', refresh);
    window.addEventListener('online', refresh);
    setInterval(function () {
        render();
        if (pending && now() - started >= 20000) { refresh(); }
    }, 1000);
    refresh();
}());
