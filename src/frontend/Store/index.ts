import { CleanUser } from "@typings";

import { api } from "../utils";

export default class Store {
    user: () => CleanUser | null;
    // eslint-disable-next-line no-unused-vars
    setUser: (user: CleanUser) => void;

    constructor(user, setUser) {
        this.user = user;
        this.setUser = setUser;
    }

    async refreshUser() {
        await api.post("/api/auth/@me", {}, async res => {
            this.setUser(res.data.user);
        });
    }
}
