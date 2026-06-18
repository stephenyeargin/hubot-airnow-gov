const {
  describe, it, before, after,
} = require('node:test');
const assert = require('node:assert/strict');
const nock = require('nock');
const { createTestBot } = require('./common/TestBot');

describe('hubot-airnow-gov', () => {
  describe('retrieve air quality for default location', () => {
    let ctx;
    before(async () => {
      ctx = await createTestBot();
      nock('https://www.airnowapi.org')
        .get('/aq/observations/current/ziplatLong')
        .query({
          format: 'application/json',
          zipCode: '37206',
          api_key: 'ABCDEF01-23456789-ABCDEF01-23456789',
        })
        .replyWithFile(200, './test/fixtures/current.json');
      await ctx.send('hubot aqi');
    });

    after(() => ctx.shutdown());

    it('hubot responds with success', () => {
      assert.equal(ctx.sends[0], 'Nashville - PM2.5: 46 (Good); O3: 43 (Good)');
    });
  });

  describe('retrieve air quality for a zip code', () => {
    let ctx;
    before(async () => {
      ctx = await createTestBot();
      nock('https://www.airnowapi.org')
        .get('/aq/observations/current/ziplatLong')
        .query({
          format: 'application/json',
          zipCode: '37206',
          api_key: 'ABCDEF01-23456789-ABCDEF01-23456789',
        })
        .replyWithFile(200, './test/fixtures/current.json');
      await ctx.send('hubot aqi 37206');
    });

    after(() => ctx.shutdown());

    it('hubot responds with success', () => {
      assert.equal(ctx.sends[0], 'Nashville - PM2.5: 46 (Good); O3: 43 (Good)');
    });
  });

  describe('retrieve air quality without a current observation', () => {
    let ctx;
    before(async () => {
      ctx = await createTestBot();
      nock('https://www.airnowapi.org')
        .get('/aq/observations/current/ziplatLong')
        .query({
          format: 'application/json',
          zipCode: '38230',
          api_key: 'ABCDEF01-23456789-ABCDEF01-23456789',
        })
        .reply(200, []);
      await ctx.send('hubot aqi 38230');
    });

    after(() => ctx.shutdown());

    it('hubot responds with error', () => {
      assert.equal(ctx.sends[0], 'No current observations for 38230');
    });
  });

  describe('retrieve air quality and get an error response', () => {
    let ctx;
    before(async () => {
      ctx = await createTestBot();
      nock('https://www.airnowapi.org')
        .get('/aq/observations/current/ziplatLong')
        .query({
          format: 'application/json',
          zipCode: '0500',
          api_key: 'ABCDEF01-23456789-ABCDEF01-23456789',
        })
        .reply(500, 'Internal Server Error');
      await ctx.send('hubot aqi 0500');
    });

    after(() => ctx.shutdown());

    it('hubot responds with error', () => {
      assert.equal(ctx.sends[0], 'Error: Received an invalid response from the API.');
    });
  });
});

describe('hubot-airnow-gov missing default location', () => {
  describe('retrieve air quality without default location', () => {
    let ctx;
    before(async () => {
      ctx = await createTestBot({ env: { HUBOT_AIRNOW_DEFAULT_ZIP: null } });
      await ctx.send('hubot aqi');
    });

    after(() => ctx.shutdown());

    it('hubot responds with error', () => {
      assert.equal(ctx.sends[0], 'Error: Missing HUBOT_AIRNOW_DEFAULT_ZIP');
    });
  });
});

describe('hubot-airnow-gov missing API key', () => {
  describe('missing API key', () => {
    let ctx;
    before(async () => {
      ctx = await createTestBot({ env: { HUBOT_AIRNOW_API_KEY: null } });
      await ctx.send('hubot aqi 37206');
    });

    after(() => ctx.shutdown());

    it('hubot responds with error', () => {
      assert.equal(ctx.sends[0], 'Error: Missing HUBOT_AIRNOW_API_KEY');
    });
  });
});

describe('hubot-airnow-gov with invalid API key', () => {
  describe('invalid API key', () => {
    let ctx;
    before(async () => {
      ctx = await createTestBot({ env: { HUBOT_AIRNOW_API_KEY: 'bad-api-key' } });
      nock('https://www.airnowapi.org')
        .get('/aq/observations/current/ziplatLong')
        .query({
          format: 'application/json',
          zipCode: '37206',
          api_key: 'bad-api-key',
        })
        .replyWithFile(401, './test/fixtures/invalid_api_key.json');
      await ctx.send('hubot aqi 37206');
    });

    after(() => ctx.shutdown());

    it('hubot responds with error', () => {
      assert.equal(ctx.sends[0], 'Error: Invalid API key');
    });
  });
});
