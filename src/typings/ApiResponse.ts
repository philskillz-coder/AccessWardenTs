/* eslint-disable no-unused-vars */
export type ApiResponseStatus = "success" | "error";
export enum ApiResponseFlags {
    mfa_required = "mfareq",
    mfa_invalid = "mfainv",
    unauthorized = "unauthorized",
    unauthorized_mfa_req = "unauthorized_mfa_req",
    unauthorized_mfa_fb = "unauthorized_mfa_fb",
    forbidden = "forbidden",
    role_mfa_required = "role_mfa_required",
    end_reached = "end_reached"
}

export class ApiResponse<TData> {
    status: ApiResponseStatus;
    data: TData;
    message: string;
    flags: ApiResponseFlags[];

    constructor(response: any) {
        this.status = response.status;
        this.data = response.data || {};
        this.message = response.message || "";
        this.flags = response.flags || [];
    }

    static fromError<TData>(error: string) {
        return new ApiResponse<TData>({
            status: "error",
            message: error,
            data: null,
            flags: [],
        });
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
