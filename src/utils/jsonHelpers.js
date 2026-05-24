/** Parse JSON ou devolve o valor já parseado. */
export function parseJSONSeguro(dado, fallback = []) {
  if (dado == null || dado === '') return fallback;
  if (typeof dado !== 'string') return dado;
  try {
    return JSON.parse(dado);
  } catch {
    return fallback;
  }
}

/**
 * Normaliza cargos_json para array de strings.
 * Aceita: ["A","B"] | { cargos: ["A"] } | string única
 */
export function normalizarCargosJson(dado, fallback = []) {
  const parsed = parseJSONSeguro(dado, null);
  if (parsed == null) return [...fallback];

  if (Array.isArray(parsed)) {
    return parsed
      .map((c) => (c != null ? String(c).trim() : ''))
      .filter(Boolean);
  }

  if (typeof parsed === 'object' && Array.isArray(parsed.cargos)) {
    return parsed.cargos
      .map((c) => (c != null ? String(c).trim() : ''))
      .filter(Boolean);
  }

  if (typeof parsed === 'string' && parsed.trim()) {
    return [parsed.trim()];
  }

  return [...fallback];
}

/** Normaliza emails_json / telefones_json para array. */
export function normalizarListaJson(dado, fallback = []) {
  const parsed = parseJSONSeguro(dado, null);
  if (parsed == null) return [...fallback];
  if (Array.isArray(parsed)) {
    return parsed
      .map((item) => (item != null ? String(item).trim() : ''))
      .filter(Boolean);
  }
  if (typeof parsed === 'string' && parsed.trim()) {
    return [parsed.trim()];
  }
  return [...fallback];
}

export function cargosParaTexto(dado, separador = ' | ') {
  const lista = normalizarCargosJson(dado, []);
  return lista.length ? lista.join(separador) : '';
}
