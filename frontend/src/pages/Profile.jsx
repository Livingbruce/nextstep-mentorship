import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../utils/AuthContext';
import { useTheme } from '../ThemeContext';
import api from '../utils/api';

const Profile = () => {
  const { user } = useContext(AuthContext);
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    specialization: '',
    bio: '',
    // Personal Information fields
    gender: '',
    date_of_birth: '',
    religion: '',
    country: '',
    physical_address: '',
    city_or_town: '',
    emergency_contact_phone: '',
    // Professional Information fields (from registration)
    therapist_id: '',
    experience: '',
    education_background: '',
    additional_certifications: '',
    target_conditions: '',
    therapeutic_approach: '',
    national_id_number: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [documents, setDocuments] = useState({
    education_documents: null,
    professional_documents: null,
    national_id_documents: null
  });

  // Function to convert full country name back to country code
  const getCountryCode = (fullCountryName) => {
    if (!fullCountryName) return '';
    
    const reverseCountryMap = {
      'Kenya': 'KE',
      'United States': 'US',
      'Nigeria': 'NG',
      'United Kingdom': 'GB',
      'Canada': 'CA',
      'Australia': 'AU',
      'South Africa': 'ZA',
      'Egypt': 'EG',
      'Ghana': 'GH',
      'Uganda': 'UG',
      'Tanzania': 'TZ',
      'Ethiopia': 'ET',
      'Rwanda': 'RW',
      'India': 'IN',
      'China': 'CN',
      'Japan': 'JP',
      'South Korea': 'KR',
      'Brazil': 'BR',
      'Mexico': 'MX',
      'Argentina': 'AR',
      'France': 'FR',
      'Germany': 'DE',
      'Italy': 'IT',
      'Spain': 'ES',
      'Russia': 'RU',
      'Turkey': 'TR',
      'Saudi Arabia': 'SA',
      'United Arab Emirates': 'AE',
      'Israel': 'IL',
      'Thailand': 'TH',
      'Vietnam': 'VN',
      'Philippines': 'PH',
      'Indonesia': 'ID',
      'Malaysia': 'MY',
      'Singapore': 'SG'
    };
    
    return reverseCountryMap[fullCountryName] || fullCountryName || '';
  };

  // Function to get full country name (returns code if not found)
  const getCountryFullName = (countryCode) => {
    if (!countryCode) return '';
    
    const countryNames = {
      'KE': 'Kenya',
      'US': 'United States',
      'USA': 'United States',
      'NG': 'Nigeria',
      'GB': 'United Kingdom',
      'UK': 'United Kingdom',
      'CA': 'Canada',
      'AU': 'Australia',
      'ZA': 'South Africa',
      'EG': 'Egypt',
      'GH': 'Ghana',
      'UG': 'Uganda',
      'TZ': 'Tanzania',
      'ET': 'Ethiopia',
      'RW': 'Rwanda',
      'IN': 'India',
      'CN': 'China',
      'JP': 'Japan',
      'KR': 'South Korea',
      'BR': 'Brazil',
      'MX': 'Mexico',
      'AR': 'Argentina',
      'FR': 'France',
      'DE': 'Germany',
      'IT': 'Italy',
      'ES': 'Spain',
      'RU': 'Russia',
      'TR': 'Turkey',
      'SA': 'Saudi Arabia',
      'AE': 'United Arab Emirates',
      'IL': 'Israel',
      'TH': 'Thailand',
      'VN': 'Vietnam',
      'PH': 'Philippines',
      'ID': 'Indonesia',
      'MY': 'Malaysia',
      'SG': 'Singapore'
    };
    
    return countryNames[countryCode] || countryNames[countryCode?.toUpperCase()] || countryCode || '';
  };

  // Function to format country names for display
  const formatCountryName = (countryCode) => {
    if (!countryCode) return 'Not set';
    
    const countryNames = {
      'KE': 'Kenya',
      'US': 'United States',
      'USA': 'United States',
      'NG': 'Nigeria',
      'GB': 'United Kingdom',
      'UK': 'United Kingdom',
      'CA': 'Canada',
      'AU': 'Australia',
      'ZA': 'South Africa',
      'EG': 'Egypt',
      'GH': 'Ghana',
      'UG': 'Uganda',
      'TZ': 'Tanzania',
      'ET': 'Ethiopia',
      'RW': 'Rwanda',
      'IN': 'India',
      'CN': 'China',
      'JP': 'Japan',
      'KR': 'South Korea',
      'BR': 'Brazil',
      'MX': 'Mexico',
      'AR': 'Argentina',
      'FR': 'France',
      'DE': 'Germany',
      'IT': 'Italy',
      'ES': 'Spain',
      'RU': 'Russia',
      'TR': 'Turkey',
      'SA': 'Saudi Arabia',
      'AE': 'United Arab Emirates',
      'IL': 'Israel',
      'TH': 'Thailand',
      'VN': 'Vietnam',
      'PH': 'Philippines',
      'ID': 'Indonesia',
      'MY': 'Malaysia',
      'SG': 'Singapore'
    };
    
    return countryNames[countryCode] || countryNames[countryCode?.toUpperCase()] || countryCode || 'Not set';
  };

  // Function to format phone numbers with country code
  const formatPhoneNumber = (phone, country) => {
    if (!phone) return 'Not set';
    
    // Remove any existing country code or formatting
    let cleanPhone = phone.replace(/^\+/, '').replace(/\D/g, '');
    
    // Country code mapping
    const countryCodes = {
      'KE': '254', 'Kenya': '254',
      'US': '1', 'USA': '1', 'United States': '1',
      'NG': '234', 'Nigeria': '234',
      'GB': '44', 'UK': '44', 'United Kingdom': '44',
      'CA': '1', 'Canada': '1',
      'AU': '61', 'Australia': '61',
      'ZA': '27', 'South Africa': '27',
      'EG': '20', 'Egypt': '20',
      'GH': '233', 'Ghana': '233',
      'UG': '256', 'Uganda': '256',
      'TZ': '255', 'Tanzania': '255',
      'ET': '251', 'Ethiopia': '251',
      'RW': '250', 'Rwanda': '250',
      'IN': '91', 'India': '91',
      'CN': '86', 'China': '86',
      'JP': '81', 'Japan': '81',
      'KR': '82', 'South Korea': '82',
      'BR': '55', 'Brazil': '55',
      'MX': '52', 'Mexico': '52',
      'AR': '54', 'Argentina': '54',
      'FR': '33', 'France': '33',
      'DE': '49', 'Germany': '49',
      'IT': '39', 'Italy': '39',
      'ES': '34', 'Spain': '34',
      'RU': '7', 'Russia': '7',
      'TR': '90', 'Turkey': '90',
      'SA': '966', 'Saudi Arabia': '966',
      'AE': '971', 'United Arab Emirates': '971',
      'IL': '972', 'Israel': '972',
      'TH': '66', 'Thailand': '66',
      'VN': '84', 'Vietnam': '84',
      'PH': '63', 'Philippines': '63',
      'ID': '62', 'Indonesia': '62',
      'MY': '60', 'Malaysia': '60',
      'SG': '65', 'Singapore': '65'
    };
    
    // Get country code
    const countryCode = countryCodes[country] || countryCodes[country?.toUpperCase()];
    
    if (countryCode) {
      // If phone already has country code, return as is
      if (cleanPhone.startsWith(countryCode)) {
        return `+${cleanPhone}`;
      }
      // Add country code
      return `+${countryCode}${cleanPhone}`;
    }
    
    // If no country code found, return as is with + prefix
    return `+${cleanPhone}`;
  };

  // Load profile data from API
  const loadProfile = async () => {
    try {
      const response = await api.get('/api/auth/profile');
      console.log('🔍 Raw API response:', response);
      
      if (response.success && response.counselor) {
        const profileData = response.counselor;
        console.log('📊 Profile data received from API:', profileData);
        console.log('🎯 DEBUG - date_of_birth:', profileData.date_of_birth, typeof profileData.date_of_birth);
        console.log('🎯 DEBUG - country:', profileData.country, typeof profileData.country);
        setFormData({
          name: profileData.name || '',
          email: profileData.email || '',
          phone: profileData.phone || '',
          specialization: profileData.specialization || '',
          bio: profileData.bio || '',
          // Personal Information fields
          gender: profileData.gender || '',
          date_of_birth: profileData.date_of_birth ? new Date(profileData.date_of_birth).toISOString().split('T')[0] : '',
          religion: profileData.religion || '',
          country: getCountryFullName(profileData.country) || '',
          physical_address: profileData.physical_address || '',
          city_or_town: profileData.city_or_town || '',
          emergency_contact_phone: profileData.emergency_contact_phone || '',
          // Professional Information fields (from registration)
          therapist_id: profileData.therapist_id || '',
          experience: profileData.experience || '',
          education_background: profileData.education_background || '',
          additional_certifications: profileData.additional_certifications || '',
          target_conditions: profileData.target_conditions || '',
          therapeutic_approach: profileData.therapeutic_approach || '',
          national_id_number: profileData.national_id_number || ''
        });
        console.log('✅ Form data updated with profile information');
      } else {
        console.log('❌ No profile data received from API');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  // Load documents information
  const loadDocuments = async () => {
    try {
      const email = user?.email;
      if (!email) return;

      console.log('📁 Fetching documents for profile page:', email);
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/get-documents-by-email?email=${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📁 Documents found for profile:', data);
        
        if (data.documents && data.documents.length > 0) {
          // Group documents by type
          const documentGroups = {
            education: data.documents.filter(doc => doc.document_type === 'education'),
            professional: data.documents.filter(doc => doc.document_type === 'professional'),
            national_id: data.documents.filter(doc => doc.document_type === 'national_id')
          };
          
          console.log('📁 Document groups for profile:', documentGroups);
          
          // Create display strings for each document type
          const documentsDisplay = {
            education_documents: documentGroups.education.length > 0 
              ? `${documentGroups.education.length} files: ${documentGroups.education.map(doc => doc.original_filename).join(', ')}` 
              : null,
            professional_documents: documentGroups.professional.length > 0 
              ? `${documentGroups.professional.length} files: ${documentGroups.professional.map(doc => doc.original_filename).join(', ')}` 
              : null,
            national_id_documents: documentGroups.national_id.length > 0 
              ? `${documentGroups.national_id.length} files: ${documentGroups.national_id.map(doc => doc.original_filename).join(', ')}` 
              : null
          };
          
          setDocuments(documentsDisplay);
          console.log('✅ Updated documents display for profile:', documentsDisplay);
        } else {
          console.log('📁 No documents found for profile');
        }
      } else {
        console.log('❌ Failed to fetch documents for profile');
      }
    } catch (error) {
      console.error('❌ Error loading documents for profile:', error);
    }
  };

  useEffect(() => {
    if (user) {
      // Load profile data and documents
      loadProfile();
      loadDocuments();
    }
  }, [user]);

  // Auto-dismiss success messages after 5 seconds
  useEffect(() => {
    if (message && message.includes('successfully')) {
      const timer = setTimeout(() => {
        setMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    if (passwordMessage && passwordMessage.includes('successfully')) {
      const timer = setTimeout(() => {
        setPasswordMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [passwordMessage]);

  // Dismiss message handlers
  const dismissMessage = () => {
    setMessage('');
  };

  const dismissPasswordMessage = () => {
    setPasswordMessage('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear success message when user starts typing
    if (message && message.includes('successfully')) {
      setMessage('');
    }
  };

  // Handle phone number changes - store clean number without country code
  const handlePhoneChange = (e) => {
    const { name, value } = e.target;
    
    // Remove country code and formatting for storage
    let cleanPhone = value.replace(/^\+/, '').replace(/\D/g, '');
    
    // Remove country code if present
    const countryCodes = {
      'KE': '254', 'Kenya': '254',
      'US': '1', 'USA': '1', 'United States': '1',
      'NG': '234', 'Nigeria': '234',
      'GB': '44', 'UK': '44', 'United Kingdom': '44',
      'CA': '1', 'Canada': '1',
      'AU': '61', 'Australia': '61',
      'ZA': '27', 'South Africa': '27',
      'EG': '20', 'Egypt': '20',
      'GH': '233', 'Ghana': '233',
      'UG': '256', 'Uganda': '256',
      'TZ': '255', 'Tanzania': '255',
      'ET': '251', 'Ethiopia': '251',
      'RW': '250', 'Rwanda': '250',
      'IN': '91', 'India': '91',
      'CN': '86', 'China': '86',
      'JP': '81', 'Japan': '+81',
      'KR': '82', 'South Korea': '82',
      'BR': '55', 'Brazil': '55',
      'MX': '52', 'Mexico': '52',
      'AR': '54', 'Argentina': '54',
      'FR': '33', 'France': '33',
      'DE': '49', 'Germany': '49',
      'IT': '39', 'Italy': '39',
      'ES': '34', 'Spain': '34',
      'RU': '7', 'Russia': '7',
      'TR': '90', 'Turkey': '90',
      'SA': '966', 'Saudi Arabia': '966',
      'AE': '971', 'United Arab Emirates': '971',
      'IL': '972', 'Israel': '972',
      'TH': '66', 'Thailand': '66',
      'VN': '84', 'Vietnam': '84',
      'PH': '63', 'Philippines': '63',
      'ID': '62', 'Indonesia': '62',
      'MY': '60', 'Malaysia': '60',
      'SG': '65', 'Singapore': '65'
    };
    
    const countryCode = countryCodes[formData.country] || countryCodes[formData.country?.toUpperCase()];
    if (countryCode && cleanPhone.startsWith(countryCode)) {
      cleanPhone = cleanPhone.substring(countryCode.length);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: cleanPhone
    }));
    
    // Clear success message when user starts typing
    if (message && message.includes('successfully')) {
      setMessage('');
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear success message when user starts typing
    if (passwordMessage && passwordMessage.includes('successfully')) {
      setPasswordMessage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Convert country full name back to country code for storage
    const submitData = {
      ...formData,
      country: getCountryCode(formData.country)
    };

    try {
      console.log('Sending profile update:', submitData);
      const response = await api.put('/api/auth/profile', submitData);
      console.log('Profile update response:', response);
      
      if (response.success) {
        setMessage('Profile updated successfully!');
        
        // Update localStorage to persist the changes
        const updatedUser = { ...user, ...response.counselor };
        localStorage.setItem("user", JSON.stringify(updatedUser));
      } else {
        setMessage('Failed to update profile. Please try again.');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Error updating profile. Please try again.';
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordMessage('');

    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage('New passwords do not match.');
      setPasswordLoading(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordMessage('New password must be at least 6 characters long.');
      setPasswordLoading(false);
      return;
    }

    try {
      const response = await api.put('/auth/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      if (response.success) {
        setPasswordMessage('Password updated successfully!');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        setPasswordMessage(response.message || 'Failed to update password. Please check your current password.');
      }
    } catch (error) {
      console.error('Error updating password:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Error updating password. Please try again.';
      setPasswordMessage(errorMessage);
    } finally {
      setPasswordLoading(false);
    }
  };

  const cardStyle = {
    backgroundColor: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '2rem',
    boxShadow: 'var(--shadow)',
    marginBottom: '2rem'
  };

  const formStyle = {
    display: 'grid',
    gap: '1rem',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))'
  };

  const inputStyle = {
    padding: '0.75rem',
    border: '1px solid var(--input-border)',
    borderRadius: '4px',
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text-primary)',
    fontSize: '1rem',
    width: '100%',
    boxSizing: 'border-box'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: '500',
    color: 'var(--text-primary)'
  };

  const buttonStyle = {
    backgroundColor: 'var(--btn-primary)',
    color: 'white',
    border: 'none',
    padding: '0.75rem 2rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '500',
    gridColumn: '1 / -1',
    justifySelf: 'start'
  };

  const messageStyle = {
    padding: '1rem',
    borderRadius: '4px',
    marginBottom: '1rem',
    backgroundColor: message.includes('successfully') ? 'var(--alert-success)' : 'var(--alert-danger)',
    color: message.includes('successfully') ? 'var(--alert-success-text)' : 'var(--alert-danger-text)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative'
  };

  const closeButtonStyle = {
    background: 'none',
    border: 'none',
    color: 'inherit',
    fontSize: '1.2rem',
    cursor: 'pointer',
    padding: '0',
    marginLeft: '1rem',
    opacity: '0.7',
    transition: 'opacity 0.2s',
    lineHeight: '1'
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <button style={{
            ...buttonStyle,
            backgroundColor: 'var(--btn-secondary)',
            marginBottom: '1rem'
          }}>
            ← Back to Dashboard
          </button>
        </Link>
        <h1 style={{ color: 'var(--text-primary)', margin: '0' }}>
          ⚙️ Profile Settings
        </h1>
      </div>

      {message && (
        <div style={messageStyle}>
          <span>{message}</span>
          <button 
            style={closeButtonStyle}
            onClick={dismissMessage}
            onMouseEnter={(e) => e.target.style.opacity = '1'}
            onMouseLeave={(e) => e.target.style.opacity = '0.7'}
            title="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      <div style={cardStyle}>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
          Update Your Profile Information
        </h2>
        
        <form onSubmit={handleSubmit} style={formStyle}>
          <div>
            <label style={labelStyle} htmlFor="name">
              Full Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              style={inputStyle}
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label style={labelStyle} htmlFor="email">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              style={inputStyle}
              placeholder="Enter your email address"
            />
          </div>

          <div>
            <label style={labelStyle} htmlFor="phone">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formatPhoneNumber(formData.phone, formData.country)}
              onChange={handlePhoneChange}
              style={inputStyle}
              placeholder="Enter your phone number"
            />
          </div>

          <div>
            <label style={labelStyle} htmlFor="specialization">
              Specialization
            </label>
            <input
              type="text"
              id="specialization"
              name="specialization"
              value={formData.specialization}
              onChange={handleChange}
              style={inputStyle}
              placeholder="e.g., Academic Counseling, Career Guidance"
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle} htmlFor="bio">
              Bio/Description
            </label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              style={{
                ...inputStyle,
                minHeight: '120px',
                resize: 'vertical'
              }}
              placeholder="Tell students about yourself and your counseling approach..."
            />
          </div>

          {/* Personal Information Section */}
          <div style={{ 
            gridColumn: '1 / -1', 
            borderTop: '1px solid var(--border-color)', 
            paddingTop: '1rem', 
            marginTop: '0.5rem' 
          }}>
            <h3 style={{ 
              color: 'var(--text-primary)', 
              marginBottom: '1rem', 
              fontSize: '1.2rem',
              fontWeight: '600'
            }}>
              Personal Information
            </h3>
          </div>

          <div>
            <label style={labelStyle} htmlFor="gender">
              Gender
            </label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non-binary">Non-binary</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </div>

          <div>
            <label style={labelStyle} htmlFor="date_of_birth">
              Date of Birth
            </label>
            <input
              type="date"
              id="date_of_birth"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle} htmlFor="religion">
              Religion
            </label>
            <select
              id="religion"
              name="religion"
              value={formData.religion}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="">Select Religion</option>
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

          <div>
            <label style={labelStyle} htmlFor="country">
              Country
            </label>
            <input
              type="text"
              id="country"
              name="country"
              value={formData.country}
              onChange={handleChange}
              style={inputStyle}
              placeholder="e.g., Kenya, USA, Nigeria"
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle} htmlFor="physical_address">
              Physical Address
            </label>
            <input
              type="text"
              id="physical_address"
              name="physical_address"
              value={formData.physical_address}
              onChange={handleChange}
              style={inputStyle}
              placeholder="Enter your physical address"
            />
          </div>

          <div>
            <label style={labelStyle} htmlFor="city_or_town">
              City/Town
            </label>
            <input
              type="text"
              id="city_or_town"
              name="city_or_town"
              value={formData.city_or_town}
              onChange={handleChange}
              style={inputStyle}
              placeholder="Enter your city or town"
            />
          </div>

          <div>
            <label style={labelStyle} htmlFor="emergency_contact_phone">
              Emergency Contact Phone
            </label>
            <input
              type="tel"
              id="emergency_contact_phone"
              name="emergency_contact_phone"
              value={formatPhoneNumber(formData.emergency_contact_phone, formData.country)}
              onChange={handlePhoneChange}
              style={inputStyle}
              placeholder="Emergency contact phone"
            />
          </div>

          {/* Professional Information Section */}
          <div style={{ 
            gridColumn: '1 / -1', 
            borderTop: '1px solid var(--border-color)', 
            paddingTop: '1rem', 
            marginTop: '0.5rem' 
          }}>
            <h3 style={{ 
              color: 'var(--text-primary)', 
              marginBottom: '1rem', 
              fontSize: '1.2rem',
              fontWeight: '600'
            }}>
              Professional Information
            </h3>
          </div>

          <div>
            <label style={labelStyle} htmlFor="therapist_id">
              Therapist ID
            </label>
            <input
              type="text"
              id="therapist_id"
              name="therapist_id"
              value={formData.therapist_id}
              onChange={handleChange}
              style={inputStyle}
              placeholder="Your therapist/counselor ID"
            />
          </div>

          <div>
            <label style={labelStyle} htmlFor="experience">
              Years of Experience
            </label>
            <select
              id="experience"
              name="experience"
              value={formData.experience}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="">Select Experience</option>
              <option value="0-1">0-1 years</option>
              <option value="2-3">2-3 years</option>
              <option value="4-5">4-5 years</option>
              <option value="6-10">6-10 years</option>
              <option value="11-15">11-15 years</option>
              <option value="16-20">16-20 years</option>
              <option value="21+">21+ years</option>
            </select>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle} htmlFor="education_background">
              Education Background
            </label>
            <textarea
              id="education_background"
              name="education_background"
              value={formData.education_background}
              onChange={handleChange}
              style={{
                ...inputStyle,
                minHeight: '100px',
                resize: 'vertical'
              }}
              placeholder="Describe your educational background and qualifications..."
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle} htmlFor="additional_certifications">
              Additional Certifications
            </label>
            <textarea
              id="additional_certifications"
              name="additional_certifications"
              value={formData.additional_certifications}
              onChange={handleChange}
              style={{
                ...inputStyle,
                minHeight: '100px',
                resize: 'vertical'
              }}
              placeholder="List any additional certifications or training..."
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle} htmlFor="target_conditions">
              Target Conditions/Specializations
            </label>
            <textarea
              id="target_conditions"
              name="target_conditions"
              value={formData.target_conditions}
              onChange={handleChange}
              style={{
                ...inputStyle,
                minHeight: '100px',
                resize: 'vertical'
              }}
              placeholder="What conditions or issues do you specialize in treating?"
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle} htmlFor="therapeutic_approach">
              Therapeutic Approach (Max 300 words)
            </label>
            <textarea
              id="therapeutic_approach"
              name="therapeutic_approach"
              value={formData.therapeutic_approach}
              onChange={handleChange}
              style={{
                ...inputStyle,
                minHeight: '120px',
                resize: 'vertical'
              }}
              placeholder="Describe your therapeutic approach and methodology..."
              maxLength="300"
            />
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              {formData.therapeutic_approach.length}/300 words
            </div>
          </div>

          <div>
            <label style={labelStyle} htmlFor="national_id_number">
              National ID Number
            </label>
            <input
              type="text"
              id="national_id_number"
              name="national_id_number"
              value={formData.national_id_number}
              onChange={handleChange}
              style={inputStyle}
              placeholder="Your national ID number"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...buttonStyle,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Updating...' : 'Update Profile'}
          </button>
        </form>
      </div>

      <div style={cardStyle}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
          Current Profile Information
        </h3>
        <div style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
          <div>
            <strong style={{ color: 'var(--text-secondary)' }}>Name:</strong>
            <span style={{ color: 'var(--text-primary)', marginLeft: '0.5rem' }}>
              {formData.name || 'Not set'}
            </span>
          </div>
          <div>
            <strong style={{ color: 'var(--text-secondary)' }}>Email:</strong>
            <span style={{ color: 'var(--text-primary)', marginLeft: '0.5rem' }}>
              {formData.email || 'Not set'}
            </span>
          </div>
          <div>
            <strong style={{ color: 'var(--text-secondary)' }}>Phone:</strong>
            <span style={{ color: 'var(--text-primary)', marginLeft: '0.5rem' }}>
              {formatPhoneNumber(formData.phone, formData.country)}
            </span>
          </div>
          <div>
            <strong style={{ color: 'var(--text-secondary)' }}>Specialization:</strong>
            <span style={{ color: 'var(--text-primary)', marginLeft: '0.5rem' }}>
              {formData.specialization || 'Not set'}
            </span>
          </div>
          <div>
            <strong style={{ color: 'var(--text-secondary)' }}>Therapist ID:</strong>
            <span style={{ color: 'var(--text-primary)', marginLeft: '0.5rem' }}>
              {formData.therapist_id || 'Not set'}
            </span>
          </div>
          <div>
            <strong style={{ color: 'var(--text-secondary)' }}>Experience:</strong>
            <span style={{ color: 'var(--text-primary)', marginLeft: '0.5rem' }}>
              {formData.experience ? `${formData.experience} years` : 'Not set'}
            </span>
          </div>
          <div>
            <strong style={{ color: 'var(--text-secondary)' }}>Gender:</strong>
            <span style={{ color: 'var(--text-primary)', marginLeft: '0.5rem' }}>
              {formData.gender ? formData.gender.charAt(0).toUpperCase() + formData.gender.slice(1) : 'Not set'}
            </span>
          </div>
          <div>
            <strong style={{ color: 'var(--text-secondary)' }}>Date of Birth:</strong>
            <span style={{ color: 'var(--text-primary)', marginLeft: '0.5rem' }}>
              {formData.date_of_birth ? new Date(formData.date_of_birth).toLocaleDateString() : 'Not set'}
            </span>
            <small style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
              (DBG: {formData.date_of_birth || 'empty'})
            </small>
          </div>
          <div>
            <strong style={{ color: 'var(--text-secondary)' }}>Country:</strong>
            <span style={{ color: 'var(--text-primary)', marginLeft: '0.5rem' }}>
              {formatCountryName(formData.country)}
            </span>
            <small style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
              (DBG: {formData.country || 'empty'})
            </small>
          </div>
          <div>
            <strong style={{ color: 'var(--text-secondary)' }}>City/Town:</strong>
            <span style={{ color: 'var(--text-primary)', marginLeft: '0.5rem' }}>
              {formData.city_or_town || 'Not set'}
            </span>
          </div>
          <div>
            <strong style={{ color: 'var(--text-secondary)' }}>Emergency Contact:</strong>
            <span style={{ color: 'var(--text-primary)', marginLeft: '0.5rem' }}>
              {formatPhoneNumber(formData.emergency_contact_phone, formData.country)}
            </span>
          </div>
          <div>
            <strong style={{ color: 'var(--text-secondary)' }}>National ID:</strong>
            <span style={{ color: 'var(--text-primary)', marginLeft: '0.5rem' }}>
              {formData.national_id_number || 'Not set'}
            </span>
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
          📁 Uploaded Documents
        </h3>
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          <div style={{ 
            padding: '1rem', 
            border: '1px solid var(--border-color)', 
            borderRadius: '6px',
            backgroundColor: 'var(--input-bg)'
          }}>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem', fontSize: '1rem' }}>
              🎓 Education Documents
            </h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0' }}>
              {documents.education_documents || 'No education documents uploaded'}
            </p>
          </div>
          
          <div style={{ 
            padding: '1rem', 
            border: '1px solid var(--border-color)', 
            borderRadius: '6px',
            backgroundColor: 'var(--input-bg)'
          }}>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem', fontSize: '1rem' }}>
              💼 Professional Certifications
            </h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0' }}>
              {documents.professional_documents || 'No professional documents uploaded'}
            </p>
          </div>
          
          <div style={{ 
            padding: '1rem', 
            border: '1px solid var(--border-color)', 
            borderRadius: '6px',
            backgroundColor: 'var(--input-bg)'
          }}>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem', fontSize: '1rem' }}>
              🆔 National ID
            </h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0' }}>
              {documents.national_id_documents || 'No national ID uploaded'}
            </p>
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
          🔒 Change Password
        </h2>
        
        {passwordMessage && (
          <div style={{
            ...messageStyle,
            backgroundColor: passwordMessage.includes('successfully') ? 'var(--alert-success)' : 'var(--alert-danger)',
            color: passwordMessage.includes('successfully') ? 'var(--alert-success-text)' : 'var(--alert-danger-text)'
          }}>
            <span>{passwordMessage}</span>
            <button 
              style={closeButtonStyle}
              onClick={dismissPasswordMessage}
              onMouseEnter={(e) => e.target.style.opacity = '1'}
              onMouseLeave={(e) => e.target.style.opacity = '0.7'}
              title="Dismiss message"
            >
              ×
            </button>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} style={formStyle}>
          <div>
            <label style={labelStyle} htmlFor="currentPassword">
              Current Password *
            </label>
            <input
              type="password"
              id="currentPassword"
              name="currentPassword"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              required
              style={inputStyle}
              placeholder="Enter your current password"
            />
          </div>

          <div>
            <label style={labelStyle} htmlFor="newPassword">
              New Password *
            </label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              required
              style={inputStyle}
              placeholder="Enter your new password (min 6 characters)"
            />
          </div>

          <div>
            <label style={labelStyle} htmlFor="confirmPassword">
              Confirm New Password *
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              required
              style={inputStyle}
              placeholder="Confirm your new password"
            />
          </div>

          <button
            type="submit"
            disabled={passwordLoading}
            style={{
              ...buttonStyle,
              backgroundColor: 'var(--btn-warning)',
              opacity: passwordLoading ? 0.7 : 1,
              cursor: passwordLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {passwordLoading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
