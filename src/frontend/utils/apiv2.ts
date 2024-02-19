import { ApiResponse, ApiResponseFlags } from "@typings";

/* eslint-disable no-unused-vars */

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

    private requestingMfaToken: boolean;
    private mfaSecurityTimeout: NodeJS.Timeout;
    private currentMfaTokenInvalid: boolean;
    private tokenSubscribers: ApiInterface<any, any>[];

    // for frontend
    supplyMfaToken(token: string): void {
        this.currentMfaTokenInvalid = false;
        this.tokenSubscribers.forEach(s => s.supplyMfaToken(token)); // supply token to all subscribers
    }

    // for children
    requestMfaToken(i: ApiInterface<any, any>) {
        this.tokenSubscribers.push(i);

        if (this.requestingMfaToken) {
            return;
        }

        this.requestingMfaToken = true;
        this.setSecurityTimeout();
        this.mfaRequiredCallback(); // signal frontend to show mfa dialog
    }

    reportMfaInvalid() {
        if (this.currentMfaTokenInvalid) {
            return;
        }

        this.currentMfaTokenInvalid = true;
        this.setSecurityTimeout();
        this.mfaInvalidCallback(); // signal frontend to show mfa error
    }

    reportMfaSuccess(i: ApiInterface<any, any>) {
        this.tokenSubscribers = this.tokenSubscribers.filter(s => s.id !== i.id);

        if (this.tokenSubscribers.length === 0) {
            this.requestingMfaToken = false;
            clearTimeout(this.mfaSecurityTimeout);
            this.mfaSecurityTimeout = null;
            this.currentMfaTokenInvalid = false;
            this.mfaSuccessCallback(); // signal frontend that mfa was successful
        }
    }

    cancelAll() { // cancels all mfa requests
        this.requestingMfaToken = false;
        clearTimeout(this.mfaSecurityTimeout);
        this.mfaSecurityTimeout = null;
        this.tokenSubscribers.forEach(s => s.cancelMfa());
        this.tokenSubscribers = [];
        this.mfaCancelCallback();
    }

    unsubscribeMfa(i: ApiInterface<any, any>) {
        this.tokenSubscribers = this.tokenSubscribers.filter(s => s.id !== i.id);
    }

    // for api
    createAPIMethod<
        TInput extends Record<string, unknown>,
        TOutput
    >(opts: Opts) : ApiInterface<TInput, TOutput> {
        return new ApiInterface<TInput, TOutput>(this, opts);
    }

    private setSecurityTimeout(): void {
        if (this.mfaSecurityTimeout != null) clearTimeout(this.mfaSecurityTimeout);
        this.mfaSecurityTimeout = setTimeout(() => {
            this.cancelAll();
        }, 120 * 1000);
    }
}

export class ApiInterface<TInput extends Record<string, unknown>, TOutput> {
    public id = Math.random().toString(36).substring(2, 9);

    private global: ApiWrapperGlobal;
    private opts: Opts;

    private lastBody: any | null;
    public mfaRunning: boolean;
    private requestTimeout: NodeJS.Timeout;
    private callback?: (resp: ApiResponse<TOutput>) => Promise<any | void>;

    constructor(global: ApiWrapperGlobal, opts: Opts) {
        this.global = global;
        this.opts = opts;

        this.lastBody = null;
        this.mfaRunning = false;

        this.requestTimeout = null;
        this.callback = async () => {return;};
    }

    async call(body?: TInput, callback?: (resp: ApiResponse<TOutput>) => Promise<any | void>) : Promise<TOutput | null> {
        try {
            if (callback) this.callback = callback;

            // for request timeout
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

                this.global.requestMfaToken(this); // subscribe to token
                throw new Error("2FA required");
            }

            if (apiResp.hasFlag(ApiResponseFlags.mfa_invalid)) {
                this.global.reportMfaInvalid();
                throw new Error("2FA invalid");
            }

            if (this.mfaRunning === true) { // mfa was successful: delete state
                this.global.reportMfaSuccess(this); // report success & unsubscribe current interface from token
                this.mfaRunning = false;
                this.lastBody = null;
            }

            if (this.callback) {
                await this.callback(apiResp);
            }
            return (apiResp.data || {}) as TOutput;
        } catch (err) {
            if (err.name === "AbortError") { // request timed out
                this.requestTimedOut();
                return null;
            }

            const asApiError = ApiResponse.fromError<TOutput>(err.message);
            // if (callback) await this.callback(asApiError); // only call callback if it was set in this function // why would you do that?
            if (this.callback) {
                await this.callback(asApiError);
            }
            return null;
        }
    }

    async supplyMfaToken(token: string): Promise<void> { // receive token from global
        try {
            if (!this.mfaRunning || this.lastBody == null || this.opts.method == null || this.opts.url == null) {
                this.global.unsubscribeMfa(this);
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

    requestTimedOut(): void {
        if (this.mfaRunning) {
            this.global.unsubscribeMfa(this);
            this.mfaRunning = false;
            this.lastBody = null;
        }

        const asApiError = ApiResponse.fromError<TOutput>("Request timed out");
        this.callback(asApiError);
    }

    cancelMfa(): void {
        if (this.mfaRunning == false) return;
        this.mfaRunning = false;
        this.lastBody = null;

        const asApiError = ApiResponse.fromError<TOutput>("2FA cancelled");
        this.callback(asApiError);
    }
}

export const apiv2 = new ApiWrapperGlobal();


const getUsers = apiv2.createAPIMethod<
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
    search: "test",
}, async res => {
    if (res.hasError()) {
        // handle error
    }
    const data = res.data;
    console.log(data.users);
});
