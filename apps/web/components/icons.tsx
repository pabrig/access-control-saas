import type { ReactNode } from "react";

type IconName =
  | "home"
  | "users"
  | "calendar"
  | "clock"
  | "plus"
  | "sun"
  | "moon"
  | "whatsapp"
  | "copy"
  | "mail"
  | "chevron"
  | "car"
  | "person"
  | "wrench"
  | "back"
  | "logout"
  | "qr"
  | "enter"
  | "exit"
  | "pin"
  | "more";

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {ICONS[name]}
    </svg>
  );
}

const ICONS: Record<IconName, ReactNode> = {
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 10v10h5v-6h4v6h5V10" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M21.5 19a4.5 4.5 0 0 0-6-4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M8 3.5v3M16 3.5v3M3.5 10h17" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3.2 2" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.8v2.2M12 19v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.8 12h2.2M19 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z" />,
  whatsapp: (
    <>
      <path d="M19.2 12.4A7.2 7.2 0 0 1 7.4 19L5 20.2l1.3-2.3A7.2 7.2 0 1 1 19.2 12.4z" />
      <path d="M9.4 9.6c.2-.6.3-.6.6-.6h.5c.2 0 .4.1.5.4l.6 1.5c.1.2 0 .4-.1.6l-.4.5c-.1.1-.1.3 0 .5.3.5.8 1 1.3 1.3.2.1.4.1.5 0l.5-.4c.2-.2.4-.2.6-.1l1.5.6c.3.1.4.3.4.5v.5c0 .3 0 .4-.6.6A4.6 4.6 0 0 1 9.4 9.6z" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M6 15.5H5.5A2 2 0 0 1 3.5 13.5v-8A2 2 0 0 1 5.5 3.5h8A2 2 0 0 1 15.5 5.5V6" />
    </>
  ),
  mail: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  chevron: <path d="m9 5 7 7-7 7" />,
  car: (
    <>
      <path d="M4 14h16l-1.2-4.2A2 2 0 0 0 16.9 8.5H7.1A2 2 0 0 0 5.2 9.8L4 14z" />
      <path d="M6.5 17.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17.5 17.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
      <path d="M8 14.5h8" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 19a7 7 0 0 1 14 0" />
    </>
  ),
  wrench: (
    <path d="M15 6.2a3.6 3.6 0 0 1-4.6 4.6L5 16.2 7.8 19l5.4-5.4A3.6 3.6 0 1 0 15 6.2z" />
  ),
  back: <path d="M15 5 8 12l7 7" />,
  logout: (
    <>
      <path d="M10 5H6.5A2.5 2.5 0 0 0 4 7.5v9A2.5 2.5 0 0 0 6.5 19H10" />
      <path d="M10 12h10M16 8l4 4-4 4" />
    </>
  ),
  qr: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" />
      <path d="M14 14h2.5v2.5H14zM18 14h2v2h-2zM14 18h2v2h-2zM18.5 18.5H21V21" />
    </>
  ),
  enter: (
    <>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="m10 17 5-5-5-5" />
      <path d="M15 12H3" />
    </>
  ),
  exit: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.2" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" />
    </>
  ),
};
