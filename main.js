require('dotenv').config()
const cheerio = require('cheerio')
const axios = require('axios')
const express = require('express')
const app = express()
const port = 3000
const mn_url = process.env.SITUATION_URL 
const fed_url = "https://www.cdc.gov/coronavirus/2019-ncov/cases-in-us.html"
var discord_post = false
if (process.env.DISCORD_POST == "true") {
  discord_post = true
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
    });
}, 4000);




//update fed cases data
setInterval(function(){
  axios.get(fed_url)
    .then(function (response) {
      const $ = cheerio.load(response.data.toString());

      var summary = $('.2019coronavirus-summary');
      var positive_cases = summary.find('li').eq(0).text();
      var deaths = summary.find('li').eq(1).text();
      
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
    });
}, 4000);


app.listen(port, () => console.log(`Example app listening on port ${port}!`))
