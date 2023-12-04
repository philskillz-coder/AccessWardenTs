import Socket from "./socket";

export default class Store {
    Socket: Socket = null;
    constructor(accessToken?: string) {
        this.Socket = new Socket(accessToken);
    }
}
