/* eslint-disable no-unused-vars */
import "./index.scss";

import { OAuthUserTypings } from "@models/OAuthUsers";
import { CleanChoiceRound, CleanParticipant, WebSocketEvents } from "@typings";
import Store from "frontend/Store";
import { For } from "solid-js";

const ChoiceRoundCom = props => {
    const user: () => OAuthUserTypings = props.user;
    const store: () => Store = props.store;

    function generateAvatarUrl(user: CleanParticipant) {
        if (!user.avatarHash) {
            return `https://cdn.discordapp.com/embed/avatars/${Math.floor(Math.random() * 5)}.png`;
        } else {
            return `https://cdn.discordapp.com/avatars/${user.userID}/${user.avatarHash}.${user.avatarHash.startsWith("a_") ? "gif" : "webp"}`;
        }
    }

    function submit(index: number) {
        store().Socket.send({
            event: WebSocketEvents.SUBMIT_CHOICE,
            data: {
                "choice": index
            }
        });
    }

    const choiceGridClass = (store().Game.round() as CleanChoiceRound).choices.length % 2 === 0 ? "cols-2" : "cols-3";
    return (
        <>
            <div class="ui-modal">
                <h1>{store().Game.round().question}</h1>
                <div classList={{
                    "choice-grid": true,
                    [choiceGridClass]: true,
                    "mt-2": true
                }}>
                    <For each={(store().Game.round() as CleanChoiceRound).choices}>
                        {(item, index) => (
                            <div class="choice-box" role="button" onClick={() => submit(index() + 1)}>
                                <span>{item}</span>
                            </div>
                        )}
                    </For>
                </div>
            </div>
        </>
    );
};
export default ChoiceRoundCom;
