import { normalizeField } from './formatters.js'

export default function PrescriptionBuilderCard({
  prescriptionItems,
  options,
  durationOptions,
  maxItems,
  canAddRow,
  isPrescriptionReady,
  callIsActive,
  notes,
  prescriptionStatus,
  onUpdateItemField,
  onAddRow,
  onRemoveRow,
  onNotesChange,
  onSend,
}) {
  return (
    <article className="card prescription-card">
      <header>
        <p className="eyebrow">Prescription builder</p>
        <h3>Send structured medication plans</h3>
        <p className="meta">Choose from the approved formulary, set the dosing cadence, and push the plan to the patient portal.</p>
      </header>

      <div className="prescription-grid">
        {prescriptionItems.map((item, index) => (
          <div key={`rx-${index}`} className="prescription-row">
            {prescriptionItems.length > 1 && (
              <button 
                type="button" 
                className="remove-medicine-btn" 
                onClick={() => onRemoveRow(index)}
                aria-label="Remove medicine"
              >
                ×
              </button>
            )}
            <div>
              <label className="field-label" htmlFor={`medicine-${index}`}>
                Medicine
              </label>
              <select
                id={`medicine-${index}`}
                value={item.medicineCode}
                onChange={(event) => onUpdateItemField(index, 'medicineCode', event.target.value)}
              >
                <option value="">Select medicine</option>
                {[...options.medicines, { code: 'custom', label: 'Custom (type below)' }].map((medicine) => (
                  <option key={medicine.code} value={medicine.code}>
                    {medicine.label}
                  </option>
                ))}
              </select>
              {item.medicineCode === 'custom' && (
                <>
                  <label className="field-label" htmlFor={`custom-${index}`}>
                    Custom medicine name
                  </label>
                  <input
                    id={`custom-${index}`}
                    value={item.customLabel}
                    onChange={(event) => onUpdateItemField(index, 'customLabel', event.target.value)}
                    placeholder="Type medicine name"
                  />
                </>
              )}
            </div>
            <div>
              <label className="field-label" htmlFor={`frequency-${index}`}>
                Frequency
              </label>
              <select
                id={`frequency-${index}`}
                value={item.frequency}
                onChange={(event) => onUpdateItemField(index, 'frequency', event.target.value)}
              >
                <option value="">Select frequency</option>
                {options.frequencies.map((frequency) => (
                  <option key={frequency.code} value={frequency.code}>
                    {frequency.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor={`duration-${index}`}>
                Duration
              </label>
              <select
                id={`duration-${index}`}
                value={item.durationKey}
                onChange={(event) => onUpdateItemField(index, 'durationKey', event.target.value)}
              >
                <option value="">Select duration</option>
                {durationOptions.map((duration) => (
                  <option key={duration.key} value={duration.key}>
                    {duration.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor={`dosage-${index}`}>
                Dosage
              </label>
              <input
                id={`dosage-${index}`}
                value={item.dosage}
                onChange={(event) => onUpdateItemField(index, 'dosage', event.target.value)}
                placeholder="e.g., 400 mg"
              />
            </div>
            <div>
              <label className="field-label" htmlFor={`when-${index}`}>
                When
              </label>
              <select
                id={`when-${index}`}
                value={item.when}
                onChange={(event) => onUpdateItemField(index, 'when', event.target.value)}
              >
                <option value="">Select when</option>
                <option value="after-meal">After meal</option>
                <option value="before-meal">Before meal</option>
                <option value="sos">SOS</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      <div className="inline-actions">
        <button type="button" className="secondary" onClick={onAddRow} disabled={!canAddRow}>
          Add another medicine
        </button>
        <span className="muted">
          {prescriptionItems.length}/{maxItems} entries
        </span>
      </div>

      <label className="field-label" htmlFor="notesInput">
        Additional notes (optional)
      </label>
      <textarea
        id="notesInput"
        rows={3}
        value={notes}
        onChange={onNotesChange}
        placeholder="Hydrate well, report if fever crosses 101°F…"
      />

      <div className="lookup-row">
        <button type="button" className="primary" onClick={onSend} disabled={!isPrescriptionReady}>
          Send prescription to patient
        </button>
        {!callIsActive && (
          <span className="muted" style={{ fontSize: '0.85rem', color: '#d9534f' }}>
            ⓘ Call must be active to send prescription
          </span>
        )}
      </div>
      <p className={`summary-status tone-${prescriptionStatus.tone}`}>{normalizeField(prescriptionStatus.message)}</p>
    </article>
  )
}
