import express from "express";
import {
  listarSetores,
  criarSetor,
  atualizarSetor
} from "../controllers/setorController.js";
import { verificarToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/setores", verificarToken, listarSetores);
router.post("/setores", verificarToken, criarSetor);
router.put("/setores/:id", verificarToken, atualizarSetor);

export default router;