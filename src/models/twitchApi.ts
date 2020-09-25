import Axios from "axios";
import * as constants from "../constants";

export type ResponseData = Object | undefined;
export type TwitchObjectId = string | number;

class ApiToken {
    public readonly expiresIn: number;
    private readonly token: string;

    constructor(token: string, expiresIn: number) {
        this.token = token;
        this.expiresIn = expiresIn;
    }

    public expired(): boolean {
        return this.expiresIn >= Date.now();
    }

    public toString(): string {
        return this.token;
    }
}

export class TwitchApi {
    private readonly clientId: string;
    private readonly clientSecret: string;
    private apiToken: ApiToken | null;

    constructor(clientId: string, clientSecret: string) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.apiToken = null;
    }

    private async getApiToken(): Promise<ApiToken> {
        if (this.apiToken !== null && !this.apiToken.expired())
            return this.apiToken;

        const reqParams = new URLSearchParams({
            "client_id": this.clientId,
            "client_secret": this.clientSecret,
            "grant_type": "client_credentials"
        });

        const response = await Axios.post(
            constants.twitchOauthUrl,
            reqParams
        );

        const responseData = response.data;
        const newToken = new ApiToken(
            responseData.access_token,
            Date.now() + responseData.expires_in - 60
        );

        this.apiToken = newToken;
        return newToken;
    }

    private async request(method: string, params: Object): Promise<ResponseData> {
        const token: ApiToken = await this.getApiToken();

        const headers = {
            "Client-ID": this.clientId,
            "Authorization": `Bearer ${token.toString()}`
        };

        const response = await Axios.get(
            constants.twitchBaseApiUrl + method,
            { headers, params }
        );

        return response.data.data;
    }

    public async getUser(userId: TwitchObjectId): Promise<ResponseData> {
        const data = await this.request("users", { id: userId, first: 1 });

        if (data !== undefined)
            return data[0];
    }

    public async getGame(gameId: TwitchObjectId): Promise<ResponseData> {
        const data = await this.request("games", { id: gameId, first: 1 });

        if (data !== undefined)
            return data[0];
    }
}
