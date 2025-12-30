import { RangoHorario } from "./Horarios";

export interface DetalleRecreo {
  Etiqueta: string;
  RangoHorario: RangoHorario;
  DuracionMinutos: number;
  Bloque_Inicio: number;
}
