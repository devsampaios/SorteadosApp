import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Row, Col } from "react-bootstrap";
import { ArrowDown, ArrowUp } from "lucide-react";
import api from "../service/Api";
import { useToast } from "../toast/ToastContext";
import { Button, Checkbox, CurrencyInput, DateInput, FormModal, IntegerInput, SelectInput, TextInput } from "./utils";
import { parseValorBR } from "../utils/moeda";
import { competenciaDaData, opcoesFatura } from "../utils/fatura";
import { EH_CREDITO, type FormaPagamento, type Origem, type Pessoa, type TipoLancamento } from "../types/dominio";

const hoje = () => new Date().toISOString().slice(0, 10);

// Combina origens e pessoas num único select, prefixando o valor pra saber de qual
// tabela veio na hora de montar o payload (origemId xor pessoaId).
const PREFIXO_ORIGEM = "origem:";
const PREFIXO_PESSOA = "pessoa:";

interface FormState extends Record<string, string> {
  valor: string;
  tipo: TipoLancamento;
  formaPagamentoId: string;
  origemSelecionada: string;
  descricao: string;
  dataLancamento: string;
  parcelamento: string;
  parcelas: string;
  /** "true"/"false" — não é salvo, só liga a repetição no backend */
  repetir: string;
  repetirMeses: string;
  /** Fatura destino ("2026-08"); só cartão de crédito com fechamento */
  competenciaFatura: string;
}

const FORM_VAZIO: FormState = {
  valor: "",
  tipo: "SAIDA",
  formaPagamentoId: "",
  origemSelecionada: "",
  descricao: "",
  dataLancamento: hoje(),
  parcelamento: "unica",
  parcelas: "",
  repetir: "false",
  repetirMeses: "1",
  competenciaFatura: "",
};

interface LancamentoRapidoProps {
  formasPagamento: FormaPagamento[];
  origens: Origem[];
  pessoas: Pessoa[];
  /** Chamado após salvar com sucesso, para o chamador atualizar seus próprios dados */
  onSalvo?: () => void;
}

export function LancamentoRapido({ formasPagamento, origens, pessoas, onSalvo }: LancamentoRapidoProps) {
  const { showError, showSuccess } = useToast();
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);

  const formasAtivas = useMemo(() => formasPagamento.filter((f) => f.ativo), [formasPagamento]);
  const origensAtivas = useMemo(() => origens.filter((o) => o.ativo), [origens]);
  const pessoasAtivas = useMemo(() => pessoas.filter((p) => p.ativo), [pessoas]);

  const origemOpcoes = useMemo(() => [
    ...origensAtivas.map((o) => ({ value: `${PREFIXO_ORIGEM}${o.id}`, label: o.nome, grupo: "Origens" })),
    ...pessoasAtivas.map((p) => ({ value: `${PREFIXO_PESSOA}${p.id}`, label: p.nome, grupo: "Pessoas" })),
  ], [origensAtivas, pessoasAtivas]);

  const set = (campo: keyof FormState, valor: string) => setForm((p) => ({ ...p, [campo]: valor }));

  // Parcelamento só é liberado quando a forma escolhida permite.
  const permiteParcelar = useMemo(
    () => formasAtivas.find((f) => f.id === form.formaPagamentoId)?.permiteParcelamento ?? false,
    [formasAtivas, form.formaPagamentoId]
  );

  // Trocar pra uma forma que não parcela precisa desfazer o parcelamento que
  // já estava escolhido, senão o form enviaria parcelas num cartão que não aceita.
  const trocarForma = (formaPagamentoId: string) => {
    const permite = formasAtivas.find((f) => f.id === formaPagamentoId)?.permiteParcelamento ?? false;
    setForm((p) => ({
      ...p,
      formaPagamentoId,
      ...(permite ? {} : { parcelamento: "unica", parcelas: "" }),
    }));
  };

  const parcelado = form.parcelamento === "parcelado" && permiteParcelar;
  const repetindo = form.repetir === "true";

  // Fatura destino: só cartão de crédito com fechamento/vencimento; some no
  // parcelado/repetido (cada lançamento cai numa fatura pela própria data).
  const cartaoFatura = useMemo(() => {
    const f = formasAtivas.find((x) => x.id === form.formaPagamentoId);
    return f && EH_CREDITO(f.tipo) && f.diaFechamento != null && f.diaVencimento != null ? f : null;
  }, [formasAtivas, form.formaPagamentoId]);
  const mostrarFatura = !!cartaoFatura && !parcelado && !repetindo;
  const opcoesDeFatura = useMemo(
    () => (cartaoFatura ? opcoesFatura(form.dataLancamento, cartaoFatura.diaFechamento!, cartaoFatura.diaVencimento!) : []),
    [cartaoFatura, form.dataLancamento]
  );

  // Auto-preenche a competência conforme a data/cartão. Roda quando a data ou o
  // cartão muda; a escolha manual dura até um desses mudar de novo.
  useEffect(() => {
    if (!cartaoFatura) return;
    setForm((p) => ({ ...p, competenciaFatura: competenciaDaData(p.dataLancamento, cartaoFatura.diaFechamento!) }));
  }, [cartaoFatura, form.dataLancamento]);

  const abrirModal = (tipo: TipoLancamento) => {
    setForm({ ...FORM_VAZIO, tipo });
    setModalAberto(true);
  };

  const salvar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const valor = parseValorBR(form.valor);
    if (!valor || valor <= 0) { showError("Informe um valor válido"); return; }
    if (!form.formaPagamentoId) { showError("Selecione a forma de pagamento"); return; }
    if (!form.origemSelecionada) { showError("Selecione a origem"); return; }

    const parcelas = parcelado ? Number(form.parcelas) : undefined;
    if (parcelado && (!parcelas || parcelas < 2)) {
      showError("Informe o número de parcelas (mínimo 2)");
      return;
    }

    const repetirMeses = repetindo ? Number(form.repetirMeses) : undefined;
    if (repetindo && (!repetirMeses || repetirMeses < 1)) {
      showError("Informe por quantos meses repetir (mínimo 1)");
      return;
    }

    const origemId = form.origemSelecionada.startsWith(PREFIXO_ORIGEM) ? form.origemSelecionada.slice(PREFIXO_ORIGEM.length) : undefined;
    const pessoaId = form.origemSelecionada.startsWith(PREFIXO_PESSOA) ? form.origemSelecionada.slice(PREFIXO_PESSOA.length) : undefined;

    setSalvando(true);
    try {
      await api.post("/lancamentos", {
        valor,
        tipo: form.tipo,
        formaPagamentoId: form.formaPagamentoId,
        ...(origemId ? { origemId } : { pessoaId }),
        descricao: form.descricao || undefined,
        dataLancamento: form.dataLancamento,
        ...(mostrarFatura && form.competenciaFatura ? { competenciaFatura: form.competenciaFatura } : {}),
        ...(parcelas ? { parcelas } : {}),
        ...(repetirMeses ? { repetirMeses } : {}),
      });
      showSuccess(
        parcelado
          ? `Lançamento parcelado em ${parcelas}x registrado!`
          : repetirMeses
            ? `Lançamento registrado e repetido por ${repetirMeses} ${repetirMeses === 1 ? "mês" : "meses"}!`
            : "Lançamento registrado!"
      );
      setModalAberto(false);
      onSalvo?.();
    } catch (err) {
      showError((err as { message?: string })?.message ?? "Não foi possível salvar o lançamento");
    } finally {
      setSalvando(false);
    }
  };

  if (formasAtivas.length === 0 || (origensAtivas.length === 0 && pessoasAtivas.length === 0)) {
    return (
      <p style={{ color: "var(--cor-texto-suave)", fontSize: 13 }}>
        Cadastre pelo menos uma forma de pagamento e uma origem (ou pessoa) antes de lançar.
      </p>
    );
  }

  return (
    <>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Button
          label="Nova entrada"
          variant="success"
          fullWidth={false}
          iconLeft={<ArrowUp size={16} />}
          onClick={() => abrirModal("ENTRADA")}
        />
        <Button
          label="Nova saída"
          variant="danger"
          fullWidth={false}
          iconLeft={<ArrowDown size={16} />}
          onClick={() => abrirModal("SAIDA")}
        />
      </div>

      <FormModal
        open={modalAberto}
        title={form.tipo === "ENTRADA" ? "Nova entrada" : "Nova saída"}
        submitLabel="Adicionar"
        onSubmit={salvar}
        onClose={() => setModalAberto(false)}
        loading={salvando}
      >
        <Row className="g-3">
          <Col md={12} xs={12}>
            <TextInput
              name="descricao"
              label="Título do lançamento"
              value={form.descricao}
              onChange={(valor) => set("descricao", valor)}
              placeholder="Ex: Supermercado"
            />
          </Col>
          <Col md={6} xs={12}>
            <SelectInput
              name="tipo"
              label="Tipo"
              value={form.tipo}
              onChange={(valor) => set("tipo", valor)}
              options={[{ value: "SAIDA", label: "Saída" }, { value: "ENTRADA", label: "Entrada" }]}
              required
            />
          </Col>
          <Col md={6} xs={12}>
            <CurrencyInput name="valor" label="Valor total" value={form.valor} onChange={(valor) => set("valor", valor)} required />
          </Col>
          <Col md={6} xs={12}>
            <SelectInput
              name="formaPagamentoId"
              label="Forma de pagamento"
              value={form.formaPagamentoId}
              onChange={trocarForma}
              options={formasAtivas.map((f) => ({ value: f.id, label: f.nome }))}
              placeholderOption="Selecione"
              required
            />
          </Col>
          <Col md={6} xs={12}>
            <SelectInput
              name="origemSelecionada"
              label="Origem"
              value={form.origemSelecionada}
              onChange={(valor) => set("origemSelecionada", valor)}
              options={origemOpcoes}
              placeholderOption="Selecione"
              required
            />
          </Col>
          {/* Marcado, divide a linha com a quantidade de meses; desmarcado,
              ocupa a linha inteira pra data não subir e colar no checkbox. */}
          <Col md={repetindo ? 6 : 12} xs={12} className="d-flex align-items-center">
            <Checkbox
              name="repetir"
              label="Repetir nos próximos meses"
              description="Repete este mesmo lançamento, com o valor cheio, a cada 30 dias."
              checked={repetindo}
              disabled={parcelado}
              onChange={(marcado) => set("repetir", marcado ? "true" : "false")}
              style={{ marginBottom: 0 }}
            />
          </Col>
          {repetindo && (
            <Col md={6} xs={12}>
              <IntegerInput
                name="repetirMeses"
                label="Repetir por quantos meses"
                value={form.repetirMeses}
                onChange={(valor) => set("repetirMeses", valor.slice(0, 2))}
                placeholder="1 = também no próximo mês"
                min={1}
                max={60}
              />
            </Col>
          )}
          {/* Parcelado, os três dividem a linha (4+4+4); à vista, data e
              parcelamento ficam com meia linha cada. */}
          <Col md={parcelado ? 4 : 6} xs={12}>
            <DateInput name="dataLancamento" label="Data da compra" value={form.dataLancamento} onChange={(valor) => set("dataLancamento", valor)} max={hoje()} required />
          </Col>
          <Col md={parcelado ? 4 : 6} xs={12}>
            <SelectInput
              name="parcelamento"
              label="Parcelamento"
              value={form.parcelamento}
              onChange={(valor) => set("parcelamento", valor)}
              options={[{ value: "unica", label: "À vista" }, { value: "parcelado", label: "Parcelado (a cada 30 dias)" }]}
              // Só libera quando a forma de pagamento aceita parcelar; fora
              // isso fica travado em "À vista".
              disabled={!permiteParcelar || repetindo}
            />
          </Col>
          {parcelado && (
            <Col md={4} xs={12}>
              <IntegerInput
                name="parcelas"
                label="Número de parcelas"
                value={form.parcelas}
                onChange={(valor) => set("parcelas", valor.slice(0, 2))}
                placeholder="Ex: 3"
                min={2}
                max={48}
              />
            </Col>
          )}
          {mostrarFatura && (
            <Col md={12} xs={12}>
              <SelectInput
                name="competenciaFatura"
                label="Fatura destino"
                value={form.competenciaFatura}
                onChange={(valor) => set("competenciaFatura", valor)}
                options={opcoesDeFatura}
              />
            </Col>
          )}
        </Row>
      </FormModal>
    </>
  );
}
