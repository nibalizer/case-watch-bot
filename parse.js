const cheerio = require('cheerio')
const axios = require('axios')

axios.get("https://www.health.state.mn.us/diseases/coronavirus/situation.html")
  .then(function (response) {
    const $ = cheerio.load(response.data.toString());

    var positive_cases = $('td').eq(1).text()
    var negative_cases = $('td').eq(3).text()
    var total_cases = $('td').eq(5).text()
    //console.log("Positive Cases " + positive_cases);
    //console.log("Negative Cases " + negative_cases);
    //console.log("Total Cases " + total_cases);
    
    var results = {
      "positive_cases": positive_cases,
      "negative_cases": negative_cases,
      "total_cases": total_cases
    };

    console.log(results)
  });

