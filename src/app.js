const express = require("express");
const app = express();

app.get("/webhooks/twitch_callback", (req, res) => {
    res.send(req.query["text"]);
    // res.json(json);
    // res.send(json.toString());
});

module.exports = app;