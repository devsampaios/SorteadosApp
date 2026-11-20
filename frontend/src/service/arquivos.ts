const STORAGE_KEY = 'app:auth';

// Busca um arquivo autenticado (blob) e devolve um object URL. Usado para a foto
// de perfil no UserMenu. Se o endpoint não existir/erro, o caller cai no
// placeholder (iniciais).
export async function urlDoArquivo(id: string): Promise<string> {
  const raw = localStorage.getItem(STORAGE_KEY);
  const token = raw ? (JSON.parse(raw) as { token?: string }).token : undefined;
  const res = await fetch(`${import.meta.env.VITE_API_URL}/arquivos/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('arquivo não encontrado');
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
