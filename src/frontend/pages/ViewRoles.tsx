import "./view-users.scss";

import { ModalConfirmation } from "@components/ModalConfirmation";
import { ShowIfPermission } from "@components/ShowIfPermission";
import { Button, FormControl, FormLabel, Modal, ModalBody, ModalFooter, ModalHeader } from "@hope-ui/solid";
import { Input, ModalCloseButton, ModalContent, ModalOverlay, notificationService } from "@hope-ui/solid";
import { ApiResponseFlags, CleanRole } from "@typings";
import { BiRegularCheck, BiRegularQuestionMark, BiRegularX, BiSolidPencil } from "solid-icons/bi";
import { createSignal, For, onCleanup, Show } from "solid-js";

import Store from "../Store";
import { api } from "../utils";

function ViewRoles(props) {
    type _Permission = {id: string, name: string, has: boolean | null};

    const store: () => Store = props.store;
    const [roles, setRoles] = createSignal([]);
    const [rolesEndReached, setRolesEndReached] = createSignal(false);
    const [rolesLoading, setRolesLoading] = createSignal(false); // TODO: use this to show loading indicator
    const [search, setSearch] = createSignal("");
    let searchTimeout: NodeJS.Timeout | null = null;

    const [selectedRole, setSelectedRole] = createSignal<CleanRole | null>(null);
    const [selectedRolePermissions, setSelectedRolePermissions] = createSignal<_Permission[] | null>(null);
    const [displayedRolePermissions, setDisplayedRolePermissions] = createSignal<_Permission[] | null>(null);

    const [editingName, setEditingName] = createSignal(false);
    const [newName, setNewName] = createSignal<string | null>(null);

    const [deleteRoleCR, setDeleteRoleCR] = createSignal(false);

    const [hasPagePermission, setHasPagePermission] = createSignal<boolean | null>(null);


    let page = 0;
    const count = 25;

    function refreshRoles() {
        api.post("/api/mg/roles/get", { page: page, count: count }, async res => {
            if (res.hasFlag(ApiResponseFlags.forbidden)) {
                setHasPagePermission(false);
            } else {
                setHasPagePermission(true);
                mountScroll(); // TODO: ViewPermissions, ViewUsers, ViewRoles: do this not in here
            }

            if (res.hasError()) {
                console.log(res.message);
                return;
            }

            if (res.data.roles.length < count) {
                setRolesEndReached(true);
            }

            if (page === 0) {
                setRoles(res.data.roles || []);
            } else {
                setRoles([...roles(), ...res.data.roles || []]);
            }

            if (res.data.roles.length > 0) {
                setSelectedRole(res.data.roles[0]);
            }
        });
    }

    function doSearch() {
        if (search() === "") { // reset search
            setSearch("");
            refreshRoles();
            setRolesEndReached(false);
        } else {
            api.post("/api/mg/roles/search", { page: page, count: count, search: search() }, async res => {
                if (res.hasError()) {
                    console.log(res.message);
                    return;
                }

                if (res.data.roles.length < count) {
                    setRolesEndReached(true);
                }

                if (page === 0) {
                    setRoles(res.data.roles || []);
                } else {
                    setRoles([...roles(), ...res.data.roles || []]); // append new users to the list
                }
            });
        }
    }

    function searchRoles(text: string) {
        setSearch(text);
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        searchTimeout = setTimeout(() => {
            page = 0;
            doSearch();
        }, 300);
    }

    function hasPermission(permission: string) {
        return store().user().permissions.includes(permission);
    }

    function getSelectedRolePermissions() {
        api.post("/api/mg/roles/get-all-permissions", { roleId: selectedRole().id }, async res => {
            if (res.hasError()) {
                notificationService.show({
                    status: "danger",
                    title: "Error",
                    description: res.message
                });
            } else {
                setSelectedRolePermissions(res.data.permissions);
                setDisplayedRolePermissions(res.data.permissions.map(role => ({...role})));
            }
        });
    }

    function closeNameEditor() {
        setEditingName(false);
        setNewName(null);
    }

    function updateRoleList() {
        const roleIndex = roles().findIndex(role => role.id === selectedRole().id);

        if (roleIndex === -1) {
            return;
        }

        const updatedRoles = [...roles()];
        updatedRoles[roleIndex] = selectedRole();

        setRoles(updatedRoles);
    }

    function updateRole() {
        api.post("/api/mg/roles/up-name", { roleId: selectedRole().id, name: newName() }, async res => {
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
                    description: "Name updated"
                });
                setSelectedRole({ ...selectedRole(), name: newName() });
                setNewName(null);
                updateRoleList();
                closeNameEditor();
            }
        });
    }

    function deleteRole() {
        api.post("/api/mg/roles/delete", { roleId: selectedRole().id }, async res => {
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
                    description: "Role deleted"
                });
                let prevRoleIndex = roles().findIndex(role => role.id === selectedRole().id) - 1;
                if (prevRoleIndex < 0) {
                    prevRoleIndex = 0;
                }
                setRoles(roles().filter(role => role.id !== selectedRole().id));
                if (roles().length > 0) {
                    setSelectedRole(roles()[prevRoleIndex]);
                } else {
                    setSelectedRole(null);
                }
                setDeleteRoleCR(false);
            }
        });
    }

    // TODO: Account.tsx and here: cancel button in modals
    function loadMoreRoles() {
        if (rolesEndReached() || rolesLoading()) {
            return;
        }

        setRolesLoading(true);
        setTimeout(() => {
            setRolesLoading(false);
        }, 150);

        page++;
        if (search()) {
            doSearch();
        } else {
            refreshRoles();
        }
    }

    const minWidthForVerticalScroll = 1200;

    function handleScroll() {
        const scrollContainer = document.getElementById("vu-data");
        if (scrollContainer) {
            const { scrollTop, clientHeight, scrollWidth, scrollHeight, clientWidth } = scrollContainer;

            // Check the screen width using media query
            const isVerticalScroll = window.matchMedia(`(min-width: ${minWidthForVerticalScroll}px)`).matches;

            if (isVerticalScroll) {
            // Check vertical scrolling
                if (scrollTop + clientHeight >= scrollHeight - 50) {
                // Load more items when the user is near the bottom
                    loadMoreRoles();
                }
            } else {
            // Check horizontal scrolling
                if (clientWidth + scrollContainer.scrollLeft >= scrollWidth - 50) {
                // Load more items when the user is near the right edge
                    loadMoreRoles();
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

    refreshRoles();

    const [showInfo, setShowInfo] = createSignal(true);
    const [showPermissions, setShowPermissions] = createSignal(false);

    function toggleInfo() {
        setShowInfo(!showInfo());
        setShowPermissions(!showPermissions());

        if (showPermissions() && selectedRolePermissions() === null) {
            getSelectedRolePermissions();
        }
    }

    function selectRole(role: CleanRole) {
        setShowPermissions(false);
        setShowInfo(true);
        setSelectedRolePermissions(null);
        setDisplayedRolePermissions(null);
        setSelectedRole(role);
    }

    function toggleRolePermission(perm: _Permission, to: boolean | null) { // 'addRoleToUser' is declared but its value is never read. :(((((((((((
        setDisplayedRolePermissions(prevPerms => {
            if (prevPerms === null) {
                return null;
            }

            const updatedPerms = [...prevPerms];
            const permIndex = updatedPerms.findIndex(p => p.id === perm.id);
            updatedPerms[permIndex].has = to;

            return updatedPerms;
        });
    }

    function getPermissionStatus(permissionId: string) {
        return displayedRolePermissions().find(perm => perm.id === permissionId).has;
    }

    function getChangedPermissions() {
        const selectedPermissions = selectedRolePermissions();
        const displayedPermissions = displayedRolePermissions();

        // Check if both arrays are non-null
        if (selectedPermissions === null || displayedPermissions === null) {
            return [];
        }

        // Find roles with changes in the .has property
        const changedPermissions = displayedPermissions.filter((displayedPerm, index) => {
            const selectedPerm = selectedPermissions[index];

            // Check if .has property has changed
            return selectedPerm && displayedPerm && selectedPerm.has !== displayedPerm.has;
        });
        return changedPermissions;
    }

    function resetChangedPermissions() {
        setDisplayedRolePermissions(selectedRolePermissions()?.map(role => ({...role})));
    }

    function saveChangedPermissions() {
        const changedPermissions = getChangedPermissions();

        if (changedPermissions.length === 0) {
            return;
        }

        api.post("/api/mg/roles/up-permissions", { roleId: selectedRole().id, permissions: changedPermissions.map(p => ({id: p.id, has: p.has})) }, async res => {
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
                setSelectedRolePermissions(displayedRolePermissions()?.map(perm => ({...perm})));
            }
        });
    }

    return (
        <ShowIfPermission hasPermission={hasPagePermission}>
            <div class="ui-scroller-menu">
                <div id="vu-data" class="ui-scroller">
                    <div class="data-pin">
                        <label for="mg-search-usr">Search</label>
                        <input id="mg-search-usr" placeholder="..." onInput={e => searchRoles(e.target.value)}/>
                    </div>
                    <hr/>
                    <div class="data-scroll">
                        <For each={roles()}>
                            {role => (
                                <div class="ui-bg-gray5">
                                    <button onClick={() => selectRole(role)}>
                                        {role.name}
                                    </button>
                                </div>
                            )}
                        </For>
                    </div>
                </div>
                <div class="ui-scroller-content center">
                    <Show when={selectedRole()}>
                        <div class="ui-modal w-40">
                            <h1>{selectedRole().name}</h1>
                            <div class="actions">
                                <div class="action border">
                                    <button classList={{"active": showInfo()}} onClick={toggleInfo} disabled={showInfo()}>Info</button>
                                    <button classList={{"active": showPermissions()}} onClick={toggleInfo} disabled={showPermissions()}>Roles</button>
                                </div>
                                <Show when={showInfo()}>
                                    <label for="mg-roles-name">Username</label>
                                    <div class="action border">
                                        <input id="mg-roles-name" placeholder={selectedRole().name} disabled/>
                                        <button
                                            type="button"
                                            class="bg-info ui-icon w-20"
                                            onClick={() => setEditingName(true)}
                                            title={!hasPermission("Admin.Edit.Role.Name") ? "You don't have the permission to do that!" : ""}
                                            disabled={!hasPermission("Admin.Edit.Role.Name")}
                                        >
                                            <div><BiSolidPencil size={15} color="#ffffff"/></div>
                                        </button>
                                        <Modal opened={editingName()} onClose={closeNameEditor} initialFocus="#mg-roles-new-name">
                                            <ModalOverlay />
                                            <ModalContent>
                                                <ModalCloseButton />
                                                <ModalHeader>Edit Name</ModalHeader>
                                                <ModalBody>
                                                    <FormControl mb="$4">
                                                        <FormLabel>Name</FormLabel>
                                                        <Input id="mg-roles-new-name" type="text" placeholder="Enter new name" autocomplete="off" spellcheck={false} onChange={e => setNewName(e.target.value)}/>
                                                    </FormControl>
                                                </ModalBody>
                                                <ModalFooter>
                                                    <Button onClick={updateRole}>Update</Button>
                                                </ModalFooter>
                                            </ModalContent>
                                        </Modal>
                                    </div>
                                    <div class="action bg-danger">
                                        <button
                                            type="button"
                                            title={!hasPermission("Admin.Edit.Role.Delete") ? "You don't have the permission to do that!" : ""}
                                            disabled={!hasPermission("Admin.Edit.Role.Delete")}
                                            onClick={() => setDeleteRoleCR(true)}
                                        >
                                            Delete
                                        </button>
                                        <ModalConfirmation isOpen={deleteRoleCR} onCancel={() => setDeleteRoleCR(false)} onConfirm={deleteRole} title="Confirmation required">
                                            <p>Are you sure you want to delete this role?</p>
                                        </ModalConfirmation>
                                    </div>
                                </Show>

                                <Show when={showPermissions()}>
                                    <div class="ui-scroller w-100 mt-2" style={{"max-height": "250px"}}>
                                        <For each={displayedRolePermissions()}>
                                            {perm => (
                                                <div class="ui-bg-gray4 action">
                                                    <button
                                                        type="button"
                                                        disabled={!hasPermission("Admin.Edit.Roles.Permissions")}
                                                    >
                                                        {perm.name}
                                                    </button>
                                                    <button
                                                        class="ui-icon w-20"
                                                        classList={{
                                                            "bg-success": getPermissionStatus(perm.id)
                                                        }}
                                                        disabled={!(hasPermission("Admin.Edit.Roles.Permissions") && getPermissionStatus(perm.id) !== true)}
                                                        onClick={() => toggleRolePermission(perm, true)}
                                                    >
                                                        <div><BiRegularCheck size={15} color="#ffffff"/></div>
                                                    </button>
                                                    <button
                                                        class="ui-icon w-20"
                                                        classList={{
                                                            "bg-success": getPermissionStatus(perm.id)
                                                        }}
                                                        disabled={!(hasPermission("Admin.Edit.Roles.Permissions") && getPermissionStatus(perm.id) !== null)}
                                                        onClick={() => toggleRolePermission(perm, null)}
                                                    >
                                                        <div><BiRegularQuestionMark size={15} color="#ffffff"/></div>
                                                    </button>
                                                    <button
                                                        class="ui-icon w-20"
                                                        classList={{
                                                            "bg-danger": !getPermissionStatus(perm.id)
                                                        }}
                                                        disabled={!(hasPermission("Admin.Edit.Roles.Permissions") && getPermissionStatus(perm.id) !== false)}
                                                        onClick={() => toggleRolePermission(perm, false)}
                                                    >
                                                        <div><BiRegularX size={15} color="#ffffff"/></div>
                                                    </button>
                                                </div>
                                            )}
                                        </For>
                                    </div>
                                    <div class="action">
                                        <button
                                            type="button"
                                            class="bg-info"
                                            title={!hasPermission("Admin.Edit.Roles.Permissions") ? "You don't have the permission to do that!" : ""}
                                            disabled={!(hasPermission("Admin.Edit.Roles.Permissions") && (getChangedPermissions()?.length || 0) > 0)}
                                            onClick={() => resetChangedPermissions()}
                                        >
                                            Reset
                                        </button>
                                        <button
                                            type="button"
                                            class="bg-info"
                                            title={!hasPermission("Admin.Edit.Roles.Permissions") ? "You don't have the permission to do that!" : ""}
                                            disabled={!(hasPermission("Admin.Edit.Roles.Permissions") && (getChangedPermissions()?.length || 0) > 0)}
                                            onClick={() => saveChangedPermissions()}
                                        >
                                            Save
                                        </button>
                                    </div>
                                </Show>
                            </div>
                        </div>
                    </Show>
                    <Show when={!selectedRole()}>
                        <div class="ui-modal w-40">
                            <h1>No role selected</h1>
                        </div>
                    </Show>
                </div>
            </div>
        </ShowIfPermission>
    );
}

export default ViewRoles;
