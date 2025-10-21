import { Link } from 'react-router-dom';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: number; // height in px
}

export default function Logo({ className = '', showText = false, size = 32 }: LogoProps) {
  const height = `${size}px`;
  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`.trim()}>
      <img
        src="/Screenshot 2025-10-15 024858.png"
        alt="Kara AI Logo"
        height={size}
        width={size}
        style={{ height, width: height }}
      />
      {showText && (
        <span className="text-xl font-semibold tracking-tight">KARA AI</span>
      )}
    </Link>
  );
}
