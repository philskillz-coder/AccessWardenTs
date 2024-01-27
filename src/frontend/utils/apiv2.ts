import { ApiResponse, ApiResponseFlags } from "@typings";

/* eslint-disable no-unused-vars */
type CANCEL_CALLBACK = (err?: any) => Promise<any | void>;
type Opts = {
    url: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    timeout?: number;
    allowMfa?: boolean;
};

export class ApiWrapperGlobal {
    public mfaRequiredCallback?: () => any;
    public mfaInvalidCallback?: () => any;
    public mfaCancelCallback?: () => any;
    public mfaSuccessCallback?: () => any;

    createAPIMethod<
        TInput extends Record<string, unknown>,
        TOutput
    >(opts: Opts) : ApiInterface<TInput, TOutput> {
        return new ApiInterface<TInput, TOutput>(this, opts);
    }
}

export class ApiInterface<TInput extends Record<string, unknown>, TOutput> {
    private global: ApiWrapperGlobal;
    private opts: Opts;

    private lastBody: any | null;
    public requestRunning: boolean;
    public mfaRunning: boolean;
    private requestTimeout: NodeJS.Timeout;
    private securityTimeout: NodeJS.Timeout;
    private callback?: (resp: ApiResponse<TOutput>) => Promise<any | void>;

    constructor(global: ApiWrapperGlobal, opts: Opts) {
        this.global = global;
        this.opts = opts;

        this.lastBody = null;
        this.requestRunning = false;
        this.mfaRunning = false;

        this.requestTimeout = null;
        this.securityTimeout = null;
        this.callback = async () => {return;};
    }

    async call(body?: TInput, callback?: (resp: ApiResponse<TOutput>) => Promise<any | void>) : Promise<TOutput | null> {
        if (this.requestRunning) {
            throw new Error("Request already running");
        }
        this.requestRunning = true;

        try {
            if (callback) this.callback = callback;

            const controller = new AbortController();
            this.requestTimeout = setTimeout(() => controller.abort(), this.opts.timeout || 60_000);
            const resp = await fetch(this.opts.url, {
                method: this.opts.method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body || {}),
                signal: controller.signal
            });

            const json = await resp.json();
            const apiResp = new ApiResponse<TOutput>(json);

            if (apiResp.hasFlag(ApiResponseFlags.mfa_required)) {
                if (!this.opts.allowMfa) {
                    throw new Error("2FA required but not allowed");
                }

                this.mfaRunning = true;
                this.lastBody = body;
                this.setSecurityTimeout(); // security timeout

                this.global.mfaRequiredCallback();
                throw new Error("2FA required");
            }

            if (apiResp.hasFlag(ApiResponseFlags.mfa_invalid)) {
                this.setSecurityTimeout(); // reset security timeout

                this.global.mfaInvalidCallback();
                throw new Error("2FA invalid");
            }

            if (this.mfaRunning === true) { // mfa was successful: delete state
                this.global.mfaSuccessCallback();
                this.mfaRunning = false;
                this.lastBody = null;
                clearTimeout(this.securityTimeout);
                this.securityTimeout = null;
            }

            if (this.callback != null) {
                await this.callback(apiResp);
            }
            this.requestRunning = false;
            return (apiResp.data || {}) as TOutput;
        } catch (err) {
            if (err.name === "AbortError") {
                const asApiError = ApiResponse.fromError<TOutput>("Request timed out");
                if (this.mfaRunning) this.cancelMfa();
                this.requestRunning = false;
                await this.callback(asApiError);
                return null;
            }
            const asApiError = ApiResponse.fromError<TOutput>(err.message);
            if (callback) await this.callback(asApiError); // only call callback if it was set in this function
            return null;
        }
    }

    async supplyMfaToken(token: string): Promise<void> {
        try {
            if (!this.mfaRunning) {
                this.cancelMfa();
                throw new Error("Missing 2FA state fields. Cancelling 2FA.");
            }

            await this.call({
                ...this.lastBody,
                mfa_token: token,
            });
        } catch (err) {
            const asApiError = ApiResponse.fromError<TOutput>(err.message);
            await this.callback(asApiError);
        }
    }

    setRequestTimeout(): void {
        if (this.requestTimeout != null) clearTimeout(this.requestTimeout);
        this.requestTimeout = setTimeout(() => {
            this.requestRunning = false;

            const asApiError = ApiResponse.fromError<TOutput>("Request timed out");
            if (this.mfaRunning) this.cancelMfa();
            this.callback(asApiError);
        }, this.opts.timeout || 5000);
    }

    setSecurityTimeout(): void {
        if (this.securityTimeout != null) clearTimeout(this.securityTimeout);
        this.securityTimeout = setTimeout(() => {
            const asApiError = ApiResponse.fromError<TOutput>("For security reasons, you must enter your MFA token within 120 seconds. Please try again.");
            this.callback(asApiError);
            this.cancelMfa();
        }, 120 * 1000);
    }

    cancelMfa(): void {
        if (this.mfaRunning == false) return;
        this.mfaRunning = false;
        this.lastBody = null;

        clearTimeout(this.securityTimeout);
        this.securityTimeout = null;
        this.global.mfaCancelCallback();
    }
}

export const api = new ApiWrapperGlobal();


const getUsers = api.createAPIMethod<
    {
        page: number;
        search: string;
    },
    {
        users: {
            id: string;
            username: string;
            email: string;
            role: string;
            mfa_enabled: boolean;
            mfa_secret: string;
        }[];
        end_reached: boolean;
    }
>({
    url: "/api/v2/admin/users",
    method: "POST",
    timeout: 10000,
    allowMfa: true,
});

getUsers.call({
    page: 1,
    search: ""
}, async res => {
    if (res.hasError()) {
        // handle error
    }
    const data = res.data;
    console.log(data.users);
});

