import "./view-users.scss";

import { ModalConfirmation } from "@components/ModalConfirmation";
import { ShowIfPermission } from "@components/ShowIfPermission";
import { Avatar, Button, FormControl, FormHelperText, FormLabel, HStack, Modal, ModalBody, ModalFooter, ModalHeader, Spinner, Tag, VStack } from "@hope-ui/solid";
import { Input, ModalCloseButton, ModalContent, ModalOverlay, notificationService } from "@hope-ui/solid";
import { useNavigate } from "@solidjs/router";
import { ApiResponseFlags, UserVariantDef } from "@typings";
import { format } from "date-fns";
import { BiRegularCheck, BiRegularX, BiSolidPencil, BiSolidPlusCircle } from "solid-icons/bi";
import { createSignal, For, onCleanup, Show } from "solid-js";

import Store from "../Store";
import { api, Validator } from "../utils";
import { apiv2 } from "../utils/apiv2";

function ViewUsers(props) {
    type _Role = {id: string, name: string, has: boolean};

    const store: () => Store = props.store;

    const validator = new Validator("username", "email", "password");

    const [users, setUsers] = createSignal<UserVariantDef[]>([]);
    const [usersEndReached, setUsersEndReached] = createSignal(false);
    const [usersLoading, setUsersLoading] = createSignal(false);
    const [showLoading, setShowLoading] = createSignal(false);
    const [search, setSearch] = createSignal("");
    let searchTimeout: NodeJS.Timeout | null = null;

    const [selectedUser, setSelectedUser] = createSignal<UserVariantDef | null>(null);
    const [selectedUserRoles, setSelectedUserRoles] = createSignal<_Role[] | null>(null);
    const [displayedUserRoles, setDisplayedUserRoles] = createSignal<_Role[] | null>(null);

    const [editingEmail, setEditingEmail] = createSignal(false);
    const [newEmail, setNewEmail, newEmailError] = validator.useValidator("email", "");

    const [editingUsername, setEditingUsername] = createSignal(false);
    const [newUsername, setNewUsername, newUsernameError] = validator.useValidator("username", "");

    const [editingPassword, setEditingPassword] = createSignal(false);
    const [newPassword, setNewPassword, newPasswordError] = validator.useValidator("password", "");

    const [isCreateUser, setIsCreateUser] = createSignal(false);

    const [loginAsUserCR, setLoginAsUserCR] = createSignal(false);
    const [deleteUserCR, setDeleteUserCR] = createSignal(false);
    const [verifyEmailCR, setVerifyEmailCR] = createSignal(false);
    const [suspendUserCR, setSuspendUserCR] = createSignal(false);

    const [hasPagePermission, setHasPagePermission] = createSignal<boolean | null>(null);


    const createUserApi = apiv2.createAPIMethod<
        { username: string, email: string, password: string },
        { user: UserVariantDef }
        >({ method: "POST", url: "/api/mg/users/create"});

    const navigate = useNavigate();
    let page = 0;
    const count = 25;

    function refreshUsers() {
        setUsersLoading(true); // avoid multiple requests

        // only show loading indicator if loading takes longer than 100ms (avoids blinking)
        const setLoadTimeout = setTimeout(() => {
            setShowLoading(true);
        }, 100);

        const resetLoadTimeout = setTimeout(() => {
            setUsersLoading(false);
            setShowLoading(false);
            notificationService.show({
                status: "warning",
                title: "Warning",
                description: "Could not load users."
            });
        }, 5 * 1000);

        api.post("/api/mg/users/get", { page: page, count: count }, async res => {
            clearTimeout(setLoadTimeout);
            clearTimeout(resetLoadTimeout);
            setUsersLoading(false);
            setShowLoading(false);

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

            if (res.data.users.length < count) {
                setUsersEndReached(true);
            }

            if (page === 0) {
                setUsers(res.data.users || []);
            } else {
                setUsers([...users(), ...res.data.users || []]);
            }

            if (!selectedUser() && res.data.users.length > 0) { // only select first user if there arent
                setSelectedUser(res.data.users[0]);
            }
        });
    }

    function doSearch() {
        if (search() === "") { // reset search
            setSearch("");
            refreshUsers();
            setUsersEndReached(false);
        } else {
            setUsersLoading(true); // avoid multiple requests

            // only show loading indicator if loading takes longer than 100ms (avoids blinking)
            const setLoadTimeout = setTimeout(() => {
                setShowLoading(true);
            }, 100);

            const resetLoadTimeout = setTimeout(() => {
                setUsersLoading(false);
                setShowLoading(false);
                notificationService.show({
                    status: "warning",
                    title: "Warning",
                    description: "Could not load users."
                });
            }, 5 * 1000);

            api.post("/api/mg/users/search", { page: page, count: count, search: search() }, async res => {
                clearTimeout(setLoadTimeout);
                clearTimeout(resetLoadTimeout);
                setUsersLoading(false);
                setShowLoading(false);

                if (res.hasError()) {
                    console.log(res.message);
                    return;
                }

                if (res.data.users.length < count) {
                    setUsersEndReached(true);
                }

                if (page === 0) {
                    setUsers(res.data.users || []);
                } else {
                    setUsers([...users(), ...res.data.users || []]); // append new users to the list
                }

                if (!selectedUser() && res.data.users.length > 0) { // only select first user if there arent
                    setSelectedUser(res.data.users[0]);
                }
            });
        }
    }

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

    // eslint-disable-next-line no-unused-vars
    function hasPermission(check: {name?: string, id?: string}) {
        return store().user().permissions.some(permission => (check.id !== undefined ? permission.id === check.id : true) && (check.name !== undefined ? permission.name === check.name : true));
    }

    function getSelectedUserRoles() {
        api.post("/api/mg/users/get-all-roles", { userId: selectedUser().id }, async res => {
            if (res.hasError()) {
                notificationService.show({
                    status: "danger",
                    title: "Error",
                    description: res.message
                });
            } else {
                setSelectedUserRoles(res.data.roles);
                setDisplayedUserRoles(res.data.roles.map(role => ({...role})));
            }
        });
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

    function updateUsername() {
        api.post("/api/mg/users/up-username", { userId: selectedUser().id, username: newUsername() }, async res => {
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

    function verifyEmail() {
        api.post("/api/mg/users/verify-email", { userId: selectedUser().id }, async res => {
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
                    description: "Email verified"
                });
                setSelectedUser({ ...selectedUser(), isEmailVerified: true });
                updateUserList();
                setVerifyEmailCR(false);
            }
        });
    }

    function toggleUserSuspension() {
        api.post("/api/mg/users/toggle-suspension", { userId: selectedUser().id }, async res => {
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
                    description: selectedUser().suspended ? "User unsuspended" : "User suspended"
                });
                setSelectedUser({ ...selectedUser(), suspended: !selectedUser().suspended });
                updateUserList();
                setSuspendUserCR(false);
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

    function loadMoreUsers() {
        if (usersEndReached() || usersLoading()) {
            return;
        }

        page++;
        if (search()) {
            doSearch();
        } else {
            refreshUsers();
        }
    }

    function createUser() {
        createUserApi.call({
            username: newUsername(),
            email: newEmail(),
            password: newPassword()
        }, async res => {
            if (res.hasError()) {
                notificationService.show({
                    status: "danger",
                    title: "Error",
                    description: res.message
                });
                return;
            }
            const user = res.data.user;
            setUsers([user, ...users()]);
            setSelectedUser(user);
            notificationService.show({
                status: "success",
                title: "Success",
                description: "User created"
            });

            setNewUsername(null);
            setNewEmail(null);
            setNewPassword(null);
            setIsCreateUser(false);
        });
    }

    function closeCreateUser() {
        setIsCreateUser(false);
        setNewUsername(null);
        setNewEmail(null);
        setNewPassword(null);
    }

    const minWidthForVerticalScroll = 1200;
    let lastScrollTop: number = 0;
    let lastScrollTopLeft: number = 0;

    function handleScroll() {
        const scrollContainer = document.getElementById("vu-data");
        if (scrollContainer) {
            const { scrollTop, scrollLeft, clientHeight, scrollWidth, scrollHeight, clientWidth } = scrollContainer;

            // Check the screen width using media query
            const isVerticalScroll = window.matchMedia(`(min-width: ${minWidthForVerticalScroll}px)`).matches;

            if (isVerticalScroll) { // vertical scrolling
                if (scrollTop < lastScrollTop) { // prevent scrolling up
                    return;
                }

                lastScrollTop = scrollTop;

                // Load more items when the user is near the bottom
                if (scrollTop + clientHeight >= scrollHeight - 50) {
                    loadMoreUsers();
                }
            } else { // horizontal scrolling
                if (scrollLeft < lastScrollTopLeft) { // prevent scrolling left
                    return;
                }

                lastScrollTopLeft = scrollLeft;

                // Load more items when the user is near the right edge
                if (clientWidth + scrollLeft >= scrollWidth - 50) {
                    loadMoreUsers();
                }
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

        if (showRoles() && selectedUserRoles() === null) {
            getSelectedUserRoles();
        }
    }

    function selectUser(user: UserVariantDef) {
        setShowRoles(false);
        setShowInfo(true);
        setSelectedUserRoles(null);
        setDisplayedUserRoles(null);
        setSelectedUser(user);
    }

    function toggleUserRole(role: _Role) { // 'addRoleToUser' is declared but its value is never read. :(((((((((((
        setDisplayedUserRoles(prevRoles => {
            if (prevRoles === null) {
                return null;
            }

            const updatedRoles = [...prevRoles];
            const roleIndex = updatedRoles.findIndex(r => r.id === role.id);
            updatedRoles[roleIndex].has = !updatedRoles[roleIndex].has;

            return updatedRoles;
        });
    }

    function getRoleStatus(roleId: string) {
        return displayedUserRoles().find(role => role.id === roleId).has;
    }

    function getChangedRoles() {
        const selectedRoles = selectedUserRoles();
        const displayedRoles = displayedUserRoles();

        // Check if both arrays are non-null
        if (selectedRoles === null || displayedRoles === null) {
            return [];
        }

        // Find roles with changes in the .has property
        const changedRoles = displayedRoles.filter((displayedRole, index) => {
            const selectedRole = selectedRoles[index];

            // Check if .has property has changed
            return selectedRole && displayedRole && selectedRole.has !== displayedRole.has;
        });
        return changedRoles;
    }

    function resetChangedRoles() {
        setDisplayedUserRoles(selectedUserRoles()?.map(role => ({...role})));
    }

    function saveChangedRoles() {
        const changedRoles = getChangedRoles();

        if (changedRoles.length === 0) {
            return;
        }

        api.post("/api/mg/users/up-roles", { userId: selectedUser().id, roles: changedRoles.map(r => ({id: r.id, has: r.has})) }, async res => {
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
                    description: "Roles updated"
                });
                setSelectedUserRoles(displayedUserRoles()?.map(role => ({...role})));
            }
        });
    }

    function avUrl(user: UserVariantDef) {
        return user.avatar; // todo url
    }

    return (
        <ShowIfPermission hasPermission={hasPagePermission}>

            <div class="ui-scroller-menu">
                <div class="ui-scroller" id="u-scroll">
                    <div class="data-pin">
                        <label for="mg-search-usr">Search</label>
                        <input id="mg-search-usr" placeholder="..." onInput={e => searchUsers(e.target.value)}/>
                        <button
                            class="bg-info mt-1"
                            onClick={() => setIsCreateUser(true)}
                            title={!hasPermission({name: "Admin.Create.User"}) ? "You don't have the permission to do that!" : ""}
                            disabled={!hasPermission({name: "Admin.Create.User"})}
                        >
                            Create user
                        </button>
                        <Modal opened={isCreateUser()} onClose={closeCreateUser} initialFocus="#mg-user-new-user-username">
                            <ModalOverlay />
                            <ModalContent>
                                <ModalCloseButton />
                                <ModalHeader>Create User</ModalHeader>
                                <ModalBody>
                                    <FormControl mb="$4">
                                        <FormLabel>Username</FormLabel>
                                        <Input
                                            id="mg-user-new-user-username"
                                            type="text"
                                            placeholder="Enter username"
                                            autocomplete="off"
                                            spellcheck={false}
                                            onInput={e => setNewUsername(e.target.value)}
                                            invalid={newUsernameError() !== null}
                                        />
                                        <Show when={newUsernameError() !== null}>
                                            <FormHelperText color="red">{newUsernameError()}</FormHelperText>
                                        </Show>
                                    </FormControl>
                                    <FormControl mb="$4">
                                        <FormLabel>Email Address</FormLabel>
                                        <Input
                                            id="mg-user-new-user-mail"
                                            type="mail"
                                            placeholder="Enter email address"
                                            autocomplete="off"
                                            spellcheck={false}
                                            onInput={e => setNewEmail(e.target.value)}
                                            invalid={newEmailError() !== null}
                                        />
                                        <Show when={newEmailError() !== null}>
                                            <FormHelperText color="red">{newEmailError()}</FormHelperText>
                                        </Show>
                                    </FormControl>
                                    <FormControl mb="$4">
                                        <FormLabel>Password</FormLabel>
                                        <Input
                                            id="mg-user-new-user-password"
                                            type="password"
                                            placeholder="Enter password"
                                            autocomplete="new-password"
                                            spellcheck={false}
                                            onInput={e => setNewPassword(e.target.value)}
                                            invalid={newPasswordError() !== null}
                                        />
                                        <Show when={newPasswordError() !== null}>
                                            <FormHelperText color="red">{newPasswordError()}</FormHelperText>
                                        </Show>
                                        {/* TODO: confirm password */}
                                    </FormControl>
                                </ModalBody>
                                <ModalFooter>
                                    <Button onClick={createUser} disabled={newUsernameError() !== null || newEmailError() !== null || newPasswordError() !== null}>Create</Button>
                                    <Button id="mg-user-new-user-cancel" onClick={closeCreateUser} ms="auto" colorScheme={"primary"}>Cancel</Button>
                                </ModalFooter>
                            </ModalContent>
                        </Modal>
                    </div>
                    <hr/>
                    <div id="vu-data" class="data-scroll">
                        <For each={users()}>
                            {user => (
                                <HStack
                                    class="ui-bg-gray5 dbg1"
                                    role="button"
                                    onClick={() => selectUser(user)}
                                    justifyContent="left"
                                    height="fit-content"
                                    padding="$2"
                                >
                                    <Avatar src={avUrl(user)} name={user.username} size="md" />
                                    <VStack marginLeft="$1" width="100%" alignItems="start">
                                        <span>{user.username}</span>
                                        <span>{user.email}</span>
                                        <HStack>
                                            <Show when={user.suspended}>
                                                <Tag cursor="default" colorScheme="danger" title="Suspended">Suspended</Tag>
                                            </Show>
                                            <Show when={!user.isEmailVerified}>
                                                <Tag cursor="default" colorScheme="danger" title="Email not verified">Not Verified</Tag>
                                            </Show>
                                            <Show when={user.mfaEnabled}>
                                                <Tag cursor="default" colorScheme="success" title="MFA enabled">MFA</Tag>
                                            </Show>
                                        </HStack>
                                    </VStack>
                                </HStack>
                            )}
                        </For>
                    </div>
                </div>
                <div class="ui-scroller-content center">
                    <Show when={showLoading()}>
                        <Spinner />
                    </Show>
                    <Show when={!showLoading() && selectedUser()}>
                        <div class="ui-modal w-40">
                            <HStack>
                                <Avatar src={avUrl(selectedUser())} name={selectedUser().username} size="md" />
                                <VStack marginLeft="$1" width="100%" alignItems="start">
                                    <Show when={selectedUser().suspended}>
                                        <Tag colorScheme="danger" cursor="default" title="Suspended">Suspended</Tag>
                                    </Show>
                                    <h1>{selectedUser().username}</h1>
                                    <h3>{selectedUser().email}</h3>
                                    <HStack>
                                        <Tag title="Created at" cursor="default"><div class="ui-icon me-1"><BiSolidPlusCircle size={14}/></div> {format(selectedUser().createdAt, "yyyy-MM-dd")}</Tag>
                                        <Tag title="Modified at" cursor="default"><div class="ui-icon me-1"><BiSolidPencil size={14}/></div> {format(selectedUser().updatedAt, "yyyy-MM-dd")}</Tag>
                                    </HStack>
                                </VStack>
                            </HStack>
                            <div class="actions">
                                <div class="action border">
                                    <button classList={{"active": showInfo()}} onClick={toggleInfo} disabled={showInfo()}>Info</button>
                                    <button classList={{"active": showRoles()}} onClick={toggleInfo} disabled={showRoles()}>Roles</button>
                                </div>
                                <Show when={showInfo()}>
                                    <label for="mg-user-mail">Email</label>
                                    <div class="action border">
                                        <input id="mg-user-mail" value={selectedUser().email} disabled/>
                                        <button
                                            type="button"
                                            class="bg-info ui-icon w-20"
                                            onClick={() => setEditingEmail(true)}
                                            title={!hasPermission({name: "Admin.Edit.User.Email"}) ? "You don't have the permission to do that!" : ""}
                                            disabled={!hasPermission({name: "Admin.Edit.User.Email"})}
                                        >
                                            <div><BiSolidPencil size={15} color="#ffffff"/></div>
                                        </button>
                                        <Modal opened={editingEmail()} onClose={closeEmailEditor} initialFocus="#mg-user-new-mail">
                                            <ModalOverlay />
                                            <ModalContent>
                                                <ModalCloseButton />
                                                <ModalHeader>Edit Email address</ModalHeader>
                                                <ModalBody>
                                                    <FormControl mb="$4">
                                                        <FormLabel>Email Address</FormLabel>
                                                        <Input
                                                            id="mg-user-new-mail"
                                                            type="mail"
                                                            placeholder="Enter new email address"
                                                            autocomplete="off"
                                                            spellcheck={false}
                                                            onInput={e => setNewEmail(e.target.value)}
                                                            invalid={newEmailError() !== null}
                                                        />
                                                        <Show when={newEmailError() !== null}>
                                                            <FormHelperText color="red">{newEmailError()}</FormHelperText>
                                                        </Show>
                                                    </FormControl>
                                                </ModalBody>
                                                <ModalFooter>
                                                    <Button onClick={updateEmail} disabled={newEmailError() !== null} >Update</Button>
                                                    <Button id="mg-user-new-mail-cancel" onClick={closeEmailEditor} ms="auto" colorScheme={"primary"}>Cancel</Button>
                                                </ModalFooter>
                                            </ModalContent>
                                        </Modal>
                                    </div>
                                    <label for="mg-user-username">Username</label>
                                    <div class="action border">
                                        <input id="mg-user-username" value={selectedUser().username} disabled/>
                                        <button
                                            type="button"
                                            class="bg-info ui-icon w-20"
                                            onClick={() => setEditingUsername(true)}
                                            title={!hasPermission({name: "Admin.Edit.User.Username"}) ? "You don't have the permission to do that!" : ""}
                                            disabled={!hasPermission({name: "Admin.Edit.User.Username"})}
                                        >
                                            <div><BiSolidPencil size={15} color="#ffffff"/></div>
                                        </button>
                                        <Modal opened={editingUsername()} onClose={closeUsernameEditor} initialFocus="#mg-user-new-username">
                                            <ModalOverlay />
                                            <ModalContent>
                                                <ModalCloseButton />
                                                <ModalHeader>Edit Username</ModalHeader>
                                                <ModalBody>
                                                    <FormControl mb="$4">
                                                        <FormLabel>Username</FormLabel>
                                                        <Input
                                                            id="mg-user-new-username"
                                                            type="text"
                                                            placeholder="Enter new username"
                                                            autocomplete="off"
                                                            spellcheck={false}
                                                            onInput={e => setNewUsername(e.target.value)}
                                                            invalid={newUsernameError() !== null}
                                                        />
                                                        <Show when={newUsernameError() !== null}>
                                                            <FormHelperText color="red">{newUsernameError()}</FormHelperText>
                                                        </Show>
                                                    </FormControl>
                                                </ModalBody>
                                                <ModalFooter>
                                                    <Button onClick={updateUsername}>Update</Button>
                                                    <Button id="mg-user-new-username-cancel" onClick={closeUsernameEditor} ms="auto" colorScheme={"primary"}>Cancel</Button>
                                                </ModalFooter>
                                            </ModalContent>
                                        </Modal>
                                    </div>
                                    <label for="mg-user-password">Password</label>
                                    <div class="action border">
                                        <input id="mg-user-password" value="********" disabled/>
                                        <button
                                            type="button"
                                            class="bg-info ui-icon w-20"
                                            onClick={() => setEditingPassword(true)}
                                            title={!hasPermission({name: "Admin.Edit.User.Password"}) ? "You don't have the permission to do that!" : ""}
                                            disabled={!hasPermission({name: "Admin.Edit.User.Password"})}
                                        >
                                            <div><BiSolidPencil size={15} color="#ffffff"/></div>
                                        </button>
                                        <Modal opened={editingPassword()} onClose={closePasswordEditor} initialFocus="#mg-user-new-password">
                                            <ModalOverlay />
                                            <ModalContent>
                                                <ModalCloseButton />
                                                <ModalHeader>New Password</ModalHeader>
                                                <ModalBody>
                                                    <FormControl mb="$4">
                                                        <FormLabel>New Password</FormLabel>
                                                        <Input
                                                            id="mg-user-new-password"
                                                            type="password"
                                                            placeholder="Enter new password"
                                                            autocomplete="new-password"
                                                            spellcheck={false}
                                                            onInput={e => setNewPassword(e.target.value)}
                                                            invalid={newPasswordError() !== null}
                                                        />
                                                        <Show when={newPasswordError() !== null}>
                                                            <FormHelperText color="red">{newPasswordError()}</FormHelperText>
                                                        </Show>
                                                    </FormControl>
                                                </ModalBody>
                                                <ModalFooter>
                                                    <Button onClick={updatePassword} disabled={newPasswordError() !== null}>Update</Button>
                                                    <Button id="mg-user-new-password-cancel" onClick={closePasswordEditor} ms="auto" colorScheme={"primary"}>Cancel</Button>
                                                </ModalFooter>
                                            </ModalContent>
                                        </Modal>
                                    </div>
                                    <div class="action bg-info">
                                        <button
                                            type="button"
                                            title={!(hasPermission({name: "Admin.Edit.User.VerifyEmail"}) && !selectedUser().isEmailVerified) ? "You don't have the permission to do that!" : ""}
                                            disabled={!(hasPermission({name: "Admin.Edit.User.VerifyEmail"}) && !selectedUser().isEmailVerified)}
                                            onClick={() => setVerifyEmailCR(true)}
                                        >
                                            Verify email
                                        </button>
                                        <ModalConfirmation isOpen={verifyEmailCR} onCancel={() => setVerifyEmailCR(false)} onConfirm={verifyEmail} title="Confirmation required">
                                            <p>Verify email for {selectedUser().username}?</p>
                                        </ModalConfirmation>
                                    </div>
                                    <div class="action bg-info">
                                        <button
                                            type="button"
                                            title={!hasPermission({name: "Admin.LoginAs"}) ? "You don't have the permission to do that!" : ""}
                                            disabled={!hasPermission({name: "Admin.LoginAs"})}
                                            onClick={() => setLoginAsUserCR(true)}
                                        >
                                            Login as user
                                        </button>
                                        <ModalConfirmation isOpen={loginAsUserCR} onCancel={() => setLoginAsUserCR(false)} onConfirm={loginAsUser} title="Confirmation required">
                                            <p>Login as {selectedUser().username}?</p>
                                        </ModalConfirmation>
                                    </div>
                                    <div class="action bg-danger">
                                        <button
                                            type="button"
                                            title={!hasPermission({name: "Admin.Edit.User.Suspend"}) ? "You don't have the permission to do that!" : ""}
                                            disabled={!hasPermission({name: "Admin.Edit.User.Suspend"})}
                                            onClick={() => setSuspendUserCR(true)}
                                        >
                                            <Show when={!selectedUser().suspended}
                                                fallback="Unsuspend"
                                            >
                                                Suspend
                                            </Show>
                                        </button>
                                        <ModalConfirmation isOpen={suspendUserCR} onCancel={() => setSuspendUserCR(false)} onConfirm={toggleUserSuspension} title="Confirmation required">
                                            <p>Are you sure you want to {selectedUser().suspended ? "unsuspend" : "suspend"} {selectedUser().username}</p>
                                        </ModalConfirmation>
                                    </div>
                                    <div class="action bg-danger">
                                        <button
                                            type="button"
                                            title={!hasPermission({name: "Admin.Edit.User.Delete"}) ? "You don't have the permission to do that!" : ""}
                                            disabled={!hasPermission({name: "Admin.Edit.User.Delete"})}
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
                                    <div class="ui-scroller-h w-100 mt-2" style={{"max-height": "250px"}}>
                                        <div class="scroll-data">
                                            <For each={displayedUserRoles()}>
                                                {role => (
                                                    <div class="action border border-center">
                                                        <input value={role.name} disabled style={{border: "none"}}/>
                                                        <button
                                                            class="ui-icon w-20"
                                                            classList={{
                                                                "bg-success": getRoleStatus(role.id) === true
                                                            }}
                                                            disabled={!(hasPermission({name: "Admin.Edit.User.Roles"}) && getRoleStatus(role.id) !== true)}
                                                            onClick={() => toggleUserRole(role)}
                                                        >
                                                            <div><BiRegularCheck size={15} color="#ffffff"/></div>
                                                        </button>
                                                        <button
                                                            class="ui-icon w-20"
                                                            classList={{
                                                                "bg-danger": getRoleStatus(role.id) === false
                                                            }}
                                                            disabled={!(hasPermission({name: "Admin.Edit.User.Roles"}) && getRoleStatus(role.id) !== false)}
                                                            onClick={() => toggleUserRole(role)}
                                                        >
                                                            <div><BiRegularX size={15} color="#ffffff"/></div>
                                                        </button>
                                                    </div>
                                                )}
                                            </For>
                                        </div>
                                    </div>
                                    <div class="action border-center">
                                        <button
                                            type="button"
                                            class="bg-info"
                                            title={!hasPermission({name: "Admin.Edit.User.Roles"}) ? "You don't have the permission to do that!" : ""}
                                            disabled={!(hasPermission({name: "Admin.Edit.User.Roles"}) && (getChangedRoles()?.length || 0) > 0)}
                                            onClick={() => resetChangedRoles()}
                                        >
                                            Reset
                                        </button>
                                        <button
                                            type="button"
                                            class="bg-info"
                                            title={!hasPermission({name: "Admin.Edit.User.Roles"}) ? "You don't have the permission to do that!" : ""}
                                            disabled={!(hasPermission({name: "Admin.Edit.User.Roles"}) && (getChangedRoles()?.length || 0) > 0)}
                                            onClick={() => saveChangedRoles()}
                                        >
                                            Save
                                        </button>
                                    </div>
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
