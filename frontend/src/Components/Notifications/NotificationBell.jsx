import React, { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { MODULO_EPIDEMIOLOGIA } from "../../utils/moduleConstants";
import PlanMejoraModal from "./PlanMejoraModal";
import {
  fetchAllIncumplimientos,
  incumplimientoKey,
} from "../../utils/fetchIncumplimientos";
import { INCUMPLIMIENTOS_REFRESH_EVENT } from "../../utils/incumplimientosEvents";

function chartsPathForModulo(modulo) {
  if (modulo === MODULO_EPIDEMIOLOGIA) {
    return "/app/infecciones/graficos";
  }
  return "/app/indicadores/graficos";
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const panelRef = useRef(null);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      setAlerts(await fetchAllIncumplimientos());
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 120000);
    function onRefresh() {
      loadAlerts();
    }
    window.addEventListener(INCUMPLIMIENTOS_REFRESH_EVENT, onRefresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener(INCUMPLIMIENTOS_REFRESH_EVENT, onRefresh);
    };
  }, [loadAlerts]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handlePlanSaved(alert) {
    setAlerts((current) =>
      current.filter((item) => incumplimientoKey(item) !== incumplimientoKey(alert))
    );
    setSelectedAlert(null);
  }

  function goToCharts(alert) {
    setOpen(false);
    navigate(chartsPathForModulo(alert.modulo), {
      state: {
        indicadorId: alert.calidad_id,
        year: alert.year,
      },
    });
  }

  const count = alerts.length;

  return (
    <>
      <div className="relative" ref={panelRef}>
        <button
          type="button"
          onClick={() => {
            setOpen((value) => !value);
            if (!open) {
              loadAlerts();
            }
          }}
          className="relative rounded-xl border border-gray-200 bg-white p-2.5 text-gray-600 shadow-sm hover:bg-gray-50 hover:text-pink-600 transition"
          aria-label="Notificaciones de incumplimiento de meta"
        >
          <Bell size={20} />
          {count > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-bold text-white">
              {count > 99 ? "99+" : count}
            </span>
          ) : null}
        </button>

        {open ? (
          <div className="absolute right-0 z-50 mt-2 w-[min(420px,calc(100vw-2rem))] rounded-2xl border border-gray-200 bg-white shadow-xl">
            <div className="border-b border-gray-100 px-4 py-3">
              <h3 className="font-semibold text-gray-900">Notificaciones y alertas</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {loading
                  ? "Actualizando…"
                  : `${count} incidencia${count === 1 ? "" : "s"} sin plan de mejora`}
              </p>
            </div>

            <div className="max-h-96 overflow-y-auto p-2">
              {!loading && count === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-gray-500">
                  No hay alertas pendientes.
                </p>
              ) : null}

              {alerts.map((alert) => (
                <article
                  key={incumplimientoKey(alert)}
                  className="mb-2 rounded-xl border border-amber-100 bg-amber-50/60 p-3 last:mb-0"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => goToCharts(alert)}
                      className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 border border-amber-200 hover:bg-amber-100"
                      title="Ver gráficos del indicador"
                    >
                      {alert.mes_nombre} {alert.year}
                    </button>
                    <button
                      type="button"
                      onClick={() => goToCharts(alert)}
                      className="rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-semibold text-pink-800 hover:bg-pink-200"
                      title="Ver gráficos del módulo"
                    >
                      {alert.modulo}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => goToCharts(alert)}
                    className="text-left text-sm font-semibold text-gray-900 hover:text-pink-600 leading-snug w-full"
                    title="Abrir gráficos de este indicador"
                  >
                    {alert.indicador}
                  </button>
                  <p className="text-sm text-gray-700 leading-snug mt-1">{alert.mensaje}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAlert(alert);
                      setOpen(false);
                    }}
                    className="mt-3 text-sm font-medium text-pink-600 hover:text-pink-700"
                  >
                    Aplicar plan de mejora
                  </button>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <PlanMejoraModal
        alert={selectedAlert}
        onClose={() => setSelectedAlert(null)}
        onSaved={handlePlanSaved}
      />
    </>
  );
}
