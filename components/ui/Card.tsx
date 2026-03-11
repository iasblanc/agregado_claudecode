import { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export default function Card({ padding = 'md', className = '', children, ...props }: CardProps) {
  const paddings = { none: '', sm: 'p-3', md: 'p-4', lg: 'p-6' }
  return (
    <div
      className={`bg-surface rounded-lg border border-border shadow-card ${paddings[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  color?: 'success' | 'warning' | 'gold' | 'info' | 'danger'
  icon?: React.ReactNode
}

export function KpiCard({ label, value, sub, color = 'success', icon }: KpiCardProps) {
  const colors = {
    success: 'bg-success',
    warning: 'bg-warning',
    gold: 'bg-gold',
    info: 'bg-info',
    danger: 'bg-danger',
  }
  return (
    <div className="bg-surface rounded-lg border border-border shadow-card overflow-hidden">
      <div className={`h-1 ${colors[color]}`} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-text-muted font-sans uppercase tracking-wide truncate">{label}</p>
            <p className="text-xl font-semibold text-text-primary font-sans mt-0.5 truncate">{value}</p>
            {sub && <p className="text-xs text-text-secondary mt-0.5">{sub}</p>}
          </div>
          {icon && <div className="text-text-muted flex-shrink-0">{icon}</div>}
        </div>
      </div>
    </div>
  )
}
