import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import api from "../service/Api";
import { urlDoArquivo } from "../service/arquivos";
import { showError } from "./Messages";
import "./assets/FotoInput.css";

interface FotoInputProps {
  /** Id do arquivo atual (foto já salva). Vazio mostra as iniciais. */
  fotoArquivoId?: string | null;
  /** Chamado com o id do arquivo recém-enviado. */
  onChange: (arquivoId: string) => void;
  /** Texto de fallback quando não há foto (ex.: iniciais do e-mail). */
  iniciais?: string;
  /** Diâmetro do avatar em px. */
  tamanho?: number;
  /** Tamanho máximo do arquivo em MB. */
  maxMB?: number;
  /** Promove o arquivo de temporário a permanente após o upload. */
  permanente?: boolean;
  /** Texto de apoio exibido ao lado do avatar. */
  legenda?: string;
  disabled?: boolean;
}

// image/png -> png, image/jpeg -> jpg. Só imagens são aceitas.
function extensaoDoMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  const barra = mime.indexOf("/");
  return barra >= 0 ? mime.slice(barra + 1) : "bin";
}

function lerComoBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Anexo de foto: avatar clicável com badge de câmera, preview do arquivo salvo
// (blob autenticado), validação (imagem, tamanho) e upload para /arquivos.
export default function FotoInput({
  fotoArquivoId,
  onChange,
  iniciais = "U",
  tamanho = 80,
  maxMB = 3,
  permanente = true,
  legenda = "Toque na foto para alterar. JPG ou PNG, até 3 MB.",
  disabled,
}: FotoInputProps) {
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Carrega o preview (blob autenticado) quando o id muda; revoga o URL anterior
  // para não vazar memória.
  useEffect(() => {
    if (!fotoArquivoId) {
      setFotoUrl(null);
      return;
    }
    let cancelado = false;
    let urlAtiva: string | null = null;
    urlDoArquivo(fotoArquivoId)
      .then((url) => {
        if (cancelado) {
          URL.revokeObjectURL(url);
          return;
        }
        urlAtiva = url;
        setFotoUrl(url);
      })
      .catch(() => setFotoUrl(null));
    return () => {
      cancelado = true;
      if (urlAtiva) URL.revokeObjectURL(urlAtiva);
    };
  }, [fotoArquivoId]);

  const selecionar = () => inputRef.current?.click();

  const enviar = async (evento: React.ChangeEvent<HTMLInputElement>) => {
    const file = evento.target.files?.[0];
    evento.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showError("Selecione um arquivo de imagem.");
      return;
    }
    if (file.size > maxMB * 1024 * 1024) {
      showError(`A imagem deve ter no máximo ${maxMB} MB.`);
      return;
    }
    setEnviando(true);
    try {
      const conteudo = await lerComoBase64(file);
      const arquivo = await api.post<{ id: string }>("/arquivos", {
        nome: file.name,
        extensao: extensaoDoMime(file.type),
        mimeType: file.type,
        conteudo,
      });
      if (permanente) {
        await api.patch(`/arquivos/${arquivo.id}/permanente`);
      }
      onChange(arquivo.id);
    } catch {
      // erro já reportado pela Api
    } finally {
      setEnviando(false);
    }
  };

  const badge = Math.round(tamanho * 0.325);

  return (
    <div className="ci-foto">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={enviar}
        style={{ display: "none" }}
      />
      <button
        type="button"
        className="ci-foto__botao"
        onClick={selecionar}
        disabled={disabled || enviando}
        title="Alterar foto"
        style={{ width: tamanho, height: tamanho }}
      >
        <span
          className={`avatar ci-foto__avatar${fotoUrl ? " ci-foto__avatar--imagem" : ""}`}
          style={{ width: tamanho, height: tamanho, fontSize: Math.round(tamanho * 0.325) }}
        >
          {fotoUrl ? <img src={fotoUrl} alt="Foto" className="ci-foto__img" /> : iniciais}
        </span>
        <span className="ci-foto__badge" style={{ width: badge, height: badge }}>
          <Camera size={Math.round(badge * 0.54)} />
        </span>
      </button>
      {legenda && <p className="ci-foto__legenda">{enviando ? "Enviando…" : legenda}</p>}
    </div>
  );
}
