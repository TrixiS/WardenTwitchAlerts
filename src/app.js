const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");

const app = express();
const dataCache = {};

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

    const cachedData = dataCache[payloadData.user_id];

    if (cachedData != undefined
            && payloadData.started_at == cachedData.started_at
            && payloadData.title != cachedData.title)
        return;

    dataCache[payloadData.user_id] = {
        started_at: payloadData.started_at,
        title: payloadData.title
    };

    const [guildIds, fields] = await conn.execute(
        "SELECT CONVERT(`server`, CHAR) AS `server` FROM `twitch` WHERE `user_id` = ?",
        [Number.parseInt(payloadData.user_id)]
    );

    if (guildIds.length == 0)
        return;

    await alertClient.sendAlert(
        payloadData,
        guildIds
            .map(row => alertClient.guilds.cache.get(row.server))
            .filter(guild => guild != undefined)
    );
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