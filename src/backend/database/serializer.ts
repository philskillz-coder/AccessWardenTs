import { CleanUser } from "@typings";
import hashidService from "backend/services/HashidService";

import { Permission, User } from "./entity";

export function serializeUser(user: User): CleanUser {
    return {
        id: hashidService.users.encode(user.id),
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        avatarUrl: "http://localhost:3000/api/avatar/" + user.avatar,
        isEmailVerified: user.isEmailVerified,
        mfaEnabled: user.mfaEnabled,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
    };
}

export function serializePermissionHard(permission: Permission): string {
    return permission.name;
}
