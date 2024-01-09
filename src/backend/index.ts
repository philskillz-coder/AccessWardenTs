import logger from "@shared/Logger";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import session from "express-session";
import morgan from "morgan";
import passport from "passport";
import path from "path";
import { createClient } from "redis";
import { promisify } from "util";

import ApiRouter from "./api/api-router";
import assetsRouter from "./assets-router";
import { AppDataSource } from "./database/data-source";
import { Permission } from "./database/entity";
import { User } from "./database/entity/User";
import { PagePermissions } from "./database/required-data";

// import WebSocketServer from "./websocket";

dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

// passport.use(new LocalStrategy((username, password, done) => {
//     // check if username is an email address with regex
//     const isMail = username.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
//     const condition = isMail ? { email: username } : { username: username };

//     AppDataSource.getRepository(User).findOne({ where: condition })
//         .then(user => {
//             if (!user) {
//                 return done(null, false, { message: "Incorrect username." });
//             }

//             if (!verifyHash(password, user.passwordSalt, process.env.HASH_PEPPER, user.passwordHash)) {
//                 return done(null, false, { message: "Incorrect password." });
//             }
//             return done(null, user);
//         })
//         .catch(error => done(error));
// }));

passport.serializeUser((user: any, done) => {
    done(null, `${user.id}-${user.loginSession}`);
});

passport.deserializeUser((data: string, done) => {
    const [idString, session] = data.split("-");
    logger.warn(idString, session);
    const id = Number(idString);

    AppDataSource.getRepository(User)
        .findOne({ where: { id, loginSession: session } })
        .then(user => {
            if (user) {
                done(null, user);
            } else {
                done(null, null); // User not found
            }
        })
        .catch(error => {
            done(error);
        });
});


app.use(morgan("dev"));

// app.use(passport.initialize());
// app.use(passport.session());

export const isDev = process.argv.find(arg => arg === "--dev") !== undefined || process.env.NODE_ENV === "development";
logger.info(`Running in ${isDev ? "development" : "production"} mode`);

const distFolder = isDev ? path.join(__dirname, "..", "..", "public") : path.join(__dirname, "..", "..", "dist");
// app.use(express.static(distFolder));
app.get("*", (req, res) => {
    res.sendFile(path.join(distFolder, "index.html"));
});


const redisClient = createClient({
    url: process.env.REDIS_URL,
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
});
logger.info("Redis client initialized");

export const getAsync = promisify(redisClient.get).bind(redisClient);
export const setAsync = promisify(redisClient.set).bind(redisClient);

AppDataSource.initialize()
    .then(() => {
        logger.info("Postgres Client started");

        // TODO: create required roles if not exist

        // check if all permissions exist
        for (const permission of Object.values(PagePermissions)) {
            AppDataSource.getRepository(Permission).findOne(
                { where: { name: permission } }
            ).then(p => {
                if (!p) {
                    logger.warn(`Permission ${permission} does not exist. Creating it...`);
                    AppDataSource.getRepository(Permission).save({ name: permission, description: "Default app Permission" });
                }
            });
        }
        // Use the API router
        app.use("/api", ApiRouter);
        app.use("/src", assetsRouter);

        // Start the server
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            logger.info(`Server is running on port ${PORT}`);
        });
    })
    .catch(err => {
        logger.error(`Error initializing PostgreSQL: ${err}`);
    });

const SERVER_PORT = Number(process.env.PORT) || 5050;
app.listen(SERVER_PORT, () => {
    logger.info(`Server started on port ${SERVER_PORT}`);
});
// export const WSS = new WebSocketServer(server);
