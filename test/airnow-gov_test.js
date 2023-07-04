/* global describe, context it, beforeEach, afterEach */

const Helper = require('hubot-test-helper');
const chai = require('chai');
chai.use(require('sinon-chai'));
const nock = require('nock');

const helper = new Helper('./../src/airnow-gov.js');
const { expect } = chai;

describe('hubot-airnow-gov', () => {
  let room = null;

  beforeEach(() => {
    process.env.HUBOT_LOG_LEVEL = 'error';
    process.env.HUBOT_AIRNOW_API_KEY = 'ABCDEF01-23456789-ABCDEF01-23456789';
    process.env.HUBOT_AIRNOW_DEFAULT_ZIP = '37206'
    nock('https://www.airnowapi.org')
      .get('/aq/observation/zipCode/current/')
      .query({
        format: 'application/json',
        zipCode: '37206',
        distance: 25,
        api_key: 'ABCDEF01-23456789-ABCDEF01-23456789'
      })
      .replyWithFile(200, './test/fixtures/current.json');

    room = helper.createRoom();
    nock.disableNetConnect();
  });

  afterEach(() => {
    delete process.env.HUBOT_LOG_LEVEL;
    delete process.env.HUBOT_AIRNOW_API_KEY;
    delete process.env.HUBOT_AIRNOW_DEFAULT_ZIP;
    room.destroy();
    nock.cleanAll();
  });

  context('retrieve air quality for default location', () => {
    beforeEach((done) => {
      room.user.say('alice', 'hubot aqi');
      setTimeout(done, 100);
    });

    it('hubot responds with success', () => expect(room.messages).to.eql([
      ['alice', 'hubot aqi'],
      ['hubot', 'Nashville, TN - O3: 46 (Good); PM2.5: 43 (Good)'],
    ]));
  });

  context('retrieve air quality for a zip code', () => {
    beforeEach((done) => {
      room.user.say('alice', 'hubot aqi 37206');
      setTimeout(done, 100);
    });

    it('hubot responds with success', () => expect(room.messages).to.eql([
      ['alice', 'hubot aqi 37206'],
      ['hubot', 'Nashville, TN - O3: 46 (Good); PM2.5: 43 (Good)'],
    ]));
  });
});

describe('hubot-airnow-gov missing default location', () => {
  let room = null;

  beforeEach(() => {
    delete process.env.HUBOT_AIRNOW_DEFAULT_ZIP;
    process.env.HUBOT_LOG_LEVEL = 'error';
    process.env.HUBOT_AIRNOW_API_KEY = 'ABCDEF01-23456789-ABCDEF01-23456789';
    room = helper.createRoom();
    nock.disableNetConnect();
  });

  afterEach(() => {
    delete process.env.HUBOT_LOG_LEVEL;
    delete process.env.HUBOT_AIRNOW_API_KEY;
    delete process.env.HUBOT_AIRNOW_DEFAULT_ZIP;
    room.destroy();
    nock.cleanAll();
  });

  context('retrieve air quality without default location', () => {
    beforeEach((done) => {
      room.user.say('alice', 'hubot aqi');
      setTimeout(done, 100);
    });

    it('hubot responds with error', () => expect(room.messages).to.eql([
      ['alice', 'hubot aqi'],
      ['hubot', 'Error: Missing HUBOT_AIRNOW_DEFAULT_ZIP'],
    ]));
  });
});

describe('hubot-airnow-gov missing default API key', () => {
  let room = null;

  beforeEach(() => {
    delete process.env.HUBOT_AIRNOW_API_KEY;
    delete process.env.HUBOT_AIRNOW_DEFAULT_ZIP;
    process.env.HUBOT_LOG_LEVEL = 'error';
    room = helper.createRoom();
    nock.disableNetConnect();
  });

  afterEach(() => {
    delete process.env.HUBOT_LOG_LEVEL;
    delete process.env.HUBOT_AIRNOW_API_KEY;
    delete process.env.HUBOT_AIRNOW_DEFAULT_ZIP;
    room.destroy();
    nock.cleanAll();
  });

  context('missing API key', () => {
    beforeEach((done) => {
      room.user.say('alice', 'hubot aqi 37206');
      setTimeout(done, 100);
    });

    it('hubot responds with error', () => expect(room.messages).to.eql([
      ['alice', 'hubot aqi 37206'],
      ['hubot', 'Error: Missing HUBOT_AIRNOW_API_KEY'],
    ]));
  });
});
