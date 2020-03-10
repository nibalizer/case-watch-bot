require('dotenv').config()
const cheerio = require('cheerio')
const axios = require('axios')
const express = require('express')
const app = express()
const port = 3000
const url = process.env.SITUATION_URL 


var result = {}


app.get('/', (req, res) => res.send('Hello World!'))
app.get('/cases/mn', (req, res) => res.send(result))


//update MN cases data
setInterval(function(){
  axios.get(url)
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
      if (positive_cases != result.positive_cases ) {
        updated_data = true
      }
      if (negative_cases != result.negative_cases ) {
        updated_data = true
      }
      if (total_cases != result.total_cases ) {
        updated_data = true
      }

      
      temp_result = {
        "positive_cases": positive_cases,
        "negative_cases": negative_cases,
        "total_cases": total_cases,
        "updated_data": updated_data
      };
      if (updated_data) {
        axios.post(process.env.DISCORD_WEBHOOK_URL, {
            content: `New Minnesota Coronavirus Data: \nPositive: ${positive_cases}\nNegative: ${negative_cases}\nTotal Cases: ${total_cases}`
        })
      }

      result = temp_result
      

      console.log(result)
    });
}, 4000);

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
