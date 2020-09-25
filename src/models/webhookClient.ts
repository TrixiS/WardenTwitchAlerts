import * as discord from "discord.js";
import { IParams } from "../interfaces/IParams";

export class AlertWebhookClient extends discord.WebhookClient {
    public readonly params: IParams;

    constructor(
            params: IParams,
            id: string,
            token: string,
            options?: discord.ClientOptions
        ) {
        super(id, token, options);
        this.params = params;
    }

    public async sendAlert(guildId: discord.Snowflake, stream: any) {
        const lang = this.params.langResolver.resolve(await this.params.database.getGuildLang(guildId));
        const color = await this.params.database.getGuildColor(guildId);

        let streamGame = stream.game;
        let streamUser = stream.user;

        if (streamGame == undefined) {
            streamGame = await this.params.twitchApi.getGame(stream.game_id);
            stream.game = streamGame;
        }

        if (streamUser == undefined) {
            streamUser = await this.params.twitchApi.getUser(stream.user_id);
            stream.user = streamUser;
        }

        const userLogin = stream.user_name.toLowerCase();
        const bitThumbUrl = `https://static-cdn.jtvnw.net/previews-ttv/live_user_${userLogin}-640x360.jpg`;

        const embed = new discord.MessageEmbed()
            .setColor(color as discord.ColorResolvable)
            .setDescription(`[${stream.title}](https://twitch.tv/${userLogin})`)
            .addField(lang.twitch.viewers, stream.viewer_count, true)
            .addField(lang.twitch.game, streamGame != undefined ? streamGame.name : lang.no, true)
            .setAuthor(streamUser.display_name, streamUser.profile_image_url)
            .setImage(bitThumbUrl)
            .setThumbnail(streamUser.profile_image_url);

        try {
            await this.send(undefined, {
                embeds: [embed]
            });
        } catch (error) {
            this.params.logger.error(`Got error on send\n${error.message}\n${error.stack}`);
        }
    }
}
