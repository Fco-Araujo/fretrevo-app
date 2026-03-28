import express from "express";
import {
  listarUsuarios,
  criarUsuario,
  atualizarUsuario
} from "../controllers/usuarioController.js";
import { verificarToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/usuarios", verificarToken, listarUsuarios);
router.post("/usuarios", verificarToken, criarUsuario);
router.put("/usuarios/:id", verificarToken, atualizarUsuario);

export default router;