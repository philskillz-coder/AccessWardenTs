import { notificationService } from "@hope-ui/solid";
import { NotificationStatusTypes, WebSocketEvents, WebSocketMessage } from "@typings";
import { EventEmitter } from "events";

const HELLO_TIMEOUT = 20 * 1000;
const MAX_CONNECTION_RETRIES = 10;

export default class Socket extends EventEmitter {
    attempts = 0;
    accessToken: string | null = null;
    socket: WebSocket | null = null;
    socketURL: string | null = null;
    heartBeat: NodeJS.Timeout;
    helloTimeout: NodeJS.Timeout;
    needAuth = true;

    constructor(accessToken?: string) {
        super();
        const protocol = location.protocol === "https:" ? "wss://" : "ws://";
        const URL = location.origin.replace(/https?:\/\//, "");
        this.socketURL = `${protocol}${URL}/socket`;
        this.accessToken = accessToken ?? null;
        if (this.accessToken) this.createSocket();
    }

    createSocket(accessToken?: string) {
        if (accessToken) this.accessToken = accessToken;
        if (this.socket) this.socket.close(1000);

        this.attempts++;
        this.helloTimeout = setTimeout(() => this.destroy("HELLO payload not received"), HELLO_TIMEOUT);

        this.socket = new WebSocket(this.socketURL);
        this.socket.onopen = this.handleOpen.bind(this);
        this.socket.onclose = this.handleClose.bind(this);
        this.socket.onmessage = (event: MessageEvent) => {
            const msg: WebSocketMessage = JSON.parse(event.data);
            console.log(`[Message] ${msg.event}:`, msg.data);

            switch (msg.event) {
                case WebSocketEvents.HELLO:
                    this.needAuth = msg.data.needAuth;
                    this.heartBeat = setInterval(() => this.socket.send(JSON.stringify({ event: WebSocketEvents.HEARTBEAT })), msg.data.HEARTBEAT_INTERVAL);
                    this.send({ event: WebSocketEvents.AUTH, data: { token: this.accessToken } });
                    break;

                case WebSocketEvents.ERROR:
                    notificationService.show({
                        status:<NotificationStatusTypes>"error",
                        title: "Ein Fehler ist aufgetreten",
                        description: msg.data.message,
                    });
                    break;

                case WebSocketEvents.AUTH:
                    this.send({ event: WebSocketEvents.CATCH_UP });
                    break;

                default:
                    this.emit(msg.event, msg.data);
                    break;
            }
        };
    }

    handleOpen() {
        this.attempts = 0;
        clearTimeout(this.helloTimeout);
        this.helloTimeout = null;
        console.log("[WEBSOCKET] Connection established");
    }

    handleClose({ reason }: { reason: string }) {
        this.stopHeartbeat();
        this.clearHelloTimeout();
        if (this.attempts >= MAX_CONNECTION_RETRIES && this.accessToken) console.log("[WEBSOCKET] Connection closed. Maximum connection retries reached");
        else if (this.accessToken) {
            console.log(`[WEBSOCKET] Connection closed. Attempting to reconnect${reason ? `. Reason: ${reason}` : ""}`);
            setTimeout(() => this.createSocket(), (this.attempts / 2) * 1000);
        } else console.log("[WEBSOCKET] Connection closed");
    }

    stopHeartbeat() {
        if (!this.heartBeat) return;
        clearInterval(this.heartBeat);
        this.heartBeat = null;
    }

    clearHelloTimeout() {
        if (!this.helloTimeout) return;
        clearTimeout(this.helloTimeout);
        this.helloTimeout = null;
    }

    destroy(reason?: string) {
        this.accessToken = null;
        if (!this.socket) return;
        this.socket.close(1000, reason);
        this.socket = null;
    }

    send(data: any) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
        this.socket.send(JSON.stringify(data));
    }
}
