import { CleanParticipant, CleanRound, Participant, WebSocketEvents } from "@typings";

import Game from "./Game";

export default class GameManager {
    games: Game[] = [];

    private generateGameID() {
        let result = "";
        const characters = "0123456789abcdefghijklmnopqrstuvwxyz";
        do {
            result = "";
            for (let i = 0; i < 8; i++) {
                result += characters.charAt(Math.floor(Math.random() * characters.length));
            }
        } while (this.games.find(game => game.gameID === result));
        return result;
    }

    getPlayersGame(userID: string) : Game | undefined {
        return this.games.find(g => g.hasParticipant(userID));
    }

    getGame(gameID: string): Game | undefined {
        return this.games.find(g => g.gameID === gameID);
    }

    deleteGame(gameID: string): void {
        this.games = this.games.filter(g => g.gameID !== gameID);
    }

    createGame(host: Participant) {
        if (this.games.find(g => g.participants.find(p => p.user.userID == host.user.userID))) {
            host.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Du hast bereits ein existierendes Spiel" }
            }));
            return;
        }

        const gameID = this.generateGameID();
        const game = new Game({
            host,
            gameID,
            participants: [host],
            started: false,
            rounds: [],
            buzzerPressed: false
        });
        this.games.push(game);
        host.ws.send(JSON.stringify({
            event: WebSocketEvents.GAME_CREATED,
            data: { game: game.clean() }
        }));
    }

    catchUp(client: Participant) {
        const game = this.games.find(g => g.participants.find(p => p.user.userID == client.user.userID));
        if (!game) {
            client.ws.send(JSON.stringify({
                event: WebSocketEvents.CATCH_UP,
                data: {
                    message: "No data",
                    status: "NoData",
                    data: null
                }
            }));
            return;
        }

        game.catchUp(client);
    }

    joinGame(gameID: string, participant: Participant) {
        if (this.games.find(g => g.participants.find(p => p.user.userID == participant.user.userID))) {
            participant.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Du hast bereits ein existierendes Spiel" }
            }));
            return;
        }

        const game = this.getGame(gameID);
        if (!game) {
            participant.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Dieses Spiel existiert nicht" }
            }));
            return;
        }

        if (game.started) {
            participant.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Dieses Spiel hat bereits begonnen" }
            }));
            return;
        }

        game.join(participant);
    }

    leaveGame(requester: Participant) {
        const game = this.getPlayersGame(requester.user.userID);
        if (!game) {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Du bist in keinem Spiel" }
            }));
            return;
        }

        game.leave(requester);
    }

    setupRounds(questions: CleanRound[], requester: Participant) {
        const game = this.getPlayersGame(requester.user.userID);
        if (!game) {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Du bist in keinem Spiel" }
            }));
            return;
        }

        if (game.host.user.userID !== requester.user.userID) {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Du bist nicht der Host des Spiels" }
            }));
            return;
        }

        if (game.started) {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Das Spiel läuft bereits" }
            }));
            return;
        }

        game.setupRounds(questions);
    }
    startGame(requester: Participant) {
        const game = this.getPlayersGame(requester.user.userID);
        if (!game) {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Du bist in keinem Spiel" }
            }));
            return;
        }

        if (game.host.user.userID !== requester.user.userID) {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Du bist nicht der Host des Spiels" }
            }));
            return;
        }

        if (game.started) {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Das Spiel läuft bereits" }
            }));
            return;
        }

        if (game.rounds.length === 0) {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Es wurden keine Fragen hinzugefügt" }
            }));
            return;
        }

        game.start();
    }

    finishRound(requester: Participant) {
        const game = this.getPlayersGame(requester.user.userID);
        if (!game) {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Du bist in keinem Spiel" }
            }));
            return;
        }

        if (game.host.user.userID !== requester.user.userID) {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Du bist nicht der Host des Spiels" }
            }));
            return;
        }

        if (!game.started) {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Das Spiel läuft nicht" }
            }));
            return;
        }

        if (game.currentRoundFinished) {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Die Runde ist schon beendet" }
            }));
            return;
        }

        game.finishRound();
    }

    nextRound(requester: Participant) {
        const game = this.getPlayersGame(requester.user.userID);
        if (!game) {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Du bist in keinem Spiel" }
            }));
            return;
        }

        if (game.host.user.userID !== requester.user.userID) {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Du bist nicht der Host des Spiels" }
            }));
            return;
        }

        if (!game.started) {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Das Spiel läuft nicht" }
            }));
            return;
        }

        if (game.currentRound >= game.rounds.length) {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Es gibt keine weitere Runde" }
            }));
            return;
        }

        game.nextRound();
    }

    triggerBuzzer(requester: Participant) {
        const game = this.getPlayersGame(requester.user.userID);
        if (!game) {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Du bist in keinem Spiel" }
            }));
            return;
        }

        if (!game.started) {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Das Spiel läuft nicht" }
            }));
            return;
        }

        if (game.buzzerPressed) {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Der Buzzer wurde bereits gedrückt" }
            }));
            return;
        }

        if (game.host.user.userID === requester.user.userID) {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Der Host kann den Buzzer nicht drücken" }
            }));
            return;
        }

        if (game.rounds[game.currentRound].type !== "buzzer") {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Diese Runde hat keinen Buzzer" }
            }));
            return;
        }

        game.triggerBuzzer(requester);
    }

    resetBuzzer(requester: Participant) {
        const game = this.getPlayersGame(requester.user.userID);
        if (!game) {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Du bist in keinem Spiel" }
            }));
            return;
        }

        if (!game.started) {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Das Spiel läuft nicht" }
            }));
            return;
        }

        if (!game.buzzerPressed) {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Der Buzzer wurde nicht gedrückt" }
            }));
            return;
        }

        if (game.host.user.userID !== requester.user.userID) {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Nur der Host kann den Buzzer zurücksetzen" }
            }));
            return;
        }

        if (game.rounds[game.currentRound].type !== "buzzer") {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Diese Runde hat keinen Buzzer" }
            }));
            return;
        }

        game.resetBuzzer();
    }

    submitAnswer(requester: Participant, answer: string) {
        const game = this.getPlayersGame(requester.user.userID);
        if (!game) {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Du bist in keinem Spiel" }
            }));
            return;
        }

        if (!game.started) {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Das Spiel läuft nicht" }
            }));
            return;
        }

        if (game.rounds[game.currentRound]?.type !== "estimate") { // TODO: get round safe
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Die Runde ist kein estimate" }
            }));
            return;
        }

        if (game.host.user.userID === requester.user.userID) {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Der Host kann keine antwort senden" }
            }));
            return;
        }

        game.submitAnswer(requester, answer);
    }

    submitChoice(requester: Participant, choice: number) {
        const game = this.getPlayersGame(requester.user.userID);
        if (!game) {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Du bist in keinem Spiel" }
            }));
            return;
        }

        if (!game.started) {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Das Spiel läuft nicht" }
            }));
            return;
        }

        if (game.rounds[game.currentRound]?.type !== "choice") { // TODO: get round safe
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Die Runde ist kein choice" }
            }));
            return;
        }

        if (game.host.user.userID === requester.user.userID) {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Der Host kann keine antwort senden" }
            }));
            return;
        }

        game.submitChoice(requester, choice);
    }

    typing(requester: Participant, content: string) {
        const game = this.getPlayersGame(requester.user.userID);
        if (!game) {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Du bist in keinem Spiel" }
            }));
            return;
        }

        if (!game.started) {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Das Spiel läuft nicht" }
            }));
            return;
        }

        if (!game.rounds[game.currentRound]?.typing) {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Die Runde unterstützt kein live-typing" }
            }));
            return;
        }

        if (game.host.user.userID === requester.user.userID) {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Der Host kann kein typing senden" }
            }));
            return;
        }

        game.typing(requester, content);
    }

    kickPlayer(requester: Participant, participant: CleanParticipant) {
        const game = this.getPlayersGame(requester.user.userID);
        if (!game) {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Du bist in keinem Spiel." }
            }));
            return;
        }

        if (game.host.user.userID !== requester.user.userID) {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Nur der Host kann Teilnehmer entfernen" }
            }));
            return;
        }

        game.kickPlayer(participant.userID);
        return;
    }

    banPlayer(requester: Participant, participant: CleanParticipant) {
        const game = this.getPlayersGame(requester.user.userID);
        if (!game) {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Du bist in keinem Spiel" }
            }));
            return;
        }

        if (game.host.user.userID !== requester.user.userID) {
            requester.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Nur der Host kann Teilnehmer entfernen" }
            }));
            return;
        }

        game.banPlayer(participant.userID);
        return;
    }
}
