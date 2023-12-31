import { ApiResponseFlags } from "@typings";
import { isDev } from "backend";
import { AppDataSource } from "backend/database/data-source";
import { Permission, User } from "backend/database/entity";
import { CRequest } from "backend/express";
import hashidService from "backend/services/HashidService";
import { hasPermissions } from "backend/services/PermissionsService";
import speakeasy from "speakeasy";

export const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ status: "error", message: "Unauthorized", flags: [ApiResponseFlags.unauthorized] });
};

export const ensureDevEnv = (req, res, next) => {
    if (isDev) return next();
    res.status(401).json({ status: "error", message: "Unauthorized (prod)", flags: [ApiResponseFlags.unauthorized] });
};

// eslint-disable-next-line no-unused-vars
export const ensureMfaEnabled = (req, res, next) => {
    const user = <User>req.user;
    if (user.mfaEnabled) return next();
    res.status(401).json({ status: "error", message: "Unauthorized (mfa)", flags: [ApiResponseFlags.unauthorized_mfa_req] });
};

// eslint-disable-next-line no-unused-vars
export const ensureMfaDisabled = (req, res, next) => {
    const user = <User>req.user;
    if (!user.mfaEnabled) return next();
    res.status(401).json({ status: "error", message: "Unauthorized (mfa)", flags: [ApiResponseFlags.unauthorized_mfa_fb] });
};

export const validateMfaToken = (req, res, next) => {
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
export function requirePermissions<T>(comp: (perm: Permission) => T, ...requiredPermissions: T[]) {
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

export function targetUserValid(req: CRequest, res, next) {
    if (!req.body.userId) {
        res.status(400).json({
            status: "error",
            message: "Missing Data"
        });
        return;
    }

    const userId = hashidService.users.decodeSingle(req.body.userId);
    if (!userId) {
        res.status(400).json({
            status: "error",
            message: "Invalid User format"
        });
        return;
    }

    next();
}

export function targetUserNotAdmin(req: CRequest, res, next) {
    if (!req.body.userId) {
        res.status(400).json({
            status: "error",
            message: "Missing Data"
        });
        return;
    }

    const userId = hashidService.users.decodeSingle(req.body.userId);
    if (!userId) {
        res.status(400).json({
            status: "error",
            message: "Invalid User format"
        });
        return;
    }

    if (req.body.userId === (<User>req.user)?.id) {
        next();
        return;
    }

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

export function parseNumber(number: string | null, def?: number): number | null {
    if (!number) {
        return null || def;
    }

    const parsedNumber = parseInt(number, 10);

    if (isNaN(parsedNumber)) {
        return null || def;
    }

    return parsedNumber;
}
