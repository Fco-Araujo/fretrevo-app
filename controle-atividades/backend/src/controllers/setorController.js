import { supabase } from "../config/supabase.js";

function validarAdmin(req, res) {
  if (req.usuario.perfil !== "admin") {
    res.status(403).json({ erro: "Acesso negado." });
    return false;
  }
  return true;
}

export async function listarSetores(req, res) {
  try {
    const { data, error } = await supabase
      .from("setores")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      return res.status(500).json({ erro: error.message });
    }

    return res.json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: "Erro ao listar setores." });
  }
}

export async function criarSetor(req, res) {
  try {
    if (!validarAdmin(req, res)) return;

    const { nome } = req.body;

    if (!nome || !nome.trim()) {
      return res.status(400).json({ erro: "Nome do setor é obrigatório." });
    }

    const nomeLimpo = nome.trim();

    const { data: existente } = await supabase
      .from("setores")
      .select("id")
      .ilike("nome", nomeLimpo)
      .maybeSingle();

    if (existente) {
      return res.status(400).json({ erro: "Já existe um setor com esse nome." });
    }

    const { data, error } = await supabase
      .from("setores")
      .insert([
        {
          nome: nomeLimpo,
          ativo: true
        }
      ])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ erro: error.message });
    }

    return res.status(201).json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: "Erro ao criar setor." });
  }
}

export async function atualizarSetor(req, res) {
  try {
    if (!validarAdmin(req, res)) return;

    const { id } = req.params;
    const { nome, ativo } = req.body;

    const { data: setorAtual, error: erroBusca } = await supabase
      .from("setores")
      .select("*")
      .eq("id", id)
      .single();

    if (erroBusca || !setorAtual) {
      return res.status(404).json({ erro: "Setor não encontrado." });
    }

    const nomeFinal = nome?.trim() ?? setorAtual.nome;

    if (!nomeFinal) {
      return res.status(400).json({ erro: "Nome do setor é obrigatório." });
    }

    const { data: duplicado } = await supabase
      .from("setores")
      .select("id")
      .ilike("nome", nomeFinal)
      .neq("id", id)
      .maybeSingle();

    if (duplicado) {
      return res.status(400).json({ erro: "Já existe um setor com esse nome." });
    }

    const dadosAtualizados = {
      nome: nomeFinal,
      ativo: typeof ativo === "boolean" ? ativo : setorAtual.ativo
    };

    const { data, error } = await supabase
      .from("setores")
      .update(dadosAtualizados)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ erro: error.message });
    }

    return res.json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: "Erro ao atualizar setor." });
  }
}