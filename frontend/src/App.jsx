import React from "react";
import { Toaster } from "react-hot-toast";
import { Routes, Route } from "react-router-dom";

import Login from "./Login";
import ProtectedRoute from "./ProtectedRoute";
import Dashboard from "./Dashboard";
import Resolucion256 from "./Resolucion256";
import Indicadores from "./Indicadores";
import IndicadoresCharts from "./IndicadoresCharts";
import IaasForm from "./IaasForm";
import IaasIndicadores from "./IaasIndicadores";
import IaasIndicadoresCharts from "./IaasIndicadoresCharts";
import PlanesMejora from "./PlanesMejora";
import MainDashboard from "./MainDashboard";
import { logoLiga50 } from "./assets/images.js";

export default function App() {
  return (
    <>
    <Toaster
      position="top-center"
      reverseOrder={false}
      containerStyle={{
        zIndex: 99999,
        top: 12,
      }}
      toastOptions={{
        duration: 4000,
        style: {
          maxWidth: 500,
          padding: "12px 16px",
          borderRadius: 8,
          fontSize: "14px",
          fontWeight: 500,
          boxShadow:
            "0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.1)",
        },
        success: {
          style: {
            background: "#059669",
            color: "#fff",
          },
        },
        error: {
          style: {
            background: "#e11d48",
            color: "#fff",
          },
        },
      }}
    />
    <Routes>

      {/* LOGIN */}
      <Route
        path="/"
        element={
          <div className="min-h-screen flex items-center justify-center bg-pink-50 relative overflow-hidden">

            <div className="absolute -left-40 -top-40 w-96 h-96 bg-pink-200 rounded-full opacity-40 blur-3xl" />

            <div className="absolute -right-40 -bottom-40 w-96 h-96 bg-pink-300 rounded-full opacity-40 blur-3xl" />

            <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl overflow-hidden flex relative z-10">

              <div className="w-1/2 p-12">
                <div className="max-w-md">

                  <h2 className="text-pink-600 font-semibold">
                    Indicadores Calidad
                  </h2>

                  

                  <div className="mt-6">
                    <Login />
                  </div>

                </div>
              </div>

              <div className="w-1/2 bg-pink-50 flex items-center justify-center">
                <div className="p-8 text-center">

                  <img
                    src={logoLiga50}
                    alt="Logo Liga Contra el Cáncer"
                    className="mx-auto w-100 h-auto"
                  />

                </div>
              </div>

            </div>
          </div>
        }
      />

      {/* SISTEMA */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      >

        <Route index element={<MainDashboard />} />

        {/* PACIENTES */}
        <Route
          path="resolucion256"
          element={<Resolucion256 />}
        />

        <Route
          path="indicadores/graficos"
          element={<IndicadoresCharts />}
        />

        <Route
          path="indicadores"
          element={<Indicadores />}
        />

        <Route
          path="infecciones/formulario"
          element={<IaasForm />}
        />

        <Route
          path="infecciones/graficos"
          element={<IaasIndicadoresCharts />}
        />

        <Route
          path="infecciones/indicadores"
          element={<IaasIndicadores />}
        />

        <Route path="planes-mejora" element={<PlanesMejora />} />

      </Route>

    </Routes>
    </>
  );
}