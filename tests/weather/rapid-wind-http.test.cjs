const test = require('node:test');
const assert = require('node:assert/strict');
const base = process.env.WEATHER_TEST_BASE_URL || 'http://127.0.0.1:3000';

test('main page loads the old-iPad wind client before the tablet renderer', async () => {
    const page = await fetch(base + '/weather').then(r => r.text());
    assert.ok(page.indexOf('/weather/assets/rapid-wind.js') < page.indexOf('/weather/assets/tablet.js'));
    const asset = await fetch(base + '/weather/assets/rapid-wind.js');
    assert.equal(asset.status, 200);
    assert.match(asset.headers.get('cache-control'), /no-store/);
    assert.doesNotMatch(await asset.text(), /WEATHERFLOW_TOKEN|ws\.weatherflow/);
});

test('wind API returns fresh current samples and advances between polls', async () => {
    async function read() {
        const result = await fetch(base + '/weather/api/wind');
        assert.match(result.headers.get('cache-control'), /no-store/);
        assert.match(result.headers.get('x-robots-tag'), /noindex/);
        const data = await result.json();
        assert.doesNotMatch(JSON.stringify(data), /token|device_id|station_id|latitude|longitude|weatherflow/);
        return {result, data};
    }
    const first = await read();
    if (process.env.WEATHER_TEST_LIVE !== '1' && first.result.status === 503) {
        assert.deepEqual(first.data, {error: 'Live wind unavailable. Retrying automatically.'});
        return;
    }
    assert.equal(first.result.status, 200);
    assert.deepEqual(Object.keys(first.data).sort(), ['observed_at', 'wind_direction', 'wind_mph']);
    assert.ok(Date.now() / 1000 - first.data.observed_at <= 15);
    assert.equal(typeof first.data.wind_mph, 'number');
    await new Promise(resolve => setTimeout(resolve, 5100));
    const second = await read();
    assert.equal(second.result.status, 200);
    assert.ok(second.data.observed_at > first.data.observed_at, 'next poll must contain a newer rapid sample');
    console.log('Rapid sample timestamp advanced by ' + (second.data.observed_at - first.data.observed_at) + ' seconds.');
});
