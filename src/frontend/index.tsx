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
    <HopeProvider config={config}>
        <NotificationsProvider>
            <Toaster/>
            <Router>
                <App />
            </Router>
        </NotificationsProvider>
    </HopeProvider>,
    document.getElementById("app") as HTMLElement
);
