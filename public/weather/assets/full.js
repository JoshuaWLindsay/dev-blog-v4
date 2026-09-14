/* ES5 and XHR for iOS 12; all credentials and unit conversion stay on the server. */
(function () {
    'use strict';
    var latest = null;
    var failed = false;
    var pending = false;
    var requestStarted = 0;
    var cancelRequest;
    var timer;
    var fullscreenError = false;
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var compass = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    function put(id, value) { document.getElementById(id).textContent = value; }
    function valid(value) { return typeof value === 'number' && isFinite(value); }
    function pad(value) { return value < 10 ? '0' + value : String(value); }
    function centralTime(now) {
        var year = now.getUTCFullYear();
        var marchSunday = 1 + (7 - new Date(Date.UTC(year, 2, 1)).getUTCDay()) % 7;
        var novemberSunday = 1 + (7 - new Date(Date.UTC(year, 10, 1)).getUTCDay()) % 7;
        var start = Date.UTC(year, 2, marchSunday + 7, 8);
        var end = Date.UTC(year, 10, novemberSunday, 7);
        return new Date(now.getTime() - (now.getTime() >= start && now.getTime() < end ? 5 : 6) * 3600000);
    }
    function clockText(time) {
        return (time.getUTCHours() % 12 || 12) + ':' + pad(time.getUTCMinutes()) + ' ' + (time.getUTCHours() < 12 ? 'AM' : 'PM');
    }
    function age(epoch) {
        if (!valid(epoch)) { return '—'; }
        if (epoch <= 0) { return 'None reported'; }
        var seconds = Math.max(0, Math.floor(new Date().getTime() / 1000 - epoch));
        if (seconds < 60) { return seconds + 's ago'; }
        if (seconds < 3600) { return Math.floor(seconds / 60) + 'm ago'; }
        if (seconds < 86400) { return Math.floor(seconds / 3600) + 'h ' + Math.floor(seconds % 3600 / 60) + 'm ago'; }
        return Math.floor(seconds / 86400) + 'd ' + Math.floor(seconds % 86400 / 3600) + 'h ago';
    }
    function renderMetrics(data) {
        for (var i = 0; i < data.groups.length; i += 1) {
            var metrics = data.groups[i].metrics;
            for (var j = 0; j < metrics.length; j += 1) {
                var metric = metrics[j];
                var element = document.getElementById('full-' + metric.key);
                if (!element) { continue; }
                var value = metric.value;
                var format = element.getAttribute('data-format');
                var text = '—';
                if (format === 'trend' && typeof value === 'string') {
                    text = value;
                } else if (valid(value)) {
                    if (format === 'direction') {
                        var degrees = (value % 360 + 360) % 360;
                        text = compass[Math.floor((degrees + 11.25) / 22.5) % 16] + ' · ' + Math.round(degrees) % 360 + '°';
                    } else if (format === 'elapsed') {
                        text = age(value);
                    } else {
                        text = value.toFixed(Number(element.getAttribute('data-digits')) || 0);
                    }
                }
                element.textContent = text;
            }
        }
    }
    function tick() {
        var now = new Date();
        var local = centralTime(now);
        put('clock', clockText(local));
        put('date', days[local.getUTCDay()] + ', ' + months[local.getUTCMonth()] + ' ' + local.getUTCDate());
        var stale = !latest || failed || latest.stale || now.getTime() / 1000 - latest.observed_at > 300;
        document.body.className = stale ? 'offline' : '';
        if (latest) {
            var observed = centralTime(new Date(latest.observed_at * 1000));
            put('observed', months[observed.getUTCMonth()] + ' ' + observed.getUTCDate() + ', ' + clockText(observed) + ' CT');
            put('connection', stale ? 'Reading may be out of date' : 'Live');
            put('status', stale ? 'Last reading ' + age(latest.observed_at) + ' · retrying automatically' : 'All observations loaded');
            renderMetrics(latest);
        } else if (failed) {
            put('connection', 'Weather unavailable');
            put('status', 'Retrying automatically in 5 seconds');
        }
        if (fullscreenError) { put('status', 'Full screen unavailable. On iPad, use Add to Home Screen.'); }
        if (pending && now.getTime() - requestStarted >= 20000) { refresh(); }
    }
    function validData(data) {
        if (!data || !valid(data.observed_at) || !Array.isArray(data.groups) || !data.groups.length) { return false; }
        for (var i = 0; i < data.groups.length; i += 1) {
            if (!data.groups[i] || !Array.isArray(data.groups[i].metrics)) { return false; }
            for (var j = 0; j < data.groups[i].metrics.length; j += 1) {
                var metric = data.groups[i].metrics[j];
                if (!metric || typeof metric.key !== 'string') { return false; }
            }
        }
        return true;
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
            tick();
            timer = setTimeout(refresh, 5000);
        }
        cancelRequest = function () { complete(false); xhr.abort(); };
        xhr.onload = function () {
            if (finished) { return; }
            if (xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    if (!validData(data)) { complete(false); return; }
                    latest = data;
                    complete(true);
                    return;
                } catch (ignore) { /* Retain the last complete observation. */ }
            }
            complete(false);
        };
        xhr.onerror = xhr.ontimeout = xhr.onabort = function () { complete(false); };
        try {
            xhr.open('GET', '/weather/api/full', true);
            xhr.timeout = 20000;
            xhr.send();
        } catch (ignore) { complete(false); }
    }
    var fullscreen = document.getElementById('fullscreen');
    var root = document.documentElement;
    var enter = root.requestFullscreen || root.webkitRequestFullscreen;
    function fullscreenState() {
        fullscreen.textContent = document.fullscreenElement || document.webkitFullscreenElement ? 'Exit full screen' : 'Full screen';
    }
    if (enter) {
        fullscreen.hidden = false;
        fullscreen.addEventListener('click', function () {
            fullscreenError = false;
            try {
                var result;
                if (document.fullscreenElement || document.webkitFullscreenElement) {
                    var leave = document.exitFullscreen || document.webkitExitFullscreen;
                    if (leave) { result = leave.call(document); }
                } else { result = enter.call(root); }
                if (result && result['catch']) { result['catch'](function () { fullscreenError = true; tick(); }); }
            } catch (ignore) { fullscreenError = true; tick(); }
        });
        document.addEventListener('fullscreenchange', fullscreenState);
        document.addEventListener('webkitfullscreenchange', fullscreenState);
        document.addEventListener('webkitfullscreenerror', function () { fullscreenError = true; tick(); });
    }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) { tick(); refresh(); } });
    window.addEventListener('pageshow', function () { tick(); refresh(); });
    window.addEventListener('online', refresh);
    tick();
    setInterval(tick, 1000);
    refresh();
}());
