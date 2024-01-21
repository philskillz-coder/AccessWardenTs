import { notificationService } from "@hope-ui/solid";
import { BaseRules, getFirstCheckError } from "@shared/Validation";
import { A, useNavigate } from "@solidjs/router";
import { UserVariantP } from "@typings";
import { createEffect, createSignal,  Show } from "solid-js";

import Store from "../Store";
import { api } from "../utils";

const Register = props => {
    const store: () => Store = props.store;

    let emailRules: BaseRules = null;
    const [email, setEmail] = createSignal(""); // email of the user
    const [emailError, setEmailError] = createSignal(null); // email of the user
    const [emailValid, setEmailValid] = createSignal(false); // email of the user

    let usernameRules: BaseRules = null;
    const [username, setUsername] = createSignal(""); // email of the user
    const [usernameError, setUsernameError] = createSignal(null); // email of the user
    const [usernameValid, setUsernameValid] = createSignal(false); // email of the user

    let passwordRules: BaseRules = null;
    const [password, setPassword] = createSignal(""); // password of the user
    const [passwordError, setPasswordError] = createSignal(null); // password of the user
    const [passwordValid, setPasswordValid] = createSignal(false); // password of the user

    const navigate = useNavigate();

    createEffect(() => {
        const err = getFirstCheckError(email(), emailRules);
        if (err !== null) {
            setEmailError(err);
            setEmailValid(false);
        } else {
            setEmailError(null);
            setEmailValid(true);
        }
    });

    createEffect(() => {
        const err = getFirstCheckError(username(), usernameRules);

        if (err !== null) {
            setUsernameError(err);
            setUsernameValid(false);
        } else {
            setUsernameError(null);
            setUsernameValid(true);
        }
    });

    createEffect(() => {
        const err = getFirstCheckError(password(), passwordRules);

        if (err !== null) {
            setPasswordError(err);
            setPasswordValid(false);
        } else {
            setPasswordError(null);
            setPasswordValid(true);
        }
    });

    async function registerUser() {
        await api.post("/api/auth/register", {
            email: email(),
            username: username(),
            password: password(),
        }, async res => {
            if (res.hasError()) {
                notificationService.show({
                    status: "danger",
                    title: "Error",
                    description: res.message
                });
            } else {
                notificationService.show({
                    status: "success",
                    title: "Success",
                    description: "Registered successfully"
                });
                const registeredUser: UserVariantP = res.data.user;
                store().setUser(registeredUser);
                navigate("/account");
            }
        });
    }

    api.post("/api/auth/register/rules", {}, async res => {
        if (res.hasError()) {
            notificationService.show({
                status: "danger",
                title: "Error",
                description: res.message
            });
        } else {
            emailRules = res.data.email;
            usernameRules = res.data.username;
            passwordRules = res.data.password;
        }
    });

    return (
        <>
            <div class="ui-modal center">
                <h1>Register</h1>
                <div class="actions">
                    <form>
                        <div class="action border">
                            <input id="register-mail" type="email" placeholder="Your Email" name="email" autocomplete="email" onInput={e => setEmail(e.target.value)} />
                        </div>
                        <Show when={emailError() !== null}>
                            <label for="register-mail" class="c-danger">{emailError()}</label>
                        </Show>

                        <div class="action border">
                            <input id="register-username" type="text" placeholder="Your Username" name="username" autocomplete="username" onInput={e => setUsername(e.target.value)} />
                        </div>
                        <Show when={usernameError() !== null}>
                            <label for="register-username" class="c-danger">{usernameError()}</label>
                        </Show>

                        <div class="action border">
                            <input id="register-new-password" type="password" placeholder="Your Password" name="password" autocomplete="new-password" onInput={e => setPassword(e.target.value)} />
                        </div>
                        <Show when={passwordError() !== null}>
                            <label for="register-new-password" class="c-danger">{passwordError()}</label>
                        </Show>

                        <div class="action bg-success no-dyn-txt">
                            <button type="button" onClick={registerUser} disabled={!emailValid() || !usernameValid() || !passwordValid()}>Register</button>
                        </div>
                    </form>
                </div>
                <span>Already have an account? <A href="/login">Login here</A></span>
            </div>
        </>
    );
};

export default Register;
