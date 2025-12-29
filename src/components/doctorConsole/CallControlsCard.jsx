import { normalizeField } from './formatters.js'

export default function CallControlsCard({ callStatus, onAction }) {
  return (
    <article className="card call-controls">
      <header>
        <p className="eyebrow">Call controls</p>
        <h3>One-tap actions</h3>
        <p className="meta">Always visible for every consult.</p>
      </header>
      <div className="call-actions">
        <button className="primary" onClick={() => onAction('audio')}>
          Call patient
        </button>
        <button className="secondary" onClick={() => onAction('video')}>
          Request video
        </button>
        <button className="ghost" onClick={() => onAction('end')}>
          End consult
        </button>
        <button className="danger" onClick={() => onAction('escalate')}>
          Escalate to physical visit
        </button>
      </div>
      <p className="call-status">{normalizeField(callStatus)}</p>
    </article>
  )
}
