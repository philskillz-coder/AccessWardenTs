import { ModalConfirmation } from "@components/ModalConfirmation";
import { Button, FormControl, FormHelperText, FormLabel, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, notificationService } from "@hope-ui/solid";
import Store from "frontend/Store";
import QRCode from "qrcode";
import { BiSolidPencil } from "solid-icons/bi";
import { createSignal, Show } from "solid-js";

import { api, Validator } from "../utils";

const Account = props => {
    const store: () => Store = props.store;
    const validator = new Validator("username", "email", "password");

    const [editingMfa, setShowMfa] = createSignal(false);
    const [mfaData, setMfaData] = createSignal<{ secret_base32, secret_url }>(null);
    const [mfaCode, setMfaCode] = createSignal(null);
    const [disableMfaConfirmationRequired, setDisableMfaConfirmationRequired] = createSignal(false);

    const [editingUsername, setEditingUsername] = createSignal(false);
    const [newUsername, setNewUsername, newUsernameError] = validator.useValidator("username");

    const [editingEmail, setEditingEmail] = createSignal(false);
    const [newEmail, setNewEmail, newEmailError] = validator.useValidator("email");

    const [editingPassword, setEditingPassword] = createSignal(false);
    const [curPassword, setCurPassword] = createSignal(null);
    const [newPassword, setNewPassword, newPasswordError] = validator.useValidator("password");

    function setupMfa() {
        api.post("/api/mfa/setup", {}, async res => {
            const { secret_base32, secret_url } = res.data;
            setMfaData({ secret_base32, secret_url });
            setShowMfa(true);

            QRCode.toCanvas(document.getElementById("mfa-qr-canvas"), secret_url, function(error) {
                if (error) console.error(error);
                console.log("success!");
            });
        }, async err => {
            console.log(err);
            closeMfaEditor();
        });
    }

    function verifyMfa() {
        api.post("/api/mfa/verify-setup", { code: mfaCode() }, async res => {
            if (res.hasError()) {
                console.log("Error", res);
            } else {
                console.log("Mfa verified");
                const currentUser = store().user();
                const updatedUser = { ...currentUser, mfaEnabled: true };
                store().setUser(updatedUser);
                closeMfaEditor();
            }
        });
    }

    function closeMfaEditor() {
        setShowMfa(false);
        setMfaData(null);
        setMfaCode(null);
    }

    function disableMfa() {
        api.post("/api/mfa/disable", {}, async res => {
            console.log("mfa disabled:", res);
            const currentUser = store().user();
            const updatedUser = { ...currentUser, mfaEnabled: false };
            store().setUser(updatedUser);
            setDisableMfaConfirmationRequired(false);
        });
    }

    function closeEmailEditor() {
        setEditingEmail(false);
        setNewEmail(null);
        setCurPassword(null);
    }

    function closeUsernameEditor() {
        setEditingUsername(false);
        setNewUsername(null);
    }

    function closePasswordEditor() {
        setEditingPassword(false);
        setCurPassword(null);
        setNewPassword(null);
    }

    function updateEmail() {
        api.post("/api/user/update/mail", { email: newEmail(), curPassword: curPassword() }, async res => {
            if (res.hasError()) {
                notificationService.show({
                    status: "danger",
                    title: "Error",
                    description: res.message
                });
            } else {
                notificationService.show({
                    status: "success",
                    title: "Success",
                    description: "Email updated"
                });
                const currentUser = store().user();
                const updatedUser = { ...currentUser, email: newEmail() };
                store().setUser(updatedUser);
                closeEmailEditor();
            }
        });
    }

    function updateUsername() {
        api.post("/api/user/update/username", { username: newUsername() }, async res => {
            if (res.hasError()) {
                notificationService.show({
                    status: "danger",
                    title: "Error",
                    description: res.message
                });
            } else {
                notificationService.show({
                    status: "success",
                    title: "Success",
                    description: "Username updated"
                });
                const currentUser = store().user();
                const updatedUser = { ...currentUser, username: newUsername() };
                store().setUser(updatedUser);
                closeUsernameEditor();
            }
        });
    }

    function updatePassword() {
        api.post("/api/user/update/password", { curPassword: curPassword(), newPassword: newPassword() }, async res => {
            if (res.hasError()) {
                notificationService.show({
                    status: "danger",
                    title: "Error",
                    description: res.message
                });
            } else {
                notificationService.show({
                    status: "success",
                    title: "Success",
                    description: "Password updated"
                });
                closePasswordEditor();
            }
        });
    }

    return (
        <div class="ui-modal center">
            <h1>Your Account</h1>
            <div class="actions">
                <label for="acc-mail">Mail</label>
                <div class="action border">
                    <input id="acc-mail" placeholder={store().user().email} disabled/>
                    <button type="button" class="bg-info" style={{ width: "20%", padding: 0}} onClick={() => setEditingEmail(true)}>
                        <div><BiSolidPencil size={15} color="#ffffff"/></div>
                    </button>
                    <Modal opened={editingEmail()} onClose={closeEmailEditor} initialFocus="#acc-new-mail">
                        <ModalOverlay />
                        <ModalContent>
                            <ModalCloseButton />
                            <ModalHeader>Edit Email address</ModalHeader>
                            <ModalBody>
                                <FormControl mb="$4">
                                    <FormLabel>Email Address</FormLabel>
                                    <Input
                                        id="acc-new-mail"
                                        type="mail"
                                        placeholder="Enter new email address"
                                        autocomplete="off"
                                        spellcheck={false}
                                        onInput={e => setNewEmail(e.target.value)}
                                        invalid={newEmailError() !== null}
                                        value=""
                                    />
                                    <Show when={newEmailError() !== null}>
                                        <FormHelperText color="red">{newEmailError()}</FormHelperText>
                                    </Show>
                                </FormControl>
                                <FormControl mb="$4">
                                    <FormLabel>Current Password</FormLabel>
                                    <Input
                                        id="acc-new-mail-cur-password"
                                        type="password"
                                        placeholder="Enter current password"
                                        autocomplete="current-password"
                                        spellcheck={false}
                                        onInput={e => setCurPassword(e.target.value)}
                                    />
                                </FormControl>
                            </ModalBody>
                            <ModalFooter>
                                <Button onClick={updateEmail} disabled={newEmailError() !== null}>Update</Button>
                                <Button id="acc-new-mail-cancel" onClick={closeEmailEditor} ms="auto" colorScheme={"primary"}>Cancel</Button>
                            </ModalFooter>
                        </ModalContent>
                    </Modal>
                </div>

                <label for="acc-username">Username</label>
                <div class="action border">
                    <input id="acc-username" placeholder={store().user().username} disabled/>
                    <button type="button" class="bg-info" style={{ width: "20%", padding: 0}} onClick={() => setEditingUsername(true)}>
                        <div><BiSolidPencil size={15} color="#ffffff"/></div>
                    </button>
                    <Modal opened={editingUsername()} onClose={closeUsernameEditor} initialFocus="#acc-new-username">
                        <ModalOverlay />
                        <ModalContent>
                            <ModalCloseButton />
                            <ModalHeader>Edit Username</ModalHeader>
                            <ModalBody>
                                <FormControl mb="$4">
                                    <FormLabel>Username</FormLabel>
                                    <Input
                                        id="acc-new-username"
                                        type="text"
                                        placeholder="Enter new username"
                                        autocomplete="off"
                                        spellcheck={false}
                                        onInput={e => setNewUsername(e.target.value)}
                                        invalid={newUsernameError() !== null}
                                        value=""
                                    />
                                    <Show when={newUsernameError() !== null}>
                                        <FormHelperText color="red">{newUsernameError()}</FormHelperText>
                                    </Show>
                                </FormControl>
                            </ModalBody>
                            <ModalFooter>
                                <Button onClick={updateUsername} disabled={newUsernameError() !== null}>Update</Button>
                                <Button id="acc-new-username-cancel" onClick={closeUsernameEditor} ms="auto" colorScheme={"primary"}>Cancel</Button>
                            </ModalFooter>
                        </ModalContent>
                    </Modal>
                </div>

                <label for="acc-password">Password</label>
                <div class="action border">
                    <input id="acc-password" type="password" placeholder="************" disabled/>
                    <button type="button" class="bg-info" style={{ width: "20%", padding: 0}} onClick={() => setEditingPassword(true)}>
                        <div class="ui-icon"><BiSolidPencil size={15} color="#ffffff"/></div>
                    </button>
                    <Modal opened={editingPassword()} onClose={closePasswordEditor} initialFocus="#acc-new-password">
                        <ModalOverlay />
                        <ModalContent>
                            <ModalCloseButton />
                            <ModalHeader>New Password</ModalHeader>
                            <ModalBody>
                                <FormControl mb="$4">
                                    <FormLabel>Current Password</FormLabel>
                                    <Input
                                        id="acc-cur-password"
                                        type="password"
                                        placeholder="Enter current password"
                                        autocomplete="current-password"
                                        spellcheck={false}
                                        onInput={e => setCurPassword(e.target.value)}
                                    />
                                </FormControl>
                                <FormControl mb="$4">
                                    <FormLabel>New Password</FormLabel>
                                    <Input
                                        id="acc-new-password"
                                        type="password"
                                        placeholder="Enter new password"
                                        autocomplete="new-password"
                                        spellcheck={false}
                                        onInput={e => setNewPassword(e.target.value)}
                                        invalid={newPasswordError() !== null}
                                        value=""
                                    />
                                    <Show when={newPasswordError() !== null}>
                                        <FormHelperText color="red">{newPasswordError()}</FormHelperText>
                                    </Show>
                                </FormControl>
                            </ModalBody>
                            <ModalFooter>
                                <Button onClick={updatePassword} disabled={newPasswordError() !== null}>Update</Button>
                                <Button id="acc-new-password-cancel" onClick={closePasswordEditor} ms="auto" colorScheme={"primary"}>Cancel</Button>
                            </ModalFooter>
                        </ModalContent>
                    </Modal>
                </div>

                <label>Mfa</label>
                <div class="action no-dyn-txt">
                    <Show when={store().user().mfaEnabled}>
                        <button type="button" class="bg-danger" onClick={() => setDisableMfaConfirmationRequired(true)}>Disable 2FA</button>
                        <ModalConfirmation isOpen={disableMfaConfirmationRequired} onCancel={() => setDisableMfaConfirmationRequired(false)} onConfirm={disableMfa} title="Confirmation required">
                            <p>Are you sure you want to disable 2FA?</p>
                        </ModalConfirmation>
                    </Show>
                    <Show when={store().user().mfaEnabled === false}>
                        <button type="button" class="bg-success" onClick={setupMfa}>Enable 2FA</button>
                        <Modal opened={editingMfa()} onClose={closeMfaEditor} initialFocus="#acc-mfa-code-validation">
                            <ModalOverlay />
                            <ModalContent>
                                <ModalCloseButton />
                                <ModalHeader>Setup 2FA</ModalHeader>
                                <ModalBody>
                                    <canvas id="mfa-qr-canvas" />
                                    <p>Scan this QR code with your authenticator app or use the secret below</p>
                                    <span>{mfaData().secret_base32}</span>

                                    <FormControl  mb="$4">
                                        <FormLabel>2FA Code</FormLabel>
                                        <Input id="acc-mfa-code-validation" placeholder="Verify your 2FA code" onInput={e => setMfaCode(e.target.value)}/>
                                    </FormControl>
                                </ModalBody>
                                <ModalFooter>
                                    <Button onClick={verifyMfa}>Verify</Button>
                                    <Button id="acc-mfa-setup-cancel" onClick={closeMfaEditor} ms="auto" colorScheme={"primary"}>Cancel</Button>
                                </ModalFooter>
                            </ModalContent>
                        </Modal>
                    </Show>
                </div>
            </div>
        </div>
    );
};

export default Account;
