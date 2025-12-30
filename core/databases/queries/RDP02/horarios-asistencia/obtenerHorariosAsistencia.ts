import { query } from "../../../connectors/postgres";
import { RDP02 } from "../../../../../src/interfaces/shared/RDP02Instancias";

/**
 * Resultado de una consulta de horario de asistencia
 */
interface HorarioAsistencia {
  Nombre: string;
  Valor: Date | string; // PostgreSQL puede devolver Time como Date o string
}

/**
 * Obtiene valores de horarios de asistencia específicos
 * @param nombresHorarios Array con los nombres de los horarios a consultar
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns Record con nombre de horario como clave y su valor como Date o string
 */
export async function obtenerHorariosAsistencia(
  nombresHorarios: string[],
  instanciaEnUso?: RDP02
): Promise<Record<string, Date | string>> {
  if (nombresHorarios.length === 0) {
    return {};
  }

  // Crear placeholders para la consulta parametrizada
  const placeholders = nombresHorarios
    .map((_, index) => `$${index + 1}`)
    .join(", ");

  const sql = `
    SELECT 
      "Nombre",
      "Valor"
    FROM "T_Horarios_Asistencia"
    WHERE "Nombre" IN (${placeholders})
  `;

  const result = await query<HorarioAsistencia>(
    instanciaEnUso,
    sql,
    nombresHorarios
  );

  // Convertir array de resultados a un objeto Record
  const horarios: Record<string, Date | string> = {};
  result.rows.forEach((row) => {
    horarios[row.Nombre] = row.Valor;
  });

  return horarios;
}
