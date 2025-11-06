import { T_Reportes_Asistencia_Escolar } from "@prisma/client";
import { RDP02 } from "../../../../../src/interfaces/shared/RDP02Instancias";
import { RolesSistema } from "../../../../../src/interfaces/shared/RolesSistema";
import { NivelEducativo } from "../../../../../src/interfaces/shared/NivelEducativo";
import { query } from "../../../connectors/postgres";
import decodificarCombinacionParametrosParaReporteEscolar from "../../../../../src/lib/helpers/decoders/reportes-asistencia-escolares/decodificarCombinacionParametrosParaReporteEscolar";

/**
 * Información del aula extraída de Combinacion_Parametros_Reporte
 */
interface InformacionAulaReporte {
  nivel: NivelEducativo;
  grado: number | "T";
  seccion: string | "T";
}

/**
 * Extrae la información del aula desde la Combinacion_Parametros_Reporte
 * Usa el decodificador oficial del sistema
 */
function extraerInformacionAulaDesdeParametros(
  combinacionParametros: string
): InformacionAulaReporte | null {
  try {
    const parametrosDecodificados =
      decodificarCombinacionParametrosParaReporteEscolar(combinacionParametros);

    if (!parametrosDecodificados) {
      return null;
    }

    const { aulasSeleccionadas } = parametrosDecodificados;

    return {
      nivel: aulasSeleccionadas.Nivel,
      grado: aulasSeleccionadas.Grado as number | "T",
      seccion: aulasSeleccionadas.Seccion as string | "T",
    };
  } catch (error) {
    console.error("Error al extraer información del aula:", error);
    return null;
  }
}

/**
 * Verifica si un usuario tiene permiso para ver un reporte específico
 * basándose en los parámetros del reporte y el rol del usuario
 */
function verificarPermisoReporte(
  reporte: T_Reportes_Asistencia_Escolar,
  rolUsuario: RolesSistema,
  idUsuario: string,
  aulaAsignada?: { nivel: NivelEducativo; grado: number; seccion: string }
): boolean {
  // Directivos pueden ver todo
  if (rolUsuario === RolesSistema.Directivo) {
    return true;
  }

  // Extraer información del reporte
  const infoAula = extraerInformacionAulaDesdeParametros(
    reporte.Combinacion_Parametros_Reporte
  );

  if (!infoAula) {
    return false; // Formato inválido
  }

  // Auxiliares solo pueden ver reportes de secundaria
  if (rolUsuario === RolesSistema.Auxiliar) {
    return infoAula.nivel === NivelEducativo.SECUNDARIA;
  }

  // Profesores de primaria solo pueden ver reportes de su aula
  if (rolUsuario === RolesSistema.ProfesorPrimaria) {
    if (!aulaAsignada || infoAula.nivel !== NivelEducativo.PRIMARIA) {
      return false;
    }

    // Debe coincidir con su aula o ser "T" (todos)
    const coincideGrado =
      infoAula.grado === "T" || infoAula.grado === aulaAsignada.grado;
    const coincideSeccion =
      infoAula.seccion === "T" || infoAula.seccion === aulaAsignada.seccion;

    return coincideGrado && coincideSeccion;
  }

  // Profesores de secundaria/tutores solo pueden ver reportes de su aula
  if (
    rolUsuario === RolesSistema.ProfesorSecundaria ||
    rolUsuario === RolesSistema.Tutor
  ) {
    if (!aulaAsignada || infoAula.nivel !== NivelEducativo.SECUNDARIA) {
      return false;
    }

    // Debe coincidir con su aula o ser "T" (todos)
    const coincideGrado =
      infoAula.grado === "T" || infoAula.grado === aulaAsignada.grado;
    const coincideSeccion =
      infoAula.seccion === "T" || infoAula.seccion === aulaAsignada.seccion;

    return coincideGrado && coincideSeccion;
  }

  // Otros roles no tienen acceso
  return false;
}

/**
 * Obtiene un reporte específico por su Combinacion_Parametros_Reporte
 */
export async function buscarReportePorCombinacion(
  combinacionParametros: string,
  instanciaEnUso?: RDP02
): Promise<T_Reportes_Asistencia_Escolar | null> {
  const sql = `
    SELECT 
      "Combinacion_Parametros_Reporte",
      "Estado_Reporte",
      "Datos_Google_Drive_Id",
      "Fecha_Generacion",
      "Rol_Usuario",
      "Id_Usuario"
    FROM "T_Reportes_Asistencia_Escolar"
    WHERE "Combinacion_Parametros_Reporte" = $1
  `;

  const params = [combinacionParametros];

  const result = await query<T_Reportes_Asistencia_Escolar>(
    instanciaEnUso,
    sql,
    params
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Obtiene un reporte si el usuario tiene permiso para verlo
 */
export async function buscarReporteConValidacionPermisos(
  combinacionParametros: string,
  rolUsuario: RolesSistema,
  idUsuario: string,
  aulaAsignada?: { nivel: NivelEducativo; grado: number; seccion: string },
  instanciaEnUso?: RDP02
): Promise<{
  reporte: T_Reportes_Asistencia_Escolar | null;
  tienePermiso: boolean;
  mensaje?: string;
}> {
  const reporte = await buscarReportePorCombinacion(
    combinacionParametros,
    instanciaEnUso
  );

  if (!reporte) {
    return {
      reporte: null,
      tienePermiso: false,
      mensaje: "Reporte no encontrado",
    };
  }

  const tienePermiso = verificarPermisoReporte(
    reporte,
    rolUsuario,
    idUsuario,
    aulaAsignada
  );

  if (!tienePermiso) {
    return {
      reporte: null,
      tienePermiso: false,
      mensaje: "No tiene permisos para acceder a este reporte",
    };
  }

  return {
    reporte,
    tienePermiso: true,
  };
}

/**
 * Obtiene todos los reportes para directivos (sin filtros)
 */
export async function buscarTodosLosReportes(
  instanciaEnUso?: RDP02
): Promise<T_Reportes_Asistencia_Escolar[]> {
  const sql = `
    SELECT 
      "Combinacion_Parametros_Reporte",
      "Estado_Reporte",
      "Datos_Google_Drive_Id",
      "Fecha_Generacion",
      "Rol_Usuario",
      "Id_Usuario"
    FROM "T_Reportes_Asistencia_Escolar"
    ORDER BY "Fecha_Generacion" DESC
  `;

  const result = await query<T_Reportes_Asistencia_Escolar>(
    instanciaEnUso,
    sql,
    []
  );

  return result.rows;
}

/**
 * Obtiene reportes de secundaria (para auxiliares)
 */
export async function buscarReportesSecundaria(
  instanciaEnUso?: RDP02
): Promise<T_Reportes_Asistencia_Escolar[]> {
  // Obtener todos los reportes y filtrar por secundaria usando el decodificador
  const sql = `
    SELECT 
      "Combinacion_Parametros_Reporte",
      "Estado_Reporte",
      "Datos_Google_Drive_Id",
      "Fecha_Generacion",
      "Rol_Usuario",
      "Id_Usuario"
    FROM "T_Reportes_Asistencia_Escolar"
    ORDER BY "Fecha_Generacion" DESC
  `;

  const result = await query<T_Reportes_Asistencia_Escolar>(
    instanciaEnUso,
    sql,
    []
  );

  // Filtrar por secundaria usando el decodificador
  return result.rows.filter((reporte) => {
    const infoAula = extraerInformacionAulaDesdeParametros(
      reporte.Combinacion_Parametros_Reporte
    );
    return infoAula?.nivel === NivelEducativo.SECUNDARIA;
  });
}

/**
 * Obtiene reportes de un aula específica (para profesores)
 * Incluye reportes generales que apliquen a esa aula (con "T")
 */
export async function buscarReportesPorAula(
  nivel: NivelEducativo,
  grado: number,
  seccion: string,
  instanciaEnUso?: RDP02
): Promise<T_Reportes_Asistencia_Escolar[]> {
  // Obtener todos los reportes y filtrar usando el decodificador
  const sql = `
    SELECT 
      "Combinacion_Parametros_Reporte",
      "Estado_Reporte",
      "Datos_Google_Drive_Id",
      "Fecha_Generacion",
      "Rol_Usuario",
      "Id_Usuario"
    FROM "T_Reportes_Asistencia_Escolar"
    ORDER BY "Fecha_Generacion" DESC
  `;

  const result = await query<T_Reportes_Asistencia_Escolar>(
    instanciaEnUso,
    sql,
    []
  );

  // Filtrar usando el decodificador
  return result.rows.filter((reporte) => {
    const infoAula = extraerInformacionAulaDesdeParametros(
      reporte.Combinacion_Parametros_Reporte
    );

    if (!infoAula) {
      return false;
    }

    // Debe ser del mismo nivel
    if (infoAula.nivel !== nivel) {
      return false;
    }

    // Verificar grado (puede ser el específico o "T" para todos)
    const coincideGrado = infoAula.grado === "T" || infoAula.grado === grado;

    // Verificar sección (puede ser la específica o "T" para todas)
    const coincideSeccion =
      infoAula.seccion === "T" || infoAula.seccion === seccion;

    return coincideGrado && coincideSeccion;
  });
}

/**
 * Información del aula asignada a un profesor
 */
export interface AulaAsignada {
  nivel: NivelEducativo;
  grado: number;
  seccion: string;
  tieneAula: boolean;
}


/**
 * Obtiene reportes filtrados según el rol y permisos del usuario
 */
export async function buscarReportesSegunRol(
  rolUsuario: RolesSistema,
  aulaAsignada?: { nivel: NivelEducativo; grado: number; seccion: string },
  instanciaEnUso?: RDP02
): Promise<T_Reportes_Asistencia_Escolar[]> {
  switch (rolUsuario) {
    case RolesSistema.Directivo:
      return buscarTodosLosReportes(instanciaEnUso);

    case RolesSistema.Auxiliar:
      return buscarReportesSecundaria(instanciaEnUso);

    case RolesSistema.ProfesorPrimaria:
    case RolesSistema.ProfesorSecundaria:
    case RolesSistema.Tutor:
      if (!aulaAsignada) {
        return []; // Sin aula asignada = sin reportes
      }
      return buscarReportesPorAula(
        aulaAsignada.nivel,
        aulaAsignada.grado,
        aulaAsignada.seccion,
        instanciaEnUso
      );

    default:
      return []; // Otros roles no tienen acceso
  }
}
