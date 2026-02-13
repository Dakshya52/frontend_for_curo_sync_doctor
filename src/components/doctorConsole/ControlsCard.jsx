import { normalizeField } from './formatters.js'

export default function ControlsCard({ status, summary, callStatus, onLoadNext, onSkip, onCallAction }) {
  return (
    <article className="card controls-card">
      <header>
        <h3>Controls</h3>
      </header>
      
      <div className="controls-grid">
        <button type="button" className="primary" onClick={onLoadNext}>
          Load next summary
        </button>
        <button className="primary" onClick={() => onCallAction('audio')}>
          Call patient
        </button>
        <button className="secondary" onClick={() => onCallAction('video')}>
          Request Video
        </button>
        <button className="danger" onClick={() => onCallAction('escalate')}>
          Escalate to physical visit
        </button>
        <button className="ghost" onClick={() => onCallAction('end')}>
          End Consult
        </button>
        <button className="ghost" onClick={onSkip} disabled={!summary}>
          Cannot attend patient
        </button>
      </div>

      <div className="controls-status">
        <p className={`summary-status tone-${status.tone}`}>{normalizeField(status.message)}</p>
        <p className="call-status">{normalizeField(callStatus)}</p>
      </div>
    </article>
  )
}
