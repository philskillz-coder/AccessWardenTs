import { IdBase, PermissionNormal, PermissionVariantDef, RoleNormal, RolePermissionNormal, RoleVariantDef, UserNormal, UserVariantDef, UserVariantP, UserVariantR } from "@typings";
import hashidService from "backend/services/HashidService";

import { Permission, Role, RolePermission, User } from "./entity";

export function serializeUserBase(user: User): IdBase {
    return {
        id: hashidService.users.encode(user.id),
    };
}
export function serializePermissionBase(permission: Permission): IdBase {
    return {
        id: hashidService.permissions.encode(permission.id),
    };
}
export function serializeRoleBase(role: Role): IdBase {
    return {
        id: hashidService.roles.encode(role.id),
    };
}

export function serializeUserNormal(user: User) : UserNormal {
    return {
        id: hashidService.users.encode(user.id),
        username: user.username,
    };
}
export function serializePermissionNormal(permission: Permission) : PermissionNormal {
    return {
        id: hashidService.permissions.encode(permission.id),
        name: permission.name,
    };
}
export function serializeRolePermissionNormal(rolePermission: RolePermission) : RolePermissionNormal {
    return {
        id: hashidService.permissions.encode(rolePermission.permission.id),
        name: rolePermission.permission.name,
        hasPermission: rolePermission.hasPermission
    };
}
export function serializeRoleNormal(role: Role) : RoleNormal {
    return {
        id: hashidService.roles.encode(role.id),
        name: role.name,
    };
}

export function serializeUserVariantDef(user: User) : UserVariantDef {
    return {
        id: hashidService.users.encode(user.id),
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
        mfaEnabled: user.mfaEnabled,
        createdAt: user.createdAt.getTime(),
        updatedAt: user.updatedAt.getTime(),
        suspended: user.suspended
    };
}
export function serializePermissionVariantDef(permission: Permission) : PermissionVariantDef {
    return {
        id: hashidService.permissions.encode(permission.id),
        name: permission.name,
        description: permission.description,
        createdAt: permission.createdAt.getTime(),
        updatedAt: permission.updatedAt.getTime()
    };
}
export function serializeRoleVariantDef(role: Role) : RoleVariantDef {
    return {
        id: hashidService.roles.encode(role.id),
        name: role.name,
        description: role.description,
        disabled: role.disabled,
        requiresMfa: role.requiresMfa,
        power: role.power,
        isDefault: role.isDefault,
        createdAt: role.createdAt.getTime(),
        updatedAt: role.updatedAt.getTime()
    };
}

export function serializeUserVariantPerms(user: User, perms: Permission[]): UserVariantP {
    return {
        id: hashidService.users.encode(user.id),
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
        mfaEnabled: user.mfaEnabled,
        createdAt: user.createdAt.getTime(),
        updatedAt: user.updatedAt.getTime(),
        permissions: perms.map(serializePermissionNormal),
        suspended: user.suspended
    };
}
export function serializeUserVariantRoles(user: User, roles: Role[]): UserVariantR {
    return {
        id: hashidService.users.encode(user.id),
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
        mfaEnabled: user.mfaEnabled,
        createdAt: user.createdAt.getTime(),
        updatedAt: user.updatedAt.getTime(),
        roles: roles.map(serializeRoleNormal),
        suspended: user.suspended
    };
}
