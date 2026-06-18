// Description:
//   Retrieves air quality scores for locations in the United States.
//
// Configuration:
//   HUBOT_AIRNOW_API_KEY - API key from https://docs.airnowapi.org/
//   HUBOT_AIRNOW_DEFAULT_ZIP - Default ZIP code to use for queries
//
// Commands:
//   hubot aqi - Retrieves air quality index (AQI) for default ZIP code
//   hubot aqi <zip> - Retrieves air quality index (AQI) for given ZIP code
//

const dayjs = require('dayjs');

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
          if (res.statusCode === 500) {
            robot.logger.debug(body);
            callback('Received an invalid response from the API.');
            return;
          }
          if (res.statusCode === 401) {
            robot.logger.debug(body);
            callback('Invalid API key');
            return;
          }
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

  robot.respond(/(?:aqi|air quality|air|airnow)\s?(\d{4,5})?/i, (msg) => {
    robot.logger.debug('default zip code:', defaultZIP);
    robot.logger.debug('arguments: ', msg.match);

    const zipCode = msg.match[1] || defaultZIP;

    const payload = {
      zipCode,
    };

    makeAPIRequest('GET', 'aq/observations/current/ziplatLong', payload, (err, _res, body) => {
      if (err) {
        robot.logger.error(err);
        msg.send(`Error: ${err}`);
        return;
      }

      try {
        const apiResponse = JSON.parse(body);
        const aqiMeasurements = [];
        const aqiMeasurementsFields = [];
        // Unexpected response (not a list of observations)
        if (!Array.isArray(apiResponse)) {
          robot.logger.error('Invalid response:', apiResponse);
          msg.send('Received an invalid response from the API.');
          return;
        }
        // Empty response (no observations)
        if (apiResponse.length === 0) {
          robot.logger.debug(apiResponse);
          msg.send(`No current observations for ${zipCode}`);
          return;
        }
        // Show highest value first
        const measurements = apiResponse.sort((a, b) => (
          (b.nowcastAQI || b.AQI || 0) - (a.nowcastAQI || a.AQI || 0)
        ));
        const reportingAreaName = (
          measurements[0].reportingAreaName || measurements[0].ReportingArea
        );
        const reportingAgency = (
          measurements[0].reportingAgency || measurements[0].ReportingAgency
        );
        const lookupBehavior = (
          measurements[0].lookupBehavior || measurements[0].LookupBehavior
        );
        const consideredMonitors = (
          measurements[0].consideredMonitors || measurements[0].ConsideredMonitors
        );
        const lookupBoundary = measurements[0].lookupBoundary || measurements[0].LookupBoundary;
        const hourObserved = Number.isInteger(measurements[0].hourObserved)
          ? `${String(measurements[0].hourObserved).padStart(2, '0')}:00`
          : measurements[0].hourObserved;

        measurements.forEach((row) => {
          const parameterName = row.parameterName || row.ParameterName;
          const nowcastAQI = row.nowcastAQI || row.AQI;
          const aqiCategoryName = row.aqiCategoryName || row.AQICategoryName || row.Category?.Name;
          const siteName = row.siteName || row.SiteName;

          aqiMeasurements.push(`${parameterName}: ${nowcastAQI} (${aqiCategoryName})`);
          aqiMeasurementsFields.push({
            short: true,
            title: parameterName,
            value: siteName ? `${nowcastAQI} (${aqiCategoryName}) • ${siteName}` : `${nowcastAQI} (${aqiCategoryName})`,
          });
        });
        if (lookupBehavior || lookupBoundary || consideredMonitors) {
          aqiMeasurementsFields.push({
            short: false,
            title: 'Lookup Context',
            value: [lookupBehavior, lookupBoundary, consideredMonitors].filter(Boolean).join(' • '),
          });
        }

        const textFallback = `${reportingAreaName} - ${aqiMeasurements.join('; ')}`;
        const timestamp = dayjs(`${measurements[0].dateObserved || measurements[0].DateObserved} ${hourObserved || `${measurements[0].HourObserved}:00`} ${measurements[0].localTimeZone || measurements[0].LocalTimeZone}`).unix();

        switch (true) {
          case /slack/i.test(robot.adapterName):
            msg.send({
              attachments: [{
                title: `${reportingAreaName} Air Quality`,
                title_link: `https://www.airnow.gov/?city=${reportingAreaName}&country=USA`,
                fallback: textFallback,
                author_icon: 'https://www.airnow.gov/apple-touch-icon.png',
                author_link: 'https://www.airnow.gov/',
                author_name: 'AirNow.gov',
                color: getScoreColor(measurements[0].nowcastAQI || measurements[0].AQI),
                fields: aqiMeasurementsFields,
                footer: reportingAgency ? `AirNow.gov • Data: ${reportingAgency}` : 'AirNow.gov',
                ts: timestamp,
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
