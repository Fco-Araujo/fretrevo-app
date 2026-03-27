import express from "express";
import { criarAdmin, login } from "../controllers/authController.js";

const router = express.Router();

router.post("/criar-admin", criarAdmin);
router.post("/login", login);

export default router;