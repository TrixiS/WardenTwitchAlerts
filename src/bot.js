const discord = require("discord.js");
const twitch = require("./twitch.js");

let conn;

class AlertClient extends discord.Client {

    constructor(config, ...params) {
        super(...params);
        this.config = config;
        this.twitchApi = new twitch.API(config.twitch_client_id, config.twitch_client_secret);
        this.langs = config.langs; 
    }

    login() {
        super.login(this.config.bot_token)
    }

    async getLang(guild) {
        const [rows, fields] = await conn.execute(
            "SELECT `lang` FROM `langs` WHERE `langs`.`server` = ? LIMIT 1",
            [guild.id]);

        if (rows.length == 0)
            return this.langs["en"];

        return this.langs[rows[0].lang];
    }

    async getColor(guild) {
        const [rows, fields] = await conn.execute(
            "SELECT `color` FROM `colors` WHERE `colors`.`server` = ? LIMIT 1",
            [guild.id]);

        const colorRow = rows[0];
        let color;

        if (colorRow == undefined)
            color = guild.me.displayColor;
        else if (colorRow.color == "rnd")
            color = "RANDOM";
        else
            color = color.split(';').map(x => Number.parseInt(x));

        return color;
    }

    async sendAlert(stream, guilds) {
        if (!guilds || guilds.length == 0)
            return;

        const user = await this.twitchApi.getUser(stream.user_id);
        const game = await this.twitchApi.getGame(stream.game_id);
        
        const userLogin = stream.user_name.toLowerCase();
        const bigThumbUrl = `https://static-cdn.jtvnw.net/previews-ttv/live_user_${userLogin}-640x360.jpg`;

        for (let guild of guilds) {
            const [alertChannelId, fields] = await conn.execute(
                "SELECT CONVERT(`channel`, char) AS `channel` FROM `twitch_channels` WHERE `twitch_channels`.`server` = ? LIMIT 1",
                [guild.id]);

            if (!alertChannelId || !alertChannelId[0])
                continue;

            const alertChannel = guild.channels.cache.get(alertChannelId[0].channel.toString());

            if (!alertChannel || !alertChannel.permissionsFor(guild.me).has(
                    ["SEND_MESSAGES", "EMBED_LINKS"]))
                continue;

            const lang = await this.getLang(guild);
            const color = await this.getColor(guild);

            const embed = new discord.MessageEmbed({
                "description": `[${stream.title}](https://twitch.tv/${userLogin})`,
                "color": color
            });

            embed.addField(lang.twitch.viewers, stream.viewer_count, true);
            embed.addField(lang.twitch.game, game ? game.name : lang.no, true);
            embed.setAuthor(user.display_name, user.profile_image_url);
            embed.setImage(bigThumbUrl);
            embed.setThumbnail(stream.thumbnail_url);

            await alertChannel.send({embed});
        }
    }
}


module.exports = function(connection) {
    conn = connection;
    return { AlertClient };
};