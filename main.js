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
            var positive_cases = summary.find('li').eq(0).text().split(' ')[2];
            var deaths = summary.find('li').eq(1).text().split(' ')[2];

            var updated_data = false;
            if (positive_cases != state.fed.positive_cases ) {
              updated_data = true
            }
            if (deaths != state.fed.deaths ) {
              updated_data = true
            }

            temp_result = {
              "positive_cases": positive_cases,
              "deaths": deaths,
              "updated_data": updated_data
            };
            if (discord_post && updated_data) {
              axios.post(process.env.DISCORD_WEBHOOK_URL, {
                  content: `New Federal Coronavirus Data: \nPositive Cases: ${positive_cases}\nDeaths: ${deaths}`
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

            var positive_cases = $('td').eq(1).text()
            var negative_cases = $('td').eq(3).text()
            var total_cases = $('td').eq(5).text()
            //console.log("Positive Cases " + positive_cases);
            //console.log("Negative Cases " + negative_cases);
            //console.log("Total Cases " + total_cases);

            //check to see if data is updated
            var updated_data = false;
            if (positive_cases != state.mn.positive_cases ) {
              updated_data = true
            }
            if (negative_cases != state.mn.negative_cases ) {
              updated_data = true
            }
            if (total_cases != state.mn.total_cases ) {
              updated_data = true
            }


            temp_result = {
              "positive_cases": positive_cases,
              "negative_cases": negative_cases,
              "total_cases": total_cases,
              "updated_data": updated_data
            };
            if (discord_post && updated_data) {
              axios.post(process.env.DISCORD_WEBHOOK_URL, {
                  content: `New Minnesota Coronavirus Data: \nPositive: ${positive_cases}\nNegative: ${negative_cases}\nTotal Cases: ${total_cases}`
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

            var upstate_cases = $('td').eq(13).text()
            var nyc_cases = $('td').eq(15).text()
            var total_cases = $('td').eq(17).text()

            //check to see if data is updated
            var updated_data = false;
            if (nyc_cases != state.ny.nyc_cases ) {
              updated_data = true
            }
            if (upstate_cases != state.ny.upstate_cases ) {
              updated_data = true
            }
            if (total_cases != state.ny.total_cases ) {
              updated_data = true
            }


            temp_result = {
              "nyc_cases": nyc_cases,
              "upstate_cases": upstate_cases,
              "total_cases": total_cases,
              "updated_data": updated_data
            };
            if (discord_post && updated_data) {
              axios.post(process.env.DISCORD_WEBHOOK_URL, {
                  content: `New York Coronavirus Data: \nNYC Cases: ${nyc_cases}\nNon-NYC Cases: ${upstate_cases}\nTotal Cases: ${total_cases}`
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

function loadState() {
  //thanks w3schools
  fs.readFile('state.json', function(err, data) {
    state = JSON.parse(data)
    console.log("Loaded state from filesystem!");
  });
}

function storeState(state_name, val) {
  state[state_name] = val;
  console.log("Set state " + state_name + " to " + val);
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
    msg.reply(`Minnesota Coronavirus Data: \nPositive: ${result.mn.positive_cases}\nNegative: ${result.mn.negative_cases}\nTotal Cases: ${result.mn.total_cases}`);
  }
});

client.on('message', msg => {
  if (msg.content === '!fed') {
    msg.reply(`Federal Coronavirus Data: \nPositive: ${result.fed.positive_cases}\nDeaths: ${result.fed.deaths}`);
  }
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`))

if (discord_post) {
  client.login(process.env.DISCORD_TOKEN);
}
