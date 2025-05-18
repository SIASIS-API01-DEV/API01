import { Request, Response, Router } from "express";
import { ErrorResponseAPIBase } from "../../../interfaces/shared/apis/types";
import { DirectivoAuthenticated } from "../../../interfaces/shared/JWTPayload";
import {
  PermissionErrorTypes,
  SystemErrorTypes,
  UserErrorTypes,
  ValidationErrorTypes,
} from "../../../interfaces/shared/apis/errors";
import { validateDNI } from "../../../lib/helpers/validators/data/validateDNI";
import {
  GetPersonalAdministrativoSuccessResponse,
  GetPersonalAdministrativoUnicoSuccessResponse,
  SwitchEstadoPersonalAdministrativoSuccessResponse,
} from "../../../interfaces/shared/apis/api01/personal-administrativo/types";

// Importar funciones de consulta

import { buscarPersonalAdministrativoPorDNI } from "../../../../core/databases/queries/RDP02/personal-administrativo/buscarPersonalAdministrativoPorDNI";
import { cambiarEstadoPersonalAdministrativo } from "../../../../core/databases/queries/RDP02/personal-administrativo/cambiarEstadoPersonalAdministrativo";
import { buscarTodosLosPersonalesAdministrativo } from "../../../../core/databases/queries/RDP02/personal-administrativo/buscarTodosLosPersonalesAdministrativos";
import { handleSQLError } from "../../../lib/helpers/handlers/errors/postgreSQL";

const router = Router();

// Obtener todo el personal administrativo
router.get("/", (async (req: Request, res: Response) => {
  try {
    // Verificar que el usuario autenticado es un directivo
    const directivo = req.user as DirectivoAuthenticated;
    if (!directivo.Id_Directivo) {
      return res.status(403).json({
        success: false,
        message: "No tiene permisos para acceder a esta información",
        errorType: PermissionErrorTypes.INSUFFICIENT_PERMISSIONS,
      } as ErrorResponseAPIBase);
    }

    const rdp02EnUso = req.RDP02_INSTANCE!;
    const personalAdministrativo = await buscarTodosLosPersonalesAdministrativo(rdp02EnUso);

    return res.status(200).json({
      success: true,
      message: "Personal administrativo obtenido exitosamente",
      data: personalAdministrativo,
    } as GetPersonalAdministrativoSuccessResponse);
  } catch (error) {
    console.error("Error al obtener personal administrativo:", error);

    const handledError = handleSQLError(error);
    if (handledError) {
      return res.status(handledError.status).json(handledError.response);
    }

    return res.status(500).json({
      success: false,
      message: "Error al obtener personal administrativo",
      errorType: SystemErrorTypes.UNKNOWN_ERROR,
      details: error,
    } as ErrorResponseAPIBase);
  }
}) as any);

// Obtener un miembro del personal administrativo por DNI
router.get("/:dni", (async (req: Request, res: Response) => {
  try {
    const { dni } = req.params;
    const rdp02EnUso = req.RDP02_INSTANCE!;

    // Validar el formato del DNI
    const dniValidation = validateDNI(dni, true);
    if (!dniValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: dniValidation.errorMessage,
        errorType: ValidationErrorTypes.INVALID_DNI,
      } as ErrorResponseAPIBase);
    }

    // Obtener personal administrativo
    const personalAdministrativo = await buscarPersonalAdministrativoPorDNI(dni, rdp02EnUso);

    if (!personalAdministrativo) {
      return res.status(404).json({
        success: false,
        message: "Personal administrativo no encontrado",
        errorType: UserErrorTypes.USER_NOT_FOUND,
      } as ErrorResponseAPIBase);
    }

    return res.status(200).json({
      success: true,
      message: "Personal administrativo obtenido exitosamente",
      data: personalAdministrativo,
    } as GetPersonalAdministrativoUnicoSuccessResponse);
  } catch (error) {
    console.error("Error al obtener personal administrativo:", error);

    const handledError = handleSQLError(error);
    if (handledError) {
      return res.status(handledError.status).json(handledError.response);
    }

    return res.status(500).json({
      success: false,
      message: "Error al obtener personal administrativo",
      errorType: SystemErrorTypes.UNKNOWN_ERROR,
      details: error,
    } as ErrorResponseAPIBase);
  }
}) as any);

// Cambiar estado de un miembro del personal administrativo (activar/desactivar)
router.patch("/:dni/estado", (async (req: Request, res: Response) => {
  try {
    const { dni } = req.params;
    const rdp02EnUso = req.RDP02_INSTANCE!;

    // Validar el formato del DNI
    const dniValidation = validateDNI(dni, true);
    if (!dniValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: dniValidation.errorMessage,
        errorType: ValidationErrorTypes.INVALID_DNI,
      } as ErrorResponseAPIBase);
    }

    // Cambiar el estado del personal administrativo
    const updatedPersonal = await cambiarEstadoPersonalAdministrativo(dni, undefined, rdp02EnUso);

    if (!updatedPersonal) {
      return res.status(404).json({
        success: false,
        message: "Personal administrativo no encontrado",
        errorType: UserErrorTypes.USER_NOT_FOUND,
      } as ErrorResponseAPIBase);
    }

    const statusMessage = updatedPersonal.Estado ? "activado" : "desactivado";

    return res.status(200).json({
      success: true,
      message: `Personal administrativo ${statusMessage} exitosamente`,
      data: updatedPersonal,
    } as SwitchEstadoPersonalAdministrativoSuccessResponse);
  } catch (error) {
    console.error(
      "Error al cambiar estado del personal administrativo:",
      error
    );

    const handledError = handleSQLError(error);
    if (handledError) {
      return res.status(handledError.status).json(handledError.response);
    }

    return res.status(500).json({
      success: false,
      message: "Error al cambiar estado del personal administrativo",
      errorType: SystemErrorTypes.UNKNOWN_ERROR,
      details: error,
    } as ErrorResponseAPIBase);
  }
}) as any);

export default router;