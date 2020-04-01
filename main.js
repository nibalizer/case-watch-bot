#!/usr/bin/env node
require('dotenv').config();
const argv = require('yargs').argv
const cheerio = require('cheerio');
const axios = require('axios');
const fs = require('fs');
const express = require('express');
const app = express();
const Discord = require('discord.js');
const client = new Discord.Client();
const https = require('https');

const port = 3000;

var all_states = [ "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "FED"]

var debug = false;

if (fs.existsSync(`~${__dirname}/state.json`)) {
  console.log('Please copy the example.state.json to state.json');
  process.exit(1);
}

if (fs.existsSync(`~${__dirname}/.env`)) {
  console.log('Please copy the .env.example to .env');
  process.exit(1);
}

const refresh_miliseconds = process.env.REFRESH;

let discord_post = process.env.DISCORD_POST === 'true';

let state = {};

const isNum = (num) => {
    console.log(num)
    result = true;
    if (isNaN(num)) {
        result = false
    }
    if (num === null || num === undefined){
        result = false
    }
    return result
}

let managers = {
  ri: {
    config: {
      url: 'https://docs.google.com/spreadsheets/u/0/d/1n-zMS9Al94CPj_Tc3K7Adin-tN9x1RSjjx2UzJ4SV7Q/gviz/tq?headers=0&range=A2:B5&gid=0&tqx=reqId:1',
    },
    updater: config => {
      axios.get(config.url)
        .then(response => {
          let payload = response.data.toString().slice(47, -2);
          let summary = JSON.parse(payload);

          let temp_result = {
            positive_cases: parseInt(summary.table.rows[0].c[1].v.replace(",","")),
            negative_tests: parseInt(summary.table.rows[1].c[1].v.replace(",","")),
            hospitalized: parseInt(summary.table.rows[3].c[1].v),
            deaths: parseInt(summary.table.rows[3].c[1].v),
          };
          let updated_data = checkDataUpdate(temp_result, 'ri', state);
          temp_result['updated_data'] = updated_data;

          if (discord_post && updated_data) {
            axios.post(process.env.DISCORD_WEBHOOK_URL, {
              content: `New Rhode Island Coronavirus Data: \nPositive: ${temp_result.positive_cases}\nNegative tests: ${temp_result.negative_tests}\nHospitalized: ${temp_result.hospitalized}\nDeaths: ${temp_result.deaths}`,
            });
          }

          storeState('ri', temp_result);
        })
        .catch(error => console.log(`Failed to get ri cases: ${error}`));
    },
  },
  ca: {
    config: {
      url: 'https://www.cdph.ca.gov/programs/cid/dcdc/pages/immunization/ncov2019.aspx',
    },
    updater: config => {
      axios.get(config.url)
        .then(response => {
          var state_name = 'ca'
          if (debug) {
              console.log(`Data from ${managers.ca.config.url}`);
          }
          const $ = cheerio.load(response.data.toString());
          //let summary = $('.ms-rtestate-field').eq(1).find('p').eq(2);
          let summary = $('.ms-rtestate-field').eq(3);
          if (debug) {
              console.log(summary.html())
          }
          var deaths;
          var positive_cases;
          let summary_split = summary.html().split(' ');
          for (var i = 0; i < summary_split.length; i++){
            if (summary_split[i].includes('deaths')) {
              deaths = summary_split[i].split('\xa0')[0];
              break;
            }
          }
          for (var i = 0; i < summary_split.length; i++){
            if (summary_split[i].includes('positive')) {
              console.log(summary_split[i]);
              console.log(summary_split[i-1]);
              positive_cases = summary_split[i].split('\xa0')[0].replace(",","");
              break;
            }
          }

          let temp_result = {
            positive_cases: parseInt(positive_cases),
            deaths: parseInt(deaths),
          }
          let updated_data = checkDataUpdate(temp_result, 'ca', state);
          temp_result['updated_data'] = updated_data;

          if (isNum(temp_result.positive_cases) && isNum(temp_result.deaths)){
              temp_result.valid_data = true
          } else {
              temp_result.valid_data = false
              console.log("Parsing for ", state_name, " failed")
          }
          console.log(temp_result);

          if (discord_post && updated_data && temp_result.valid_data) {
            axios.post(process.env.DISCORD_WEBHOOK_URL, {
                content: `New CA Coronavirus Data: \nPositive Cases: ${temp_result.positive_cases}\nDeaths: ${temp_result.deaths}`
            });
          }

          storeState('ca', temp_result);
        })
        .catch(error => console.log(`Failed to get ca cases: ${error}`));
    },
  },
  fed: {
    config: {
      url: 'https://www.cdc.gov/coronavirus/2019-ncov/cases-updates/cases-in-us.html',
    },
    updater: config => {
      axios.get(config.url)
        .then(response => {
          const $ = cheerio.load(response.data.toString());
          let summary = $('.2019coronavirus-summary');

          let temp_result = {
            positive_cases: parseInt(summary.find('li').eq(0).text().split(' ')[2].replace(",","")),
            deaths: parseInt(summary.find('li').eq(1).text().split(' ')[2].replace(",","")),
          };
          let updated_data = checkDataUpdate(temp_result, 'fed', state);
          temp_result['updated_data'] = updated_data;

          if (discord_post && updated_data) {
            axios.post(process.env.DISCORD_WEBHOOK_URL, {
              content: `New Federal Coronavirus Data: \nPositive Cases: ${temp_result.positive_cases}\nDeaths: ${temp_result.deaths}`
            });
          }

          storeState('fed', temp_result);
        })
        .catch(error => console.log(`Failed to get fed cases: ${error}`));
    },
  },
  mn: {
    config: {
      url: "https://www.health.state.mn.us/diseases/coronavirus/situation.html"
    },
    updater: config => {
      axios.get(config.url)
        .then(response => {
          const state_name = 'mn'
          const $ = cheerio.load(response.data.toString());
          let body = $('#body');
          // clean up html a bit for easier processing
          body.find('li').eq(0).find('ul').remove()
          body.find('li').eq(1).find('ul').remove()
          if (debug) {
              console.log(`Data from ${managers.mn.config.url}`);
              console.log(body.find('li').eq(2).text().split(' '))
              console.log(body.find('li').eq(1).text().split('\n')[0].split(' ').slice(-1)[0].replace(",","")) 
          }

          let temp_result = {
            positive_cases: parseInt(body.find('li').eq(2).text().split(' ')[2]),
            deaths: parseInt(body.find('li').eq(3).text().split(' ')[1]),
            total_tests: parseInt(body.find('li').eq(1).text().split('\n')[0].split(' ').slice(-1)[0].replace(",","")), 
          };
          let updated_data = checkDataUpdate(temp_result, 'mn', state);
          temp_result['updated_data'] = updated_data;

          if (isNum(temp_result.positive_cases) && isNum(temp_result.deaths) && isNum(temp_result.deaths)){
              temp_result.valid_data = true
          } else {
              temp_result.valid_data = false
              console.log("Parsing for ", state_name, " failed")
          }

          if (discord_post && updated_data && temp_result.valid_data) {
            axios.post(process.env.DISCORD_WEBHOOK_URL, {
                content: `New Minnesota Coronavirus Data: \nPositive: ${temp_result.positive_cases}\nDeaths: ${temp_result.deaths}\nTotal Tests: ${temp_result.total_tests}`
            });
          }

          storeState('mn', temp_result);
        })
        .catch(error => console.log(`Failed to get mn cases: ${error}`));
    }
  },
  ny: {
   config: {
     url: 'https://coronavirus.health.ny.gov/county-county-breakdown-positive-cases',
    },
    updater: config => {
      axios.get(config.url)
        .then(response => {
          const $ = cheerio.load(response.data.toString());

          let $td = $('td');
          for (var i = 0; i < $td.length; i++){
              if ($('td').eq(i).text() == "New York City") {
                  var nyc_cases = parseInt($('td').eq(i+1).text().replace(",",""));
                  break;
              }
          }
          let temp_result = {
            nyc_cases: nyc_cases,
            total_cases: parseInt($('td').eq(-1).text().replace(",","")),
          };
          let updated_data = checkDataUpdate(temp_result, 'ny', state);
          temp_result['updated_data'] = updated_data;

          if (discord_post && updated_data) {
            axios.post(process.env.DISCORD_WEBHOOK_URL, {
              content: `New York Coronavirus Data: \nNYC Positive Cases: ${temp_result.nyc_cases}\nTotal Positive Cases: ${temp_result.total_cases}`
            });
          }

          storeState('ny', temp_result);
        })
        .catch(error => console.log(`Failed to get ny cases: ${error}`));
    }
  },
  or: {
    config: {
      url: 'https://www.oregon.gov/oha/PH/DISEASESCONDITIONS/DISEASESAZ/Pages/emerging-respiratory-infections.aspx',
    },
    updater: config => {
      axios.get(config.url)
        .then(response => {
          const $ = cheerio.load(response.data.toString());
          let summary = $('.card');
          let $td = summary.find('td');

          let temp_result = {
            positive_cases: parseInt($td.eq(1).text()),
            negative_tests: parseInt($td.eq(3).text().replace(",","")),
            total_tests: parseInt($td.eq(5).text().replace(",","")),
          };

          let updated_data = checkDataUpdate(temp_result, 'or', state);
          temp_result['updated_data'] = updated_data;

          if (discord_post && updated_data) {
            axios.post(process.env.DISCORD_WEBHOOK_URL, {
              content: `New Oregon Coronavirus Data: \nPositive: ${temp_result.positive_cases}\nNegative tests: ${temp_result.negative_tests}\nTotal Tests: ${temp_result.total_tests}\n`
            });
          }

          storeState('or', temp_result);
        })
        .catch(error => console.log(`Failed to get or cases: ${error}`));
    },
  },
  tx: {
    config: {
      url: 'https://www.dshs.state.tx.us/news/updates.shtm#coronavirus',
    },
    updater: config => {
      const agent = new https.Agent({
        // yeah I know :(
        rejectUnauthorized: false
      });
      axios.get(config.url, { httpsAgent: agent})
        .then(response => {
          const $ = cheerio.load(response.data.toString());
          if (debug) {
              console.log(`Data from ${managers.tx.config.url}`);
          }

          let temp_result = {
            positive_cases: parseInt($('td').eq(3).text()),
            total_tests: parseInt($('td').eq(0).text().replace(",","")),
            deaths: parseInt($('td').eq(4).text()),
          };

          let updated_data = checkDataUpdate(temp_result, 'tx', state);
          temp_result['updated_data'] = updated_data;

          //disable texas 
          //if (discord_post && updated_data ) {
          if (false) {
            axios.post(process.env.DISCORD_WEBHOOK_URL, {
              content: `New Texas Coronavirus Data: \nPositive: ${temp_result.positive_cases}\nTotal tests: ${temp_result.total_tests}\nDeaths ${temp_result.deaths}\n`
            });
          }

          storeState('tx', temp_result);
        })
        .catch(error => console.log(`Failed to get tx cases: ${error}`));
    },
  },
};

const checkDataUpdate = (cases, loc, state) => {
  var is_updated = false;

  for (var key in cases) {
    let val = cases[key];
    if (val != state[loc][key]) {
      is_updated = true;
    }
  }

  return is_updated;
};

const loadState = () => {
  //thanks w3schools
  fs.readFile('state.json', (err, data) => {
    state = JSON.parse(data);
    console.log('Loaded state from filesystem!');
  });
};


const storeState = (state_name, val) => {
  state[state_name] = val;
  console.log(`Set state ${state_name} to ${JSON.stringify(val)}`);
  //thanks stackabuse.com
  fs.writeFile('state.json', JSON.stringify(state), (err) => {
    if (err) throw err;
    console.log('Saved state to filesystem!');
  });
};


app.get('/', (req, res) => res.send('Hello World!'));
app.get('/cases/all', (req, res) => res.send(result));
app.get('/cases/mn', (req, res) => res.send(result.mn));
app.get('/cases/ca', (req, res) => res.send(result.ca));
app.get('/cases/ny', (req, res) => res.send(result.ny));
app.get('/cases/or', (req, res) => res.send(result.or));
app.get('/cases/ri', (req, res) => res.send(result.ri));
app.get('/cases/tx', (req, res) => res.send(result.tx));
app.get('/cases/fed', (req, res) => res.send(result.fed));


const help = (msg) => {
  var src_url = "https://github.com/nibalizer/case-watch-bot"
  var invite_url = "<https://discordapp.com/api/oauth2/authorize?client_id=686649091069050996&permissions=93184&scope=bot>"
  var supported_states = Object.keys(state);
  msg.reply(`Supported states are: ${supported_states.join(', ')}\n` + 
  `Source code is available here: ${src_url}\n` +
  `Add bot to another server with this invite link: ${invite_url}`)
};

const sources = (msg) => {
  var supported_states = Object.keys(managers);
  var states_urls = ""
  for (var i = 0; i<supported_states.length; i++ ) {
      states_urls += "\n" + supported_states[i] + ": <" + managers[supported_states[i]].config.url  + ">"
  }
  msg.reply("Upstream Data Sources for each state:" + states_urls);
}

client.on('message', msg => {
  if (msg.content === '!help') {
    help(msg)
  }
  if (['!src', '!sources', '!source'].includes(msg.content)) {
    sources(msg)
  }

  if (msg.content === '!ca') {
    msg.reply(`CA Coronavirus Data: \nPositive Cases: ${state.ca.positive_cases}\nDeaths: ${state.ca.deaths}`)
  }

  if (msg.content === '!fed') {
    msg.reply(`Federal Coronavirus Data: \nPositive: ${state.fed.positive_cases}\nDeaths: ${state.fed.deaths}`);
    return;
  }

  if (msg.content === '!mn') {
    msg.reply(`Minnesota Coronavirus Data: \nPositive: ${state.mn.positive_cases}\nDeaths: ${state.mn.deaths}\nTotal Tests: ${state.mn.total_tests}`);
    return;
  }

  if (msg.content === '!ny') {
    msg.reply(`New York Coronavirus Data: \nNYC Positive: ${state.ny.nyc_cases}\nTotal Positive: ${state.ny.total_cases}`)
    return;
  }

  if (msg.content === '!or') {
    msg.reply(`Oregon Coronavirus Data: \nPositive: ${state.or.positive_cases}\nNegative tests: ${state.or.negative_tests}\nTotal Tests: ${state.or.total_tests}\n`)
  }

  if (msg.content === '!ri') {
    msg.reply(`Rhode Island Coronavirus Data: \nPositive: ${state.ri.positive_cases}\nNegative tests: ${state.ri.negative_tests}\nHospitalized: ${state.ri.hospitalized}\nDeaths: ${state.ri.deaths}`)
    return;
  }
  if (msg.content === '!tx') {
    //temporariliy disable texas
    //msg.reply(`Texas Coronavirus Data: \nPositive: ${state.tx.positive_cases}\nTotal tests: ${state.tx.total_tests}\nDeaths ${state.tx.deaths}\n`)
    msg.reply(`Texas has a live dashboard here: <https://txdshs.maps.arcgis.com/apps/opsdashboard/index.html#/ed483ecd702b4298ab01e8b9cafc8b83>`)
    return;
  }
});


if (argv.serve) {
  console.log("Starting Up Covid-19 Case Watch App")
  console.log("Discord: ", discord_post)
  console.log("Webscrping: Enabled")
  console.log("Webscrping refresh rate:", refresh_miliseconds / 1000, "seconds")
  console.log("HTTP Server: Enabled")
  console.log("HTTP Port: ", port)
  loadState();

  for (let [, manager] of Object.entries(managers)) {
    if (typeof manager.updater != 'undefined') {
      manager.updater(manager.config);
      setInterval(() => {
        manager.updater(manager.config);
      }, refresh_miliseconds);
    }
  }
  app.listen(port, () => console.log(`Example app listening on port ${port}!`));

  //discord bot
  client.on('ready', () => console.log(`Logged in as ${client.user.tag}!`));

  if (discord_post) {
    client.login(process.env.DISCORD_TOKEN);
  }

} else if (argv.test) {
  //console.log(data[String(argv.test)])
  if (argv.test === true || ! all_states.includes(argv.test.toUpperCase())) {
    console.log("You must specify a state to test")
    process.exit(1)
  } else {
    debug = true;
    var picker = String(argv.test).toLowerCase()
    console.log("Testing for State: ", picker)
    discord_post = false;
    loadState();
    config = managers[picker].config
    managers[picker].updater(config)
  }
} else {
  console.log("You must specify either --serve or --test=ST (state shortcode)")
  process.exit(1)
}

