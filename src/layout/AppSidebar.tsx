import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  GridIcon,
  HorizontaLDots,
} from "../icons";
import { useSidebar } from "../context/SidebarContext";
import { logout } from "../services/api";
import { clearAuth, getToken } from "../utils/auth";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import CustomIcon from "../components/sidebar/CustomIcon.tsx";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string }[];
};

const navItems: NavItem[] = [
  {
    name: "Roles y Permisos",
    icon:  <CustomIcon
        src="/images/sidebar/config-user.svg"
        alt="Roles y Permisos"
    />,
    subItems: [
      {
        name: "Roles",
        path: "/admin/roles",

      },
      {
        name: "Usuarios",
        path: "/admin/usuarios",

      }
    ],
  },

  {
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/dashboard",
  },

  {
    name: "Configuración",
    icon:  <CustomIcon
        src="/images/sidebar/config-user.svg"
        alt="Configuración"
    />,
    subItems: [
      {
        name: "Unidad de Medida",
        path: "/admin/unidadmedida/index",

      },
      {
        name: "Categorias",
        path: "/admin/categorias/index",

      },
    ],
  },



];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [logoutLoading, setLogoutLoading] = useState(false);

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback(
      (path: string) => location.pathname === path,
      [location.pathname]
  );

  useEffect(() => {
    let submenuMatched = false;
    navItems.forEach((nav, index) => {
      if (nav.subItems) {
        nav.subItems.forEach((subItem) => {
          if (isActive(subItem.path)) {
            setOpenSubmenu({ type: "main", index });
            submenuMatched = true;
          }
        });
      }
    });
    if (!submenuMatched) setOpenSubmenu(null);
  }, [location, isActive]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `main-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      const token = getToken();
      if (token) await logout(token);
    } catch (_) {
      // ignorar error del servidor, igual se limpia localmente
    } finally {
      clearAuth();
      setUser(null);
      toast.success("Sesión cerrada");
      navigate("/", { replace: true });
      setLogoutLoading(false);
    }
  };

  const renderMenuItems = (items: NavItem[]) => (
      <ul className="flex flex-col gap-4">
        {items.map((nav, index) => (
            <li key={nav.name}>
              {nav.subItems ? (
                  <button
                      onClick={() =>
                          setOpenSubmenu((prev) =>
                              prev && prev.index === index ? null : { type: "main", index }
                          )
                      }
                      className={`menu-item group ${
                          openSubmenu?.index === index ? "menu-item-active" : "menu-item-inactive"
                      } cursor-pointer ${
                          !isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"
                      }`}
                  >
              <span className={`menu-item-icon-size ${openSubmenu?.index === index ? "menu-item-icon-active" : "menu-item-icon-inactive"}`}>
                {nav.icon}
              </span>
                    {(isExpanded || isHovered || isMobileOpen) && (
                        <span className="menu-item-text">{nav.name}</span>
                    )}
                  </button>
              ) : (
                  nav.path && (
                      <Link
                          to={nav.path}
                          className={`menu-item group ${
                              isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                          }`}
                      >
                <span className={`menu-item-icon-size ${isActive(nav.path) ? "menu-item-icon-active" : "menu-item-icon-inactive"}`}>
                  {nav.icon}
                </span>
                        {(isExpanded || isHovered || isMobileOpen) && (
                            <span className="menu-item-text">{nav.name}</span>
                        )}
                      </Link>
                  )
              )}
              {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
                  <div
                      ref={(el) => { subMenuRefs.current[`main-${index}`] = el; }}
                      className="overflow-hidden transition-all duration-300"
                      style={{
                        height:
                            openSubmenu?.index === index
                                ? `${subMenuHeight[`main-${index}`]}px`
                                : "0px",
                      }}
                  >
                    <ul className="mt-2 space-y-1 ml-9">
                      {nav.subItems.map((subItem) => (
                          <li key={subItem.name}>
                            <Link
                                to={subItem.path}
                                className={`menu-dropdown-item ${
                                    isActive(subItem.path)
                                        ? "menu-dropdown-item-active"
                                        : "menu-dropdown-item-inactive"
                                }`}
                            >
                              {subItem.name}
                            </Link>
                          </li>
                      ))}
                    </ul>
                  </div>
              )}
            </li>
        ))}
      </ul>
  );

  return (
      <aside
          className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${isExpanded || isMobileOpen ? "w-[290px]" : isHovered ? "w-[290px]" : "w-[90px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
          onMouseEnter={() => !isExpanded && setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
      >
        {/* Logo */}
        <div className={`py-8 flex ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}>
          <Link to="/dashboard">
            {isExpanded || isHovered || isMobileOpen ? (
                <>
                  <img className="dark:hidden" src="/images/logo/logo.svg" alt="Logo" width={150} height={40} />
                  <img className="hidden dark:block" src="/images/logo/logo-dark.svg" alt="Logo" width={150} height={40} />
                </>
            ) : (
                <img src="/images/logo/logo-icon.svg" alt="Logo" width={32} height={32} />
            )}
          </Link>
        </div>

        {/* Menú */}
        <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
          <nav className="mb-6">
            <div className="flex flex-col gap-4">

              <div>
                <h2 className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}>
                  {isExpanded || isHovered || isMobileOpen ? "Menú" : <HorizontaLDots className="size-6" />}
                </h2>
                {renderMenuItems(navItems)}
              </div>

              {/* Cerrar sesión */}
              <ul className="flex flex-col gap-4">
                <li>
                  <button
                      onClick={handleLogout}
                      disabled={logoutLoading}
                      className={`menu-item group menu-item-inactive w-full cursor-pointer ${
                          !isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"
                      }`}
                  >
                  <span className="menu-item-icon-size menu-item-icon-inactive">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M18 15l3-3m0 0l-3-3m3 3H9" />
                    </svg>
                  </span>
                    {(isExpanded || isHovered || isMobileOpen) && (
                        <span className="menu-item-text">
                      {logoutLoading ? "Cerrando..." : "Cerrar sesión"}
                    </span>
                    )}
                  </button>
                </li>
              </ul>

            </div>
          </nav>
        </div>
      </aside>
  );
};

export default AppSidebar;