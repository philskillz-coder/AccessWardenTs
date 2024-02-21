import "./view-users.scss";

import { ModalConfirmation } from "@components/ModalConfirmation";
import { ShowIfPermission } from "@components/ShowIfPermission";
import { Button, FormControl, FormHelperText, FormLabel, HStack, Modal, ModalBody, ModalFooter, ModalHeader, Spinner, Tag, Textarea, VStack } from "@hope-ui/solid";
import { Input, ModalCloseButton, ModalContent, ModalOverlay, notificationService } from "@hope-ui/solid";
import { ApiResponseFlags, RoleVariantDef } from "@typings";
import { format } from "date-fns";
import { BiRegularCheck, BiRegularX, BiSolidPencil, BiSolidPlusCircle } from "solid-icons/bi";
import { BsSlash } from "solid-icons/bs";
import { createSignal, For, onCleanup, Show } from "solid-js";

import Store from "../Store";
import { api, Validator } from "../utils";
import { apiv2 } from "../utils/apiv2";

function ViewRoles(props) {
    type _Permission = {id: string, name: string, hasPermission: boolean | null};

    const store: () => Store = props.store;
    const validator = new Validator("role_name", "role_description");

    const [roles, setRoles] = createSignal<RoleVariantDef[]>([]);
    const [rolesEndReached, setRolesEndReached] = createSignal(false);
    const [rolesLoading, setRolesLoading] = createSignal(false);
    const [showLoading, setShowLoading] = createSignal(false);
    const [search, setSearch] = createSignal("");
    let searchTimeout: NodeJS.Timeout | null = null;

    const [selectedRole, setSelectedRole] = createSignal<RoleVariantDef | null>(null);
    const [selectedRolePermissions, setSelectedRolePermissions] = createSignal<_Permission[] | null>(null);
    const [displayedRolePermissions, setDisplayedRolePermissions] = createSignal<_Permission[] | null>(null);

    const [editingName, setEditingName] = createSignal(false);
    const [newName, setNewName, newNameError] = validator.useValidator("role_name", "");

    const [editingDescription, setEditingDescription] = createSignal(false);
    const [newDescription, setNewDescription, newDescriptionError] = validator.useValidator("role_description", "");
    const [editingPower, setEditingPower] = createSignal(false);
    const [newPower, setNewPower] = createSignal<number | null>(null);

    const [isCreateRole, setIsCreateRole] = createSignal(false);

    const [defaultRoleCR, setDefaultRoleCR] = createSignal(false);
    const [mfaRoleCR, setMfaRoleCR] = createSignal(false);
    const [disableRoleCR, setDisableRoleCR] = createSignal(false);
    const [deleteRoleCR, setDeleteRoleCR] = createSignal(false);

    const [hasPagePermission, setHasPagePermission] = createSignal<boolean | null>(null);

    const createRoleApi = apiv2.createAPIMethod<
        {
            name: string,
            description: string
        },
        { role: RoleVariantDef }
        >({ method: "POST", url: "/api/mg/roles/create" });

    let page = 0;
    const count = 25;

    function refreshRoles() {
        setRolesLoading(true); // avoid multiple requests

        // only show loading indicator if loading takes longer than 100ms (avoids blinking)
        const setLoadTimeout = setTimeout(() => {
            setShowLoading(true);
        }, 100);

        const resetLoadTimeout = setTimeout(() => {
            setRolesLoading(false);
            setShowLoading(false);
            notificationService.show({
                status: "warning",
                title: "Warning",
                description: "Could not load roles."
            });
        }, 5 * 1000);

        api.post("/api/mg/roles/get", { page: page, count: count }, async res => {
            clearTimeout(setLoadTimeout);
            clearTimeout(resetLoadTimeout);
            setRolesLoading(false);
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

            if (res.data.roles.length < count) {
                setRolesEndReached(true);
            }

            if (page === 0) {
                setRoles(res.data.roles || []);
            } else {
                setRoles([...roles(), ...res.data.roles || []]);
            }

            if (!selectedRole() && res.data.roles.length > 0) {
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
            setRolesLoading(true); // avoid multiple requests

            // only show loading indicator if loading takes longer than 100ms (avoids blinking)
            const setLoadTimeout = setTimeout(() => {
                setShowLoading(true);
            }, 100);

            const resetLoadTimeout = setTimeout(() => {
                setRolesLoading(false);
                setShowLoading(false);
                notificationService.show({
                    status: "warning",
                    title: "Warning",
                    description: "Could not load roles."
                });
            }, 5 * 1000);

            api.post("/api/mg/roles/search", { page: page, count: count, search: search() }, async res => {
                clearTimeout(setLoadTimeout);
                clearTimeout(resetLoadTimeout);
                setRolesLoading(false);
                setShowLoading(false);

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
                    setRoles([...roles(), ...res.data.roles || []]); // append new roles to the list
                }

                if (!selectedRole() && res.data.roles.length > 0) {
                    setSelectedRole(res.data.roles[0]);
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
                setDisplayedRolePermissions(res.data.permissions.map(perm => ({...perm})));
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

    function closePowerEditor() {
        setEditingPower(false);
        setNewPower(null);
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

    function updateName() {
        api.post("/api/mg/roles/up-name", { roleId: selectedRole().id, name: newName() }, async res => {
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

    function updateDescription() {
        api.post("/api/mg/roles/up-description", { roleId: selectedRole().id, description: newDescription() }, async res => {
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

                // nothing updated in role object
                setNewDescription(null);
                closeDescriptionEditor();
            }
        });
    }

    function updatePower() {
        api.post("/api/mg/roles/up-power", { roleId: selectedRole().id, power: newPower() }, async res => {
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
                    description: "Power updated"
                });
                setSelectedRole({ ...selectedRole(), power: newPower() });
                setNewPower(null);
                updateRoleList();
                closePowerEditor();
            }
        });
    }

    function toggleRoleDefault() {
        api.post("/api/mg/roles/toggle-default", { roleId: selectedRole().id }, async res => {
            if (res.hasError()) {
                notificationService.show({
                    status: "danger",
                    title: "Error",
                    description: res.message
                });
            } else {
                setSelectedRole({ ...selectedRole(), isDefault: !selectedRole().isDefault });
                updateRoleList();
                setDefaultRoleCR(false);
                notificationService.show({
                    status: "success",
                    title: "Success",
                    description: selectedRole().isDefault ? "Set role default" : "Unset role default"
                });
            }
        });
    }

    function toggleRoleMfa() {
        api.post("/api/mg/roles/toggle-mfa", { roleId: selectedRole().id }, async res => {
            if (res.hasError()) {
                notificationService.show({
                    status: "danger",
                    title: "Error",
                    description: res.message
                });
            } else {
                setSelectedRole({ ...selectedRole(), requiresMfa: !selectedRole().requiresMfa });
                updateRoleList();
                setMfaRoleCR(false);
                notificationService.show({
                    status: "success",
                    title: "Success",
                    description: selectedRole() ? "Role requires MFA" : "Role doesn't require MFA"
                });
            }
        });
    }

    function toggleRoleDisable() {
        api.post("/api/mg/roles/toggle-disable", { roleId: selectedRole().id }, async res => {
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
                    description: selectedRole() ? "Role enabled" : "User disabled"
                });
                setSelectedRole({ ...selectedRole(), disabled: !selectedRole().disabled });
                updateRoleList();
                setDisableRoleCR(false);
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
                    description: "Roles deleted"
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

    function createRole() {
        createRoleApi.call({
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

            const newRole = res.data.role;
            setRoles([newRole, ...roles()]);
            setSelectedRole(newRole);
            notificationService.show({
                status: "success",
                title: "Success",
                description: "Role created"
            });

            setNewName(null);
            setNewDescription(null);
            setIsCreateRole(false);
        });
    }

    function closeCreateRole() {
        setIsCreateRole(false);
        setNewName(null);
        setNewDescription(null);
    }

    function loadMoreRoles() {
        if (rolesEndReached() || rolesLoading()) {
            return;
        }

        page++;
        if (search()) {
            doSearch();
        } else {
            refreshRoles();
        }
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
                    loadMoreRoles();
                }
            } else { // horizontal scrolling
                if (scrollLeft < lastScrollTopLeft) { // prevent scrolling left
                    return;
                }

                lastScrollTopLeft = scrollLeft;

                // Load more items when the user is near the right edge
                if (clientWidth + scrollLeft >= scrollWidth - 50) {
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

    function selectRole(role: RoleVariantDef) {
        setShowPermissions(false);
        setShowInfo(true);
        setSelectedRolePermissions(null);
        setDisplayedRolePermissions(null);
        setSelectedRole(role);
    }

    function toggleRolePermission(permission: _Permission, has: boolean | null) {
        setDisplayedRolePermissions(prevPerms => {
            if (prevPerms === null) {
                return null;
            }

            const updatedPerms = [...prevPerms];
            const permIndex = updatedPerms.findIndex(p => p.id === permission.id);
            updatedPerms[permIndex].hasPermission = has;

            return updatedPerms;
        });
    }

    function getPermissionStatus(permissionId: string) {
        const perm = displayedRolePermissions().find(perm => perm.id === permissionId);
        return perm.hasPermission;
    }

    function getChangedPermissions() {
        const selectedPerms = selectedRolePermissions();
        const displayedPerms = displayedRolePermissions();

        if (selectedPerms === null || displayedPerms === null) {
            return [];
        }

        // Find roles with changes in the .has property
        const changedRoles = displayedPerms.filter((displayedRole, index) => {
            const selectedRole = selectedPerms[index];

            // Check if .has property has changed
            return selectedRole && displayedRole && selectedRole.hasPermission !== displayedRole.hasPermission;
        });
        return changedRoles;
    }

    function resetChangedRoles() {
        setDisplayedRolePermissions(selectedRolePermissions()?.map(perm => ({...perm})));
    }

    function saveChangedPerms() {
        const changedPerms = getChangedPermissions();

        if (changedPerms.length === 0) {
            return;
        }

        api.post("/api/mg/roles/up-permissions", {
            roleId: selectedRole().id,
            permissions: changedPerms.map(p => ({id: p.id, hasPermission: p.hasPermission}))
        },
        async res => {
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
                    description: "Permissions updated"
                });
                setSelectedRolePermissions(displayedRolePermissions()?.map(p => ({...p})));
            }
        });
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
                            onClick={() => setIsCreateRole(true)}
                            title={!hasPermission({name: "Admin.Create.Role"}) ? "You don't have the permission to do that!" : ""}
                            disabled={!hasPermission({name: "Admin.Create.Role"})}
                        >
                            Create role
                        </button>
                        <Modal opened={isCreateRole()} onClose={closeCreateRole} initialFocus="#mg-role-new-role-name">
                            <ModalOverlay />
                            <ModalContent>
                                <ModalCloseButton />
                                <ModalHeader>Create Role</ModalHeader>
                                <ModalBody>
                                    <FormControl mb="$4">
                                        <FormLabel>Name</FormLabel>
                                        <Input
                                            id="mg-role-new-role-name"
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
                                            id="mg-role-new-role-description"
                                            placeholder="Enter description"
                                            autocomplete="off"
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
                                    <Button onClick={createRole} disabled={newNameError() !== null || newDescriptionError() !== null}>Create</Button>
                                    <Button id="mg-role-new-role-cancel" onClick={closeCreateRole} ms="auto" colorScheme={"primary"}>Cancel</Button>
                                </ModalFooter>
                            </ModalContent>
                        </Modal>
                    </div>
                    <hr/>
                    <div id="vu-data" class="data-scroll">
                        <For each={roles()}>
                            {role => (
                                <VStack
                                    class="ui-bg-gray5 dbg2"
                                    role="button"
                                    onClick={() => selectRole(role)}
                                    justifyContent="start"
                                    height="fit-content"
                                    padding="$2"
                                >
                                    <span>{role.name}</span>
                                    <span>Power: <Tag cursor="default" title="Role power">{role.power}</Tag></span>
                                    <Show when={role.disabled || role.requiresMfa || role.isDefault}>
                                        <HStack mt="$1">
                                            <Show when={role.disabled}>
                                                <Tag cursor="default" colorScheme="danger" title="Disabled">Disabled</Tag>
                                            </Show>
                                            <Show when={role.requiresMfa}>
                                                <Tag cursor="default" colorScheme="warning" title="Requires MFA">MFA</Tag>
                                            </Show>
                                            <Show when={role.isDefault}>
                                                <Tag cursor="default" colorScheme="warning" title="Default Role">Default</Tag>
                                            </Show>
                                        </HStack>
                                    </Show>
                                </VStack>
                            )}
                        </For>
                    </div>
                </div>
                <div class="ui-scroller-content center">
                    <Show when={showLoading()}>
                        <Spinner />
                    </Show>
                    <Show when={!showLoading() && selectedRole()}>
                        <div class="ui-modal w-40">
                            <VStack width="100%" alignItems="start">
                                <Show when={selectedRole().disabled}>
                                    <Tag colorScheme="danger" cursor="default" title="Disabled">Disabled</Tag>
                                </Show>
                                <h1>{selectedRole().name}</h1>
                                <VStack mt="$1" alignItems="start">
                                    <HStack>
                                        <Tag title="Created at" cursor="default"><div class="ui-icon me-1"><BiSolidPlusCircle size={14}/></div> {format(selectedRole().createdAt, "yyyy-MM-dd")}</Tag>
                                        <Tag title="Modified at" cursor="default"><div class="ui-icon me-1"><BiSolidPencil size={14}/></div> {format(selectedRole().updatedAt, "yyyy-MM-dd")}</Tag>
                                    </HStack>
                                    <Show when={selectedRole().disabled || selectedRole().requiresMfa || selectedRole().isDefault}>
                                        <HStack mt="$1">
                                            <Show when={selectedRole().disabled}>
                                                <Tag cursor="default" colorScheme="danger" title="Disabled">Disabled</Tag>
                                            </Show>
                                            <Show when={selectedRole().requiresMfa}>
                                                <Tag cursor="default" colorScheme="warning" title="Requires MFA">MFA</Tag>
                                            </Show>
                                            <Show when={selectedRole().isDefault}>
                                                <Tag cursor="default" colorScheme="warning" title="Default Role">Default</Tag>
                                            </Show>
                                        </HStack>
                                    </Show>
                                </VStack>
                            </VStack>
                            <div class="actions">
                                <div class="action border">
                                    <button classList={{"active": showInfo()}} onClick={toggleInfo} disabled={showInfo()}>Info</button>
                                    <button classList={{"active": showPermissions()}} onClick={toggleInfo} disabled={showPermissions()}>Permissions</button>
                                </div>
                                <Show when={showInfo()}>
                                    <label for="mg-role-name">Name</label>
                                    <div class="action border">
                                        <input id="mg-role-name" value={selectedRole().name} disabled/>
                                        <button
                                            type="button"
                                            class="bg-info ui-icon w-20"
                                            onClick={() => setEditingName(true)}
                                            title={!hasPermission({name: "Admin.Edit.Role.Name"}) ? "You don't have the permission to do that!" : ""}
                                            disabled={!hasPermission({name: "Admin.Edit.Role.Name"})}
                                        >
                                            <div><BiSolidPencil size={15} color="#ffffff"/></div>
                                        </button>
                                        <Modal opened={editingName()} onClose={closeNameEditor} initialFocus="#mg-role-new-name">
                                            <ModalOverlay />
                                            <ModalContent>
                                                <ModalCloseButton />
                                                <ModalHeader>Edit Name</ModalHeader>
                                                <ModalBody>
                                                    <FormControl mb="$4">
                                                        <FormLabel>Name</FormLabel>
                                                        <Input id="mg-role-new-name" type="text" placeholder="Enter new name" autocomplete="off" spellcheck={false} onChange={e => setNewName(e.target.value)}/>
                                                    </FormControl>
                                                </ModalBody>
                                                <ModalFooter>
                                                    <Button onClick={updateName}>Update</Button>
                                                    <Button id="mg-role-new-name-cancel" onClick={closeNameEditor} ms="auto" colorScheme={"primary"}>Cancel</Button>
                                                </ModalFooter>
                                            </ModalContent>
                                        </Modal>
                                    </div>

                                    <label for="mg-role-description">Description</label>
                                    <div class="action border" style={{height: "unset"}}>
                                        <Textarea
                                            id="mg-role-description"
                                            value={selectedRole().description}
                                            size="lg"
                                            fontSize={14}
                                            onChange={e => setNewDescription(e.target.value)}
                                            disabled={true}
                                        />
                                        <button
                                            type="button"
                                            class="bg-info ui-icon w-20"
                                            style={{height: "unset"}}
                                            onClick={() => setEditingDescription(true)}
                                            title={!hasPermission({name: "Admin.Edit.Role.Description"}) ? "You don't have the permission to do that!" : ""}
                                            disabled={!hasPermission({name: "Admin.Edit.Role.Description"})}
                                        >
                                            <div><BiSolidPencil size={15} color="#ffffff"/></div>
                                        </button>
                                        <Modal opened={editingDescription()} onClose={closeDescriptionEditor} initialFocus="#mg-role-new-description">
                                            <ModalOverlay />
                                            <ModalContent>
                                                <ModalCloseButton />
                                                <ModalHeader>Edit Description</ModalHeader>
                                                <ModalBody>
                                                    <FormControl mb="$4">
                                                        <FormLabel>Description</FormLabel>
                                                        <Textarea
                                                            id="mg-role-new-description"
                                                            placeholder="Enter new description"
                                                            size="lg"
                                                            onChange={e => setNewDescription(e.target.value)}
                                                        />
                                                    </FormControl>
                                                </ModalBody>
                                                <ModalFooter>
                                                    <Button onClick={updateDescription}>Update</Button>
                                                    <Button id="mg-role-new-description-cancel" onClick={closeDescriptionEditor} ms="auto" colorScheme={"primary"}>Cancel</Button>
                                                </ModalFooter>
                                            </ModalContent>
                                        </Modal>
                                    </div>

                                    <label for="mg-role-power">Power</label>
                                    <div class="action border">
                                        <input id="mg-role-power" value={selectedRole().power} disabled/>
                                        <button
                                            type="button"
                                            class="bg-info ui-icon w-20"
                                            onClick={() => setEditingPower(true)}
                                            title={!hasPermission({name: "Admin.Edit.Role.Power"}) ? "You don't have the permission to do that!" : ""}
                                            disabled={!hasPermission({name: "Admin.Edit.Role.Power"})}
                                        >
                                            <div><BiSolidPencil size={15} color="#ffffff"/></div>
                                        </button>
                                        <Modal opened={editingPower()} onClose={closePowerEditor} initialFocus="#mg-role-new-power">
                                            <ModalOverlay />
                                            <ModalContent>
                                                <ModalCloseButton />
                                                <ModalHeader>Edit Power</ModalHeader>
                                                <ModalBody>
                                                    <FormControl mb="$4">
                                                        <FormLabel>Power</FormLabel>
                                                        <Input id="mg-role-new-power" type="number" placeholder="Enter new power" autocomplete="off" spellcheck={false} onChange={e => setNewPower(e.target.valueAsNumber)}/>
                                                    </FormControl>
                                                </ModalBody>
                                                <ModalFooter>
                                                    <Button onClick={updatePower}>Update</Button>
                                                    <Button id="mg-role-new-power-cancel" onClick={closePowerEditor} ms="auto" colorScheme={"primary"}>Cancel</Button>
                                                </ModalFooter>
                                            </ModalContent>
                                        </Modal>
                                    </div>

                                    <div class="action border border-center">
                                        <button
                                            type="button"
                                            title={!hasPermission({name: "Admin.Edit.Role.Default"}) ? "You don't have the permission to do that!" : ""}
                                            disabled={!hasPermission({name: "Admin.Edit.Role.Default"})}
                                            onClick={() => setDefaultRoleCR(true)}
                                        >
                                            <Show when={!selectedRole().isDefault}
                                                fallback="Unset default"
                                            >
                                                Set default
                                            </Show>
                                        </button>
                                        <ModalConfirmation isOpen={defaultRoleCR} onCancel={() => setDefaultRoleCR(false)} onConfirm={toggleRoleDefault} title="Confirmation required">
                                            <p>Are you sure you want to {selectedRole().isDefault ? "unset" : "set"} default on role {selectedRole().name}</p>
                                        </ModalConfirmation>
                                        <button
                                            type="button"
                                            title={!hasPermission({name: "Admin.Edit.Role.Mfa"}) ? "You don't have the permission to do that!" : ""}
                                            disabled={!hasPermission({name: "Admin.Edit.Role.Mfa"})}
                                            onClick={() => setMfaRoleCR(true)}
                                        >
                                            <Show when={!selectedRole().requiresMfa}
                                                fallback="Unset MFA"
                                            >
                                                Require MFA
                                            </Show>
                                        </button>
                                        <ModalConfirmation isOpen={mfaRoleCR} onCancel={() => setMfaRoleCR(false)} onConfirm={toggleRoleMfa} title="Confirmation required">
                                            <p>Are you sure you want to {selectedRole().disabled ? "unset" : "require"} mfa on role {selectedRole().name}</p>
                                        </ModalConfirmation>
                                    </div>
                                    <div class="action bg-danger">
                                        <button
                                            type="button"
                                            title={!hasPermission({name: "Admin.Edit.Role.Disable"}) ? "You don't have the permission to do that!" : ""}
                                            disabled={!hasPermission({name: "Admin.Edit.Role.Disable"})}
                                            onClick={() => setDisableRoleCR(true)}
                                        >
                                            <Show when={!selectedRole().disabled}
                                                fallback="Enable"
                                            >
                                                Disable
                                            </Show>
                                        </button>
                                        <ModalConfirmation isOpen={disableRoleCR} onCancel={() => setDisableRoleCR(false)} onConfirm={toggleRoleDisable} title="Confirmation required">
                                            <p>Are you sure you want to {selectedRole().disabled ? "enable" : "disable"} {selectedRole().name}</p>
                                        </ModalConfirmation>
                                    </div>
                                    <div class="action bg-danger">
                                        <button
                                            type="button"
                                            title={!hasPermission({name: "Admin.Edit.Role.Delete"}) ? "You don't have the permission to do that!" : ""}
                                            disabled={!hasPermission({name: "Admin.Edit.Role.Delete"})}
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
                                    <div class="ui-scroller-h w-100 mt-2" style={{"max-height": "250px"}}>
                                        <div class="data-scroll">
                                            <For each={displayedRolePermissions()}>
                                                {perm => (
                                                    <div class="action border border-center">
                                                        <input value={perm.name} disabled style={{border: "none"}}/>
                                                        <button
                                                            class="ui-icon w-20"
                                                            classList={{
                                                                "bg-success": getPermissionStatus(perm.id) === true
                                                            }}
                                                            disabled={!(hasPermission({name: "Admin.Edit.Role.Permissions"}) && (getPermissionStatus(perm.id) !== true))}
                                                            onClick={() => toggleRolePermission(perm, true)}
                                                        >
                                                            <div><BiRegularCheck size={15} color="#ffffff"/></div>
                                                        </button>
                                                        <button
                                                            class="ui-icon w-20"
                                                            classList={{
                                                                "bg-warning": getPermissionStatus(perm.id) === null
                                                            }}
                                                            disabled={!(hasPermission({name: "Admin.Edit.Role.Permissions"}) && (getPermissionStatus(perm.id) !== null))}
                                                            onClick={() => toggleRolePermission(perm, null)}
                                                        >
                                                            <div><BsSlash size={15} color="#ffffff"/></div>
                                                        </button>
                                                        <button
                                                            class="ui-icon w-20"
                                                            classList={{
                                                                "bg-danger": getPermissionStatus(perm.id) === false
                                                            }}
                                                            disabled={!(hasPermission({name: "Admin.Edit.Role.Permissions"}) && (getPermissionStatus(perm.id) !== false))}
                                                            onClick={() => toggleRolePermission(perm, false)}
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
                                            disabled={!(hasPermission({name: "Admin.Edit.User.Roles"}) && (getChangedPermissions()?.length || 0) > 0)}
                                            onClick={() => resetChangedRoles()}
                                        >
                                            Reset
                                        </button>
                                        <button
                                            type="button"
                                            class="bg-info"
                                            title={!hasPermission({name: "Admin.Edit.User.Roles"}) ? "You don't have the permission to do that!" : ""}
                                            disabled={!(hasPermission({name: "Admin.Edit.User.Roles"}) && (getChangedPermissions()?.length || 0) > 0)}
                                            onClick={() => saveChangedPerms()}
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
