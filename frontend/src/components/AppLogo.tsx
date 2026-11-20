import logo from '../assets/logo.png';

export function AppLogo({ size = 48 }: { size?: number }) {
  return <img src={logo} alt='Sorteados' width={size} height={size} style={{ objectFit: 'contain', flexShrink: 0 }} />;
}
