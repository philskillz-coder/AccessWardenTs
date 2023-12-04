/* eslint-disable no-unused-vars */

import { OAuthUserTypings } from "@models/OAuthUsers";
import { CleanParticipant } from "@typings";
import Store from "frontend/Store";
import { Show } from "solid-js";

import BuzzerRoundCom from "./BuzzerRound";
import ChoiceRoundCom from "./ChoiceRound";
import EstimateRoundCom from "./EstimateRound";
import FinishedRoundCom from "./FinishedRound";

const Round = props => {
    const user: () => OAuthUserTypings = props.user;
    const store: () => Store = props.store;

    function generateAvatarUrl(user: CleanParticipant) {
        if (!user.avatarHash) {
            return `https://cdn.discordapp.com/embed/avatars/${Math.floor(Math.random() * 5)}.png`;
        } else {
            return `https://cdn.discordapp.com/avatars/${user.userID}/${user.avatarHash}.${user.avatarHash.startsWith("a_") ? "gif" : "webp"}`;
        }
    }

    console.log(store().Game.roundFinished());
    return <>
        <Show when={store().Game.roundFinished()}>
            <FinishedRoundCom
                user={user}
                store={store}
            />
        </Show>
        <Show when={store().Game.round()?.type === "buzzer" && !store().Game.roundFinished()}>
            <BuzzerRoundCom
                user={user}
                store={store}
            />
        </Show>
        <Show when={store().Game.round()?.type === "estimate" && !store().Game.roundFinished()}>
            <EstimateRoundCom
                user={user}
                store={store}
            />
        </Show>
        <Show when={store().Game.round()?.type === "choice" && !store().Game.roundFinished()}>
            <ChoiceRoundCom
                user={user}
                store={store}
            />
        </Show>
    </>;
};
export default Round;
