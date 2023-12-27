import Hashing from "@shared/Hashing";
import logger from "@shared/Logger";
import {isValidEmail} from "@shared/Mail";
import {isPasswordValid, PASSWORD_RULES} from "@shared/Password";
import {isUsernameValid} from "@shared/Username";
import {ApiResponseFlags} from "@typings";
import {isDev} from "backend";
import dotenv from "dotenv";
import {Router} from "express";
import speakeasy from "speakeasy";
import { Like } from "typeorm";

import {AppDataSource} from "./database/data-source";
import {Permission, Role, User} from "./database/entity";
import { PagePermissions } from "./database/required-data";
import {serializeUser, serializeUserWithPerms} from "./database/serializer";
import {CRequest} from "./express";
import hashidService from "./services/HashidService";
import { hasPermissions, PermNameComp } from "./services/PermissionsService";
import temporaryValueService from "./services/TemporaryValueService";

dotenv.config();

const ApiRouter = Router();

const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ status: "error", message: "Unauthorized", flags: [ApiResponseFlags.unauthorized] });
};

const ensureDevEnv = (req, res, next) => {
    if (isDev) return next();
    res.status(401).json({ status: "error", message: "Unauthorized (prod)", flags: [ApiResponseFlags.unauthorized] });
};

// eslint-disable-next-line no-unused-vars
const ensureMfaEnabled = (req, res, next) => {
    const user = <User>req.user;
    if (user.mfaEnabled) return next();
    res.status(401).json({ status: "error", message: "Unauthorized (mfa)", flags: [ApiResponseFlags.unauthorized_mfa_req] });
};

const validateMfaToken = (req, res, next) => {
    const user = <User>req.user;
    if (!user.mfaEnabled) return next(); // skip if mfa is not enabled. if mfa is required, ensureMfaEnabled will handle it

    if (!req.body.token) {
        return res.status(400).json({ status: "error", message: "Missing Data", flags: [ApiResponseFlags.mfa_required] });
    }
    const verified = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: "base32",
        token: req.body.token,
        window: 1
    });

    if (verified) {
        return next();
    } else {
        return res.status(400).json({ status: "error", message: "Invalid token", flags: [ApiResponseFlags.mfa_invalid] });
    }
};

// eslint-disable-next-line no-unused-vars
function requirePermissions<T>(comp: (perm: Permission) => T, ...requiredPermissions: T[]) {
    const _requirePermissions = async (req: CRequest, res, next) => {
        const user: User | null = <User>req.user;
        if (!user) {
            return res.status(401).json({ status: "error", message: "Unauthorized", flags: [ApiResponseFlags.unauthorized] });
        }
        if (user.isAdmin) return next();
        if (!await hasPermissions(user.id, comp, ...requiredPermissions)) {
            return res.status(403).json({ status: "error", message: "Forbidden", flags: [ApiResponseFlags.forbidden] });
        }
        next();
    };
    return _requirePermissions;
}

ApiRouter.post("/auth/@me", ensureAuthenticated, async (req, res) => {
    if (!(req.user instanceof User)) return res.status(500).json({ status: "error", message: "Internal Server Error" });
    res.json({status: "success", data: {user: serializeUserWithPerms(req.user)}});
});

ApiRouter.post("/auth/login", async (req, res) => {
    if (!req.body.username || !req.body.password) {
        return res.status(400).json({ status: "error", message: "Missing required fields" });
    }

    const isMail = req.body.username.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    const condition = isMail ? { email: req.body.username } : { username: req.body.username };

    AppDataSource.getRepository(User).findOne({ where: condition })
        .then(user => {
            if (!user) {
                res.status(400).json({ status: "error", message: "User does not exist." });
                return;
            }

            if (!Hashing.verifyHash(req.body.password, user.passwordSalt, process.env.HASH_PEPPER, user.passwordHash)) {
                res.status(400).json({ status: "error", message: "Invalid password." });
                return;
            }

            if (user.mfaEnabled) {
                if (!req.body.token) {
                    res.status(400).json({ status: "error", message: "Missing Data", flags: [ApiResponseFlags.mfa_required] });
                    return;
                }

                const verified = speakeasy.totp.verify({
                    secret: user.mfaSecret,
                    encoding: "base32",
                    token: req.body.token,
                    window: 1
                });
                if (!verified) {
                    res.status(400).json({ status: "error", message: "Token invalid", flags: [ApiResponseFlags.mfa_invalid] });
                    return;
                }
            }

            req.login(user, async loginErr => {
                if (loginErr) {
                    logger.error(`Error logging in user ${user.username}: ${loginErr}`);
                    // Handle error, e.g., return a JSON response with an error message
                    res.status(500).json({ status: "error", message: "Internal Server Error" });
                    return;
                }

                // Return a JSON response indicating successful login
                res.status(200).json({ status: "success", message: "User logged in successfully", data: { user: await serializeUserWithPerms(user) }});
            });
        })
        .catch(error => {
            logger.error(`Error logging in user ${req.body.username}: ${error}`);
            res.status(500).json({ status: "error", message: "Internal Server Error" });
        });
});

ApiRouter.post("/auth/logout", ensureAuthenticated, (req, res) => {
    req.logout(err => {
        if (err) return res.status(500).json({ status: "error", message: "Internal Server error" });
        res.json({ status: "success", message: "User logged out successfully" });
    });
});


ApiRouter.post("/auth/register", async function(req: CRequest, res) {
    // check if username or email is already taken

    if (!req.body.username || !req.body.email || !req.body.password) {
        return res.status(400).json({ status: "error", message: "Missing Data" });
    }

    if (!isValidEmail(req.body.email)) {
        return res.status(400).json({ status: "error", message: "Invalid email" });
    }

    if (!isUsernameValid(req.body.username)) {
        return res.status(400).json({ status: "error", message: "Invalid username" });
    }

    if (!isPasswordValid(req.body.password, PASSWORD_RULES)) {
        return res.status(400).json({ status: "error", message: "Password is not safe enough" });
    }

    if (await AppDataSource.getRepository(User).exist({ where: { email: req.body.email }})) {
        return res.status(400).json({ status: "error", message: "Email is already taken"});
    }

    if (await AppDataSource.getRepository(User).exist({ where: { username: req.body.username }})) {
        return res.status(400).json({ status: "error", message: "Username is already taken"});
    }

    const salt = Hashing.generateSalt();
    const passwordHash = Hashing.createHash(req.body.password, salt, process.env.HASH_PEPPER);

    // Register the user
    const user = new User();
    user.isAdmin = false;
    user.username = req.body.username;
    user.email = req.body.email;
    user.isEmailVerified = false;
    user.passwordHash = passwordHash;
    user.passwordSalt = salt;
    user.mfaEnabled = false;
    user.mfaSecret = null;
    user.roles = [];
    // TODO: add default roles
    // TODO: add email verification

    try {
        await AppDataSource.getRepository(User).save(user);

        req.login(user, async loginErr => {
            if (loginErr) {
                logger.error(`Error logging in user ${user.username}: ${loginErr}`);
                // Handle error, e.g., return a JSON response with an error message
                return res.status(500).json({ status: "error", message: "Internal Server Error" });
            }

            // Return a JSON response indicating successful registration and login
            return res.status(201).json({ status: "success", message: "User registered and logged in successfully", data: { user: await serializeUserWithPerms(user) } });
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: "Internal Server Error" });
    }
});

ApiRouter.post("/mfa/setup", ensureAuthenticated, async function(req: CRequest, res) {
    const user = <User>req.user;
    if (user.mfaEnabled) {
        return res.status(400).json({ status: "error", message: "MFA is already enabled" });
    }

    const path = `/user/${user.id}/mfa/setup-key`;
    const tempSecret = speakeasy.generateSecret();
    temporaryValueService.storeValue(path, tempSecret, 60);

    res.json({ status: "success", data: { secret_base32: tempSecret.base32, secret_url: tempSecret.otpauth_url } });
});

ApiRouter.post("/mfa/verify-setup", ensureAuthenticated, async function(req: CRequest, res) {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ status: "error", error: "Missing Data" });
        }

        const user = <User>req.user;
        const path = `/user/${user.id}/mfa/setup-key`;
        const tempSecret = temporaryValueService.retrieveValue(path, true);
        if (!tempSecret) {
            return res.status(400).json({ status: "error", message: "You dont have setup running" });
        }

        const verified = speakeasy.totp.verify({
            secret: tempSecret.base32,
            encoding: "base32",
            token: code,
            window: 1
        });

        if (verified) {
            temporaryValueService.removeValue(path);
            user.mfaEnabled = true;
            user.mfaSecret = tempSecret.base32;
            user.loginSession = Hashing.generateSalt();

            await AppDataSource.getRepository(User).save(user);
            req.logIn(user, loginErr => {
                if (loginErr) {
                    logger.error(`Error logging in user ${user.username}: ${loginErr}`);
                    // Handle error, e.g., return a JSON response with an error message
                    return res.status(500).json({ status: "error", message: "Internal Server Error" });
                }

                return res.json({ status: "success", message: "MFA enabled", showNotificattion: true });
            });

        } else {
            return res.status(400).json({ status: "error", message: "Invalid token" });
        }
    } catch (error) {
        res.status(500).json({ status: "error", message: "Internal Server Error" });
    }
});

ApiRouter.post("/mfa/disable", ensureAuthenticated, validateMfaToken, async function(req: CRequest, res) {
    try {
        const user = <User>req.user;
        user.mfaEnabled = false;
        user.mfaSecret = null;
        user.loginSession = Hashing.generateSalt();

        await AppDataSource.getRepository(User).save(user);
        return res.json({ status: "success", message: "MFA disabled", showNotificattion: true });
    } catch (error) {
        res.status(500).json({ status: "error", message: "Internal Server Error" });
    }
});

ApiRouter.post("/logout-sessions", ensureDevEnv, ensureAuthenticated, async function(req: CRequest, res) {
    const user = <User>req.user;
    user.loginSession = Hashing.generateSalt();

    await AppDataSource.getRepository(User).save(user);
    return res.json({ status: "success", message: "All sessions logged out", showNotificattion: true });
});

ApiRouter.post("/test-mfa", ensureDevEnv, ensureAuthenticated, validateMfaToken, async function(req: CRequest, res) {
    return res.json({ status: "success", message: "MFA token is valid", showNotificattion: true });
});

ApiRouter.post("/user/update/mail", ensureAuthenticated, validateMfaToken, async function(req: CRequest, res) {
    if (!req.body.email) {
        return res.status(400).json({ status: "error", message: "Missing Data" });
    }

    if (!isValidEmail(req.body.email)) {
        return res.status(400).json({ status: "error", message: "Invalid email" });
    }

    if (await AppDataSource.getRepository(User).exist({ where: { email: req.body.email }})) {
        return res.status(400).json({ status: "error", message: "Email is already taken"});
    }
    // TODO: implement email verification

    const user = <User>req.user;
    user.email = req.body.email;
    user.loginSession = Hashing.generateSalt(); // logout all sessions
    await AppDataSource.getRepository(User).save(user);
    await req.logIn(user, loginErr => {
        if (loginErr) {
            logger.error(`Error logging in user ${user.username}: ${loginErr}`);
            // Handle error, e.g., return a JSON response with an error message
            return res.status(500).json({ status: "error", message: "Internal Server Error" });
        }
    });
    return res.json({ status: "success", message: "Email updated", showNotificattion: true });
});

ApiRouter.post("/user/update/username", ensureAuthenticated, validateMfaToken, async function(req: CRequest, res) {
    if (!req.body.username) {
        return res.status(400).json({ status: "error", message: "Missing Data" });
    }

    if (!isUsernameValid(req.body.username)) {
        return res.status(400).json({ status: "error", message: "Invalid username" });
    }

    if (await AppDataSource.getRepository(User).exist({ where: { username: req.body.username }})) {
        return res.status(400).json({ status: "error", message: "Username is already taken"});
    }

    const user = <User>req.user;
    user.username = req.body.username;
    user.loginSession = Hashing.generateSalt(); // logout all sessions
    await AppDataSource.getRepository(User).save(user);
    await req.logIn(user, loginErr => {
        if (loginErr) {
            logger.error(`Error logging in user ${user.username}: ${loginErr}`);
            // Handle error, e.g., return a JSON response with an error message
            return res.status(500).json({ status: "error", message: "Internal Server Error" });
        }
    });
    return res.json({ status: "success", message: "Username updated" });
});

ApiRouter.post("/user/update/password", ensureAuthenticated, validateMfaToken, async function(req: CRequest, res) {
    const { curPassword, newPassword } = req.body;

    if (curPassword === null || newPassword === null) {
        return res.status(400).json({ status: "error", message: "Missing Data" });
    }

    const user = <User>req.user;
    if (!Hashing.verifyHash(curPassword, user.passwordSalt, process.env.HASH_PEPPER, user.passwordHash)) {
        return res.status(400).json({ status: "error", message: "(Old) Password doesn't match" });
    }

    if (!isPasswordValid(newPassword, PASSWORD_RULES)) {
        return res.status(400).json({ status: "error", message: "Password is not safe enough" });
    }

    const salt = Hashing.generateSalt();
    const passwordHash = Hashing.createHash(newPassword, salt, process.env.HASH_PEPPER);
    user.passwordHash = passwordHash;
    user.passwordSalt = salt;
    user.loginSession = Hashing.generateSalt(); // logout all sessions
    await AppDataSource.getRepository(User).save(user);
    await req.logIn(user, loginErr => {
        if (loginErr) {
            logger.error(`Error logging in user ${user.username}: ${loginErr}`);
            // Handle error, e.g., return a JSON response with an error message
            return res.status(500).json({ status: "error", message: "Internal Server Error" });
        }
    });
    return res.json({ status: "success", message: "Password updated" });
});


// User Updating Rules:
// You can only update a user if
// - You have the permission to update whatever
// - The target user is not admin
// - The target user's "top" role is below yours

function targetUserNotAdmin(req: CRequest, res, next) {
    // TODO: allow if user is self
    const userId = Number(hashidService.users.decode(req.body.userId)[0]);
    AppDataSource.getRepository(User).findOne({
        where: {
            id: userId
        }
    }).then(targetUser => {
        if (targetUser.isAdmin) {
            res.status(500).json({
                status: "error",
                message: "Target user is admin"
            });
        } else {
            next();
        }
    });
}

ApiRouter.post("/mg/users/login-as", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminLoginAs
), targetUserNotAdmin, async (req: CRequest, res) => {
    const user: User = <User>req.user;

    const userId = Number(hashidService.users.decode(req.body.userId)[0]);
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
        res.status(200).json({ status: "success", message: "User logged in successfully", data: { user: serializeUser(targetUser) }});
    });
});

ApiRouter.post("/mg/users/get", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminViewUsers
), async (req: CRequest, res) => {
    const page = Number.parseInt(req.body.page) || 0;
    const count = Number.parseInt(req.body.count) || 25;

    const users = await AppDataSource.getRepository(User).find({
        relations: ["roles", "roles.rolePermissions", "roles.rolePermissions.role", "roles.rolePermissions.permission"],
        skip: page * count,
        take: count,
        order: {
            id: "ASC"
        }
    });

    res.json({
        status: "success",
        data: {
            users: users.map(user => serializeUser(user))
        }
    });
});

ApiRouter.post("/mg/users/get-all-roles", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminViewUsers
), async (req: CRequest, res) => {
    const userId = Number(hashidService.users.decode(req.body.userId)[0]);
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

    const roles = await AppDataSource.getRepository(Role).find(
        {
            relations: ["rolePermissions", "rolePermissions.permission"],
            order: {
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

ApiRouter.post("/mg/users/search", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminViewUsers
), async (req: CRequest, res) => {
    const search = "%" + req.body.search + "%";
    const page = Number.parseInt(req.body.page) || 0;
    const count = Number.parseInt(req.body.count) || 25;
    // TODO: case insensitive search
    const users = await AppDataSource.getRepository(User).find({
        where: [
            {
                username: Like(search)
            },
            {
                email: Like(search)
            }
        ],
        relations: ["roles", "roles.rolePermissions", "roles.rolePermissions.role", "roles.rolePermissions.permission"],
        skip: page * count,
        take: count,
        order: {
            id: "ASC"
        }
    });

    res.json({
        status: "success",
        data: {
            users: users.map(user => serializeUser(user))
        }
    });
});

ApiRouter.post("/mg/users/up-username",
    ensureAuthenticated,
    requirePermissions(
        PermNameComp, PagePermissions.AdminEditUserUsername
    ),
    targetUserNotAdmin,
    async (req: CRequest, res) => {
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

        const userId = Number(hashidService.users.decode(req.body.userId)[0]);
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
    }
);

ApiRouter.post("/mg/users/up-email",
    ensureAuthenticated,
    requirePermissions(
        PermNameComp, PagePermissions.AdminEditUserEmail
    ),
    targetUserNotAdmin,
    async (req: CRequest, res) => {
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

        const userId = Number(hashidService.users.decode(req.body.userId)[0]);
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
    }
);

ApiRouter.post("/mg/users/up-password",
    ensureAuthenticated,
    validateMfaToken,
    requirePermissions(
        PermNameComp, PagePermissions.AdminEditUserPassword
    ),
    targetUserNotAdmin,
    async (req: CRequest, res) => {
        const userId = Number(hashidService.users.decode(req.body.userId)[0]);
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
    }
);

ApiRouter.post("/mg/users/up-roles", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminEditUserRoles
), targetUserNotAdmin, async (req: CRequest, res) => {
    if (!req.body.roles) {
        res.status(400).json({
            status: "error",
            message: "Missing Data"
        });
        return;
    }

    const userId = Number(hashidService.users.decode(req.body.userId)[0]);
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

    const editedRoles: {id: number, has: boolean}[] = req.body.roles.map(role => ({
        ...role,
        id: Number(hashidService.roles.decode(role.id)[0])
    }));

    const allRoles = await AppDataSource.getRepository(Role).find();
    console.log(allRoles);
    const newRoles = [];

    allRoles.forEach(role => {
        const editedRole = editedRoles.find(r => r.id === role.id);
        if (editedRole !== undefined) {
            newRoles.push({...role, has: editedRole.has});
        } else {
            const role = user.roles.find(r => r.id === role.id);
            if (role) {
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

ApiRouter.post("/mg/users/delete", ensureAuthenticated, requirePermissions(
    PermNameComp, PagePermissions.AdminEditUserDelete
), targetUserNotAdmin, async (req: CRequest, res) => {
    const userId = Number(hashidService.users.decode(req.body.userId)[0]);
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

    await AppDataSource.getRepository(User).remove(user);
    res.json({
        status: "success",
        message: "User deleted"
    });
});

// ApiRouter.post("/mg/users/up-mfa",
//     ensureAuthenticated,
//     validateMfaToken,
//     requirePermissions(
//         PermNameComp, PagePermissions.AdminEditUserMfa
//     ),
//     targetUserNotAdmin,
//     async (req: CRequest, res) => {
//         const user = await AppDataSource.getRepository(User).findOne({
//             where: {
//                 id: req.body.userId
//             }
//         });
//         if (!user) {
//             res.status(400).json({
//                 status: "error",
//                 message: "User not found"
//             });
//         }

//         if (req.body.mfaEnabled) {
//             if (!req.body.secret) {
//                 res.status(400).json({
//                     status: "error",
//                     message: "Missing Data"
//                 });
//             }

//             user.mfaEnabled = true;
//             user.mfaSecret = req.body.secret;
//         } else {
//             user.mfaEnabled = false;
//             user.mfaSecret = null;
//         }

//         await AppDataSource.getRepository(User).save(user);
//         res.json({
//             status: "success",
//             message: "MFA updated"
//         });
//     }
// );

ApiRouter.post("/perm/test", ensureAuthenticated, requirePermissions(PermNameComp, "Test"), (req: CRequest, res) => {
    res.json({status: "success", message: "You have the permission"});
});

export default ApiRouter;
