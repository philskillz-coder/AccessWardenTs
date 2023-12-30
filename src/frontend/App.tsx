import "./app.scss";
import "./index.css";

import Navbar from "@components/Navbar";
import { Button, FormControl, FormLabel, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay } from "@hope-ui/solid";
import Account from "@pages/Account";
import Dashboard from "@pages/Dashboard";
import Landing from "@pages/Landing";
import Login from "@pages/Login";
import Register from "@pages/Register";
import ViewPermissions from "@pages/ViewPermissions";
import ViewUsers from "@pages/ViewUsers";
import { Route, Routes, useNavigate } from "@solidjs/router";
import { ApiResponseFlags } from "@typings";
import { Component, createSignal, onMount } from "solid-js";

import Store from "./Store";
import { api } from "./utils";

const App: Component = () => {
    const [user, setUser] = createSignal(null);
    const [store, setStore] = createSignal(null);

    // eslint-disable-next-line no-unused-vars
    const [isOpen, setOpen] = createSignal(false);
    const [mfa, setMfa] = createSignal(null);

    api.mfaRequiredCallback = () => {
        console.log("mfa required");
        setOpen(true);
    };
    api.mfaInvalidCallback = () => {
        // setOpen(true);
    };
    api.mfaCancelCallback = () => {
        console.log("mfa cancel");
        setOpen(false);
    };
    api.mfaSuccessCallback = () => {
        console.log("mfa success");
        setOpen(false);
    };

    const navigate = useNavigate();

    onMount(async () => {
        const res = await api.post("/api/auth/@me");
        if (res.hasFlag(ApiResponseFlags.unauthorized)) {
            const loginPath = "/login";
            const currentPath = window.location.pathname + window.location.search;

            if (window.location.pathname === loginPath) return;
            if (window.location.pathname === "/register") return;

            if (window.location.search !== "" || window.location.pathname !== "/") {
                navigate(`${loginPath}?return=${encodeURIComponent(currentPath)}`);
            } else {
                navigate(loginPath);
            }
            return;
        }

        setUser(res.data.user);

        const handleChangeColorScheme = () => {
            // load "hope-ui-color-mode" from localStorage
            const colorMode = localStorage.getItem("hope-ui-color-mode");
            document.body.className = `theme-${colorMode} hope-ui-${colorMode}`;
        };
        handleChangeColorScheme();
    });

    setStore(new Store(user, setUser));

    function onMfaClose() {
        setOpen(false);
        api.cancelMfa();
    }

    const supplyMfaCode = async () => {
        await api.supplyMfaToken(mfa());
    };

    // return (
    //     <div>

    //     </div>
    // );

    return (
        <>
            <Navbar store={store}/>
            <div class="background">
                <Routes>
                    <Route path="/" element={<Landing store={store}/>}/>
                    <Route path="/account" element={<Account store={store}/>} />
                    <Route path="/dashboard" element={<Dashboard store={store} />}/>
                    <Route path="/login" element={<Login store={store} />}/>
                    <Route path="/register" element={<Register store={store} />}/>
                    <Route path="/v-users" element={<ViewUsers store={store} />}/>
                    <Route path="/v-perms" element={<ViewPermissions store={store} />}/>
                </Routes>
                <Modal
                    opened={isOpen()}
                    initialFocus="#mfa"
                    onClose={onMfaClose}
                >
                    <ModalOverlay />
                    <ModalContent>
                        <ModalCloseButton />
                        <ModalHeader>2FA Validation Required</ModalHeader>
                        <ModalBody>
                            <FormControl id="mfa" mb="$4">
                                <FormLabel>2FA Code</FormLabel>
                                <Input placeholder="Enter the 2FA code from your app" onChange={e => setMfa(e.target.value)}/>
                            </FormControl>
                        </ModalBody>
                        <ModalFooter>
                            <Button onClick={supplyMfaCode}>Validate</Button>
                        </ModalFooter>
                    </ModalContent>
                </Modal>
            </div>
        </>
    );
};

export default App;
