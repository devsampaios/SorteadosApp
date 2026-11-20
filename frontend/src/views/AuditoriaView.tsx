import { useState } from 'react';
import { Eye } from 'lucide-react';
import Form from '../components/Form';
import AuditoriaDetalheModal, { type AuditoriaItem } from '../components/AuditoriaDetalheModal';

const formatarDataHora = (iso: string | null): string => {
	if (!iso) {
		return '—';
	}
	return new Date(iso).toLocaleString('pt-BR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
};

const ehSucesso = (situacao: string): boolean => /sucesso|success/i.test(situacao ?? '');

const SituacaoBadge = ({ situacao }: { situacao: string }) => {
	const cor = ehSucesso(situacao) ? 'var(--cor-sucesso)' : 'var(--cor-erro)';
	return (
		<span
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				padding: '2px 10px',
				borderRadius: 999,
				fontSize: 12,
				fontWeight: 700,
				background: `color-mix(in srgb, ${cor} 16%, transparent)`,
				color: cor,
			}}
		>
			{situacao}
		</span>
	);
};

export default function AuditoriaView() {
	const [selecionada, setSelecionada] = useState<AuditoriaItem | null>(null);

	return (
		<>
			<Form
				titulo='Auditoria'
				url='/auditorias'
				ordenacaoPadrao='id desc'
				esconderNovo
				esconderFiltro
				esconderNavegacao
				esconderAcoes
				aoAbrirLinha={(item) => setSelecionada(item as AuditoriaItem)}
				getAcoesDaTabela={(item) => {
					const a = item as AuditoriaItem;
					return (
						<button
							className='user-menu__item'
							onClick={(evento) => {
								evento.stopPropagation();
								setSelecionada(a);
							}}
						>
							<Eye size={16} /> Visualizar
						</button>
					);
				}}
				getTitulosDaTabela={() => [
					{ titulo: 'Data', orderby: undefined },
					{ titulo: 'Rota' },
					{ titulo: 'Ação' },
					{ titulo: 'Situação' },
					{ titulo: 'Usuário' },
				]}
				getDadosDaTabela={(item) => {
					const a = item as AuditoriaItem;
					return [
						formatarDataHora(a.criadoEm),
						a.rota ?? '—',
						a.acao,
						<SituacaoBadge situacao={a.situacao} />,
						a.usuarioNome ?? a.usuarioId ?? '—',
					];
				}}
				getPayload={() => ({})}
			/>
			{selecionada && <AuditoriaDetalheModal auditoria={selecionada} onFechar={() => setSelecionada(null)} />}
		</>
	);
}
