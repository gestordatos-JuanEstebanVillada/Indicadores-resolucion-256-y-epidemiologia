import React from "react";

import { Outlet, useLocation } from "react-router-dom";

import Sidebar from "../../Components/layout/Sidebar";

import NotificationBell from "../../Components/Notifications/NotificationBell";
import NoModulosActivos from "../../Components/NoModulosActivos";
import { useAuth } from "../../context/AuthContext";
import { esAdminGlobal, getUserModulos } from "../../utils/authRoles";

export default function Dashboard() {

  const location = useLocation();
  const { ready, nombres, username } = useAuth();

  const firstName = (() => {
    const name = (nombres || "").trim();
    if (name) {
      return name.split(/\s+/)[0];
    }
    const user = (username || "").trim();
    if (user) {
      return user;
    }
    return "Usuario";
  })();

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f7f9] text-sm text-gray-600">
        Cargando sesión…
      </div>
    );
  }

  const sinModulosActivos = !esAdminGlobal() && getUserModulos().length === 0;



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



    if (location.pathname.includes("planes-mejora")) {

      return "Planes de mejora";

    }



    if (location.pathname.includes("usuarios")) {

      return "Gestión de usuarios";

    }



    if (location.pathname.includes("auditoria")) {

      return "Auditoría";

    }



    if (location.pathname.includes("indicadores")) {

      return "Indicadores";

    }



    if (location.pathname === "/app" || location.pathname === "/app/") {

      return "Panel general";

    }



    return "Indicadores de Calidad";

  };



  return (

    <div className="min-h-screen flex bg-[#f6f7f9]">

      <Sidebar />



      <main className="flex-1 min-w-0">

        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8">

          <div>

            <h1 className="text-xl font-semibold text-gray-800">{getTitle()}</h1>



            <p className="text-sm text-gray-500 mt-1">

              Hola, bienvenido al día de hoy,{" "}

              <span className="font-medium text-gray-700">{firstName}</span>

            </p>

          </div>



          <NotificationBell />

        </header>



        <section className="p-8">

          <div className="max-w-7xl mx-auto">

            {sinModulosActivos ? <NoModulosActivos /> : <Outlet />}

          </div>

        </section>

      </main>

    </div>

  );

}


