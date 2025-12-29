import { normalizeField } from './formatters.js'

export default function AssignmentControlsCard({ status, summary, onLoadNext, onSkip }) {
  return (
    <article className="card doctor-toolbar">
      <header>
        <h3>Assignment controls</h3>
        <p>Claim the next intake or hand it back to the queue.</p>
      </header>
      <div className="lookup-form">
        <div className="lookup-row">
          <button type="button" className="primary" onClick={onLoadNext}>
            Load next summary
          </button>
          <button type="button" className="ghost" onClick={onSkip} disabled={!summary}>
            Skip current summary
          </button>
        </div>
      </div>
      <p className={`summary-status tone-${status.tone}`}>{normalizeField(status.message)}</p>
    </article>
  )
}
