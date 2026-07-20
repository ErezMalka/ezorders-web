import type { ReactNode } from "react";

/**
 * Two-tone line icons in the EZOrders product style.
 * Main strokes use `currentColor` (set it via a text-* colour class, e.g.
 * `text-brand-indigo`); pink accents are hard-coded to the brand pink so the
 * icons keep their two-tone look on any background.
 */

const PINK = "#F05D86";

export type IconName =
  | "dashboard"
  | "pos"
  | "orders"
  | "menu"
  | "products"
  | "loyalty"
  | "reports"
  | "analytics"
  | "branches"
  | "couriers"
  | "employees"
  | "attendance"
  | "wallet"
  | "credit"
  | "feedback"
  | "kiosk"
  | "roles"
  | "payments"
  | "clients"
  | "settings"
  | "web"
  | "sales";

const commonProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const paths: Record<IconName, ReactNode> = {
  dashboard: (
    <>
      <rect x="6" y="6" width="14" height="14" rx="3" {...commonProps} />
      <rect x="28" y="6" width="14" height="14" rx="3" {...commonProps} stroke={PINK} />
      <rect x="6" y="28" width="14" height="14" rx="3" {...commonProps} stroke={PINK} />
      <rect x="28" y="28" width="14" height="14" rx="3" {...commonProps} />
    </>
  ),
  pos: (
    <>
      <rect x="7" y="9" width="34" height="22" rx="3" {...commonProps} />
      <path d="M17 31v5h14v-5" {...commonProps} />
      <path d="M13 40h22" {...commonProps} stroke={PINK} />
      <path d="M14 16h8M14 22h20" {...commonProps} stroke={PINK} />
    </>
  ),
  orders: (
    <>
      <path
        d="M12 6h18l6 6v30l-4-3-4 3-4-3-4 3-4-3-4 3V6z"
        {...commonProps}
      />
      <path d="M17 18h14M17 25h14M17 32h9" {...commonProps} stroke={PINK} />
    </>
  ),
  menu: (
    <>
      <path d="M10 8h24a4 4 0 0 1 4 4v28l-8-4-8 4V8z" {...commonProps} />
      <path d="M10 8a4 4 0 0 0-4 4v24a4 4 0 0 0 4 4" {...commonProps} />
      <path d="M15 18h14M15 25h9" {...commonProps} stroke={PINK} />
    </>
  ),
  products: (
    <>
      <path d="M24 6 8 14v20l16 8 16-8V14L24 6z" {...commonProps} />
      <path d="M8 14l16 8 16-8M24 22v20" {...commonProps} stroke={PINK} />
    </>
  ),
  loyalty: (
    <>
      <path
        d="M24 41s-14-8-14-18a8 8 0 0 1 14-5 8 8 0 0 1 14 5c0 10-14 18-14 18z"
        {...commonProps}
      />
      <path d="M24 15l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7L24 15z" fill={PINK} stroke="none" />
    </>
  ),
  reports: (
    <>
      <rect x="7" y="7" width="34" height="34" rx="4" {...commonProps} />
      <path d="M15 32V22M24 32V16M33 32v-6" {...commonProps} stroke={PINK} />
    </>
  ),
  analytics: (
    <>
      <path d="M8 40V8M8 40h32" {...commonProps} />
      <path d="M13 32l8-8 6 5 9-11" {...commonProps} stroke={PINK} />
      <path d="M36 18h-5m5 0v5" {...commonProps} stroke={PINK} />
    </>
  ),
  branches: (
    <>
      <rect x="6" y="18" width="14" height="24" rx="2" {...commonProps} />
      <rect x="24" y="8" width="18" height="34" rx="2" {...commonProps} stroke={PINK} />
      <path d="M29 16h8M29 23h8M29 30h8" {...commonProps} />
      <path d="M11 26h4M11 33h4" {...commonProps} />
    </>
  ),
  couriers: (
    <>
      <circle cx="13" cy="35" r="5" {...commonProps} />
      <circle cx="35" cy="35" r="5" {...commonProps} />
      <path d="M18 35h12M35 30V16h5" {...commonProps} />
      <path d="M13 30l4-11h9l4 8" {...commonProps} stroke={PINK} />
    </>
  ),
  employees: (
    <>
      <circle cx="18" cy="17" r="6" {...commonProps} />
      <path d="M8 40c0-6 4-10 10-10s10 4 10 10" {...commonProps} />
      <circle cx="34" cy="19" r="5" {...commonProps} stroke={PINK} />
      <path d="M31 30c6 0 9 4 9 10" {...commonProps} stroke={PINK} />
    </>
  ),
  attendance: (
    <>
      <circle cx="24" cy="24" r="17" {...commonProps} />
      <path d="M24 14v10l7 4" {...commonProps} stroke={PINK} />
    </>
  ),
  wallet: (
    <>
      <rect x="7" y="12" width="34" height="26" rx="4" {...commonProps} />
      <path d="M7 19h34" {...commonProps} />
      <circle cx="33" cy="26" r="3" fill={PINK} stroke="none" />
    </>
  ),
  credit: (
    <>
      <rect x="6" y="11" width="36" height="26" rx="4" {...commonProps} />
      <path d="M6 19h36" {...commonProps} stroke={PINK} />
      <path d="M12 30h8" {...commonProps} />
    </>
  ),
  feedback: (
    <>
      <path
        d="M8 12a4 4 0 0 1 4-4h24a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H20l-9 8v-8h-1a2 2 0 0 1-2-2V12z"
        {...commonProps}
      />
      <path d="M24 13l1.9 3.9 4.3.6-3.1 3 .7 4.2L24 26.7 20.2 28.7l.7-4.2-3.1-3 4.3-.6L24 13z" fill={PINK} stroke="none" />
    </>
  ),
  kiosk: (
    <>
      <rect x="12" y="5" width="24" height="30" rx="3" {...commonProps} />
      <path d="M20 35l-2 8h12l-2-8" {...commonProps} />
      <path d="M17 11h14M17 17h14M17 23h8" {...commonProps} stroke={PINK} />
    </>
  ),
  roles: (
    <>
      <path d="M24 5l15 6v10c0 10-7 17-15 21C16 38 9 31 9 21V11l15-6z" {...commonProps} />
      <path d="M18 23l4 4 8-9" {...commonProps} stroke={PINK} />
    </>
  ),
  payments: (
    <>
      <rect x="13" y="6" width="22" height="36" rx="4" {...commonProps} />
      <rect x="18" y="12" width="12" height="8" rx="1" {...commonProps} stroke={PINK} />
      <path d="M18 27h5M25 27h5M18 33h5M25 33h5" {...commonProps} />
    </>
  ),
  clients: (
    <>
      <circle cx="24" cy="16" r="7" {...commonProps} />
      <path d="M10 40c0-8 6-13 14-13s14 5 14 13" {...commonProps} />
      <circle cx="24" cy="16" r="2.5" fill={PINK} stroke="none" />
    </>
  ),
  settings: (
    <>
      <circle cx="24" cy="24" r="6" {...commonProps} stroke={PINK} />
      <path
        d="M24 6v5M24 37v5M42 24h-5M11 24H6M36.7 11.3l-3.5 3.5M14.8 33.2l-3.5 3.5M36.7 36.7l-3.5-3.5M14.8 14.8l-3.5-3.5"
        {...commonProps}
      />
    </>
  ),
  web: (
    <>
      <circle cx="24" cy="24" r="17" {...commonProps} />
      <path d="M7 24h34M24 7c5 5 5 29 0 34M24 7c-5 5-5 29 0 34" {...commonProps} stroke={PINK} />
    </>
  ),
  sales: (
    <>
      <circle cx="24" cy="24" r="17" {...commonProps} />
      <path d="M24 15v18M28 19c0-2.2-1.8-3.5-4-3.5s-4 1.3-4 3.3c0 4.5 8 2.5 8 7 0 2.2-1.8 3.4-4 3.4s-4-1.4-4-3.4" {...commonProps} stroke={PINK} />
    </>
  ),
};

export function ModuleIcon({
  name,
  className = "h-8 w-8",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" role="img">
      {paths[name]}
    </svg>
  );
}
