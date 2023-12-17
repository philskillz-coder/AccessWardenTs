import { useNavigate } from "@solidjs/router";
import Store from "frontend/Store";

import { api } from "../utils";

const Dashboard = props => {
    const store: () => Store = props.store;

    const navigate = useNavigate();
    async function logout() {
        await api.post("/api/auth/logout", {}, async () => {
            store().setUser(null);
            navigate("/");
        });
    }

    const testMfa = async () => {
        await api.post("/api/test-mfa", {}, async res => {
            console.log(res);
        });
    };

    return (
        <>
            <div class="ui-modal center">
                <h1>Welcome back {store().user()?.email}</h1>
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
            </div>
        </>
    );
};

export default Dashboard;
