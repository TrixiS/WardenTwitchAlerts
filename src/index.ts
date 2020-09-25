import * as configJson from "../config.json";
import * as langsJson from "../langs.json";
import * as log4js from "log4js";
import { Database } from "./models/database";
import { TwitchApi } from "./models/twitchApi";
import { LanguageResolver, Language } from "./models/langSystem";
import { AlertApp } from "./models/app";

async function main() {
    let config = configJson["default"];
    let langs = langsJson["default"];
    const languages: Language[] = [];

    for (let key of Object.keys(langs))
        languages.push(new Language(key, langs[key]));

    const langResolver = new LanguageResolver(
        config.defaultLangCode,
        languages
    );

    const twitchApi = new TwitchApi(
        config.twitchClientId,
        config.twitchClientSecret
    );

    const database = new Database(config.database);
    const logger = log4js["default"].getLogger("bot");
    logger.level = config.logLevel;

    const app = new AlertApp(
        { database, langResolver, twitchApi, logger },
        config.twitchSecret
    );

    app.start(config.appPort, () => app.params.logger.info("Listener started."));
}

main();