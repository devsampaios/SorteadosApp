// Prepara uma imagem escolhida pelo usuário para upload: redimensiona para um
// lado máximo e reexporta como JPEG. Serve para três coisas de uma vez:
//   1. Converte HEIC/HEIF (padrão do iPhone) para JPEG — que qualquer navegador
//      exibe e o backend aceita.
//   2. Encolhe fotos grandes (uma foto de celular de vários MB vira ~100–200 KB),
//      ficando abaixo de qualquer limite de tamanho (backend e nginx).
//   3. Normaliza a orientação (EXIF) para a foto não sair girada.

/** Decodifica o arquivo respeitando a orientação EXIF, com fallback via <img>. */
async function decodificar(arquivo: File): Promise<ImageBitmap | HTMLImageElement> {
  // createImageBitmap decodifica e aplica a orientação num passo só (quando
  // suportado). No Safari do iPhone também decodifica HEIC nativamente.
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(arquivo, { imageOrientation: "from-image" });
    } catch {
      // cai no fallback
    }
  }
  const url = URL.createObjectURL(arquivo);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Não foi possível ler a imagem"));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Redimensiona (mantendo proporção) para no máximo `maxLado` px e devolve um
 * novo File JPEG. Se algo falhar na conversão, devolve o arquivo original —
 * melhor tentar enviar do que travar.
 */
export async function prepararImagemParaUpload(
  arquivo: File,
  maxLado = 1024,
  qualidade = 0.85
): Promise<File> {
  try {
    const fonte = await decodificar(arquivo);
    const largura = "width" in fonte ? fonte.width : (fonte as HTMLImageElement).naturalWidth;
    const altura = "height" in fonte ? fonte.height : (fonte as HTMLImageElement).naturalHeight;
    if (!largura || !altura) return arquivo;

    const escala = Math.min(1, maxLado / Math.max(largura, altura));
    const w = Math.round(largura * escala);
    const h = Math.round(altura * escala);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return arquivo;
    ctx.drawImage(fonte as CanvasImageSource, 0, 0, w, h);
    if ("close" in fonte) fonte.close(); // libera o ImageBitmap

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", qualidade)
    );
    if (!blob) return arquivo;

    const nome = arquivo.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], nome, { type: "image/jpeg" });
  } catch {
    return arquivo;
  }
}
