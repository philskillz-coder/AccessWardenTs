import "./view-users.scss";

import { CleanUser } from "@typings";
import { Store } from "express-session";
import { BiSolidPencil } from "solid-icons/bi";
import { createSignal, For, Show } from "solid-js";

import { api } from "../utils";

function ViewUsers(props) {
    // eslint-disable-next-line no-unused-vars
    const store: () => Store = props.store;
    const [users, setUsers] = createSignal([]);
    // eslint-disable-next-line no-unused-vars
    const [search, setSearch] = createSignal("");
    const [selectedUser, setSelectedUser] = createSignal<CleanUser | null>(null);
    const [permissions, setPermissions] = createSignal([]);

    // eslint-disable-next-line no-unused-vars
    const [editingEmail, setEditingEmail] = createSignal(false);

    function refreshUsers() {
        api.post("/api/mg/users/get", { page: 0, count: 25 }, async res => {
            // TODO: when missing permissions display page with error
            if (res.hasError()) {
                console.log(res.message);
                return;
            }
            setUsers(res.data.users || []);
            setPermissions(res.data.permissions || []);
            if (res.data.users.length > 0) {
                setSelectedUser(res.data.users[0]);
            }
        });
    }

    function hasPermission(permission: string) {
        return permissions().includes(permission);
    }

    // eslint-disable-next-line no-unused-vars
    function searchUsers(text: string) {
        setSearch(text);
    }

    refreshUsers();

    return (
        <>
            <div class="ui-scroll-menu">
                <div class="scroll-data">
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
                <div class="scroll-content">
                    <Show when={selectedUser()}>
                        <div class="ui-modal">
                            <h1>{selectedUser().username}</h1>
                            <div class="actions">
                                <div class="action border">
                                    <input id="mg-acc-mail" placeholder={selectedUser().email} disabled/>
                                    <button type="button" class="bg-info" style={{ width: "20%", padding: 0}} onClick={() => setEditingEmail(true)} disabled={!hasPermission("Admin.Edit.User.Email")}>
                                        <div><BiSolidPencil size={15} color="#ffffff"/></div>
                                    </button>
                                </div>
                                <div class="action bg-danger">
                                    <button type="button" disabled={!hasPermission("Admin.Edit.User.Delete")}>
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Show>
                </div>
            </div>
            { /* <Container class="pt-2">
                <label for="vu-search">Search:</label>
                <div>
                    <input id="vu-search" class="border w-100 h-1" type="text" placeholder="..." onInput={e => searchUsers(e.target.value)}>asd</input>
                </div>

                <Row class="mt-2">
                    <For each={users()}>
                        {user => (
                            <Col xs={6} md={4} lg={3}>
                                <div class="ui-modal">
                                    <h1>{user.username}</h1>
                                    <div class="actions">
                                        <div class="action border">
                                            <p>{user.email}</p>
                                        </div>
                                        <div class="action border">
                                            <p>{user.id}</p>
                                        </div>
                                    </div>
                                </div>
                            </Col>
                        )}
                    </For>
                </Row>
                <div class="centered-div">
                    <div class="nav-ctrls">
                        <Button class="button" onClick={nextPage}><div><BiRegularArrowToLeft /></div></Button>
                        <Button class="button" onClick={prevPage}><div><BiRegularArrowToRight /></div></Button>
                    </div>
                </div>
                </Container> */}
        </>
    );
}

export default ViewUsers;
