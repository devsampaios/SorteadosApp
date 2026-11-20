import { useState } from 'react';
import { Card, Button, DateInput, SelectInput, TextInput } from './utils';
import { FILTRO_AUDITORIA_VAZIO, type FiltroAuditoria } from '../utils/auditoria';

const ACOES = ['CREATE', 'UPDATE', 'DELETE', 'PERFIL', 'CRIAR', 'PERMANENTE', 'NÃO AUTENTICADO', 'NÃO AUTORIZADO', 'ERRO'];

const TODAS = { value: '', label: 'Todas' };

const SITUACOES = [
  { value: 'Success', label: 'Sucesso' },
  { value: 'Exception', label: 'Erro' },
];

interface AuditoriaFiltrosProps {
  onFiltrar: (filtro: FiltroAuditoria) => void;
}

/** Painel de filtros da auditoria: período, ação, situação, usuário e rota. */
export default function AuditoriaFiltros({ onFiltrar }: AuditoriaFiltrosProps) {
  const [filtro, setFiltro] = useState<FiltroAuditoria>(FILTRO_AUDITORIA_VAZIO);
  const alterar = (campo: keyof FiltroAuditoria) => (valor: string) => setFiltro((f) => ({ ...f, [campo]: valor }));

  const limpar = () => {
    setFiltro(FILTRO_AUDITORIA_VAZIO);
    onFiltrar(FILTRO_AUDITORIA_VAZIO);
  };

  return (
    <Card hover={false} style={{ marginBottom: 16 }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onFiltrar(filtro);
        }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0 12px', alignItems: 'end' }}
      >
        <DateInput name='dataInicio' label='De' value={filtro.dataInicio} max={filtro.dataFim || undefined} onChange={alterar('dataInicio')} />
        <DateInput name='dataFim' label='Até' value={filtro.dataFim} min={filtro.dataInicio || undefined} onChange={alterar('dataFim')} />
        <SelectInput
          name='acao'
          label='Ação'
          value={filtro.acao}
          options={[TODAS, ...ACOES.map((a) => ({ value: a, label: a }))]}
          onChange={alterar('acao')}
        />
        <SelectInput
          name='situacao'
          label='Situação'
          value={filtro.situacao}
          options={[TODAS, ...SITUACOES]}
          onChange={alterar('situacao')}
        />
        <TextInput name='usuario' label='Usuário (login)' value={filtro.usuario} onChange={alterar('usuario')} />
        <TextInput name='rota' label='Rota' value={filtro.rota} onChange={alterar('rota')} placeholder='ex: /perfil' />
        <div style={{ display: 'flex', gap: 8, paddingBottom: 18 }}>
          <Button type='submit' label='Filtrar' />
          <Button variant='secondary' label='Limpar' onClick={limpar} />
        </div>
      </form>
    </Card>
  );
}
