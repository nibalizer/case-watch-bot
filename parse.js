const cheerio = require('cheerio')

var fs = require('fs');
fs.readFile( __dirname + '/situation.html', function (err, data) {
  if (err) {
    throw err; 
  }

  const $ = cheerio.load(data.toString());

  var tb = $('table').html();
  console.log(tb);
  var positive_cases = $('td').eq(1).text()
  var negative_cases = $('td').eq(3).text()
  var total_cases = $('td').eq(5).text()
  console.log("Positive Cases " + positive_cases);
  console.log("Negative Cases " + negative_cases);
  console.log("Total Cases " + total_cases);
  
  var results = {
    "positive_cases": positive_cases,
    "negative_cases": negative_cases,
    "total_cases": total_cases
  };

  console.log(results)

});

