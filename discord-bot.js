// Run dotenv
require('dotenv').config();

const Discord = require('discord.js');
const axios = require('axios');
const client = new Discord.Client();

var casedata = {};

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
  if (msg.content === 'ping') {
    msg.reply('pong');
  }
});


client.on('message', msg => {
  if (msg.content === '!covid19') {
    msg.reply(`Minnesota Coronavirus Data: \nPositive: ${casedata.positive_cases}\nNegative: ${casedata.negative_cases}\nTotal Cases: ${casedata.total_cases}`);
  }
});
setInterval(function(){

    axios.get('http://localhost:3000/cases/mn')
      .then(function (response) {
         console.log(response.data);
         casedata = response.data;
      })

}, 1500);

client.login(process.env.DISCORD_TOKEN);
console.log(client.channels)


