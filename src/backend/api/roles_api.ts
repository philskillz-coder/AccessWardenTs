import { isValidRoleDescription, isValidRoleName } from "@shared/Validation";
import { AppDataSource } from "backend/database/data-source";
import { Permission, Role, RolePermission, User } from "backend/database/entity";
import { PagePermissions } from "backend/database/required-data";
import { serializePermissionNormal, serializeRoleVariantDef } from "backend/database/serializer";
import { CRequest } from "backend/express";
import hashidService from "backend/services/HashidService";
import { getUserPermissions, hasPermissionsFrom, PermIdComp, PermNameComp } from "backend/services/PermissionsService";
import { userTopPower } from "backend/services/RolesService";
import { Router } from "express";
import { ILike } from "typeorm";

import { ensureAuthenticated, parseNumber, requirePermissions, targetRoleValid, validateMfaToken } from "./tools";
const RolesRouter = Router();

RolesRouter.post("/mg/roles/create", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminCreateRole
), async (req: CRequest, res) => {
    if (!req.body.name) {
        res.status(400).json({
            status: "error",
            message: "Missing Data"
        });
        return;
    }

    const exists = await AppDataSource.getRepository(Role).exist({
        where: {
            name: req.body.name
        }
    });
    if (exists) {
        res.status(400).json({
            status: "error",
            message: "Name is already taken"
        });
        return;
    }

    const rName = req.body.name;
    if (!isValidRoleName(rName)) {
        res.status(400).json({
            status: "error",
            message: "Invalid name"
        });
        return;
    }

    const rDescription = req.body.description || null;
    if (!isValidRoleDescription(rDescription)) {
        res.status(400).json({
            status: "error",
            message: "Invalid description"
        });
        return;
    }

    const topPower = await userTopPower((<User>req.user).id);

    const requiresMfa = req.body.requiresMfa || false;
    const disabled = req.body.disabled || false;
    const isDefault = req.body.isDefault || false;
    const power = req.body.power || 0;
    if (power >= topPower) {
        res.status(400).json({
            status: "error",
            message: "Power is too high"
        });
        return;
    }

    const role = new Role();
    role.name = rName;
    role.description = rDescription;
    role.requiresMfa = requiresMfa;
    role.disabled = disabled;
    role.isDefault = isDefault;
    role.power = power;

    await AppDataSource.getRepository(Role).save(role);

    res.json({
        status: "success",
        message: "Role created",
        data: {
            role: serializeRoleVariantDef(role)
        }
    });
});

// TODO: sort
RolesRouter.post("/mg/roles/get", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminViewRoles
), async (req: CRequest, res) => {
    const page = parseNumber(req.body.page, 0);
    const count = parseNumber(req.body.count, 25);

    // all roles also disabled ones
    const roles = await AppDataSource.getRepository(Role).find({
        skip: page * count,
        take: count,
        order: {
            power: "DESC"
        }
    });

    res.json({
        status: "success",
        data: {
            roles: roles.map(serializeRoleVariantDef)
        }
    });
});

RolesRouter.post("/mg/roles/get-all-permissions", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminViewRoles
), targetRoleValid, async (req: CRequest, res) => {
    const roleId = hashidService.roles.decodeSingle(req.body.roleId);
    const role = await AppDataSource.getRepository(Role).findOne({
        where: {
            id: roleId
        },
        relations: ["rolePermissions", "rolePermissions.permission"]
    });

    if (!role) {
        res.status(400).json({
            status: "error",
            message: "Role not found"
        });
        return;
    }

    const allPermissions = await AppDataSource.getRepository(Permission).find();
    const permissions = allPermissions.map(perm => ({
        ...serializePermissionNormal(perm),
        hasPermission: role.rolePermissions.find(rp => rp.permission.id === perm.id)?.hasPermission ?? null
    }));

    // return all permissions that exist
    res.json({
        status: "success",
        data: {
            permissions: permissions
        }
    });
});

// TODO: sort
RolesRouter.post("/mg/roles/search", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminViewRoles
), async (req: CRequest, res) => {
    if (!req.body.search) {
        res.status(400).json({
            status: "error",
            message: "Missing Data"
        });
        return;
    }

    const search = "%" + req.body.search + "%";
    const page = parseNumber(req.body.page, 0);
    const count = parseNumber(req.body.count, 25);

    const roles = await AppDataSource.getRepository(Role).find({
        where: [
            {
                name: ILike(search)
            },
            {
                description: ILike(search)
            }
        ],
        skip: page * count,
        take: count,
        order: {
            name: "ASC",
            power: "DESC"
        }
    });

    res.json({
        status: "success",
        data: {
            roles: roles.map(serializeRoleVariantDef)
        }
    });
});

RolesRouter.post("/mg/roles/up-name", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminEditRoleName
), targetRoleValid, async (req: CRequest, res) => {
    if (!req.body.name) {
        res.status(400).json({
            status: "error",
            message: "Missing Data"
        });
        return;
    }
    const exists = await AppDataSource.getRepository(Role).exist({
        where: {
            name: req.body.name
        }
    });

    if (exists) {
        res.status(400).json({
            status: "error",
            message: "Name is already taken"
        });
        return;
    }

    const roleId = hashidService.roles.decodeSingle(req.body.roleId);
    const role = await AppDataSource.getRepository(Role).findOne({
        where: {
            id: roleId
        }
    });

    const requester = await AppDataSource.getRepository(User).findOne({
        where: {
            id: (<User>req.user).id
        },
        relations: ["roles"]
    });
    const topPower = Math.max(...requester.roles.map(role => role.power));
    if (topPower <= role.power) { // you can only edit roles with lower power
        res.status(400).json({
            status: "error",
            message: "You can't edit this role"
        });
        return;
    }

    if (!role) {
        res.status(400).json({
            status: "error",
            message: "Role not found"
        });
        return;
    }

    const rName = req.body.name;
    if (!isValidRoleName(rName)) {
        res.status(400).json({
            status: "error",
            message: "Invalid name"
        });
        return;
    }

    role.name = rName;
    await AppDataSource.getRepository(Role).save(role);
    res.json({
        status: "success",
        message: "Name updated"
    });
});

RolesRouter.post("/mg/roles/up-description", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminEditRoleDescription
), targetRoleValid, async (req: CRequest, res) => {
    if (req.body.description === undefined || req.body.description === null) {
        res.status(400).json({
            status: "error",
            message: "Missing Data"
        });
        return;
    }

    const roleId = hashidService.roles.decodeSingle(req.body.roleId);
    const role = await AppDataSource.getRepository(Role).findOne({
        where: {
            id: roleId
        }
    });

    const topPower = await userTopPower((<User>req.user).id);
    if (topPower <= role.power) { // you can only edit roles with lower power
        res.status(400).json({
            status: "error",
            message: "You can't edit this role"
        });
        return;
    }

    if (!role) {
        res.status(400).json({
            status: "error",
            message: "Role not found"
        });
        return;
    }

    const rDescription = req.body.description;
    if (!isValidRoleDescription(rDescription)) {
        res.status(400).json({
            status: "error",
            message: "Invalid description"
        });
        return;
    }

    role.description = rDescription;
    await AppDataSource.getRepository(Role).save(role);
    res.json({
        status: "success",
        message: "Description updated"
    });
});

RolesRouter.post("/mg/roles/up-power", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminEditRolePower
), targetRoleValid, async (req: CRequest, res) => {
    if (req.body.power === undefined || req.body.power === null) {
        res.status(400).json({
            status: "error",
            message: "Missing Data"
        });
        return;
    }

    const roleId = hashidService.roles.decodeSingle(req.body.roleId);
    const role = await AppDataSource.getRepository(Role).findOne({
        where: {
            id: roleId
        }
    });

    if (!role) {
        res.status(400).json({
            status: "error",
            message: "Role not found"
        });
        return;
    }

    const topPower = await userTopPower((<User>req.user).id);
    if (topPower <= role.power) { // you can only edit roles with lower power
        res.status(400).json({
            status: "error",
            message: "You can't edit this role"
        });
        return;
    }

    if (req.body.power >= topPower) { // you can only set powers less than your top power
        res.status(400).json({
            status: "error",
            message: "Power is too high"
        });
        return;
    }

    role.power = req.body.power;
    await AppDataSource.getRepository(Role).save(role);
    res.json({
        status: "success",
        message: "Power updated"
    });
});

RolesRouter.post("/mg/roles/toggle-default", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminEditRoleDefault
), targetRoleValid, async (req: CRequest, res) => {
    const roleId = hashidService.roles.decodeSingle(req.body.roleId);
    const role = await AppDataSource.getRepository(Role).findOne({
        where: {
            id: roleId
        }
    });

    if (!role) {
        res.status(400).json({
            status: "error",
            message: "Role not found"
        });
        return;
    }

    const topPower = await userTopPower((<User>req.user).id);
    if (topPower <= role.power) { // you can only edit roles with lower power
        res.status(400).json({
            status: "error",
            message: "You can't edit this role"
        });
        return;
    }

    role.isDefault = !role.isDefault;
    await AppDataSource.getRepository(Role).save(role);
    res.json({
        status: "success",
        message: `${role.isDefault ? "Set" : "Unset"} role default`
    });
});

RolesRouter.post("/mg/roles/toggle-mfa", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminEditRoleMfa
), targetRoleValid, validateMfaToken, async (req: CRequest, res) => {
    const roleId = hashidService.roles.decodeSingle(req.body.roleId);
    const role = await AppDataSource.getRepository(Role).findOne({
        where: {
            id: roleId
        }
    });

    if (!role) {
        res.status(400).json({
            status: "error",
            message: "Role not found"
        });
        return;
    }

    const topPower = await userTopPower((<User>req.user).id);
    if (topPower <= role.power) { // you can only edit roles with lower power
        res.status(400).json({
            status: "error",
            message: "You can't edit this role"
        });
        return;
    }

    role.requiresMfa = !role.requiresMfa;
    await AppDataSource.getRepository(Role).save(role);
    res.json({
        status: "success",
        message: `${role.requiresMfa ? "Set" : "Unset"} mfa required`
    });
});


RolesRouter.post("/mg/roles/toggle-disable", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminEditRoleDisable
), targetRoleValid, async (req: CRequest, res) => {
    const roleId = hashidService.roles.decodeSingle(req.body.roleId);
    const role = await AppDataSource.getRepository(Role).findOne({
        where: {
            id: roleId
        }
    });

    if (!role) {
        res.status(400).json({
            status: "error",
            message: "Role not found"
        });
        return;
    }

    const topPower = await userTopPower((<User>req.user).id);
    if (topPower <= role.power) { // you can only edit roles with lower power
        res.status(400).json({
            status: "error",
            message: "You can't edit this role"
        });
        return;
    }

    role.disabled = !role.disabled;
    res.json({
        status: "success",
        message: `Role ${role.disabled ? "disabled" : "enabled"}`
    });
});

RolesRouter.post("/mg/roles/up-permissions", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminEditRolePermissions
), targetRoleValid, async (req: CRequest, res) => {
    if (!req.body.permissions) {
        res.status(400).json({
            status: "error",
            message: "Missing Data"
        });
        return;
    }

    // TODO: refactor (too lazy to do it now)
    // TODO: check if this works
    const roleId = hashidService.roles.decodeSingle(req.body.roleId);
    const role = await AppDataSource.getRepository(Role).findOne({
        where: {
            id: roleId
        },
        relations: ["rolePermissions", "rolePermissions.permission"]
    });

    if (!role) {
        res.status(400).json({
            status: "error",
            message: "Role not found"
        });
        return;
    }

    const requester = <User>req.user;
    const topPower = await userTopPower(requester.id);
    if (topPower <= role.power) { // you can only edit roles with lower power
        res.status(400).json({
            status: "error",
            message: "You can't edit this role"
        });
        return;
    }

    const requesterPermissions = await getUserPermissions(requester.id);

    const editedPermissions: {id: number, hasPermission: boolean | null}[] = req.body.permissions.map(perm => ({
        ...perm,
        id: hashidService.permissions.decodeSingle(perm.id)
    })).filter(perm =>
        perm.id !== null
        && perm.hasPermission !== undefined
        && hasPermissionsFrom(requesterPermissions, PermIdComp, perm.id) // should also exclude perms that not exist
    );
    console.log("Edited Permissions", editedPermissions);

    const allPerms = await AppDataSource.getRepository(Permission).find();
    console.log("All Permissions", allPerms.map(serializePermissionNormal));
    const newPerms: RolePermission[] = [];

    allPerms.forEach(perm => {
        const editedPerm = editedPermissions.find(ePerm => ePerm.id === perm.id);

        if (editedPerm !== undefined) {
            // permission edited
            const existingRolePerm = role.rolePermissions.find(rp => rp.permission.id === perm.id);
            if (existingRolePerm !== undefined) {
                console.log("Existing Role Perm", existingRolePerm);

                if (editedPerm.hasPermission === null) {
                    // dont add to new perms because null means remove
                    console.log("Permission Removed");
                } else {
                    newPerms.push({
                        ...existingRolePerm,
                        hasPermission: editedPerm.hasPermission
                    });
                    console.log("Permission Updated");
                }
            } else {
                console.log("Permission not already existing in role");
                if (editedPerm.hasPermission === null) {
                    // dont add to new perms because null means remove
                    console.log("Permission Removed");
                } else {
                    const rolePerm = new RolePermission();
                    rolePerm.role = role;
                    rolePerm.permission = perm;
                    rolePerm.hasPermission = editedPerm.hasPermission;

                    newPerms.push(rolePerm);
                    console.log("Permission Added", rolePerm);
                }
            }
        } else {
            // permission not edited
            const rolePerm = role.rolePermissions.find(rp => rp.permission.id === perm.id);
            if (rolePerm === undefined) {
                console.log("Role does not have permission", perm.name);
            } else {
                console.log("Role Perm", rolePerm);
                newPerms.push(rolePerm);
            }
        }
    });

    role.rolePermissions = newPerms;
    role.rolePermissions.forEach(rp => rp.role = role);

    console.log("new perms", newPerms);
    console.log("role perms", role.rolePermissions);
    await AppDataSource.getRepository(Role).save(role);
    res.json({
        status: "success",
        message: "Permissions updated"
    });
    const __role = await AppDataSource.getRepository(Role).findOne({
        where: {
            id: roleId
        },
        relations: ["rolePermissions", "rolePermissions.permission", "rolePermissions.role"]
    });
    console.log("actual permissions", __role.rolePermissions);
});

RolesRouter.post("/mg/roles/delete", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminEditRoleDelete
), targetRoleValid, async (req: CRequest, res) => {
    const roleId = hashidService.roles.decodeSingle(req.body.roleId);
    const role = await AppDataSource.getRepository(Role).findOne({
        where: {
            id: roleId
        }
    });

    if (!role) {
        res.status(400).json({
            status: "error",
            message: "Role not found"
        });
        return;
    }

    const topPower = await userTopPower((<User>req.user).id);
    if (topPower <= role.power) { // you can only edit roles with lower power
        res.status(400).json({
            status: "error",
            message: "You can't delete this role"
        });
        return;
    }

    await AppDataSource.getRepository(Role).remove(role);
    res.json({
        status: "success",
        message: "Role deleted"
    });
});


export default RolesRouter;
