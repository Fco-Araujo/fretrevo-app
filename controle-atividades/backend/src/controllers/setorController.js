import { supabase } from "../config/supabase.js";

function normalizarNomeSetor(nome) {
  return String(nome || "").trim();
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
    const { nome } = req.body;

    const nomeLimpo = normalizarNomeSetor(nome);

    if (!nomeLimpo) {
      return res.status(400).json({ erro: "Nome do setor é obrigatório." });
    }

    const { data: existente, error: erroExistente } = await supabase
      .from("setores")
      .select("id, nome")
      .ilike("nome", nomeLimpo)
      .maybeSingle();

    if (erroExistente) {
      return res.status(500).json({ erro: erroExistente.message });
    }

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

    const nomeFinal = nome !== undefined
      ? normalizarNomeSetor(nome)
      : setorAtual.nome;

    if (!nomeFinal) {
      return res.status(400).json({ erro: "Nome do setor é obrigatório." });
    }

    const { data: duplicado, error: erroDuplicado } = await supabase
      .from("setores")
      .select("id")
      .ilike("nome", nomeFinal)
      .neq("id", id)
      .maybeSingle();

    if (erroDuplicado) {
      return res.status(500).json({ erro: erroDuplicado.message });
    }

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