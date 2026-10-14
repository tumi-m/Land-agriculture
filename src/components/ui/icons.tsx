/**
 * The interface's icons, drawn inline. The unicode glyphs they replace
 * (⌕ ⌖ ↶ ↷ ⛶ ☾ ☀ ● × ⌃ ⌄ ↗) depend on whatever font a device has, and several
 * fall back to an empty box on Android. Each icon is 1em square, takes the
 * text colour, and is hidden from assistive technology: the control that
 * holds it carries the name.
 */
import type { ReactNode, SVGProps } from "react";

type IconProps = Omit<SVGProps<SVGSVGElement>, "children">;

function Icon({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="icon"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconClose = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);

/** Reframe / recentre the view. */
export const IconReframe = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="6.5" />
    <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
  </Icon>
);

export const IconRotateLeft = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 5v5h5" />
    <path d="M4.6 14.5A8 8 0 1 0 6.3 6.3L4 9.6" />
  </Icon>
);

export const IconRotateRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 5v5h-5" />
    <path d="M19.4 14.5A8 8 0 1 1 17.7 6.3L20 9.6" />
  </Icon>
);

export const IconMoon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />
  </Icon>
);

export const IconSun = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icon>
);

/** Give the map the whole screen. */
export const IconExpand = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </Icon>
);

export const IconSearch = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4.3-4.3" />
  </Icon>
);

export const IconChevronUp = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 15l6-6 6 6" />
  </Icon>
);

export const IconChevronDown = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 9l6 6 6-6" />
  </Icon>
);

/** Goes somewhere else: another view, or another site. */
export const IconArrowOut = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 17L17 7M8 7h9v9" />
  </Icon>
);

/** A filled swatch in the current text colour, for a layer's key. */
export const IconDot = (p: IconProps) => (
  <Icon {...p} stroke="none" fill="currentColor">
    <circle cx="12" cy="12" r="5" />
  </Icon>
);

export const IconSpeaker = ({ on, ...p }: IconProps & { on: boolean }) => (
  <Icon {...p}>
    <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" stroke="none" />
    {on ? <path d="M16 9.5a3.5 3.5 0 0 1 0 5M18.5 7a7 7 0 0 1 0 10" /> : <path d="M16 9.5l5 5m0-5l-5 5" />}
  </Icon>
);
