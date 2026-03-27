import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { supabase } from "../config/supabase.js";

export async function criarAdmin(req, res) {
  try {
    const { nome, username, senha } = req.body;

    if (!nome || !username || !senha) {
      return res.status(400).json({
        erro: "Nome, username e senha são obrigatórios."
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
          perfil: "admin",
          ativo: true
        }
      ])
      .select();

    if (error) {
      return res.status(500).json({
        erro: error.message
      });
    }

    const usuarioCriado = data[0];

    return res.status(201).json({
      mensagem: "Administrador criado com sucesso.",
      usuario: {
        id: usuarioCriado.id,
        nome: usuarioCriado.nome,
        username: usuarioCriado.username,
        perfil: usuarioCriado.perfil,
        ativo: usuarioCriado.ativo,
        criado_em: usuarioCriado.criado_em
      }
    });
  } catch (err) {
    return res.status(500).json({
      erro: "Erro interno no servidor."
    });
  }
}

export async function login(req, res) {
  try {
    const { username, senha } = req.body;

    if (!username || !senha) {
      return res.status(400).json({
        erro: "Username e senha são obrigatórios."
      });
    }

    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("username", username)
      .single();

    if (error || !data) {
      return res.status(401).json({
        erro: "Usuário ou senha inválidos."
      });
    }

    if (!data.ativo) {
      return res.status(403).json({
        erro: "Usuário inativo."
      });
    }

    const senhaCorreta = await bcrypt.compare(senha, data.senha_hash);

    if (!senhaCorreta) {
      return res.status(401).json({
        erro: "Usuário ou senha inválidos."
      });
    }

    const token = jwt.sign(
      {
        id: data.id,
        nome: data.nome,
        username: data.username,
        perfil: data.perfil
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.status(200).json({
      mensagem: "Login realizado com sucesso.",
      token,
      usuario: {
        id: data.id,
        nome: data.nome,
        username: data.username,
        perfil: data.perfil
      }
    });
  } catch (err) {
    return res.status(500).json({
      erro: "Erro interno no servidor."
    });
  }
}