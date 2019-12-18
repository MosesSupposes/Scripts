'use strict'

/**
 * Dependencies
 */

const fs = require('fs');
const path = require('path');
const meow = require('meow');
const weather_js2 = require('weather-js2');
const {table} = require('table');
const chalk = require('chalk');
const figlet = require('figlet');
const showHelp = require('../helpers/showHelp');
const isMainCommand = require('../helpers/isMainCommand');

/**
 * Constants
 */

const CONFIG_PATH = path.join(process.env.HOME, '.weather.json');
const CONFIG_DEFAULT = {
  location: 'Houston, TX',
  scale: 'fahrenheit'
};

/**
 * Parse args
 */

const cli = meow(`
  Usage
    $ cast weather [LOCATION]

  Options
    --celsius     Degrees in Celsius.
    --fahrenheit  Degrees in Fahrenheit (Default).
`, {
  flags: {
    celsius: { type: 'boolean' },
    fahrenheit: { type: 'boolean' }
  }
});

/**
 * Define helpers
 */

function weather_js2_async(location, scale) {
  const degreeType = (scale == 'fahrenheit') ? 'F' : 'C';

  return new Promise((resolve, reject) => {
    weather_js2.find({ search: location, degreeType: degreeType, resCount: 1 }, async (err, result) => {
      if (err) reject(err);
      resolve(result);
    });
  });
}

function generate_icon(code) {
  let icon;

  if (['0', '1', '2', '3', '4', '11', '12', '17', '18', '35', '37', '38', '39', '40', '45', '47'].includes(code)) {
    icon = chalk.blue.bold('\u2602'); // thunderstorm
  } else if (['5', '6', '7', '8', '9', '10', '13', '14', '15', '16', '25', '41', '42', '43', '46'].includes(code)) {
    icon = chalk.white.bold('\u2603'); // rain sleet snow
  } else if (['31', '32', '33', '34', '36'].includes(code)) {
    icon = chalk.yellow.bold('\u2600'); // sunny
  } else if (['19', '20', '21', '22', '23', '24', '26', '27', '28', '29', '30'].includes(code)) {
    icon = chalk.white.bold('\u2601'); // cloudy
  } else {
    icon = ' ';
  }

  return icon;
}

function readConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    return JSON.parse(fs.readFileSync(CONFIG_PATH));
  } else {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(CONFIG_DEFAULT));
    return CONFIG_DEFAULT;
  }
}

function writeConfig(key, value) {
  let options = JSON.parse(fs.readFileSync(CONFIG_PATH));
  options[key] = value;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(options, null, 2));
}

function renderScale(scale) {
  return scale == 'fahrenheit' ? '°F' : '°C';
}

function printCurrentWeather(res, config) {
  console.log(`\nLocation: ${res.location.name}\n`);
  console.log(`${generate_icon(res.current.skycode)}  ${res.current.skytext}`);
  console.log(`   Today ${res.current.temperature} ${renderScale(config.scale)}`);
  console.log(`   ${res.current.winddisplay}`);
  console.log('');
}

function setScale(options, cli, config) {
  if (options.celsius) return 'celsius';
  if (options.fahrenheit) return 'fahrenheit';
  if (cli.flags.celsius === true) return 'celsius';
  if (cli.flags.fahrenheit === true) return 'fahrenheit';
  return config.scale;
}

 /**
 * Define script
 */

async function weather(location = null, options = {}) {
  showHelp(cli);

  // Read cached values.
  const config = readConfig();

  // Cache location.
  location = location || cli.input.slice(1, cli.input.length).join(' ') || config.location;
  writeConfig('location', location);

  // Cache temperature scale.
  const scale = setScale(options, cli, config);
  writeConfig('scale', scale);

  try {
    const result = await weather_js2_async(config.location, config.scale);

    const res = result.reduce((acc, curr) => {
      if (curr.location.name == config.location) {
        return location
      } else {
        return acc
      }
    });

    // Filter out historic forecasts
    res.forecast = res.forecast.filter(daily_forecast => daily_forecast.date >= res.current.date);

    const res_array = res.forecast.map(daily_forecast => {
      let icon = generate_icon(daily_forecast.skycodeday)
      return `${icon}  ${daily_forecast.skytextday}\n   ${daily_forecast.shortday} ${chalk.green.bold(daily_forecast.high)} - ${chalk.green.bold(daily_forecast.low)} ${renderScale(config.scale)}\n   Precipitation ${daily_forecast.precip}%`
    })

    if (isMainCommand()) {
      printCurrentWeather(res, config);
      console.log(table([res_array]));
      console.log('');
    } else {
      return res;
    }
  } catch(err) {
    console.error(err);
    console.error(chalk.red.bold(`Coudn't find location: ${config.location}`));
    process.exit(1);
  }
}

/**
 * Export script
 */

module.exports = weather;
