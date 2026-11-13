import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import { logoLiga50 } from "./assets/images";
import Login from "./pages/Login";
import MainDashboard from "./pages/MainDashboard";
import PlanesMejora from "./pages/PlanesMejora";
import GestionAccesos from "./pages/admin/GestionAccesos";
import GestionModulos from "./pages/admin/GestionModulos";
import AuditoriaList from "./pages/AuditoriaList";
import DashboardLayout from "./pages/layout/DashboardLayout";
import ProtectedRoute from "./pages/routing/ProtectedRoute";
import GestionAdminRoute from "./pages/routing/GestionAdminRoute";
import GlobalAdminRoute from "./pages/routing/GlobalAdminRoute";
import {
  ModuloFormularioPage,
  ModuloGraficosPage,
  ModuloIndicadoresPage,
} from "./routes/ModuloRoutes";
import { MODULO_EPIDEMIOLOGIA, MODULO_RESOLUCION_256 } from "./utils/moduleConstants";

export default function App() {
  return (
    <>
      <Toaster
        position="top-center"
        reverseOrder={false}
        containerStyle={{ zIndex: 99999, top: 12 }}
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
          success: { style: { background: "#059669", color: "#fff" } },
          error: { style: { background: "#e11d48", color: "#fff" } },
        }}
      />
      <Routes>
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

        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<MainDashboard />} />

          <Route
            path="resolucion256"
            element={
              <Navigate
                to={`/app/${MODULO_RESOLUCION_256}/formulario`}
                replace
              />
            }
          />
          <Route
            path="indicadores"
            element={
              <Navigate
                to={`/app/${MODULO_RESOLUCION_256}/indicadores`}
                replace
              />
            }
          />
          <Route
            path="indicadores/graficos"
            element={
              <Navigate
                to={`/app/${MODULO_RESOLUCION_256}/graficos`}
                replace
              />
            }
          />
          <Route
            path="infecciones/formulario"
            element={
              <Navigate
                to={`/app/${MODULO_EPIDEMIOLOGIA}/formulario`}
                replace
              />
            }
          />
          <Route
            path="infecciones/indicadores"
            element={
              <Navigate
                to={`/app/${MODULO_EPIDEMIOLOGIA}/indicadores`}
                replace
              />
            }
          />
          <Route
            path="infecciones/graficos"
            element={
              <Navigate to={`/app/${MODULO_EPIDEMIOLOGIA}/graficos`} replace />
            }
          />

          <Route
            path=":moduloCodigo/formulario"
            element={<ModuloFormularioPage />}
          />
          <Route
            path=":moduloCodigo/indicadores"
            element={<ModuloIndicadoresPage />}
          />
          <Route path=":moduloCodigo/graficos" element={<ModuloGraficosPage />} />

          <Route path="planes-mejora" element={<PlanesMejora />} />

          <Route
            path="gestion-accesos"
            element={
              <GestionAdminRoute>
                <GestionAccesos />
              </GestionAdminRoute>
            }
          />
          <Route
            path="gestion-modulos"
            element={
              <GlobalAdminRoute>
                <GestionModulos />
              </GlobalAdminRoute>
            }
          />
          <Route
            path="usuarios"
            element={<Navigate to="/app/gestion-accesos" replace />}
          />
          <Route
            path="auditoria"
            element={
              <GestionAdminRoute>
                <AuditoriaList />
              </GestionAdminRoute>
            }
          />
        </Route>
      </Routes>
    </>
  );
}
