import { useRef, useState } from 'react';
import Form, { type FormState, makeFormHelpers } from '../components/Form';
import FormGroup from '../components/FormGroup';
import { Row, Col } from '../components/Grid';
import BoldLabel from '../components/BoldLabel';
import TextInput from '../components/TextInput';
import SelectInput from '../components/SelectInput';
import DateInput from '../components/DateInput';
import Select from '../components/Select';
import { showError } from '../components/Messages';
import FormDetails from '../components/FormDetails';
import { buildQueryString } from '../utils/helpers';
import {
	enumId,
	enumDescricao,
	opcoesDeEnum,
	PERFIS,
	SITUACOES_USUARIO,
} from '../utils/enum';

interface DisciplinaT {
	id?: string;
	nome: string;
	professor?: string;
	sala?: string;
	cargaHoraria?: number;
}
interface DisciplinaResp {
	id: string;
	nome: string;
	professor: string | null;
	sala: string | null;
	cargaHoraria: number | null;
}

const normalizarDisciplina = (d: Record<string, unknown>): DisciplinaT => ({
	id: d.id != null ? String(d.id) : undefined,
	nome: (d.nome as string) ?? '',
	professor: (d.professor as string) ?? undefined,
	sala: (d.sala as string) ?? undefined,
	cargaHoraria: (d.cargaHoraria as number) ?? undefined,
});

const descricaoDaDisciplina = (d: DisciplinaT): string => (d.professor ? `${d.nome} — ${d.professor}` : d.nome);

// Sub-formulário de disciplinas do usuário (agregado): cada linha é uma
// disciplina EXISTENTE, escolhida pelo Select (busca em /disciplinas). Mantido
// em estado local e sincronizado em itemSelecionado.disciplinas.
function DisciplinasDetail({ disciplinas, onChange }: { disciplinas: DisciplinaT[]; onChange: (d: DisciplinaT[]) => void }) {
	const [rascunho, setRascunho] = useState<DisciplinaT | null>(null);

	return (
		<FormDetails
			titulo='Disciplinas'
			itens={disciplinas}
			colunas={() => [{ titulo: 'Nome' }, { titulo: 'Professor' }, { titulo: 'Sala' }, { titulo: 'Carga' }]}
			linha={(item) => {
				const d = item as DisciplinaT;
				return [d.nome, d.professor ?? '—', d.sala ?? '—', d.cargaHoraria != null ? `${d.cargaHoraria}h` : '—'];
			}}
			novo={async () => setRascunho(null)}
			selecionarParaAlteracao={async (i) => setRascunho({ ...disciplinas[i] })}
			inserir={async () => {
				if (!rascunho?.nome) {
					showError('Selecione uma disciplina.');
					return Promise.reject();
				}
				onChange([...disciplinas, rascunho]);
			}}
			alterar={async (i) => {
				if (!rascunho?.nome) {
					showError('Selecione uma disciplina.');
					return Promise.reject();
				}
				onChange(disciplinas.map((x, j) => (j === i ? rascunho : x)));
			}}
			excluir={(i) => onChange(disciplinas.filter((_, j) => j !== i))}
			formulario={() => (
				<Row>
					<Col sm={12} md={12} lg={12} xl={12}>
						<FormGroup>
							<BoldLabel>Disciplina</BoldLabel>
							<Select<DisciplinaT>
								defaultValue={rascunho}
								getDescription={descricaoDaDisciplina}
								getKeyValue={(d) => d.id ?? d.nome}
								nullText='Buscar disciplina...'
								allowEmpty
								getFilterUrl={(texto) =>
									'/disciplinas' + buildQueryString(8, null, 'id', { searchable: texto })
								}
								onSelect={(value) =>
									setRascunho(value ? normalizarDisciplina(value as unknown as Record<string, unknown>) : null)
								}
							/>
						</FormGroup>
					</Col>
				</Row>
			)}
			textoParaVazio='Nenhuma disciplina'
		/>
	);
}

export default function UsuariosView(props: {
	select?: { aoSelecionar?: (item: unknown, flag?: boolean) => void; aoCancelar?: () => void };
	form?: { aoSelecionar?: (item: unknown, flag?: boolean) => void; aoCancelar?: () => void };
}) {
	const lastFormStateRef = useRef<FormState | null>(null);
	const autoFoco = useRef<HTMLInputElement>(null);

	const formulario = ({ formState, setFormState }: { formState: FormState; setFormState: React.Dispatch<React.SetStateAction<FormState>> }) => {
		lastFormStateRef.current = formState;
		const { setItemSelecionado } = makeFormHelpers(setFormState);

		const item = formState.itemSelecionado ?? {};
		const disciplinas = (item.disciplinas as DisciplinaT[] | undefined) ?? [];

		return (
			<>
				<Row>
					<Col sm={12} md={12} lg={12} xl={12}>
						<FormGroup>
							<BoldLabel>Nome</BoldLabel>
							<TextInput
								ref={autoFoco}
								defaultValue={item.nome as string}
								onChange={(value) => setItemSelecionado({ nome: value })}
							/>
						</FormGroup>
					</Col>
					<Col sm={12} md={12} lg={12} xl={12}>
						<FormGroup>
							<BoldLabel obrigatorio>E-mail</BoldLabel>
							<TextInput
								type='email'
								defaultValue={item.email as string}
								onChange={(value) => setItemSelecionado({ email: value })}
							/>
						</FormGroup>
					</Col>
					<Col sm={12} md={4} lg={4} xl={4}>
						<FormGroup>
							<BoldLabel>Nascimento</BoldLabel>
							<DateInput
								defaultValue={String((item.dataNascimento as string) ?? '').slice(0, 10)}
								onChange={(value) => setItemSelecionado({ dataNascimento: value })}
							/>
						</FormGroup>
					</Col>
					<Col sm={12} md={4} lg={4} xl={4}>
						<FormGroup>
							<BoldLabel>Perfil</BoldLabel>
							<SelectInput
								value={String(item.perfil ?? 2)}
								options={opcoesDeEnum(PERFIS)}
								onChange={(value) => setItemSelecionado({ perfil: Number(value) })}
							/>
						</FormGroup>
					</Col>
					<Col sm={12} md={4} lg={4} xl={4}>
						<FormGroup>
							<BoldLabel>Situação</BoldLabel>
							<SelectInput
								value={String(item.situacao ?? 1)}
								options={opcoesDeEnum(SITUACOES_USUARIO)}
								onChange={(value) => setItemSelecionado({ situacao: Number(value) })}
							/>
						</FormGroup>
					</Col>
					<Col sm={12} md={12} lg={12} xl={12}>
						<DisciplinasDetail disciplinas={disciplinas} onChange={(d) => setItemSelecionado({ disciplinas: d })} />
					</Col>
				</Row>
			</>
		);
	};

	const getPayload = async (formState: FormState) => {
		try {
			const item = formState?.itemSelecionado || {};

			if (!item.email) {
				showError('Informe o e-mail.');
				return Promise.reject();
			}

			// Monta o payload ignorando strings vazias.
			const input: Record<string, unknown> = {};
			for (const [chave, valor] of Object.entries(item)) {
				if (valor === '') continue;
				input[chave] = valor;
			}

			if (formState.alterando) {
				input.id = parseInt(String(item.id));
			}

			return input;
		} catch (e) {
			showError(String(e));
			console.error(e);
			return Promise.reject(e);
		}
	};

	return (
		<Form
			titulo='Usuários'
			url='/usuarios'
			ordenacaoPadrao='id'
			permissao={['MASTER']}
			esconderFiltro
			getTitulosDaTabela={() => [
				{ titulo: 'E-mail', width: '100%', orderby: 'email' },
				{ titulo: 'Nome', orderby: 'nome' },
				{ titulo: 'Perfil' },
				{ titulo: 'Situação' },
			]}
			getDadosDaTabela={(item) => {
				const u = item as Record<string, unknown>;
				return [
					u.email as string,
					(u.nome as string) ?? '—',
					enumDescricao(u.perfil),
					enumDescricao(u.situacao),
				];
			}}
			aposEditar={(state, set) => {
				const it = state.itemSelecionado;
				if (!it) return;
				const disciplinasBrutas = it.disciplinas as DisciplinaResp[] | undefined;
				set((s) => ({
					...s,
					itemSelecionado: {
						...s.itemSelecionado,
						perfil: enumId(it.perfil),
						situacao: enumId(it.situacao),
						disciplinas: (disciplinasBrutas ?? []).map((d) => ({
							id: d.id,
							nome: d.nome,
							professor: d.professor ?? undefined,
							sala: d.sala ?? undefined,
							cargaHoraria: d.cargaHoraria ?? undefined,
						})),
					},
				}));
			}}
			renderizarFormulario={formulario}
			getPayload={getPayload}
			itemVazio={{ email: '', nome: '', dataNascimento: '', perfil: 2, situacao: 1, disciplinas: [] }}
			autoFoco={autoFoco}
			select={props.select}
			form={props.form}
		/>
	);
}
