/* eslint-disable no-unused-vars */

import { OAuthUserTypings } from "@models/OAuthUsers";
import { CleanParticipant, WebSocketEvents } from "@typings";
import Store from "frontend/Store";

const EstimateRoundCom = props => {
    const user: () => OAuthUserTypings = props.user;
    const store: () => Store = props.store;

    function generateAvatarUrl(user: CleanParticipant) {
        if (!user.avatarHash) {
            return `https://cdn.discordapp.com/embed/avatars/${Math.floor(Math.random() * 5)}.png`;
        } else {
            return `https://cdn.discordapp.com/avatars/${user.userID}/${user.avatarHash}.${user.avatarHash.startsWith("a_") ? "gif" : "webp"}`;
        }
    }

    function typing() {
        store().Socket.send({
            event: WebSocketEvents.TYPING,
            data: {
                "content": "Typing..."
            }
        });
    }

    function submit() {
        store().Socket.send({
            event: WebSocketEvents.SUBMIT_ANSWER,
            data: {
                "answer": "" // TODO: send answer content
            }
        });
    }

    return (
        <>
            <div class="ui-modal">
                <h1>{store().Game.round().question}</h1>
                <div class="actions">
                    <div class="action">
                        <input class="action-input" placeholder="Antwort" onInput={typing}/>
                    </div>
                    <div class="action">
                        <button class="action-button" onClick={submit}>Senden!</button>
                    </div>
                </div>
            </div>
        </>
    );
};
export default EstimateRoundCom;
