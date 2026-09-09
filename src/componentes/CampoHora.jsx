import { useState, useId } from 'react';
import styled from 'styled-components';
import { normalizarHora, HORARIOS_SUGERIDOS } from '../utils/horarioSemanal.js';

/**
 * Campo de hora que não briga com quem está digitando.
 *
 * Substitui o `<input type="time">`, cujos spinners obrigavam a rolar os
 * números e atrapalhavam mais do que ajudavam. Aqui é um input de texto comum:
 * a pessoa digita "8", "830", "8h30" ou cola "08:00" e o valor só é corrigido
 * quando ela sai do campo — enquanto digita, ninguém mexe no que ela escreveu.
 * A lista de sugestões (datalist) cobre os horários que aparecem quase sempre,
 * pra maioria dos casos ser um clique.
 *
 * Se o que foi digitado não for uma hora reconhecível, o campo é limpo e
 * sinalizado, em vez de guardar algo inválido em silêncio.
 */
export function CampoHora({ value, onChange, placeholder = '--:--', ariaLabel, disabled }) {
  const [rascunho, setRascunho] = useState(value || '');
  const [invalido, setInvalido] = useState(false);
  const [valorAnterior, setValorAnterior] = useState(value);
  const idLista = useId();

  // Reflete mudanças vindas de fora (colar um horário, copiar de outro dia) sem
  // atropelar o que a pessoa está digitando agora. Ajustar durante o render é o
  // padrão do React pra estado derivado de prop — um useEffect aqui causaria um
  // render extra a cada tecla.
  if (value !== valorAnterior) {
    setValorAnterior(value);
    setRascunho(value || '');
    setInvalido(false);
  }

  function aoSair() {
    const texto = String(rascunho || '').trim();
    if (!texto) {
      setInvalido(false);
      if (value) onChange('');
      return;
    }
    const normalizada = normalizarHora(texto);
    if (!normalizada) {
      setInvalido(true);
      return;
    }
    setInvalido(false);
    setRascunho(normalizada);
    if (normalizada !== value) onChange(normalizada);
  }

  return (
    <>
      <Input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        list={idLista}
        value={rascunho}
        placeholder={placeholder}
        aria-label={ariaLabel}
        disabled={disabled}
        $invalido={invalido}
        onChange={(e) => setRascunho(e.target.value)}
        onBlur={aoSair}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
        title={invalido ? 'Hora não reconhecida — use algo como 8, 8h30 ou 08:30' : undefined}
      />
      <datalist id={idLista}>
        {HORARIOS_SUGERIDOS.map((h) => <option key={h} value={h} />)}
      </datalist>
    </>
  );
}

const Input = styled.input`
  width: 74px;
  padding: 7px 9px;
  border-radius: 8px;
  border: 1px solid ${(p) => (p.$invalido ? '#f87171' : '#cbd5e1')};
  background: ${(p) => (p.$invalido ? '#fef2f2' : '#fff')};
  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
  text-align: center;
  outline: none;
  box-sizing: border-box;

  &:focus {
    border-color: ${(p) => (p.$invalido ? '#ef4444' : '#007bff')};
    box-shadow: 0 0 0 3px ${(p) => (p.$invalido ? 'rgba(239,68,68,0.12)' : 'rgba(0,123,255,0.1)')};
  }

  &:disabled { background: #f1f5f9; color: #94a3b8; }
`;
