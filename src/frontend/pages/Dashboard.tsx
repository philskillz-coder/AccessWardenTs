import { A, useNavigate } from "@solidjs/router";
import Store from "frontend/Store";

import { api } from "../utils";

const Dashboard = props => {
    const store: () => Store = props.store;

    const navigate = useNavigate();
    async function logout() {
        if (!store().user()) {
            navigate("/");
            return;
        }

        await api.post("/api/auth/logout", {}, async res => {
            if (res.hasError()) {
                console.error(res.message);
                return;
            }

            store().setUser(null);
            navigate("/");
        });
    }

    return (
        <>
            <div class="ui-modal center">
                <h1>Welcome back {store().user()?.email}</h1>
                <div class="actions">
                    <div class="action border">
                        <A href="/v-users" class="bg-info">View Users</A>
                    </div>
                    <div class="action border">
                        <A href="/v-roles" class="bg-info">View Roles</A>
                    </div>
                    <div class="action border">
                        <A href="/v-perms" class="bg-info">View Permissions</A>
                    </div>
                    <div class="action border">
                        <button type="button" class="bg-danger" onClick={logout}>Log out</button>
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
