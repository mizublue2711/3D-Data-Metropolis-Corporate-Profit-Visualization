import React from 'react';

/**
 * ============================================================================
 * ARTIFICIAL CRAFT // MECHANICAL 45° CHISELED BRUTALIST BUTTON
 * File: BrutalistButton.tsx
 * Architecture: React UI Button Component
 * Protocol Rules: Zero radius, Mechanical 45° chiseled corner clip-path,
 *                 Space Grotesk uppercase font, Electric Indigo & Hyper Cyan accents.
 * ============================================================================
 */

interface BrutalistButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const BrutalistButton: React.FC<BrutalistButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}) => {
  const baseStyles =
    'relative inline-flex items-center justify-center font-mono uppercase tracking-widest font-bold transition-all duration-150 active:translate-y-[1px] select-none';

  // Mechanical 45° Chiseled Corner Clip-Path
  const chiseledClipPath = {
    clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))'
  };

  const variantStyles = {
    primary:
      'bg-[#5322FF] text-[#FFFFFF] border border-[#00E5FF] hover:bg-[#00E5FF] hover:text-[#05050A] shadow-none',
    secondary:
      'bg-[#0A0C14] text-[#00E5FF] border border-[#1F1F2E] hover:border-[#00E5FF] hover:bg-[#18181E]',
    danger:
      'bg-[#EF4444] text-[#FFFFFF] border border-[#EF4444] hover:bg-[#B91C1C]'
  };

  const sizeStyles = {
    sm: 'px-3 py-1 text-[10px]',
    md: 'px-5 py-2 text-xs',
    lg: 'px-7 py-3 text-sm'
  };

  return (
    <button
      style={chiseledClipPath}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {/* 1px Beacon pulse indicator for Primary button */}
      {variant === 'primary' && (
        <span className="mr-2 h-1.5 w-1.5 animate-ping bg-[#10B981]" />
      )}
      {children}
    </button>
  );
};
