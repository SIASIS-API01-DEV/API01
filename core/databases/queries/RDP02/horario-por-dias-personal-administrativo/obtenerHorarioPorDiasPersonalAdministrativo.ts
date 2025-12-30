import { T_Horarios_Por_Dias_Personal_Administrativo } from "@prisma/client";
import { query } from "../../../connectors/postgres";
import { RDP02 } from "../../../../../src/interfaces/shared/RDP02Instancias";

/**
 * Obtiene los horarios por días de un personal administrativo
 * @param idPersonalAdministrativo Id del personal administrativo
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns Array de horarios por día del personal administrativo
 */
export async function obtenerHorariosPorDiasPersonalAdministrativo(
  idPersonalAdministrativo: string,
  instanciaEnUso?: RDP02
): Promise<T_Horarios_Por_Dias_Personal_Administrativo[]> {
  const sql = `
    SELECT 
      "Id_Horario_Por_Dia_P_Administrativo",
      "Dia",
      "Hora_Inicio",
      "Hora_Fin",
      "Id_Personal_Administrativo"
    FROM "T_Horarios_Por_Dias_Personal_Administrativo"
    WHERE "Id_Personal_Administrativo" = $1
    ORDER BY "Dia"
  `;

  const result = await query<T_Horarios_Por_Dias_Personal_Administrativo>(
    instanciaEnUso,
    sql,
    [idPersonalAdministrativo]
  );

  return result.rows;
}
