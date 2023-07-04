// Description:
//   Retrieves US air quality scores for locations in the United States.
//
// Configuration:
//   HUBOT_AIRNOW_API_KEY - API key from https://docs.airnowapi.org/
//   HUBOT_AIRNOW_DEFAULT_ZIP - Default ZIP code to use for queries
//
// Commands:
//   hubot hello - Gets a message
//   hubot hello <message> - Sends a message
//

module.exports = (robot) => {
  const apiKey = process.env.HUBOT_AIRNOW_API_KEY || '';
  const defaultZIP = process.env.HUBOT_AIRNOW_DEFAULT_ZIP || '';

  const makeAPIRequest = (method, path, payload, callback) => {
    if (!payload.zipCode) {
      callback('Missing HUBOT_AIRNOW_DEFAULT_ZIP');
      return;
    }

    if (!apiKey) {
      callback('Missing HUBOT_AIRNOW_API_KEY');
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

  robot.respond(/aqi\s?(.*)/i, (msg) => {
    robot.logger.info('default zip code:', defaultZIP);
    robot.logger.info('arguments: ', msg.match);

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
        apiResponse.forEach((row) => {
          aqiMeasurements.push(`${row.ParameterName}: ${row.AQI} (${row.Category.Name})`);
        });

        msg.send(`${apiResponse[0].ReportingArea}, ${apiResponse[0].StateCode} - ${aqiMeasurements.join('; ')}`);
      } catch (parseError) {
        robot.logger.error(parseError);
        msg.send('Unable to retrieve current air quality.');
      }
    });
  });
};
