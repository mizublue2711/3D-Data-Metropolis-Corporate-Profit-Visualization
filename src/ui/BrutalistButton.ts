export interface BrutalistButtonOptions {
  label: string;
  variant?: 'cyan' | 'indigo' | 'danger';
  onClick: () => void;
}

export class BrutalistButton {
  public element: HTMLButtonElement;

  constructor(options: BrutalistButtonOptions) {
    const { label, variant = 'cyan', onClick } = options;
    this.element = document.createElement('button');
    this.element.textContent = label;

    // Cybernetic Swiss Brutalism Styling (Zero Radius + 45° Chisel)
    this.element.style.borderRadius = '0px';
    this.element.style.clipPath =
      'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))';
    this.element.style.fontFamily = 'monospace';
    this.element.style.fontSize = '11px';
    this.element.style.textTransform = 'uppercase';
    this.element.style.letterSpacing = '0.05em';
    this.element.style.padding = '6px 12px';
    this.element.style.cursor = 'pointer';
    this.element.style.transition = 'all 0.15s ease';
    this.element.style.border = '1px solid';

    this.applyVariant(variant);
    this.element.addEventListener('click', onClick);
  }

  private applyVariant(variant: 'cyan' | 'indigo' | 'danger'): void {
    if (variant === 'cyan') {
      this.element.style.backgroundColor = '#0A0C14';
      this.element.style.color = '#00E5FF';
      this.element.style.borderColor = 'rgba(0, 229, 255, 0.4)';
    } else if (variant === 'indigo') {
      this.element.style.backgroundColor = '#0A0C14';
      this.element.style.color = '#5322FF';
      this.element.style.borderColor = 'rgba(83, 34, 255, 0.4)';
    } else {
      this.element.style.backgroundColor = '#0A0C14';
      this.element.style.color = '#FF0055';
      this.element.style.borderColor = 'rgba(255, 0, 85, 0.4)';
    }
  }
}
