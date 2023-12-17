/* eslint-disable no-unused-vars */

import Lobby from "@components/Lobby";
import LobbyAdmin from "@components/LobbyAdmin";
import Round from "@components/Round";
import RoundAdmin from "@components/RoundAdmin";
import { OAuthUserTypings } from "@models/OAuthUsers";
import Store from "frontend/Store";
import { createSignal, Show } from "solid-js";

const LobbyManager = props => {
    const user: () => OAuthUserTypings = props.user;
    const store: () => Store = props.store;
    const [gameCode, setGameCode] = createSignal("");

    return (
        <>
            <div class="lobby-manager">
                <Show
                    when={store()?.Game.gameID()}
                    fallback={
                        <div class="ui-modal">
                            <h1>Spiel beitreten oder erstellen?</h1>
                            <div class="actions">
                                <div class="action">
                                    <input type="text" placeholder="Spielcode" value={gameCode()} onInput={e => setGameCode(e.target.value)} />
                                    <button onClick={() => store().Game.joinGame(gameCode())}>Beitreten</button>
                                </div>
                                <div class="action">
                                    <button onClick={() => store().Game.createGame()}>Erstellen</button>
                                </div>
                            </div>
                        </div>
                    }
                >
                    <Show
                        when={store()?.Game.started()}
                        fallback={
                            <Show
                                when={store()?.Game.host().userID === user().userID}
                                fallback={
                                    <Lobby
                                        user={user}
                                        store={store}
                                    />
                                }
                            >
                                <LobbyAdmin
                                    user={user}
                                    store={store}
                                />
                            </Show>
                        }
                    >
                        <Show
                            when={store()?.Game.host().userID === user().userID}
                            fallback={
                                <Round
                                    user={user}
                                    store={store}
                                />
                            }
                        >
                            <RoundAdmin
                                user={user}
                                store={store}
                            />
                        </Show>
                    </Show>
                </Show>
            </div>
        </>
    );
};

export default LobbyManager;
