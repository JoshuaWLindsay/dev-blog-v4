const test = require('node:test');
const assert = require('node:assert/strict');
const base = process.env.WEATHER_TEST_BASE_URL || 'http://127.0.0.1:3000';

function request(path, host) {
    const url = new URL(base + path);
    const transport = require(url.protocol === 'https:' ? 'node:https' : 'node:http');
    return new Promise((resolve, reject) => {
        transport.get(url, {headers:host ? {host} : {}}, response => {
            let body = '';
            response.setEncoding('utf8');
            response.on('data', chunk => { body += chunk; });
            response.on('error', reject);
            response.on('end', () => resolve({status:response.statusCode, headers:response.headers, body}));
        }).on('error', reject);
    });
}

test('full page and assets remain plain, isolated and uncached', async () => {
    for (const path of ['/weather/full', '/weather/assets/full.css', '/weather/assets/full.js']) {
        const result = await request(path);
        assert.equal(result.status, 200);
        assert.match(result.headers['cache-control'], /no-store/);
        assert.match(result.headers['x-robots-tag'], /noindex/);
        assert.doesNotMatch(result.body, /_next|__NEXT|WEATHERFLOW_TOKEN/);
    }
});
test('/full resolves on the weather subdomain without claiming the main site path', async () => {
    const result = await request('/full', 'weather.joshuawlindsay.dev');
    assert.equal(result.status, 200);
    assert.match(result.body, /Full Weather Station/);
    assert.match(result.headers['x-robots-tag'], /noindex/);
    assert.match(result.headers['cache-control'], /no-store/);
    assert.equal((await request('/full', 'joshuawlindsay.dev')).status, 404);
});
test('full API exposes exactly the current station measurement set', async () => {
    const result = await request('/weather/api/full');
    assert.ok(result.status === 200 || result.status === 503);
    assert.match(result.headers['cache-control'], /no-store/);
    assert.doesNotMatch(result.body, /station_id|latitude|longitude|token|swd\.weatherflow/);
    const data = JSON.parse(result.body);
    if (process.env.WEATHER_TEST_LIVE === '1') {
        assert.equal(result.status, 200);
        assert.equal(data.stale, false);
    }
    if (result.status === 200) {
        assert.equal(data.groups.length, 6);
        assert.equal(data.groups.reduce((count, group) => count + group.metrics.length, 0), 36);
        assert.equal(typeof data.observed_at, 'number');
    } else {
        assert.deepEqual(data, {error:'Weather unavailable. Retrying automatically.'});
    }
});
