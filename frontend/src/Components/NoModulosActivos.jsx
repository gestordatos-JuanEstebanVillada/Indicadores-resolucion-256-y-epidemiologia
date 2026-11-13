import React from "react";
import { LayoutGrid } from "lucide-react";

export default function NoModulosActivos() {
  return (
    <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center px-4">
      <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-500">
          <LayoutGrid size={28} strokeWidth={1.5} />
        </div>
        <h2 className="text-lg font-semibold text-gray-800">Sin módulos activos</h2>
        <p className="mt-3 text-sm leading-relaxed text-gray-500">
          No tienes módulos activos asignados. Por favor contacta al administrador del
          sistema.
        </p>
      </div>
    </div>
  );
}
