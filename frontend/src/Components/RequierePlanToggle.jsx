import React from "react";

function normalizeFlag(value) {
  return (value || "NO").toUpperCase() === "SI" ? "SI" : "NO";
}

/** Switch SÍ/NO. Si recibe `onToggle`, cada clic alterna el estado. */
export default function RequierePlanToggle({ value, onToggle }) {
  const isSi = normalizeFlag(value) === "SI";
  const interactive = typeof onToggle === "function";

  function handleClick(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!interactive) {
      return;
    }
    onToggle();
    event.currentTarget.blur();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2 ${
        interactive ? "cursor-pointer" : "cursor-not-allowed opacity-60"
      } ${isSi ? "bg-pink-600" : "bg-gray-200"}`}
      aria-pressed={isSi}
      aria-label={isSi ? "Requiere plan: sí" : "Requiere plan: no"}
    >
      <span
        aria-hidden
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          isSi ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
