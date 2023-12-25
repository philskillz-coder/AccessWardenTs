import "./view-users.scss";

import { ModalConfirmation } from "@components/ModalConfirmation";
import { ShowIfPermission } from "@components/ShowIfPermission";
import { Button, FormControl, FormLabel, Modal, ModalBody, ModalFooter, ModalHeader } from "@hope-ui/solid";
import { Input, ModalCloseButton, ModalContent, ModalOverlay, notificationService } from "@hope-ui/solid";
import { useNavigate } from "@solidjs/router";
import { ApiResponseFlags, CleanUser } from "@typings";
import { BiSolidPencil } from "solid-icons/bi";
import { createSignal, For, onCleanup, Show } from "solid-js";

import Store from "../Store";
import { api } from "../utils";

function ViewUsers(props) {
    // eslint-disable-next-line no-unused-vars
    const store: () => Store = props.store;
    const [users, setUsers] = createSignal([]);
    // eslint-disable-next-line no-unused-vars
    const [search, setSearch] = createSignal("");
    let searchTimeout: NodeJS.Timeout | null = null;

    const [selectedUser, setSelectedUser] = createSignal<CleanUser | null>(null);

    // eslint-disable-next-line no-unused-vars
    const [editingEmail, setEditingEmail] = createSignal(false);
    const [newEmail, setNewEmail] = createSignal<string | null>(null);
    // eslint-disable-next-line no-unused-vars
    const [editingUsername, setEditingUsername] = createSignal(false);
    const [newUsername, setNewUsername] = createSignal<string | null>(null);
    // eslint-disable-next-line no-unused-vars
    const [editingPassword, setEditingPassword] = createSignal(false);
    const [newPassword, setNewPassword] = createSignal<string | null>(null);

    const [deleteUserCR, setDeleteUserCR] = createSignal(false);

    const [hasPagePermission, setHasPagePermission] = createSignal<boolean | null>(null);

    const navigate = useNavigate();
    let page = 0;
    const count = 25;

    function refreshUsers() {
        api.post("/api/mg/users/get", { page: page, count: count }, async res => {
            if (res.hasFlag(ApiResponseFlags.forbidden)) {
                setHasPagePermission(false);
            } else {
                setHasPagePermission(true);
                mountScroll();
            }

            if (res.hasError()) {
                console.log(res.message);
                return;
            }

            if (page === 0) {
                setUsers(res.data.users || []);
            } else {
                setUsers([...users(), ...res.data.users || []]);
            }

            if (res.data.users.length > 0) {
                setSelectedUser(res.data.users[0]);
            }
        });
    }

    function hasPermission(permission: string) {
        return store().user().permissions.includes(permission);
    }

    function doSearch() {
        api.post("/api/mg/users/search", { page: page, count: count, search: search() }, async res => {
            if (page === 0) {
                setUsers(res.data.users || []);
            } else {
                setUsers([...users(), ...res.data.users || []]);
            }
        });
    }

    // eslint-disable-next-line no-unused-vars
    function searchUsers(text: string) {
        setSearch(text);
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        searchTimeout = setTimeout(() => {
            page = 0;
            doSearch();
        }, 300);
    }

    function closeEmailEditor() {
        setEditingEmail(false);
        setNewEmail(null);
    }

    function closeUsernameEditor() {
        setEditingUsername(false);
        setNewUsername(null);
    }

    function closePasswordEditor() {
        setEditingPassword(false);
        setNewPassword(null);
    }

    function updateUserList() {
        const userIndex = users().findIndex(user => user.id === selectedUser().id);

        if (userIndex === -1) {
            return;
        }

        const updatedUsers = [...users()];
        updatedUsers[userIndex] = selectedUser();

        setUsers(updatedUsers);
    }

    function updateEmail() {
        api.post("/api/mg/users/up-email", { userId: selectedUser().id, email: newEmail() }, async res => {
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
                setSelectedUser({ ...selectedUser(), email: newEmail() });
                setNewEmail(null);
                updateUserList();
                closeEmailEditor();
            }
        });
    }

    // TODO: change login session on any user update
    // TODO: reset user cache on login
    function updateUsername() {
        api.post("/api/mg/users/up-username", { userId: selectedUser().id, username: newUsername() }, async res => {
            // TODO: check if username is available (tag in resp) if not set error inline or notif
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
                setSelectedUser({ ...selectedUser(), username: newUsername() });
                setNewUsername(null);
                updateUserList();
                closeUsernameEditor();
            }
        });
    }

    function updatePassword() {
        api.post("/api/mg/users/up-password", { userId: selectedUser().id, newPassword: newPassword() }, async res => {
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
                // nothing updated in user object
                setNewPassword(null);
                closePasswordEditor();
            }
        });
    }

    function deleteUser() {
        api.post("/api/mg/users/delete", { userId: selectedUser().id }, async res => {
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
                    description: "User deleted"
                });
                let prevUserIndex = users().findIndex(user => user.id === selectedUser().id) - 1;
                if (prevUserIndex < 0) {
                    prevUserIndex = 0;
                }
                setUsers(users().filter(user => user.id !== selectedUser().id));
                if (users().length > 0) {
                    setSelectedUser(users()[prevUserIndex]);
                } else {
                    setSelectedUser(null);
                }
                setDeleteUserCR(false);
            }
        });
    }

    function loginAsUser() {
        api.post("/api/mg/users/login-as", { userId: selectedUser().id }, async res => {
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
                    description: "Logged in as " + selectedUser().username
                });
                store().setUser(res.data.user);
                navigate("/account");
            }
        }
        );
    }

    // TODO: Account.tsx and here: cancel button in modals
    // FIXME: fix multiple requests when scrolling

    function loadMoreUsers() {
        page++;
        if (search()) {
            doSearch();
        } else {
            refreshUsers();
        }
    }

    function handleScroll() {
        const scrollContainer = document.getElementById("vu-data");
        if (scrollContainer) {
            const { scrollTop, clientHeight, scrollHeight } = scrollContainer;

            if (scrollTop + clientHeight >= scrollHeight - 50) {
                // Load more items when the user is near the bottom
                loadMoreUsers();
            }
        }
    }

    function mountScroll() {
        const scrollContainer = document.getElementById("vu-data");
        if (scrollContainer) {
            scrollContainer.addEventListener("scroll", handleScroll);
        }
    }

    onCleanup(() => {
        const scrollContainer = document.getElementById("vu-data");
        if (scrollContainer) {
            scrollContainer.removeEventListener("scroll", handleScroll);
        }
    });

    refreshUsers();

    const [showInfo, setShowInfo] = createSignal(true);
    const [showRoles, setShowRoles] = createSignal(false);

    function toggleInfo() {
        setShowInfo(!showInfo());
        setShowRoles(!showRoles());
    }

    return (
        <ShowIfPermission hasPermission={hasPagePermission}>

            <div class="ui-scroll-menu">
                <div id="vu-data" class="scroll-data">
                    <div class="pinned">
                        <label for="mg-search-usr">Search</label>
                        <input id="mg-search-usr" placeholder="..." onInput={e => searchUsers(e.target.value)}/>
                    </div>
                    <For each={users()}>
                        {user => (
                            <div class="ui-bg-gray5">
                                <button onClick={() => setSelectedUser(user)}>
                                    {user.username}
                                </button>
                            </div>
                        )}
                    </For>
                </div>
                <div class="scroll-content center">
                    <Show when={selectedUser()}>
                        <div class="ui-modal w-40">
                            <h1>{selectedUser().username}</h1>
                            <div class="actions">
                                <div class="action border">
                                    <button classList={{"active": showInfo()}} onClick={toggleInfo}>Info</button>
                                    <button classList={{"active": showRoles()}} onClick={toggleInfo}>Roles</button>
                                </div>
                                <Show when={showInfo()}>
                                    <label for="mg-acc-mail">Email</label>
                                    <div class="action border">
                                        <input id="mg-acc-mail" placeholder={selectedUser().email} disabled/>
                                        <button
                                            type="button"
                                            class="bg-info ui-icon w-20"
                                            onClick={() => setEditingEmail(true)}
                                            title={hasPermission("Admin.Edit.User.Email") ? "You don't have the permission to do that!" : ""}
                                            disabled={!hasPermission("Admin.Edit.User.Email")}
                                        >
                                            <div><BiSolidPencil size={15} color="#ffffff"/></div>
                                        </button>
                                        <Modal opened={editingEmail()} onClose={closeEmailEditor} initialFocus="#mg-new-mail">
                                            <ModalOverlay />
                                            <ModalContent>
                                                <ModalCloseButton />
                                                <ModalHeader>Edit Email address</ModalHeader>
                                                <ModalBody>
                                                    <FormControl mb="$4">
                                                        <FormLabel>Email Address</FormLabel>
                                                        <Input id="mg-new-mail" type="mail" placeholder="Enter new email address" autocomplete="off" spellcheck={false} onChange={e => setNewEmail(e.target.value)}/>
                                                    </FormControl>
                                                </ModalBody>
                                                <ModalFooter>
                                                    <Button onClick={updateEmail}>Update</Button>
                                                </ModalFooter>
                                            </ModalContent>
                                        </Modal>
                                    </div>
                                    <label for="mg-acc-username">Username</label>
                                    <div class="action border">
                                        <input id="mg-acc-username" placeholder={selectedUser().username} disabled/>
                                        <button
                                            type="button"
                                            class="bg-info ui-icon w-20"
                                            onClick={() => setEditingUsername(true)}
                                            title={hasPermission("Admin.Edit.User.Username") ? "You don't have the permission to do that!" : ""}
                                            disabled={!hasPermission("Admin.Edit.User.Username")}
                                        >
                                            <div><BiSolidPencil size={15} color="#ffffff"/></div>
                                        </button>
                                        <Modal opened={editingUsername()} onClose={closeUsernameEditor} initialFocus="#mg-new-username">
                                            <ModalOverlay />
                                            <ModalContent>
                                                <ModalCloseButton />
                                                <ModalHeader>Edit Username</ModalHeader>
                                                <ModalBody>
                                                    <FormControl mb="$4">
                                                        <FormLabel>Username</FormLabel>
                                                        <Input id="mg-new-username" type="text" placeholder="Enter new username" autocomplete="off" spellcheck={false} onChange={e => setNewUsername(e.target.value)}/>
                                                    </FormControl>
                                                </ModalBody>
                                                <ModalFooter>
                                                    <Button onClick={updateUsername}>Update</Button>
                                                </ModalFooter>
                                            </ModalContent>
                                        </Modal>
                                    </div>
                                    <label for="mg-acc-password">Password</label>
                                    <div class="action border">
                                        <input id="mg-acc-password" placeholder="********" disabled/>
                                        <button
                                            type="button"
                                            class="bg-info ui-icon w-20"
                                            onClick={() => setEditingPassword(true)}
                                            title={hasPermission("Admin.Edit.User.Password") ? "You don't have the permission to do that!" : ""}
                                            disabled={!hasPermission("Admin.Edit.User.Password")}
                                        >
                                            <div><BiSolidPencil size={15} color="#ffffff"/></div>
                                        </button>
                                        <Modal opened={editingPassword()} onClose={closePasswordEditor} initialFocus="#mg-new-password">
                                            <ModalOverlay />
                                            <ModalContent>
                                                <ModalCloseButton />
                                                <ModalHeader>New Password</ModalHeader>
                                                <ModalBody>
                                                    <FormControl mb="$4">
                                                        <FormLabel>New Password</FormLabel>
                                                        <Input id="mg-new-password" type="password" placeholder="Enter new password" autocomplete="new-password" spellcheck={false} onChange={e => setNewPassword(e.target.value)}/>
                                                    </FormControl>
                                                </ModalBody>
                                                <ModalFooter>
                                                    <Button onClick={updatePassword}>Update</Button>
                                                </ModalFooter>
                                            </ModalContent>
                                        </Modal>
                                    </div>
                                    <div class="action bg-info">
                                        <button
                                            type="button"
                                            title={hasPermission("Admin.LoginAsUser") ? "You don't have the permission to do that!" : ""}
                                            disabled={!hasPermission("Admin.LoginAs")}
                                            onClick={() => loginAsUser()}
                                        >
                                            Login as user
                                        </button>
                                    </div>
                                    <div class="action bg-danger">
                                        <button
                                            type="button"
                                            title={hasPermission("Admin.Edit.User.Delete") ? "You don't have the permission to do that!" : ""}
                                            disabled={!hasPermission("Admin.Edit.User.Delete")}
                                            onClick={() => setDeleteUserCR(true)}
                                        >
                                            Delete
                                        </button>
                                        <ModalConfirmation isOpen={deleteUserCR} onCancel={() => setDeleteUserCR(false)} onConfirm={deleteUser} title="Confirmation required">
                                            <p>Are you sure you want to delete this account?</p>
                                        </ModalConfirmation>
                                    </div>
                                </Show>
                                <Show when={showRoles()}>
                                    {/* TODO: scrollable container */}
                                    <></>
                                </Show>
                            </div>
                        </div>
                    </Show>
                    <Show when={!selectedUser()}>
                        <div class="ui-modal w-40">
                            <h1>No user selected</h1>
                        </div>
                    </Show>
                </div>
            </div>
        </ShowIfPermission>
    );
}

export default ViewUsers;
