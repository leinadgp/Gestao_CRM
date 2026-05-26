import { UFS_BRASIL } from '../constants/ufsBrasil.js';

/** Select padronizado de UF — evita erro de digitação */
export function SelectUF({ value, onChange, required = false, disabled = false, as: Component = 'select', ...props }) {
  const Tag = Component;
  return (
    <Tag value={value || ''} onChange={onChange} required={required} disabled={disabled} {...props}>
      <option value="">— Selecione a UF —</option>
      {UFS_BRASIL.map((uf) => (
        <option key={uf} value={uf}>{uf}</option>
      ))}
    </Tag>
  );
}
