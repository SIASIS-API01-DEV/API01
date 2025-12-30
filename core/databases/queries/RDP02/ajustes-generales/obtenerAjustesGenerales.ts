import { query } from "../../../connectors/postgres";
import { RDP02 } from "../../../../../src/interfaces/shared/RDP02Instancias";

/**
 * Resultado de una consulta de constante del sistema
 */
interface ConstanteSistema {
  Nombre: string;
  Valor: string;
}

/**
 * Obtiene valores de constantes específicas del sistema
 * @param nombresConstantes Array con los nombres de las constantes a consultar
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns Record con nombre de constante como clave y su valor como valor
 */
export async function obtenerConstantesAjustesGenerales(
  nombresConstantes: string[],
  instanciaEnUso?: RDP02
): Promise<Record<string, string>> {
  if (nombresConstantes.length === 0) {
    return {};
  }

  // Crear placeholders para la consulta parametrizada
  const placeholders = nombresConstantes
    .map((_, index) => `$${index + 1}`)
    .join(", ");

  const sql = `
    SELECT 
      "Nombre",
      "Valor"
    FROM "T_Ajustes_Generales_Sistema"
    WHERE "Nombre" IN (${placeholders})
  `;

  const result = await query<ConstanteSistema>(
    instanciaEnUso,
    sql,
    nombresConstantes
  );

  // Convertir array de resultados a un objeto Record
  const constantes: Record<string, string> = {};
  result.rows.forEach((row) => {
    constantes[row.Nombre] = row.Valor;
  });

  return constantes;
}
