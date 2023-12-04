import { NotificationStatusTypes } from "./WebSocket";

export type ApiResponseStatus = "success" | "error" | "mfarequired" | "mfainvalid";

export class ApiResponse {
    status: ApiResponseStatus;
    error?: string;
    data: any;
    message?: string;
    showNotification?: boolean;

    constructor(status: ApiResponseStatus, error?: string, data?: any, message?: string, showNotification?: boolean) {
        this.status = status;
        this.error = error;
        this.data = data;
        this.message = message;
        this.showNotification = showNotification;
    }

    static success(data?: any) {
        return new ApiResponse("success", undefined, data);
    }

    static error(error: string, data?: any) {
        return new ApiResponse("error", error, data);
    }

    static fromError(error: Error, data?: any) {
        return new ApiResponse("error", error.message, data);
    }

    notificationStatus() : NotificationStatusTypes {
        switch (this.status) {
            case "success":
                return "success";
            case "error":
                return "danger";
        }
    }

    hasError() {
        return this.status === "error";
    }

    hasData() {
        return this.data !== undefined && this.data !== null;
    }

    hasMessage() {
        return this.message !== undefined && this.message !== null;
    }

    mfaRequired() {
        return this.status === "mfarequired";
    }

    mfaInvalid() {
        return this.status === "mfainvalid";
    }
}
