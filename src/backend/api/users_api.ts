import Hashing from "@shared/Hashing";
import logger from "@shared/Logger";
import { isValidEmail } from "@shared/Mail";
import { AppDataSource } from "backend/database/data-source";
import { Role, User } from "backend/database/entity";
import { PagePermissions } from "backend/database/required-data";
import { serializeUser, serializeUserWithPerms } from "backend/database/serializer";
import { CRequest } from "backend/express";
import hashidService from "backend/services/HashidService";
import { PermNameComp } from "backend/services/PermissionsService";
import dotenv from "dotenv";
import { Router } from "express";
import { ILike } from "typeorm";

import { ensureAuthenticated, parseNumber, requirePermissions, targetUserNotAdmin, targetUserValid, validateMfaToken } from "./tools";

dotenv.config();

const UsersRouter = Router();

UsersRouter.post("/mg/users/login-as", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminLoginAs
), targetUserNotAdmin, async (req: CRequest, res) => {
    const user: User = <User>req.user;

    if (!req.body.userId) {
        res.status(400).json({
            status: "error",
            message: "Missing Data"
        });
        return;
    }

    const userId = hashidService.users.decodeSingle(req.body.userId);
    const targetUser = await AppDataSource.getRepository(User).findOne({
        where: {
            id: userId
        }
    });

    if (!targetUser) {
        res.status(400).json({
            status: "error",
            message: "User not found"
        });
    }

    req.logIn(targetUser, async loginErr => {
        if (loginErr) {
            logger.error(`Error logging in user ${user.username}: ${loginErr}`);
            // Handle error, e.g., return a JSON response with an error message
            return res.status(500).json({ status: "error", message: "Internal Server Error" });
        }

        // Return a JSON response indicating successful login
        res.status(200).json({
            status: "success",
            message: "User logged in successfully",
            data: { user: serializeUserWithPerms(targetUser) }
        });
    });
});

UsersRouter.post("/mg/users/get", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminViewUsers
), async (req: CRequest, res) => {
    // TODO: add order by
    const page = parseNumber(req.body.page, 0);
    const count = parseNumber(req.body.count, 25);

    const users = await AppDataSource.getRepository(User).find({
        skip: page * count,
        take: count,
        order: {
            username: "ASC",
            updatedAt: "DESC"
        }
    });

    res.json({
        status: "success",
        data: {
            users: users.map(user => serializeUser(user))
        }
    });
});

UsersRouter.post("/mg/users/get-all-roles", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminViewUsers
), targetUserValid, async (req: CRequest, res) => {
    const userId = hashidService.users.decodeSingle(req.body.userId);
    const user = await AppDataSource.getRepository(User).findOne({
        where: {
            id: userId
        },
        relations: ["roles"]
    });

    if (!user) {
        res.status(400).json({
            status: "error",
            message: "User not found"
        });
        return;
    }

    // required for returning all roles no matter if the user has them or not
    const roles = await AppDataSource.getRepository(Role).find(
        {
            relations: ["rolePermissions", "rolePermissions.permission"],
            order: {
                power: "DESC",
                name: "ASC"
            }
        }
    );

    const userRoles = roles.map(role => ({
        id: hashidService.roles.encode(role.id),
        name: role.name,
        has: user.roles.some(userRole => userRole.id === role.id)
    }));

    res.json({
        status: "success",
        data: {
            roles: userRoles
        }
    });
});

UsersRouter.post("/mg/users/search", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminViewUsers
), async (req: CRequest, res) => {
    // FIXME: update all checks like this to undefined because when 0 or false will error
    if (req.body.search === undefined) {
        res.status(400).json({
            status: "error",
            message: "Missing Data"
        });
        return;
    }

    const search = "%" + req.body.search + "%";
    const page = Number.parseInt(req.body.page, 0);
    const count = Number.parseInt(req.body.count, 25);

    const users = await AppDataSource.getRepository(User).find({
        where: [
            {
                username: ILike(search)
            },
            {
                email: ILike(search)
            }
        ],
        skip: page * count,
        take: count,
        order: {
            username: "ASC",
            updatedAt: "DESC"
        }
    });

    res.json({
        status: "success",
        data: {
            users: users.map(user => serializeUser(user))
        }
    });
});

UsersRouter.post("/mg/users/up-username", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminEditUserUsername
), targetUserNotAdmin, async (req: CRequest, res) => {
    if (req.body.username === undefined) {
        res.status(400).json({
            status: "error",
            message: "Missing Data"
        });
        return;
    }

    // no username validation because the admin can set any username
    const exists = await AppDataSource.getRepository(User).exist({
        where: {
            username: req.body.username
        }
    });
    if (exists) {
        res.status(400).json({
            status: "error",
            message: "Username is already taken"
        });
        return;
    }

    const userId = hashidService.users.decodeSingle(req.body.userId);
    const user = await AppDataSource.getRepository(User).findOne({
        where: {
            id: userId
        }
    });

    if (!user) {
        res.status(400).json({
            status: "error",
            message: "User not found"
        });
        return;
    }

    user.username = req.body.username;
    await AppDataSource.getRepository(User).save(user);
    res.json({
        status: "success",
        message: "Username updated"
    });
});

UsersRouter.post("/mg/users/up-email", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminEditUserEmail
), targetUserNotAdmin, async (req: CRequest, res) => {
    if (req.body.email === undefined) {
        res.status(400).json({
            status: "error",
            message: "Missing Data"
        });
        return;
    }

    if (!isValidEmail(req.body.email)) {
        res.status(400).json({
            status: "error",
            message: "Invalid Email"
        });
        return;
    }
    const exists = await AppDataSource.getRepository(User).exist({
        where: {
            email: req.body.email
        }
    });
    if (exists) {
        res.status(400).json({
            status: "error",
            message: "Email is already taken"
        });
        return;
    }

    const userId = hashidService.users.decodeSingle(req.body.userId);
    const user = await AppDataSource.getRepository(User).findOne({
        where: {
            id: userId
        }
    });

    if (!user) {
        res.status(400).json({
            status: "error",
            message: "User not found"
        });
        return;
    }

    user.email = req.body.email;
    await AppDataSource.getRepository(User).save(user);
    res.json({
        status: "success",
        message: "Email updated"
    });
});

UsersRouter.post("/mg/users/up-password", ensureAuthenticated, validateMfaToken, requirePermissions(
    PermNameComp, PagePermissions.AdminEditUserPassword
), targetUserNotAdmin,
async (req: CRequest, res) => {
    const userId = hashidService.users.decodeSingle(req.body.userId);
    const user = await AppDataSource.getRepository(User).findOne({
        where: {
            id: userId
        }
    });

    if (!user) {
        res.status(400).json({
            status: "error",
            message: "User not found"
        });
        return;
    }

    // no password validation and verification because the admin can set any password
    const salt = Hashing.generateSalt();
    const passwordHash = Hashing.createHash(req.body.password, salt, process.env.HASH_PEPPER);
    user.passwordHash = passwordHash;
    user.passwordSalt = salt;
    await AppDataSource.getRepository(User).save(user);
    res.json({
        status: "success",
        message: "Password updated"
    });
});

UsersRouter.post("/mg/users/up-roles", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminEditUserRoles
), targetUserNotAdmin, async (req: CRequest, res) => {
    if (!req.body.roles) {
        res.status(400).json({
            status: "error",
            message: "Missing Data"
        });
        return;
    }

    const userId = hashidService.users.decodeSingle(req.body.userId);
    const user = await AppDataSource.getRepository(User).findOne({
        where: {
            id: userId
        },
        relations: ["roles"]
    });
    const requester = await AppDataSource.getRepository(User).findOne({
        where: {
            id: (<User>req.user).id
        },
        relations: ["roles"]
    });

    if (!user) {
        res.status(400).json({
            status: "error",
            message: "User not found"
        });
        return;
    }

    const editedRoles: {id: number, has: boolean}[] = req.body.roles.map(role => ({
        ...role,
        id: hashidService.roles.decodeSingle(role.id)
    }));

    const allRoles = await AppDataSource.getRepository(Role).find();
    const newRoles = [];

    // TODO: check if this works
    const requesterTopPower = Math.max(...requester.roles.map(role => role.power));

    allRoles.forEach(role => {
        const editedRole = editedRoles.find(r => r.id === role.id);

        if (editedRole !== undefined && role.power < requesterTopPower) { // if the role has fewer power than the users top role: allow
            newRoles.push({...role, has: editedRole.has});
        } else {
            const _role = user.roles.find(r => r.id === role.id);
            if (_role) {
                newRoles.push(role);
            }
        }
    });

    user.roles = newRoles;
    await AppDataSource.getRepository(User).save(user);
    res.json({
        status: "success",
        message: "Roles updated"
    });
});

UsersRouter.post("/mg/users/delete", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminEditUserDelete
), targetUserNotAdmin, async (req: CRequest, res) => {
    const userId = hashidService.users.decodeSingle(req.body.userId);
    const _req = <User>req.user;

    if (userId === _req.id) {
        res.status(400).json({
            status: "error",
            message: "You can not delete yourself"
        });
        return;
    }

    const user = await AppDataSource.getRepository(User).findOne({
        where: {
            id: userId
        },
        relations: ["roles"]
    });
    if (!user) {
        res.status(400).json({
            status: "error",
            message: "User not found"
        });
        return;
    }

    const requester = await AppDataSource.getRepository(User).findOne({
        where: {
            id: _req.id
        },
        relations: ["roles"]
    });


    // you can only delete users with a top role that has less power than your top role
    const requesterTopPower = Math.max(...requester.roles.map(role => role.power));
    const userTopPower = Math.max(...user.roles.map(role => role.power));
    if (requesterTopPower <= userTopPower) {
        res.status(400).json({
            status: "error",
            message: "You can not delete this user"
        });
        return;
    }

    await AppDataSource.getRepository(User).remove(user);
    res.json({
        status: "success",
        message: "User deleted"
    });
});

export default UsersRouter;
