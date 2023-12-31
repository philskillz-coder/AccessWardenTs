import "./view-users.scss";

import { ModalConfirmation } from "@components/ModalConfirmation";
import { ShowIfPermission } from "@components/ShowIfPermission";
import { Button, FormControl, FormLabel, Modal, ModalBody, ModalFooter, ModalHeader } from "@hope-ui/solid";
import { Input, ModalCloseButton, ModalContent, ModalOverlay, notificationService } from "@hope-ui/solid";
import { ApiResponseFlags, CleanPermission } from "@typings";
import { BiSolidPencil } from "solid-icons/bi";
import { createSignal, For, onCleanup, Show } from "solid-js";

import Store from "../Store";
import { api } from "../utils";

function ViewPermissions(props) {
    type _Role = {id: string, name: string};

    const store: () => Store = props.store;
    const [permissions, setPermissions] = createSignal([]);
    const [permissionsEndReached, setPermissionsEndReached] = createSignal(false);
    const [permissionsLoading, setPermissionsLoading] = createSignal(false);
    const [search, setSearch] = createSignal("");
    let searchTimeout: NodeJS.Timeout | null = null;

    const [selectedPermission, setSelectedPermission] = createSignal<CleanPermission | null>(null);
    const [selectedPermissionRoles, setSelectedPermissionRoles] = createSignal<_Role[] | null>(null);

    const [editingName, setEditingName] = createSignal(false);
    const [newName, setNewName] = createSignal<string | null>(null);

    const [deletePermissionCR, setDeletePermissionCR] = createSignal(false);

    const [hasPagePermission, setHasPagePermission] = createSignal<boolean | null>(null);


    let page = 0;
    const count = 25;

    function refreshPermissions() {
        api.post("/api/mg/permissions/get", { page: page, count: count }, async res => {
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

            if (res.data.permissions.length < count) {
                setPermissionsEndReached(true);
            }

            if (page === 0) {
                setPermissions(res.data.permissions || []);
            } else {
                setPermissions([...permissions(), ...res.data.permissions || []]);
            }

            if (res.data.permissions.length > 0) {
                setSelectedPermission(res.data.permissions[0]);
            }
        });
    }

    function doSearch() {
        if (search() === "") {
            setSearch("");
            refreshPermissions();
            setPermissionsEndReached(false);
        }

        api.post("/api/mg/permissions/search", { page: page, count: count, search: search() }, async res => {
            if (res.hasError()) {
                console.log(res.message);
                return;
            }

            if (res.data.permissions.length < count) {
                setPermissionsEndReached(true);
            }

            if (page === 0) {
                setPermissions(res.data.permissions || []);
            } else {
                setPermissions([...permissions(), ...res.data.permissions || []]);
            }
        });
    }

    function searchPermissions(text: string) {
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


    function getSelectedPermissionRoles() {
        api.post("/api/mg/permissions/get-all-roles", { permissionId: selectedPermission().id }, async res => {
            if (res.hasError()) {
                notificationService.show({
                    status: "danger",
                    title: "Error",
                    description: res.message
                });
            } else {
                setSelectedPermissionRoles(res.data.roles);
            }
        });
    }

    function closeNameEditor() {
        setEditingName(false);
        setNewName(null);
    }

    function updatePermissionList() {
        const permissionIndex = permissions().findIndex(perm => perm.id === selectedPermission().id);

        if (permissionIndex === -1) {
            return;
        }

        const updatedPerms = [...permissions()];
        updatedPerms[permissionIndex] = selectedPermission();

        setPermissions(updatedPerms);
    }

    function updateName() {
        api.post("/api/mg/permissions/up-name", { permissionId: selectedPermission().id, name: newName() }, async res => {
            // TODO: check if name is available (tag in resp) if not set error inline or notif
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
                setSelectedPermission({ ...selectedPermission(), name: newName() });
                setNewName(null);
                updatePermissionList();
                closeNameEditor();
            }
        });
    }

    function deletePermission() {
        api.post("/api/mg/permissions/delete", { permissionId: selectedPermission().id }, async res => {
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
                    description: "Permission deleted"
                });
                let prevPermIndex = permissions().findIndex(perm => perm.id === selectedPermission().id) - 1;
                if (prevPermIndex < 0) {
                    prevPermIndex = 0;
                }
                setPermissions(permissions().filter(perm => perm.id !== selectedPermission().id));
                if (permissions().length > 0) {
                    setSelectedPermission(permissions()[prevPermIndex]);
                } else {
                    setSelectedPermission(null);
                }
                setDeletePermissionCR(false);
            }
        });
    }

    // TODO: Account.tsx and here: cancel button in modals
    function loadMorePermissions() {
        if (permissionsEndReached() || permissionsLoading()) {
            return;
        }

        setPermissionsLoading(true);
        setTimeout(() => {
            setPermissionsLoading(false);
        }, 150);

        page++;
        if (search()) {
            doSearch();
        } else {
            refreshPermissions();
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
                    loadMorePermissions();
                }
            } else {
            // Check horizontal scrolling
                if (clientWidth + scrollContainer.scrollLeft >= scrollWidth - 50) {
                // Load more items when the user is near the right edge
                    loadMorePermissions();
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

    refreshPermissions();

    const [showInfo, setShowInfo] = createSignal(true);
    const [showRoles, setShowRoles] = createSignal(false);

    function toggleInfo() {
        setShowInfo(!showInfo());
        setShowRoles(!showRoles());

        if (showRoles() && selectedPermissionRoles() === null) {
            getSelectedPermissionRoles();
        }
    }

    function selectPermission(perm: CleanPermission) {
        setShowRoles(false);
        setShowInfo(true);
        setSelectedPermissionRoles(null);
        setSelectedPermission(perm);
    }

    return (
        <ShowIfPermission hasPermission={hasPagePermission}>

            <div class="ui-scroller-menu">
                <div id="vu-data" class="ui-scroller">
                    <div class="data-pin">
                        <label for="mg-search-usr">Search</label>
                        <input id="mg-search-usr" placeholder="..." onInput={e => searchPermissions(e.target.value)}/>
                    </div>
                    <hr/>
                    <div class="data-scroll">
                        <For each={permissions()}>
                            {permission => (
                                <div class="ui-bg-gray5">
                                    <button onClick={() => selectPermission(permission)}>
                                        {permission.name}
                                    </button>
                                </div>
                            )}
                        </For>
                    </div>
                </div>
                <div class="ui-scroller-content center">
                    <Show when={selectedPermission()}>
                        <div class="ui-modal w-40">
                            <h1>{selectedPermission().name}</h1>
                            <div class="actions">
                                <div class="action border">
                                    <button classList={{"active": showInfo()}} onClick={toggleInfo} disabled={showInfo()}>Info</button>
                                    <button classList={{"active": showRoles()}} onClick={toggleInfo} disabled={showRoles()}>Roles</button>
                                </div>
                                <Show when={showInfo()}>
                                    <label for="mg-acc-name">Name</label>
                                    <div class="action border">
                                        <input id="mg-acc-name" placeholder={selectedPermission().name} disabled/>
                                        <button
                                            type="button"
                                            class="bg-info ui-icon w-20"
                                            onClick={() => setEditingName(true)}
                                            title={!hasPermission("Admin.Edit.Permission.Name") ? "You don't have the permission to do that!" : ""}
                                            disabled={!hasPermission("Admin.Edit.Permission.Name")}
                                        >
                                            <div><BiSolidPencil size={15} color="#ffffff"/></div>
                                        </button>
                                        <Modal opened={editingName()} onClose={closeNameEditor} initialFocus="#mg-new-name">
                                            <ModalOverlay />
                                            <ModalContent>
                                                <ModalCloseButton />
                                                <ModalHeader>Edit Name</ModalHeader>
                                                <ModalBody>
                                                    <FormControl mb="$4">
                                                        <FormLabel>Name</FormLabel>
                                                        <Input id="mg-new-name" type="text" placeholder="Enter new name" autocomplete="off" spellcheck={false} onChange={e => setNewName(e.target.value)}/>
                                                    </FormControl>
                                                </ModalBody>
                                                <ModalFooter>
                                                    <Button onClick={updateName}>Update</Button>
                                                </ModalFooter>
                                            </ModalContent>
                                        </Modal>
                                    </div>
                                    <div class="action bg-danger">
                                        <button
                                            type="button"
                                            title={!hasPermission("Admin.Edit.Permission.Delete") ? "You don't have the permission to do that!" : ""}
                                            disabled={!hasPermission("Admin.Edit.Permission.Delete")}
                                            onClick={() => setDeletePermissionCR(true)}
                                        >
                                            Delete
                                        </button>
                                        <ModalConfirmation isOpen={deletePermissionCR} onCancel={() => setDeletePermissionCR(false)} onConfirm={deletePermission} title="Confirmation required">
                                            <p>Are you sure you want to delete this permission?</p>
                                        </ModalConfirmation>
                                    </div>
                                </Show>

                                <Show when={showRoles()}>
                                    <div class="ui-scroller w-100 mt-2" style={{"max-height": "250px"}}>
                                        <For each={selectedPermissionRoles()}>
                                            {role => (
                                                <div class="ui-bg-gray4 action">
                                                    <div>
                                                        {role.name}
                                                    </div>
                                                </div>
                                            )}
                                        </For>
                                    </div>
                                </Show>
                            </div>
                        </div>
                    </Show>
                    <Show when={!selectedPermission()}>
                        <div class="ui-modal w-40">
                            <h1>No user selected</h1>
                        </div>
                    </Show>
                </div>
            </div>
        </ShowIfPermission>
    );
}

export default ViewPermissions;
