import { createHash, generateSalt } from "@shared/Hashing";
import logger from "@shared/Logger";
import {isValidEmail} from "@shared/Mail";
import { isPasswordValid, PASSWORD_RULES } from "@shared/Password";
import { isDev } from "backend";
import dotenv from "dotenv";
import { Router } from "express";
import passport from "passport";
import speakeasy from "speakeasy";

import { User } from "./database/entity/User";
import { serializeUser } from "./database/serializer";
import { CRequest } from "./express";
import temporaryValueService from "./services/TemporaryValueService";

dotenv.config();

// import { isDev } from ".";

const ApiRouter = Router();

const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ status: "error", error: "Unauthorized" });
};

const ensureDevEnv = (req, res, next) => {
    if (isDev) return next();
    res.status(401).json({ status: "error", error: "Unauthorized (prod)" });
};

// eslint-disable-next-line no-unused-vars
const ensureMfaEnabled = (req, res, next) => {
    const user = <User>req.user;
    if (user.mfaEnabled) return next();
    res.status(401).json({ status: "error", error: "Unauthorized (mfa)" });
};

const validateMfaToken = (req, res, next) => {
    if (!req.body.token) {
        return res.status(400).json({ status: "mfarequired", error: "Missing Data" });
    }
    const user = <User>req.user;
    const verified = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: "base32",
        token: req.body.token,
        window: 1
    });

    if (verified) {
        return next();
    } else {
        return res.status(400).json({ status: "mfainvalid", error: "Invalid token" });
    }
};

ApiRouter.post("/auth/@me", ensureAuthenticated, (req, res) => {
    if (!(req.user instanceof User)) return res.status(500).json({ status: "error", error: "Internal Server Error" });
    res.json({status: "success", data: {user: serializeUser(req.user)}});
});

ApiRouter.post("/auth/login", passport.authenticate("local"), (req, res) => {
    if (!(req.user instanceof User)) return res.status(500).json({ status: "error", error: "Internal Server Error" });
    return res.status(200).json({ status: "success", message: "User logged in successfully", showNotification: true, data: {user: serializeUser(req.user)}});
});

ApiRouter.post("/auth/logout", ensureAuthenticated, (req, res) => {
    req.logout(err => {
        if (err) return res.status(500).json({ status: "error", error: "Internal Server error" });
        res.json({ status: "success", message: "User logged out successfully", showNotification: true });
    });
});

// ApiRouter.use((err, req, res, next) => {
//     if (err && err.name === "TokenError") {
//         res.redirect("/api/auth");
//     } else {
//         next();
//     }
// });


ApiRouter.post("/auth/register", async function(req: CRequest, res) {
    // check if username or email is already taken

    if (!req.body.username || !req.body.email || !req.body.password) {
        return res.status(400).json({ status: "error", error: "Missing required fields" });
    }

    if (!isValidEmail(req.body.email)) {
        return res.status(400).json({ status: "error", error: "Invalid email" });
    }

    if (await req.appDataSource.getRepository(User).exist({ where: { email: req.body.email }})) {
        return res.status(400).json({ status: "error", error: "Email is already taken"});
    }

    if (await req.appDataSource.getRepository(User).exist({ where: { username: req.body.username }})) {
        return res.status(400).json({ status: "error", error: "Username is already taken"});
    }

    // Validate password
    if (!isPasswordValid(req.body.password, PASSWORD_RULES)) {
        return res.status(400).json({ status: "error", error: "Password is not safe enough" });
    }

    const salt = generateSalt();
    const passwordHash = createHash(req.body.password, salt, process.env.HASH_PEPPER);

    // Register the user
    const user = new User();
    user.isAdmin = false;
    user.username = req.body.username;
    user.email = req.body.email;
    user.passwordHash = passwordHash;
    user.passwordSalt = salt;
    user.mfaEnabled = false;
    user.mfaSecret = null;
    user.roles = [];
    // TODO: add default roles

    try {
        await req.appDataSource.getRepository(User).save(user);

        req.login(user, loginErr => {
            if (loginErr) {
                logger.error(`Error logging in user ${user.username}: ${loginErr}`);
                // Handle error, e.g., return a JSON response with an error message
                return res.status(500).json({ status: "error", error: "Internal Server Error" });
            }

            // Return a JSON response indicating successful registration and login
            return res.status(201).json({ status: "success", message: "User registered and logged in successfully", showNotificattion: true, data: {user: serializeUser(user)} });
        });
    } catch (error) {
        res.status(500).json({ status: "error", error: "Failed to register user" });
    }
});

// ApiRouter.use("/temp", templateAPI);
// router.use("/temp", ensureAuthenticated, templateAPI);

ApiRouter.post("/mfa/status", ensureAuthenticated, async function(req: CRequest, res) {
    const user = <User>req.user;
    res.json({ status: "success", data: { enabled: user.mfaEnabled } });
});

ApiRouter.post("/mfa/setup", ensureAuthenticated, async function(req: CRequest, res) {
    const user = <User>req.user;
    if (user.mfaEnabled) {
        return res.status(400).json({ status: "error", error: "MFA is already enabled" });
    }

    const path = `/user/${user.id}/mfa/setup-key`;
    if (temporaryValueService.contains(path)) {
        return res.status(400).json({ status: "error", error: "You have already requested the MFA-Setup-Key" });
    }

    const tempSecret = speakeasy.generateSecret();
    temporaryValueService.storeValue(path, tempSecret, 60);

    res.json({ status: "success", secret: { base32: tempSecret.base32, url: tempSecret.otpauth_url } });
});

ApiRouter.post("/mfa/verify-setup", ensureAuthenticated, async function(req: CRequest, res) {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ status: "error", error: "Missing Data" });
        }
        const user = <User>req.user;
        const path = `/user/${user.id}/mfa/setup-key`;
        const tempSecret = temporaryValueService.retrieveValue(path);
        if (!tempSecret) {
            return res.status(400).json({ status: "error", error: "Invalid Secret" });
        }

        const { base32: secret } = tempSecret;
        const verified = speakeasy.totp.verify({
            secret: secret,
            encoding: "base32",
            token: req.body.token,
            window: 1
        });

        if (verified) {
            user.mfaEnabled = true;
            user.mfaSecret = secret;
            user.loginSession = generateSalt();

            await req.appDataSource.getRepository(User).save(user);
            return res.json({ status: "success", message: "MFA enabled", showNotificattion: true });
        } else {
            return res.status(400).json({ status: "error", error: "Invalid token" });
        }
    } catch (error) {
        res.status(500).json({ status: "error", error: "Failed to setup mfa" });
    }
});

ApiRouter.post("/mfa/disable", ensureAuthenticated, validateMfaToken, async function(req: CRequest, res) {
    try {
        const user = <User>req.user;
        user.mfaEnabled = false;
        user.mfaSecret = null;
        user.loginSession = generateSalt();

        await req.appDataSource.getRepository(User).save(user);
        return res.json({ status: "success", message: "MFA disabled", showNotificattion: true });
    } catch (error) {
        res.status(500).json({ status: "error", error: "Failed to disable mfa" });
    }
});

ApiRouter.post("/logout-sessions", ensureAuthenticated, ensureDevEnv, async function(req: CRequest, res) {
    const user = <User>req.user;
    user.loginSession = generateSalt();

    await req.appDataSource.getRepository(User).save(user);
    return res.json({ status: "success", message: "All sessions logged out", showNotificattion: true });
});

ApiRouter.post("/test-mfa", ensureAuthenticated, validateMfaToken, async function(req: CRequest, res) {
    return res.json({ status: "success", message: "MFA token is valid", showNotificattion: true });
});

export default ApiRouter;
