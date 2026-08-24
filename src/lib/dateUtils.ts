// #32: helper compartido de fecha LOCAL — reemplaza el patrón
// toISOString().split('T')[0] (siempre UTC) que había duplicado en 8
// archivos. toISOString() puede desplazar el día cerca de medianoche en
// husos horarios adelantados a UTC (ej. Europa en horario de verano: la
// medianoche local ya cruzó al día siguiente, pero la hora UTC equivalente
// todavía es el día anterior).

/** Fecha de un Date en la hora LOCAL del dispositivo, formato YYYY-MM-DD. */
export function formatLocalDate(d: Date): string {
  const year  = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day   = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Fecha de hoy en la hora local del dispositivo, formato YYYY-MM-DD. */
export function todayLocal(): string {
  return formatLocalDate(new Date());
}

/**
 * Fecha de ayer en la hora local del dispositivo. Aritmética de calendario
 * (setDate) en vez de restar 86_400_000 ms — mismo patrón que ya usa
 * getWeekStart() (RecapModal.tsx) para no fallar en un día con horario de
 * verano/invierno de duración distinta a 24h.
 */
export function yesterdayLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatLocalDate(d);
}

/**
 * Suma/resta `days` días de calendario a una fecha YYYY-MM-DD ya existente.
 * Parsea con 'T12:00:00' (mediodía local, nunca cerca de medianoche) antes
 * de aplicar setDate() — mismo mecanismo que ya usaban shiftDate() en
 * AddMeasurementModal.tsx/AddWeightModal.tsx antes de esta unificación.
 */
export function shiftLocalDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
}
