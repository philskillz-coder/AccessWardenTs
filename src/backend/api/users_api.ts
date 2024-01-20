import Hashing from "@shared/Hashing";
import logger from "@shared/Logger";
import { isValidEmail, isValidPassword, isValidUsername } from "@shared/Validation";
import { UserVariantAuth } from "@typings";
import { AppDataSource } from "backend/database/data-source";
import { Role, User } from "backend/database/entity";
import { PagePermissions } from "backend/database/required-data";
import { serializeRoleNormal, serializeUserVariantDef, serializeUserVariantPerms } from "backend/database/serializer";
import { CRequest } from "backend/express";
import hashidService from "backend/services/HashidService";
import { getUserPermissions, PermNameComp } from "backend/services/PermissionsService";
import { userTopPower } from "backend/services/RolesService";
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

        const serialized = serializeUserVariantPerms(targetUser, await getUserPermissions(user.id));
        const mfaRecommended = user.roles.map(role => !role.requiresMfa || user.mfaEnabled).some(v => !v);

        res.status(200).json({
            status: "success",
            message: "User logged in successfully",
            data: {
                user: <UserVariantAuth>{
                    ...serialized,
                    mfaSuggested: mfaRecommended
                }
            }
        });
    });
});

// TODO: sort
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
            users: users.map(serializeUserVariantDef)
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
    const roles = await AppDataSource.getRepository(Role).find({
        order: {
            power: "DESC",
            // name: "ASC"
        }
    });

    const userRoles = roles.map(role => ({
        ...serializeRoleNormal(role),
        has: user.roles.some(userRole => userRole.id === role.id)
    }));

    res.json({
        status: "success",
        data: {
            userRoles: user.roles.map(serializeRoleNormal),
            roles: userRoles
        }
    });
});

// TODO: sort
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
            users: users.map(serializeUserVariantDef)
        }
    });
});

UsersRouter.post("/mg/users/up-username", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminEditUserUsername
), targetUserNotAdmin, async (req: CRequest, res) => {
    const username = req.body.username;
    if (username === undefined) {
        res.status(400).json({
            status: "error",
            message: "Missing Data"
        });
        return;
    }

    if (!isValidUsername(username)) {
        res.status(400).json({
            status: "error",
            message: "Invalid Username"
        });
        return;
    }

    const exists = await AppDataSource.getRepository(User).exist({
        where: {
            username: username
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

    user.username = username;
    await AppDataSource.getRepository(User).save(user);
    res.json({
        status: "success",
        message: "Username updated"
    });
});

UsersRouter.post("/mg/users/up-email", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminEditUserEmail
), targetUserNotAdmin, async (req: CRequest, res) => {
    const email = req.body.email;
    if (email === undefined) {
        res.status(400).json({
            status: "error",
            message: "Missing Data"
        });
        return;
    }

    if (!isValidEmail(email)) {
        res.status(400).json({
            status: "error",
            message: "Invalid Email"
        });
        return;
    }
    const exists = await AppDataSource.getRepository(User).exist({
        where: {
            email: email
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

    user.email = email;
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
    const password = req.body.password;
    if (password === undefined) {
        res.status(400).json({
            status: "error",
            message: "Missing Data"
        });
        return;
    }
    if (!isValidPassword(password)) {
        res.status(400).json({
            status: "error",
            message: "Invalid Password"
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

    const salt = Hashing.generateSalt();
    const passwordHash = Hashing.createHash(password, salt, process.env.HASH_PEPPER);
    user.passwordHash = passwordHash;
    user.passwordSalt = salt;
    user.loginSession = Hashing.generateSalt();

    await AppDataSource.getRepository(User).save(user);
    res.json({
        status: "success",
        message: "Password updated"
    });
});

UsersRouter.post("/mg/users/verify-email", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminEditUserVerifyEmail
), targetUserNotAdmin, async (req: CRequest, res) => {
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

    user.isEmailVerified = true;
    await AppDataSource.getRepository(User).save(user);
    res.json({
        status: "success",
        message: "Email verified"
    });
});

UsersRouter.post("/mg/users/toggle-suspension", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminEditUserSuspend
), targetUserNotAdmin, async (req: CRequest, res) => {
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

    user.suspended = !user.suspended;
    user.loginSession = Hashing.generateSalt();

    await AppDataSource.getRepository(User).save(user);
    res.json({
        status: "success",
        message: "User suspension updated"
    });
});

// TODO: refactor
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
    console.log("Edited roles", editedRoles);

    const allRoles = await AppDataSource.getRepository(Role).find();
    console.log("All roles", allRoles);
    const newRoles = [];

    const requesterTopPower = await userTopPower(requester.id);

    allRoles.forEach(role => {
        const editedRole = editedRoles.find(r => r.id === role.id);

        if (editedRole !== undefined && role.power < requesterTopPower) { // if the role has fewer power than the users top role: allow
            console.log("Role has fewer power than the users top role: allow");
            if (editedRole.has) {
                newRoles.push(role);
                console.log("Role has been added");
            } else {
                console.log("Role has been removed");
            }
        } else {
            console.log("Role has more power than the users top role: deny");
            const _role = user.roles.find(r => r.id === role.id);
            if (_role) {
                newRoles.push(role);
            }
        }
    });
    console.log("New roles", newRoles);

    user.roles = newRoles;
    await AppDataSource.getRepository(User).save(user);
    const __user = await AppDataSource.getRepository(User).findOne({
        where: {
            id: userId
        },
        relations: ["roles"]
    });
    res.json({
        status: "success",
        message: "Roles updated",
        data: {
            newRoles: newRoles.map(serializeRoleNormal),
            objRoles: user.roles.map(serializeRoleNormal),
            actualRoles: __user.roles.map(serializeRoleNormal)
        }
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
