import bcrypt from "bcrypt";
import { supabase } from "../config/supabase.js";

function validarAdmin(req, res) {
  if (req.usuario.perfil !== "admin") {
    res.status(403).json({ erro: "Acesso negado." });
    return false;
  }
  return true;
}

export async function listarUsuarios(req, res) {
  try {
    const { data, error } = await supabase
      .from("usuarios")
      .select("id, nome, username, perfil, ativo, criado_em")
      .order("nome", { ascending: true });

    if (error) {
      return res.status(500).json({ erro: error.message });
    }

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ erro: "Erro ao listar usuários." });
  }
}

export async function criarUsuario(req, res) {
  try {
    if (!validarAdmin(req, res)) return;

    const { nome, username, senha, perfil, ativo } = req.body;

    if (!nome || !username || !senha || !perfil) {
      return res.status(400).json({
        erro: "Nome, username, senha e perfil são obrigatórios."
      });
    }

    if (!["admin", "comum"].includes(perfil)) {
      return res.status(400).json({
        erro: "Perfil inválido."
      });
    }

    const senha_hash = await bcrypt.hash(senha, 10);

    const { data, error } = await supabase
      .from("usuarios")
      .insert([
        {
          nome,
          username,
          senha_hash,
          perfil,
          ativo: ativo ?? true
        }
      ])
      .select("id, nome, username, perfil, ativo, criado_em");

    if (error) {
      return res.status(500).json({ erro: error.message });
    }

    return res.status(201).json(data[0]);
  } catch (err) {
    return res.status(500).json({ erro: "Erro ao criar usuário." });
  }
}

export async function atualizarUsuario(req, res) {
  try {
    if (!validarAdmin(req, res)) return;

    const { id } = req.params;
    const { nome, username, perfil, ativo, senha } = req.body;

    const { data: usuarioAtual, error: erroBusca } = await supabase
      .from("usuarios")
      .select("*")
      .eq("id", id)
      .single();

    if (erroBusca || !usuarioAtual) {
      return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    const dadosAtualizados = {
      nome: nome ?? usuarioAtual.nome,
      username: username ?? usuarioAtual.username,
      perfil: perfil ?? usuarioAtual.perfil,
      ativo: typeof ativo === "boolean" ? ativo : usuarioAtual.ativo
    };

    if (
      dadosAtualizados.perfil &&
      !["admin", "comum"].includes(dadosAtualizados.perfil)
    ) {
      return res.status(400).json({ erro: "Perfil inválido." });
    }

    if (senha && senha.trim()) {
      dadosAtualizados.senha_hash = await bcrypt.hash(senha, 10);
    }

    const { data, error } = await supabase
      .from("usuarios")
      .update(dadosAtualizados)
      .eq("id", id)
      .select("id, nome, username, perfil, ativo, criado_em");

    if (error) {
      return res.status(500).json({ erro: error.message });
    }

    return res.json(data[0]);
  } catch (err) {
    return res.status(500).json({ erro: "Erro ao atualizar usuário." });
  }
}