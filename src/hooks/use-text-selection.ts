import { useState } from 'react';

export interface TextSelectionRange {
  start: number;
  end: number;
}

/**
 * #39: mecanismo de selección extraído de Kg (#20) y descanso por ejercicio
 * (#37) — ambos ya lo tenían implementado por su cuenta, byte a byte igual.
 * Reemplaza a `selectTextOnFocus`, que en Android se reaplica en cada tecla
 * (no solo al enfocar) y reselecciona todo el texto tecleado hasta ahora.
 * Indexado por `index` para servir tanto a un único campo (siempre con el
 * mismo índice) como a listas de campos (un índice real por fila) — string
 * o number según lo que ya use el llamador (ej. las claves compuestas
 * `${day.id}-${blockIdx}` de routineBuilder.tsx, donde coexisten varios
 * días a la vez y un solo number no alcanza para distinguirlos).
 * SOLO selección — la validación/commit de cada campo sigue siendo suya.
 */
export function useIndexedTextSelection() {
  const [selections, setSelections] = useState<Record<string | number, TextSelectionRange | undefined>>({});

  function selectAll(index: string | number, text: string) {
    setSelections(prev => ({ ...prev, [index]: { start: 0, end: text.length } }));
  }

  function moveCursorToEnd(index: string | number, text: string) {
    setSelections(prev => ({ ...prev, [index]: { start: text.length, end: text.length } }));
  }

  return { getSelection: (index: string | number) => selections[index], selectAll, moveCursorToEnd };
}

const SINGLE_INDEX = 0;

/** Variante de useIndexedTextSelection para un único TextInput, sin índice. */
export function useTextSelection() {
  const { getSelection, selectAll, moveCursorToEnd } = useIndexedTextSelection();
  return {
    selection: getSelection(SINGLE_INDEX),
    selectAll: (text: string) => selectAll(SINGLE_INDEX, text),
    moveCursorToEnd: (text: string) => moveCursorToEnd(SINGLE_INDEX, text),
  };
}
