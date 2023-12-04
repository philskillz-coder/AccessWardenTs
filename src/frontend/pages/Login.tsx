import { A } from "@solidjs/router";
import { createSignal } from "solid-js";

import { api } from "../utils";

const Login = () => {
    const [username, setUsername] = createSignal(""); // email of the user
    const [password, setPassword] = createSignal(""); // password of the user
    // const navigate = useNavigate();

    const loginUser = async () => {
        await api.post("/api/auth/login", {
            username: username(),
            password: password()
        }, async res => {
            console.log(res);
        });
    };

    return (
        <div class="modal center">
            <h1>Login</h1>
            <div class="actions">
                <div class="action border">
                    <input type="text" placeholder="Username or Email Address" onChange={e => setUsername(e.target.value)} />
                </div>
                <div class="action border">
                    <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
                </div>
                <div class="action border bg-success no-dyn-txt">
                    <button onClick={loginUser}>Login</button>
                </div>
            </div>
            <span>
                Don't have an account? <A href="/register">Register here</A>
            </span>
        </div>
    );
};

export default Login;
