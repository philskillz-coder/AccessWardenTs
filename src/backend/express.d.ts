import { Request } from "express";

import { AppDataSource } from "./database/data-source";
export type CRequest = Request & { appDataSource?: typeof AppDataSource };
