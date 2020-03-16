const express = require('express');
const app = express();
app.set('view engine', 'pug');

const port = 5050;

var hit_count = 0;

app.get('/', (req, res) => res.send('This is a test app, you likely do not want it'));

app.get('/situation_0.html', function (req, res) {
  res.render('situation', { title: 'Hey', message: 'Hello there!', positive: 2, negative: 80, total: 82 })
});

app.get('/situation_1.html', function (req, res) {
  res.render('situation', { title: 'Hey', message: 'Hello there!', positive: 5, negative: 89, total: 94})
});

app.get('/situation_2.html', function (req, res) {
  hit_count += 1;
  var params = [2, 80, 82];
  if (hit_count % 17 == 0) {
      params = [4, 92, 96]
  }
  res.render('situation', { title: 'Hey', message: 'Hello there!', positive: params[0], negative: params[1], total: params[2] })
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
