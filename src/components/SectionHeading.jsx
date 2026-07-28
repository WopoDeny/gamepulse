export function SectionHeading({ eyebrow, title, description, action, onAction, meta }) {
  return (
    <div className="section-heading" data-reveal>
      <div className="section-heading__copy">
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      <div className="section-heading__side">
        {meta && <span className="section-heading__meta">{meta}</span>}
        {action && (
          <button className="text-action" onClick={onAction}>{action}<span aria-hidden="true">↗</span></button>
        )}
      </div>
    </div>
  );
}
