interface Props {
  label: string;
  className?: string;
}

export default function ProximamenteButton({ label, className = "" }: Props) {
  return (
    <button
      disabled
      className={`inline-flex items-center gap-2 opacity-60 cursor-not-allowed rounded-lg px-4 py-2 text-sm font-medium border border-white/10 text-gray-400 ${className}`}
    >
      {label}
      <span className="text-[10px] bg-accent/20 text-accent rounded-full px-2 py-0.5 font-semibold tracking-wide">
        PRÓXIMAMENTE
      </span>
    </button>
  );
}
