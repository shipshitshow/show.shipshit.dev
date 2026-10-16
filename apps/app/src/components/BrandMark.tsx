export function BrandMark({
  className,
  color = 'currentColor',
  size = 48,
}: {
  className?: string;
  color?: string;
  size?: number;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill={color}
      focusable="false"
      height={size}
      viewBox="0 0 96 96"
      width={size}
    >
      <rect height="88" width="20" x="38" y="4" />
      <rect height="88" transform="rotate(60 48 48)" width="20" x="38" y="4" />
      <rect height="88" transform="rotate(120 48 48)" width="20" x="38" y="4" />
    </svg>
  );
}
