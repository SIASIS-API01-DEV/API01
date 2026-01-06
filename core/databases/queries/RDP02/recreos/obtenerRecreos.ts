import { query } from "../../../connectors/postgres";
import { RDP02 } from "../../../../../src/interfaces/shared/RDP02Instancias";
import { NivelEducativo } from "../../../../../src/interfaces/shared/NivelEducativo";
import { T_Recreos } from "@prisma/client";

/**
 * Obtiene los recreos por nivel educativo
 * @param nivelEducativo 'P' para Primaria, 'S' para Secundaria
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta
 * @returns Array de recreos para el nivel especificado
 */
export async function obtenerRecreosPorNivel(
  nivelEducativo: NivelEducativo,
  instanciaEnUso?: RDP02
): Promise<T_Recreos[]> {
  const sql = `
    SELECT 
      "Id_Recreo",
      "Nivel_Educativo",
      "Hora_Inicio",
      "Bloque_Inicio",
      "Duracion_Minutos"
    FROM "T_Recreos"
    WHERE "Nivel_Educativo" = $1
    ORDER BY "Bloque_Inicio" ASC NULLS LAST, "Hora_Inicio" ASC NULLS LAST
  `;

  const result = await query<T_Recreos>(instanciaEnUso, sql, [nivelEducativo]);
  return result.rows;
}

/**
 * Obtiene un recreo específico por ID
 * @param idRecreo ID del recreo
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta
 * @returns Recreo encontrado o null
 */
export async function obtenerRecreoPorId(
  idRecreo: number,
  instanciaEnUso?: RDP02
): Promise<T_Recreos | null> {
  const sql = `
    SELECT 
      "Id_Recreo",
      "Nivel_Educativo",
      "Hora_Inicio",
      "Bloque_Inicio",
      "Duracion_Minutos"
    FROM "T_Recreos"
    WHERE "Id_Recreo" = $1
  `;

  const result = await query<T_Recreos>(instanciaEnUso, sql, [idRecreo]);
  return result.rows[0] || null;
}

/**
 * Obtiene todos los recreos del sistema
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta
 * @returns Record con nivel educativo como clave y array de recreos como valor
 */
export async function obtenerTodosLosRecreos(
  instanciaEnUso?: RDP02
): Promise<Record<string, T_Recreos[]>> {
  const sql = `
    SELECT 
      "Id_Recreo",
      "Nivel_Educativo",
      "Hora_Inicio",
      "Bloque_Inicio",
      "Duracion_Minutos"
    FROM "T_Recreos"
    ORDER BY "Nivel_Educativo", "Bloque_Inicio" ASC NULLS LAST, "Hora_Inicio" ASC NULLS LAST
  `;

  const result = await query<T_Recreos>(instanciaEnUso, sql);

  const recreosPorNivel: Record<string, T_Recreos[]> = {
    P: [],
    S: [],
  };

  result.rows.forEach((recreo) => {
    if (recreo.Nivel_Educativo === "P" || recreo.Nivel_Educativo === "S") {
      recreosPorNivel[recreo.Nivel_Educativo].push(recreo);
    }
  });

  return recreosPorNivel;
}
