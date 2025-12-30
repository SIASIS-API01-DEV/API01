import { T_Cursos_Horario } from "@prisma/client";
import { query } from "../../../connectors/postgres";
import { RDP02 } from "../../../../../src/interfaces/shared/RDP02Instancias";

/**
 * Obtiene todos los cursos horario asignados a un profesor de secundaria
 * @param idProfesorSecundaria Id del profesor de secundaria
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns Array de cursos horario del profesor
 */
export async function obtenerCursosHorarioPorProfesor(
  idProfesorSecundaria: string,
  instanciaEnUso?: RDP02
): Promise<T_Cursos_Horario[]> {
  const sql = `
    SELECT 
      "Id_Curso_Horario",
      "Nombre_Curso",
      "Dia_Semana",
      "Indice_Hora_Academica_Inicio",
      "Cant_Hora_Academicas",
      "Id_Profesor_Secundaria",
      "Id_Aula_Secundaria"
    FROM "T_Cursos_Horario"
    WHERE "Id_Profesor_Secundaria" = $1
    ORDER BY "Dia_Semana", "Indice_Hora_Academica_Inicio"
  `;

  const result = await query<T_Cursos_Horario>(instanciaEnUso, sql, [
    idProfesorSecundaria,
  ]);

  return result.rows;
}
