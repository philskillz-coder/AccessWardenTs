import { CleanGame, CleanParticipant, CleanRound, Game } from "@typings";

/* eslint-disable no-unused-vars */
export enum WebSocketEvents {
    AUTH = "AUTH",
    ERROR = "ERROR",
    HELLO = "HELLO",
    HEARTBEAT = "HEARTBEAT",
    CATCH_UP = "CATCH_UP",
    CATCHED_UP = "CATCHED_UP",
    CREATE_GAME = "CREATE_GAME",
    GAME_CREATED = "GAME_CREATED",
    JOIN_GAME = "JOIN_GAME",
    GAME_JOINED = "GAME_JOINED",
    PARTICIPANT_JOINED = "PARTICIPANT_JOINED",
    LEAVE_GAME = "LEAVE_GAME",
    GAME_LEFT = "GAME_LEFT",
    PARTICIPANT_LEFT = "PARTICIPANT_LEFT",
    SETUP_ROUNDS = "SETUP_ROUNDS",
    START_GAME = "START_GAME",
    STOP_GAME = "STOP_GAME",
    GAME_STARTED = "GAME_STARTED",
    FINISH_ROUND = "FINISH_ROUND",
    ROUND_FINISHED = "ROUND_FINISHED",
    NEXT_ROUND = "NEXT_ROUND",
    BUZZER_PRESSED = "BUZZER_PRESSED",
    RESET_BUZZER = "RESET_BUZZER",
    BUZZER_RESETTED = "BUZZER_RESETTED",
    TYPING = "TYPING",
    RCV_TYPING = "RCV_TYPING",
    SUBMIT_ANSWER = "SUBMIT_ANSWER",
    ANSWER_SUBMITTED = "ANSWER_SUBMITTED",
    RCV_ANSWER_SUBMITTED = "RCV_ANSWER_SUBMITTED",
    SUBMIT_CHOICE = "SUBMIT_CHOICE",
    CHOICE_SUBMITTED = "CHOICE_SUBMITTED",
    RCV_CHOICE_SUBMITTED = "RCV_CHOICE_SUBMITTED",
    KICK_PLAYER = "KICK_PLAYER",
    BAN_PLAYER = "BAN_PLAYER"
}

export type NotificationStatusTypes = "success" | "info" | "warning" | "danger";

export type WebSocketMessage = {
    [key in WebSocketEvents]: {
        event: key;
        data: EventData[key];
    }
}[WebSocketEvents]

export interface EventData {
    [WebSocketEvents.AUTH]: {
        token: string;
    };
    [WebSocketEvents.ERROR]: {
        message: string;
    };
    [WebSocketEvents.HELLO]: {
        HEARTBEAT_INTERVAL: number;
        needAuth: boolean;
    };
    [WebSocketEvents.HEARTBEAT]: {};
    [WebSocketEvents.CREATE_GAME]: {};
    [WebSocketEvents.CATCH_UP]: {};
    [WebSocketEvents.CATCHED_UP]: {
        message: string;
        status: "NoData" | "Data";
        data?: Game;
    };
    [WebSocketEvents.GAME_CREATED]: {
        message: string;
        game: CleanGame;
    };
    [WebSocketEvents.JOIN_GAME]: {
        code: string;
    };
    [WebSocketEvents.GAME_JOINED]: {
        message: string;
        game: CleanGame;
    };
    [WebSocketEvents.PARTICIPANT_JOINED]: {
        message: string;
        participant: CleanParticipant;
    };
    [WebSocketEvents.LEAVE_GAME]: {};
    [WebSocketEvents.GAME_LEFT]: {
        message: string;
    };
    [WebSocketEvents.PARTICIPANT_LEFT]: {
        participant: CleanParticipant;
        message: string;
    };
    [WebSocketEvents.SETUP_ROUNDS]: {
        rounds: CleanRound[];
    };
    [WebSocketEvents.START_GAME]: {};
    [WebSocketEvents.STOP_GAME]: {};
    [WebSocketEvents.GAME_STARTED]: {
        message: string;
    };
    [WebSocketEvents.FINISH_ROUND]: {};
    [WebSocketEvents.ROUND_FINISHED]: {};
    [WebSocketEvents.NEXT_ROUND]: {
        round?: CleanRound;
    };
    [WebSocketEvents.BUZZER_PRESSED]: {
        participant: CleanParticipant;
    };
    [WebSocketEvents.RESET_BUZZER]: {};
    [WebSocketEvents.BUZZER_RESETTED]: {
        message: string;
    };
    [WebSocketEvents.TYPING]: {
        content: string;
    };
    [WebSocketEvents.RCV_TYPING]: {
        participant: CleanParticipant;
        content: string;
    };
    [WebSocketEvents.SUBMIT_ANSWER]: {
        answer: string;
    };
    [WebSocketEvents.ANSWER_SUBMITTED]: {
        message: string;
    };
    [WebSocketEvents.RCV_ANSWER_SUBMITTED]: {
        participant: CleanParticipant;
        answer: string;
    };
    [WebSocketEvents.SUBMIT_CHOICE]: {
        choice: number;
    };
    [WebSocketEvents.CHOICE_SUBMITTED]: {
        message: string;
    };
    [WebSocketEvents.RCV_CHOICE_SUBMITTED]: {
        participant: CleanParticipant;
        choice: number;
    };
    [WebSocketEvents.KICK_PLAYER]: {
        participant: CleanParticipant; // TODO: maybe send id?
    };
    [WebSocketEvents.BAN_PLAYER]: {
        participant: CleanParticipant; // TODO: maybe send id?
    };
}
