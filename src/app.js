const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");

const app = express();
const maxNotificationsLength = 5;
const streamsStartedDates = {};

let notificationsCache = [];
let secret, db, alertClient, conn;

app.use(bodyParser.json({
    verify: function(req, res, buf, encoding) {
        if (!(req.headers && req.headers["x-hub-signature"])) {
            req.verified = false;
            return;
        }

        const xHub = req.headers["x-hub-signature"].split('=');
        const decrypted = crypto.createHmac("sha256", secret).update(buf).digest("hex");

        req.verified = xHub[1] == decrypted;
    }
}));

app.post("/webhooks/twitch_callback", async (req, res) => {
    res.status(200).send("OK");
    
    if (!req.verified)
        return;

    const payloadData = req.body["data"][0];
    
    if (payloadData == undefined)
        return;
    
    if (payloadData.started_at == streamsStartedDates[payloadData.user_id])
        return;
    
    streamsStartedDates[payloadData.user_id] = payloadData.started_at;

    const notificationId = req.headers["twitch-notification-id"];

    if (notificationId in notificationsCache) {
        if (notificationsCache.length >= maxNotificationsLength)
            notificationsCache = [];
        
        return;
    }

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