import React, { useState, useEffect } from 'react';
import '@tableau/embedding-api';
import { SignJWT } from 'jose';
import './TableauDashboard.css'; 

const TableauDashboard = () => {
  const [jwtToken, setJwtToken] = useState(null);

  const clientId = import.meta.env.VITE_TABLEAU_CLIENT_ID;
  const secretId = import.meta.env.VITE_TABLEAU_SECRET_ID;
  const secretValue = import.meta.env.VITE_TABLEAU_SECRET_VALUE;
  const username = import.meta.env.VITE_TABLEAU_USERNAME;

  useEffect(() => {
    const generarToken = async () => {
      try {
        const secret = new TextEncoder().encode(secretValue);
        const ahora = Math.floor(Date.now() / 1000) - 60;

        const token = await new SignJWT({
          iss: clientId,
          sub: username,
          aud: 'tableau',
          scp: ['tableau:views:embed', 'tableau:metrics:embed']
        })
          .setProtectedHeader({
            alg: 'HS256',
            kid: secretId,
            iss: clientId
          })
          .setJti(crypto.randomUUID())
          .setIssuedAt(ahora)
          .setExpirationTime(ahora + 300)
          .sign(secret);

        setJwtToken(token);
      } catch (error) {
        console.error('Error al generar token:', error);
      }
    };

    generarToken();
  }, [clientId, secretId, secretValue, username]);

  return (
    <div className="tableau-container">
      {jwtToken ? (
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
