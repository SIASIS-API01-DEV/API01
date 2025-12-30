import { Router, Request, Response } from "express";
import { RolesSistema } from "../../../interfaces/shared/RolesSistema";
import { ActoresSistema } from "../../../interfaces/shared/ActoresSistema";
import { ErrorResponseAPIBase } from "../../../interfaces/shared/apis/types";
import {
  RequestErrorTypes,
  SystemErrorTypes,
  ValidationErrorTypes,
} from "../../../interfaces/shared/errors";
import { RangoHorario } from "../../../interfaces/shared/Horarios";
import {
  DirectivoAuthenticated,
  PersonalAdministrativoAuthenticated,
  ProfesorTutorSecundariaAuthenticated,
} from "../../../interfaces/shared/JWTPayload";
import {
  calcularHorarioSemanalProfesorSecundaria,
  calcularRecreosSecundaria,
  convertirHorariosPorDiasAHorarioSemanal,
  convertirTimeToHMS,
  crearHorarioSemanalEstatico,
} from "../../../lib/utils/Horarios";
import { GetMiHorarioSuccessResponse } from "../../../interfaces/shared/apis/api01/mi-horario/types";
import { obtenerConstantesAjustesGenerales } from "../../../../core/databases/queries/RDP02/ajustes-generales/obtenerAjustesGenerales";
import { obtenerHorariosAsistencia } from "../../../../core/databases/queries/RDP02/horarios-asistencia/obtenerHorariosAsistencia";
import { obtenerCursosHorarioPorProfesor } from "../../../../core/databases/queries/RDP02/cursos-horario/obtenerCursosHorarioPorProfesor";
import { obtenerHorariosPorDiasDirectivo } from "../../../../core/databases/queries/RDP02/horarios-por-dias-directivos/obtenerHorariosPorDiasDIrectivo";
import { obtenerHorariosPorDiasPersonalAdministrativo } from "../../../../core/databases/queries/RDP02/horario-por-dias-personal-administrativo/obtenerHorarioPorDiasPersonalAdministrativo";

const router = Router();

router.get("/", (async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const rol = req.userRole!;
    const rdp02EnUso = req.RDP02_INSTANCE!;
    
    // Validar que el rol no sea Responsable
    if (rol === RolesSistema.Responsable) {
      return res.status(400).json({
        success: false,
        message:
          "Los responsables (padres de familia) no tienen horario laboral en el sistema",
        errorType: ValidationErrorTypes.ROLE_NOT_ALLOWED,
      } as ErrorResponseAPIBase);
    }

    // Convertir rol a actor
    let actor: ActoresSistema;
    switch (rol) {
      case RolesSistema.Directivo:
        actor = ActoresSistema.Directivo;
        break;
      case RolesSistema.Auxiliar:
        actor = ActoresSistema.Auxiliar;
        break;
      case RolesSistema.ProfesorPrimaria:
        actor = ActoresSistema.ProfesorPrimaria;
        break;
      case RolesSistema.ProfesorSecundaria:
        actor = ActoresSistema.ProfesorSecundaria;
        break;
      case RolesSistema.Tutor:
        actor = ActoresSistema.Tutor;
        break;
      case RolesSistema.PersonalAdministrativo:
        actor = ActoresSistema.PersonalAdministrativo;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: `Rol no soportado: ${rol}`,
          errorType: RequestErrorTypes.INVALID_PARAMETERS,
        } as ErrorResponseAPIBase);
    }

    // Obtener constantes y horarios necesarios para todos los roles
    const constantesNecesarias = [
      "BLOQUE_INICIO_RECREO_SECUNDARIA",
      "DURACION_RECREO_SECUNDARIA_MINUTOS",
      "DURACION_HORA_ACADEMICA_MINUTOS",
    ];

    const horariosNecesarios = [
      "Hora_Inicio_Asistencia_Secundaria",
      "Hora_Final_Asistencia_Secundaria",
      "Inicio_Horario_Laboral_Secundaria",
      "Fin_Horario_Laboral_Secundaria",
      "Inicio_Horario_Laboral_Auxiliar",
      "Fin_Horario_Laboral_Auxiliar",
      "Inicio_Horario_Laboral_Profesores_Primaria",
      "Fin_Horario_Laboral_Profesores_Primaria",
    ];

    const [constantes, horarios] = await Promise.all([
      obtenerConstantesAjustesGenerales(constantesNecesarias, rdp02EnUso),
      obtenerHorariosAsistencia(horariosNecesarios, rdp02EnUso),
    ]);

    // Parsear constantes
    const bloqueInicioRecreo = parseInt(
      constantes.BLOQUE_INICIO_RECREO_SECUNDARIA
    );
    const duracionRecreoMinutos = parseInt(
      constantes.DURACION_RECREO_SECUNDARIA_MINUTOS
    );
    const duracionHoraAcademica = parseInt(
      constantes.DURACION_HORA_ACADEMICA_MINUTOS
    );

    // Convertir horarios a Hora_Minuto_Segundo
    const horaInicioAsistenciaSecundaria = convertirTimeToHMS(
      horarios.Hora_Inicio_Asistencia_Secundaria
    );
    const horarioLaboralInicioSecundaria = convertirTimeToHMS(
      horarios.Inicio_Horario_Laboral_Secundaria
    );
    const horarioLaboralFinSecundaria = convertirTimeToHMS(
      horarios.Fin_Horario_Laboral_Secundaria
    );

    // Calcular recreos de secundaria (común para varios roles)
    const recreos = calcularRecreosSecundaria(
      horaInicioAsistenciaSecundaria,
      duracionHoraAcademica,
      bloqueInicioRecreo,
      duracionRecreoMinutos
    );

    // Procesar según el rol específico
    if (rol === RolesSistema.ProfesorSecundaria || rol === RolesSistema.Tutor) {
      // PROFESOR DE SECUNDARIA o TUTOR
      const idProfesorSecundaria = (
        user as ProfesorTutorSecundariaAuthenticated
      ).Id_Profesor_Secundaria;

      // Obtener cursos horario del profesor
      const cursosHorario = await obtenerCursosHorarioPorProfesor(
        idProfesorSecundaria,
        rdp02EnUso
      );

      // Calcular horario semanal
      const horarioSemanal = calcularHorarioSemanalProfesorSecundaria(
        cursosHorario,
        horaInicioAsistenciaSecundaria,
        duracionHoraAcademica,
        bloqueInicioRecreo,
        duracionRecreoMinutos,
        horarioLaboralInicioSecundaria,
        horarioLaboralFinSecundaria
      );

      const rangoHorarioMaximo: RangoHorario = {
        Hora_Inicio: horarioLaboralInicioSecundaria,
        Hora_Fin: horarioLaboralFinSecundaria,
      };

      return res.status(200).json({
        success: true,
        message: "Horario obtenido exitosamente",
        data: {
          CursosHorario: cursosHorario,
          HorarioSemanal: horarioSemanal,
          Actor: actor,
          RangoHorarioMaximo: rangoHorarioMaximo,
          Recreos: recreos,
        },
      } as GetMiHorarioSuccessResponse);
    } else if (rol === RolesSistema.Directivo) {
      // DIRECTIVO
      const idDirectivo = (user as DirectivoAuthenticated).Id_Directivo;

      // Obtener horarios adicionales necesarios para directivos
      const horariosDirectivos = await obtenerHorariosAsistencia(
        [
          "Horario_Laboral_Rango_Total_Inicio",
          "Horario_Laboral_Rango_Total_Fin",
        ],
        rdp02EnUso
      );

      const horarioLaboralRangoInicio = convertirTimeToHMS(
        horariosDirectivos.Horario_Laboral_Rango_Total_Inicio
      );
      const horarioLaboralRangoFin = convertirTimeToHMS(
        horariosDirectivos.Horario_Laboral_Rango_Total_Fin
      );

      // Obtener horarios por días del directivo
      const horariosPorDias = await obtenerHorariosPorDiasDirectivo(
        idDirectivo,
        rdp02EnUso
      );

      const horarioSemanal =
        convertirHorariosPorDiasAHorarioSemanal(horariosPorDias);

      const rangoHorarioMaximo: RangoHorario = {
        Hora_Inicio: horarioLaboralRangoInicio,
        Hora_Fin: horarioLaboralRangoFin,
      };

      return res.status(200).json({
        success: true,
        message: "Horario obtenido exitosamente",
        data: {
          HorarioSemanal: horarioSemanal,
          Actor: actor,
          RangoHorarioMaximo: rangoHorarioMaximo,
          Recreos: recreos,
        },
      } as GetMiHorarioSuccessResponse);
    } else if (rol === RolesSistema.PersonalAdministrativo) {
      // PERSONAL ADMINISTRATIVO
      const idPersonal = (user as PersonalAdministrativoAuthenticated)
        .Id_Personal_Administrativo;

      // Obtener horarios adicionales necesarios para personal administrativo
      const horariosPersonal = await obtenerHorariosAsistencia(
        [
          "Horario_Laboral_Rango_Total_Inicio",
          "Horario_Laboral_Rango_Total_Fin",
        ],
        rdp02EnUso
      );

      const horarioLaboralRangoInicio = convertirTimeToHMS(
        horariosPersonal.Horario_Laboral_Rango_Total_Inicio
      );
      const horarioLaboralRangoFin = convertirTimeToHMS(
        horariosPersonal.Horario_Laboral_Rango_Total_Fin
      );

      // Obtener horarios por días del personal
      const horariosPorDias =
        await obtenerHorariosPorDiasPersonalAdministrativo(
          idPersonal,
          rdp02EnUso
        );

      const horarioSemanal =
        convertirHorariosPorDiasAHorarioSemanal(horariosPorDias);

      const rangoHorarioMaximo: RangoHorario = {
        Hora_Inicio: horarioLaboralRangoInicio,
        Hora_Fin: horarioLaboralRangoFin,
      };

      return res.status(200).json({
        success: true,
        message: "Horario obtenido exitosamente",
        data: {
          HorarioSemanal: horarioSemanal,
          Actor: actor,
          RangoHorarioMaximo: rangoHorarioMaximo,
          Recreos: recreos,
        },
      } as GetMiHorarioSuccessResponse);
    } else if (rol === RolesSistema.Auxiliar) {
      // AUXILIAR
      const horarioLaboralInicioAuxiliar = convertirTimeToHMS(
        horarios.Inicio_Horario_Laboral_Auxiliar
      );
      const horarioLaboralFinAuxiliar = convertirTimeToHMS(
        horarios.Fin_Horario_Laboral_Auxiliar
      );

      const horarioSemanal = crearHorarioSemanalEstatico(
        horarioLaboralInicioAuxiliar,
        horarioLaboralFinAuxiliar
      );

      const rangoHorarioMaximo: RangoHorario = {
        Hora_Inicio: horarioLaboralInicioAuxiliar,
        Hora_Fin: horarioLaboralFinAuxiliar,
      };

      return res.status(200).json({
        success: true,
        message: "Horario obtenido exitosamente",
        data: {
          HorarioSemanal: horarioSemanal,
          Actor: actor,
          RangoHorarioMaximo: rangoHorarioMaximo,
          Recreos: recreos,
        },
      } as GetMiHorarioSuccessResponse);
    } else if (rol === RolesSistema.ProfesorPrimaria) {
      // PROFESOR DE PRIMARIA
      const horarioLaboralInicioPrimaria = convertirTimeToHMS(
        horarios.Inicio_Horario_Laboral_Profesores_Primaria
      );
      const horarioLaboralFinPrimaria = convertirTimeToHMS(
        horarios.Fin_Horario_Laboral_Profesores_Primaria
      );

      const horarioSemanal = crearHorarioSemanalEstatico(
        horarioLaboralInicioPrimaria,
        horarioLaboralFinPrimaria
      );

      const rangoHorarioMaximo: RangoHorario = {
        Hora_Inicio: horarioLaboralInicioPrimaria,
        Hora_Fin: horarioLaboralFinPrimaria,
      };

      return res.status(200).json({
        success: true,
        message: "Horario obtenido exitosamente",
        data: {
          HorarioSemanal: horarioSemanal,
          Actor: actor,
          RangoHorarioMaximo: rangoHorarioMaximo,
          Recreos: recreos,
        },
      } as GetMiHorarioSuccessResponse);
    }

    // No debería llegar aquí
    return res.status(500).json({
      success: false,
      message: "Error al procesar el rol del usuario",
      errorType: SystemErrorTypes.UNKNOWN_ERROR,
    } as ErrorResponseAPIBase);
  } catch (error) {
    console.error("Error al obtener horario:", error);

    return res.status(500).json({
      success: false,
      message: "Error interno del servidor al obtener horario",
      errorType: SystemErrorTypes.UNKNOWN_ERROR,
    } as ErrorResponseAPIBase);
  }
}) as any);

export default router;
