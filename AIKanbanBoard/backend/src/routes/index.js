const express = require("express");
const authRouters = require("./authRoutes");

const router = express.Router();

router.get("/health", (_req, res) => res.json({ status: "ok" }));
router.use("/auth",authRouters);

module.exports = router;