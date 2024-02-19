import { FormControl, FormHelperText, Input, notificationService } from "@hope-ui/solid";
import { A, useNavigate } from "@solidjs/router";
import { UserVariantP } from "@typings";
import { Show } from "solid-js";

import Store from "../Store";
import { api, Validator } from "../utils";

const Register = props => {
    const store: () => Store = props.store;

    const validator = new Validator("username", "email", "password");

    const [email, setEmail, emailError] = validator.useValidator("email", ""); // email of the user
    const [username, setUsername, usernameError] = validator.useValidator("username", ""); // email of the user
    const [password, setPassword, passwordError] = validator.useValidator("password", ""); // password of the user

    const navigate = useNavigate();

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

    return (
        <>
            <div class="ui-modal center">
                <h1>Register</h1>
                <div class="actions">
                    <FormControl mb="$4">
                        <Input
                            id="register-mail"
                            type="email"
                            placeholder="Your Email"
                            name="email"
                            autocomplete="email"
                            onInput={e => setEmail(e.target.value)}
                            value=""
                        />
                        <Show when={emailError() !== null}>
                            <FormHelperText color="red">{emailError()}</FormHelperText>
                        </Show>
                    </FormControl>

                    <FormControl mb="$4">
                        <Input
                            id="register-username"
                            type="text"
                            placeholder="Your Username"
                            name="username"
                            autocomplete="off"
                            onInput={e => setUsername(e.target.value)}
                            value=""
                        />
                        <Show when={usernameError() !== null}>
                            <FormHelperText color="red">{usernameError()}</FormHelperText>
                        </Show>
                    </FormControl>

                    {/* TODO: confirm password */}
                    <FormControl mb="$4">
                        <Input
                            id="register-new-password"
                            type="password"
                            placeholder="Your Password"
                            name="password"
                            autocomplete="new-password"
                            onInput={e => setPassword(e.target.value)}
                            value=""
                        />
                        <Show when={passwordError() !== null}>
                            <FormHelperText color="red">{passwordError()}</FormHelperText>
                        </Show>
                    </FormControl>

                    <div class="action no-dyn-txt">
                        <button
                            classList={{
                                "bg-success": emailError() === null && usernameError() === null && passwordError() === null,
                            }}
                            type="button"
                            onClick={registerUser}
                            disabled={emailError() !== null && usernameError() !== null && passwordError() !== null}
                        >Register</button>
                    </div>
                </div>
                <span>Already have an account? <A href="/login">Login here</A></span>
            </div>
        </>
    );
};

export default Register;
