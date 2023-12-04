import { Router } from "express";
const router = Router();

router.get("/hello", async (req, res) => {
    return res.json({ success: true, message: "Hello World!" });
});

export default router;
