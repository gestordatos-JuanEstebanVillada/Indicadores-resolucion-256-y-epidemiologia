import { useEffect } from "react";
import { createPortal } from "react-dom";

export default function ModalOverlay({ onBackdropClick, children }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/55 p-4 sm:p-6 backdrop-blur-sm"
      onMouseDown={onBackdropClick}
    >
      {children}
    </div>,
    document.body
  );
}
