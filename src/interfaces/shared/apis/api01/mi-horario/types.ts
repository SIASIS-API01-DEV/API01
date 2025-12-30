import { T_Cursos_Horario } from "@prisma/client";
import { SuccessResponseAPIBase } from "../../types";
import { HorarioSemanalSiasis, RangoHorario } from "../../../Horarios";
import { ActoresSistema } from "../../../ActoresSistema";
import { DetalleRecreo } from "../../../Recreos";


export interface GetMiHorarioSuccessResponse extends SuccessResponseAPIBase {
    data: {
        CursosHorario?: T_Cursos_Horario[];
        HorarioSemanal : HorarioSemanalSiasis,
        Actor: ActoresSistema;
        RangoHorarioMaximo: RangoHorario;
        Recreos: DetalleRecreo[];
    }
}