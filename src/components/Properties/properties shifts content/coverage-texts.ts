// src/components/Properties/properties shifts content/coverage-texts.ts

// Función auxiliar para convertir hora de 24h a 12h con AM/PM
const to12HourFormat = (time24: string): string => {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export const COVERAGE_TEXTS = {
  startGap: (serviceName: string, gapEnd: string) =>
    `${serviceName}: Falta cubrir el inicio antes de ${to12HourFormat(gapEnd)}`,

  middleGap: (serviceName: string, gapStart: string, gapEnd: string) =>
    `${serviceName}: Falta cubrir entre ${to12HourFormat(gapStart)} y ${to12HourFormat(gapEnd)}`,

  endGap: (serviceName: string, gapStart: string) =>
    `${serviceName}: Falta cubrir después de ${to12HourFormat(gapStart)}`,

  fullServiceGap: (serviceName: string, startTime: string, endTime: string) =>
    `${serviceName}: Falta cubrir todo el servicio (${to12HourFormat(startTime)} - ${to12HourFormat(endTime)})`,

  overnightStartGap: (serviceName: string, gapEnd: string) =>
    `${serviceName}: Falta cubrir la madrugada hasta ${to12HourFormat(gapEnd)}`,

  overnightEndGap: (serviceName: string, gapStart: string) =>
    `${serviceName}: Falta cubrir después de ${to12HourFormat(gapStart)}`,
} as const;
