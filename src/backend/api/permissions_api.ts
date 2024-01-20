import { isValidPermissionDescription, isValidPermissionName } from "@shared/Validation";
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

PermissionsRouter.post("/mg/permissions/create", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminCreatePermission
), async (req: CRequest, res) => {
    if (!req.body.name) {
        res.status(400).json({
            status: "error",
            message: "Missing Data"
        });
        return;
    }

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

    const pName = req.body.name;
    if (!isValidPermissionName(pName)) {
        res.status(400).json({
            status: "error",
            message: "Invalid name"
        });
        return;
    }

    const pDescription = req.body.description || null;
    if (!isValidPermissionDescription(pDescription)) {
        res.status(400).json({
            status: "error",
            message: "Invalid description"
        });
        return;
    }

    const permission = new Permission();
    permission.name = pName;
    permission.description = pDescription;

    await AppDataSource.getRepository(Permission).save(permission);

    res.json({
        status: "success",
        message: "Permission created",
        data: {
            permission: serializePermissionVariantDef(permission)
        }
    });
});

// TODO: sort
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
            roles: permission.rolePermissions.map(rp => serializeRoleNormal(rp.role))
        }
    });
});


// TODO: sort
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

    const pName = req.body.name;
    if (!isValidPermissionName(pName)) {
        res.status(400).json({
            status: "error",
            message: "Invalid name"
        });
        return;
    }

    permission.name = pName;
    await AppDataSource.getRepository(Permission).save(permission);
    res.json({
        status: "success",
        message: "Name updated"
    });
});

PermissionsRouter.post("/mg/permission/up-description", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminEditPermissionDescription
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

    const pDescription = req.body.description || null;
    if (!isValidPermissionDescription(pDescription)) {
        res.status(400).json({
            status: "error",
            message: "Invalid description"
        });
        return;
    }

    permission.description = pDescription;
    await AppDataSource.getRepository(Permission).save(permission);
    res.json({
        status: "success",
        message: "Description updated"
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
