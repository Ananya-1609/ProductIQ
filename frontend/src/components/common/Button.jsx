export default function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}) {
  const styles = {
    primary:
      'bg-[#0f766e] text-white border border-[#0f766e] hover:bg-[#115e59] hover:border-[#115e59] shadow-sm',

    secondary:
      'border border-[#cbd5e1] bg-white text-slate-800 hover:border-[#8ccbc2] hover:bg-[#eef9f6]',

    ghost:
      'text-slate-600 hover:bg-[#eef9f6] hover:text-[#0f766e]',

    danger:
      'bg-rose-600 text-white border border-rose-600 hover:bg-rose-700 hover:border-rose-700',
  }

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}