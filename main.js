require('dotenv').config()
const cheerio = require('cheerio')
const axios = require('axios')
const fs = require('fs')
const express = require('express')
const app = express()
const Discord = require('discord.js');
const client = new Discord.Client();

const port = 3000
const mn_url = process.env.SITUATION_URL
const ny_url = "https://www.health.ny.gov/diseases/communicable/coronavirus/"
const fed_url = "https://www.cdc.gov/coronavirus/2019-ncov/cases-in-us.html"

var discord_post = false

if (process.env.DISCORD_POST == "true") {
  discord_post = true
}

if (typeof process.env.SITUATION_URL == 'undefined') {
  console.log("Please set env var SITUATION_URL")
  process.exit(1)
}

var state = {}

var managers = {
    "ca": {},
    "fed": {
      config: {
        url: "https://www.cdc.gov/coronavirus/2019-ncov/cases-in-us.html",
      },
      updater: function(config) {
        axios.get(config.url)
          .then(function (response) {
            const $ = cheerio.load(response.data.toString());
            var summary = $('.2019coronavirus-summary');

            temp_result = {
              "positive_cases": summary.find('li').eq(0).text().split(' ')[2],
              "deaths": summary.find('li').eq(1).text().split(' ')[2],
            };
            updated_data = checkDataUpdate(temp_result, "fed", state)
            temp_result["updated_data"] = updated_data;

            if (discord_post && updated_data) {
              axios.post(process.env.DISCORD_WEBHOOK_URL, {
                  content: `New Federal Coronavirus Data: \nPositive Cases: ${temp_result.positive_cases}\nDeaths: ${temp_result.deaths}`
              })
            }

            storeState("fed", temp_result);
          })
          .catch(function (error) {
            console.log("Failed to get fed cases: " + error);
          });
      },
    },
    "mn": {
      config: {
        url: mn_url,
      },
      updater: function(config) {
        axios.get(config.url)
          .then(function (response) {
            const $ = cheerio.load(response.data.toString());
            var body = $('#body');

            temp_result = {
              "positive_cases": body.find('li').eq(1).text().split(' ')[0],
              "total_cases": body.find('li').eq(0).text().split(' ')[0],
            };
            updated_data = checkDataUpdate(temp_result, "mn", state)
            temp_result["updated_data"] = updated_data;

            if (discord_post && updated_data) {
              axios.post(process.env.DISCORD_WEBHOOK_URL, {
                  content: `New Minnesota Coronavirus Data: \nPositive: ${temp_result.positive_cases}\nTotal Tested: ${temp_result.total_cases}`
              })
            }

            storeState("mn", temp_result);
          })
          .catch(function (error) {
            console.log("Failed to get MN cases: " + error);
          });
      }
    },
    "ny": {
      config: {
        url: ny_url,
      },
      updater: function(config) {
        axios.get(config.url)
          .then(function (response) {
            const $ = cheerio.load(response.data.toString());

            temp_result = {
              "nyc_cases": $('td').eq(29).text(),
              "upstate_cases": $('td').eq(27).text(),
              "total_cases": $('td').eq(31).text(),
            };
            updated_data = checkDataUpdate(temp_result, "ny", state)
            temp_result["updated_data"] = updated_data;

            if (discord_post && updated_data) {
              axios.post(process.env.DISCORD_WEBHOOK_URL, {
                  content: `New York Coronavirus Data: \nNYC Cases: ${temp_result.nyc_cases}\nNon-NYC Cases: ${temp_result.upstate_cases}\nTotal Cases: ${temp_result.total_cases}`
              })
            }

            storeState("ny", temp_result);
          })
          .catch(function (error) {
            console.log("Failed to get NY cases: " + error);
          });
      }
    },
    "or": {},
    "pa": {},
    "tx": {}
}

function checkDataUpdate(cases, loc, state) {
    var is_updated = false;
    for (var key in cases){
        let val = cases[key];
        if (val != state[loc][key]){
            is_updated = true;
        }
    }
    return is_updated;
}

function loadState() {
  //thanks w3schools
  fs.readFile('state.json', function(err, data) {
    state = JSON.parse(data)
    console.log("Loaded state from filesystem!");
  });
}

function storeState(state_name, val) {
  state[state_name] = val;
  console.log("Set state " + state_name + " to " + JSON.stringify(val));
  //thanks stackabuse.com
  fs.writeFile('state.json', JSON.stringify(state), (err) => {
    if (err) throw err;
    console.log("Saved state to filesystem!");
  });
}

loadState()

for (let [state, manager] of Object.entries(managers)) {
  if (typeof manager.updater != "undefined") {
    setInterval(function() {
      manager.updater(manager.config);
    }, 4000);
  }
}

app.get('/', (req, res) => res.send('Hello World!'))
app.get('/cases/mn', (req, res) => res.send(result.mn))
app.get('/cases/fed', (req, res) => res.send(result.fed))

//discord bot
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});


client.on('message', msg => {
  if (msg.content === '!mn') {
    msg.reply(`Minnesota Coronavirus Data: \nPositive: ${state.mn.positive_cases}\nTotal Cases: ${state.mn.total_cases}`);
  }
});

client.on('message', msg => {
  if (msg.content === '!fed') {
    msg.reply(`Federal Coronavirus Data: \nPositive: ${state.fed.positive_cases}\nDeaths: ${state.fed.deaths}`);
  }
});

client.on('message', msg => {
  if (msg.content === '!ny') {
    msg.reply(`New York Coronavirus Data: \nNYC Cases: ${state.ny.nyc_cases}\nNon-NYC Cases: ${state.ny.upstate_cases}\nTotal Cases: ${state.ny.total_cases}`)
  }
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`))

if (discord_post) {
  client.login(process.env.DISCORD_TOKEN);
}
