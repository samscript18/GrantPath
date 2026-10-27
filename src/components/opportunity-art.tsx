/** Decorative brand artwork. No scholarship or student data is represented. */
export function OpportunityArt({
  className = "",
  dark = false,
}: {
  className?: string;
  dark?: boolean;
}) {
  const ink = dark ? "#dce5c9" : "#183e2e";
  return (
    <svg
      viewBox="0 0 480 480"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M80 432V205a160 160 0 0 1 320 0v227" stroke={ink} strokeOpacity=".18" />
      <path d="M104 432V205a136 136 0 0 1 272 0v227" stroke={ink} strokeOpacity=".2" />
      <path d="M128 432V205a112 112 0 0 1 224 0v227" fill={dark ? "#31583e" : "#d9e1c8"} />
      <circle cx="240" cy="179" r="46" fill="#d4a64e" />
      <path d="M128 273c73-60 142-66 224-26v185H128V273Z" fill={dark ? "#4a6b48" : "#9aac80"} />
      <path d="M128 333c87-84 154-65 224-18v117H128v-99Z" fill={dark ? "#1c3e2d" : "#617a4c"} />
      <path
        d="M240 432c0-44 47-53 47-88 0-27-47-26-47-56 0-19 12-33 12-33"
        stroke={dark ? "#c9d4ad" : "#eef0db"}
        strokeWidth="13"
      />
      <path d="M56 432h368M240 28v29M36 205h27M417 205h27" stroke={ink} strokeOpacity=".3" />
      <path
        d="M211 255v-33m0 13c-20 0-29-12-27-27 17-2 27 10 27 27Zm1-7c0-17 10-27 25-26 2 16-9 26-25 26Z"
        stroke={ink}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="400" cy="80" r="4" fill="#d4a64e" />
      <path d="M67 344h19m-9-9v19m317-218h17m-8-8v17" stroke={ink} strokeOpacity=".45" />
    </svg>
  );
}
