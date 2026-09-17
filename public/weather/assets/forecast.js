/* ES5 and XMLHttpRequest for Safari on iOS 12. Token stays on our server. */
(function () {
    'use strict';
    var latest = null;
    var failed = false;
    var pending = false;
    var started = 0;
    var timer;
    var cancel;
    // A daily forecast changes slowly; polling it like an observation is waste.
    var INTERVAL = 900000;

    function valid(value) { return typeof value === 'number' && isFinite(value); }
    function now() { return new Date().getTime(); }
    function put(id, value) {
        var element = document.getElementById(id);
        if (element) { element.textContent = value; }
    }

    function render() {
        for (var i = 0; i < 7; i += 1) {
            var day = latest && latest.days ? latest.days[i] : null;
            // Today's column carries values but no weekday letter, as designed.
            put('fc-w' + i, day && i > 0 && day.weekday ? day.weekday : ' ');
            put('fc-l' + i, day && valid(day.low_f) ? String(day.low_f) : '--');
            put('fc-h' + i, day && valid(day.high_f) ? String(day.high_f) : '--');
            put('fc-p' + i, day && valid(day.precip_percent) ? day.precip_percent + '%' : '--');
        }
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
            // Retry sooner after a failure, but never faster than the observation poll.
            timer = setTimeout(refresh, ok ? INTERVAL : 60000);
        }
        cancel = function () { complete(false); xhr.abort(); };
        xhr.onload = function () {
            if (finished) { return; }
            if (xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    if (data && valid(data.issued_at) && data.days && data.days.length &&
                        (!latest || data.issued_at >= latest.issued_at)) {
                        latest = data;
                        complete(true);
                        return;
                    }
                } catch (ignore) { /* Keep the previous forecast visible. */ }
            }
            complete(false);
        };
        xhr.onerror = xhr.ontimeout = xhr.onabort = function () { complete(false); };
        try {
            xhr.open('GET', '/weather/api/forecast', true);
            xhr.timeout = 20000;
            xhr.send();
        } catch (ignore) { complete(false); }
    }

    window.weatherForecast = {
        // The tablet status line reports a missing forecast only once it matters.
        status: function () { return !latest && failed ? 'Forecast unavailable. Retrying...' : ''; }
    };
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            if (pending) { cancel(); }
            clearTimeout(timer);
        } else { refresh(); }
    });
    window.addEventListener('pageshow', refresh);
    window.addEventListener('online', refresh);
    setInterval(function () {
        // Safari can suspend XHR timeout delivery while the tablet sleeps.
        if (pending && now() - started >= 20000) { refresh(); }
    }, 1000);
    refresh();
}());
