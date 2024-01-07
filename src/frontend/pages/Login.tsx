import { MfaSuggested } from "@components/notifications/MfaSuggested";
import { notificationService } from "@hope-ui/solid";
import { A, useNavigate } from "@solidjs/router";
import { UserVariantAuth } from "@typings";
import Store from "frontend/Store";
import { BsEye, BsEyeSlash } from "solid-icons/bs";
import {createSignal, Show} from "solid-js";

import { api } from "../utils";

const Login = props => {
    const store: () => Store = props.store;

    const [username, setUsername] = createSignal(""); // email of the user
    const [password, setPassword] = createSignal(""); // password of the user
    const [showPassword, setShowPassword] = createSignal(false);
    const navigate = useNavigate();
    // const location = useLocation();

    async function loginUser() {
        await api.post("/api/auth/login", {
            username: username(),
            password: password()
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
                    description: "Logged in successfully"
                });
                const user: UserVariantAuth = res.data.user;
                if (user.mfaSuggested) {
                    notificationService.show({
                        status: "info",
                        duration: 10000,
                        render: props => (
                            <MfaSuggested {...props}/>
                        )
                    });
                }
                store().setUser(res.data.user);

                const params = new URLSearchParams(window.location.search);
                const returnTo = params.get("return");

                try {
                    navigate(returnTo);
                } catch {
                    navigate("/account");
                }
            }
        });
    }

    return (
        <div class="ui-modal center">
            <h1>Login</h1>
            <div class="actions">
                <form>
                    <div class="action border">
                        <input type="text" id="login-username" placeholder="Username or Email Address" autocomplete="username" onChange={e => setUsername(e.target.value)} />
                    </div>
                    <div class="action border">
                        <input type={showPassword() ? "text" : "password"} id="login-password" placeholder="Password" autocomplete="current-password" onChange={e => setPassword(e.target.value)} />
                        <button type="button" class="ui-icon w-20" style={{ border: "1px solid var(--gray2)", "border-left": "none"}} onClick={() => setShowPassword(!showPassword())}>
                            <div>
                                <Show when={!showPassword()}>
                                    <BsEye size={15} color="#ffffff" />
                                </Show>
                                <Show when={showPassword()}>
                                    <BsEyeSlash size={15} color="#ffffff" />
                                </Show>
                            </div>
                        </button>
                    </div>
                    <div class="action bg-success no-dyn-txt">
                        <button type="button" onClick={loginUser}>Login</button>
                    </div>
                </form>
            </div>
            <span>
                Don't have an account? <A href="/register">Register here</A>
            </span>
        </div>
    );
};

export default Login;
