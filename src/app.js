// TODO: check x hub signature header when receiving payload

const express = require("express");
const bodyParser = require("body-parser");

const app = express();
const maxPayloadsLength = 5;

let previousNotificationIds = [];
let secret;

app.use(bodyParser.json());

app.post("/webhooks/twitch_callback", (req, res) => {
    const payloadSecret = req.query["hub.secret"];
    const payloadData = req.query["data"];
    const notificationId = req.headers["twitch-notification-id"];

    res.status(200).send("OK");

    if (notificationId in previousNotificationIds) {
        if (previousNotificationIds.length >= maxPayloadsLength)
            previousNotificationIds = [];
        
        return;
    }

    if (payloadData == undefined || payloadData.length == 0)
        return;

    previousNotificationIds.push(notificationId);
});

app.get("/webhooks/twitch_callback", (req, res) => {
    res.status(200);
    res.send(req.query["hub.challenge"]);
});

module.exports = function(config) {
    secret = config.twitch_secret;
    return app;
};