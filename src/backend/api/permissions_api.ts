import { AppDataSource } from "backend/database/data-source";
import { Permission, User } from "backend/database/entity";
import { PagePermissions } from "backend/database/required-data";
import { serializePermissionVariantDef, serializeRoleNormal } from "backend/database/serializer";
import { CRequest } from "backend/express";
import hashidService from "backend/services/HashidService";
import { hasPermissions, PermIdComp, PermNameComp } from "backend/services/PermissionsService";
import dotenv from "dotenv";
import { Router } from "express";
import { ILike } from "typeorm";

import { ensureAuthenticated, parseNumber, requirePermissions, targetPermissionValid } from "./tools";

dotenv.config();

const PermissionsRouter = Router();

// TODO: new role, permssion, user endpoints + frontend
// TODO: check if all endpoints work
// TODO: not a robot check when register, login
// TODO: role/permission description edit+backend

PermissionsRouter.post("/mg/permissions/get", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminViewPermissions
), async (req: CRequest, res) => {
    const page = parseNumber(req.body.page, 0);
    const count = parseNumber(req.body.count, 25);

    const permissions = await AppDataSource.getRepository(Permission).find({
        skip: page * count,
        take: count,
        order: {
            name: "ASC"
        }
    });

    res.json({
        status: "success",
        data: {
            permissions: permissions.map(perm => serializePermissionVariantDef(perm))
        }
    });
});

PermissionsRouter.post("/mg/permissions/get-all-roles", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminViewPermissions
),  targetPermissionValid, async (req: CRequest, res) => {
    const permissionId = hashidService.permissions.decodeSingle(req.body.permissionId);
    const permission = await AppDataSource.getRepository(Permission).findOne({
        where: {
            id: permissionId
        },
        relations: ["rolePermissions", "rolePermissions.role"]
    });

    if (!permission) {
        res.status(400).json({
            status: "error",
            message: "Permission not found"
        });
        return;
    }

    res.json({
        status: "success",
        data: {
            // TODO: create serializer + type
            roles: permission.rolePermissions.map(rp => serializeRoleNormal(rp.role))
        }
    });
});

PermissionsRouter.post("/mg/permissions/search", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminViewPermissions
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

    const permissions = await AppDataSource.getRepository(Permission).find({
        where: [
            {
                name: ILike(search)
            }
        ],
        skip: page * count,
        take: count,
        order: {
            name: "ASC"
        }
    });

    res.json({
        status: "success",
        data: {
            // todo: use normal serializer
            permissions: permissions.map(serializePermissionVariantDef)
        }
    });
});

PermissionsRouter.post("/mg/permission/up-name", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminEditPermissionName
), targetPermissionValid, async (req: CRequest, res) => {
    const exists = await AppDataSource.getRepository(Permission).exist({
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

    const permissionId = hashidService.permissions.decodeSingle(req.body.permissionId);
    const permission = await AppDataSource.getRepository(Permission).findOne({
        where: {
            id: permissionId
        }
    });

    if (!permission) {
        res.status(400).json({
            status: "error",
            message: "Permission not found"
        });
        return;
    }

    const user = <User>req.user;
    if (!await hasPermissions(user.id, PermIdComp, permissionId)) {
        res.status(400).json({
            status: "error",
            message: "You don't have permission have this permission"
        });
        return;
    }

    permission.name = req.body.name;
    await AppDataSource.getRepository(Permission).save(permission);
    res.json({
        status: "success",
        message: "Name updated"
    });
});

PermissionsRouter.post("/mg/permissions/delete", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminEditPermissionDelete
), targetPermissionValid, async (req: CRequest, res) => {
    const permissionId = hashidService.permissions.decodeSingle(req.body.permissionId);
    const permission = await AppDataSource.getRepository(Permission).findOne({
        where: {
            id: permissionId
        }
    });
    if (!permission) {
        res.status(400).json({
            status: "error",
            message: "Permission not found"
        });
        return;
    }

    const user = <User>req.user;
    if (!await hasPermissions(user.id, PermIdComp, permissionId)) {
        res.status(400).json({
            status: "error",
            message: "You don't have permission have this permission"
        });
        return;
    }

    await AppDataSource.getRepository(Permission).remove(permission);
    res.json({
        status: "success",
        message: "Permission deleted"
    });
});

export default PermissionsRouter;
