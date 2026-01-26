interface FlagProps {
  country: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  round?: boolean;
  className?: string;
}

export function Flag({ country, size = 'sm', round = false, className = '' }: FlagProps) {
  const countryCode = country.toUpperCase();
  const sizeClass = `ff-${size}`;
  const roundClass = round ? 'ff-round' : '';

  return (
    <span
      className={`fflag fflag-${countryCode} ${sizeClass} ${roundClass} ${className}`.trim()}
      aria-label={`Flag of ${countryCode}`}
    />
  );
}
