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
const fed_url = "https://www.cdc.gov/coronavirus/2019-ncov/cases-in-us.html"

var discord_post = false

if (process.env.DISCORD_POST == "true") {
  discord_post = true
}

if (typeof process.env.SITUATION_URL == 'undefined') {
  console.log("Please set env var SITUATION_URL")
  process.exit(1)
}


var result = {
    "ca": {},
    "fed": {},
    "mn": {},
    "ny": {},
    "or": {},
    "pa": {},
    "tx": {}
}

function loadState() {
  //thanks w3schools
  fs.readFile('state.json', function(err, data) {
  state = JSON.parse(data);
  result = state;
  console.log("Loaded state from filesystem!")
  });
}

function writeState() {
  //thanks stackabuse.com
  fs.writeFile('state.json', JSON.stringify(result), (err) => {
    if (err) throw err;
    console.log("Saved state to filesystem!")
  });
}


loadState()

app.get('/', (req, res) => res.send('Hello World!'))
app.get('/cases/mn', (req, res) => res.send(result.mn))
app.get('/cases/fed', (req, res) => res.send(result.fed))


//update MN cases data
setInterval(function(){
  axios.get(mn_url)
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
      if (positive_cases != result.mn.positive_cases ) {
        updated_data = true
      }
      if (negative_cases != result.mn.negative_cases ) {
        updated_data = true
      }
      if (total_cases != result.mn.total_cases ) {
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

      result.mn = temp_result
      console.log(result.mn)
    }).then(function(){
      writeState()
    })
    .catch(function (error) {
      console.log("Failed to get MN cases: " + error);
    });
}, 4000);




//update fed cases data
setInterval(function(){
  axios.get(fed_url)
    .then(function (response) {
      const $ = cheerio.load(response.data.toString());

      var summary = $('.2019coronavirus-summary');
      var positive_cases = summary.find('li').eq(0).text().split(' ')[2];
      var deaths = summary.find('li').eq(1).text().split(' ')[2];
      
      var updated_data = false;
      if (positive_cases != result.fed.positive_cases ) {
        updated_data = true
      }
      if (deaths != result.fed.deaths ) {
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

      result.fed = temp_result
      
      console.log(result.fed)
    }).then(function(){
      writeState()
    })
    .catch(function (error) {
      console.log("Failed to get fed cases: " + error);
    });
}, 4000);

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
client.login(process.env.DISCORD_TOKEN);
