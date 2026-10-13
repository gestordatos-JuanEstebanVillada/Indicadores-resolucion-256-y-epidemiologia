import React, { useState, useEffect } from 'react';
import '@tableau/embedding-api';
import { API_URL } from '../config/api.js';
import './TableauDashboard.css';

const TableauDashboard = () => {
  const [jwtToken, setJwtToken] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const generarToken = async () => {
      const authToken = localStorage.getItem('token');
      if (!authToken) {
        setError('Debes iniciar sesión para ver el tablero.');
        return;
      }

      try {
        const response = await fetch(`${API_URL}/tableau/embed-token`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.detail || 'No se pudo obtener el token de Tableau');
        }

        const data = await response.json();
        setJwtToken(data.token);
        setError(null);
      } catch (err) {
        console.error('Error al generar token:', err);
        setError(err.message || 'Error al generar token de Tableau');
      }
    };

    generarToken();
  }, []);

  return (
    <div className="tableau-container">
      {error ? (
        <div className="flex flex-col justify-center items-center h-full gap-2 text-center px-6">
          <span className="text-[13px] font-semibold text-red-600">{error}</span>
          <span className="text-xs text-slate-500">
            El token se genera en el servidor; no hace falta HTTPS en la app para este paso.
          </span>
        </div>
      ) : jwtToken ? (
        <tableau-viz
          id="tableau-viz"
          src="https://us-east-1.online.tableau.com/t/laliga-amasalvarvidas/views/AccesoeIngreso-OportunidaddeConsulta_17822371792140/Inicio-AccesoeIngreso-OportunidadenConsultas"
          token={jwtToken}
          width="100%"
          height="100%"
          toolbar="bottom"
        ></tableau-viz>
      ) : (
        <div className="flex flex-col justify-center items-center h-full gap-3 text-slate-400">
          <svg
            className="animate-spin h-7 w-7 text-[#1E3A8A]"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8z"
            />
          </svg>
          <span className="text-[13px] font-semibold text-slate-500">
            Autenticando tablero de forma segura…
          </span>
        </div>
      )}
    </div>
  );
};

export default TableauDashboard;
