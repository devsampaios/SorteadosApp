import { useRef, useState } from 'react';
import { Users, ClipboardCheck, Plus, X } from 'lucide-react';
import Form, { type FormState, type FormHandle, makeFormHelpers } from '../components/Form';
import { Row, Col } from '../components/Grid';
import FormGroup from '../components/FormGroup';
import BoldLabel from '../components/BoldLabel';
import TextInput from '../components/TextInput';
import SelectInput from '../components/SelectInput';
import DateInput from '../components/DateInput';
import FormDetails from '../components/FormDetails';
import { FormModal } from '../components/utils';
import DisciplinaMembros from '../components/DisciplinaMembros';
import { showError } from '../components/Messages';
import api from '../service/Api';
import { useToast } from '../toast/ToastContext';
import { enumId, descricaoPorId, opcoesDeEnum, DIAS_SEMANA, CARGAS_HORARIAS } from '../utils/enum';

interface HorarioT {
	diaSemana: number;
	horaInicio: string;
	horaFim: string;
}

interface AvaliacaoResp {
	id: string;
	nome: string;
	data: string | null;
	pontuacaoMaxima: number;
}

interface DiscResp {
	id: string;
	codigo: string | null;
	nome: string;
	professor: string | null;
	sala: string | null;
	cargaHoraria: number | null;
	dataInicio: string | null;
	dataFim: string | null;
	horarios: { diaSemana: { id: number } | number | null; horaInicio: string; horaFim: string }[];
	avaliacoes: AvaliacaoResp[];
	papelDoUsuario?: { id?: number } | null;
}

const PAPEL_DONO = 1;

const formatarData = (iso: string | null): string => {
	if (!iso) return '—';
	const [ano, mes, dia] = iso.slice(0, 10).split('-');
	return `${dia}/${mes}/${ano}`;
};

// ----- Formulário de criação/edição da disciplina (dono edita; membro visualiza). -----
function DisciplinaForm({
	formState,
	setFormState,
}: {
	formState: FormState;
	setFormState: React.Dispatch<React.SetStateAction<FormState>>;
}) {
	const { setItemSelecionado } = makeFormHelpers(setFormState);
	const [horarioSelecionado, setHorarioSelecionado] = useState<HorarioT | null>(null);

	const disciplina = formState.itemSelecionado ?? {};
	const horarios = (disciplina.horarios as HorarioT[] | undefined) ?? [];
	const codigoParaConvidar = disciplina.codigo as string | undefined;
	const idDaDisciplina = disciplina.id ? String(disciplina.id) : null;
	const papelDoUsuario = disciplina.papelDoUsuario as { id?: number } | null | undefined;
	const usuarioEhDono = !idDaDisciplina || papelDoUsuario?.id === PAPEL_DONO;

	const alterarHorarios = (novos: HorarioT[]) => setItemSelecionado({ horarios: novos });

	return (
		<>
			{idDaDisciplina && usuarioEhDono && codigoParaConvidar && (
				<Row>
					<Col sm={12} md={12} lg={12} xl={12}>
						<div className='card' style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
							<div>
								<div style={{ fontSize: 12, color: 'var(--cor-texto-suave)' }}>Código para convidar</div>
								<div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 2 }}>{codigoParaConvidar}</div>
							</div>
							<span style={{ fontSize: 12, color: 'var(--cor-texto-suave)', maxWidth: 260 }}>
								Compartilhe este código para que outras pessoas solicitem participação.
							</span>
						</div>
					</Col>
				</Row>
			)}

			{idDaDisciplina && !usuarioEhDono && (
				<Row>
					<Col sm={12} md={12} lg={12} xl={12}>
						<div className='card' style={{ fontSize: 13, color: 'var(--cor-texto-suave)' }}>
							Você participa desta disciplina como membro. Apenas o dono pode editá-la.
						</div>
					</Col>
				</Row>
			)}

			<Row>
				<Col sm={12} md={12} lg={12} xl={12}>
					<FormGroup>
						<BoldLabel obrigatorio>Nome</BoldLabel>
						<TextInput defaultValue={disciplina.nome as string} onChange={(value) => setItemSelecionado({ nome: value })} />
					</FormGroup>
				</Col>
			</Row>

			<Row>
				<Col sm={12} md={4} lg={4} xl={4}>
					<FormGroup>
						<BoldLabel>Professor</BoldLabel>
						<TextInput defaultValue={disciplina.professor as string} onChange={(value) => setItemSelecionado({ professor: value })} />
					</FormGroup>
				</Col>
				<Col sm={12} md={4} lg={4} xl={4}>
					<FormGroup>
						<BoldLabel>Sala</BoldLabel>
						<TextInput defaultValue={disciplina.sala as string} onChange={(value) => setItemSelecionado({ sala: value })} />
					</FormGroup>
				</Col>
				<Col sm={12} md={4} lg={4} xl={4}>
					<FormGroup>
						<BoldLabel>Carga horária</BoldLabel>
						<SelectInput
							value={disciplina.cargaHoraria != null ? String(disciplina.cargaHoraria) : ''}
							options={opcoesDeEnum(CARGAS_HORARIAS)}
							placeholder='Selecione…'
							onChange={(value) => setItemSelecionado({ cargaHoraria: value ? Number(value) : undefined })}
						/>
					</FormGroup>
				</Col>
			</Row>

			<Row>
				<Col sm={12} md={6} lg={6} xl={6}>
					<FormGroup>
						<BoldLabel>Início do período</BoldLabel>
						<DateInput
							defaultValue={(disciplina.dataInicio as string) ?? ''}
							onChange={(value) => setItemSelecionado({ dataInicio: value })}
						/>
					</FormGroup>
				</Col>
				<Col sm={12} md={6} lg={6} xl={6}>
					<FormGroup>
						<BoldLabel>Fim do período</BoldLabel>
						<DateInput
							defaultValue={(disciplina.dataFim as string) ?? ''}
							onChange={(value) => setItemSelecionado({ dataFim: value })}
						/>
					</FormGroup>
				</Col>
			</Row>

			<Row>
				<Col sm={12} md={12} lg={12} xl={12}>
					<FormDetails
						titulo='Horários'
						itens={horarios}
						colunas={() => [{ titulo: 'Dia' }, { titulo: 'Início' }, { titulo: 'Fim' }]}
						linha={(item) => {
							const horario = item as HorarioT;
							return [descricaoPorId(DIAS_SEMANA, horario.diaSemana), horario.horaInicio, horario.horaFim];
						}}
						novo={async () => {
							setHorarioSelecionado({ diaSemana: 1, horaInicio: '', horaFim: '' });
						}}
						cancelar={() => setHorarioSelecionado(null)}
						selecionarParaAlteracao={async (indice) => {
							setHorarioSelecionado({ ...horarios[indice] });
						}}
						inserir={async () => {
							if (!horarioSelecionado?.horaInicio || !horarioSelecionado?.horaFim) {
								showError('Informe o horário de início e fim.');
								return Promise.reject();
							}
							alterarHorarios([...horarios, horarioSelecionado]);
						}}
						alterar={async (indice) => {
							if (!horarioSelecionado?.horaInicio || !horarioSelecionado?.horaFim) {
								showError('Informe o horário de início e fim.');
								return Promise.reject();
							}
							alterarHorarios(horarios.map((horario, i) => (i === indice ? horarioSelecionado : horario)));
						}}
						excluir={(indice) => {
							alterarHorarios(horarios.filter((_, i) => i !== indice));
						}}
						formulario={() =>
							horarioSelecionado && (
								<Row>
									<Col sm={12} md={4} lg={4} xl={4}>
										<FormGroup>
											<BoldLabel>Dia</BoldLabel>
											<SelectInput
												value={String(horarioSelecionado.diaSemana)}
												options={opcoesDeEnum(DIAS_SEMANA)}
												onChange={(value) => setHorarioSelecionado({ ...horarioSelecionado, diaSemana: Number(value) })}
											/>
										</FormGroup>
									</Col>
									<Col sm={12} md={4} lg={4} xl={4}>
										<FormGroup>
											<BoldLabel>Início</BoldLabel>
											<TextInput type='time' value={horarioSelecionado.horaInicio} onChange={(value) => setHorarioSelecionado({ ...horarioSelecionado, horaInicio: value })} />
										</FormGroup>
									</Col>
									<Col sm={12} md={4} lg={4} xl={4}>
										<FormGroup>
											<BoldLabel>Fim</BoldLabel>
											<TextInput type='time' value={horarioSelecionado.horaFim} onChange={(value) => setHorarioSelecionado({ ...horarioSelecionado, horaFim: value })} />
										</FormGroup>
									</Col>
								</Row>
							)
						}
						textoParaVazio='Nenhum horário'
					/>
				</Col>
			</Row>
		</>
	);
}

// ----- Modal de avaliações (qualquer membro cria/lista). -----
function AvaliacoesModal({
	disciplina,
	onFechar,
	onAtualizar,
}: {
	disciplina: DiscResp;
	onFechar: () => void;
	onAtualizar: () => void;
}) {
	const { showSuccess } = useToast();
	const [mostrarForm, setMostrarForm] = useState(false);
	const [nome, setNome] = useState('');
	const [data, setData] = useState('');
	const [pontuacao, setPontuacao] = useState('');
	const [salvando, setSalvando] = useState(false);

	const cadastrar = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!nome.trim()) {
			showError('Informe o nome da avaliação.');
			return;
		}
		setSalvando(true);
		try {
			await api.post(`/disciplinas/${disciplina.id}/avaliacoes`, {
				nome: nome.trim(),
				data: data || undefined,
				pontuacaoMaxima: Number(pontuacao || 0),
			});
			showSuccess('Avaliação cadastrada.');
			setNome('');
			setData('');
			setPontuacao('');
			setMostrarForm(false);
			onAtualizar();
		} catch {
			// erro já reportado pela Api
		} finally {
			setSalvando(false);
		}
	};

	return (
		<div className='u-modal-overlay' onClick={onFechar}>
			<div className='u-modal' onClick={(e) => e.stopPropagation()}>
				<div className='u-modal__header'>
					<div>
						<div className='u-modal__titulo'>Avaliações</div>
						<div className='u-modal__desc'>{disciplina.nome}</div>
					</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
						<button type='button' className='btn btn--primario btn--sm' onClick={() => setMostrarForm((v) => !v)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
							<Plus size={16} /> Nova avaliação
						</button>
						<button type='button' className='u-modal__fechar' onClick={onFechar}>
							<X size={16} />
						</button>
					</div>
				</div>
				<div className='u-modal__body'>
					{mostrarForm && (
						<form onSubmit={cadastrar} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12, border: '1px solid var(--cor-borda)', borderRadius: 'var(--raio)', background: 'var(--cor-fundo)', marginBottom: 16 }}>
							<Row>
								<Col sm={12} md={12} lg={12} xl={12}>
									<FormGroup>
										<BoldLabel obrigatorio>Nome</BoldLabel>
										<TextInput value={nome} onChange={setNome} placeholder='Ex.: Prova 1' />
									</FormGroup>
								</Col>
								<Col sm={12} md={6} lg={6} xl={6}>
									<FormGroup>
										<BoldLabel>Data</BoldLabel>
										<DateInput value={data} onChange={setData} />
									</FormGroup>
								</Col>
								<Col sm={12} md={6} lg={6} xl={6}>
									<FormGroup>
										<BoldLabel>Pontuação máxima</BoldLabel>
										<TextInput type='number' value={pontuacao} onChange={setPontuacao} placeholder='0' />
									</FormGroup>
								</Col>
							</Row>
							<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
								<button type='button' className='btn btn--secundario btn--sm' onClick={() => setMostrarForm(false)}>
									Cancelar
								</button>
								<button type='submit' className='btn btn--primario btn--sm' disabled={salvando}>
									{salvando ? 'Salvando…' : 'Cadastrar'}
								</button>
							</div>
						</form>
					)}

					{disciplina.avaliacoes.length === 0 ? (
						<p style={{ color: 'var(--cor-texto-suave)', fontSize: 13, margin: 0 }}>Nenhuma avaliação cadastrada ainda.</p>
					) : (
						<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
							{disciplina.avaliacoes.map((avaliacao) => (
								<div key={avaliacao.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '8px 12px', border: '1px solid var(--cor-borda)', borderRadius: 'var(--raio)', background: 'var(--cor-fundo)' }}>
									<div style={{ minWidth: 0 }}>
										<div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{avaliacao.nome}</div>
										<div style={{ fontSize: 12, color: 'var(--cor-texto-suave)' }}>{formatarData(avaliacao.data)}</div>
									</div>
									<span style={{ fontSize: 13, fontWeight: 600, color: 'var(--cor-primaria)', whiteSpace: 'nowrap' }}>{avaliacao.pontuacaoMaxima} pts</span>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export default function DisciplinasView() {
	const { showSuccess } = useToast();
	const formRef = useRef<FormHandle>(null);

	const [membrosDe, setMembrosDe] = useState<{ id: string; nome: string } | null>(null);
	const [avaliacoesDe, setAvaliacoesDe] = useState<DiscResp | null>(null);

	const [mostrarEntrar, setMostrarEntrar] = useState(false);
	const [codigo, setCodigo] = useState('');
	const [entrando, setEntrando] = useState(false);

	const recarregar = () => formRef.current?.filtrar();

	const solicitarParticipacao = async () => {
		const cod = codigo.trim();
		if (!cod) {
			showError('Informe o código da disciplina.');
			return;
		}
		setEntrando(true);
		try {
			const resp = await api.post<{ message: string; disciplina: string }>('/disciplinas/solicitacoes', { codigo: cod });
			showSuccess(`Solicitação enviada para "${resp.disciplina}". Aguarde a aprovação do dono.`);
			setCodigo('');
			setMostrarEntrar(false);
		} catch {
			// erro já reportado pela Api (código inválido, já membro, já pendente…)
		} finally {
			setEntrando(false);
		}
	};

	return (
		<>
			<Form
				ref={formRef}
				url='/disciplinas'
				titulo='Disciplinas'
				ordenacaoPadrao='id'
				esconderFiltro
				mensagemVazio='Você ainda não participa de nenhuma disciplina. Crie uma nova ou entre por código.'
				itemVazio={{ nome: '', professor: '', sala: '', dataInicio: '', dataFim: '', horarios: [] }}
				renderizarFiltros={() => (
					<button className='btn btn--secundario btn--sm' onClick={() => setMostrarEntrar(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
						<Plus size={16} /> Entrar por código
					</button>
				)}
				getAcoesDaTabela={(item) => {
					const disciplina = item as DiscResp;
					const ehDono = disciplina.papelDoUsuario?.id === PAPEL_DONO;
					return (
						<>
							<button
								className='user-menu__item'
								onClick={(evento) => {
									evento.stopPropagation();
									setAvaliacoesDe(disciplina);
								}}
							>
								<ClipboardCheck size={16} /> Avaliações
							</button>
							{ehDono && (
								<button
									className='user-menu__item'
									onClick={(evento) => {
										evento.stopPropagation();
										setMembrosDe({ id: String(disciplina.id), nome: disciplina.nome });
									}}
								>
									<Users size={16} /> Membros e solicitações
								</button>
							)}
						</>
					);
				}}
				getTitulosDaTabela={() => [
					{ titulo: 'Código', orderby: 'Id', width: '12%' },
					{ titulo: 'Nome', orderby: 'nome', width: '34%' },
					{ titulo: 'Professor', width: '24%' },
					{ titulo: 'Sala', width: '15%' },
					{ titulo: 'Carga', width: '15%', className: 'num' },
				]}
				getDadosDaTabela={(item) => {
					const disciplina = item as Record<string, unknown>;
					return [
						<span style={{ letterSpacing: '0.5px', color: 'var(--cor-texto-suave)' }}>{(disciplina.codigo as string) ?? ''}</span>,
						disciplina.nome as string,
						(disciplina.professor as string) ?? '—',
						(disciplina.sala as string) ?? '—',
						disciplina.cargaHoraria != null ? `${disciplina.cargaHoraria}h` : '—',
					];
				}}
				aposEditar={(state, set) => {
					const disciplina = state.itemSelecionado;
					if (!disciplina) {
						return;
					}
					const horarios = ((disciplina.horarios as DiscResp['horarios'] | undefined) ?? []).map((horario) => ({
						diaSemana: enumId(horario.diaSemana) ?? 1,
						horaInicio: horario.horaInicio,
						horaFim: horario.horaFim,
					}));
					const papelDoUsuario = disciplina.papelDoUsuario as { id?: number } | null | undefined;
					const usuarioEhDono = papelDoUsuario?.id === PAPEL_DONO;
					set((estado) => ({
						...estado,
						itemSelecionado: { ...estado.itemSelecionado, horarios },
						visualizando: !usuarioEhDono,
					}));
				}}
				getPayload={(formState) => {
					const disciplina = formState.itemSelecionado ?? {};
					if (!disciplina.nome) {
						showError('Informe o nome da disciplina.');
						return Promise.reject();
					}
					const input: Record<string, unknown> = {
						nome: disciplina.nome,
						horarios: (disciplina.horarios as HorarioT[] | undefined) ?? [],
					};
					if (disciplina.professor) input.professor = disciplina.professor;
					if (disciplina.sala) input.sala = disciplina.sala;
					if (disciplina.cargaHoraria != null) input.cargaHoraria = disciplina.cargaHoraria;
					if (disciplina.dataInicio) input.dataInicio = disciplina.dataInicio;
					if (disciplina.dataFim) input.dataFim = disciplina.dataFim;
					if (formState.alterando) {
						input.id = parseInt(String(disciplina.id));
					}
					return input;
				}}
				renderizarFormulario={({ formState, setFormState }) => (
					<DisciplinaForm formState={formState} setFormState={setFormState} />
				)}
			/>

			<FormModal
				open={mostrarEntrar}
				title='Entrar em disciplina'
				description='Peça o código à pessoa que criou a disciplina.'
				size='sm'
				submitLabel='Solicitar participação'
				loading={entrando}
				onClose={() => {
					setMostrarEntrar(false);
					setCodigo('');
				}}
				onSubmit={(e) => {
					e.preventDefault();
					solicitarParticipacao();
				}}
			>
				<FormGroup>
					<BoldLabel>Código da disciplina</BoldLabel>
					<TextInput value={codigo} onChange={setCodigo} placeholder='Ex.: ABC123' />
				</FormGroup>
			</FormModal>

			{avaliacoesDe && (
				<AvaliacoesModal
					disciplina={avaliacoesDe}
					onFechar={() => setAvaliacoesDe(null)}
					onAtualizar={() => {
						setAvaliacoesDe(null);
						recarregar();
					}}
				/>
			)}

			{membrosDe && (
				<div className='u-modal-overlay' onClick={() => setMembrosDe(null)}>
					<div className='u-modal' onClick={(evento) => evento.stopPropagation()}>
						<div className='u-modal__header'>
							<div>
								<div className='u-modal__titulo'>Participação</div>
								<div className='u-modal__desc'>{membrosDe.nome}</div>
							</div>
							<button type='button' className='u-modal__fechar' onClick={() => setMembrosDe(null)}>
								<X size={16} />
							</button>
						</div>
						<div className='u-modal__body'>
							<DisciplinaMembros disciplinaId={membrosDe.id} />
						</div>
					</div>
				</div>
			)}
		</>
	);
}
