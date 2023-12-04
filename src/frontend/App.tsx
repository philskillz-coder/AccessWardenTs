import "./app.scss";
import "./index.css";

import { Button, FormControl, FormLabel, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, useColorMode } from "@hope-ui/solid";
import Dashboard from "@pages/Dashboard";
import Landing from "@pages/Landing";
import Login from "@pages/Login";
import Register from "@pages/Register";
import { Route, Routes } from "@solidjs/router";
import { Component, createEffect, createSignal, onMount } from "solid-js";

import Store from "./Store";
import { api } from "./utils";


const App: Component = () => {
    const [user, setUser] = createSignal(null);
    // eslint-disable-next-line no-unused-vars
    const [store, setStore] = createSignal(null);
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

    onMount(async () => {
        await api.post("/api/auth/@me", {}, async res => {
            setUser(res.data.user);
        });

        const handleChangeColorScheme = () => {
            const colorMode = localStorage.getItem("hope-ui-color-mode");
            document.body.className = `theme-${colorMode} hope-ui-${colorMode}`;
        };
        handleChangeColorScheme();
    });

    // eslint-disable-next-line no-unused-vars
    const { colorMode, toggleColorMode } = useColorMode();

    createEffect(() => {
        if (user()) setStore(new Store(user()?.accessToken));
    });

    function onMfaClose() {
        setOpen(false);
        api.cancelMfa();
    }

    const supplyMfaCode = async () => {
        await api.supplyMfaToken(mfa());
    };

    return (
        <>
            <div class="background">
                <Routes>
                    <Route path="/" element={<Landing user={user}/>}/>
                    <Route path="/dashboard" element={<Dashboard />}/>
                    <Route path="/login" element={<Login />}/>
                    <Route path="/register" element={<Register />}/>
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
