'use client'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, fullWidth, children, className = '', disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-sans font-medium transition-all duration-150 rounded-pill cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none'

    const variants = {
      primary: 'bg-accent text-[#F5F2EC] hover:bg-[#1A1915] active:scale-[0.98]',
      secondary: 'bg-surface border border-border text-text-primary hover:bg-[#E0DAD0] active:scale-[0.98]',
      ghost: 'bg-transparent border border-border text-text-secondary hover:bg-surface active:scale-[0.98]',
      danger: 'bg-danger text-white hover:bg-[#7A2E2E] active:scale-[0.98]',
      success: 'bg-success text-white hover:bg-[#2E5A3C] active:scale-[0.98]',
    }

    const sizes = {
      sm: 'px-4 py-2 text-sm gap-1.5',
      md: 'px-6 py-2.5 text-sm gap-2',
      lg: 'px-8 py-3.5 text-base gap-2',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
export default Button
