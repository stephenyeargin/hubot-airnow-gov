/* global describe, context it, beforeEach, afterEach */

const Helper = require('hubot-test-helper');
const chai = require('chai');
chai.use(require('sinon-chai'));
const nock = require('nock');

const helper = new Helper([
  './../test/adapters/slack.js',
  './../src/airnow-gov.js',
]);
const { expect } = chai;
const originalDate = Date.now;

describe('hubot-airnow-gov slack', () => {
  let room = null;

  beforeEach(() => {
    process.env.HUBOT_LOG_LEVEL = 'error';
    process.env.HUBOT_AIRNOW_API_KEY = 'ABCDEF01-23456789-ABCDEF01-23456789';
    process.env.HUBOT_AIRNOW_DEFAULT_ZIP = '37206';
    nock('https://www.airnowapi.org')
      .get('/aq/observation/zipCode/current/')
      .query({
        format: 'application/json',
        zipCode: '37206',
        distance: 25,
        api_key: 'ABCDEF01-23456789-ABCDEF01-23456789',
      })
      .replyWithFile(200, './test/fixtures/current.json');
    Date.now = () => 1688519184000;
    room = helper.createRoom();
    nock.disableNetConnect();
  });

  afterEach(() => {
    delete process.env.HUBOT_LOG_LEVEL;
    delete process.env.HUBOT_AIRNOW_API_KEY;
    delete process.env.HUBOT_AIRNOW_DEFAULT_ZIP;
    room.destroy();
    nock.cleanAll();
    Date.now = originalDate;
  });

  context('retrieve air quality for default location', () => {
    beforeEach((done) => {
      room.user.say('alice', 'hubot aqi');
      setTimeout(done, 100);
    });

    it('hubot responds with success', () => expect(room.messages).to.eql([
      ['alice', 'hubot aqi'],
      ['hubot', {
        attachments: [
          {
            author_icon: 'https://www.airnow.gov/apple-touch-icon.png',
            author_link: 'https://www.airnow.gov/',
            author_name: 'AirNow.gov',
            color: '#00e400',
            fallback: 'Nashville, TN - O3: 46 (Good); PM2.5: 43 (Good)',
            fields: [
              {
                short: true,
                title: 'O3',
                value: '46 (Good)',
              },
              {
                short: true,
                title: 'PM2.5',
                value: '43 (Good)',
              },
            ],
            footer: 'AirNow.gov',
            title: 'Nashville, TN Air Quality',
            title_link: 'https://www.airnow.gov/?city=Nashville&state=TN&country=USA',
            ts: 1688519184,
          },
        ],
      }],
    ]));
  });

  context('retrieve air quality for a zip code', () => {
    beforeEach((done) => {
      room.user.say('alice', 'hubot aqi 37206');
      setTimeout(done, 100);
    });

    it('hubot responds with success', () => expect(room.messages).to.eql([
      ['alice', 'hubot aqi 37206'],
      ['hubot', {
        attachments: [
          {
            author_icon: 'https://www.airnow.gov/apple-touch-icon.png',
            author_link: 'https://www.airnow.gov/',
            author_name: 'AirNow.gov',
            color: '#00e400',
            fallback: 'Nashville, TN - O3: 46 (Good); PM2.5: 43 (Good)',
            fields: [
              {
                short: true,
                title: 'O3',
                value: '46 (Good)',
              },
              {
                short: true,
                title: 'PM2.5',
                value: '43 (Good)',
              },
            ],
            footer: 'AirNow.gov',
            title: 'Nashville, TN Air Quality',
            title_link: 'https://www.airnow.gov/?city=Nashville&state=TN&country=USA',
            ts: 1688519184,
          },
        ],
      }],
    ]));
  });
});
