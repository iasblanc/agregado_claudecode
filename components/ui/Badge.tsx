interface BadgeProps {
  variant?: 'dark' | 'light' | 'muted' | 'success' | 'warning' | 'danger' | 'gold' | 'info'
  children: React.ReactNode
  className?: string
}

export default function Badge({ variant = 'light', children, className = '' }: BadgeProps) {
  const variants = {
    dark: 'bg-accent text-[#F5F2EC]',
    light: 'bg-surface border border-border text-text-secondary',
    muted: 'bg-[#E8E4DC] text-text-muted',
    success: 'bg-success-light text-success border border-success/20',
    warning: 'bg-warning-light text-warning border border-warning/20',
    danger: 'bg-danger-light text-danger border border-danger/20',
    gold: 'bg-gold-light text-gold border border-gold/20',
    info: 'bg-info-light text-info border border-info/20',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-pill text-xs font-medium font-sans ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}
