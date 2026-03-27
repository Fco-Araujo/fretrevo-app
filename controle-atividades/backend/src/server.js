import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { supabase } from "./config/supabase.js";
import authRoutes from "./routes/authRoutes.js";
import atividadeRoutes from "./routes/atividadeRoutes.js";
import { verificarToken } from "./middleware/authMiddleware.js";

dotenv.config();

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

app.use("/auth", authRoutes);
app.use("/atividades", atividadeRoutes);

app.get("/", (req, res) => {
  res.send("API rodando 🚀");
});

app.get("/teste-banco", async (req, res) => {
  const { data, error } = await supabase.from("usuarios").select("*");

  if (error) {
    return res.status(500).json({ erro: error.message });
  }

  return res.json(data);
});

app.get("/rota-protegida", verificarToken, (req, res) => {
  return res.json({
    mensagem: "Você acessou uma rota protegida com sucesso.",
    usuario: req.usuario
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});