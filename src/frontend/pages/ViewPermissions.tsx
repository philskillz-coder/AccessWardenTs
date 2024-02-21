import { ModalConfirmation } from "@components/ModalConfirmation";
import { ShowIfPermission } from "@components/ShowIfPermission";
import { Button, FormControl, FormHelperText, FormLabel, HStack, Modal, ModalBody, ModalFooter, ModalHeader, Spinner, Tag, Textarea, VStack } from "@hope-ui/solid";
import { Input, ModalCloseButton, ModalContent, ModalOverlay, notificationService } from "@hope-ui/solid";
import { ApiResponseFlags, PermissionVariantDef } from "@typings";
import { format } from "date-fns";
import { BiSolidPencil, BiSolidPlusCircle } from "solid-icons/bi";
import { createSignal, For, onCleanup, Show } from "solid-js";

import Store from "../Store";
import { api, Validator } from "../utils";
import { apiv2 } from "../utils/apiv2";

function ViewPermissions(props) {
    type _Role = {id: string, name: string};

    const store: () => Store = props.store;
    const [permissions, setPermissions] = createSignal<PermissionVariantDef[]>([]);
    const [permissionsEndReached, setPermissionsEndReached] = createSignal(false);
    const [permissionsLoading, setPermissionsLoading] = createSignal(false);
    const [showLoading, setShowLoading] = createSignal(false);
    const [search, setSearch] = createSignal("");
    let searchTimeout: NodeJS.Timeout | null = null;

    const [selectedPermission, setSelectedPermission] = createSignal<PermissionVariantDef | null>(null);
    const [selectedPermissionRoles, setSelectedPermissionRoles] = createSignal<_Role[] | null>(null);

    const validator = new Validator("permission_name", "permission_description");

    const [editingName, setEditingName] = createSignal(false);
    const [newName, setNewName, newNameError] = validator.useValidator("permission_name", "");
    const [editingDescription, setEditingDescription] = createSignal(false);
    const [newDescription, setNewDescription, newDescriptionError] = validator.useValidator("permission_description", "");

    const createPermissionApi = apiv2.createAPIMethod<
        { name: string, description: string },
        { permission: PermissionVariantDef }
    >({ method: "POST", url: "/api/mg/permissions/create" });
    const [isCreatePermission, setIsCreatePermission] = createSignal(false);
    const [deletePermissionCR, setDeletePermissionCR] = createSignal(false);

    const [hasPagePermission, setHasPagePermission] = createSignal<boolean | null>(null);


    let page = 0;
    const count = 25;

    function refreshPermissions() {
        setPermissionsLoading(true); // avoid multiple requests

        // only show loading indicator if loading takes longer than 100ms (avoids blinking)
        const setLoadTimeout = setTimeout(() => {
            setShowLoading(true);
        }, 100);

        const resetLoadTimeout = setTimeout(() => {
            setPermissionsLoading(false);
            setShowLoading(false);
            notificationService.show({
                status: "warning",
                title: "Warning",
                description: "Could not load permissions."
            });
        }, 5 * 1000);

        api.post("/api/mg/permissions/get", { page: page, count: count }, async res => {
            clearTimeout(setLoadTimeout);
            clearTimeout(resetLoadTimeout);
            setPermissionsLoading(false);
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

            if (res.data.permissions.length < count) {
                setPermissionsEndReached(true);
            }

            if (page === 0) {
                setPermissions(res.data.permissions || []);
            } else {
                setPermissions([...permissions(), ...res.data.permissions || []]);
            }

            if (!selectedPermission() && res.data.permissions.length > 0) {
                setSelectedPermission(res.data.permissions[0]);
            }
        });
    }

    function doSearch() {
        if (search() === "") { // reset search
            setSearch("");
            refreshPermissions();
            setPermissionsEndReached(false);
        } else {
            setPermissionsLoading(true); // avoid multiple requests

            // only show loading indicator if loading takes longer than 100ms (avoids blinking)
            const setLoadTimeout = setTimeout(() => {
                setShowLoading(true);
            }, 100);

            const resetLoadTimeout = setTimeout(() => {
                setPermissionsLoading(false);
                setShowLoading(false);
                notificationService.show({
                    status: "warning",
                    title: "Warning",
                    description: "Could not load permissions."
                });
            }, 5 * 1000);

            api.post("/api/mg/permissions/search", { page: page, count: count, search: search() }, async res => {
                clearTimeout(setLoadTimeout);
                clearTimeout(resetLoadTimeout);
                setPermissionsLoading(false);
                setShowLoading(false);

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
                    setPermissions([...permissions(), ...res.data.permissions || []]); // append new roles to the list
                }

                if (!selectedPermission() && res.data.permissions.length > 0) {
                    setSelectedPermission(res.data.permissions[0]);
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

    // eslint-disable-next-line no-unused-vars
    function hasPermission(check: {name?: string, id?: string}) {
        return store().user().permissions.some(permission => (check.id !== undefined ? permission.id === check.id : true) && (check.name !== undefined ? permission.name === check.name : true));
    }

    function getSelectedPermissionRoles() {
        api.post("/api/mg/roles/get-all-roles", { permissionId: selectedPermission().id }, async res => {
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

    function closeDescriptionEditor() {
        setEditingDescription(false);
        setNewDescription(null);
    }

    function updatePermissionList() {
        const permissionIndex = permissions().findIndex(perm => perm.id === selectedPermission().id);

        if (permissionIndex === -1) {
            return;
        }

        const updatedPermissions = [...permissions()];
        updatedPermissions[permissionIndex] = selectedPermission();

        setPermissions(updatedPermissions);
    }

    function updateName() {
        api.post("/api/mg/permissions/up-name", { permissionId: selectedPermission().id, name: newName() }, async res => {
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

    function updateDescription() {
        api.post("/api/mg/permissions/up-description", { permissionId: selectedPermission().id, description: newDescription() }, async res => {
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
                    description: "Description updated"
                });
                setSelectedPermission({ ...selectedPermission(), description: newDescription() });
                setNewDescription(null);
                updatePermissionList();
                closeDescriptionEditor();
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

    function loadMorePermissions() {
        if (permissionsEndReached() || permissionsLoading()) {
            return;
        }

        page++;
        if (search()) {
            doSearch();
        } else {
            refreshPermissions();
        }
    }

    function createPermission() {
        createPermissionApi.call({
            name: newName(),
            description: newDescription()
        }, async res => {
            if (res.hasError()) {
                notificationService.show({
                    status: "danger",
                    title: "Error",
                    description: res.message
                });
                return;
            }

            const newPerm = res.data.permission;
            setPermissions([newPerm, ...permissions()]);
            setSelectedPermission(newPerm);
            notificationService.show({
                status: "success",
                title: "Success",
                description: "Permission created"
            });

            setNewName(null);
            setNewDescription(null);
            setIsCreatePermission(false);
        });
    }

    function closeCreatePermission() {
        setIsCreatePermission(false);
        setNewName(null);
        setNewDescription(null);
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
                    loadMorePermissions();
                }
            } else { // horizontal scrolling
                if (scrollLeft < lastScrollTopLeft) { // prevent scrolling left
                    return;
                }

                lastScrollTopLeft = scrollLeft;

                // Load more items when the user is near the right edge
                if (clientWidth + scrollLeft >= scrollWidth - 50) {
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

    function selectPermission(perm: PermissionVariantDef) {
        setShowRoles(false);
        setShowInfo(true);
        setSelectedPermissionRoles(null);
        setSelectedPermission(perm);
    }

    return (
        <ShowIfPermission hasPermission={hasPagePermission}>

            <div class="ui-scroller-menu">
                <div class="ui-scroller" id="u-scroll">
                    <div class="data-pin">
                        <label for="mg-search-usr">Search</label>
                        <input id="mg-search-usr" placeholder="..." onInput={e => searchRoles(e.target.value)}/>
                        <button
                            class="bg-info mt-1"
                            onClick={() => setIsCreatePermission(true)}
                            title={!hasPermission({name: "Admin.Create.Permission"}) ? "You don't have the permission to do that!" : ""}
                            disabled={!hasPermission({name: "Admin.Create.Permission"})}
                        >
                            Create permission
                        </button>
                        <Modal opened={isCreatePermission()} onClose={closeCreatePermission} initialFocus="#mg-permission-new-permission-name">
                            <ModalOverlay />
                            <ModalContent>
                                <ModalCloseButton />
                                <ModalHeader>Create Permission</ModalHeader>
                                <ModalBody>
                                    <FormControl mb="$4">
                                        <FormLabel>Name</FormLabel>
                                        <Input
                                            id="mg-permission-new-permission-name"
                                            type="text"
                                            placeholder="Enter name"
                                            autocomplete="off"
                                            spellcheck={false}
                                            onInput={e => setNewName(e.target.value)}
                                            invalid={newNameError() !== null}
                                        />
                                        <Show when={newNameError() !== null}>
                                            <FormHelperText color="red">{newNameError()}</FormHelperText>
                                        </Show>
                                    </FormControl>
                                    <FormControl mb="$4">
                                        <FormLabel>Description</FormLabel>
                                        <Textarea
                                            id="mg-permission-new-permission-description"
                                            placeholder="Enter description"
                                            autocomplete="off"
                                            size="lg"
                                            spellcheck={false}
                                            onInput={e => setNewDescription(e.target.value)}
                                            invalid={newDescriptionError() !== null}
                                        />
                                        <Show when={newDescriptionError() !== null}>
                                            <FormHelperText color="red">{newDescriptionError()}</FormHelperText>
                                        </Show>
                                    </FormControl>
                                </ModalBody>
                                <ModalFooter>
                                    <Button onClick={createPermission} disabled={newNameError() !== null || newDescriptionError() !== null}>Create</Button>
                                    <Button id="mg-permission-new-permission-cancel" onClick={closeCreatePermission} ms="auto" colorScheme={"primary"}>Cancel</Button>
                                </ModalFooter>
                            </ModalContent>
                        </Modal>
                    </div>
                    <hr/>
                    <div id="vu-data" class="data-scroll">
                        <For each={permissions()}>
                            {permission => (
                                <VStack
                                    class="ui-bg-gray5 dbg2"
                                    role="button"
                                    onClick={() => selectPermission(permission)}
                                    justifyContent="start"
                                    height="fit-content"
                                    padding="$2"
                                >
                                    <span>{permission.name}</span>
                                </VStack>
                            )}
                        </For>
                    </div>
                </div>
                <div class="ui-scroller-content center">
                    <Show when={showLoading()}>
                        <Spinner />
                    </Show>
                    <Show when={!showLoading() && selectedPermission()}>
                        <div class="ui-modal w-40">
                            <VStack width="100%" alignItems="start">
                                <h1>{selectedPermission().name}</h1>
                                <VStack mt="$1" alignItems="start">
                                    <HStack>
                                        <Tag title="Created at" cursor="default"><div class="ui-icon me-1"><BiSolidPlusCircle size={14}/></div> {format(selectedPermission().createdAt, "yyyy-MM-dd")}</Tag>
                                        <Tag title="Modified at" cursor="default"><div class="ui-icon me-1"><BiSolidPencil size={14}/></div> {format(selectedPermission().updatedAt, "yyyy-MM-dd")}</Tag>
                                    </HStack>
                                </VStack>
                            </VStack>
                            <div class="actions">
                                <div class="action border">
                                    <button classList={{"active": showInfo()}} onClick={toggleInfo} disabled={showInfo()}>Info</button>
                                    <button classList={{"active": showRoles()}} onClick={toggleInfo} disabled={showRoles()}>Roles</button>
                                </div>
                                <Show when={showInfo()}>
                                    <label for="mg-permission-name">Name</label>
                                    <div class="action border">
                                        <input id="mg-permission-name" value={selectedPermission().name} disabled/>
                                        <button
                                            type="button"
                                            class="bg-info ui-icon w-20"
                                            onClick={() => setEditingName(true)}
                                            title={!hasPermission({name: "Admin.Edit.Permission.Name"}) ? "You don't have the permission to do that!" : ""}
                                            disabled={!hasPermission({name: "Admin.Edit.Permission.Name"})}
                                        >
                                            <div><BiSolidPencil size={15} color="#ffffff"/></div>
                                        </button>
                                        <Modal opened={editingName()} onClose={closeNameEditor} initialFocus="#mg-permission-new-name">
                                            <ModalOverlay />
                                            <ModalContent>
                                                <ModalCloseButton />
                                                <ModalHeader>Edit Name</ModalHeader>
                                                <ModalBody>
                                                    <FormControl mb="$4">
                                                        <FormLabel>Name</FormLabel>
                                                        <Input id="mg-permission-new-name" type="text" placeholder="Enter new name" autocomplete="off" spellcheck={false} onChange={e => setNewName(e.target.value)}/>
                                                    </FormControl>
                                                </ModalBody>
                                                <ModalFooter>
                                                    <Button onClick={updateName}>Update</Button>
                                                    <Button id="mg-permission-new-name-cancel" onClick={closeNameEditor} ms="auto" colorScheme={"primary"}>Cancel</Button>
                                                </ModalFooter>
                                            </ModalContent>
                                        </Modal>
                                    </div>

                                    <label for="mg-permission-description">Description</label>
                                    <div class="action border" style={{height: "unset"}}>
                                        <Textarea
                                            id="mg-permission-description"
                                            value={selectedPermission().description}
                                            size="lg"
                                            fontSize={14}
                                            onChange={e => setNewDescription(e.target.value)}
                                            disabled
                                        />
                                        <button
                                            type="button"
                                            class="bg-info ui-icon w-20"
                                            style={{height: "unset"}}
                                            onClick={() => setEditingDescription(true)}
                                            title={!hasPermission({name: "Admin.Edit.Permission.Description"}) ? "You don't have the permission to do that!" : ""}
                                            disabled={!hasPermission({name: "Admin.Edit.Permission.Description"})}
                                        >
                                            <div><BiSolidPencil size={15} color="#ffffff"/></div>
                                        </button>
                                        <Modal opened={editingDescription()} onClose={closeDescriptionEditor} initialFocus="#mg-permission-new-description">
                                            <ModalOverlay />
                                            <ModalContent>
                                                <ModalCloseButton />
                                                <ModalHeader>Edit Description</ModalHeader>
                                                <ModalBody>
                                                    <FormControl mb="$4">
                                                        <FormLabel>Description</FormLabel>
                                                        <Textarea
                                                            id="mg-permission-new-description"
                                                            placeholder="Enter new description"
                                                            size="lg"
                                                            onChange={e => setNewDescription(e.target.value)}
                                                        />
                                                    </FormControl>
                                                </ModalBody>
                                                <ModalFooter>
                                                    <Button onClick={updateDescription}>Update</Button>
                                                    <Button id="mg-permission-new-description-cancel" onClick={closeDescriptionEditor} ms="auto" colorScheme={"primary"}>Cancel</Button>
                                                </ModalFooter>
                                            </ModalContent>
                                        </Modal>
                                    </div>
                                    <div class="action bg-danger">
                                        <button
                                            type="button"
                                            title={!hasPermission({name: "Admin.Edit.Permission.Delete"}) ? "You don't have the permission to do that!" : ""}
                                            disabled={!hasPermission({name: "Admin.Edit.Permission.Delete"})}
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
                                    <div class="ui-scroller-h w-100 mt-2" style={{"max-height": "250px"}}>
                                        <div class="data-scroll">
                                            <For each={selectedPermissionRoles()}>
                                                {role => (
                                                    <div class="action border">
                                                        <input value={role.name} disabled style={{border: "none"}}/>
                                                    </div>
                                                )}
                                            </For>
                                        </div>
                                    </div>
                                </Show>
                            </div>
                        </div>
                    </Show>
                    <Show when={!selectedPermission()}>
                        <div class="ui-modal w-40">
                            <h1>No role selected</h1>
                        </div>
                    </Show>
                </div>
            </div>
        </ShowIfPermission>
    );
}

export default ViewPermissions;
