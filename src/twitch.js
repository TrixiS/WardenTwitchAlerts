const axios = require("axios");

const baseApiUrl = "https://api.twitch.tv/helix/"
const oauthUrl = "https://id.twitch.tv/oauth2/token"

class TwitchAPIToken {

    constructor(token, expiresIn) {
        this.token = token;
        this.expiresIn = expiresIn;
    }

    expired() {
        return Date.now() >= this.expiresIn;
    }

    toString() {
        return this.token;
    }
}

class TwitchAPI {
    
    constructor(clientId, clientSecret) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.apiToken = null;
    }

    async getApiToken() {
        if (this.apiToken != null && !this.apiToken.expired())
            return this.apiToken;

        const reqParams = new URLSearchParams({
            "client_id": this.clientId,
            "client_secret": this.clientSecret,
            "grant_type": "client_credentials"
        });

        const res = await axios.post(oauthUrl, reqParams);
        const data = res.data;

        this.apiToken = new TwitchAPIToken(
            data.access_token,
            Date.now() + data.expires_in - 60);

        return this.apiToken;
    }

    async request(method, json) {
        const token = await this.getApiToken();

        const headers = {
            "Client-ID": this.clientId,
            "Authorization": `Bearer ${token.toString()}`
        };

        const res = await axios.get(baseApiUrl + method, {headers: headers, params: json});

        return res.data.data;
    }

    async getUser(userId) {
        const data = await this.request("users", {id: userId, first: 1});
        return data[0];
    }

    async getGame(gameId) {
        const data = await this.request("games", {id: gameId, first: 1});
        return data[0];
    }
}

module.exports = { API: TwitchAPI };
