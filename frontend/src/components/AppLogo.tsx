const S_PATH =
  'M31 17C31 13.8 27.9 12 24 12C20.1 12 16.8 14 16.8 17.4C16.8 23.8 31.4 22.8 31.4 30.4C31.4 33.9 28 36 24 36C20.2 36 16.8 34.3 16.8 31.2';

type Props = {
  size?: number;
  /** 'esfera' = marca (contorno). 'bloco' = ícone cheio, para tamanhos pequenos. */
  variante?: 'esfera' | 'bloco';
};

export function AppLogo({ size = 48, variante = 'esfera' }: Props) {
  if (variante === 'bloco') {
    return (
      <svg
        width={size}
        height={size}
        viewBox='0 0 48 48'
        role='img'
        aria-label='Sorteados'
        style={{ flexShrink: 0 }}
      >
        <rect width='48' height='48' rx='11' fill='var(--cor-primaria)' />
        <path
          d={S_PATH}
          fill='none'
          stroke='var(--cor-sobre-primaria)'
          strokeWidth={3.6}
          strokeLinecap='round'
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 48 48'
      role='img'
      aria-label='Sorteados'
      style={{ flexShrink: 0, color: 'var(--cor-primaria)' }}
    >
      <circle cx='24' cy='24' r='21' fill='none' stroke='currentColor' strokeWidth={2.4} />
      <path d={S_PATH} fill='none' stroke='currentColor' strokeWidth={3.4} strokeLinecap='round' />
    </svg>
  );
}
