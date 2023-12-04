import dotenv from "dotenv";
import { DataSource } from "typeorm";

import * as e from "./entity";
import { Migration1701606037689 } from "./migration/1701606037689-migration";
import { Migration1701606198365 } from "./migration/1701606198365-migration";
import { Migration1701607125251 } from "./migration/1701607125251-migration";
import { Migration1701625034404 } from "./migration/1701625034404-migration";

dotenv.config();

export const AppDataSource = new DataSource({
    type: "postgres",
    host: process.env.DATABASE_HOST,
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    port: Number(process.env.DATABASE_PORT),

    // synchronize: true,
    logging: true,
    entities: [e.User, e.Role, e.Permission, e.UserRole, e.RolePermission],

    subscribers: [],
    migrations: [Migration1701606037689, Migration1701606198365, Migration1701607125251, Migration1701625034404],
});
