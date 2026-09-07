import { cn } from '../../lib/utils.js';

const variants = {
  primary: 'bg-blue-700 hover:bg-blue-800 text-white shadow-sm hover:shadow-md',
  secondary: 'bg-teal-700 hover:bg-teal-800 text-white shadow-sm hover:shadow-md',
  outline: 'border border-blue-700 text-blue-700 hover:bg-blue-50',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm',
  accent: 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm hover:shadow-md',
  success: 'bg-green-600 hover:bg-green-700 text-white shadow-sm',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
  xl: 'px-8 py-4 text-lg gap-3',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  loading,
  leftIcon,
  rightIcon,
  id,
  type = 'button',
  onClick,
  as: Component = 'button',
  ...props
}) {
  return (
    <Component
      id={id}
      type={Component === 'button' ? type : undefined}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : leftIcon}
      {children}
      {!loading && rightIcon}
    </Component>
  );
}
