import "./index.css";

import { HopeProvider, HopeThemeConfig, NotificationsProvider } from "@hope-ui/solid";
import { Router } from "@solidjs/router";
import { render } from "solid-js/web";
import { Toaster } from "solid-toast";

import App from "./App";


const config: HopeThemeConfig = {
    initialColorMode: "system"
};

render(() =>
    <Router>
        <HopeProvider config={config}>
            <NotificationsProvider>
                <Toaster/>
                <App />
            </NotificationsProvider>
        </HopeProvider>
    </Router>,
    document.getElementById("app") as HTMLElement
);
