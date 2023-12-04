import { A } from "@solidjs/router";
import { createSignal } from "solid-js";

const Register = () => {
    const [email, setEmail] = createSignal(""); // email of the user
    const [username, setUsername] = createSignal(""); // email of the user
    const [password, setPassword] = createSignal(""); // password of the user
    // const navigate = useNavigate();

    const registerUser = async () => {
        fetch("/api/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email: email(), username: username(), password: password() }),
        }).then(res => res.json()).then(console.log);
    };

    return (
        <>
            <div class="modal center">
                <h1>Register</h1>
                <div class="actions">
                    <div class="action border">
                        <input type="email" placeholder="Your Email" onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div class="action border">
                        <input type="text" placeholder="Your Username" onChange={e => setUsername(e.target.value)} />
                    </div>
                    <div class="action border">
                        <input type="password" placeholder="Your Password" onChange={e => setPassword(e.target.value)} />
                    </div>
                    <div class="action bg-success no-dyn-txt">
                        <button type="submit" onClick={registerUser}>Register</button>
                    </div>
                </div>
                <span>Already have an account? <A href="/login">Login here</A></span>
            </div>
        </>
    );
};

export default Register;
