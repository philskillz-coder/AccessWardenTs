import { CleanUser } from "@typings";
import { createEffect, createSignal, Show } from "solid-js";

import { api } from "../utils";

const MfaManager = props => {
    // eslint-disable-next-line no-unused-vars
    const user: () => CleanUser = props.user;
    const [mfaEnabled, setMfaEnabled] = createSignal(false);

    api.post("/api/mfa/status", {}, async res => {
        setMfaEnabled(res.data.enabled);

        createEffect(() => {
            if (mfaEnabled()) {
                api.post("/api/mfa/setup");
            } else {
                api.post("/api/mfa/disable");
            }
        });
    });

    return (
        <div class="ui-modal">
            <h1>Manage 2FA</h1>
            <div class="actions">
                <Show when={mfaEnabled()}>
                    <div class="action border bg-danger no-dyn-txt">
                        <button type="button" onClick={() => setMfaEnabled(false)}>Disable 2FA</button>
                    </div>
                </Show>
                <Show when={!mfaEnabled()}>
                    <div class="action border bg-success no-dyn-txt">
                        <button type="button" onClick={() => setMfaEnabled(true)}>Enable 2FA</button>
                    </div>
                </Show>
            </div>
        </div>
    );
};

export default MfaManager;
