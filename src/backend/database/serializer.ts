import { CleanPermission,CleanRole,CleanUser } from "@typings";
import hashidService from "backend/services/HashidService";
import { getUserPermissions } from "backend/services/PermissionsService";

import { Permission, Role, User } from "./entity";

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
        permissions: []
    };
}

export async function serializeUserWithPerms(user: User): Promise<CleanUser> {
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
        permissions: (await getUserPermissions(user.id)).map(serializePermissionHard)
    };
}

export function serializePermission(permission: Permission): CleanPermission {
    return {
        id: hashidService.permissions.encode(permission.id),
        name: permission.name,
        // createdAt: permission.createdAt.toISOString(),
        // updatedAt: permission.updatedAt.toISOString()
    };
}

export function serializePermissionHard(permission: Permission): string {
    return permission.name;
}

export function serializeRole(role: Role): CleanRole {
    return {
        id: hashidService.roles.encode(role.id),
        name: role.name,
    };
}
