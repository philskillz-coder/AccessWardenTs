const router = require("express").Router();

const fileRegex = /\.(svg|png|jpe?g|mp4|ogv)$/i;
router.get(fileRegex, (req, res) => {
    const { path } = req;
    if (fileRegex.test(path)) res.redirect(303, `http://localhost:3000/src${path}`);
    else res.sendStatus(404);
});

export default router;
