import { T_Horarios_Por_Dias_Directivos } from "@prisma/client";
import { query } from "../../../connectors/postgres";
import { RDP02 } from "../../../../../src/interfaces/shared/RDP02Instancias";

/**
 * Obtiene los horarios por días de un directivo
 * @param idDirectivo Id del directivo
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns Array de horarios por día del directivo
 */
export async function obtenerHorariosPorDiasDirectivo(
  idDirectivo: number,
  instanciaEnUso?: RDP02
): Promise<T_Horarios_Por_Dias_Directivos[]> {
  const sql = `
    SELECT 
      "Id_Horario_Por_Dia_Directivo",
      "Dia",
      "Hora_Inicio",
      "Hora_Fin",
      "Id_Directivo"
    FROM "T_Horarios_Por_Dias_Directivos"
    WHERE "Id_Directivo" = $1
    ORDER BY "Dia"
  `;

  const result = await query<T_Horarios_Por_Dias_Directivos>(
    instanciaEnUso,
    sql,
    [idDirectivo]
  );

  return result.rows;
}
