// Description:
//   Retrieves US air quality scores for locations in the United States.
//
// Configuration:
//   HUBOT_AIRNOW_API_KEY - API key from https://docs.airnowapi.org/
//   HUBOT_AIRNOW_DEFAULT_ZIP - Default ZIP code to use for queries
//
// Commands:
//   hubot aqi - Retrieves air quality index (AQI) for default ZIP code
//   hubot aqi <zip> - Retrieves air quality index (AQI) for given ZIP code
//

module.exports = (robot) => {
  const apiKey = process.env.HUBOT_AIRNOW_API_KEY || '';
  const defaultZIP = process.env.HUBOT_AIRNOW_DEFAULT_ZIP || '';

  const makeAPIRequest = (method, path, payload, callback) => {
    if (!apiKey) {
      callback('Missing HUBOT_AIRNOW_API_KEY');
      return;
    }

    if (!payload.zipCode) {
      callback('Missing HUBOT_AIRNOW_DEFAULT_ZIP');
      return;
    }

    if (method.toUpperCase() === 'GET') {
      const defaultParameters = {
        api_key: apiKey,
        format: 'application/json',
      };
      const queryPayload = { ...defaultParameters, ...payload };
      robot.http(`https://www.airnowapi.org/${path}`)
        .query(queryPayload)
        .get()((err, res, body) => {
          callback(err, res, body);
        });
      return;
    }

    robot.logger.error(`Invalid method: ${method}`);
    callback('Invalid method!');
  };

  /**
   * 0 - 50     Good
   * 51 - 100   Moderate
   * 101 - 150  Unhealthy for Sensitive Groups (USG)
   * 151 - 200  Unhealthy
   * 201 - 300  Very Unhealthy
   * 301 +      Hazardous
   */
  const getScoreColor = (score) => {
    if (score <= 50) {
      return '#00e400';
    }
    if (score <= 100) {
      return '#ffff00';
    }
    if (score <= 150) {
      return '#ff7e00';
    }
    if (score <= 200) {
      return 'ff0000';
    }
    if (score <= 300) {
      return '#99004c';
    }
    if (score > 300) {
      return '#7e0023';
    }
    return 'gray';
  };

  robot.respond(/(?:aqi|air quality|air)\s?(\d{4,5})?/i, (msg) => {
    robot.logger.debug('default zip code:', defaultZIP);
    robot.logger.debug('arguments: ', msg.match);

    const zipCode = msg.match[1] || defaultZIP;

    const payload = {
      zipCode,
      distance: 25,
    };

    makeAPIRequest('GET', 'aq/observation/zipCode/current/', payload, (err, _res, body) => {
      if (err) {
        robot.logger.error(err);
        msg.send(`Error: ${err}`);
        return;
      }

      try {
        const apiResponse = JSON.parse(body);
        const aqiMeasurements = [];
        const aqiMeasurementsFields = [];
        apiResponse.forEach((row) => {
          aqiMeasurements.push(`${row.ParameterName}: ${row.AQI} (${row.Category.Name})`);
          aqiMeasurementsFields.push({
            short: true,
            title: row.ParameterName,
            value: `${row.AQI} (${row.Category.Name})`,
          });
        });
        const textFallback = `${apiResponse[0].ReportingArea}, ${apiResponse[0].StateCode} - ${aqiMeasurements.join('; ')}`;

        switch (robot.adapterName) {
          case 'slack':
            msg.send({
              attachments: [{
                title: `${apiResponse[0].ReportingArea}, ${apiResponse[0].StateCode} Air Quality`,
                title_link: `https://www.airnow.gov/?city=${apiResponse[0].ReportingArea}&state=${apiResponse[0].StateCode}&country=USA`,
                fallback: textFallback,
                author_icon: 'https://www.airnow.gov/apple-touch-icon.png',
                author_link: 'https://www.airnow.gov/',
                author_name: 'AirNow.gov',
                color: getScoreColor(apiResponse[0].AQI),
                fields: aqiMeasurementsFields,
                footer: 'AirNow.gov',
                ts: Math.floor(Date.now() / 1000),
              }],
            });
            break;
          default:
            msg.send(textFallback);
            break;
        }
      } catch (parseError) {
        robot.logger.error(parseError);
        msg.send('Unable to retrieve current air quality.');
      }
    });
  });
};
