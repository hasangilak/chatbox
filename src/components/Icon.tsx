import type { SVGProps } from "react";

export type IconName =
  | "search"
  | "plus"
  | "sun"
  | "moon"
  | "tree"
  | "chev"
  | "chevd"
  | "dots"
  | "pin"
  | "edit"
  | "copy"
  | "branch"
  | "check"
  | "x"
  | "play"
  | "layout1"
  | "layout2"
  | "layout3"
  | "canvas"
  | "cog"
  | "users"
  | "book"
  | "clock"
  | "wand"
  | "folder"
  | "tag"
  | "share"
  | "export"
  | "brain"
  | "tool"
  | "paper"
  | "canvasArrow"
  | "bolt"
  | "attach"
  | "sliders";

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 14, ...rest }: IconProps): JSX.Element | null {
  const common: SVGProps<SVGSVGElement> = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    ...rest,
  };

  switch (name) {
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "sun":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      );
    case "moon":
      return (
        <svg {...common}>
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      );
    case "tree":
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="2" />
          <circle cx="18" cy="6" r="2" />
          <circle cx="12" cy="18" r="2" />
          <path d="M12 16V9M8 6h8" />
        </svg>
      );
    case "chev":
      return (
        <svg {...common}>
          <path d="m9 6 6 6-6 6" />
        </svg>
      );
    case "chevd":
      return (
        <svg {...common}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case "dots":
      return (
        <svg {...common}>
          <circle cx="5" cy="12" r="1" />
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
        </svg>
      );
    case "pin":
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M12 2l2 5h5l-4 3 2 6-5-3-5 3 2-6-4-3h5z" />
        </svg>
      );
    case "edit":
      return (
        <svg {...common}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z" />
        </svg>
      );
    case "copy":
      return (
        <svg {...common}>
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <rect x="4" y="4" width="11" height="11" rx="2" />
        </svg>
      );
    case "branch":
      return (
        <svg {...common}>
          <circle cx="6" cy="4" r="2" />
          <circle cx="6" cy="20" r="2" />
          <circle cx="18" cy="12" r="2" />
          <path d="M6 6v12M6 12a6 6 0 0 0 6 0h4" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 5 5L20 7" />
        </svg>
      );
    case "x":
      return (
        <svg {...common}>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      );
    case "play":
      return (
        <svg {...common}>
          <path d="m6 4 14 8-14 8z" fill="currentColor" />
        </svg>
      );
    case "layout1":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="6" height="16" rx="1" />
          <rect x="10" y="4" width="7" height="16" rx="1" />
          <rect x="18" y="4" width="3" height="16" rx="1" />
        </svg>
      );
    case "layout2":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="4" height="16" rx="1" />
          <rect x="8" y="4" width="10" height="16" rx="1" />
          <rect x="19" y="4" width="2" height="16" rx="1" />
        </svg>
      );
    case "layout3":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="5" height="16" rx="1" />
          <rect x="9" y="4" width="7" height="16" rx="1" />
          <rect x="17" y="4" width="4" height="16" rx="1" />
        </svg>
      );
    case "canvas":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="1" />
          <path d="M3 10h18" />
        </svg>
      );
    case "cog":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="8.5" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.9M17 3.1a4 4 0 0 1 0 7.8" />
        </svg>
      );
    case "book":
      return (
        <svg {...common}>
          <path d="M4 4h10a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z" />
          <path d="M4 4v16" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "wand":
      return (
        <svg {...common}>
          <path d="m15 4 2 2M9 11l7-7 4 4-7 7zM4 20l4-4" />
          <path d="M18 10v3M20 11h-3M5 4v3M6 5H3" />
        </svg>
      );
    case "folder":
      return (
        <svg {...common}>
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
      );
    case "tag":
      return (
        <svg {...common}>
          <path d="M20 13 13 20a2 2 0 0 1-3 0l-7-7V4h9l8 8a2 2 0 0 1 0 2.8z" />
          <circle cx="8" cy="8" r="1.5" fill="currentColor" />
        </svg>
      );
    case "share":
      return (
        <svg {...common}>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.6 13.5 6.8 4M15.4 6.5 8.6 10.5" />
        </svg>
      );
    case "export":
      return (
        <svg {...common}>
          <path d="M12 3v12m0 0-4-4m4 4 4-4" />
          <path d="M20 17v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2" />
        </svg>
      );
    case "brain":
      return (
        <svg {...common}>
          <path d="M9 3a3 3 0 0 0-3 3v1a3 3 0 0 0-3 3 3 3 0 0 0 3 3v1a3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3zM15 3a3 3 0 0 1 3 3v1a3 3 0 0 1 3 3 3 3 0 0 1-3 3v1a3 3 0 0 1-3 3 3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z" />
        </svg>
      );
    case "tool":
      return (
        <svg {...common}>
          <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z" />
        </svg>
      );
    case "paper":
      return (
        <svg {...common}>
          <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
          <path d="M14 3v6h6M8 13h8M8 17h5" />
        </svg>
      );
    case "canvasArrow":
      return (
        <svg {...common}>
          <path d="M15 3h6v6M21 3l-8 8" />
          <path d="M9 21H3v-6M3 21l8-8" />
        </svg>
      );
    case "bolt":
      return (
        <svg {...common}>
          <path d="M13 2 3 14h7l-1 8 10-12h-7z" />
        </svg>
      );
    case "attach":
      return (
        <svg {...common}>
          <path d="M21 10.5 11.5 20a5 5 0 0 1-7-7l10-10a3 3 0 0 1 4.2 4.2l-9.9 9.9a1 1 0 0 1-1.4-1.4L16 7" />
        </svg>
      );
    case "sliders":
      return (
        <svg {...common}>
          <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
        </svg>
      );
    default:
      return null;
  }
}
