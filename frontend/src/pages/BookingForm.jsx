import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../utils/apiConfig.js";
import "../styles/bookingForm.css";

const counselingTypes = [
  "Individual Counseling",
  "Couple Counseling",
  "Family Counseling",
  "Teen/Youth Support",
  "Group Therapy",
  "Career Guidance",
  "Trauma Support",
  "Substance Use Support",
  "Crisis Intervention",
];

const sessionDurations = [
  { value: "45", label: "45 minutes" },
  { value: "60", label: "60 minutes" },
  { value: "90", label: "90 minutes" },
];

const issueDurations = ["Days", "Weeks", "Months", "Years", "Uncertain"];

const paymentMethods = [
  { value: "mpesa", label: "M-Pesa" },
  { value: "bank", label: "Bank" },
];

const initialFormState = {
  fullName: "",
  gender: "",
  pronouns: "",
  dateOfBirth: "",
  phone: "",
  email: "",
  county: "",
  town: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  counselingType: "",
  preferredCounselorId: "",
  preferredDate: "",
  preferredTime: "",
  sessionMode: "Online video call",
  sessionDuration: "60",
  reason: "",
  sessionGoals: "",
  issueDuration: "",
  previousCounseling: "no",
  previousCounselingDetails: "",
  consentDataCollection: false,
  consentConfidentiality: false,
  consentReminders: true,
  paymentMethod: "mpesa",
  mpesaPhoneNumber: "",
  transactionReference: "",
  paymentConfirmation: false,
};

const DRAFT_STORAGE_KEY = "booking_form_draft";

// Step validation functions
const validateStep1 = (data) => {
  const errors = {};
  if (!data.fullName?.trim()) errors.fullName = "Please enter your full legal name.";
  if (!data.dateOfBirth) errors.dateOfBirth = "Select your date of birth.";
  if (!data.phone?.trim()) errors.phone = "Enter a reachable phone number.";
  if (!data.email?.trim()) errors.email = "Enter a valid email address.";
  if (!data.county?.trim()) errors.county = "County of residence is required.";
  if (!data.emergencyContactName?.trim()) errors.emergencyContactName = "Emergency contact name is required.";
  if (!data.emergencyContactPhone?.trim()) errors.emergencyContactPhone = "Emergency contact phone is required.";
  return errors;
};

const validateStep2 = (data) => {
  const errors = {};
  if (!data.counselingType) errors.counselingType = "Select the counseling service you need.";
  if (!data.preferredCounselorId) errors.preferredCounselorId = "Select a counselor for your session.";
  if (!data.preferredDate) errors.preferredDate = "Choose a preferred date.";
  if (!data.preferredTime) errors.preferredTime = "Choose a preferred time.";
  if (!data.sessionMode) errors.sessionMode = "Select a session mode.";
  if (!data.reason?.trim()) errors.reason = "Briefly share what brings you to counseling.";
  return errors;
};

const validateStep3 = (data) => {
  const errors = {};
  if (!data.consentDataCollection) errors.consentDataCollection = "Consent is required.";
  if (!data.consentConfidentiality) errors.consentConfidentiality = "Acknowledgement is required.";
  return errors;
};

const validateStep4 = (data) => {
  const errors = {};
  if (!data.paymentMethod) errors.paymentMethod = "Select a payment method.";
  if (data.paymentMethod === "mpesa" && !data.mpesaPhoneNumber?.trim()) {
    errors.mpesaPhoneNumber = "M-Pesa phone number is required.";
  }
  if (data.paymentMethod === "bank" && !data.transactionReference?.trim()) {
    errors.transactionReference = "Bank transfer reference is required.";
  }
  if (!data.paymentConfirmation) errors.paymentConfirmation = "Please confirm that your payment information is correct.";
  return errors;
};

const buildValidation = (data) => {
  return {
    ...validateStep1(data),
    ...validateStep2(data),
    ...validateStep3(data),
    ...validateStep4(data),
  };
};

const BookingForm = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(initialFormState);
  const [counselors, setCounselors] = useState([]);
  const [loadingCounselors, setLoadingCounselors] = useState(true);
  const [submitState, setSubmitState] = useState({ status: "idle" });
  const [accountDetails, setAccountDetails] = useState(null);
  const [stepErrors, setStepErrors] = useState({});
  const resolvedAccountDetails = accountDetails || {
    accountName: "Desol Nurturers",
    accountNumber: "1343210186",
    paybillNumber: "522522",
  };

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        setFormData(parsed);
        // Optionally restore step if needed
        if (parsed._lastStep) {
          setCurrentStep(parsed._lastStep);
          delete parsed._lastStep;
        }
      }
    } catch (error) {
      console.warn("Failed to load draft:", error);
    }
  }, []);

  // Auto-save to localStorage whenever formData changes
  useEffect(() => {
    try {
      const draftToSave = { ...formData, _lastStep: currentStep };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftToSave));
    } catch (error) {
      console.warn("Failed to save draft:", error);
    }
  }, [formData, currentStep]);

  // Calculate session cost based on duration
  const calculateSessionCost = (duration) => {
    const durationNum = parseInt(duration, 10);
    if (durationNum === 45) return 2500;
    if (durationNum === 60) return 3000;
    if (durationNum === 90) return 4000;
    return 3000;
  };

  const sessionAmount = calculateSessionCost(formData.sessionDuration);

  const sanitizedBaseUrl = (API_BASE_URL || "").replace(/\/$/, "");
  const buildApiUrl = useMemo(
    () => (path) => `${sanitizedBaseUrl}${path}`,
    [sanitizedBaseUrl]
  );

  useEffect(() => {
    let isMounted = true;

    async function fetchCounselors() {
      setLoadingCounselors(true);
      try {
        const response = await fetch(buildApiUrl("/api/counselors/public"));
        if (!response.ok) {
          throw new Error("Failed to load counselors");
        }
        const data = await response.json();
        if (isMounted) {
          setCounselors(data);
        }
      } catch (error) {
        console.error("Counselor fetch failed:", error);
        if (isMounted) {
          setSubmitState({
            status: "error",
            message:
              "We could not load the counselors list. Please refresh or contact support.",
          });
        }
      } finally {
        if (isMounted) setLoadingCounselors(false);
      }
    }

    fetchCounselors();

    return () => {
      isMounted = false;
    };
  }, [buildApiUrl]);

  useEffect(() => {
    let isMounted = true;
    async function fetchAccountDetails() {
      try {
        const response = await fetch(buildApiUrl("/api/payments/account-details"));
        if (!response.ok) {
          throw new Error("Failed to fetch account details");
        }
        const details = await response.json();
        if (isMounted) {
          setAccountDetails(details);
        }
      } catch (error) {
        console.warn("Account details fetch failed:", error.message);
        if (isMounted) {
          setAccountDetails({
            accountName: "Desol Nurturers",
            accountNumber: "1343210186",
            paybillNumber: "522522",
          });
        }
      }
    }
    fetchAccountDetails();
    return () => {
      isMounted = false;
    };
  }, [buildApiUrl]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    if (name === "paymentMethod") {
      setFormData((prev) => ({
        ...prev,
        paymentMethod: value,
        mpesaPhoneNumber: value === "bank" ? "" : prev.mpesaPhoneNumber,
        transactionReference: prev.transactionReference,
      }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    // Clear step errors when user makes changes
    if (stepErrors[name]) {
      setStepErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const handleRadioChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNext = () => {
    let errors = {};
    
    if (currentStep === 1) {
      errors = validateStep1(formData);
    } else if (currentStep === 2) {
      errors = validateStep2(formData);
    } else if (currentStep === 3) {
      errors = validateStep3(formData);
    } else if (currentStep === 4) {
      errors = validateStep4(formData);
    }

    if (Object.keys(errors).length > 0) {
      setStepErrors(errors);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setStepErrors({});
    setCurrentStep((prev) => Math.min(prev + 1, 5));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    setStepErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setFormData(initialFormState);
    setCurrentStep(1);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitState({ status: "submitting" });

    const validationErrors = buildValidation(formData);
    if (Object.keys(validationErrors).length > 0) {
      setSubmitState({
        status: "validation-error",
        validationErrors,
      });
      // Navigate to the first step with errors
      if (validationErrors.fullName || validationErrors.dateOfBirth || validationErrors.phone || 
          validationErrors.email || validationErrors.county || validationErrors.emergencyContactName || 
          validationErrors.emergencyContactPhone) {
        setCurrentStep(1);
      } else if (validationErrors.counselingType || validationErrors.preferredCounselorId || 
                 validationErrors.preferredDate || validationErrors.preferredTime || 
                 validationErrors.sessionMode || validationErrors.reason) {
        setCurrentStep(2);
      } else if (validationErrors.consentDataCollection || validationErrors.consentConfidentiality) {
        setCurrentStep(3);
      } else {
        setCurrentStep(4);
      }
      setStepErrors(validationErrors);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const preferredDateTime = new Date(
      `${formData.preferredDate}T${formData.preferredTime}`
    );

    if (isNaN(preferredDateTime.getTime())) {
      setSubmitState({
        status: "validation-error",
        validationErrors: {
          preferredDate: "Provide a valid appointment date and time.",
          preferredTime: "Provide a valid appointment date and time.",
        },
      });
      setCurrentStep(2);
      return;
    }

    const payload = {
      fullName: formData.fullName.trim(),
      gender: formData.gender || null,
      pronouns: formData.pronouns || null,
      dateOfBirth: formData.dateOfBirth,
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      county: formData.county.trim(),
      town: formData.town.trim(),
      emergencyContactName: formData.emergencyContactName?.trim() || "",
      emergencyContactPhone: formData.emergencyContactPhone?.trim() || "",
      counselingType: formData.counselingType,
      preferredCounselorId: formData.preferredCounselorId || null,
      preferredDateTime: preferredDateTime.toISOString(),
      sessionMode: formData.sessionMode,
      sessionDuration: formData.sessionDuration,
      reason: formData.reason.trim(),
      sessionGoals: formData.sessionGoals.trim(),
      issueDuration: formData.issueDuration,
      previousCounseling: formData.previousCounseling === "yes",
      previousCounselingDetails: formData.previousCounselingDetails.trim(),
      consentDataCollection: formData.consentDataCollection,
      consentConfidentiality: formData.consentConfidentiality,
      consentReminders: formData.consentReminders,
      paymentMethod: formData.paymentMethod,
      mpesaPhoneNumber: formData.mpesaPhoneNumber.trim(),
      paymentConfirmation: formData.paymentConfirmation,
      transactionReference: formData.transactionReference.trim(),
    };

    try {
      console.log("[Booking Form] Submitting booking:", payload);
      const response = await fetch(buildApiUrl("/api/web-bookings"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log("[Booking Form] Response status:", response.status);
      const result = await response.json();
      console.log("[Booking Form] Response data:", result);

      if (!response.ok) {
        const validationMap = {};
        if (Array.isArray(result?.details)) {
          result.details.forEach((item) => {
            if (item.field) {
              validationMap[item.field] = item.message;
            }
          });
        }

        setSubmitState({
          status: "error",
          message:
            result?.message ||
            "We could not submit your booking. Please try again.",
          validationErrors: validationMap,
        });
        return;
      }

      if (result.success === false) {
        const validationMap = {};
        if (Array.isArray(result?.details)) {
          result.details.forEach((item) => {
            if (item.field) {
              validationMap[item.field] = item.message;
            }
          });
        }

        setSubmitState({
          status: "error",
          message:
            result?.message ||
            "We could not submit your booking. Please try again.",
          validationErrors: validationMap,
        });
        return;
      }

      // Clear draft on successful submission
      clearDraft();

      // Redirect to confirmation page
      try {
        navigate("/booking/confirmation", {
          state: {
            bookingData: {
              appointmentCode: result.data?.appointmentCode,
              counselor: result.data?.counselor,
              appointmentDate: result.data?.appointmentDate,
              paymentInstructions: result.data?.paymentInstructions,
              paymentMethod: result.data?.paymentMethod,
              paymentNote: result.data?.paymentNote,
            },
          },
        });
      } catch (navError) {
        console.error("Navigation error:", navError);
        setSubmitState({
          status: "success",
          data: result.data,
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (error) {
      console.error("Booking submission failed:", error);
      setSubmitState({
        status: "error",
        message:
          "Something went wrong while submitting your booking. Please try again or contact support.",
      });
    }
  };

  const validationErrors =
    submitState.status === "validation-error" || submitState.status === "error"
      ? { ...stepErrors, ...(submitState.validationErrors || {}) }
      : stepErrors;

  const totalSteps = 5;
  const progressPercentage = (currentStep / totalSteps) * 100;

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <section className="booking-section">
            <h2>
              <span>👤</span> Personal Information
            </h2>
            <div className="form-grid two-column">
              <div className="form-field">
                <label htmlFor="fullName">
                  Full name <span>(as per ID)</span>
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="Jane Wambui Mwangi"
                  value={formData.fullName}
                  onChange={handleChange}
                />
                {validationErrors.fullName && (
                  <p className="error-text">{validationErrors.fullName}</p>
                )}
              </div>
              <div className="form-field">
                <label htmlFor="gender">
                  Gender / preferred pronouns <span>(optional)</span>
                </label>
                <div className="form-grid two-column">
                  <input
                    id="gender"
                    name="gender"
                    type="text"
                    placeholder="Female, Male, Non-binary..."
                    value={formData.gender}
                    onChange={handleChange}
                  />
                  <input
                    id="pronouns"
                    name="pronouns"
                    type="text"
                    placeholder="e.g., She/Her"
                    value={formData.pronouns}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="form-field">
                <label htmlFor="dateOfBirth">Date of birth</label>
                <input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                />
                {validationErrors.dateOfBirth && (
                  <p className="error-text">{validationErrors.dateOfBirth}</p>
                )}
              </div>
              <div className="form-field">
                <label htmlFor="phone">
                  Phone number <span>(WhatsApp enabled)</span>
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+254712345678"
                  value={formData.phone}
                  onChange={handleChange}
                />
                {validationErrors.phone && (
                  <p className="error-text">{validationErrors.phone}</p>
                )}
              </div>
              <div className="form-field">
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                />
                {validationErrors.email && (
                  <p className="error-text">{validationErrors.email}</p>
                )}
              </div>
              <div className="form-field">
                <label htmlFor="county">County</label>
                <input
                  id="county"
                  name="county"
                  type="text"
                  placeholder="Nairobi City"
                  value={formData.county}
                  onChange={handleChange}
                />
                {validationErrors.county && (
                  <p className="error-text">{validationErrors.county}</p>
                )}
              </div>
              <div className="form-field">
                <label htmlFor="town">
                  Town / Estate <span>(optional)</span>
                </label>
                <input
                  id="town"
                  name="town"
                  type="text"
                  placeholder="Kileleshwa"
                  value={formData.town}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="form-grid two-column">
              <div className="form-field">
                <label htmlFor="emergencyContactName">
                  Emergency contact name
                </label>
                <input
                  id="emergencyContactName"
                  name="emergencyContactName"
                  type="text"
                  placeholder="John Doe"
                  value={formData.emergencyContactName}
                  onChange={handleChange}
                />
                {validationErrors.emergencyContactName && (
                  <p className="error-text">
                    {validationErrors.emergencyContactName}
                  </p>
                )}
              </div>
              <div className="form-field">
                <label htmlFor="emergencyContactPhone">
                  Emergency contact phone
                </label>
                <input
                  id="emergencyContactPhone"
                  name="emergencyContactPhone"
                  type="tel"
                  placeholder="+254 700 000 000"
                  value={formData.emergencyContactPhone}
                  onChange={handleChange}
                />
                {validationErrors.emergencyContactPhone && (
                  <p className="error-text">
                    {validationErrors.emergencyContactPhone}
                  </p>
                )}
              </div>
            </div>
          </section>
        );

      case 2:
        return (
          <>
            <section className="booking-section">
              <h2>
                <span>🗓️</span> Appointment Details
              </h2>
              <div className="form-grid two-column">
                <div className="form-field">
                  <label htmlFor="counselingType">Type of counseling</label>
                  <select
                    id="counselingType"
                    name="counselingType"
                    value={formData.counselingType}
                    onChange={handleChange}
                  >
                    <option value="">Select service</option>
                    {counselingTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  {validationErrors.counselingType && (
                    <p className="error-text">{validationErrors.counselingType}</p>
                  )}
                </div>
                <div className="form-field">
                  <label htmlFor="preferredCounselorId">
                    Preferred counselor
                  </label>
                  <select
                    id="preferredCounselorId"
                    name="preferredCounselorId"
                    value={formData.preferredCounselorId}
                    onChange={handleChange}
                    disabled={loadingCounselors}
                  >
                    <option value="">
                      {loadingCounselors ? "Loading..." : "Select counselor"}
                    </option>
                    {counselors.map((counselor) => (
                      <option key={counselor.id} value={counselor.id}>
                        {counselor.name}
                      </option>
                    ))}
                  </select>
                  {validationErrors.preferredCounselorId && (
                    <p className="error-text">
                      {validationErrors.preferredCounselorId}
                    </p>
                  )}
                </div>
                <div className="form-field">
                  <label htmlFor="preferredDate">Preferred date</label>
                  <input
                    id="preferredDate"
                    name="preferredDate"
                    type="date"
                    value={formData.preferredDate}
                    onChange={handleChange}
                  />
                  {validationErrors.preferredDate && (
                    <p className="error-text">{validationErrors.preferredDate}</p>
                  )}
                </div>
                <div className="form-field">
                  <label htmlFor="preferredTime">Preferred time</label>
                  <input
                    id="preferredTime"
                    name="preferredTime"
                    type="time"
                    value={formData.preferredTime}
                    onChange={handleChange}
                  />
                  {validationErrors.preferredTime && (
                    <p className="error-text">{validationErrors.preferredTime}</p>
                  )}
                </div>
                <div className="form-field">
                  <label>Mode of session</label>
                  <div className="radio-row">
                    <label>
                      <input
                        type="radio"
                        name="sessionMode"
                        value="Online video call"
                        checked={formData.sessionMode === "Online video call"}
                        onChange={handleRadioChange}
                      />
                      Video call
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="sessionMode"
                        value="Audio call"
                        checked={formData.sessionMode === "Audio call"}
                        onChange={handleRadioChange}
                      />
                      Audio call
                    </label>
                  </div>
                  {validationErrors.sessionMode && (
                    <p className="error-text">{validationErrors.sessionMode}</p>
                  )}
                </div>
              </div>
            </section>

            <section className="booking-section">
              <h2>
                <span>🧠</span> Counseling Background
              </h2>
              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="reason">
                    What brings you to counseling today?
                  </label>
                  <textarea
                    id="reason"
                    name="reason"
                    placeholder="Share a short description to help your counselor prepare..."
                    value={formData.reason}
                    onChange={handleChange}
                  />
                  {validationErrors.reason && (
                    <p className="error-text">{validationErrors.reason}</p>
                  )}
                </div>
                <div className="form-field">
                  <label htmlFor="sessionGoals">
                    What goals would you like to achieve? <span>(optional)</span>
                  </label>
                  <textarea
                    id="sessionGoals"
                    name="sessionGoals"
                    placeholder="E.g., manage anxiety, improve communication, process grief..."
                    value={formData.sessionGoals}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="form-field" style={{ marginTop: "1rem" }}>
                <label>Have you attended counseling before?</label>
                <div className="radio-row">
                  <label>
                    <input
                      type="radio"
                      name="previousCounseling"
                      value="yes"
                      checked={formData.previousCounseling === "yes"}
                      onChange={handleRadioChange}
                    />
                    Yes
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="previousCounseling"
                      value="no"
                      checked={formData.previousCounseling === "no"}
                      onChange={handleRadioChange}
                    />
                    No
                  </label>
                </div>
              </div>
              {formData.previousCounseling === "yes" && (
                <div className="form-field" style={{ marginTop: "1rem" }}>
                  <label htmlFor="previousCounselingDetails">
                    Tell us briefly about your previous counseling experience
                  </label>
                  <textarea
                    id="previousCounselingDetails"
                    name="previousCounselingDetails"
                    value={formData.previousCounselingDetails}
                    onChange={handleChange}
                  />
                </div>
              )}
            </section>
          </>
        );

      case 3:
        return (
          <section className="booking-section">
            <h2>
              <span>⚖️</span> Consent & Privacy
            </h2>
            <div className="checkbox-group">
              <div className="checkbox-item">
                <input
                  id="consentDataCollection"
                  type="checkbox"
                  name="consentDataCollection"
                  checked={formData.consentDataCollection}
                  onChange={handleChange}
                />
                <label htmlFor="consentDataCollection">
                  I consent to my data being collected and used solely for
                  counseling purposes, in accordance with the Kenya Data
                  Protection Act (2019).
                </label>
              </div>
              {validationErrors.consentDataCollection && (
                <p className="error-text">{validationErrors.consentDataCollection}</p>
              )}
              <div className="checkbox-item">
                <input
                  id="consentConfidentiality"
                  type="checkbox"
                  name="consentConfidentiality"
                  checked={formData.consentConfidentiality}
                  onChange={handleChange}
                />
                <label htmlFor="consentConfidentiality">
                  I understand that counseling is confidential, but
                  life-threatening situations may require disclosure.
                </label>
              </div>
              {validationErrors.consentConfidentiality && (
                <p className="error-text">
                  {validationErrors.consentConfidentiality}
                </p>
              )}
              <div className="checkbox-item">
                <input
                  id="consentReminders"
                  type="checkbox"
                  name="consentReminders"
                  checked={formData.consentReminders}
                  onChange={handleChange}
                />
                <label htmlFor="consentReminders">
                  I agree to receive appointment reminders via Telegram,
                  WhatsApp or SMS.
                </label>
              </div>
            </div>
          </section>
        );

      case 4:
        return (
          <section className="booking-section">
            <h2>
              <span>💳</span> Payment & Confirmation
            </h2>
            <div className="form-grid two-column">
              <div className="form-field">
                <label htmlFor="paymentMethod">Preferred payment method</label>
                <select
                  id="paymentMethod"
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleChange}
                >
                  {paymentMethods.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
                {validationErrors.paymentMethod && (
                  <p className="error-text">{validationErrors.paymentMethod}</p>
                )}
                <p className="helper-text">
                  <strong>Payment Details:</strong><br />
                  Paybill: {resolvedAccountDetails.paybillNumber}<br />
                  Account Number: {resolvedAccountDetails.accountNumber}
                </p>
              </div>
              {formData.paymentMethod === "mpesa" && (
                <div className="form-field">
                  <label htmlFor="mpesaPhoneNumber">
                    M-Pesa Phone Number <span>(required)</span>
                  </label>
                  <input
                    id="mpesaPhoneNumber"
                    name="mpesaPhoneNumber"
                    type="tel"
                    placeholder="254712345678"
                    value={formData.mpesaPhoneNumber}
                    onChange={handleChange}
                    required
                  />
                  <p className="helper-text">
                    <strong>M-Pesa Payment Details:</strong><br />
                    Paybill: {resolvedAccountDetails.paybillNumber}<br />
                    Account Number: {resolvedAccountDetails.accountNumber}<br />
                    Amount: KES {sessionAmount.toLocaleString()}
                  </p>
                  {validationErrors.mpesaPhoneNumber && (
                    <p className="error-text">{validationErrors.mpesaPhoneNumber}</p>
                  )}
                </div>
              )}
            </div>
            <div className="form-field" style={{ marginTop: "1rem" }}>
              <label htmlFor="transactionReference">
                Transaction / Confirmation Code {formData.paymentMethod === "bank" && <span>(required)</span>}
              </label>
              <input
                id="transactionReference"
                name="transactionReference"
                type="text"
                placeholder={
                  formData.paymentMethod === "bank"
                    ? "Bank transfer reference"
                    : "M-Pesa transaction code (if already paid)"
                }
                value={formData.transactionReference}
                onChange={handleChange}
                required={formData.paymentMethod === "bank"}
              />
              {validationErrors.transactionReference && (
                <p className="error-text">{validationErrors.transactionReference}</p>
              )}
              <p className="helper-text">
                Provide the payment confirmation code if you have already paid. For bank transfers this is required.
              </p>
            </div>

            <div className="checkbox-group" style={{ marginTop: "1.5rem" }}>
              <div className="checkbox-item">
                <input
                  id="paymentConfirmation"
                  type="checkbox"
                  name="paymentConfirmation"
                  checked={formData.paymentConfirmation}
                  onChange={handleChange}
                />
                <label htmlFor="paymentConfirmation">
                  I confirm that the payment information I have provided is
                  correct and acknowledge that payment may be required before the
                  session.
                </label>
              </div>
              {validationErrors.paymentConfirmation && (
                <p className="error-text">
                  {validationErrors.paymentConfirmation}
                </p>
              )}
            </div>
          </section>
        );

      case 5:
        return (
          <section className="booking-section">
            <h2>
              <span>✅</span> Review & Submit
            </h2>
            <div className="review-summary">
              <div className="review-item">
                <strong>Full Name:</strong> {formData.fullName || "Not provided"}
              </div>
              <div className="review-item">
                <strong>Email:</strong> {formData.email || "Not provided"}
              </div>
              <div className="review-item">
                <strong>Phone:</strong> {formData.phone || "Not provided"}
              </div>
              <div className="review-item">
                <strong>Counseling Type:</strong> {formData.counselingType || "Not provided"}
              </div>
              <div className="review-item">
                <strong>Preferred Date:</strong> {formData.preferredDate || "Not provided"}
              </div>
              <div className="review-item">
                <strong>Preferred Time:</strong> {formData.preferredTime || "Not provided"}
              </div>
              <div className="review-item">
                <strong>Session Amount:</strong> KES {sessionAmount.toLocaleString()}
              </div>
              <div className="review-item">
                <strong>Payment Method:</strong> {paymentMethods.find(m => m.value === formData.paymentMethod)?.label || "Not selected"}
              </div>
            </div>
            <p style={{ marginTop: "1rem", color: "#64748b", fontSize: "0.9rem" }}>
              Please review all information carefully. Click "Submit Booking Request" to finalize your booking.
            </p>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div className="booking-page">
      <div className="booking-card">
        <header className="booking-header">
          <h1>Book a Counseling Session</h1>
          <p>
            Please complete the intake form below. All information is handled
            confidentially in line with KECA ethical standards and Kenya's Data
            Protection Act (2019).
          </p>
        </header>

        {/* Progress Bar */}
        <div className="wizard-progress">
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <div className="progress-steps">
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                className={`progress-step ${currentStep >= step ? "active" : ""} ${currentStep === step ? "current" : ""}`}
              >
                <div className="step-number">{step}</div>
                <div className="step-label">
                  {step === 1 && "Personal"}
                  {step === 2 && "Appointment"}
                  {step === 3 && "Consent"}
                  {step === 4 && "Payment"}
                  {step === 5 && "Review"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {submitState.status === "error" && (
          <div className="error-banner">
            <strong>We ran into an issue.</strong>
            <p>{submitState.message}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {renderStepContent()}

          {/* Navigation Buttons */}
          <div className="wizard-navigation">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrevious}
                className="btn-secondary"
              >
                ← Previous
              </button>
            )}
            <div style={{ flex: 1 }}></div>
            {currentStep < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                className="btn-primary"
              >
                Next →
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitState.status === "submitting"}
                className="btn-primary"
              >
                {submitState.status === "submitting"
                  ? "Submitting booking..."
                  : "Submit booking request"}
              </button>
            )}
          </div>

          <div className="booking-support-text">
            <p>
              Need help? Email{" "}
              <a href="mailto:support@nextstepmentorship.com">
                support@nextstepmentorship.com
              </a>{" "}
              or call +254 712 345 678.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingForm;
