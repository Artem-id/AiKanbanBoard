const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { searchUsers, findByEmail } = require("../controllers/userController");

const router = express.Router();

router.get("/search", requireAuth, searchUsers);
router.get("/find", requireAuth, findByEmail);

module.exports = router;