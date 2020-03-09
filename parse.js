const cheerio = require('cheerio')
const axios = require('axios')
const express = require('express')
const app = express()
const port = 3000

var result = {}


app.get('/', (req, res) => res.send('Hello World!'))
app.get('/cases/mn', (req, res) => res.send(result))


axios.get("https://www.health.state.mn.us/diseases/coronavirus/situation.html")
  .then(function (response) {
    const $ = cheerio.load(response.data.toString());

    var positive_cases = $('td').eq(1).text()
    var negative_cases = $('td').eq(3).text()
    var total_cases = $('td').eq(5).text()
    //console.log("Positive Cases " + positive_cases);
    //console.log("Negative Cases " + negative_cases);
    //console.log("Total Cases " + total_cases);
    
    result = {
      "positive_cases": positive_cases,
      "negative_cases": negative_cases,
      "total_cases": total_cases
    };
    

    console.log(result)
  });

app.listen(port, () => console.log(`Example app listening on port ${port}!`))




