import { useRef } from 'react';
import Form, { type FormState, makeFormHelpers } from '../components/Form';
import FormGroup from '../components/FormGroup';
import { Row, Col } from '../components/Grid';
import BoldLabel from '../components/BoldLabel';
import TextInput from '../components/TextInput';
import SelectInput from '../components/SelectInput';
import { showError } from '../components/Messages';
import {
	enumId,
	enumDescricao,
	opcoesDeEnum,
	SITUACOES_USUARIO,
} from '../utils/enum';

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
					<Col sm={12} md={6} lg={6} xl={6}>
						<FormGroup>
							<BoldLabel obrigatorio>Login</BoldLabel>
							<TextInput
								defaultValue={item.login as string}
								onChange={(value) => setItemSelecionado({ login: value })}
							/>
						</FormGroup>
					</Col>
					{!formState.alterando && (
						<Col sm={12} md={6} lg={6} xl={6}>
							<FormGroup>
								<BoldLabel obrigatorio>Senha</BoldLabel>
								<TextInput
									type='password'
									defaultValue=''
									onChange={(value) => setItemSelecionado({ senha: value })}
								/>
							</FormGroup>
						</Col>
					)}
					<Col sm={12} md={6} lg={6} xl={6}>
						<FormGroup>
							<BoldLabel>Situação</BoldLabel>
							<SelectInput
								value={String(item.situacao ?? 1)}
								options={opcoesDeEnum(SITUACOES_USUARIO)}
								onChange={(value) => setItemSelecionado({ situacao: Number(value) })}
							/>
						</FormGroup>
					</Col>
				</Row>
			</>
		);
	};

	const getPayload = async (formState: FormState) => {
		try {
			const item = formState?.itemSelecionado || {};

			if (!item.login) {
				showError('Informe o login.');
				return Promise.reject();
			}
			if (!formState.alterando && !item.senha) {
				showError('Informe a senha.');
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
			esconderFiltro
			getTitulosDaTabela={() => [
				{ titulo: 'Login', width: '100%', orderby: 'login' },
				{ titulo: 'Nome', orderby: 'nome' },
				{ titulo: 'Situação' },
			]}
			getDadosDaTabela={(item) => {
				const u = item as Record<string, unknown>;
				return [
					u.login as string,
					(u.nome as string) ?? '—',
					enumDescricao(u.situacao),
				];
			}}
			aposEditar={(state, set) => {
				const it = state.itemSelecionado;
				if (!it) return;
				set((s) => ({
					...s,
					itemSelecionado: {
						...s.itemSelecionado,
						situacao: enumId(it.situacao),
					},
				}));
			}}
			renderizarFormulario={formulario}
			getPayload={getPayload}
			itemVazio={{ login: '', senha: '', nome: '', situacao: 1 }}
			autoFoco={autoFoco}
			select={props.select}
			form={props.form}
		/>
	);
}
