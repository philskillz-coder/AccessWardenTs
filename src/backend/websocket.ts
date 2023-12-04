// import OAuthUsers from "@models/OAuthUsers";
// import { Participant, WebSocketEvents, WebSocketMessage } from "@typings";
// import { Server } from "http";
// import WebSocket from "ws";

// import GameManager from "./Game/GameManager";

// const HEARTBEAT_INTERVAL = 1000 * 30;
// export default class WebSocketServer {
//     wss: WebSocket.Server;
//     GameManager: GameManager;
//     clients: Participant[] = [];

//     constructor(expressServer: Server) {
//         this.wss = new WebSocket.Server({ server: expressServer, path: "/socket" });
//         this.GameManager = new GameManager();
//         console.log("WebSocket Server started");

//         this.wss.on("connection", ws => {
//             this.clients.push({ ws: ws, user: null });
//             const client = this.clients.find(c => c.ws === ws);

//             let alive = true;
//             let needAuth = true;
//             const interval = setInterval(() => {
//                 if (!alive) ws.close();
//                 else alive = false;
//             }, HEARTBEAT_INTERVAL);

//             ws.send(JSON.stringify({ event: WebSocketEvents.HELLO, data: { HEARTBEAT_INTERVAL, needAuth } }));

//             ws.on("message", async (event: MessageEvent) => {
//                 const msg: WebSocketMessage = JSON.parse(event.toString());
//                 let user: Participant["user"];
//                 switch (msg.event) {
//                     case WebSocketEvents.AUTH:
//                         user = await OAuthUsers.findOne({ accessToken: msg.data.token });
//                         if (!user) ws.close();
//                         else {
//                             needAuth = false;
//                             ws.send(JSON.stringify({ event: WebSocketEvents.AUTH, data: { needAuth } }));
//                             if (client && user) client.user = user;
//                         }
//                         break;

//                     case WebSocketEvents.HEARTBEAT:
//                         alive = true;
//                         ws.send(JSON.stringify({ event: WebSocketEvents.HEARTBEAT }));
//                         break;

//                     case WebSocketEvents.CATCH_UP:
//                         this.GameManager.catchUp(client);
//                         break;

//                     case WebSocketEvents.CREATE_GAME:
//                         this.GameManager.createGame(client);
//                         break;

//                     case WebSocketEvents.JOIN_GAME:
//                         this.GameManager.joinGame(msg.data.code, client);
//                         break;

//                     case WebSocketEvents.LEAVE_GAME:
//                         this.GameManager.leaveGame(client);
//                         break;

//                     case WebSocketEvents.SETUP_ROUNDS:
//                         console.log(msg.data);
//                         this.GameManager.setupRounds(msg.data.rounds, client);
//                         break;

//                     case WebSocketEvents.START_GAME:
//                         this.GameManager.startGame(client);
//                         break;

//                     case WebSocketEvents.FINISH_ROUND:
//                         this.GameManager.finishRound(client);
//                         break;

//                     case WebSocketEvents.NEXT_ROUND:
//                         this.GameManager.nextRound(client);
//                         break;

//                     case WebSocketEvents.BUZZER_PRESSED:
//                         this.GameManager.triggerBuzzer(client);
//                         break;

//                     case WebSocketEvents.RESET_BUZZER:
//                         this.GameManager.resetBuzzer(client);
//                         break;

//                     case WebSocketEvents.SUBMIT_ANSWER:
//                         this.GameManager.submitAnswer(client, msg.data.answer);
//                         break;

//                     case WebSocketEvents.SUBMIT_CHOICE:
//                         this.GameManager.submitChoice(client, msg.data.choice);
//                         break;

//                     case WebSocketEvents.TYPING:
//                         this.GameManager.typing(client, msg.data.content);
//                         break;

//                     case WebSocketEvents.KICK_PLAYER:
//                         this.GameManager.kickPlayer(client, msg.data.participant);
//                         break;

//                     case WebSocketEvents.BAN_PLAYER:
//                         this.GameManager.banPlayer(client, msg.data.participant);
//                         break;

//                     default:
//                         ws.send(JSON.stringify({
//                             event: WebSocketEvents.ERROR,
//                             data: { message: "Unknown Websocket Event" }
//                         }));
//                         break;
//                 }
//             });

//             ws.onclose = () => clearInterval(interval);
//         });
//     }
// }
