const express = require("express");
const fs = require("fs");

const app = express();
const secret = JSON.parse(fs.readFileSync("../config.json")).twitch_secret;

app.post("/webhooks/twitch_callback", (req, res) => {
    // if (req.query["hub.secret"] !== secret)
    //     return;

    console.log(req.query.toString());
});

app.get("/webhooks/twitch_callback", (req, res) => {
    const challenge = req.query["hub.challenge"];
    res.status(200);
    res.send(challenge);
});

module.exports = app;