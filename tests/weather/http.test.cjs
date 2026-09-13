const test = require('node:test');
const assert = require('node:assert/strict');
const base = process.env.WEATHER_TEST_BASE_URL || 'http://127.0.0.1:3000';

// Node's fetch can replace a supplied Host header. Use HTTP directly to test
// hostname routing before the public DNS record has been configured.
function withHost(host) {
    const url = new URL(base + '/');
    const transport = require(url.protocol === 'https:' ? 'node:https' : 'node:http');
    return new Promise((resolve, reject) => {
        transport.get(url, {headers:{host}}, response => {
            let body = '';
            response.setEncoding('utf8');
            response.on('data', chunk => { body += chunk; });
            response.on('error', reject);
            response.on('end', () => resolve({
                status: response.statusCode,
                headers: {get(name) { return response.headers[name.toLowerCase()] || null; }},
                async text() { return body; },
            }));
        }).on('error', reject);
    });
}

test('weather routes are isolated, noindex, and uncached over HTTP', async () => {
    for (const path of ['/weather', '/weather/assets/tablet.css', '/weather/assets/tablet.js', '/weather/assets/favicon.svg', '/weather/api']) {
        const response = await fetch(base + path);
        assert.ok(response.ok || (path === '/weather/api' && response.status === 503), path);
        assert.match(response.headers.get('x-robots-tag'), /noindex/);
        assert.match(response.headers.get('cache-control'), /no-store/);
        assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
        assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
        assert.match(response.headers.get('content-security-policy'), /script-src 'self'/);
        const body = await response.text();
        assert.doesNotMatch(body, /WEATHERFLOW_TOKEN|swd\.weatherflow\.com|station_id|access_token/);
        if (path === '/weather') {
            assert.match(response.headers.get('content-type'), /text\/html/);
            assert.doesNotMatch(body, /_next|__NEXT|<nav/);
            assert.match(body, /name="robots" content="noindex/);
            assert.equal((body.match(/<script\b/g) || []).length, 1);
        }
        if (path === '/weather/api') {
            const data = JSON.parse(body);
            if (process.env.WEATHER_TEST_LIVE === '1') {
                assert.equal(response.status, 200);
                assert.equal(data.stale, false);
                assert.equal(typeof data.temperature_f, 'number');
                assert.ok(Math.abs(Date.now() / 1000 - data.observed_at) < 300);
            }
            if (response.ok) {
                assert.deepEqual(Object.keys(data).sort(), [
                    'observed_at', 'temperature_f', 'wind_mph', 'wind_direction', 'raining',
                    'lightning_last_epoch', 'lightning_distance_miles', 'lightning_count_3hr', 'stale',
                ].sort());
            } else {
                assert.deepEqual(data, {error: 'Weather unavailable. Retrying automatically.'});
            }
        }
    }
});

test('regular pages still render and do not link to the dashboard', async () => {
    for (const path of ['/', '/blog', '/projects']) {
        const response = await fetch(base + path);
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('x-robots-tag'), null);
        const html = await response.text();
        assert.match(html, /_next/);
        assert.doesNotMatch(html, /href=["']\/weather/);
    }
    const sitemap = await fetch(base + '/sitemap.xml');
    if (sitemap.ok) assert.doesNotMatch(await sitemap.text(), /\/weather/);
});

test('the weather subdomain serves the standalone dashboard at its root only', async () => {
    const response = await withHost('weather.joshuawlindsay.dev');
    assert.equal(response.status,200);
    assert.match(response.headers.get('x-robots-tag'),/noindex/);
    assert.match(response.headers.get('cache-control'),/no-store/);
    const html = await response.text();
    assert.match(html, /Weather Tablet/);
    assert.doesNotMatch(html, /_next|__NEXT|<nav/);
    for (const host of ['joshuawlindsay.dev','www.joshuawlindsay.dev','weatherXjoshuawlindsayXdev']) {
        const main = await withHost(host);
        assert.equal(main.status,200);
        assert.equal(main.headers.get('x-robots-tag'),null);
        assert.match(await main.text(),/_next/);
    }
});
