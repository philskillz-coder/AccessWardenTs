import { Router } from "express";
const RolesRouter = Router();

RolesRouter.post("/mg/roles/get", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminViewRoles
), async (req: CRequest, res) => {
    const page = Number.parseInt(req.body.page) || 0;
    const count = Number.parseInt(req.body.count) || 25;

    const roles = await AppDataSource.getRepository(Role).find({
        skip: page * count,
        take: count,
        order: {
            id: "ASC" // TODO: Sort all by name then power
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
), async (req: CRequest, res) => {
    const roleId = Number(hashidService.roles.decode(req.body.roleId)[0]);
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

RolesRouter.post("/mg/roles/search", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminViewRoles
), async (req: CRequest, res) => {
    const search = "%" + req.body.search + "%";
    const page = Number.parseInt(req.body.page) || 0;
    const count = Number.parseInt(req.body.count) || 25;
    // TODO: case insensitive search
    const roles = await AppDataSource.getRepository(Role).find({
        where: [
            {
                name: Like(search)
            },
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
            roles: roles.map(role => serializeRole(role))
        }
    });
});

RolesRouter.post("/mg/roles/up-name",
    ensureAuthenticated,
    requirePermissions(
        PermNameComp, PagePermissions.AdminEditRoleName
    ),
    targetUserNotAdmin,
    async (req: CRequest, res) => {
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

        const roleId = Number(hashidService.roles.decode(req.body.roleId)[0]);
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

        role.name = req.body.name;
        await AppDataSource.getRepository(Role).save(role);
        res.json({
            status: "success",
            message: "Name updated"
        });
    }
);

RolesRouter.post("/mg/roles/up-permissions", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminEditRolePermissions
), targetUserNotAdmin, async (req: CRequest, res) => {
    const user: User = <User>req.user;
    if (!req.body.permissions) {
        res.status(400).json({
            status: "error",
            message: "Missing Data"
        });
        return;
    }

    const roleId = Number(hashidService.roles.decode(req.body.roleId)[0]);
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

    const editedPermissions: {id: number, has: boolean | null}[] = req.body.permissions.map(perm => ({
        ...perm,
        id: Number(hashidService.permissions.decode(perm.id)[0])
    }));

    const allPerms = await AppDataSource.getRepository(Permission).find();
    console.log(allPerms);
    const newPerms = [];

    // TODO: check if this works

    allPerms.forEach(perm => {
        const editedPerm = editedPermissions.find(p => p.id === perm.id);
        if (editedPerm !== undefined && hasPermissions(user.id, p => p.id, editedPerm.id)) {
            newPerms.push({...perm, has: editedPerm.has});
        } else {
            // if role has permission
            const _perm = perm.rolePermissions.find(rp => rp.permission.id === perm.id);
            if (_perm) {
                newPerms.push(perm);
            }
        }
    });

    role.rolePermissions = newPerms;
    await AppDataSource.getRepository(Role).save(role);
    res.json({
        status: "success",
        message: "Permissions updated"
    });
});

RolesRouter.post("/mg/roles/delete", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminEditRoleDelete
), targetUserNotAdmin, async (req: CRequest, res) => {
    const roleId = Number(hashidService.roles.decode(req.body.roleId)[0]);
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
