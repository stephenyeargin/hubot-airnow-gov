const {
  describe, it, before, after,
} = require('node:test');
const assert = require('node:assert/strict');
const nock = require('nock');
const { createTestBot } = require('./common/TestBot');

describe('hubot-airnow-gov slack', () => {
  describe('retrieve air quality for default location', () => {
    let ctx;
    let response;
    before(async () => {
      ctx = await createTestBot({ adapterName: 'slack' });
      nock('https://www.airnowapi.org')
        .get('/aq/observations/current/ziplatLong')
        .query({
          format: 'application/json',
          zipCode: '37206',
          api_key: 'ABCDEF01-23456789-ABCDEF01-23456789',
        })
        .replyWithFile(200, './test/fixtures/current.json');
      response = await ctx.sendAndWaitForResponse('hubot aqi');
    });

    after(() => ctx.shutdown());

    it('hubot responds with attachments', () => {
      assert.ok(response.attachments, 'response should have attachments');
      assert.equal(response.attachments.length, 1);
    });

    it('attachment has correct title', () => {
      assert.equal(response.attachments[0].title, 'Nashville Air Quality');
    });

    it('attachment has correct title_link', () => {
      assert.equal(response.attachments[0].title_link, 'https://www.airnow.gov/?city=Nashville&country=USA');
    });

    it('attachment has correct fallback', () => {
      assert.equal(response.attachments[0].fallback, 'Nashville - O3: 46 (Good); PM2.5: 43 (Good)');
    });

    it('attachment has correct color', () => {
      assert.equal(response.attachments[0].color, '#00e400');
    });

    it('attachment has correct fields', () => {
      assert.deepEqual(response.attachments[0].fields, [
        { short: true, title: 'O3', value: '46 (Good)' },
        { short: true, title: 'PM2.5', value: '43 (Good)' },
      ]);
    });

    it('attachment has correct footer', () => {
      assert.equal(response.attachments[0].footer, 'AirNow.gov');
    });

    it('attachment has correct author info', () => {
      assert.equal(response.attachments[0].author_name, 'AirNow.gov');
      assert.equal(response.attachments[0].author_link, 'https://www.airnow.gov/');
      assert.equal(response.attachments[0].author_icon, 'https://www.airnow.gov/apple-touch-icon.png');
    });

    it('attachment has correct timestamp', () => {
      assert.equal(response.attachments[0].ts, 1688500800);
    });
  });

  describe('retrieve air quality for a zip code', () => {
    let ctx;
    let response;
    before(async () => {
      ctx = await createTestBot({ adapterName: 'slack' });
      nock('https://www.airnowapi.org')
        .get('/aq/observations/current/ziplatLong')
        .query({
          format: 'application/json',
          zipCode: '37206',
          api_key: 'ABCDEF01-23456789-ABCDEF01-23456789',
        })
        .replyWithFile(200, './test/fixtures/current.json');
      response = await ctx.sendAndWaitForResponse('hubot aqi 37206');
    });

    after(() => ctx.shutdown());

    it('hubot responds with attachments', () => {
      assert.ok(response.attachments, 'response should have attachments');
      assert.equal(response.attachments.length, 1);
    });

    it('attachment has correct title', () => {
      assert.equal(response.attachments[0].title, 'Nashville Air Quality');
    });

    it('attachment has correct fallback', () => {
      assert.equal(response.attachments[0].fallback, 'Nashville - O3: 46 (Good); PM2.5: 43 (Good)');
    });

    it('attachment has correct color', () => {
      assert.equal(response.attachments[0].color, '#00e400');
    });

    it('attachment has correct fields', () => {
      assert.deepEqual(response.attachments[0].fields, [
        { short: true, title: 'O3', value: '46 (Good)' },
        { short: true, title: 'PM2.5', value: '43 (Good)' },
      ]);
    });

    it('attachment has correct timestamp', () => {
      assert.equal(response.attachments[0].ts, 1688500800);
    });
  });
});
