import { BRAND } from './brand';

export function BrandMark({
  className,
  color = 'currentColor',
  size = 48,
}: {
  className?: string;
  color?: string;
  size?: number;
}) {
  const { bar, center, rotations, viewBox } = BRAND.identity.mark_geometry;
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill={color}
      focusable="false"
      height={size}
      viewBox={viewBox.join(' ')}
      width={size}
    >
      {rotations.map((angle) => (
        <rect
          key={angle}
          {...bar}
          transform={`rotate(${angle} ${center.join(' ')})`}
        />
      ))}
    </svg>
  );
}
