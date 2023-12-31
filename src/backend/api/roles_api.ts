import { AppDataSource } from "backend/database/data-source";
import { Permission, Role, User } from "backend/database/entity";
import { PagePermissions } from "backend/database/required-data";
import { serializePermissionHard, serializeRole } from "backend/database/serializer";
import { CRequest } from "backend/express";
import hashidService from "backend/services/HashidService";
import { getUserPermissions, hasPermissionsFrom, PermIdComp, PermNameComp } from "backend/services/PermissionsService";
import { Router } from "express";
import { ILike } from "typeorm";

import { ensureAuthenticated, parseNumber, requirePermissions, targetRoleValid } from "./tools";
const RolesRouter = Router();

RolesRouter.post("/mg/roles/get", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminViewRoles
), async (req: CRequest, res) => {
    const page = parseNumber(req.body.page, 0);
    const count = parseNumber(req.body.count, 25);

    const roles = await AppDataSource.getRepository(Role).find({
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
            roles: roles.map(role => serializeRole(role))
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

    res.json({
        status: "success",
        data: {
            roles: role.rolePermissions.map(rolePerm => serializePermissionHard(rolePerm.permission))
        }
    });
});
// TODO: all return types should have typehinting (interfaces)

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
            roles: roles.map(role => serializeRole(role))
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

    role.name = req.body.name;
    await AppDataSource.getRepository(Role).save(role);
    res.json({
        status: "success",
        message: "Name updated"
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

    const _requester: User = <User>req.user;
    const requester = await AppDataSource.getRepository(User).findOne({
        where: {
            id: _requester.id
        },
        relations: ["roles"]
    });

    const requesterTopPower = Math.max(...requester.roles.map(role => role.power));
    if (requesterTopPower <= role.power) { // you can only edit roles with lower power
        res.status(400).json({
            status: "error",
            message: "You can't edit this role"
        });
        return;
    }

    const requesterPermissions = await getUserPermissions(requester.id);

    const editedPermissions: {id: number, has: boolean | null}[] = req.body.permissions.map(perm => ({
        ...perm,
        id: hashidService.permissions.decodeSingle(perm.id)
    })).filter(perm => perm.id !== null && hasPermissionsFrom(requesterPermissions, PermIdComp, perm.id));

    const allPerms = await AppDataSource.getRepository(Permission).find();
    const newPerms = [];

    allPerms.forEach(perm => {
        // user supplied edit and has permission
        const editedPerm = editedPermissions.find(p => p.id === perm.id);

        if (editedPerm !== undefined) {
            newPerms.push({...perm, has: editedPerm.has});
        } else {
            // permission not edited
            const _perm = perm.rolePermissions.find(rp => rp.permission.id === perm.id);
            if (_perm) {
                newPerms.push(perm);
            }
        }
    });

    // TODO: respond with the actual permissions
    role.rolePermissions = newPerms;
    await AppDataSource.getRepository(Role).save(role);
    res.json({
        status: "success",
        message: "Permissions updated"
    });
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

    await AppDataSource.getRepository(Role).remove(role);
    res.json({
        status: "success",
        message: "Role deleted"
    });
});


export default RolesRouter;
