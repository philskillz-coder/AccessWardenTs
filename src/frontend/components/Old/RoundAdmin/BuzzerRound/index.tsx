/* eslint-disable no-unused-vars */
import "./index.scss";

import { OAuthUserTypings } from "@models/OAuthUsers";
import { CleanParticipant } from "@typings";
import Store from "frontend/Store";
import { Show } from "solid-js";

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

    function resetBuzzer() {
        store().Game.resetBuzzer();
    }

    return (
        <>
            <div class="modal">
                <h1>{store().Game.round().question}</h1>
                {/* buzzerPressedBy weil wenn nur buzzerPressed code zu früh aktualisiert -> error */}
                <div class="actions">
                    <Show when={store().Game.buzzerPressedBy()}
                        fallback={
                            <div class="action">
                                <button class="action-button" disabled>Buzzer</button>
                            </div>
                        }
                    >
                        <span class="text-center">Buzzer pressed by {store().Game.buzzerPressedBy().displayName}</span>
                        <div class="participant-box mt-1">
                            <div class="participant-profile">
                                <img src={generateAvatarUrl(store().Game.buzzerPressedBy())}/>
                            </div>
                        </div>
                        <div class="action">
                            <button class="action-button" onClick={resetBuzzer}>Reset</button>
                        </div>
                    </Show>
                </div>
            </div>
        </>
    );
};
export default BuzzerRoundCom;
