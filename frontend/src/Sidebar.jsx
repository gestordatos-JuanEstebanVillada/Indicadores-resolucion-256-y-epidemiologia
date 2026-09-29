import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

import {
  Activity,
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  LogOut,
  HeartPulse,
  FileSpreadsheet,
  Hospital,
} from "lucide-react";

const items = [
  {
    name: "Dashboard",
    path: "/app",
    icon: FileSpreadsheet,
  },
  {
    name: "Resolución 256",
    icon: HeartPulse,
    subItems: [
      {
        name: "Formulario",
        path: "/app/resolucion256",
      },
      {
        name: "Indicadores",
        path: "/app/indicadores",
      },
      {
        name: "Gráficos",
        path: "/app/indicadores/graficos",
      },
    ],
  },
  {
    name: "Infecciones",
    icon: Activity,
    subItems: [
      {
        name: "Formulario / Carga",
        path: "/app/infecciones/formulario",
      },
      {
        name: "Indicadores",
        path: "/app/infecciones/indicadores",
      },
      {
        name: "Gráficos",
        path: "/app/infecciones/graficos",
      },
    ],
  },
];

const navLinkBaseClass = (isActive, collapsed) => `
  flex
  items-center
  gap-3
  rounded-xl
  px-3
  py-3
  transition
  group
  ${
    isActive
      ? "bg-pink-50 text-pink-600"
      : "text-gray-600 hover:bg-gray-50"
  }
  ${collapsed ? "justify-center" : ""}
`;

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState({});

  const navigate = useNavigate();

  const toggleMenu = (name) =>
    setOpenMenus((prev) => ({ ...prev, [name]: !prev[name] }));

  const handleMenuClick = (itemName, hasSubItems) => {
    if (collapsed && hasSubItems) {
      setCollapsed(false);
      setOpenMenus((prev) => ({ ...prev, [itemName]: true }));
    } else if (hasSubItems) {
      toggleMenu(itemName);
    }
  };

  function logout() {
    localStorage.removeItem("token");
    navigate("/");
  }

  return (
    <aside
      className={`
        h-screen
        sticky
        top-0
        bg-white
        border-r
        border-gray-200
        flex
        flex-col
        transition-all
        duration-300
        ${collapsed ? "w-20" : "w-64"}
      `}
    >
      {/* LOGO */}
      <div
        className={`
          h-20
          flex
          items-center
          border-b
          border-gray-200
          ${collapsed ? "justify-center" : "justify-between px-5"}
        `}
      >
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="p-8 text-center">
              <img
                src="/src/IMG/logo-liga-50.png"
                alt="Logo"
                className="mx-auto w-100 h-auto"
              />
            </div>

            <div />
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center transition"
        >
          {collapsed ? (
            <ChevronRight size={20} />
          ) : (
            <ChevronLeft size={20} />
          )}
        </button>
      </div>

      {/* MENU */}
      <nav className="flex-1 p-3 space-y-1">
        {!collapsed && (
          <p className="px-3 pt-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Módulos
          </p>
        )}

        {items.map((item) => {
          const Icon = item.icon;

          if (!item.subItems) {
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  navLinkBaseClass(isActive, collapsed)
                }
              >
                <Icon size={20} strokeWidth={1.8} />

                {!collapsed && (
                  <span className="font-medium text-sm">{item.name}</span>
                )}
              </NavLink>
            );
          }

          return (
            <div key={item.name}>
              <button
                type="button"
                onClick={() =>
                  handleMenuClick(item.name, Boolean(item.subItems))
                }
                className={`
                  w-full
                  flex
                  items-center
                  gap-3
                  rounded-xl
                  px-3
                  py-3
                  transition
                  group
                  text-gray-600
                  hover:bg-gray-50
                  ${collapsed ? "justify-center" : ""}
                `}
              >
                <Icon size={20} strokeWidth={1.8} />

                {!collapsed && (
                  <>
                    <span className="font-medium text-sm flex-1 text-left">
                      {item.name}
                    </span>

                    {openMenus[item.name] ? (
                      <ChevronUp size={18} />
                    ) : (
                      <ChevronDown size={18} />
                    )}
                  </>
                )}
              </button>

              {openMenus[item.name] && !collapsed && (
                <div className="mt-1 space-y-1">
                  {item.subItems.map((subItem) => (
                    <NavLink
                      key={subItem.path}
                      to={subItem.path}
                      className={({ isActive }) => `
                        flex
                        items-center
                        gap-3
                        rounded-xl
                        pl-12
                        pr-3
                        py-2.5
                        transition
                        text-sm
                        ${
                          isActive
                            ? "bg-pink-50 text-pink-600 font-medium"
                            : "text-gray-600 hover:bg-gray-50"
                        }
                      `}
                    >
                      {subItem.name}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* FOOTER */}
      <div className="p-3 border-t border-gray-200">
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-3 mb-2">
            <div className="w-9 h-9 rounded-full bg-pink-100 flex items-center justify-center">
              <Hospital size={18} className="text-pink-600" />
            </div>

            <div>
              <p className="text-sm font-medium text-gray-800">Indicadores</p>
              <p className="text-xs text-gray-400">Sistema de calidad</p>
            </div>
          </div>
        )}

        <button
          onClick={logout}
          className={`
            w-full
            flex
            items-center
            gap-3
            px-3
            py-3
            rounded-xl
            text-gray-500
            hover:bg-red-50
            hover:text-red-600
            transition
            ${collapsed ? "justify-center" : ""}
          `}
        >
          <LogOut size={19} />

          {!collapsed && (
            <span className="text-sm">Cerrar sesión</span>
          )}
        </button>
      </div>
    </aside>
  );
}
