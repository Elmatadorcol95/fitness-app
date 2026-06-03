// Conversiones entre métrico e imperial.
// Internamente todo se guarda en kg y cm.

export const kgToLb = (kg: number) => +(kg * 2.20462).toFixed(1);
export const lbToKg = (lb: number) => +(lb / 2.20462).toFixed(2);
export const cmToFtIn = (cm: number) => {
  const totalInches = cm / 2.54;
  const ft = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { ft, inches };
};
export const ftInToCm = (ft: number, inches: number) =>
  +((ft * 12 + inches) * 2.54).toFixed(1);
