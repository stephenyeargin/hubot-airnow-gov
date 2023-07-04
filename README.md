# AirNow.gov for Hubot

Retrieves US air quality scores for locations in the United States.

## Installation

In your hubot repository, run:

`npm install hubot-airnow-gov --save`

Then add **hubot-airnow-gov** to your `external-scripts.json`:

```json
["hubot-airnow-gov"]
```

### Configuration

| Environment Variables      | Required? | Description                                    |
| -------------------------- | :-------: | ---------------------------------------------- |
| `HUBOT_AIRNOW_API_KEY`     | Yes       | API key from the https://docs.airnowgov.org    |
| `HUBOT_AIRNOW_DEFAULT_ZIP` | Yes       | Default ZIP code to use when using `hubot aqi` |

## Usage

```
user1> hubot aqi 37206
hubot> Nashville, TN - O3: 46 (Good); PM2.5: 43 (Good)
```
