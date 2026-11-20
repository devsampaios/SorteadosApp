import { useNavigate } from 'react-router-dom';
import { Users, ScrollText, type LucideIcon } from 'lucide-react';

interface CardAdmin {
	titulo: string;
	descricao: string;
	icone: LucideIcon;
	to: string;
}

const cartoes: CardAdmin[] = [
	{
		titulo: 'Usuários',
		descricao: 'Gerenciar logins, nomes e situações.',
		icone: Users,
		to: '/admin/usuarios',
	},
	{
		titulo: 'Auditoria',
		descricao: 'Consultar o histórico de ações do sistema.',
		icone: ScrollText,
		to: '/admin/auditoria',
	},
];

export default function AdminView() {
	const navigate = useNavigate();

	return (
		<div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
			<div style={{ width: 'min(720px, 100%)', display: 'flex', flexDirection: 'column', gap: 16 }}>
				<div>
					<h2 style={{ margin: 0 }}>Administração</h2>
					<p style={{ margin: '4px 0 0', color: 'var(--cor-texto-suave)' }}>
						Cadastro de usuários e histórico de ações do sistema.
					</p>
				</div>

				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
					{cartoes.map((cartao) => (
						<button
							key={cartao.to}
							type='button'
							className='card'
							onClick={() => navigate(cartao.to)}
							style={{
								textAlign: 'left',
								cursor: 'pointer',
								display: 'flex',
								flexDirection: 'column',
								gap: 8,
								border: '1px solid var(--cor-borda)',
							}}
						>
							<span
								style={{
									width: 44,
									height: 44,
									borderRadius: 'var(--raio)',
									display: 'inline-flex',
									alignItems: 'center',
									justifyContent: 'center',
									background: 'var(--cor-fundo-card)',
									color: 'var(--cor-primaria)',
								}}
							>
								<cartao.icone size={22} />
							</span>
							<span style={{ fontWeight: 600 }}>{cartao.titulo}</span>
							<span style={{ fontSize: 13, color: 'var(--cor-texto-suave)' }}>{cartao.descricao}</span>
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
