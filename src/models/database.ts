import {
    Connection,
    FieldPacket,
    ConnectionOptions
} from "mysql2/promise";

import * as mysql from "mysql2/promise";
import { Snowflake } from "discord.js";
import { TwitchObjectId } from "./twitchApi";

export class Database {
    public readonly connOptions: ConnectionOptions;
    private connection: Connection | null;

    constructor(connOptions: ConnectionOptions) {
        this.connOptions = connOptions;
        this.connection = null;
    }

    private async connect(): Promise<Connection> {
        return await mysql["default"].createConnection(this.connOptions);
    }

    private async execute(...args: any[]) {
        if (this.connection === null)
            this.connection = await this.connect();

        try {
            return await this.connection.execute(...args);
        } catch (error) {
            this.connection = await this.connect();
            return await this.connection.execute(...args);
        }
    }

    public async getGuildLang(guildId: Snowflake): Promise<string | undefined> {
        const [resultRows, fields] = await this.execute(
            "SELECT `lang` FROM `langs` WHERE `langs`.`server` = ? LIMIT 1",
            [guildId]
        );

        if (!resultRows)
            return;

        return resultRows[0].lang;
    }

    public async getGuildColor(guildId: Snowflake): Promise<string | number[]> {
        const [resultRows, fields] = await this.execute(
            "SELECT `color` FROM `colors` WHERE `colors`.`server` = ? LIMIT 1",
            [guildId]
        );

        const randomColor = "RANDOM";

        if (!resultRows)
            return randomColor;

        const colorRow = resultRows[0];
        let color: string | number[];

        if (colorRow == undefined || colorRow.color === "rnd")
            color = randomColor;
        else
            color = colorRow.color.split(';').map((x: string) => Number.parseInt(x));

        return color;
    }

    public async getSubscribedGuildIds(userId: TwitchObjectId): Promise<string[] | undefined> {
        const [resultRows, fields] = await this.execute(
            "SELECT CONVERT (`server`, CHAR) AS `server` FROM `twitch` WHERE `user_id` = ?",
            [userId]
        );

        if (!resultRows)
            return;

        const resultIds: string[] = [];

        for (let row of (resultRows as Iterable<FieldPacket>))
            resultIds.push(row["server"]);

        return resultIds;
    }

    public async getGuildWebhook(guildId: Snowflake): Promise<string[] | undefined[]> {
        const [resultRows, fiels] = await this.execute(
            "SELECT `id`, `token` FROM `twitch_webhooks` WHERE `server` = ? LIMIT 1",
            [guildId]
        );

        if (!resultRows || !resultRows[0])
            return [undefined, undefined];

        return [resultRows[0].id.toString(), resultRows[0].token.toString()];
    }
}
