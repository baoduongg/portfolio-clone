"use client";

import { useEffect, useState } from "react";

// Keeps the modal mounted through its closing animation instead of the
// abrupt `if (!open) return null` unmount every panel used before.
export function Modal({
  open,
  onClose,
  className = "",
  children,
}: {
  open: boolean;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const [rendered, setRendered] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setRendered(true);
      setClosing(false);
    } else if (rendered) {
      setClosing(true);
    }
  }, [open, rendered]);

  if (!rendered) return null;

  return (
    <div
      className={`ww-modal-backdrop ${closing ? "ww-modal-closing" : ""}`}
      onClick={onClose}
      onAnimationEnd={(e) => {
        if (closing && e.target === e.currentTarget) setRendered(false);
      }}
    >
      <div className={`${className} ${closing ? "ww-modal-closing" : ""}`} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
