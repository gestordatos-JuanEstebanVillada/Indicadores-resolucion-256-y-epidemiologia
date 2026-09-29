import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import TableauEmbed from "./Components/TableauEmbed";

export default function Dashboard() {

  const location = useLocation();

  const getTitle = () => {

    if (location.pathname.includes("pacientes")) {
      return "Pacientes";
    }

    if (location.pathname.includes("infecciones")) {
      return "Infecciones";
    }

    if (location.pathname.includes("reportes")) {
      return "Reportes";
    }

    if (location.pathname.includes("indicadores")) {
      return "Indicadores";
    }

    return "Indicadores de Calidad";
  };

  return (
    <div className="min-h-screen flex bg-[#f6f7f9]">

      <Sidebar />

      <main className="flex-1 min-w-0">

        {/* HEADER */}
        <header className="h-20 bg-white border-b border-gray-200 flex items-center px-8">

          <div>
            <h1 className="text-xl font-semibold text-gray-800">
              {getTitle()}
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Gestión de indicadores de calidad
            </p>
          </div>

        </header>

        {/* CONTENIDO */}
        <section className="p-8">

          <div className="max-w-7xl mx-auto">
            <Outlet />
            
          </div>
        </section>

      </main>

    </div>
  );
}

