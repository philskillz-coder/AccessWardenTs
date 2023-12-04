import { CleanUser } from "@typings";
import hashidService from "backend/services/HashidService";

import { User } from "./entity";

export function serializeUser(user: User): CleanUser {
    return {
        id: hashidService.users.encode(user.id),
        username: user.username,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
    };
}
