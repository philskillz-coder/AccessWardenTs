import { BuzzerRound, ChoiceRound, CleanBuzzerRound, CleanChoiceRound, CleanEstimateRound, CleanGame, CleanParticipant, CleanRound, EstimateRound, Participant, WebSocketEvents } from "@typings";

export default class Game {
    host: Participant;
    gameID: string;
    participants: Participant[];
    banned: Participant[];
    started: boolean;
    currentRoundFinished: boolean;
    currentRound: number;
    rounds: (BuzzerRound | EstimateRound | ChoiceRound)[];
    buzzerPressed: boolean;
    buzzerPressedBy: Participant | null;
    answers: Map<Participant, string>;
    choices: Map<Participant, number>;

    constructor({
        host,
        gameID,
        participants,
        started,
        rounds,
        buzzerPressed
    }: {
        host: Participant;
        gameID: string;
        participants: Participant[];
        started: boolean;
        rounds: (BuzzerRound | EstimateRound | ChoiceRound)[];
        buzzerPressed: boolean;
    }) {
        this.host = host;
        this.gameID = gameID;
        this.participants = participants;
        this.banned = [];
        this.started = started;
        this.currentRoundFinished = false;
        this.currentRound = null;
        this.rounds = rounds;
        this.buzzerPressedBy = null;
        this.buzzerPressed = buzzerPressed;
        this.answers = new Map();
        this.choices = new Map();
    }

    private cleanParticipant(user: Participant | Participant["user"]) : CleanParticipant {
        // If the input is of type Participant, use the user property
        if ("user" in user) {
            user = user.user;
        }

        return {
            avatarHash: user.avatarHash,
            displayName: user.displayName,
            userID: user.userID,
            userName: user.userName
        };
    }

    private cleanRound(round: BuzzerRound | EstimateRound | ChoiceRound): CleanBuzzerRound | CleanEstimateRound | CleanChoiceRound {
        switch (round.type) {
            case "buzzer":
                return {
                    type: round.type,
                    question: round.question,
                    number: round.number,
                };

            case "estimate":
                return {
                    type: round.type,
                    question: round.question,
                    number: round.number,
                };

            case "choice":
                return {
                    type: round.type,
                    question: round.question,
                    choices: round.choices,
                    number: round.number,
                };
        }
    }

    hasParticipant(userID: string) : boolean {
        return this.participants.find(p => p.user.userID === userID) !== undefined;
    }

    clean() : CleanGame {
        return {
            host: this.cleanParticipant(this.host.user),
            gameID: this.gameID,
            participants: this.participants.map(p => this.cleanParticipant(p.user)),
            started: this.started,
            currentRound: this.currentRound,
            buzzerPressed: this.buzzerPressed
        };
    }

    catchUp(participant: Participant) {
        participant.ws.send(JSON.stringify({
            event: WebSocketEvents.GAME_JOINED,
            data: { message: `Du bist dem Spiel ${this.gameID} beigetreten`, game: this.clean() }
        }));

        if (this.started) {
            participant.ws.send(JSON.stringify({
                event: WebSocketEvents.GAME_STARTED,
                data: { message: "Spiel gestartet" }
            }));

            const round = this.rounds[this.currentRound];
            participant.ws.send(JSON.stringify({
                event: WebSocketEvents.NEXT_ROUND,
                data: { round: this.cleanRound(round) }
            }));

            if (this.buzzerPressed) {
                participant.ws.send(JSON.stringify({
                    event: WebSocketEvents.BUZZER_PRESSED,
                    data: { participant: this.cleanParticipant(this.buzzerPressedBy.user) }
                }));
            }

            if (this.currentRoundFinished) {
                participant.ws.send(JSON.stringify({
                    event: WebSocketEvents.ROUND_FINISHED,
                    data: { message: "Runde beendet" }
                }));
            }
        }

        // TODO: check if started: send current question
    }

    join(participant: Participant) {
        if (this.banned.find(p => p.user.userID === participant.user.userID)) {
            participant.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Du wurdest aus diesem Spiel verbannt" }
            }));
            return;
        }

        this.participants.forEach(p => {
            p.ws.send(JSON.stringify({
                event: WebSocketEvents.PARTICIPANT_JOINED,
                data: { message: `${participant.user.displayName} ist dem Spiel beigetreten`, participant: this.cleanParticipant(participant.user) }
            }));
        });

        this.participants.push(participant);
        participant.ws.send(JSON.stringify({
            event: WebSocketEvents.GAME_JOINED,
            data: { message: `Du bist dem Spiel ${this.gameID} beigetreten`, game: this.clean() }
        }));
    }

    setupRounds(rounds: CleanRound[]) {
        this.rounds = [];
        rounds.sort((a, b) => a.number - b.number).forEach((round, i) => {
            switch (round.type) {
                case "buzzer":
                    this.rounds[i] = {
                        type: round.type,
                        typing: false, // TODO: change
                        question: round.question,
                        number: i,
                        winner: null
                    };
                    break;

                case "estimate":
                    this.rounds[i] = {
                        type: round.type,
                        typing: true, // TODO: change
                        question: round.question,
                        number: i,
                        winner: null
                    };
                    break;

                case "choice":
                    this.rounds[i] = {
                        type: round.type,
                        typing: false, // TODO: change
                        question: round.question,
                        choices: round.choices,
                        number: i,
                        winner: null
                    };
                    break;
            }
        });
        // TODO: response.
    }

    start() {
        this.started = true;
        this.participants.forEach(p => {
            p.ws.send(JSON.stringify({
                event: WebSocketEvents.GAME_STARTED,
                data: { message: "Spiel gestartet" }
            }));
        });

        this.currentRound = -1; // will be incremented to 0 in nextRound()
        this.nextRound(); // serve first round of questions
    }

    finishRound() {
        this.currentRoundFinished = true;
        this.participants.forEach(p => {
            p.ws.send(JSON.stringify({
                event: WebSocketEvents.ROUND_FINISHED,
                data: { message: "Runde beendet" }
            }));
        });
        this.buzzerPressed = false;
        this.buzzerPressedBy = null;
    }

    nextRound() {
        this.currentRound++;
        const round = this.rounds[this.currentRound];
        this.participants.forEach(p => {
            p.ws.send(JSON.stringify({
                event: WebSocketEvents.NEXT_ROUND,
                data: { round: this.cleanRound(round) }
            }));
        });
        this.buzzerPressed = false;
        this.buzzerPressedBy = null;
    }

    triggerBuzzer(participant: Participant) {
        this.participants.forEach(p => {
            p.ws.send(JSON.stringify({
                event: WebSocketEvents.BUZZER_PRESSED,
                data: { participant: this.cleanParticipant(participant.user) }
            }));
        });

        this.buzzerPressedBy = participant;
        this.buzzerPressed = true;
    }

    resetBuzzer() {
        this.participants.forEach(p => {
            p.ws.send(JSON.stringify({
                event: WebSocketEvents.BUZZER_RESETTED,
                data: { message: "Buzzer zurückgesetzt" }
            }));
        });

        this.buzzerPressedBy = null;
        this.buzzerPressed = false;
    }

    submitAnswer(participant: Participant, answer: string) {
        this.answers.set(participant, answer);
        participant.ws.send(JSON.stringify({
            event: WebSocketEvents.ANSWER_SUBMITTED,
            data: {
                message: "Antwort gespeichert",
            }
        }));
        this.host.ws.send(JSON.stringify({
            event: WebSocketEvents.RCV_ANSWER_SUBMITTED,
            data: {
                participant: this.cleanParticipant(participant.user),
                answer: answer
            }
        }));
    }

    submitChoice(participant: Participant, choice: number) {
        // eslint-disable-next-line yoda
        if (!(0 < choice && choice < (<ChoiceRound> this.rounds[this.currentRound]).choices.length)) {
            participant.ws.send(JSON.stringify({
                event: WebSocketEvents.ERROR,
                data: { message: "Ungültige Auswahl" }
            }));
            return;
        }
        this.choices.set(participant, choice);
        participant.ws.send(JSON.stringify({
            event: WebSocketEvents.CHOICE_SUBMITTED,
            data: {
                message: "Auswahl gespeichert",
            }
        }));
        this.host.ws.send(JSON.stringify({
            event: WebSocketEvents.RCV_CHOICE_SUBMITTED,
            data: {
                participant: this.cleanParticipant(participant.user),
                choice: choice
            }
        }));
    }

    typing(participant: Participant, content: string) {
        this.host.ws.send(JSON.stringify({
            event: WebSocketEvents.RCV_TYPING,
            data: {
                participant: this.cleanParticipant(participant.user),
                content: content
            }
        }));
    }

    removePlayer(player: Participant) {
        this.participants = this.participants.filter(p => p.user.userID !== player.user.userID);
    }

    leave(participant: Participant) {
        this.removePlayer(participant);
        participant.ws.send(JSON.stringify({
            event: WebSocketEvents.GAME_LEFT,
            data: { message: "Du hast das Spiel verlassen" }
        }));

        this.participants.forEach(p => {
            p.ws.send(JSON.stringify({
                event: WebSocketEvents.PARTICIPANT_LEFT,
                data: {
                    participant: this.cleanParticipant(participant.user),
                    message: `${participant.user.displayName} hat das Spiel verlassen`
                }
            }));
        });
    }

    kickPlayer(player: CleanParticipant["userID"]) {
        const participant = this.participants.find(p => p.user.userID === player);
        this.removePlayer(participant);
        this.participants.forEach(p => {
            p.ws.send(JSON.stringify({
                event: WebSocketEvents.PARTICIPANT_LEFT,
                data: { participant: this.cleanParticipant(participant.user) }
            }));
        });

        participant.ws.send(JSON.stringify({
            event: WebSocketEvents.GAME_LEFT,
            data: { message: "Du wurdest aus dem Spiel geworfen" }
        }));
    }

    banPlayer(player: CleanParticipant["userID"]) {
        const participant = this.participants.find(p => p.user.userID === player);
        this.removePlayer(participant);
        this.participants.forEach(p => {
            p.ws.send(JSON.stringify({
                event: WebSocketEvents.PARTICIPANT_LEFT,
                data: { participant: this.cleanParticipant(participant.user) }
            }));
        });

        this.banned.push(participant);
        participant.ws.send(JSON.stringify({
            event: WebSocketEvents.GAME_LEFT,
            data: { message: "Du wurdest aus dem Spiel geworfen" }
        }));
    }
}
