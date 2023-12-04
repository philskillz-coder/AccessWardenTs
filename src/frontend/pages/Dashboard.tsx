import MfaManager from "@components/MfaManager";
import { createSignal } from "solid-js";

import { api } from "../utils";

const Dashboard = () => {
    const [user, setUser] = createSignal(null);

    const logout = async () => {
        // await apiPost("/api/auth/logout");
        setUser(null);
    };

    const testMfa = async () => {
        await api.post("/api/test-mfa", {}, async res => {
            console.log(res);
        });
    };

    return (
        <>
            <div class="modal center">
                <h1>Welcome back {user() && user().email}</h1>
                <div class="actions">
                    <div class="action">
                        <button type="button" class="bg-danger" onClick={logout}>Log out</button>
                    </div>
                    <div class="action">
                        <button type="button" class="bg-danger" onClick={testMfa}>Test Mfa</button>
                    </div>
                </div>
            </div>
            <div>
                <h2>Your Account</h2>
                <MfaManager user={user} />
            </div>
        </>
    );
};

export default Dashboard;
