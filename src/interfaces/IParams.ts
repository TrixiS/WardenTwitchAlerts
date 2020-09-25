import { Database } from "../models/database";
import { LanguageResolver } from "../models/langSystem";
import { TwitchApi } from "../models/twitchApi";
import { Logger } from "log4js";

export interface IParams {
    database: Database;
    langResolver: LanguageResolver;
    twitchApi: TwitchApi;
    logger: Logger;
}
