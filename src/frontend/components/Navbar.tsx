// import "./navbar.scss";

import { useColorModeValue } from "@hope-ui/solid";
import { A, useNavigate } from "@solidjs/router";
import { Show } from "solid-js";

import Store from "../Store";
import { api } from "../utils";
import { ColorModeSwitcher } from "./ColorMode";

export const Navbar = props => {
    const store: () => Store = props.store;
    const navbarClass = useColorModeValue("navbar-light", "navbar-dark");

    const navigate = useNavigate();

    async function logout() {
        await api.post("/api/auth/logout", {}, async () => {
            store().setUser(null);
            navigate("/");
        });
    }

    return (
        <nav classList={{
            "navbar navbar-expand-lg ui-bg-gray5 p-2": true,
            [navbarClass()]: true
        }}>
            <A class="navbar-brand" href="/" style={{"font-size": "1.3rem!important"}}>AccessWarden</A>
            <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                <span class="navbar-toggler-icon" />
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav ms-auto">
                    <Show when={store().user()}>
                        <li class="nav-item"><A class="nav-link" href="/v-users">Users</A></li>
                        <li class="nav-item"><A class="nav-link" href="/v-roles">Roles</A></li>
                        <li class="nav-item"><A class="nav-link" href="/v-perms">Permissions</A></li>
                        <li class="nav-item"><A class="nav-link" href="/dashboard">Dashboard</A></li>
                        <li class="nav-item"><A class="nav-link" href="/account">Account</A></li>
                        <li class="nav-item"><a class="nav-link inactive" role="button" href="#" onClick={logout}>Logout</a></li>
                    </Show>
                    <Show when={!store().user()}>
                        <li class="nav-item"><A class="nav-link" href="/login">Login</A></li>
                        <li class="nav-item"><A class="nav-link" href="/register">Register</A></li>
                    </Show>
                    <li class="nav-item"><ColorModeSwitcher /></li>
                </ul>
            </div>
        </nav>
    );
};

export default Navbar;
