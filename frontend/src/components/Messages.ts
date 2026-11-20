type Sink = (mensagem: string) => void;
type ConfirmSink = (mensagem: string, onConfirm: () => void) => void;

interface Sinks {
  showError: Sink;
  showSuccess: Sink;
  showInfo: Sink;
  showConfirm: ConfirmSink;
}

let sinks: Sinks | null = null;

export function registrarMensagens(novos: Sinks): void {
  sinks = novos;
}

export function limparMensagens(): void {
  sinks = null;
}

export function showError(mensagem: string): void {
  if (sinks) sinks.showError(mensagem);
  else console.error("[Messages]", mensagem);
}

export function showSuccess(mensagem: string): void {
  if (sinks) sinks.showSuccess(mensagem);
  else console.log("[Messages]", mensagem);
}

export function showInfo(mensagem: string): void {
  if (sinks) sinks.showInfo(mensagem);
  else console.log("[Messages]", mensagem);
}

export function showConfirm(mensagem: string, onConfirm: () => void): void {
  if (sinks) sinks.showConfirm(mensagem, onConfirm);
  else if (window.confirm(mensagem)) onConfirm();
}
