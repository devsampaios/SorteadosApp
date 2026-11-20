import type { Disciplina } from "@prisma/client";
import { describe } from "../Helper/Enum";
import { decifrar } from "../Helper/CampoCifrado";
import {
  DiaSemana,
  PapelDisciplina,
  SituacaoMembro,
  type DisciplinaResponse,
  type DisciplinaComArvore,
  type AvaliacaoResponse,
  type AvaliacaoComContextoResponse,
  type AvaliacaoComNota,
  type AvaliacaoComContexto,
  type MembroResponse,
  type DadosUsuarioDisciplina,
  type DisciplinaResumo,
} from "../Model/DisciplinaModel";

// A query filtra `notas` por usuarioId, então há no máximo uma — a do usuário.
const notaDoUsuario = (avaliacao: AvaliacaoComNota): number | null =>
  avaliacao.notas[0] ? Number(avaliacao.notas[0].pontuacaoObtida) : null;

export function BuildAvaliacao(avaliacao: AvaliacaoComNota): AvaliacaoResponse {
  return {
    id: avaliacao.id.toString(),
    nome: avaliacao.nome,
    data: avaliacao.data ? avaliacao.data.toISOString().slice(0, 10) : null,
    pontuacaoMaxima: Number(avaliacao.pontuacaoMaxima),
    minhaNota: notaDoUsuario(avaliacao),
  };
}

export function BuildAvaliacaoComContexto(avaliacao: AvaliacaoComContexto): AvaliacaoComContextoResponse {
  return {
    ...BuildAvaliacao(avaliacao),
    disciplinaId: avaliacao.disciplina.id.toString(),
    disciplinaNome: avaliacao.disciplina.nome,
  };
}

interface ExtrasDisciplina {
  papelDoUsuario?: number | null;
  qtdSolicitacoesPendentes?: number;
}

export function Build(disciplina: DisciplinaComArvore, extras: ExtrasDisciplina = {}): DisciplinaResponse {
  // pontuacaoAtual é a soma das notas do próprio usuário na disciplina.
  const minhaSoma = disciplina.avaliacoes.reduce((soma, a) => soma + (notaDoUsuario(a) ?? 0), 0);
  return {
    id: disciplina.id.toString(),
    codigo: disciplina.codigo,
    nome: disciplina.nome,
    professor: disciplina.professor,
    sala: disciplina.sala,
    cargaHoraria: disciplina.cargaHoraria,
    dataInicio: disciplina.dataInicio ? disciplina.dataInicio.toISOString().slice(0, 10) : null,
    dataFim: disciplina.dataFim ? disciplina.dataFim.toISOString().slice(0, 10) : null,
    pontuacaoAtual: minhaSoma,
    qtdPresencas: disciplina.presencas.length,
    horarios: disciplina.horarios.map((horario) => ({
      id: horario.id.toString(),
      diaSemana: describe(DiaSemana, horario.diaSemana),
      horaInicio: horario.horaInicio,
      horaFim: horario.horaFim,
    })),
    avaliacoes: disciplina.avaliacoes.map(BuildAvaliacao),
    papelDoUsuario: describe(PapelDisciplina, extras.papelDoUsuario ?? null),
    qtdSolicitacoesPendentes: extras.qtdSolicitacoesPendentes ?? 0,
  };
}

// Resumo da disciplina para embutir na resposta de usuário.
export function BuildResumo(disciplina: Disciplina): DisciplinaResumo {
  return {
    id: disciplina.id.toString(),
    codigo: disciplina.codigo,
    nome: disciplina.nome,
    professor: disciplina.professor,
    sala: disciplina.sala,
    cargaHoraria: disciplina.cargaHoraria,
  };
}

export function BuildMembro(dados: DadosUsuarioDisciplina): MembroResponse {
  return {
    usuarioId: dados.usuarioId.toString(),
    nome: decifrar(dados.nome),
    email: dados.email,
    papel: describe(PapelDisciplina, dados.papel),
    situacao: describe(SituacaoMembro, dados.situacao),
    criadoEm: dados.criadoEm.toISOString(),
  };
}
