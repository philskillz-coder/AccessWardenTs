/* eslint-disable no-unused-vars */
import "./index.scss";

import { OAuthUserTypings } from "@models/OAuthUsers";
import { CleanParticipant } from "@typings";
import Store from "frontend/Store";
import { For } from "solid-js";

const Lobby = props => {
    const user: () => OAuthUserTypings = props.user;
    const store: () => Store = props.store;

    function generateAvatarUrl(user: CleanParticipant) {
        if (!user.avatarHash) {
            return `https://cdn.discordapp.com/embed/avatars/${Math.floor(Math.random() * 5)}.png`;
        } else {
            return `https://cdn.discordapp.com/avatars/${user.userID}/${user.avatarHash}.${user.avatarHash.startsWith("a_") ? "gif" : "webp"}`;
        }
    }


    return (
        <>
            <div class="lobby"> {/* Apply the theme-dark class */}
                <h1 class="text-center">Invite Code: {store().Game.gameID()}</h1>
                <div class="participant-grid">
                    <div class="participant-box" role="button">
                        <button onClick={store().Game.leaveGame}>Leave</button>
                    </div>
                    <For each={store().Game.participants()}>
                        {(participant, index) => (
                            <div class="participant-box">
                                <div class="participant-profile">
                                    <img src={generateAvatarUrl(participant)} alt="Discord Avatar" />
                                    <span style={{"margin-top": "5px"}}>{participant.displayName}</span>
                                </div>
                            </div>
                        )}
                    </For>
                </div>
            </div>
        </>
    );
};
export default Lobby;
