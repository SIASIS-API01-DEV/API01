// core/databases/queries/RDP02/profesores-secundaria/actualizarCorreoProfesorSecundaria.ts
import { RDP02 } from "../../../../../src/interfaces/shared/RDP02Instancias";
import { query } from "../../../connectors/postgres";

/**
 * Actualiza el correo electrónico de un profesor de secundaria
 * @param dniProfesor DNI del profesor a actualizar
 * @param nuevoCorreo Nuevo correo electrónico
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns true si la actualización fue exitosa
 */
export async function actualizarCorreoProfesorTutorSecundaria(
  dniProfesor: string,
  nuevoCorreo: string,
  instanciaEnUso: RDP02
): Promise<boolean> {
  const sql = `
    UPDATE "T_Profesores_Secundaria" 
    SET "Correo_Electronico" = $1 
    WHERE "DNI_Profesor_Secundaria" = $2
  `;

  const result = await query(instanciaEnUso, sql, [nuevoCorreo, dniProfesor]);

  return result.rowCount !== null && result.rowCount > 0;
}
