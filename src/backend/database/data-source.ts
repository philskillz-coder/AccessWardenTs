import dotenv from "dotenv";
import { DataSource } from "typeorm";

import * as e from "./entity";
import { Migration1702919396118 } from "./migration/1702919396118-migration";
import { Migration1702921481908 } from "./migration/1702921481908-migration";
import { Migration1702922275248 } from "./migration/1702922275248-migration";
import { Migration1702923114301 } from "./migration/1702923114301-migration";
import { Migration1704023268622 } from "./migration/1704023268622-migration";
import { Migration1704538865031 } from "./migration/1704538865031-migration";
import { Migration1705168976545 } from "./migration/1705168976545-migration";
import { Migration1705175152800 } from "./migration/1705175152800-migration";
import { Migration1708524891748 } from "./migration/1708524891748-migration";
import { Migration1708525176207 } from "./migration/1708525176207-migration";
import { Migration1708525277927 } from "./migration/1708525277927-migration";

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
    entities: [e.User, e.Role, e.Permission, e.RolePermission],

    subscribers: [],
    migrations: [
        Migration1702919396118,
        Migration1702921481908,
        Migration1702922275248,
        Migration1702923114301,
        Migration1704023268622,
        Migration1704538865031,
        Migration1705168976545,
        Migration1705175152800,
        Migration1708524891748,
        Migration1708525176207,
        Migration1708525277927
    ],
});
