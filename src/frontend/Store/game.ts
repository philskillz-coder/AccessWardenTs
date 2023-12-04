import { notificationService } from "@hope-ui/solid";
import { CleanParticipant, CleanRound, WebSocketEvents, WebSocketMessage } from "@typings";
import { createSignal } from "solid-js";

import Socket from "./socket";

export default class Game {
    private socket: Socket;

    host: () => CleanParticipant;
    gameID: () => string;
    participants: () => CleanParticipant[];
    buzzerPressed: () => boolean;
    started: () => boolean;
    round: () => CleanRound;
    roundFinished: () => boolean;
    buzzerPressedBy: () => CleanParticipant;

    // eslint-disable-next-line no-unused-vars
    setHost: (host: CleanParticipant) => void;
    // eslint-disable-next-line no-unused-vars
    setGameID: (gameID: string) => void;
    // eslint-disable-next-line no-unused-vars
    setParticipants: (participants: CleanParticipant[]) => void;
    // eslint-disable-next-line no-unused-vars
    setBuzzerPressed: (buzzerPressed: boolean) => void;
    // eslint-disable-next-line no-unused-vars
    setBuzzerPressedBy: (buzzerPressedBy: CleanParticipant) => void;
    // eslint-disable-next-line no-unused-vars
    setStarted: (started: boolean) => void;
    // eslint-disable-next-line no-unused-vars
    setRound: (round: CleanRound) => void;
    // eslint-disable-next-line no-unused-vars
    setRoundFinished: (finished: boolean) => void;

    constructor(socket: Socket) {
        [this.host, this.setHost] = createSignal(null);
        [this.gameID, this.setGameID] = createSignal(null);
        [this.participants, this.setParticipants] = createSignal([]);
        [this.buzzerPressed, this.setBuzzerPressed] = createSignal(false);
        [this.buzzerPressedBy, this.setBuzzerPressedBy] = createSignal(null);
        [this.started, this.setStarted] = createSignal(false);
        [this.round, this.setRound] = createSignal(null);
        [this.roundFinished, this.setRoundFinished] = createSignal(false);

        this.socket = socket;

        for (const e of Object.keys(WebSocketEvents))
            this.socket.on(e, data => this.handleEvents({ event: WebSocketEvents[e], data }));
    }

    handleEvents(msg: WebSocketMessage) {
        switch (msg.event) {
            case WebSocketEvents.GAME_CREATED:
                notificationService.show({
                    title: "Spiel erstellt",
                    description: "Kopiere den Code und teile ihn mit deinen Freunden",
                });
                this.setHost(msg.data.game.host);
                this.setGameID(msg.data.game.gameID);
                this.setParticipants(msg.data.game.participants);
                break;

            case WebSocketEvents.GAME_JOINED:
                notificationService.show({
                    title: "Spiel beigetreten",
                    description: `${msg.data.game.host.displayName} ist der Host`
                });
                this.setHost(msg.data.game.host);
                this.setGameID(msg.data.game.gameID);
                this.setParticipants(msg.data.game.participants);
                break;

            case WebSocketEvents.BUZZER_PRESSED:
                notificationService.show({
                    title: "Buzzer gedrückt",
                    description: `${msg.data.participant.displayName} hat den Buzzer gedrückt`
                });
                this.setBuzzerPressed(true);
                this.setBuzzerPressedBy(msg.data.participant);
                break;

            case WebSocketEvents.BUZZER_RESETTED:
                notificationService.show({
                    title: "Buzzer zurückgesetzt",
                    description: "Buzzer wurde zurückgesetzt"
                });
                this.setBuzzerPressed(false);
                this.setBuzzerPressedBy(null);
                break;

            case WebSocketEvents.ROUND_FINISHED:
                notificationService.show({
                    title: "Runde beendet",
                    description: "Die Runde wurde beendet"
                });
                this.setRoundFinished(true);
                break;

            case WebSocketEvents.NEXT_ROUND:
                this.setRound(msg.data.round);
                notificationService.show({
                    title: "Nächste Runde",
                    description: "Die nächste Runde beginnt"
                });
                this.setRoundFinished(false);
                this.setBuzzerPressed(false);
                this.setBuzzerPressedBy(null);
                break;

            case WebSocketEvents.GAME_LEFT:
                notificationService.show({
                    title: "Spiel verlassen",
                    description: msg.data.message
                });
                break;

            case WebSocketEvents.PARTICIPANT_LEFT:
                this.setParticipants(this.participants().filter(p => p.userID !== msg.data.participant.userID));
                notificationService.show({
                    title: "Spieler hat das Spiel verlassen",
                    description: `${msg.data.participant.displayName} hat das Spiel verlassen`
                });
                break;

            case WebSocketEvents.PARTICIPANT_JOINED:
                this.setParticipants([...this.participants(), msg.data.participant]);
                notificationService.show({
                    title: "Spieler ist dem Spiel beigetreten",
                    description: `${msg.data.participant.displayName} ist dem Spiel beigetreten`
                });
                break;

            case WebSocketEvents.GAME_STARTED:
                notificationService.show({
                    title: "Das Spiel beginnt",
                    description: msg.data.message
                });
                this.setStarted(true);
                break;
        }
    }

    start() {
        if (this.started()) return;
        this.socket.send({ event: WebSocketEvents.START_GAME, data: { id: this.gameID() } });
    }

    stop() {
        this.socket.send({ event: WebSocketEvents.STOP_GAME, data: { id: this.gameID() } });
    }

    createGame() {
        this.socket.send({ event: WebSocketEvents.CREATE_GAME });
    }

    joinGame(code: string) {
        this.socket.send({ event: WebSocketEvents.JOIN_GAME, data: { code } });
    }

    leaveGame() {
        this.socket.send({ event: WebSocketEvents.LEAVE_GAME });
    }

    kickPlayer(participant: CleanParticipant) {
        this.socket.send({ event: WebSocketEvents.KICK_PLAYER, data: { participant } });
    }

    banPlayer(participant: CleanParticipant) {
        this.socket.send({ event: WebSocketEvents.BAN_PLAYER, data: { participant } });
    }

    submitAnswer(answer: string) {
        this.socket.send({ event: WebSocketEvents.SUBMIT_ANSWER, data: { answer } });
    }

    submitChoice(choice: number) {
        this.socket.send({ event: WebSocketEvents.SUBMIT_CHOICE, data: { choice } });
    }

    pressBuzzer() {
        this.socket.send({ event: WebSocketEvents.BUZZER_PRESSED });
    }

    resetBuzzer() {
        this.socket.send({ event: WebSocketEvents.RESET_BUZZER });
    }

    finishRound() {
        this.socket.send({ event: WebSocketEvents.FINISH_ROUND });
    }

    nextRound() {
        this.socket.send({ event: WebSocketEvents.NEXT_ROUND });
    }
}
