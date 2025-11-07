import React, { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";

const Signup = () => {
  const [currentStep, setCurrentStep] = useState(() => {
    // Get saved step from localStorage or URL parameter or default to 1
    const savedStep = localStorage.getItem('signupStep');
    const emailVerified = new URLSearchParams(window.location.search).get('verified') === 'true';
    const stepParam = new URLSearchParams(window.location.search).get('step');
    
    // Priority: URL step param > saved step > email verified logic > default
    if (stepParam && parseInt(stepParam) >= 2) {
      return parseInt(stepParam); // Use URL step parameter
    } else if (emailVerified && savedStep === '2') {
      return 2; // User just verified email, stay on step 2
    } else if (savedStep && parseInt(savedStep) > 1) {
      return parseInt(savedStep); // Restore saved step
    }
    return 1; // Default to step 1
  });
  
  const [searchParams] = useSearchParams();
  const emailVerified = searchParams.get('verified') === 'true';
  
  const [basicInfo, setBasicInfo] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  
  const [signupForm, setSignupForm] = useState({
    gender: "",
    dateOfBirth: "",
    religion: "",
    phone: "",
    country: "",
    physicalAddress: "",
    cityOrTown: "",
    emergencyContactPhone: "",
    therapistId: "",
    specialization: "",
    experience: "",
    educationBackground: "",
    additionalCertifications: "",
    targetConditions: "",
        therapeuticApproach: "",
        nationalIdNumber: ""
  });
  
  const [documents, setDocuments] = useState({
    license: null,
    nationalId: null
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailVerified, setShowEmailVerified] = useState(true);
  const [savedData, setSavedData] = useState(null); // State for saved data
  const navigate = useNavigate();

  // Function to fetch saved data from database for review
  const fetchSavedData = async () => {
    try {
      const email = localStorage.getItem('userEmailForVerification');
      if (!email) return;

      const response = await fetch(`http://localhost:5000/api/auth/get-user-by-email?email=${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Fetched saved data for review:', data);
        return data.user;
      }
    } catch (error) {
      console.error('❌ Error fetching saved data:', error);
    }
    return null;
  };

  // Fetch saved data when on step 4
  useEffect(() => {
    if (currentStep === 4) {
      fetchSavedData().then(data => setSavedData(data));
    }
  }, [currentStep]);

  // Auto-hide email verified message
  useEffect(() => {
    if (emailVerified) {
      const timer = setTimeout(() => {
        setShowEmailVerified(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [emailVerified]);

  // Set step based on email verification (but don't override URL step parameter)
  useEffect(() => {
    if (emailVerified) {
      const stepParam = new URLSearchParams(window.location.search).get('step');
      // Only set to step 2 if no step parameter is provided
      if (!stepParam) {
        setCurrentStep(2); 
        localStorage.setItem('signupStep', '2');
      }
      fetchUserData();
    }
  }, [emailVerified]);

  // Save current step to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('signupStep', currentStep.toString());
  }, [currentStep]);

  // Load saved personal and professional info if user is on step 2 or 3
  useEffect(() => {
    if (currentStep >= 2) {
      loadSavedPersonalInfo();
      loadDocumentsInfo(); // Also load documents when on step 3
    }
  }, [currentStep]);

  // Load previously saved personal info from localStorage and database
  const loadSavedPersonalInfo = async () => {
    try {
      // First try to load from localStorage
      const savedPersonalInfo = localStorage.getItem('savedPersonalInfo');
      if (savedPersonalInfo) {
        const parsedInfo = JSON.parse(savedPersonalInfo);
        setSignupForm(prev => ({ ...prev, ...parsedInfo }));
        console.log('✅ Loaded saved personal info from localStorage:', parsedInfo);
      }
      
      // Then try to load from database
      const email = localStorage.getItem('userEmailForVerification');
      if (email) {
        console.log('🔍 Fetching personal AND professional info from database for email:', email);
        
        const response = await fetch(`http://localhost:5000/api/auth/get-user-by-email?email=${encodeURIComponent(email)}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            console.log('📊 Fetched personal AND professional info from database:', data.user);
            
            // Map database fields to form fields
            const dbData = {
              // Personal Information
              gender: data.user.gender,
              dateOfBirth: data.user.date_of_birth ? new Date(data.user.date_of_birth).toISOString().split('T')[0] : '',
              religion: data.user.religion,
              phone: data.user.phone,
              country: data.user.country,
              physicalAddress: data.user.physical_address,
              cityOrTown: data.user.city_or_town,
              emergencyContactPhone: data.user.emergency_contact_phone,
              
              // Professional Information
              therapistId: data.user.therapist_id,
              specialization: data.user.specialization,
              experience: data.user.experience,
              educationBackground: data.user.education_background,
              additionalCertifications: data.user.additional_certifications,
              targetConditions: data.user.target_conditions,
              therapeuticApproach: data.user.therapeutic_approach,
              nationalIdNumber: data.user.national_id_number
            };
            
            // Update form with database data (overwrite localStorage data)
            setSignupForm(prev => ({ ...prev, ...dbData }));
            console.log('✅ Updated form with database personal AND professional info:', dbData);
          }
        } else {
          console.log('❌ Failed to fetch personal info from database');
        }
      }
    } catch (error) {
      console.error('❌ Error loading saved personal info:', error);
    }
  };

  // Load documents information from database
  const loadDocumentsInfo = async () => {
    try {
      const email = localStorage.getItem('userEmailForVerification');
      if (!email) return;

      console.log('📁 Fetching documents from database for email:', email);
      
      const response = await fetch(`http://localhost:5000/api/auth/get-documents-by-email?email=${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📁 Documents found:', data);
        
        if (data.documents && data.documents.length > 0) {
          // Group documents by type
          const documentGroups = {
            education: data.documents.filter(doc => doc.document_type === 'education'),
            professional: data.documents.filter(doc => doc.document_type === 'professional'),
            national_id: data.documents.filter(doc => doc.document_type === 'national_id')
          };
          
          console.log('📁 Document groups:', documentGroups);
          
          // Create display strings for each document type
          const documentsDisplay = {
            educationDocs: documentGroups.education.length > 0 
              ? `(${documentGroups.education.length} files: ${documentGroups.education.map(doc => doc.original_filename).join(', ')})` 
              : null,
            professionalDocs: documentGroups.professional.length > 0 
              ? `(${documentGroups.professional.length} files: ${documentGroups.professional.map(doc => doc.original_filename).join(', ')})` 
              : null,
            nationalId: documentGroups.national_id.length > 0 
              ? `(${documentGroups.national_id.length} files: ${documentGroups.national_id.map(doc => doc.original_filename).join(', ')})` 
              : null
          };
          
          setDocuments(documentsDisplay);
          console.log('✅ Updated documents display:', documentsDisplay);
        } else {
          console.log('📁 No documents found in database');
        }
      } else {
        console.log('❌ Failed to fetch documents');
      }
    } catch (error) {
      console.error('❌ Error loading documents info:', error);
    }
  };

  // Fetch user data function
  const fetchUserData = async () => {
    try {
      localStorage.removeItem('userFirstName');
      localStorage.removeItem('basicFirstName');
      
      const email = localStorage.getItem('userEmailForVerification');
      if (!email) {
        console.log('❌ No email found in localStorage');
        return;
      }

      const response = await fetch(`http://localhost:5000/api/auth/get-user-by-email?email=${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user && data.user.name) {
          const firstName = data.user.name.split(' ')[0];
          localStorage.setItem('userFirstName', firstName);
          localStorage.setItem('basicFirstName', firstName);
          console.log('✅ Stored firstName from database:', firstName);
          setSignupForm(prev => ({ ...prev }));
        }
      }
    } catch (error) {
      console.error('❌ Error fetching user data:', error);
    }
  };

  const getCountryCode = (countryCode) => {
    const countryCodes = {
      'KE': '+254', 'Kenya': '+254',
      'US': '+1', 'USA': '+1', 'United States': '+1',
      'NG': '+234', 'Nigeria': '+234',
      'GB': '+44', 'UK': '+44', 'United Kingdom': '+44',
      'CA': '+1', 'Canada': '+1',
      'AU': '+61', 'Australia': '+61',
      'ZA': '+27', 'South Africa': '+27',
      'EG': '+20', 'Egypt': '+20',
      'GH': '+233', 'Ghana': '+233',
      'UG': '+256', 'Uganda': '+256',
      'TZ': '+255', 'Tanzania': '+255',
      'ET': '+251', 'Ethiopia': '+251',
      'RW': '+250', 'Rwanda': '+250',
      'IN': '+91', 'India': '+91',
      'CN': '+86', 'China': '+86',
      'JP': '+81', 'Japan': '+81',
      'KR': '+82', 'South Korea': '+82',
      'BR': '+55', 'Brazil': '+55',
      'MX': '+52', 'Mexico': '+52',
      'AR': '+54', 'Argentina': '+54',
      'FR': '+33', 'France': '+33',
      'DE': '+49', 'Germany': '+49',
      'IT': '+39', 'Italy': '+39',
      'ES': '+34', 'Spain': '+34',
      'RU': '+7', 'Russia': '+7',
      'TR': '+90', 'Turkey': '+90',
      'SA': '+966', 'Saudi Arabia': '+966',
      'AE': '+971', 'United Arab Emirates': '+971',
      'IL': '+972', 'Israel': '+972',
      'TH': '+66', 'Thailand': '+66',
      'VN': '+84', 'Vietnam': '+84',
      'PH': '+63', 'Philippines': '+63',
      'ID': '+62', 'Indonesia': '+62',
      'MY': '+60', 'Malaysia': '+60',
      'SG': '+65', 'Singapore': '+65'
    };
    return countryCodes[countryCode] || countryCodes[countryCode?.toUpperCase()] || '+1';
  };

  const handleBasicSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch('http://localhost:5000/api/auth/basic-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: basicInfo.firstName,
          lastName: basicInfo.lastName,
          email: basicInfo.email,
          password: basicInfo.password
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('userFirstName', basicInfo.firstName);
        localStorage.setItem('basicFirstName', basicInfo.firstName);
        localStorage.setItem('userEmailForVerification', basicInfo.email);
        
        setBasicInfo({ firstName: "", lastName: "", email: "", password: "", confirmPassword: "" });
        alert(`✅ Welcome to NextStep!\n\nWe've sent a confirmation email to ${basicInfo.email}. Please check your inbox and click the confirmation link to activate your account.\n\nYou MUST verify your email before you can complete your therapist registration.`);
        navigate('/login');
      } else {
        alert(`❌ ${data.error || 'Oops! Something went wrong. Please try again.'}`);
      }
    } catch (error) {
      console.error('Signup error:', error);
      alert('❌ Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePersonalInfoSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const token = localStorage.getItem('token');
    const email = localStorage.getItem('userEmailForVerification');
    
    let finalEmail = email;
    if (!finalEmail) {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          finalEmail = JSON.parse(userData).email;
        } catch (e) {
          console.log('🔍 Error parsing user data:', e);
        }
      }
    }

    if (!finalEmail && !token) {
      alert('❌ Please complete email verification first before proceeding with personal information.');
      setIsLoading(false);
      navigate('/login');
      return;
    }

    const signupData = { ...signupForm, email: finalEmail };

    // Save to localStorage first as backup
    localStorage.setItem('savedPersonalInfo', JSON.stringify(signupForm));

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('http://localhost:5000/api/auth/personal-info', {
        method: 'POST',
        headers,
        body: JSON.stringify(signupData)
      });

      if (response.ok) {
        // Get the saved data from backend response
        const savedData = await response.json();
        console.log('✅ Personal info saved to database:', savedData);
        
        alert('✅ Personal information saved successfully!\n\nMoving to Professional Details & Documents.');
        setCurrentStep(3);
        localStorage.setItem('signupStep', '3');
        localStorage.setItem('personalInfoSaved', 'true');
      } else {
        const data = await response.json();
        console.error('❌ Backend error:', data);
        alert(`❌ Failed to save personal information: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Personal info error:', error);
      alert('❌ Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfessionalInfoSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Validate required fields
    const requiredFields = ['therapistId', 'specialization', 'experience', 'educationBackground', 'targetConditions', 'therapeuticApproach', 'nationalIdNumber'];
    const missingFields = requiredFields.filter(field => !signupForm[field] || signupForm[field].trim() === '');
    
    if (missingFields.length > 0) {
      alert(`❌ Please fill in all required fields:\n${missingFields.join(', ')}`);
      setIsLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const email = localStorage.getItem('userEmailForVerification');
      const userData = localStorage.getItem('user');
      
      let finalEmail = email;
      if (!finalEmail && userData) {
        try {
          finalEmail = JSON.parse(userData).email;
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      }

      // Create FormData for file uploads
      const formData = new FormData();
      
      // Add all form fields
      console.log('🔍 Form values being sent:', {
        email: finalEmail,
        therapistId: signupForm.therapistId,
        specialization: signupForm.specialization,
        experience: signupForm.experience,
        educationBackground: signupForm.educationBackground,
        additionalCertifications: signupForm.additionalCertifications,
        targetConditions: signupForm.targetConditions,
        therapeuticApproach: signupForm.therapeuticApproach,
        nationalIdNumber: signupForm.nationalIdNumber
      });
      
      formData.append('email', finalEmail);
      formData.append('therapistId', signupForm.therapistId);
      formData.append('specialization', signupForm.specialization);
      formData.append('experience', signupForm.experience);
      formData.append('educationBackground', signupForm.educationBackground);
      formData.append('additionalCertifications', signupForm.additionalCertifications);
      formData.append('targetConditions', signupForm.targetConditions);
      formData.append('therapeuticApproach', signupForm.therapeuticApproach);
      formData.append('nationalIdNumber', signupForm.nationalIdNumber);

      // Add files if they exist
      console.log('📁 Documents state:', documents);
      
      if (documents.educationDocs) {
        // Handle multiple files for education docs
        const educationFiles = Array.from(documents.educationDocs);
        console.log('📚 Adding education files:', educationFiles.length);
        educationFiles.forEach((file, index) => {
          formData.append(`educationDocs_${index}`, file);
        });
      }
      
      if (documents.professionalDocs) {
        // Handle multiple files for professional docs
        const professionalFiles = Array.from(documents.professionalDocs);
        console.log('💼 Adding professional files:', professionalFiles.length);
        professionalFiles.forEach((file, index) => {
          formData.append(`professionalDocs_${index}`, file);
        });
      }

      if (documents.nationalId) {
        // Handle national ID file
        const nationalIdFiles = Array.from(documents.nationalId);
        console.log('🆔 Adding national ID files:', nationalIdFiles.length);
        nationalIdFiles.forEach((file, index) => {
          formData.append(`nationalId_${index}`, file);
        });
      }

      console.log('📤 FormData entries:', Array.from(formData.entries()));

      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('http://localhost:5000/api/auth/professional-info', {
        method: 'POST',
        headers,
        body: formData
      });

      if (response.ok) {
        alert('✅ Professional qualifications saved successfully!\n\nMoving to review page.');
        
        // Move to Step 4 (Review) instead of clearing localStorage
        setCurrentStep(4);
        localStorage.setItem('signupStep', '4');
        localStorage.setItem('professionalInfoSaved', 'true');
      } else {
        const data = await response.json();
        alert(`❌ Failed to save professional qualifications: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Professional info error:', error);
      alert('❌ Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (field, files) => {
    // Handle both single files and FileList
    if (files && files.length > 0) {
      setDocuments(prev => ({ ...prev, [field]: files }));
      console.log(`📁 Files uploaded for ${field}:`, files.length, 'files');
      
      // Show success message
      const fileNames = Array.from(files).map(f => f.name).join(', ');
      alert(`✅ ${files.length} file(s) selected: ${fileNames}`);
    }
  };

  // Helper function to display uploaded files
  const renderUploadedFiles = (field) => {
    const fileInfo = documents[field];
    if (!fileInfo) return null;
    
    return (
      <div style={{ marginTop: "8px" }}>
        <p style={{ fontSize: "12px", color: "#059669", fontWeight: "500", margin: "0 0 4px 0" }}>
          📁 Uploaded files:
        </p>
        <div style={{
          fontSize: "11px",
          color: "#374151",
          padding: "8px 12px",
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: "6px",
          marginBottom: "2px",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          
          📁
          <span style={{ fontWeight: "500" }}>{fileInfo}</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      fontFamily: "'Inter', sans-serif",
      boxSizing: "border-box"
    }}>
      {/* Branding */}
      <div style={{ textAlign: "center", marginBottom: "30px" }}>
        <div style={{
          width: "60px",
          height: "60px",
          background: "rgba(255,255,255,0.2)",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 10px auto"
        }}>
          <span role="img" aria-label="rocket" style={{ fontSize: "30px" }}>🚀</span>
        </div>
        <h1 style={{ color: "white", fontSize: "28px", fontWeight: "700", margin: "0 0 5px 0" }}>
          NextStep Mentorship
        </h1>
        <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "15px", margin: 0 }}>
          Join our network of mental health professionals
        </p>
      </div>

      {/* Signup Card */}
      <div style={{
        width: "100%",
        maxWidth: "600px",
        background: "rgba(255,255,255,0.98)",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        marginBottom: "auto"
      }}>
        <div style={{ padding: "24px" }}>
          {currentStep === 1 ? (
            <div>
              <h2 style={{
                fontSize: "20px",
                fontWeight: "600",
                margin: "0 0 20px 0",
                color: "#2c3e50",
                textAlign: "center"
              }}>
                Create Your Account
              </h2>

              <form onSubmit={handleBasicSignup}>
                <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                  <input
                    type="text"
                    placeholder="First Name"
                    value={basicInfo.firstName}
                    onChange={(e) => setBasicInfo({...basicInfo, firstName: e.target.value})}
                    required
                    style={{ flex: 1, padding: "14px", border: "2px solid #e9ecef", borderRadius: "8px", fontSize: "14px", background: "white" }}
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={basicInfo.lastName}
                    onChange={(e) => setBasicInfo({...basicInfo, lastName: e.target.value})}
                    required
                    style={{ flex: 1, padding: "14px", border: "2px solid #e9ecef", borderRadius: "8px", fontSize: "14px", background: "white" }}
                  />
                </div>
                
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={basicInfo.email}
                  onChange={(e) => setBasicInfo({...basicInfo, email: e.target.value})}
                  required
                  style={{ width: "100%", padding: "14px", border: "2px solid #e9ecef", borderRadius: "8px", fontSize: "14px", marginBottom: "12px", boxSizing: "border-box", background: "white" }}
                />

                <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                  <input
                    type="password"
                    placeholder="Password"
                    value={basicInfo.password}
                    onChange={(e) => setBasicInfo({...basicInfo, password: e.target.value})}
                    required
                    style={{ flex: 1, padding: "14px", border: "2px solid #e9ecef", borderRadius: "8px", fontSize: "14px", background: "white" }}
                  />
                  <input
                    type="password"
                    placeholder="Confirm password"
                    value={basicInfo.confirmPassword}
                    onChange={(e) => setBasicInfo({...basicInfo, confirmPassword: e.target.value})}
                    required
                    style={{ flex: 1, padding: "14px", border: "2px solid #e9ecef", borderRadius: "8px", fontSize: "14px", background: "white" }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    width: "100%",
                    padding: "14px",
                    background: isLoading ? "#ccc" : "linear-gradient(45deg, #667eea, #764ba2)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: isLoading ? "not-allowed" : "pointer",
                    transition: "all 0.2s ease",
                    marginBottom: "12px"
                  }}
                >
                  {isLoading ? "Creating Account..." : "Create Account"}
                </button>
                
                <p style={{
                  textAlign: "center",
                  fontSize: "12px",
                  color: "#666",
                  margin: "12px 0 0 0"
                }}>
                  Already have an account? <Link to="/login" style={{ color: "#667eea", textDecoration: "none" }}> Sign in</Link>
                </p>
              </form>
            </div>
          ) : currentStep === 2 ? (
            <div>
              <h1 style={{
                fontSize: "24px",
                fontWeight: "700",
                margin: "0 0 8px 0",
                color: "#2c3e50"
              }}>
                Therapist Onboarding
              </h1>
              <p style={{
                fontSize: "16px",
                margin: "0 0 20px 0",
                color: "#666"
              }}>
                Welcome, {localStorage.getItem('userFirstName') || 'there'}! Join our platform and start helping others on their journey to better mental health.
              </p>
              
              {/* Progress Steps */}
              <div style={{
                background: "#f8f9fa",
                padding: "16px",
                borderRadius: "12px",
                marginBottom: "20px"
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                  position: "relative"
                }}>
                  <div style={{
                    position: "absolute",
                    top: "12px",
                    left: "12px",
                    right: "12px",
                    height: "2px",
                    background: "#e9ecef",
                    zIndex: 1
                  }}></div>
                  
                  <div style={{
                    position: "absolute",
                    top: "12px",
                    left: "12px",
                    width: "33%",
                    height: "2px",
                    background: "linear-gradient(45deg, #667eea, #764ba2)",
                    zIndex: 2
                  }}></div>
                  
                  <div style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: "linear-gradient(45deg, #667eea, #764ba2)",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: "600",
                    zIndex: 3
                  }}>
                    1
                  </div>
                  <div style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: "#e9ecef",
                    color: "#666",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: "600",
                    zIndex: 3
                  }}>
                    2
                  </div>
                  <div style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: "#e9ecef",
                    color: "#666",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: "600",
                    zIndex: 3
                  }}>
                    3
                  </div>
                </div>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "10px",
                  color: "#666",
                  textAlign: "center"
                }}>
                  <span style={{ width: "auto" }}>Personal Information</span>
                  <span style={{ width: "auto" }}>Professional Details & Documents</span>
                  <span style={{ width: "auto" }}>Review</span>
                </div>
              </div>

              <h2 style={{
                fontSize: "18px",
                fontWeight: "600",
                margin: "0 0 8px 0",
                color: "#667eea"
              }}>
                Personal Information
              </h2>
              
              <p style={{
                fontSize: "14px",
                color: "#666",
                margin: "0 0 16px 0"
              }}>
                Please provide your basic contact details so we can reach you.
              </p>

              <form onSubmit={handlePersonalInfoSignup}>
                {showEmailVerified && (
                  <p style={{
                    fontSize: "14px",
                    color: "#27ae60",
                    textAlign: "center",
                    padding: "8px",
                    borderRadius: "4px",
                    fontWeight: "500",
                    margin: "0 0 20px 0"
                  }}>
                    ✅ Email verified successfully
                  </p>
                )}

                {/* Contact Details Section */}
                <div style={{
                  background: "#f5f5dc",
                  padding: "16px",
                  borderRadius: "12px",
                  marginBottom: "20px"
                }}>
                  <h3 style={{
                    fontSize: "16px",
                    fontWeight: "600",
                    margin: "0 0 12px 0",
                    color: "#667eea"
                  }}>
                    Contact Details
                  </h3>
                  
                  <select
                    value={signupForm.country}
                    onChange={(e) => setSignupForm({...signupForm, country: e.target.value})}
                    required
                    style={{ 
                      width: "100%", 
                      padding: "14px", 
                      border: "2px solid #edeff4", 
                      borderRadius: "8px", 
                      fontSize: "14px", 
                      marginBottom: "12px", 
                      boxSizing: "border-box", 
                      background: "white",
                      appearance: "none",
                      backgroundImage: "url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"%3e%3cpolyline points=\"6,9 12,15 18,9\"%3e%3c/polyline%3e%3c/svg%3e')",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 12px center",
                      backgroundSize: "16px"
                    }}
                  >
                    <option value="">Select your country *</option>
                    {/* North America */}
                    <option value="US">🇺🇸 United States (+1)</option>
                    <option value="CA">🇨🇦 Canada (+1)</option>
                    <option value="MX">🇲🇽 Mexico (+52)</option>
                    
                    {/* Africa */}
                    <option value="KE">🇰🇪 Kenya (+254)</option>
                    <option value="NG">🇳🇬 Nigeria (+234)</option>
                    <option value="EG">🇪🇬 Egypt (+20)</option>
                    <option value="ZA">🇿🇦 South Africa (+27)</option>
                    <option value="GH">🇬🇭 Ghana (+233)</option>
                    <option value="UG">🇺🇬 Uganda (+256)</option>
                    <option value="TZ">🇹🇿 Tanzania (+255)</option>
                    <option value="ET">🇪🇹 Ethiopia (+251)</option>
                    <option value="MA">🇲🇦 Morocco (+212)</option>
                    <option value="TN">🇹🇳 Tunisia (+216)</option>
                    <option value="DZ">🇩🇿 Algeria (+213)</option>
                    <option value="ZM">🇿🇲 Zambia (+260)</option>
                    <option value="ZW">🇿🇼 Zimbabwe (+263)</option>
                    <option value="BW">🇧🇼 Botswana (+267)</option>
                    <option value="NA">🇳🇦 Namibia (+264)</option>
                    <option value="RW">🇷🇼 Rwanda (+250)</option>
                    <option value="BI">🇧🇮 Burundi (+257)</option>
                    <option value="MG">🇲🇬 Madagascar (+261)</option>
                    <option value="MU">🇲🇺 Mauritius (+230)</option>
                    <option value="SC">🇸🇨 Seychelles (+248)</option>
                    
                    {/* Europe */}
                    <option value="GB">🇬🇧 United Kingdom (+44)</option>
                    <option value="DE">🇩🇪 Germany (+49)</option>
                    <option value="FR">🇫🇷 France (+33)</option>
                    <option value="IT">🇮🇹 Italy (+39)</option>
                    <option value="ES">🇪🇸 Spain (+34)</option>
                    <option value="NL">🇳🇱 Netherlands (+31)</option>
                    <option value="BE">🇧🇪 Belgium (+32)</option>
                    <option value="CH">🇨 🇮🇹 Switzerland (+41)</option>
                    <option value="AT">🇦🇹 Austria (+43)</option>
                    <option value="SE">🇸🇪 Sweden (+46)</option>
                    <option value="NO">🇳🇴 Norway (+47)</option>
                    <option value="DK">🇩🇰 Denmark (+45)</option>
                    <option value="FI">🇫🇮 Finland (+358)</option>
                    <option value="PL">🇵🇱 Poland (+48)</option>
                    <option value="RU">🇷🇺 Russia (+7)</option>
                    <option value="GR">🇬🇷 Greece (+30)</option>
                    <option value="PT">🇵🇹 Portugal (+351)</option>
                    
                    {/* Asia */}
                    <option value="CN">🇨🇳 China (+86)</option>
                    <option value="JP">🇯🇵 Japan (+81)</option>
                    <option value="KR">🇰🇷 South Korea (+82)</option>
                    <option value="IN">🇮🇳 India (+91)</option>
                    <option value="TH">🇹🇭 Thailand (+66)</option>
                    <option value="VN">🇻🇳 Vietnam (+84)</option>
                    <option value="MY">🇲🇾 Malaysia (+60)</option>
                    <option value="SG">🇸🇬 Singapore (+65)</option>
                    <option value="ID">🇮🇩 Indonesia (+62)</option>
                    <option value="PH">🇵🇭 Philippines (+63)</option>
                    <option value="BD">🇧🇩 Bangladesh (+880)</option>
                    <option value="PK">🇵🇰 Pakistan (+92)</option>
                    <option value="LK">🇱🇰 Sri Lanka (+94)</option>
                    <option value="MM">🇲🇲 Myanmar (+95)</option>
                    <option value="KH">🇰🇭 Cambodia (+855)</option>
                    <option value="LA">🇱🇦 Laos (+856)</option>
                    
                    {/* Middle East */}
                    <option value="SA">🇸🇦 Saudi Arabia (+966)</option>
                    <option value="AE">🇦🇪 UAE (+971)</option>
                    <option value="QA">🇶🇦 Qatar (+974)</option>
                    <option value="KW">🇰🇼 Kuwait (+965)</option>
                    <option value="BH">🇧🇭 Bahrain (+973)</option>
                    <option value="OM">🇴🇲 Oman (+968)</option>
                    <option value="IR">🇮🇷 Iran (+98)</option>
                    <option value="IQ">🇮🇶 Iraq (+964)</option>
                    <option value="JO">🇯🇴 Jordan (+962)</option>
                    <option value="LB">🇱🇧 Lebanon (+961)</option>
                    <option value="SY">🇸🇾 Syria (+963)</option>
                    <option value="IL">🇮🇱 Israel (+972)</option>
                    
                    {/* Oceania */}
                    <option value="AU">🇦🇺 Australia (+61)</option>
                    <option value="NZ">🇳🇿 New Zealand (+64)</option>
                    <option value="FJ">🇫🇯 Fiji (+679)</option>
                    <option value="PG">🇵🇬 Papua New Guinea (+675)</option>
                    
                    {/* South America */}
                    <option value="BR">🇧🇷 Brazil (+55)</option>
                    <option value="AR">🇦🇷 Argentina (+54)</option>
                    <option value="CL">🇨🇱 Chile (+56)</option>
                    <option value="CO">🇨🇴 Colombia (+57)</option>
                    <option value="PE">🇵🇪 Peru (+51)</option>
                    <option value="VE">🇻🇪 Venezuela (+58)</option>
                    <option value="EC">🇪🇨 Ecuador (+593)</option>
                    <option value="UY">🇺🇾 Uruguay (+598)</option>
                    <option value="PY">🇵🇾 Paraguay (+595)</option>
                    <option value="BO">🇧🇴 Bolivia (+591)</option>
                    <option value="GY">🇬🇾 Guyana (+592)</option>
                    <option value="SR">🇸🇷 Suriname (+597)</option>
                  </select>

                  {/* Phone Number with Country Code */}
                  <div style={{ marginBottom: "12px" }}>
                    <input
                      type="text"
                      value={getCountryCode(signupForm.country)}
                      readOnly
                      style={{
                        padding: "14px",
                        border: "2px solid #edeff4",
                        borderRadius: "8px 0 0 8px",
                        fontSize: "14px",
                        background: "#f8f9fa",
                        width: "80px",
                        textAlign: "center",
                        fontWeight: "500",
                        display: "inline-block",
                        verticalAlign: "top"
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Enter phone number"
                      value={signupForm.phone}
                      onChange={(e) => setSignupForm({...signupForm, phone: e.target.value})}
                      required
                      style={{ 
                        width: "calc(100% - 88px)", 
                        padding: "14px", 
                        border: "2px solid #edeff4", 
                        borderRadius: "0 8px 8px 0", 
                        fontSize: "14px", 
                        background: "white",
                        display: "inline-block",
                        verticalAlign: "top",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>

                  {/* Emergency Contact with Country Code */}
                  <div style={{ marginBottom: "12px" }}>
                    <input
                      type="text"
                      value={getCountryCode(signupForm.country)}
                      readOnly
                      style={{
                        padding: "14px",
                        border: "2px solid #edeff4",
                        borderRadius: "8px 0 0 8px",
                        fontSize: "14px",
                        background: "#f8f9fa",
                        width: "80px",
                        textAlign: "center",
                        fontWeight: "500",
                        display: "inline-block",
                        verticalAlign: "top"
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Enter emergency contact"
                      value={signupForm.emergencyContactPhone}
                      onChange={(e) => setSignupForm({...signupForm, emergencyContactPhone: e.target.value})}
                      required
                      style={{ 
                        width: "calc(100% - 88px)", 
                        padding: "14px", 
                        border: "2px solid #edeff4", 
                        borderRadius: "0 8px 8px 0", 
                        fontSize: "14px", 
                        background: "white",
                        display: "inline-block",
                        verticalAlign: "top",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>

                  <p style={{
                    fontSize: "12px",
                    color: "#828282",
                    margin: "0 0 12px 0",
                    lineHeight: "1.4"
                  }}>
                    Enter numbers without country code. Your phone number will be used for important communications, and the emergency contact only in case of emergency.
                  </p>
                </div>

                {/* Personal Details Section */}
                <div style={{
                  background: "#e8f5e8",
                  padding: "16px",
                  borderRadius: "12px",
                  marginBottom: "20px"
                }}>
                  <h3 style={{
                    fontSize: "16px",
                    fontWeight: "600",
                    margin: "0 0 12px 0",
                    color: "#667eea"
                  }}>
                    Personal Details
                  </h3>

                  <select
                    value={signupForm.gender}
                    onChange={(e) => setSignupForm({...signupForm, gender: e.target.value})}
                    required
                    style={{ 
                      width: "100%", 
                      padding: "14px", 
                      border: "2px solid #edeff4", 
                      borderRadius: "8px", 
                      fontSize: "14px", 
                      marginBottom: "12px", 
                      boxSizing: "border-box", 
                      background: "white",
                      appearance: "none"
                    }}
                  >
                    <option value="">Select gender *</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="non-binary">Non-binary</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>

                  <input
                    type="date"
                    value={signupForm.dateOfBirth}
                    onChange={(e) => setSignupForm({...signupForm, dateOfBirth: e.target.value})}
                    required
                    style={{ 
                      width: "100%", 
                      padding: "14px", 
                      border: "2px solid #edeff4", 
                      borderRadius: "8px", 
                      fontSize: "14px", 
                      marginBottom: "12px", 
                      boxSizing: "border-box", 
                      background: "white" 
                    }}
                  />

                  <select
                    value={signupForm.religion}
                    onChange={(e) => setSignupForm({...signupForm, religion: e.target.value})}
                    required
                    style={{ 
                      width: "100%", 
                      padding: "14px", 
                      border: "2px solid #edeff4", 
                      borderRadius: "8px", 
                      fontSize: "14px", 
                      marginBottom: "12px", 
                      boxSizing: "border-box", 
                      background: "white",
                      appearance: "none"
                    }}
                  >
                    <option value="">Select religion *</option>
                    <option value="christianity">Christianity</option>
                    <option value="islam">Islam</option>
                    <option value="hinduism">Hinduism</option>
                    <option value="buddhism">Buddhism</option>
                    <option value="judaism">Judaism</option>
                    <option value="atheist">Atheist</option>
                    <option value="agnostic">Agnostic</option>
                    <option value="other">Other</option>
                    <option value="none">Prefer not to say</option>
                  </select>
                </div>

                {/* Location Information Section */}
                <div style={{
                  background: "#f0f8ff",
                  padding: "16px",
                  borderRadius: "12px",
                  marginBottom: "20px"
                }}>
                  <h3 style={{
                    fontSize: "16px",
                    fontWeight: "600",
                    margin: "0 0 12px 0",
                    color: "#667eea"
                  }}>
                    Location Information
                  </h3>

                  <input
                    type="text"
                    placeholder="Physical address"
                    value={signupForm.physicalAddress}
                    onChange={(e) => setSignupForm({...signupForm, physicalAddress: e.target.value})}
                    required
                    style={{ 
                      width: "100%", 
                      padding: "14px", 
                      border: "2px solid #edeff4", 
                      borderRadius: "8px", 
                      fontSize: "14px", 
                      marginBottom: "12px", 
                      boxSizing: "border-box", 
                      background: "white" 
                    }}
                  />

                  <input
                    type="text"
                    placeholder="City or town"
                    value={signupForm.cityOrTown}
                    onChange={(e) => setSignupForm({...signupForm, cityOrTown: e.target.value})}
                    required
                    style={{ 
                      width: "100%", 
                      padding: "14px", 
                      border: "2px solid #edeff4", 
                      borderRadius: "8px", 
                      fontSize: "14px", 
                      boxSizing: "border-box", 
                      background: "white" 
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    width: "100%",
                    padding: "16px",
                    background: isLoading ? "#ccc" : "#667eea",
                    color: "white",
                    border: "none",
                    borderRadius: "12px",
                    fontSize: "16px",
                    fontWeight: "600",
                    cursor: isLoading ? "not-allowed" : "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
                  }}
                >
                  {isLoading ? "Continuing..." : "Continue"}
                  {!isLoading && <span>→</span>}
                </button>
                
                <p style={{
                  textAlign: "center",
                  fontSize: "12px",
                  color: "#666",
                  margin: "16px 0 0 0"
                }}>
                  Already have an account? <Link to="/login" style={{ color: "#667eea", textDecoration: "none" }}> Sign in</Link>
                </p>
              </form>
            </div>
          ) : currentStep === 3 ? (
            <div>
              {/* Progress Steps for Step 3 */}
              <div style={{
                background: "#f8f9fa",
                padding: "16px",
                borderRadius: "12px",
                marginBottom: "20px"
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                  position: "relative"
                }}>
                      {/* Progress line background */}
                      <div style={{
                        position: "absolute",
                        top: "12px",
                        left: "12px",
                        right: "12px",
                        height: "2px",
                        background: "#e9ecef",
                        zIndex: 1
                      }}></div>
                      
                      {/* Active progress line */}
                      <div style={{
                        position: "absolute",
                        top: "12px",
                        left: "12px",
                        width: currentStep === 2 ? "33%" : currentStep === 3 ? "66%" : "100%", // 1/3 for step 2, 2/3 for step 3, full for step 4
                        height: "2px",
                        background: "linear-gradient(45deg, #667eea, #764ba2)",
                        zIndex: 2
                      }}></div>
                      
                      <div style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        background: "linear-gradient(45deg, #667eea, #764ba2)",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        fontWeight: "600",
                        zIndex: 3
                      }}>
                        1
                      </div>
                      <div style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        background: "linear-gradient(45deg, #667eea, #764ba2)",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        fontWeight: "600",
                        zIndex: 3
                      }}>
                        2
                      </div>
                      <div style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        background: currentStep >= 3 ? "linear-gradient(45deg, #667eea, #764ba2)" : "#e9ecef",
                        color: currentStep >= 3 ? "white" : "#666",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        fontWeight: "600",
                        zIndex: 3
                      }}>
                        3
                      </div>
                    </div>
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "10px",
                      color: "#666",
                      textAlign: "center"
                    }}>
                      <span style={{ width: "auto" }}>Personal Information</span>
                      <span style={{ width: "auto" }}>Professional Details & Documents</span>
                      <span style={{ width: "auto" }}>Review</span>
                    </div>
              </div>

              <h2 style={{
                fontSize: "18px",
                fontWeight: "600",
                margin: "8px 0",
                color: "#667eea"
              }}>
                Professional Details & Documents
              </h2>

              <p style={{
                fontSize: "14px",
                color: "#666",
                margin: "0 0 20px 0"
              }}>
                Upload supporting documents for verification
              </p>

              <form onSubmit={handleProfessionalInfoSignup}>
                {/* Education Background Card */}
                <div style={{
                  background: "white",
                  border: "1px solid #d1d5db",
                  borderRadius: "12px",
                  padding: "20px",
                  marginBottom: "16px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.1)"
                }}>
                  <h3 style={{
                    fontSize: "16px",
                    fontWeight: "700",
                    margin: "0 0 8px 0",
                    color: "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    Education Background <span style={{ color: "#dc2626", fontWeight: "bold" }}>*</span>
                  </h3>
                  <p style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    margin: "0 0 16px 0"
                  }}>
                    List your academic qualifications and upload supporting documents.
                  </p>
                  
                  <div style={{ marginBottom: "12px" }}>
                    <input
                      type="text"
                      placeholder="e.g., Master's in Psychology, University of Nairobi"
                      value={signupForm.educationBackground}
                      onChange={(e) => setSignupForm({...signupForm, educationBackground: e.target.value})}
                      required
                      style={{ 
                        width: "100%", 
                        padding: "12px", 
                        border: "1px solid #d1d5db", 
                        borderRadius: "8px", 
                        fontSize: "14px", 
                        boxSizing: "border-box",
                        background: "#fafafa"
                      }}
                    />
                  </div>

                  {/* Upload Section */}
                  <div>
                    <label style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#6b7280",
                      marginBottom: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}>
                      Upload Supporting Documents <span style={{ color: "#dc2626", fontWeight: "bold" }}>*</span>
                      <span style={{ fontSize: "16px" }}>📁</span>
                    </label>
                    <div style={{
                      border: "2px dashed #d1d5db",
                      borderRadius: "8px",
                      padding: "20px",
                      textAlign: "center",
                      background: "#f9fafb"
                    }}>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        multiple
                        onChange={(e) => handleFileUpload('educationDocs', e.target.files)}
                        style={{ display: "none" }}
                        id="education-upload"
                      />
                      <label
                        htmlFor="education-upload"
                        style={{
                          display: "inline-block",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: "500",
                          color: "#2563eb",
                          padding: "8px 16px",
                          border: "1px solid #2563eb",
                          borderRadius: "6px",
                          background: "white"
                        }}
                      >
                        📎 Choose Files
                      </label>
                      <p style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        margin: "8px 0 0 0"
                      }}>
                        Upload certificates, diplomas, or transcripts for each educational qualification
                      </p>
                    </div>
                    {renderUploadedFiles('educationDocs')}
                  </div>
                </div>

                {/* Professional Certifications Card */}
                <div style={{
                  background: "white",
                  border: "1px solid #d1d5db",
                  borderRadius: "12px",
                  padding: "20px",
                  marginBottom: "16px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.1)"
                }}>
                  <h3 style={{
                    fontSize: "16px",
                    fontWeight: "700",
                    margin: "0 0 8px 0",
                    color: "#ea580c",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    Professional Certifications <span style={{ color: "#dc2626", fontWeight: "bold" }}>*</span>
                  </h3>
                  <p style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    margin: "0 0 16px 0"
                  }}>
                    Include all relevant professional certifications and licenses.
                  </p>
                  
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "6px",
                      display: "block"
                    }}>
                      Therapist License Number *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., KCPA-12345"
                      value={signupForm.therapistId}
                      onChange={(e) => setSignupForm({...signupForm, therapistId: e.target.value})}
                      required
                      style={{ 
                        width: "100%", 
                        padding: "12px", 
                        border: "1px solid #d1d5db", 
                        borderRadius: "8px", 
                        fontSize: "14px", 
                        boxSizing: "border-box",
                        background: "#fafafa"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "6px",
                      display: "block"
                    }}>
                      Additional Certifications
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., CBT Certified Therapist, Trauma Specialist"
                      value={signupForm.additionalCertifications}
                      onChange={(e) => setSignupForm({...signupForm, additionalCertifications: e.target.value})}
                      style={{ 
                        width: "100%", 
                        padding: "12px", 
                        border: "1px solid #d1d5db", 
                        borderRadius: "8px", 
                        fontSize: "14px", 
                        boxSizing: "border-box",
                        background: "#fafafa"
                      }}
                    />
                  </div>
                  
                  {/* Upload Professional Documents */}
                  <div style={{ marginTop: "16px" }}>
                    <label style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}>
                      Upload Professional Documents <span style={{ color: "#dc2626", fontWeight: "bold" }}>*</span>
                      <span style={{ fontSize: "16px" }}>📁</span>
                    </label>
                    <div style={{
                      border: "2px dashed #d1d5db",
                      borderRadius: "8px",
                      padding: "20px",
                      textAlign: "center",
                      background: "#f9fafb"
                    }}>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        multiple
                        onChange={(e) => handleFileUpload('professionalDocs', e.target.files)}
                        style={{ display: "none" }}
                        id="professional-upload"
                      />
                      <label
                        htmlFor="professional-upload"
                        style={{
                          display: "inline-block",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: "500",
                          color: "#ea580c",
                          padding: "8px 16px",
                          border: "1px solid #ea580c",
                          borderRadius: "6px",
                          background: "white"
                        }}
                      >
                        📎 Choose Files
                      </label>
                      <p style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        margin: "8px 0 0 0"
                      }}>
                        Upload professional licenses, certifications, and credentials
                      </p>
                    </div>
                    {renderUploadedFiles('professionalDocs')}
                  </div>
                </div>

                {/* Identity Verification Card */}
                <div style={{
                  background: "white",
                  border: "1px solid #d1d5db",
                  borderRadius: "12px",
                  padding: "20px",
                  marginBottom: "16px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.1)"
                }}>
                  <h3 style={{
                    fontSize: "16px",
                    fontWeight: "700",
                    margin: "0 0 8px 0",
                    color: "#dc2626",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    Identity Verification <span style={{ color: "#dc2626", fontWeight: "bold" }}>*</span>
                  </h3>
                  <p style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    margin: "0 0 16px 0"
                  }}>
                    Upload your identification documents for verification.
                  </p>
                  
                  <div>
                    <label style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "6px",
                      display: "block"
                    }}>
                      National ID Number <span style={{ color: "#dc2626", fontWeight: "bold" }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 12345678"
                      value={signupForm.nationalIdNumber}
                      onChange={(e) => setSignupForm({...signupForm, nationalIdNumber: e.target.value})}
                      required
                      style={{ 
                        width: "100%", 
                        padding: "12px", 
                        border: "1px solid #d1d5db", 
                        borderRadius: "8px", 
                        fontSize: "14px", 
                        marginBottom: "16px",
                        boxSizing: "border-box",
                        background: "#fafafa"
                      }}
                    />

                    <label style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}>
                      Upload National ID Document <span style={{ color: "#dc2626", fontWeight: "bold" }}>*</span>
                      <span style={{ fontSize: "16px" }}>🆔</span>
                    </label>
                    <div style={{
                      border: "2px dashed #d1d5db",
                      borderRadius: "8px",
                      padding: "16px",
                      textAlign: "center",
                      background: "#f9fafb"
                    }}>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileUpload('nationalId', e.target.files)}
                        style={{ display: "none" }}
                        id="national-id-upload"
                      />
                      <label
                        htmlFor="national-id-upload"
                        style={{
                          display: "inline-block",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: "500",
                          color: "#dc2626",
                          padding: "8px 16px",
                          border: "1px solid #dc2626",
                          borderRadius: "6px",
                          background: "white"
                        }}
                      >
                        📎 Choose File
                      </label>
                      <p style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        margin: "8px 0 0 0"
                      }}>
                        Upload your national ID document
                      </p>
                    </div>
                    {renderUploadedFiles('nationalId')}
                  </div>
                </div>

                {/* Therapeutic Specializations Card */}
                <div style={{
                  background: "white",
                  border: "1px solid #d1d5db",
                  borderRadius: "12px",
                  padding: "20px",
                  marginBottom: "16px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.1)"
                }}>
                  <h3 style={{
                    fontSize: "16px",
                    fontWeight: "700",
                    margin: "0 0 8px 0",
                    color: "#059669",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    Professional Specialization <span style={{ color: "#dc2626", fontWeight: "bold" }}>*</span>
                  </h3>
                  <p style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    margin: "0 0 16px 0"
                  }}>
                    Describe your areas of expertise and therapeutic approach.
                  </p>
                  
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "6px",
                      display: "block"
                    }}>
                      Years of Experience *
                    </label>
                    <select
                      value={signupForm.experience}
                      onChange={(e) => setSignupForm({...signupForm, experience: e.target.value})}
                      required
                      style={{ 
                        width: "100%", 
                        padding: "12px", 
                        border: "1px solid #d1d5db", 
                        borderRadius: "8px", 
                        fontSize: "14px", 
                        boxSizing: "border-box",
                        background: "#fafafa",
                        appearance: "none"
                      }}
                    >
                      <option value="">Select years of experience</option>
                      <option value="0-1">0-1 years</option>
                      <option value="2-3">2-3 years</option>
                      <option value="4-5">4-5 years</option>
                      <option value="6-10">6-10 years</option>
                      <option value="11-15">11-15 years</option>
                      <option value="16-20">16-20 years</option>
                      <option value="21+">21+ years</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: "12px" }}>
                    <label style={{
                      fontSize: "12px",
                      fontWeight: "500",
                      color: "#666",
                      marginBottom: "4px",
                      display: "block"
                    }}>
                      Therapeutic Specializations *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Cognitive Behavioral Therapy, Anxiety, Depression, Trauma"
                      value={signupForm.specialization}
                      onChange={(e) => setSignupForm({...signupForm, specialization: e.target.value})}
                      required
                      style={{ 
                        width: "100%", 
                        padding: "12px", 
                        border: "1px solid #ddd", 
                        borderRadius: "8px", 
                        fontSize: "14px", 
                        boxSizing: "border-box" 
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: "12px" }}>
                    <label style={{
                      fontSize: "12px",
                      fontWeight: "500",
                      color: "#666",
                      marginBottom: "4px",
                      display: "block"
                    }}>
                      Target Conditions *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Anxiety Disorders, Depression, PTSD, Relationship Issues"
                      value={signupForm.targetConditions}
                      onChange={(e) => setSignupForm({...signupForm, targetConditions: e.target.value})}
                      required
                      style={{ 
                        width: "100%", 
                        padding: "12px", 
                        border: "1px solid #ddd", 
                        borderRadius: "8px", 
                        fontSize: "14px", 
                        boxSizing: "border-box" 
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      fontSize: "12px",
                      fontWeight: "500",
                      color: "#666",
                      marginBottom: "4px",
                      display: "block"
                    }}>
                      Therapeutic Approach (Max 300 words) *
                    </label>
                    <textarea
                      placeholder="Describe your therapeutic approach, methodology, and philosophy..."
                      value={signupForm.therapeuticApproach}
                      onChange={(e) => setSignupForm({...signupForm, therapeuticApproach: e.target.value})}
                      required
                      maxLength={300}
                      rows={4}
                      style={{ 
                        width: "100%", 
                        padding: "12px", 
                        border: "1px solid #ddd", 
                        borderRadius: "8px", 
                        fontSize: "14px", 
                        boxSizing: "border-box",
                        resize: "vertical",
                        fontFamily: "inherit"
                      }}
                    />
                    <div style={{
                      fontSize: "11px",
                      color: "#666",
                      textAlign: "right",
                      marginTop: "4px"
                    }}>
                      {signupForm.therapeuticApproach?.length || 0}/300 characters
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    width: "100%",
                    padding: "16px",
                    background: isLoading ? "#ccc" : "linear-gradient(45deg, #667eea, #764ba2)",
                    color: "white",
                    border: "none",
                    borderRadius: "12px",
                    fontSize: "16px",
                    fontWeight: "600",
                    cursor: isLoading ? "not-allowed" : "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
                  }}
                >
                  {isLoading ? "Saving..." : "Save Professional Details"}
                  {!isLoading && <span>→</span>}
                </button>
                
                <p style={{
                  textAlign: "center",
                  fontSize: "12px",
                  color: "#666",
                  margin: "16px 0 0 0"
                }}>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#667eea",
                      textDecoration: "underline",
                      cursor: "pointer",
                      fontSize: "12px"
                    }}
                  >
                    ← Back to Personal Information
                  </button>
                </p>
              </form>
            </div>
          ) : currentStep === 4 ? (
            <div>
              {/* Progress Steps for Step 4 */}
              <div style={{
                background: "#f8f9fa",
                padding: "16px",
                borderRadius: "12px",
                marginBottom: "20px"
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                  position: "relative"
                }}>
                  {/* Progress line background */}
                  <div style={{
                    position: "absolute",
                    top: "12px",
                    left: "12px",
                    right: "12px",
                    height: "2px",
                    background: "#e9ecef",
                    zIndex: 1
                  }}></div>
                  
                  {/* Active progress line */}
                  <div style={{
                    position: "absolute",
                    top: "12px",
                    left: "12px",
                    width: "100%", // All 3 steps completed
                    height: "2px",
                    background: "linear-gradient(45deg, #667eea, #764ba2)",
                    zIndex: 2
                  }}></div>
                  
                  <div style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: "linear-gradient(45deg, #667eea, #764ba2)",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: "600",
                    zIndex: 3
                  }}>
                    1
                  </div>
                  <div style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: "linear-gradient(45deg, #667eea, #764ba2)",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: "600",
                    zIndex: 3
                  }}>
                    2
                  </div>
                  <div style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: "linear-gradient(45deg, #667eea, #764ba2)",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: "600",
                    zIndex: 3
                  }}>
                    3
                  </div>
                </div>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "10px",
                  color: "#666",
                  textAlign: "center"
                }}>
                  <span style={{ width: "auto" }}>Personal Information</span>
                  <span style={{ width: "auto" }}>Professional Details & Documents</span>
                  <span style={{ width: "auto" }}>Review</span>
                </div>
              </div>

              <h2 style={{
                fontSize: "18px",
                fontWeight: "600",
                margin: "8px 0",
                color: "#667eea"
              }}>
                Application Review
              </h2>

              <p style={{
                fontSize: "14px",
                color: "#666",
                margin: "0 0 20px 0"
              }}>
                Please review your application details before submission
              </p>

              {/* Application Summary */}
              <div style={{
                background: "white",
                border: "1px solid #d1d5db",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "20px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.1)"
              }}>
                <h3 style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  margin: "0 0 16px 0",
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  📋 Application Summary
                </h3>

                {/* Personal Information Summary */}
                <div style={{
                  background: "#f0f8ff",
                  padding: "16px",
                  borderRadius: "8px",
                  marginBottom: "16px"
                }}>
                  <h4 style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    margin: "0 0 12px 0",
                    color: "#2563eb"
                  }}>
                    Personal Information
                  </h4>
                  <div style={{ fontSize: "13px", color: "#374151", lineHeight: "1.6" }}>
                    <p><strong>Name:</strong> {savedData?.name || (() => {
                      const firstName = localStorage.getItem('userFirstName') || localStorage.getItem('basicFirstName');
                      return firstName || 'Not provided';
                    })()}</p>
                    <p><strong>Email:</strong> {savedData?.email || localStorage.getItem('userEmailForVerification') || 'Not provided'}</p>
                    <p><strong>Gender:</strong> {savedData?.gender || signupForm.gender || 'Not provided'}</p>
                    <p><strong>Date of Birth:</strong> {savedData?.date_of_birth ? new Date(savedData.date_of_birth).toLocaleDateString() : (signupForm.dateOfBirth || 'Not provided')}</p>
                    <p><strong>Religion:</strong> {savedData?.religion || signupForm.religion || 'Not provided'}</p>
                    <p><strong>Phone:</strong> {savedData?.phone || (signupForm.phone ? `${getCountryCode(signupForm.country)} ${signupForm.phone}` : 'Not provided')}</p>
                    <p><strong>Country:</strong> {savedData?.country || signupForm.country || 'Not provided'}</p>
                    <p><strong>Address:</strong> {savedData?.physical_address || signupForm.physicalAddress || 'Not provided'}</p>
                    <p><strong>City/Town:</strong> {savedData?.city_or_town || signupForm.cityOrTown || 'Not provided'}</p>
                    <p><strong>Emergency Contact:</strong> {savedData?.emergency_contact_phone || (signupForm.emergencyContactPhone ? `${getCountryCode(signupForm.country)} ${signupForm.emergencyContactPhone}` : 'Not provided')}</p>
                  </div>
                </div>

                {/* Professional Information Summary */}
                <div style={{
                  background: "#f0fdf4",
                  padding: "16px",
                  borderRadius: "8px",
                  marginBottom: "16px"
                }}>
                  <h4 style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    margin: "0 0 12px 0",
                    color: "#059669"
                  }}>
                    Professional Information
                  </h4>
                  <div style={{ fontSize: "13px", color: "#374151", lineHeight: "1.6" }}>
                    <p><strong>Therapist ID:</strong> {savedData?.therapist_id || signupForm.therapistId || 'Not provided'}</p>
                    <p><strong>Specialization:</strong> {savedData?.specialization || signupForm.specialization || 'Not provided'}</p>
                    <p><strong>Experience:</strong> {savedData?.experience || signupForm.experience || 'Not provided'}</p>
                    <p><strong>Education Background:</strong> {savedData?.education_background || signupForm.educationBackground || 'Not provided'}</p>
                    <p><strong>Additional Certifications:</strong> {savedData?.additional_certifications || signupForm.additionalCertifications || 'Not provided'}</p>
                    <p><strong>Target Conditions:</strong> {savedData?.target_conditions || signupForm.targetConditions || 'Not provided'}</p>
                    <p><strong>National ID Number:</strong> {savedData?.national_id_number || signupForm.nationalIdNumber || 'Not provided'}</p>
                    <p><strong>Therapeutic Approach:</strong> {(savedData?.therapeutic_approach || signupForm.therapeuticApproach) ? `${(savedData?.therapeutic_approach || signupForm.therapeuticApproach).substring(0, 100)}${(savedData?.therapeutic_approach || signupForm.therapeuticApproach).length > 100 ? '...' : ''}` : 'Not provided'}</p>
                  </div>
                </div>

                {/* Documents Summary */}
                <div style={{
                  background: "#fef3c7",
                  padding: "16px",
                  borderRadius: "8px"
                }}>
                  <h4 style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    margin: "0 0 12px 0",
                    color: "#d97706"
                  }}>
                    Uploaded Documents
                  </h4>
                  <div style={{ fontSize: "13px", color: "#374151", lineHeight: "1.6" }}>
                    <p><strong>Education Documents:</strong> {documents.educationDocs ? `${documents.educationDocs.length} file(s)` : 'No files uploaded'}</p>
                    <p><strong>Professional Documents:</strong> {documents.professionalDocs ? `${documents.professionalDocs.length} file(s)` : 'No files uploaded'}</p>
                    <p><strong>National ID Document:</strong> {documents.nationalId ? `${documents.nationalId.length} file(s)` : 'No files uploaded'}</p>
                  </div>
                </div>
              </div>

              {/* Review Notice */}
              <div style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "20px",
                textAlign: "center"
              }}>
                <div style={{
                  fontSize: "48px",
                  marginBottom: "12px"
                }}>
                  ⏳
                </div>
                <h3 style={{
                  fontSize: "18px",
                  fontWeight: "700",
                  margin: "0 0 8px 0",
                  color: "#dc2626"
                }}>
                  Application Under Review
                </h3>
                <p style={{
                  fontSize: "14px",
                  color: "#7f1d1d",
                  margin: "0 0 12px 0",
                  lineHeight: "1.5"
                }}>
                  Your application has been submitted successfully and is now under review by our admin team.
                </p>
                <p style={{
                  fontSize: "13px",
                  color: "#991b1b",
                  margin: "0",
                  fontWeight: "500"
                }}>
                  Please wait for approval. You will receive an email notification once your application is reviewed.
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: "flex",
                gap: "12px",
                marginBottom: "20px"
              }}>
                <button
                  onClick={() => setCurrentStep(3)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: "#f3f4f6",
                    color: "#374151",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  ← Edit Professional Details
                </button>
                <button
                  onClick={() => {
                    // Clear localStorage and redirect to login
                    localStorage.removeItem('signupStep');
                    localStorage.removeItem('savedPersonalInfo');
                    localStorage.removeItem('personalInfoSaved');
                    localStorage.removeItem('professionalInfoSaved');
                    navigate('/login');
                  }}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: "linear-gradient(45deg, #667eea, #764ba2)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  Complete Registration →
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        marginTop: "24px",
        textAlign: "center",
        color: "rgba(255,255,255,0.8)",
        fontSize: "12px",
        paddingBottom: "24px"
      }}>
        <p style={{ margin: "4px 0", fontSize: "11px", opacity: 0.7 }}>
          By signing up, you agree to our 
          <a href="#" style={{ color: "rgba(255,255,255,0.9)", textDecoration: "none" }}> Terms of Service </a>
          and 
          <a href="#" style={{ color: "rgba(255,255,255,0.9)", textDecoration: "none" }}> Privacy Policy</a>
        </p>
        
        <p style={{ margin: "4px 0", fontSize: "10px", opacity: 0.6 }}>
          © 2024 NextStep Mentorship. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default Signup;
