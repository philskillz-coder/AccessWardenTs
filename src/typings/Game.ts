import { OAuthUserTypings } from "@models/OAuthUsers";
import { Document, Types } from "mongoose";
import WebSocket from "ws";

export interface Game {
    host: Participant;
    gameID: string;
    participants: Participant[];
    started: boolean;
    currentRound: number;
    rounds: Round[];
    buzzerPressed: boolean;
}

export interface CleanGame { // TODO: use CleanGame and CleanParticipant in frontend instead of Game and Participant
    host: CleanParticipant;
    gameID: string;
    participants: CleanParticipant[];
    started: boolean;
    currentRound: number;
    buzzerPressed: boolean;
}

export interface Participant {
    ws: WebSocket;
    user: Document<unknown, {}> & Omit<OAuthUserTypings & { _id: Types.ObjectId; }, never> | null;
    joinedGame?: string;
    score?: number;
}

export interface CleanParticipant {
    displayName: string;
    avatarHash: string;
    userID: string;
    userName: string;
}

export type RTypes = "buzzer" | "estimate" | "choice";

export type Round = BuzzerRound | EstimateRound | ChoiceRound;
export interface _Round {
    type: RTypes;
    winner: Participant | null;
    number: number;
    typing: boolean;
}

export interface BuzzerRound extends _Round {
    type: "buzzer";
    typing: false;
    question: string;
}

export interface EstimateRound extends _Round {
    type: "estimate";
    typing: true
    question: string;
}

export interface ChoiceRound extends _Round {
    type: "choice";
    typing: false;
    question: string;
    choices: string[];
}

export type CleanRound = CleanBuzzerRound | CleanEstimateRound | CleanChoiceRound;
export interface _CleanRound {
    type: RTypes;
    number: number
}

export interface CleanBuzzerRound extends _CleanRound {
    type: "buzzer";
    question: string;
}

export interface CleanEstimateRound extends _CleanRound {
    type: "estimate";
    question: string;
}

export interface CleanChoiceRound extends _CleanRound {
    type: "choice";
    question: string;
    choices: string[];
}
