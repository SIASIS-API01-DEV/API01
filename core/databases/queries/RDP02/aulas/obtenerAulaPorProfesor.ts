import { NivelEducativo } from "../../../../../src/interfaces/shared/NivelEducativo";
import { RDP02 } from "../../../../../src/interfaces/shared/RDP02Instancias";
import { RolesSistema } from "../../../../../src/interfaces/shared/RolesSistema";
import { query } from "../../../connectors/postgres";
import { AulaAsignada } from "../reportes-asistencia-escolar/consultasDeReportes";

/**
 * Obtiene el aula asignada a un profesor de primaria
 */
export async function obtenerAulaProfesorPrimaria(
  idProfesor: string,
  instanciaEnUso?: RDP02
): Promise<AulaAsignada | null> {
  const sql = `
    SELECT 
      "Nivel",
      "Grado",
      "Seccion"
    FROM "T_Aulas"
    WHERE "Id_Profesor_Primaria" = $1
    LIMIT 1
  `;

  const params = [idProfesor];

  const result = await query<{
    Nivel: string;
    Grado: number;
    Seccion: string;
  }>(instanciaEnUso, sql, params);

  if (result.rows.length === 0) {
    return {
      nivel: NivelEducativo.PRIMARIA,
      grado: 0,
      seccion: "",
      tieneAula: false,
    };
  }

  const aula = result.rows[0];

  return {
    nivel: aula.Nivel as NivelEducativo,
    grado: aula.Grado,
    seccion: aula.Seccion,
    tieneAula: true,
  };
}

/**
 * Obtiene el aula asignada a un profesor de secundaria
 */
export async function obtenerAulaProfesorSecundaria(
  idProfesor: string,
  instanciaEnUso?: RDP02
): Promise<AulaAsignada | null> {
  const sql = `
    SELECT 
      "Nivel",
      "Grado",
      "Seccion"
    FROM "T_Aulas"
    WHERE "Id_Profesor_Secundaria" = $1
    LIMIT 1
  `;

  const params = [idProfesor];

  const result = await query<{
    Nivel: string;
    Grado: number;
    Seccion: string;
  }>(instanciaEnUso, sql, params);

  if (result.rows.length === 0) {
    return {
      nivel: NivelEducativo.SECUNDARIA,
      grado: 0,
      seccion: "",
      tieneAula: false,
    };
  }

  const aula = result.rows[0];

  return {
    nivel: aula.Nivel as NivelEducativo,
    grado: aula.Grado,
    seccion: aula.Seccion,
    tieneAula: true,
  };
}

/**
 * Obtiene el aula asignada según el rol del usuario
 */
export async function obtenerAulaPorProfesor(
  rolUsuario:
    | RolesSistema.ProfesorPrimaria
    | RolesSistema.ProfesorSecundaria
    | RolesSistema.Tutor,
  idProfesor: string,
  instanciaEnUso?: RDP02
): Promise<AulaAsignada | null> {
  switch (rolUsuario) {
    case RolesSistema.ProfesorPrimaria:
      return obtenerAulaProfesorPrimaria(idProfesor, instanciaEnUso);

    case RolesSistema.ProfesorSecundaria:
    case RolesSistema.Tutor:
      return obtenerAulaProfesorSecundaria(idProfesor, instanciaEnUso);

    default:
      return null; // Otros roles no tienen aula asignada
  }
}
