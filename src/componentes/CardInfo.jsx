// src/components/CardInfo.jsx
export function CardInfo({ icone, label, valor, cor }) {
  return (
    <div className="card-info">
      <div className={`card-info-icon ${cor}`}>
        <i className={`fa-solid ${icone}`}></i>
      </div>
      <div className="card-info-content">
        <span className="card-info-label">{label}</span>
        <span className="card-info-value">{valor}</span>
      </div>
    </div>
  );
}