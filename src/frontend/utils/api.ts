import { notificationService } from "@hope-ui/solid";
import { ApiResponse, NotificationStatusTypes } from "@typings";

/* eslint-disable no-unused-vars */
type CALLBACK = (resp: ApiResponse) => Promise<any>;

export class ApiInterface {
    private lastMethod: string | null;
    private lastPath: string | null;
    private lastBody: any | null;
    public mfaRequiredCallback?: () => any;
    public mfaInvalidCallback?: () => any;
    public mfaCancelCallback?: () => any;
    public mfaSuccessCallback?: () => any;
    public mfaRunning: boolean;

    // eslint-disable-next-line no-unused-vars
    private callback?: (_: ApiResponse) => Promise<any>;

    constructor() {
        this.callback = null;
        this.lastMethod = null;
        this.lastPath = null;
        this.lastBody = null;
        this.mfaRunning = null;
    }

    async post(path: string, body?: any, calllback?: CALLBACK): Promise<void> {
        await this.callApi(path, "POST", body, calllback);
    }

    async get(path: string, body?: any, calllback?: CALLBACK): Promise<void> {
        await this.callApi(path, "GET", body, calllback);
    }

    async callApi(path: string, method: string, body?: any, calllback?: CALLBACK): Promise<void> {
        if (calllback != null) this.callback = calllback;

        const resp = await fetch(path, {
            method: method,
            headers: {
                "Content-Type": "application/json",
            },
            body: (body != null ? JSON.stringify(body) : "{}"),
        });

        const json = await resp.json();
        const apiResp = new ApiResponse(json.status, json.error, json.data, json.message, json.showNotification);

        if (apiResp.hasError()) {
            notificationService.show({
                status: <NotificationStatusTypes>"error",
                title: "Error",
                description: apiResp.error,
                duration: 3000,
            });
        }

        if (apiResp.mfaRequired()) {
            notificationService.show({
                status: <NotificationStatusTypes>"info",
                title: "MFA Required",
                description: "Please enter your MFA token",
                duration: 3000,
            });

            // save state
            this.mfaRunning = true;
            this.lastMethod = method;
            this.lastPath = path;
            this.lastBody = body;
            setTimeout(() => {
                // TODO: delay timeout when mfa code supplied and wrong
                notificationService.show({
                    status: <NotificationStatusTypes>"error",
                    title: "MFA Error",
                    description: "For security reasons, you must enter your MFA token within 120 seconds. Please try again.",
                    duration: 3000,
                });
                this.cancelMfa();
            }, 120 * 1000);

            this.mfaRequiredCallback();
            throw new Error("MFA Required");
        }

        if (apiResp.mfaInvalid()) {
            notificationService.show({
                status: <NotificationStatusTypes>"error",
                title: "MFA Invalid",
                description: "Please enter a valid MFA token",
                duration: 3000,
            });
            this.mfaInvalidCallback();
            throw new Error("MFA Invalid");
        }

        if (apiResp.showNotification) {
            notificationService.show({
                status: apiResp.notificationStatus(),
                title: apiResp.status,
                description: apiResp.message,
                duration: 3000,
            });
        }

        if (this.mfaRunning === true) {
            this.mfaSuccessCallback();
            this.mfaRunning = false;
        }

        if (this.callback != null) {
            await this.callback(apiResp);
        }
    }

    async supplyMfaToken(token: string): Promise<void> {
        if (this.lastMethod == null || this.lastPath == null || this.lastBody == null) {
            throw new Error("No MFA required");
        }

        this.lastBody.token = token;
        await this.callApi(this.lastPath, this.lastMethod, this.lastBody);
        return;
    }

    cancelMfa(): void {
        if (this.mfaRunning == false) return;
        this.mfaRunning = false;
        this.lastMethod = null;
        this.lastBody = null;
        this.lastPath = null;
        this.mfaCancelCallback();
    }
}

export const api = new ApiInterface();
