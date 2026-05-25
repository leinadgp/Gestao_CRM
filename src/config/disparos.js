/** Funil único de e-mail para todos os leads da campanha. */
export const TIPO_FUNIL_UNICO = 'BROADCAST';

/** Tipos antigos (frio / quente / pós-clique) — ainda exibidos se existirem no banco. */
export const TIPOS_FUNIL_LEGADO = ['BROADCAST_FRIO', 'BROADCAST_QUENTE', 'POS_CLIQUE'];

/**
 * Reative os 3 funis definindo no .env:
 * VITE_MULTIPLOS_FUNIS_DISPARO=true
 */
export const MULTIPLOS_FUNIS_DISPARO =
  import.meta.env?.VITE_MULTIPLOS_FUNIS_DISPARO === 'true';

export const TIPOS_FUNIL_BROADCAST = [TIPO_FUNIL_UNICO, 'BROADCAST_FRIO', 'BROADCAST_QUENTE'];

export function emailDoFunilDisparo(email) {
  if (!email) return false;
  if (MULTIPLOS_FUNIS_DISPARO) return true;
  return (
    email.tipo_funil === TIPO_FUNIL_UNICO
    || TIPOS_FUNIL_LEGADO.includes(email.tipo_funil)
  );
}

export function tipoFunilPadrao() {
  return MULTIPLOS_FUNIS_DISPARO ? 'BROADCAST_FRIO' : TIPO_FUNIL_UNICO;
}
