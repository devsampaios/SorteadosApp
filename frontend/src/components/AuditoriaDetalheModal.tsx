import { X } from 'lucide-react';

export interface AuditoriaItem {
	id: string;
	rota: string | null;
	acao: string;
	situacao: string;
	descricao: string;
	ip: string | null;
	usuarioId: string | null;
	usuarioNome: string | null;
	criadoEm: string;
}

interface Props {
	auditoria: AuditoriaItem;
	onFechar: () => void;
}

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
		second: '2-digit',
	});
};

const ehSucesso = (situacao: string): boolean => /sucesso|success/i.test(situacao ?? '');

const Campo = ({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) => (
	<div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
		<span style={{ fontSize: 12, fontWeight: 600, color: 'var(--cor-texto-suave)' }}>{rotulo}</span>
		<span style={{ fontSize: 14, color: 'var(--cor-texto)' }}>{valor}</span>
	</div>
);

export default function AuditoriaDetalheModal({ auditoria, onFechar }: Props) {
	const sucesso = ehSucesso(auditoria.situacao);
	const cor = sucesso ? 'var(--cor-sucesso)' : 'var(--cor-erro)';

	return (
		<div className='u-modal-overlay' onClick={onFechar}>
			<div className='u-modal u-modal--lg' onClick={(e) => e.stopPropagation()}>
				<div className='u-modal__header'>
					<div>
						<div className='u-modal__titulo'>Auditoria #{auditoria.id}</div>
						<div className='u-modal__desc'>Detalhes do registro</div>
					</div>
					<button type='button' className='u-modal__fechar' onClick={onFechar}>
						<X size={16} />
					</button>
				</div>
				<div className='u-modal__body'>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
							gap: 16,
							marginBottom: 20,
						}}
					>
						<Campo rotulo='Data' valor={formatarDataHora(auditoria.criadoEm)} />
						<Campo rotulo='Rota' valor={auditoria.rota ?? '—'} />
						<Campo rotulo='Ação' valor={auditoria.acao} />
						<Campo
							rotulo='Situação'
							valor={
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
									{auditoria.situacao}
								</span>
							}
						/>
						<Campo rotulo='Usuário' valor={auditoria.usuarioNome ?? auditoria.usuarioId ?? '—'} />
						<Campo rotulo='IP' valor={auditoria.ip ?? '—'} />
					</div>

					<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
						<span style={{ fontSize: 12, fontWeight: 600, color: 'var(--cor-texto-suave)' }}>Descrição</span>
						<pre
							style={{
								margin: 0,
								padding: 14,
								borderRadius: 'var(--raio)',
								background: 'var(--cor-fundo-input)',
								border: '1px solid var(--cor-borda)',
								color: sucesso ? 'var(--cor-texto)' : 'var(--cor-erro)',
								fontSize: 12.5,
								lineHeight: 1.5,
								whiteSpace: 'pre-wrap',
								wordBreak: 'break-word',
								overflowX: 'auto',
								maxHeight: '50vh',
							}}
						>
							{auditoria.descricao || '—'}
						</pre>
					</div>
				</div>
			</div>
		</div>
	);
}
