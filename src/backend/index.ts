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

import ApiRouter from "./api-router";
import assetsRouter from "./assets-router";
import { AppDataSource } from "./database/data-source";
import { User } from "./database/entity/User";
import { CRequest } from "./express";

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
console.log(`Running in ${isDev ? "development" : "production"} mode`);

const distFolder = isDev ? path.join(__dirname, "..", "..", "public") : path.join(__dirname, "..", "..", "dist");
// const ensureAuthenticated = (req, res, next) => {
//     if (req.isAuthenticated()) return next();
//     res.redirect("/api/auth");
// };
app.use(express.static(distFolder));
// app.get("*", (req, res) => {
//     res.sendFile(path.join(distFolder, "index.html"));
// });
// app.get("/", ensureAuthenticated, (req, res) => res.sendFile(path.join(distFolder, "index.html")));


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
        console.log("Postgres Client started");

        // Inject AppDataSource into the request object
        app.use((req: CRequest, res, next) => {
            req.appDataSource = AppDataSource;
            next();
        });

        // Use the API router
        app.use("/api", ApiRouter);
        app.use("/src", assetsRouter);

        // Start the server
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error(`Error initializing PostgreSQL: ${err}`);
    });

const SERVER_PORT = Number(process.env.PORT) || 5050;
app.listen(SERVER_PORT, () => {
    console.log(`Server started on port ${SERVER_PORT}`);
    // DB.then(() => console.log("MongoDB Client started")).catch(err => console.log(err));
});
// export const WSS = new WebSocketServer(server);
