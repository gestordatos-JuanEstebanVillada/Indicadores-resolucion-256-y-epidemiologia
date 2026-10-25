import React from "react";

import { Outlet, useLocation } from "react-router-dom";

import Sidebar from "./Sidebar";

import NotificationBell from "./Components/Notifications/NotificationBell";



function getDisplayName() {

  const nombres = localStorage.getItem("nombres")?.trim();

  if (nombres) {

    return nombres.split(/\s+/)[0];

  }

  const username = localStorage.getItem("username")?.trim();

  if (username) {

    return username;

  }

  return "Usuario";

}



export default function Dashboard() {

  const location = useLocation();

  const firstName = getDisplayName();



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

            <Outlet />

          </div>

        </section>

      </main>

    </div>

  );

}


