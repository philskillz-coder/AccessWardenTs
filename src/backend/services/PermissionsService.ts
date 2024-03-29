import logger from "@shared/Logger";
import { AppDataSource } from "backend/database/data-source";
import { Permission, RolePermission, User } from "backend/database/entity";

import cacheService from "./CacheService";
import hashidService from "./HashidService";

export async function getUserPermissions(userId: number): Promise<Permission[]> {
    try {
        // check if the permissions are cached
        const cachedPermissions = await cacheService.get(`user-permissions-${userId}`);
        if (cachedPermissions) {
            return cachedPermissions;
        }

        // When here: permissions are not cached
        // Find the user with roles and rolePermissions
        const user = await AppDataSource.getRepository(User).findOne({
            where: {
                id: userId,
                roles: {
                    disabled: false
                }
            },
            relations: ["roles", "roles.rolePermissions", "roles.rolePermissions.role", "roles.rolePermissions.permission"],
        });

        if (!user) {
            return [];
        }

        if (user.isAdmin) {
            const permissions = (await AppDataSource.getRepository(Permission).find()).map(p => ({ ...p }));
            return permissions;
        }

        // Create a map to store the permissions with their corresponding status
        const userPermissions: Map<RolePermission, boolean> = new Map();

        // Iterate through user roles
        user.roles
            .filter(role => !role.requiresMfa || user.mfaEnabled) // filter roles out that require mfa if the user disabled mfa
            .forEach(role => {
                role.rolePermissions
                    .sort((a, b) => b.role.power - a.role.power) // sort the rolePermissions by power
                    .forEach(rolePermission => {
                        // check if the permission is not already in the map
                        if (![...userPermissions.keys()].find(rp => rp.permission.id === rolePermission.permission.id)) {
                            userPermissions.set(rolePermission, rolePermission.hasPermission);
                        }
                    });
            });

        const permissions: Permission[] = Array.from(userPermissions.keys()).filter(rp => rp.hasPermission).map(permission => ({
            ...permission.permission
        }));

        await cacheService.set(`user-permissions-${userId}`, permissions);

        return permissions;
    } catch (error) {
        logger.error("Error fetching user permissions:", error);
        throw error;
    }
}

export const PermNameComp = (p: Permission): string => {
    return p.name;
};
export const PermIdComp = (p: Permission): number => {
    return p.id;
};
export const PerRIdComp = (p: Permission): string => {
    return hashidService.permissions.encode(p.id);
};

// eslint-disable-next-line no-unused-vars
export async function hasPermissions<T>(userId: number, comp: (perm: Permission) => T, ...requiredPermissions: T[]): Promise<boolean> {
    const userPermissions = await getUserPermissions(userId);
    const hasPermissions = requiredPermissions.every(reqP => userPermissions.find(up => comp(up) === reqP));
    return hasPermissions;
}

// eslint-disable-next-line no-unused-vars
export function hasPermissionsFrom<T>(userPermissions: Permission[], comp: (perm: Permission) => T, ...requiredPermissions: T[]): boolean {
    const hasPermissions = requiredPermissions.every(reqP => userPermissions.find(up => comp(up) === reqP));
    return hasPermissions;
}
