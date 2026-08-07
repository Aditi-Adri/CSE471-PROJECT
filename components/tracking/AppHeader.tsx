"use client";

import type { ReactNode, MouseEventHandler } from "react";

export default function AppHeader({
  pillLabel,
  pillDotColor = "#3b82f6",
}: {
  pillLabel: string;
  pillDotColor?: string;
}) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center", // Centers the pill horizontally above the map
        padding: "18px 4px 8px",
        maxWidth: 960,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "var(--tracking-pill-bg)",
          borderRadius: 999,
          padding: "7px 14px",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {pillLabel}
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: pillDotColor,
            display: "inline-block",
          }}
        />
      </div>
    </header>
  );
}

export function HeaderButton({
  children,
  onClick,
  href,
}: {
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  href?: string;
}) {
  const style = {
    background: "var(--tracking-pill-bg)",
    border: "none",
    borderRadius: 999,
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 600,
    color: "var(--tracking-ink)",
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-block",
  } as const;

  if (href) {
    return (
      <a href={href} style={style}>
        {children}
      </a>
    );
  }
  return (
    <button onClick={onClick} style={style}>
      {children}
    </button>
  );
}