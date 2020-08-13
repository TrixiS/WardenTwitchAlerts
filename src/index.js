const fs = require("fs");
const mysql = require("mysql2/promise");

const config = JSON.parse(fs.readFileSync("../config.json"));

async function main() {
    const conn = await mysql.createConnection(config.database);
    const bot = require("./bot.js")(conn);
    const alertClient = new bot.AlertClient(config);
    const app = require("./app.js")(config, alertClient, conn);

    alertClient.on("ready", () => console.log("Bot started."));

    await Promise.all([app.listen(8000, () => console.log("Listener started.")), alertClient.login()]);
}

main().then(console.log);