import logoUrl from '@/assets/logo.svg';
import { uz } from '@/i18n/uz';

interface LogoProps {
  className?: string;
}

/** E-TEST logotipi (SVG). Matn o'rniga hamma joyda shu komponent ishlatiladi. */
export function Logo({ className }: LogoProps) {
  return <img src={logoUrl} alt={uz.app.name} className={className} />;
}
