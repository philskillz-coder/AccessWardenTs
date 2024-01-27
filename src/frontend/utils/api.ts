import { notificationService } from "@hope-ui/solid";
import { ApiResponse, ApiResponseFlags } from "@typings";

/* eslint-disable no-unused-vars */
type CALLBACK = (resp: ApiResponse<any>) => Promise<any>;
type CANCEL_CALLBACK = (err?: any) => Promise<any>;

export class ApiInterface {
    private lastMethod: string | null;
    private lastPath: string | null;
    private lastBody: any | null;
    public mfaRequiredCallback?: () => any;
    public mfaInvalidCallback?: () => any;
    public mfaCancelCallback?: () => any;
    public mfaSuccessCallback?: () => any;
    public mfaRunning: boolean;

    private timeout?: NodeJS.Timeout;
    private callback?: CALLBACK;
    private cancelCallback?: CANCEL_CALLBACK;

    constructor() {
        this.callback = null;
        this.cancelCallback = null;
        this.lastMethod = null;
        this.lastPath = null;
        this.lastBody = null;
        this.mfaRunning = false;
        this.timeout = null;
    }

    async post(path: string, body?: any, calllback?: CALLBACK, cancel?: CANCEL_CALLBACK): Promise<ApiResponse<any>> {
        return await this.callApi(path, "POST", body, calllback, cancel);
    }

    async get(path: string, body?: any, calllback?: CALLBACK, cancel?: CANCEL_CALLBACK): Promise<ApiResponse<any>> {
        return await this.callApi(path, "GET", body, calllback, cancel);
    }

    async callApi(path: string, method: string, body?: any, calllback?: CALLBACK, cancel?: CANCEL_CALLBACK): Promise<ApiResponse<any>> {
        try {
            if (calllback != null) this.callback = calllback;
            if (cancel != null) this.cancelCallback = cancel;

            const resp = await fetch(path, {
                method: method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: (body != null ? JSON.stringify(body) : "{}"),
            });

            const json = await resp.json();
            const apiResp = new ApiResponse(json);

            if (apiResp.hasFlag(ApiResponseFlags.mfa_required)) {
                // save state
                this.mfaRunning = true;
                this.lastMethod = method;
                this.lastPath = path;
                this.lastBody = body;

                // security timeout
                this.setSecurityTimeout();

                this.mfaRequiredCallback();
                throw new Error("MFA Required");
            }

            if (apiResp.hasFlag(ApiResponseFlags.mfa_invalid)) {
                // reset security timeout
                this.setSecurityTimeout();

                this.mfaInvalidCallback();
                throw new Error("MFA Invalid");
            }

            if (this.mfaRunning === true) { // mfa was successful: delete state
                this.mfaSuccessCallback();
                this.mfaRunning = false;
                this.lastMethod = null;
                this.lastBody = null;
                this.lastPath = null;
                clearTimeout(this.timeout);
                this.timeout = null;
            }

            if (this.callback != null) {
                await this.callback(apiResp);
            }
            return apiResp;
        } catch (err) {
            if (this.callback != null) {
                const resp = ApiResponse.fromError(err.message);
                await this.callback(err);
            }
        }
    }

    async supplyMfaToken(token: string): Promise<void> {
        if (!this.mfaRunning || this.lastMethod == null || this.lastPath == null || this.lastBody == null) {
            throw new Error("Missing MFA state fields");
        }

        this.lastBody.token = token;
        await this.callApi(this.lastPath, this.lastMethod, this.lastBody);
    }

    setSecurityTimeout(): void {
        if (this.timeout != null) clearTimeout(this.timeout);
        this.timeout = setTimeout(() => {
            notificationService.show({
                status: "danger",
                title: "MFA Error",
                description: "For security reasons, you must enter your MFA token within 120 seconds. Please try again.",
                duration: 3000,
            });
            this.cancelMfa();
        }, 120 * 1000);
    }

    cancelMfa(): void {
        if (this.mfaRunning == false) return;
        this.mfaRunning = false;
        this.lastMethod = null;
        this.lastBody = null;
        this.lastPath = null;
        clearTimeout(this.timeout);
        this.timeout = null;
        this.mfaCancelCallback();
        if (this.cancelCallback != null) this.cancelCallback();
    }
}

export const api = new ApiInterface();
