import { notificationService } from "@hope-ui/solid";
import { A, useNavigate } from "@solidjs/router";
import Store from "frontend/Store";
import { createSignal } from "solid-js";

import { api } from "../utils";

const Login = props => {
    const store: () => Store = props.store;

    const [username, setUsername] = createSignal(""); // email of the user
    const [password, setPassword] = createSignal(""); // password of the user
    const navigate = useNavigate();

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
                store().setUser(res.data.user);
                navigate("/account");
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
                        <input type="password" id="login-password" placeholder="Password" autocomplete="current-password" onChange={e => setPassword(e.target.value)} />
                    </div>
                    <div class="action border bg-success no-dyn-txt">
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
