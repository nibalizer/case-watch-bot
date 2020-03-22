# case-watch-bot

Get discord notifications when there are new cases of covid-19 discovered in your state

![covid 19 bot](img/covid-19bot.png)


## About

This bot watches a few different department of health websites for changes. When it sees a change it pushes an update into all the channels it's configured to squak in. It also listens for user requests for data and responds to them. The bulk of the work in this bot is in scraping each website for data. As states update their code and formating, we have to update the code to scan them.

## Add Bot to your server

To add the bot to your server navigate to this [link]() and follow the instructions.

## Help wanted

We're looking for help getting more states parsed by the script! Pull requests welcome. Tweet [@nibalizer](https://twitter.com/nibalizer) if you have questions.

## Bot Commands

```
!or: Get stats from a specific state, by postal code
!fed: Get Federal numbers from CDC
!help: Get help on usage, adding bot to another server
!source, !sources, !src: Get the links to the upstream data
```

## States supported

* MN
* TX
* CA
* NY
* RI
* Federal

## quickstart

```
git clone https://github.com/nibalizer/case-watch-bot
cp .env.example .env
cp example.state.json state.json
vim .env
# add your discord webhook to the config file
npm install 
npm start
```

## Developement flow

If you're just adding a state or fixing a state for a data change, try this:


```
node main.js --test=CA
# or replace CA with any other state code
```

This will test the code for that state only and stop executing. This speeds development and updates of state-specific code.


