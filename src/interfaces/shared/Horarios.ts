import { DiasSemana } from "./DiasSemana";

export interface Hora_Minuto_Segundo {
  Hora: number;
  Minuto: number;
  Segundo: number;
}

export interface RangoHorario {
  Hora_Inicio: Hora_Minuto_Segundo;
  Hora_Fin: Hora_Minuto_Segundo;
}

export type HorarioSemanalSiasis = Record<DiasSemana, RangoHorario | null>;
