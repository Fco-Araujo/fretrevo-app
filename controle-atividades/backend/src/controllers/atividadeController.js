import { supabase } from "../config/supabase.js";

export async function criarAtividade(req, res) {
  try {
    const {
      titulo,
      descricao,
      prioridade,
      status,
      prazo,
      tipo,
      origem,
      observacoes,
      setor,
      data_reuniao,
      responsavel_id
    } = req.body;

    const usuario = req.usuario;

    if (!titulo || !String(titulo).trim()) {
      return res.status(400).json({ erro: "Título é obrigatório." });
    }

    const responsavelFinal = responsavel_id || usuario.id;

    const { data, error } = await supabase
      .from("atividades")
      .insert([
        {
          titulo: String(titulo).trim(),
          descricao: descricao ?? null,
          prioridade: prioridade ?? null,
          status: status ?? "pendente",
          prazo: prazo ?? null,
          tipo: tipo ?? null,
          origem: origem ?? null,
          observacoes: observacoes ?? null,
          setor: setor ?? null,
          data_reuniao: data_reuniao ?? null,
          criado_por: usuario.id,
          responsavel_id: responsavelFinal
        }
      ])
      .select(`
        *,
        criador:usuarios!atividades_criado_por_fkey (
          id,
          nome,
          username
        ),
        responsavel:usuarios!atividades_responsavel_id_fkey (
          id,
          nome,
          username
        )
      `);

    if (error) {
      return res.status(500).json({ erro: error.message });
    }

    return res.status(201).json(data[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: "Erro ao criar atividade." });
  }
}

export async function listarAtividades(req, res) {
  try {
    const { data, error } = await supabase
      .from("atividades")
      .select(`
        *,
        criador:usuarios!atividades_criado_por_fkey (
          id,
          nome,
          username
        ),
        responsavel:usuarios!atividades_responsavel_id_fkey (
          id,
          nome,
          username
        )
      `)
      .order("data_criacao", { ascending: false });

    if (error) {
      return res.status(500).json({ erro: error.message });
    }

    return res.json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: "Erro ao listar atividades." });
  }
}

export async function buscarAtividadePorId(req, res) {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("atividades")
      .select(`
        *,
        criador:usuarios!atividades_criado_por_fkey (
          id,
          nome,
          username
        ),
        responsavel:usuarios!atividades_responsavel_id_fkey (
          id,
          nome,
          username
        )
      `)
      .eq("id", id)
      .single();

    if (error || !data) {
      return res.status(404).json({ erro: "Atividade não encontrada." });
    }

    return res.json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: "Erro ao buscar atividade." });
  }
}

export async function atualizarAtividade(req, res) {
  try {
    const { id } = req.params;
    const usuario = req.usuario;

    const {
      titulo,
      descricao,
      prioridade,
      status,
      prazo,
      tipo,
      origem,
      observacoes,
      setor,
      data_reuniao,
      responsavel_id
    } = req.body;

    const { data: atividade, error: erroBusca } = await supabase
      .from("atividades")
      .select("*")
      .eq("id", id)
      .single();

    if (erroBusca || !atividade) {
      return res.status(404).json({ erro: "Atividade não encontrada." });
    }

    const podeEditar =
      usuario.perfil === "admin" ||
      atividade.criado_por === usuario.id ||
      atividade.responsavel_id === usuario.id;

    if (!podeEditar) {
      return res.status(403).json({
        erro: "Você não tem permissão para editar esta atividade."
      });
    }

    const ehAdmin = usuario.perfil === "admin";

    let dadosAtualizados = {};

    if (ehAdmin) {
      dadosAtualizados = {
        titulo: titulo ?? atividade.titulo,
        descricao: descricao ?? atividade.descricao,
        prioridade: prioridade ?? atividade.prioridade,
        status: status ?? atividade.status,
        prazo: prazo ?? atividade.prazo,
        tipo: tipo ?? atividade.tipo,
        origem: origem ?? atividade.origem,
        observacoes: observacoes ?? atividade.observacoes,
        setor: setor ?? atividade.setor,
        responsavel_id: responsavel_id ?? atividade.responsavel_id,
        data_reuniao:
          data_reuniao !== undefined ? data_reuniao : atividade.data_reuniao
      };
    } else {
      dadosAtualizados = {
        prioridade: prioridade ?? atividade.prioridade,
        status: status ?? atividade.status,
        tipo: tipo ?? atividade.tipo,
        observacoes: observacoes ?? atividade.observacoes,
        setor: setor ?? atividade.setor,
        responsavel_id: responsavel_id ?? atividade.responsavel_id,
        data_reuniao:
          data_reuniao !== undefined ? data_reuniao : atividade.data_reuniao
      };
    }

    const statusFinal = String(dadosAtualizados.status || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

    if (statusFinal === "concluida") {
      dadosAtualizados.data_conclusao = new Date().toISOString();
    } else {
      dadosAtualizados.data_conclusao = null;
    }

    const { data, error } = await supabase
      .from("atividades")
      .update(dadosAtualizados)
      .eq("id", id)
      .select(`
        *,
        criador:usuarios!atividades_criado_por_fkey (
          id,
          nome,
          username
        ),
        responsavel:usuarios!atividades_responsavel_id_fkey (
          id,
          nome,
          username
        )
      `);

    if (error) {
      return res.status(500).json({ erro: error.message });
    }

    return res.json(data[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: "Erro ao atualizar atividade." });
  }
}

export async function excluirAtividade(req, res) {
  try {
    const { id } = req.params;
    const usuario = req.usuario;

    if (usuario.perfil !== "admin") {
      return res.status(403).json({
        erro: "Somente administradores podem excluir atividades."
      });
    }

    const { data: atividade, error: erroBusca } = await supabase
      .from("atividades")
      .select("*")
      .eq("id", id)
      .single();

    if (erroBusca || !atividade) {
      return res.status(404).json({ erro: "Atividade não encontrada." });
    }

    const { error } = await supabase
      .from("atividades")
      .delete()
      .eq("id", id);

    if (error) {
      return res.status(500).json({ erro: error.message });
    }

    return res.json({ mensagem: "Atividade excluída com sucesso." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: "Erro ao excluir atividade." });
  }
}