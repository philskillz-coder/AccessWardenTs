import Hashing from "@shared/Hashing";
import logger from "@shared/Logger";
import { baseCheck, BaseRules, getFirstCheckError } from "@shared/Validation";
import { ApiResponseFlags, UserVariantAuth } from "@typings";
import { PagePermissions } from "backend/database/required-data";
import { DEFAULT_RULES, EMAIL_RULES, PASSWORD_RULES, PERMISSION_DESCRIPTION_RULES, PERMISSION_NAME_RULES, ROLE_DESCRIPTION_RULES, ROLE_NAME_RULES, USERNAME_RULES } from "backend/Rules";
import dotenv from "dotenv";
import { Router } from "express";
import speakeasy from "speakeasy";

import { AppDataSource } from "../database/data-source";
import { Role, User } from "../database/entity";
import { serializeUserVariantPerms } from "../database/serializer";
import { CRequest } from "../express";
import { getUserPermissions, hasPermissions, PermNameComp } from "../services/PermissionsService";
import temporaryValueService from "../services/TemporaryValueService";
import PermissionsRouter from "./permissions_api";
import RolesRouter from "./roles_api";
import { ensureAuthenticated, ensureDevEnv, ensureMfaDisabled, ensureMfaEnabled, validateMfaToken } from "./tools";
import UsersRouter from "./users_api";

dotenv.config();

const ApiRouter = Router();

ApiRouter.use("/", RolesRouter);
ApiRouter.use("/", PermissionsRouter);
ApiRouter.use("/", UsersRouter);

ApiRouter.post("/auth/@me", ensureAuthenticated, async (req, res) => {
    if (!(req.user instanceof User)) return res.status(500).json({ status: "error", message: "Internal Server Error" });

    const user = <User>req.user;
    res.json({
        status: "success",
        data: {user: serializeUserVariantPerms(user, await getUserPermissions(user.id))}
    });
});

ApiRouter.post("/auth/login", async (req, res) => {
    if (!req.body.username || !req.body.password) {
        return res.status(400).json({ status: "error", message: "Missing required fields" });
    }

    const isMail = req.body.username.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    const condition = isMail ? { email: req.body.username } : { username: req.body.username };

    AppDataSource.getRepository(User).findOne({
        where: condition,
        relations: ["roles"]
    })
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

            if (user.suspended) {
                res.status(400).json({ status: "error", message: "User is suspended." });
                return;
            }

            req.login(user, async loginErr => {
                if (loginErr) {
                    logger.error(`Error logging in user ${user.username}: ${loginErr}`);
                    // Handle error, e.g., return a JSON response with an error message
                    res.status(500).json({ status: "error", message: "Internal Server Error" });
                    return;
                }

                const mfaRecommended = user.roles.map(role => !role.requiresMfa || user.mfaEnabled).some(v => !v);

                // Return a JSON response indicating successful login
                res.status(200).json({
                    status: "success",
                    message: "User logged in successfully",
                    data: {
                        user: <UserVariantAuth>{
                            ...serializeUserVariantPerms(user, await getUserPermissions(user.id)),
                            mfaSuggested: mfaRecommended
                        }
                    }
                });
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

    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;

    if (username === undefined || email === undefined || password === undefined) {
        return res.status(400).json({ status: "error", message: "Missing required fields" });
    }

    if (!baseCheck(username, USERNAME_RULES)) {
        return res.status(400).json({ status: "error", message: "Invalid username" });
    }

    if (!baseCheck(email, EMAIL_RULES)) {
        return res.status(400).json({ status: "error", message: "Invalid email" });
    }

    console.log(getFirstCheckError(password, PASSWORD_RULES));
    console.log(baseCheck(password, PASSWORD_RULES));
    if (!baseCheck(password, PASSWORD_RULES)) {
        return res.status(400).json({ status: "error", message: "Password is not safe enough" });
    }


    // TODO: could add robot check here
    // TODO: you could combine the two queries into one
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

    const defaultRoles = await AppDataSource.getRepository(Role).find({ where: { isDefault: true }});
    user.roles = [...defaultRoles];
    // TODO: check if default roles work
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
            return res.status(201).json({
                status: "success",
                message: "User registered and logged in successfully",
                data: {
                    user: serializeUserVariantPerms(user, await getUserPermissions(user.id))
                }
            });
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: "Internal Server Error" });
    }
});

ApiRouter.post("/mfa/setup", ensureAuthenticated, ensureMfaDisabled,  async function(req: CRequest, res) {
    const user = <User>req.user;
    if (user.mfaEnabled) {
        return res.status(400).json({ status: "error", message: "MFA is already enabled" });
    }

    const path = `/user/${user.id}/mfa/setup-key`;
    const tempSecret = speakeasy.generateSecret();
    temporaryValueService.storeValue(path, tempSecret, 60);

    res.json({ status: "success", data: { secret_base32: tempSecret.base32, secret_url: tempSecret.otpauth_url } });
});

ApiRouter.post("/mfa/verify-setup", ensureAuthenticated, ensureMfaDisabled, async function(req: CRequest, res) {
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

ApiRouter.post("/mfa/disable", ensureAuthenticated, ensureMfaEnabled, validateMfaToken, async function(req: CRequest, res) {
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
    const email = req.body.email;
    if (email === undefined) {
        return res.status(400).json({ status: "error", message: "Missing Data" });
    }

    // TODO: global: same response when missing data: "Missing required fields"

    if (!baseCheck(email, EMAIL_RULES)) {
        return res.status(400).json({ status: "error", message: "Invalid email" });
    }

    if (await AppDataSource.getRepository(User).exist({ where: { email: email }})) {
        return res.status(400).json({ status: "error", message: "Email is already taken"});
    }
    // TODO: implement email verification

    const user = <User>req.user;
    if (!Hashing.verifyHash(req.body.password, user.passwordSalt, process.env.HASH_PEPPER, user.passwordHash)) {
        return res.status(400).json({ status: "error", message: "Incorrect password" });
    }

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
    const username = req.body.username;
    if (username === undefined) {
        return res.status(400).json({ status: "error", message: "Missing Data" });
    }

    if (!baseCheck(username, USERNAME_RULES)) {
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

    if (curPassword === undefined || newPassword === undefined) {
        return res.status(400).json({ status: "error", message: "Missing Data" });
    }

    const user = <User>req.user;
    if (!Hashing.verifyHash(curPassword, user.passwordSalt, process.env.HASH_PEPPER, user.passwordHash)) {
        return res.status(400).json({ status: "error", message: "(Old) Password doesn't match" });
    }

    if (!baseCheck(newPassword, PASSWORD_RULES)) {
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

const AVAILABLE_RULES = {
    username: {
        permission: null,
        rule: USERNAME_RULES
    },
    email: {
        permission: null,
        rule: EMAIL_RULES
    },
    password: {
        permission: null,
        rule: PASSWORD_RULES
    },
    permission_name: {
        permission: PagePermissions.AdminViewPermissions,
        rule: PERMISSION_NAME_RULES
    },
    permission_description: {
        permission: PagePermissions.AdminViewPermissions,
        rule: PERMISSION_DESCRIPTION_RULES
    },
    role_name: {
        permission: PagePermissions.AdminViewRoles,
        rule: ROLE_NAME_RULES
    },
    role_description: {
        permission: PagePermissions.AdminViewRoles,
        rule: ROLE_DESCRIPTION_RULES
    }
};

ApiRouter.post("/common/rules", ensureAuthenticated, async function(req: CRequest, res) {
    const user = <User>req.user;
    const rules: string[] = req.body.rules;
    const result: Record<string, BaseRules> = {};

    for (const rule of rules) {
        if (!AVAILABLE_RULES[rule]) {
            result[rule] = null;
        }
        if (AVAILABLE_RULES[rule].permission && !(await hasPermissions(user.id, PermNameComp, AVAILABLE_RULES[rule].permission))) {
            result[rule] = null;
        }
        result[rule] = {
            ...DEFAULT_RULES,
            ...AVAILABLE_RULES[rule].rule,
            regex: AVAILABLE_RULES[rule].rule.regex?.source
        };
    }

    res.json({ status: "success", data: {
        rules: result
    } });
});

export default ApiRouter;
