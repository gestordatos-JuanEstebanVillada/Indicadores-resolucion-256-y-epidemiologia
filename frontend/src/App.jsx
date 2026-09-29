import React from "react";
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
import TableauView from "./Components/TableauView/TableauView";

export default function App() {
  return (
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
                    src="/src/IMG/logo-liga-50.png"
                    alt="Logo"
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

        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <TableauView />
            </ProtectedRoute>
          }
          />

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

      </Route>

    </Routes>
  );
}