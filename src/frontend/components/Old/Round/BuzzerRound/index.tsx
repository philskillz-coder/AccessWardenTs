/* eslint-disable no-unused-vars */

import { OAuthUserTypings } from "@models/OAuthUsers";
import { CleanParticipant, WebSocketEvents } from "@typings";
import Store from "frontend/Store";

const BuzzerRoundCom = props => {
    const user: () => OAuthUserTypings = props.user;
    const store: () => Store = props.store;

    function generateAvatarUrl(user: CleanParticipant) {
        if (!user.avatarHash) {
            return `https://cdn.discordapp.com/embed/avatars/${Math.floor(Math.random() * 5)}.png`;
        } else {
            return `https://cdn.discordapp.com/avatars/${user.userID}/${user.avatarHash}.${user.avatarHash.startsWith("a_") ? "gif" : "webp"}`;
        }
    }

    function pressBuzzer() {
        store().Socket.send({
            event: WebSocketEvents.BUZZER_PRESSED // TODO: change
        });
    }

    return (
        <>
            <div class="modal">
                <h1>{store().Game.round().question}</h1>
                <div class="actions">
                    <div class="action">
                        <button class="action-button" onClick={pressBuzzer} disabled={store().Game.buzzerPressed()}>Buzzer</button>
                    </div>
                </div>
            </div>
        </>
    );
};
export default BuzzerRoundCom;
