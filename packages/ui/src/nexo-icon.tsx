import type { SVGProps } from "react";

export function NexoIcon({
  className,
  style,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      stroke="currentColor"
      style={{ color: "var(--nexo-azure, #7dd3fc)", ...style }}
      strokeWidth={7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M 22 25 L 22 75" />
      <path d="M 22 75 L 78 25" />
      <path d="M 58 25 L 78 25 L 78 45" strokeWidth={6} />
      <path d="M 45 80 L 88 42" strokeWidth={5} opacity={0.75} />
      <path d="M 72 42 L 88 42 L 88 58" strokeWidth={5} opacity={0.75} />
    </svg>
  );
}
