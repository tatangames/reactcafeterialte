import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";

import { Toaster } from "react-hot-toast";
import { ScrollToTop } from "./components/common/ScrollToTop";

import SignIn from "./pages/AuthPages/SignIn";
import ResetPassword from "./pages/AuthPages/ResetPassword.tsx";
import NotFound from "./pages/OtherPage/NotFound";
import AppLayout from "./layout/AppLayout";
import Dashboard from "./pages/Dashboard/Home";
import PublicRoute from "./components/auth/PublicRoute.tsx";
import ResetPasswordConfirm from "./pages/AuthPages/ResetPasswordConfirm.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import {PermissionRoute} from "./components/auth/PermissionRoute.tsx";
import Roles from "./pages/RolesPermisos/Roles.tsx";
import RolesPermisos from "./pages/RolesPermisos/RolesPermisos.tsx";
import PermisosTodos from "./pages/RolesPermisos/PermisosTodos.tsx";
import Usuarios from "./pages/RolesPermisos/Usuarios.tsx";
import Auditoria from "./pages/RolesPermisos/Auditoria.tsx";
import UnidadMedidaConfig from "./pages/Configuracion/UnidadMedida/UnidadMedida.tsx";
import CategoriasConfig from "./pages/Configuracion/Categorias/Categorias.tsx";
import ProductosCatalogo from "./pages/Productos/ProductosCatalogo.tsx";
import ProductoRegistro from "./pages/Productos/ProductoRegistro.tsx";
import ProductoEditar from "./pages/Productos/ProductoEditar.tsx";
import InventarioStock from "./pages/Inventario/Inventario.tsx";
import InventarioEntradas from "./pages/Inventario/InventarioEntradas.tsx";
import InventarioNuevoRegistro from "./pages/Inventario/InventarioNuevoRegistro.tsx";
import InventarioConteo from "./pages/Inventario/InventarioConteo.tsx";
import InventarioKardex from "./pages/Inventario/InventarioKardex.tsx";
import InventarioMovimientos from "./pages/Inventario/InventarioMovimientos.tsx";
import Impresoras from "./pages/Configuracion/Impresoras/Impresoras.tsx";
import Proveedores from "./pages/Compras/Proveedores.tsx";
import ProveedorDetalle from "./pages/Compras/ProveedorDetalle.tsx";
import Compras from "./pages/Compras/Compras.tsx";
import CompraNueva from "./pages/Compras/CompraNueva.tsx";
import OrdenesCompra from "./pages/Compras/OrdenesCompra.tsx";
import CuentasPagar from "./pages/Compras/CuentasPagar.tsx";
import Recetas from "./pages/Produccion/Recetas.tsx";
import Produccion from "./pages/Produccion/Produccion.tsx";
import Mermas from "./pages/Produccion/Mermas.tsx";
import ResumenProduccion from "./pages/Produccion/ResumenProduccion.tsx";
import Gastos from "./pages/Gastos/Gastos.tsx";
import Reportes from "./pages/Reportes/Reportes.tsx";
import ConfiguracionNegocio from "./pages/Configuracion/Negocio/ConfiguracionNegocio.tsx";
import CajasConfig from "./pages/Configuracion/Cajas/CajasConfig.tsx";
import CajaTurno from "./pages/Caja/CajaTurno.tsx";
import CajaCierre from "./pages/Caja/CajaCierre.tsx";
import CajaHistorial from "./pages/Caja/CajaHistorial.tsx";
import CajaTurnoDetalle from "./pages/Caja/CajaTurnoDetalle.tsx";
import PosPage from "./pages/Pos/PosPage.tsx";
import MapaMesas from "./pages/Mesas/MapaMesas.tsx";
import TerminalMesa from "./pages/Mesas/TerminalMesa.tsx";
import MesasConfig from "./pages/Configuracion/Mesas/MesasConfig.tsx";
import VentasHistorial from "./pages/Ventas/VentasHistorial.tsx";
import Clientes from "./pages/Clientes/Clientes.tsx";
import ClienteDetalle from "./pages/Clientes/ClienteDetalle.tsx";
import CuentasCobrar from "./pages/Clientes/CuentasCobrar.tsx";
import PedidosEspeciales from "./pages/Pedidos/PedidosEspeciales.tsx";

export default function App() {
  return (
      <>
        <Toaster
            position="top-right"
            containerStyle={{
              zIndex: 99999999, // Mayor que z-[9999] del header
            }}
            toastOptions={{
              duration: 3000,
              style: {
                zIndex: 99999999,
              },
              success: {
                style: {
                  zIndex: 99999999,
                },
              },
              error: {
                style: {
                  zIndex: 99999999,
                },
              },
            }}
        />

        <Router>
          <ScrollToTop />

          <Routes>
            {/* RUTAS PÚBLICAS (login) */}
            <Route element={<PublicRoute />}>
              <Route path="/" element={<SignIn />} />
              <Route path="/reset-password" element={<ResetPassword/>} />
              <Route path="/admin/reset-password" element={<ResetPasswordConfirm/>} />

            </Route>

            {/* RUTAS PROTEGIDAS: cada una exige el mismo permiso que su API */}
            <Route element={<ProtectedRoute />}>
              {/* PUNTO DE VENTA: pantalla completa, sin menú lateral */}
              {/* Punto de venta: mapa de terminales, venta rápida de mostrador y mesas (pantalla completa) */}
              <Route path="/pos" element={<PermissionRoute permission="pos.vender"><MapaMesas /></PermissionRoute>} />
              <Route path="/pos/mostrador" element={<PermissionRoute permission="pos.vender"><PosPage /></PermissionRoute>} />
              <Route path="/pos/terminal/:id" element={<PermissionRoute permission="pos.vender"><TerminalMesa /></PermissionRoute>} />

              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />



                {/* ROLES */}
                <Route
                    path="/admin/roles"
                    element={
                        <PermissionRoute permission="roles.gestionar">
                        <Roles />
                      </PermissionRoute>
                    }
                />
                {/* ROLES -> PERMISOS */}
                <Route
                    path="/admin/roles/:id/permisos"
                    element={
                      <PermissionRoute permission="roles.gestionar">
                        <RolesPermisos />
                      </PermissionRoute>
                    }
                />
                {/* LISTADO DE PERMISOS */}
                <Route
                    path="/admin/permisos-todos"
                    element={
                      <PermissionRoute permission="roles.gestionar">
                        <PermisosTodos />
                      </PermissionRoute>
                    }
                />

                  {/* LISTADO DE USUARIOS */}
                  <Route
                      path="/admin/usuarios"
                      element={
                          <PermissionRoute permission="usuarios.gestionar">
                              <Usuarios />
                          </PermissionRoute>
                      }
                  />

                  { /* UNIDAD DE MEDIDA */}
                  <Route
                      path="/admin/unidadmedida/index"
                      element={
                          <PermissionRoute permission="catalogos.gestionar">
                              <UnidadMedidaConfig />
                          </PermissionRoute>
                      }
                  />
                  { /* CATEGORIAS */}
                  <Route
                      path="/admin/categorias/index"
                      element={
                          <PermissionRoute permission="catalogos.gestionar">
                              <CategoriasConfig />
                          </PermissionRoute>
                      }
                  />
                  { /* PRODUCTOS CATALOGO */}
                  <Route
                      path="/admin/productos/index"
                      element={
                          <PermissionRoute permissions={["productos.ver", "productos.gestionar"]}>
                              <ProductosCatalogo />
                          </PermissionRoute>
                      }
                  />
                  { /* PRODUCTOS REGISTRO */}
                  <Route
                      path="/admin/productos/registro"
                      element={
                          <PermissionRoute permission="productos.gestionar">
                              <ProductoRegistro />
                          </PermissionRoute>
                      }
                  />
                  { /* PRODUCTOS EDITAR */}
                  <Route
                      path="/admin/productos/editar/:id"
                      element={
                          <PermissionRoute permission="productos.gestionar">
                              <ProductoEditar />
                          </PermissionRoute>
                      }
                  />

                  { /* IMPRESORAS */}
                  <Route
                      path="/admin/impresoras/index"
                      element={
                          <PermissionRoute permission="impresoras.gestionar">
                              <Impresoras />
                          </PermissionRoute>
                      }
                  />

                  {/* Compras, proveedores y cuentas por pagar */}
                  <Route path="/compras/proveedores" element={<PermissionRoute permissions={["proveedores.gestionar", "compras.ver", "compras.gestionar", "cuentas_pagar.gestionar"]}><Proveedores /></PermissionRoute>} />
                  <Route path="/compras/proveedores/:id" element={<PermissionRoute permissions={["proveedores.gestionar", "compras.ver", "compras.gestionar", "cuentas_pagar.gestionar"]}><ProveedorDetalle /></PermissionRoute>} />
                  <Route path="/compras" element={<PermissionRoute permissions={["compras.ver", "compras.gestionar"]}><Compras /></PermissionRoute>} />
                  <Route path="/compras/nueva" element={<PermissionRoute permission="compras.gestionar"><CompraNueva /></PermissionRoute>} />
                  <Route path="/compras/ordenes" element={<PermissionRoute permissions={["compras.ver", "compras.gestionar"]}><OrdenesCompra /></PermissionRoute>} />
                  <Route path="/cuentas-pagar" element={<PermissionRoute permission="cuentas_pagar.gestionar"><CuentasPagar /></PermissionRoute>} />

                  {/* Producción, recetas y mermas */}
                  <Route path="/produccion" element={<PermissionRoute permissions={["produccion.ver", "produccion.registrar"]}><Produccion /></PermissionRoute>} />
                  <Route path="/produccion/recetas" element={<PermissionRoute permissions={["recetas.gestionar", "produccion.ver", "produccion.registrar"]}><Recetas /></PermissionRoute>} />
                  <Route path="/produccion/resumen" element={<PermissionRoute permissions={["produccion.ver", "produccion.registrar"]}><ResumenProduccion /></PermissionRoute>} />
                  <Route path="/admin/mesas" element={<PermissionRoute permission="mesas.configurar"><MesasConfig /></PermissionRoute>} />
                  <Route path="/admin/auditoria" element={<PermissionRoute permission="auditoria.ver"><Auditoria /></PermissionRoute>} />
                  <Route path="/reportes" element={<PermissionRoute permission="reportes.ver"><Reportes /></PermissionRoute>} />
                  <Route path="/gastos" element={<PermissionRoute permissions={["gastos.ver", "gastos.registrar"]}><Gastos /></PermissionRoute>} />
                  <Route path="/mermas" element={<PermissionRoute permissions={["mermas.registrar", "produccion.ver"]}><Mermas /></PermissionRoute>} />

                  { /* CONFIGURACIÓN DEL NEGOCIO */}
                  <Route
                      path="/admin/configuracion/negocio"
                      element={
                          <PermissionRoute permission="configuracion.gestionar">
                              <ConfiguracionNegocio />
                          </PermissionRoute>
                      }
                  />

                  { /* CAJAS Y FORMAS DE PAGO */}
                  <Route path="/admin/cajas/index" element={<PermissionRoute permission="configuracion.gestionar"><CajasConfig /></PermissionRoute>} />

                  { /* HISTORIAL DE VENTAS */}
                  <Route path="/ventas" element={<PermissionRoute permissions={["pos.historial", "pos.vender"]}><VentasHistorial /></PermissionRoute>} />

                  {/* Clientes, cuentas por cobrar y pedidos especiales */}
                  <Route path="/clientes" element={<PermissionRoute permission="clientes.ver"><Clientes /></PermissionRoute>} />
                  <Route path="/clientes/:id" element={<PermissionRoute permission="clientes.ver"><ClienteDetalle /></PermissionRoute>} />
                  <Route path="/cuentas-cobrar" element={<PermissionRoute permission="cuentas_cobrar.gestionar"><CuentasCobrar /></PermissionRoute>} />
                  <Route path="/pedidos-especiales" element={<PermissionRoute permission="pedidos.gestionar"><PedidosEspeciales /></PermissionRoute>} />

                  { /* CAJA Y TURNOS */}
                  <Route path="/caja" element={<PermissionRoute permissions={["caja.abrir", "caja.movimientos", "caja.arqueo", "caja.cerrar"]}><CajaTurno /></PermissionRoute>} />
                  <Route path="/caja/cierre" element={<PermissionRoute permission="caja.cerrar"><CajaCierre /></PermissionRoute>} />
                  <Route path="/caja/historial" element={<PermissionRoute permission="caja.historial"><CajaHistorial /></PermissionRoute>} />
                  <Route path="/caja/turnos/:id" element={<PermissionRoute permissions={["caja.historial", "caja.abrir", "caja.cerrar"]}><CajaTurnoDetalle /></PermissionRoute>} />

                  { /* INVENTARIO */}
                  <Route path="/admin/inventario" element={<PermissionRoute permission="inventario.ver"><InventarioStock /></PermissionRoute>} />
                  <Route path="/admin/inventario/entradas" element={<PermissionRoute permission="inventario.ver"><InventarioEntradas /></PermissionRoute>} />
                  <Route path="/admin/inventario/entradas/nuevo" element={<PermissionRoute permissions={["inventario.registrar", "inventario.ajustar"]}><InventarioNuevoRegistro /></PermissionRoute>} />
                  <Route path="/admin/inventario/conteo" element={<PermissionRoute permission="inventario.ajustar"><InventarioConteo /></PermissionRoute>} />
                  <Route path="/admin/inventario/kardex/:id" element={<PermissionRoute permission="inventario.kardex"><InventarioKardex /></PermissionRoute>} />
                  <Route path="/admin/inventario/movimientos" element={<PermissionRoute permission="inventario.ver"><InventarioMovimientos /></PermissionRoute>} />


              </Route>
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </>
  );
}
