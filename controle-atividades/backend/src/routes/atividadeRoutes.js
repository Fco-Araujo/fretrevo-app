import express from "express";
import {
  criarAtividade,
  listarAtividades,
  buscarAtividadePorId,
  atualizarAtividade,
  excluirAtividade
} from "../controllers/atividadeController.js";
import { verificarToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", verificarToken, criarAtividade);
router.get("/", verificarToken, listarAtividades);
router.get("/:id", verificarToken, buscarAtividadePorId);
router.put("/:id", verificarToken, atualizarAtividade);
router.delete("/:id", verificarToken, excluirAtividade);

export default router;