// TODO: check x hub signature header when receiving payload

const express = require("express");
const bodyParser = require("body-parser");

const app = express();
const maxNotificationsLength = 5;

let notificationsCache = [];
let secret, db, alertClient, conn;

app.use(bodyParser.json());

app.post("/webhooks/twitch_callback", async (req, res) => {
    const payloadSecret = req.query["hub.secret"];
    const notificationId = req.headers["twitch-notification-id"];
    
    let payloadData = req.body["data"];

    res.status(200).send("OK");

    if (notificationId in notificationsCache) {
        if (notificationsCache.length >= maxNotificationsLength)
            notificationsCache = [];
        
        return;
    }

    if (payloadData == undefined || payloadData.length == 0)
        return;

    payloadData = payloadData[0];
    notificationsCache.push(notificationId);

    const [guildIds, fields] = await conn.execute(
        "SELECT CONVERT(`server`, CHAR) AS `server` FROM `twitch` WHERE `user_id` = ?",
        [Number.parseInt(payloadData.user_id)]);

    if (guildIds.length == 0)
        return;

    await alertClient.sendAlert(
        payloadData,
        guildIds
        .map(row => alertClient.guilds.cache.get(row.server))
        .filter(guild => guild != undefined));
});

app.get("/webhooks/twitch_callback", (req, res) => {
    res.status(200);
    res.send(req.query["hub.challenge"]);
});

module.exports = function(config, client, connection) {
    secret = config.twitch_secret;
    db = config.database;
    alertClient = client;
    conn = connection

    return app;
};