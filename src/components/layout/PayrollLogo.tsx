export default function PayrollLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Payroll">
      <rect width="64" height="64" rx="12" fill="#1f2833" />
      <path d="M19 46V15h15a10.5 10.5 0 0 1 0 21H19" fill="none" stroke="#e3e8ed" strokeWidth="7" strokeLinejoin="round" />
      <rect x="12" y="50" width="40" height="4" rx="2" fill="#f97316" />
    </svg>
  );
}