/* eslint-disable no-unused-vars */
import "./index.scss";

import { OAuthUserTypings } from "@models/OAuthUsers";
import { CleanParticipant } from "@typings";
import Store from "frontend/Store";
import { For, Show } from "solid-js";

const LobbyAdmin = props => {
    const user: () => OAuthUserTypings = props.user;
    const store: () => Store = props.store;

    function generateAvatarUrl(user: CleanParticipant) {
        if (!user.avatarHash) {
            return `https://cdn.discordapp.com/embed/avatars/${Math.floor(Math.random() * 5)}.png`;
        } else {
            return `https://cdn.discordapp.com/avatars/${user.userID}/${user.avatarHash}.${user.avatarHash.startsWith("a_") ? "gif" : "webp"}`;
        }
    }

    function startGame() {
        store().Game.start();
    }

    function stopGame() {
        store().Game.stop();
    }

    function processUserOption(type: string, participant: CleanParticipant) {
        switch (type) {
            case "KICK":
                store().Game.kickPlayer(participant);
                break;
            case "BAN":
                store().Game.banPlayer(participant);
                break;
            default:
                break;
        }
    }

    return (
        <>
            <div class="lobby-admin"> {/* Apply the theme-dark class */}
                <h1 class="text-center">Invite Code: {store().Game.gameID()}</h1>
                <div class="participant-grid">
                    <div class="participant-box">
                        <button onClick={startGame}>Start</button>
                        <button style={{"margin-top": "3px"}} onClick={stopGame}>Stop</button>
                    </div>
                    <For each={store().Game.participants()}>
                        {(participant, index) => (
                            <div class="participant-box">
                                <div class="participant-profile">
                                    <img src={generateAvatarUrl(participant)} alt="Discord Avatar" />
                                    <span style={{"margin-top": "5px"}}>{participant.displayName}</span>
                                </div>
                                <select
                                    style={{"width": "100%", "margin-top": "9px"}}
                                    value="Optionen"
                                    onChange={e => processUserOption(e.target.value, participant)}
                                >
                                    <option value="NONE">Optionen</option>
                                    <Show when={store().Game.host().userID !== participant.userID}>
                                        <option value="KICK">Kick</option>
                                        <option value="BAN">Bann</option>
                                    </Show>
                                </select>
                            </div>
                        )}
                    </For>
                </div>
            </div>
        </>
    );
};
export default LobbyAdmin;
