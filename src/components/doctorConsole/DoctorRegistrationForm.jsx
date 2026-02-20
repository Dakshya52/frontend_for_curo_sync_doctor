import { normalizeField } from './formatters.js'

const STATE_MEDICAL_COUNCILS = [
  'Andhra Pradesh Medical Council',
  'Arunachal Pradesh Medical Council',
  'Assam Medical Council',
  'Bihar Medical Council',
  'Chhattisgarh Medical Council',
  'Delhi Medical Council',
  'Goa Medical Council',
  'Gujarat Medical Council',
  'Haryana Medical Council',
  'Himachal Pradesh Medical Council',
  'Jharkhand Medical Council',
  'Karnataka Medical Council',
  'Kerala Medical Council',
  'Madhya Pradesh Medical Council',
  'Maharashtra Medical Council',
  'Manipur Medical Council',
  'Meghalaya Medical Council',
  'Mizoram Medical Council',
  'Nagaland Medical Council',
  'Odisha Council of Medical Registration',
  'Punjab Medical Council',
  'Rajasthan Medical Council',
  'Sikkim Medical Council',
  'Tamil Nadu Medical Council',
  'Telangana State Medical Council',
  'Tripura State Medical Council',
  'Uttar Pradesh Medical Council',
  'Uttarakhand Medical Council',
  'West Bengal Medical Council',
]

const LANGUAGES = [
  'Hindi',
  'English',
  'Bengali',
  'Telugu',
  'Marathi',
  'Tamil',
  'Urdu',
  'Gujarati',
  'Kannada',
  'Malayalam',
  'Odia',
  'Punjabi',
  'Assamese',
//   'Sanskrit',
  'Konkani',
  'Nepali',
  'Sindhi',
]

const SPECIALIZATIONS = [
  'General Medicine',
  'Pediatrics',
  'Obstetrics & Gynecology',
  'Surgery',
  'Orthopedics',
  'ENT',
  'Ophthalmology',
  'Dermatology',
  'Psychiatry',
  'Cardiology',
  'Neurology',
  'Gastroenterology',
  'Pulmonology',
  'Nephrology',
  'Endocrinology',
  'Rheumatology',
  'Oncology',
  'Anesthesiology',
  'Radiology',
  'Pathology',
  'General Practice/Family Medicine',
]

export default function DoctorRegistrationForm({ formData, onFieldChange, onSubmit, registrationStatus }) {
  const handleInputChange = (e) => {
    onFieldChange(e.target.name, e.target.value)
  }

  const handleCheckboxChange = (e) => {
    onFieldChange(e.target.name, e.target.checked)
  }

  const handleLanguageChange = (language) => {
    const currentLanguages = formData.languagesSpoken || []
    const updated = currentLanguages.includes(language)
      ? currentLanguages.filter((l) => l !== language)
      : [...currentLanguages, language]
    onFieldChange('languagesSpoken', updated)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 500 * 1024) {
        alert('Signature image must be less than 500 KB')
        e.target.value = ''
        return
      }
      if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        alert('Only PNG and JPEG images are allowed')
        e.target.value = ''
        return
      }
      onFieldChange('signatureImage', file)
    }
  }

  const allDeclarationsChecked =
    formData.declaration1 &&
    formData.declaration2 &&
    formData.declaration3 &&
    formData.declaration4 &&
    formData.declaration5 &&
    formData.declaration6

  return (
    <section className="doctor-panel">
      <header>
        <p className="eyebrow">Doctor Registration</p>
        <h2>Complete your professional profile</h2>
        <p className="subtitle">
          All fields are required unless marked optional. Please ensure all information matches your official
          registration documents.
        </p>
        <div className="important-notice">
          <p>
            <strong>Important:</strong> Along with completing this form, you are required to email your{' '}
            <strong>Registration Certificate</strong> and <strong>PAN card</strong> as PDF/PNG/JPEG attachments to{' '}
            <strong>onboarding@curowellness.com</strong>. Your registration will be reviewed by our admin team. Once
            approved, you can log in using the email and password you provide in this form. Please ensure the email
            address you provide matches the one used to send your documents.
          </p>
        </div>
      </header>

      <form className="doctor-registration-form" onSubmit={onSubmit}>
        {/* Section 1: Basic Identity Details */}
        <article className="card registration-section">
          <header>
            <h3>1. Basic Identity Details</h3>
          </header>
          <div className="form-group">
            <label className="field-label" htmlFor="fullName">
              Full Name (as per Medical Registration) *
            </label>
            <input
              id="fullName"
              name="fullName"
              value={formData.fullName || ''}
              onChange={handleInputChange}
              placeholder="Dr. Jane Doe"
              required
            />
          </div>

          <div className="form-group">
            <label className="field-label" htmlFor="gender">
              Gender *
            </label>
            <select id="gender" name="gender" value={formData.gender || ''} onChange={handleInputChange} required>
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label className="field-label" htmlFor="dateOfBirth">
              Date of Birth (DD-MM-YYYY) *
            </label>
            <input
              id="dateOfBirth"
              name="dateOfBirth"
              type="text"
              value={formData.dateOfBirth || ''}
              onChange={handleInputChange}
              placeholder="DD-MM-YYYY"
              pattern="\d{2}-\d{2}-\d{4}"
              required
            />
          </div>

          <div className="form-group">
            <label className="field-label" htmlFor="mobileNumber">
              Mobile Number *
            </label>
            <input
              id="mobileNumber"
              name="mobileNumber"
              type="tel"
              value={formData.mobileNumber || ''}
              onChange={handleInputChange}
              placeholder="+91 9876543210"
              required
            />
          </div>

          <div className="form-group">
            <label className="field-label" htmlFor="email">
              Email ID *
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email || ''}
              onChange={handleInputChange}
              placeholder="doctor@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="field-label" htmlFor="password">
              Password *
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password || ''}
              onChange={handleInputChange}
              placeholder="Create a strong password"
              required
            />
          </div>
        </article>

        {/* Section 2: Professional Qualification */}
        <article className="card registration-section">
          <header>
            <h3>2. Professional Qualification</h3>
          </header>
          <div className="form-group">
            <label className="field-label" htmlFor="primaryQualification">
              Primary Qualification (MBBS / BDS / etc.) *
            </label>
            <input
              id="primaryQualification"
              name="primaryQualification"
              value={formData.primaryQualification || ''}
              onChange={handleInputChange}
              placeholder="MBBS"
              required
            />
          </div>

          <div className="form-group">
            <label className="field-label" htmlFor="additionalQualification">
              Additional Qualification (MD/MS/DNB)
            </label>
            <input
              id="additionalQualification"
              name="additionalQualification"
              value={formData.additionalQualification || ''}
              onChange={handleInputChange}
              placeholder="MD, MS, DNB (Optional)"
            />
          </div>

          <div className="form-group">
            <label className="field-label" htmlFor="yearOfGraduation">
              Year of Graduation
            </label>
            <input
              id="yearOfGraduation"
              name="yearOfGraduation"
              type="number"
              value={formData.yearOfGraduation || ''}
              onChange={handleInputChange}
              placeholder="2015 (Optional)"
              min="1950"
              max={new Date().getFullYear()}
            />
          </div>
        </article>

        {/* Section 3: Medical Registration Details */}
        <article className="card registration-section">
          <header>
            <h3>3. Medical Registration Details</h3>
          </header>
          <div className="form-group">
            <label className="field-label" htmlFor="medicalRegistrationNumber">
              Medical Registration Number *
            </label>
            <input
              id="medicalRegistrationNumber"
              name="medicalRegistrationNumber"
              value={formData.medicalRegistrationNumber || ''}
              onChange={handleInputChange}
              placeholder="e.g., MCI/123456"
              required
            />
          </div>

          <div className="form-group">
            <label className="field-label" htmlFor="stateMedicalCouncil">
              State Medical Council *
            </label>
            <select
              id="stateMedicalCouncil"
              name="stateMedicalCouncil"
              value={formData.stateMedicalCouncil || ''}
              onChange={handleInputChange}
              required
            >
              <option value="">Select State Medical Council</option>
              {STATE_MEDICAL_COUNCILS.map((council) => (
                <option key={council} value={council}>
                  {council}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="field-label" htmlFor="yearOfRegistration">
              Year of Registration *
            </label>
            <input
              id="yearOfRegistration"
              name="yearOfRegistration"
              type="number"
              value={formData.yearOfRegistration || ''}
              onChange={handleInputChange}
              placeholder="2015"
              min="1950"
              max={new Date().getFullYear()}
              required
            />
          </div>
        </article>

        {/* Section 4: Practice Details */}
        <article className="card registration-section">
          <header>
            <h3>4. Practice Details</h3>
          </header>
          <div className="form-group">
            <label className="field-label" htmlFor="currentPracticeAddress">
              Current Practice Address *
            </label>
            <textarea
              id="currentPracticeAddress"
              name="currentPracticeAddress"
              value={formData.currentPracticeAddress || ''}
              onChange={handleInputChange}
              placeholder="Enter your clinic/hospital address"
              rows="3"
              required
            />
          </div>

          <div className="form-group">
            <label className="field-label" htmlFor="city">
              City *
            </label>
            <input
              id="city"
              name="city"
              value={formData.city || ''}
              onChange={handleInputChange}
              placeholder="Mumbai"
              required
            />
          </div>

          <div className="form-group">
            <label className="field-label" htmlFor="state">
              State *
            </label>
            <input
              id="state"
              name="state"
              value={formData.state || ''}
              onChange={handleInputChange}
              placeholder="Maharashtra"
              required
            />
          </div>

          <div className="form-group">
            <label className="field-label" htmlFor="pincode">
              Pincode *
            </label>
            <input
              id="pincode"
              name="pincode"
              type="text"
              value={formData.pincode || ''}
              onChange={handleInputChange}
              placeholder="400001"
              pattern="\d{6}"
              required
            />
          </div>
        </article>

        {/* Section 5: Languages Spoken */}
        <article className="card registration-section">
          <header>
            <h3>5. Languages Spoken</h3>
            <p>Select all languages you can communicate in with patients</p>
          </header>
          <div className="language-grid">
            {LANGUAGES.map((language) => (
              <label key={language} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={(formData.languagesSpoken || []).includes(language)}
                  onChange={() => handleLanguageChange(language)}
                />
                <span>{language}</span>
              </label>
            ))}
          </div>
        </article>

        {/* Section 6: Specialization */}
        <article className="card registration-section">
          <header>
            <h3>6. Specialization</h3>
          </header>
          <div className="form-group">
            <label className="field-label" htmlFor="specialization">
              Specialization *
            </label>
            <select
              id="specialization"
              name="specialization"
              value={formData.specialization || ''}
              onChange={handleInputChange}
              required
            >
              <option value="">Select Specialization</option>
              {SPECIALIZATIONS.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
              <option value="Other">Other (specify below)</option>
            </select>
          </div>

          {formData.specialization === 'Other' && (
            <div className="form-group">
              <label className="field-label" htmlFor="specializationOther">
                Specify Specialization *
              </label>
              <input
                id="specializationOther"
                name="specializationOther"
                value={formData.specializationOther || ''}
                onChange={handleInputChange}
                placeholder="Enter your specialization"
                required
              />
            </div>
          )}
        </article>

        {/* Section 7: Identity Verification */}
        <article className="card registration-section">
          <header>
            <h3>7. Identity Verification</h3>
          </header>
          <div className="form-group">
            <label className="field-label" htmlFor="panNumber">
              PAN Number *
            </label>
            <input
              id="panNumber"
              name="panNumber"
              value={formData.panNumber || ''}
              onChange={handleInputChange}
              placeholder="ABCDE1234F"
              pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
              maxLength="10"
              style={{ textTransform: 'uppercase' }}
              required
            />
          </div>
        </article>

        {/* Section 8: Bank Details */}
        <article className="card registration-section">
          <header>
            <h3>8. Bank Details</h3>
          </header>
          <div className="form-group">
            <label className="field-label" htmlFor="accountHolderName">
              Account Holder Name *
            </label>
            <input
              id="accountHolderName"
              name="accountHolderName"
              value={formData.accountHolderName || ''}
              onChange={handleInputChange}
              placeholder="As per bank records"
              required
            />
          </div>

          <div className="form-group">
            <label className="field-label" htmlFor="bankName">
              Bank Name *
            </label>
            <input
              id="bankName"
              name="bankName"
              value={formData.bankName || ''}
              onChange={handleInputChange}
              placeholder="State Bank of India"
              required
            />
          </div>

          <div className="form-group">
            <label className="field-label" htmlFor="accountNumber">
              Account Number *
            </label>
            <input
              id="accountNumber"
              name="accountNumber"
              value={formData.accountNumber || ''}
              onChange={handleInputChange}
              placeholder="1234567890"
              required
            />
          </div>

          <div className="form-group">
            <label className="field-label" htmlFor="ifscCode">
              IFSC Code *
            </label>
            <input
              id="ifscCode"
              name="ifscCode"
              value={formData.ifscCode || ''}
              onChange={handleInputChange}
              placeholder="SBIN0001234"
              pattern="[A-Z]{4}0[A-Z0-9]{6}"
              maxLength="11"
              style={{ textTransform: 'uppercase' }}
              required
            />
          </div>
        </article>

        {/* Section 9: Digital Signature */}
        <article className="card registration-section">
          <header>
            <h3>9. Digital Signature for Prescription</h3>
            <p>Upload your signature image (PNG/JPEG, max 500 KB)</p>
          </header>
          <div className="form-group">
            <label className="field-label" htmlFor="signatureImage">
              Signature Image *
            </label>
            <input
              id="signatureImage"
              name="signatureImage"
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleFileChange}
              required
            />
            {formData.signatureImage && (
              <p className="file-info">Selected: {formData.signatureImage.name}</p>
            )}
          </div>
        </article>

        {/* Section 10: Mandatory Legal Declarations */}
        <article className="card registration-section">
          <header>
            <h3>10. Mandatory Legal Declarations</h3>
            <p>You must accept all declarations to proceed</p>
          </header>
          <div className="declarations">
            <label className="checkbox-label declaration">
              <input
                type="checkbox"
                name="declaration1"
                checked={formData.declaration1 || false}
                onChange={handleCheckboxChange}
                required
              />
              <span>I confirm I am a Registered Medical Practitioner under NMC Act</span>
            </label>

            <label className="checkbox-label declaration">
              <input
                type="checkbox"
                name="declaration2"
                checked={formData.declaration2 || false}
                onChange={handleCheckboxChange}
                required
              />
              <span>I will comply with Telemedicine Practice Guidelines 2020</span>
            </label>

            <label className="checkbox-label declaration">
              <input
                type="checkbox"
                name="declaration3"
                checked={formData.declaration3 || false}
                onChange={handleCheckboxChange}
                required
              />
              <span>I understand Schedule X / NDPS drugs cannot be prescribed via telemedicine</span>
            </label>

            <label className="checkbox-label declaration">
              <input
                type="checkbox"
                name="declaration4"
                checked={formData.declaration4 || false}
                onChange={handleCheckboxChange}
                required
              />
              <span>Final diagnosis and prescription responsibility lies solely with me</span>
            </label>

            <label className="checkbox-label declaration">
              <input
                type="checkbox"
                name="declaration5"
                checked={formData.declaration5 || false}
                onChange={handleCheckboxChange}
                required
              />
              <span>AI on this platform assists in documentation only and does not diagnose</span>
            </label>

            <label className="checkbox-label declaration">
              <input
                type="checkbox"
                name="declaration6"
                checked={formData.declaration6 || false}
                onChange={handleCheckboxChange}
                required
              />
              <span>I consent to digital storage of consultation records</span>
            </label>
          </div>
        </article>

        <div className="form-actions">
          <button type="submit" className="primary" disabled={!allDeclarationsChecked}>
            Accept & Continue
          </button>
        </div>

        <p className={`summary-status tone-${registrationStatus.tone}`}>{normalizeField(registrationStatus.message)}</p>
      </form>
    </section>
  )
}
