import { Router } from "express";
import isDirectivoAuthenticated from "../../../middlewares/isDirectivoAuthenticated";
import isAuxiliarAuthenticated from "../../../middlewares/isAuxiliarAuthenticated";
import isProfesorPrimariaAuthenticated from "../../../middlewares/isProfesorPrimariaAuthenticated";
import isProfesorSecundariaAuthenticated from "../../../middlewares/isProfesorSecundariaAuthenticated";
import isTutorAuthenticated from "../../../middlewares/isTutorAuthenticated";
import checkAuthentication from "../../../middlewares/checkAuthentication";
import {
  RequestErrorTypes,
  SystemErrorTypes,
  PermissionErrorTypes,
} from "../../../interfaces/shared/errors";
import { ErrorResponseAPIBase } from "../../../interfaces/shared/apis/types";
import {
  GetReporteAsistenciaEscolarSuccessResponse,
  GetTodosLosReportesAsistenciaEscolarSuccessResponse,
} from "../../../interfaces/shared/apis/api01/reportes-asistencia-escolar/types";
import { ReporteAsistenciaEscolarAnonimo } from "../../../interfaces/shared/ReporteAsistenciaEscolar";

import { RolesSistema } from "../../../interfaces/shared/RolesSistema";
import {
  buscarReporteConValidacionPermisos,
  buscarReportesSegunRol,
} from "../../../../core/databases/queries/RDP02/reportes-asistencia-escolar/consultasDeReportes";
import { obtenerAulaPorProfesor } from "../../../../core/databases/queries/RDP02/aulas/obtenerAulaPorProfesor";

const router = Router();

/**
 * GET /reportes-asistencia-escolar/:Combinacion_Parametros
 * Obtiene un reporte específico por su combinación de parámetros
 * Solo si el usuario tiene permisos para verlo
 */
router.get(
  "/:Combinacion_Parametros",
  isDirectivoAuthenticated,
  isAuxiliarAuthenticated,
  isProfesorPrimariaAuthenticated,
  isProfesorSecundariaAuthenticated,
  isTutorAuthenticated,
  checkAuthentication as any,
  (async (req: any, res: any) => {
    try {
      const { Combinacion_Parametros } = req.params;
      const rdp02EnUso = req.RDP02_INSTANCE!;
      const usuario = req.user!;
      const rolUsuario = req.userRole!;

      // Validar parámetro
      if (!Combinacion_Parametros || Combinacion_Parametros.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "El parámetro 'Combinacion_Parametros' es requerido",
          errorType: RequestErrorTypes.MISSING_PARAMETERS,
        } as ErrorResponseAPIBase);
      }

      // Obtener ID del usuario según el rol
      let idUsuario: string;
      if ("Id_Directivo" in usuario) {
        idUsuario = usuario.Id_Directivo.toString();
      } else if ("Id_Profesor_Primaria" in usuario) {
        idUsuario = usuario.Id_Profesor_Primaria;
      } else if ("Id_Profesor_Secundaria" in usuario) {
        idUsuario = usuario.Id_Profesor_Secundaria;
      } else if ("Id_Auxiliar" in usuario) {
        idUsuario = usuario.Id_Auxiliar;
      } else if ("Id_Personal_Administrativo" in usuario) {
        idUsuario = usuario.Id_Personal_Administrativo;
      } else {
        return res.status(500).json({
          success: false,
          message: "No se pudo identificar el ID del usuario",
          errorType: SystemErrorTypes.SERVER_ERROR,
        } as ErrorResponseAPIBase);
      }

      // Obtener aula asignada si es profesor
      let aulaAsignada:
        | { nivel: any; grado: number; seccion: string }
        | undefined;

      if (
        rolUsuario === RolesSistema.ProfesorPrimaria ||
        rolUsuario === RolesSistema.ProfesorSecundaria ||
        rolUsuario === RolesSistema.Tutor
      ) {
        const aulaInfo = await obtenerAulaPorProfesor(
          rolUsuario,
          idUsuario,
          rdp02EnUso
        );

        if (!aulaInfo) {
          return res.status(500).json({
            success: false,
            message: "Error al consultar información del aula",
            errorType: SystemErrorTypes.DATABASE_ERROR,
          } as ErrorResponseAPIBase);
        }

        if (!aulaInfo.tieneAula) {
          return res.status(403).json({
            success: false,
            message:
              "No tiene un aula asignada. No puede acceder a reportes de asistencia",
            errorType: PermissionErrorTypes.PERMISSION_DENIED,
          } as ErrorResponseAPIBase);
        }

        aulaAsignada = {
          nivel: aulaInfo.nivel,
          grado: aulaInfo.grado,
          seccion: aulaInfo.seccion,
        };
      }

      // Buscar reporte con validación de permisos
      const resultado = await buscarReporteConValidacionPermisos(
        Combinacion_Parametros,
        rolUsuario,
        idUsuario,
        aulaAsignada,
        rdp02EnUso
      );

      if (!resultado.tienePermiso) {
        return res.status(403).json({
          success: false,
          message: resultado.mensaje || "No tiene permisos para este reporte",
          errorType: PermissionErrorTypes.PERMISSION_DENIED,
        } as ErrorResponseAPIBase);
      }

      if (!resultado.reporte) {
        return res.status(404).json({
          success: false,
          message: "Reporte no encontrado",
          errorType: RequestErrorTypes.RESOURCE_NOT_FOUND,
        } as ErrorResponseAPIBase);
      }

      // Convertir a formato anónimo (sin exponer Rol_Usuario e Id_Usuario)
      const reporteAnonimo: ReporteAsistenciaEscolarAnonimo = {
        Combinacion_Parametros_Reporte:
          resultado.reporte.Combinacion_Parametros_Reporte,
        Estado_Reporte: resultado.reporte.Estado_Reporte,
        Datos_Google_Drive_Id: resultado.reporte.Datos_Google_Drive_Id,
        Fecha_Generacion: resultado.reporte.Fecha_Generacion,
      };

      return res.status(200).json({
        success: true,
        message: "Reporte obtenido exitosamente",
        data: reporteAnonimo,
      } as GetReporteAsistenciaEscolarSuccessResponse);
    } catch (error) {
      console.error("Error al obtener reporte específico:", error);

      return res.status(500).json({
        success: false,
        message: "Error interno del servidor al obtener el reporte",
        errorType: SystemErrorTypes.UNKNOWN_ERROR,
        details: process.env.NODE_ENV === "development" ? error : undefined,
      } as ErrorResponseAPIBase);
    }
  }) as any
);

/**
 * GET /reportes-asistencia-escolar
 * Obtiene todos los reportes permitidos según el rol del usuario
 */
router.get(
  "/",
  isDirectivoAuthenticated,
  isAuxiliarAuthenticated,
  isProfesorPrimariaAuthenticated,
  isProfesorSecundariaAuthenticated,
  isTutorAuthenticated,
  checkAuthentication as any,
  (async (req: any, res: any) => {
    try {
      const rdp02EnUso = req.RDP02_INSTANCE!;
      const usuario = req.user!;
      const rolUsuario = req.userRole!;

      // Obtener ID del usuario según el rol
      let idUsuario: string;
      if ("Id_Directivo" in usuario) {
        idUsuario = usuario.Id_Directivo.toString();
      } else if ("Id_Profesor_Primaria" in usuario) {
        idUsuario = usuario.Id_Profesor_Primaria;
      } else if ("Id_Profesor_Secundaria" in usuario) {
        idUsuario = usuario.Id_Profesor_Secundaria;
      } else if ("Id_Auxiliar" in usuario) {
        idUsuario = usuario.Id_Auxiliar;
      } else if ("Id_Personal_Administrativo" in usuario) {
        idUsuario = usuario.Id_Personal_Administrativo;
      } else {
        return res.status(500).json({
          success: false,
          message: "No se pudo identificar el ID del usuario",
          errorType: SystemErrorTypes.SERVER_ERROR,
        } as ErrorResponseAPIBase);
      }

      // Obtener aula asignada si es profesor
      let aulaAsignada:
        | { nivel: any; grado: number; seccion: string }
        | undefined;

      if (
        rolUsuario === RolesSistema.ProfesorPrimaria ||
        rolUsuario === RolesSistema.ProfesorSecundaria ||
        rolUsuario === RolesSistema.Tutor
      ) {
        const aulaInfo = await obtenerAulaPorProfesor(
          rolUsuario,
          idUsuario,
          rdp02EnUso
        );

        if (!aulaInfo) {
          return res.status(500).json({
            success: false,
            message: "Error al consultar información del aula",
            errorType: SystemErrorTypes.DATABASE_ERROR,
          } as ErrorResponseAPIBase);
        }

        if (!aulaInfo.tieneAula) {
          // Si el profesor no tiene aula, devolver lista vacía
          return res.status(200).json({
            success: true,
            message: "No tiene un aula asignada. No hay reportes disponibles",
            data: [],
            total: 0,
          } as GetTodosLosReportesAsistenciaEscolarSuccessResponse);
        }

        aulaAsignada = {
          nivel: aulaInfo.nivel,
          grado: aulaInfo.grado,
          seccion: aulaInfo.seccion,
        };
      }

      // Buscar reportes según rol y permisos
      const reportes = await buscarReportesSegunRol(
        rolUsuario,
        aulaAsignada,
        rdp02EnUso
      );

      // Convertir a formato anónimo
      const reportesAnonimos: ReporteAsistenciaEscolarAnonimo[] = reportes.map(
        (reporte) => ({
          Combinacion_Parametros_Reporte:
            reporte.Combinacion_Parametros_Reporte,
          Estado_Reporte: reporte.Estado_Reporte,
          Datos_Google_Drive_Id: reporte.Datos_Google_Drive_Id,
          Fecha_Generacion: reporte.Fecha_Generacion,
        })
      );

      return res.status(200).json({
        success: true,
        message: `Se encontraron ${reportes.length} reporte(s) disponible(s)`,
        data: reportesAnonimos,
        total: reportes.length,
      } as GetTodosLosReportesAsistenciaEscolarSuccessResponse);
    } catch (error) {
      console.error("Error al obtener lista de reportes:", error);

      return res.status(500).json({
        success: false,
        message: "Error interno del servidor al obtener reportes",
        errorType: SystemErrorTypes.UNKNOWN_ERROR,
        details: process.env.NODE_ENV === "development" ? error : undefined,
      } as ErrorResponseAPIBase);
    }
  }) as any
);

export default router;
