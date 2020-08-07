// TODO: 
//  make small bot for sending alerts
//  so use discord.js

// TODO:
//  search mysql driver for NodeJS

const fs = require("fs");
const config = JSON.parse(fs.readFileSync("../config.json"));
const app = require("./app.js")(config);

app.listen(8000);