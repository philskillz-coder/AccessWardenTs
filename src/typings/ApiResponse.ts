/* eslint-disable no-unused-vars */
export type ApiResponseStatus = "success" | "error";
export enum ApiResponseFlags {
    mfa_required = "mfareq",
    mfa_invalid = "mfainv",
    unauthorized = "unauthorized",
    unauthorized_mfa_req = "unauthorized_mfa_req"
}

export class ApiResponse {
    status: ApiResponseStatus;
    data: any;
    message: string;
    flags: ApiResponseFlags[];

    constructor(response: any) {
        this.status = response.status;
        this.data = response.data || {};
        this.message = response.message || "";
        this.flags = response.flags || [];
    }

    hasError() {
        return this.status === "error";
    }

    hasData() {
        return this.data !== undefined && this.data !== null;
    }

    hasFlag(flag: ApiResponseFlags) {
        return this.flags.includes(flag);
    }
}
