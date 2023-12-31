export interface CleanUser {
    id: string;
    username: string;
    email: string;
    avatar: string;
    avatarUrl: string;
    isEmailVerified: boolean;
    mfaEnabled: boolean;
    createdAt: string;
    updatedAt: string;
    permissions: string[];
}

export interface CleanPermission {
    id: string;
    name: string;
    // createdAt: string;
    // updatedAt: string;
}

export interface CleanRole {
    id: string;
    name: string;
    // createdAt: string;
    // updatedAt: string;
}
