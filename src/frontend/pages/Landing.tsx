import { A } from "@solidjs/router";
import { Show } from "solid-js";

import Store from "../Store";

function Landing(props) {
    const store: () => Store = props.store;

    return (
        <>
            <div class="ui-modal center">
                <Show when={store().user()}>
                    <h1>Welcome back, {store().user().username}</h1>
                    <div class="actions">
                        <div class="action bg-info">
                            <A href="/account">Account</A>
                        </div>
                        <div class="action bg-info">
                            <A href="/dashboard">Dashboard</A>
                        </div>
                    </div>
                </Show>

                <Show when={!store().user()}>
                    <h1>Welcome to AccessWarden</h1>
                    <div class="actions">
                        <div class="action">
                            <A href="/login">Login</A>
                        </div>
                        <div class="action">
                            <A href="/register">Register</A>
                        </div>
                    </div>
                </Show>
            </div>
        </>
    );
}

export default Landing;
