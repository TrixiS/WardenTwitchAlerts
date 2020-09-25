import * as expressDefault from "express";
import * as bodyParser from "body-parser";
import * as crypto from "crypto";
import { IParams } from "../interfaces/IParams";
import { AlertWebhookClient } from "./webhookClient";
import { Request, Express, Response } from "express";

interface IVerifiedRequest extends Request {
    verified: boolean;
}

export class AlertApp {
    public readonly params: IParams;
    private readonly app: Express;
    private readonly verifySecret: string;
    private readonly dataCache: Object;

    constructor(params: IParams, verifySecret: string) {
        this.app = expressDefault["default"]();
        this.params = params;
        this.verifySecret = verifySecret;
        this.dataCache = {};

        this.app.use((req, res, next) => { bodyParser["default"].json({
            verify: (req: IVerifiedRequest, res, buf, encoding) => {
                req.verified = true;

                if (!(req.headers && req.headers["x-hub-signature"])) {
                    req.verified = false;
                    return;
                }

                const xHub = (req.headers["x-hub-signature"] as string).split('=');
                const decrypted = crypto.createHmac(
                    "sha256",
                    this.verifySecret
                ).update(buf).digest("hex");

                req.verified = xHub[1] === decrypted;
            }
        })(req, res, next)});

        this.app.get(
            "/webhooks/twitch_callback",
            (req, res) => this.twitchCallbackGet(req, res)
        );

        this.app.post(
            "/webhooks/twitch_callback",
            (req, res) => this.twitchCallbackPost(req as IVerifiedRequest, res)
        );
    }

    private twitchCallbackGet(req: Request, res: Response) {
        res.status(200);
        res.send(req.query["hub.channelge"]);
    }

    private async twitchCallbackPost(req: IVerifiedRequest, res: Response) {
        res.status(200).send("OK");

        if (!req.verified)
            return;

        const payloadData = req.body["data"][0];

        this.params.logger.debug(`Got req with data ${payloadData}`);

        if (payloadData === undefined)
            return;

        const cachedData = this.dataCache[payloadData.user_id];

        if (cachedData !== undefined
            && payloadData.started_at === cachedData.started_at
            && payloadData.title !== cachedData.title) {
                this.params.logger.debug(`Skip req (cached)`);
                this.params.logger.debug(JSON.stringify(cachedData));
                return;
            }

        this.dataCache[payloadData.user_id] = {
            started_at: payloadData.started_at,
            title: payloadData.title
        }

        const subscribedGuildIds = await this.params.database.getSubscribedGuildIds(
            payloadData.user_id
        );

        if (subscribedGuildIds == undefined || subscribedGuildIds.length == 0)
            return this.params.logger.info("Got 0 guilds from db");
        else
            this.params.logger.info(subscribedGuildIds);

        let webhookClient: AlertWebhookClient | null = null;

        for (let guildId of new Set(subscribedGuildIds)) {
            const [webhookId, webhookToken] = await this.params.database.getGuildWebhook(guildId);

            if (webhookId == undefined || webhookToken == undefined) {
                this.params.logger.info(`${guildId} has ${webhookId}, ${webhookToken}`);
                continue;
            }

            if (webhookClient == null) {
                webhookClient = new AlertWebhookClient(
                    this.params,
                    webhookId,
                    webhookToken
                );
            } else {
                webhookClient.id = webhookId;
                webhookClient.token = webhookToken;
            }

            this.params.logger.info(`Sending alert to ${guildId}`);
            await webhookClient.sendAlert(guildId, payloadData);
        }
    }

    public start(...args: any[]) {
        this.app.listen(...args);
    }
}
