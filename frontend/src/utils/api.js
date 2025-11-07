// Backend URL - use environment variable in production, localhost in development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

export async function fetchWithAuth(url, options = {}) {
  // If it's a real API call, use the Railway backend
  if (url.startsWith('/api/') || url.startsWith('/api/dashboard/') || url.startsWith('/auth/')) {
    try {
      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('⚠️ No token found for API call:', url);
        return [];
      }

      // Only log in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log('🚀 Making API call to:', `${API_BASE_URL}${url}`);
      }
      
      const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        credentials: 'include', // Required for CORS with credentials
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Only log in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ API Response data:', data);
      }
      
      // Transform data to match frontend expectations
      if (url === '/api/dashboard/appointments') {
        return data.map(appointment => ({
          ...appointment,
          student_name: appointment.telegram_username ? 
            `@${appointment.telegram_username}` : 
            `Student #${appointment.student_id}`,
          notes: appointment.notes || 'No notes available'
        }));
      }
      
        if (url === '/api/dashboard/announcements') {
          return data.map(announcement => ({
            ...announcement,
            title: announcement.message.substring(0, 50) + (announcement.message.length > 50 ? '...' : ''),
            created_at: announcement.created_at
          }));
        }
        
        if (url === '/api/dashboard/books') {
          return data.map(book => ({
            ...book,
            price: book.price_cents ? book.price_cents / 100 : 0, // Convert cents to regular price
            available: !book.is_sold
          }));
        }
        
        if (url === '/api/dashboard/activities' || url === '/api/activities') {
          return data.map(activity => ({
            ...activity,
            activity_time: activity.activity_time || '09:00',
            activity_date: activity.activity_date ? new Date(activity.activity_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            location: activity.location || 'TBD'
          }));
        }
        
        return data;
    } catch (error) {
      console.error('❌ API call failed:', error);
      // Return empty array instead of mock data
      return [];
    }
  }
  
  // If not an API call, return empty array
  return [];
}

// Helper functions for localStorage (only used for non-API data)
const getStoredData = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return defaultValue;
  }
};

const setStoredData = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
};

// Generate recent activities from all data sources
const generateRecentActivities = () => {
  const activities = [];
  
  // Get all stored data
  const appointments = getStoredData('appointments', []);
  const announcements = getStoredData('announcements', []);
  const books = getStoredData('books', []);
  const activitiesData = getStoredData('activities', []);
  
  // Add appointments
  appointments.forEach(appointment => {
    activities.push({
      id: `appointment-${appointment.id}`,
      type: 'appointment',
      title: `Appointment with ${appointment.student_name || 'Student'}`,
      description: `Scheduled for ${new Date(appointment.start_ts).toLocaleDateString()}`,
      timestamp: appointment.created_at,
      status: appointment.status
    });
  });
  
  // Add announcements
  announcements.forEach(announcement => {
    activities.push({
      id: `announcement-${announcement.id}`,
      type: 'announcement',
      title: announcement.title || announcement.message.substring(0, 30) + '...',
      description: announcement.message,
      timestamp: announcement.created_at,
      is_force: announcement.is_force
    });
  });
  
  // Add books
  books.forEach(book => {
    activities.push({
      id: `book-${book.id}`,
      type: 'book',
      title: `Book: ${book.title}`,
      description: `Added by ${book.author}`,
      timestamp: book.created_at,
      available: book.available
    });
  });
  
  // Add activities
  activitiesData.forEach(activity => {
    activities.push({
      id: `activity-${activity.id}`,
      type: 'activity',
      title: activity.title,
      description: `${activity.activity_date} at ${activity.activity_time}`,
      timestamp: activity.created_at,
      location: activity.location
    });
  });
  
  // Sort by timestamp (newest first)
  return activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

// Create a default export with axios-like API for the new pages
const api = {
  get: async (url) => {
    // If it's a real API call, use the Railway backend
    if (url.startsWith('/api/') || url.startsWith('/api/dashboard/') || url.startsWith('/auth/') || url.startsWith('/api/auth/')) {
      try {
        // Get token from localStorage
        const token = localStorage.getItem('token');
        if (!token) {
          console.warn('⚠️ No token found for API call:', url);
          return [];
        }

        // Only log in development mode
        if (process.env.NODE_ENV === 'development') {
          console.log('🚀 API.get making call to:', `${API_BASE_URL}${url}`);
        }
        
        const response = await fetch(`${API_BASE_URL}${url}`, {
          credentials: 'include', // Required for CORS with credentials
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Only log in development mode
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ API.get Response data:', data);
        }
        
        // Transform data to match frontend expectations
        if (url === '/api/dashboard/appointments') {
          return data.map(appointment => ({
            ...appointment,
            student_name: appointment.telegram_username ? 
              `@${appointment.telegram_username}` : 
              `Student #${appointment.student_id}`,
            notes: appointment.notes || 'No notes available'
          }));
        }
        
        if (url === '/api/dashboard/announcements') {
          return data.map(announcement => ({
            ...announcement,
            title: announcement.message.substring(0, 50) + (announcement.message.length > 50 ? '...' : ''),
            created_at: announcement.created_at
          }));
        }
        
        if (url === '/api/dashboard/books') {
          return data.map(book => ({
            ...book,
            price: book.price_cents ? book.price_cents / 100 : 0, // Convert cents to regular price
            available: !book.is_sold
          }));
        }
        
        if (url === '/api/dashboard/activities' || url === '/api/activities') {
          return data.map(activity => ({
            ...activity,
            activity_time: activity.activity_time || '09:00',
            activity_date: activity.activity_date ? new Date(activity.activity_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            location: activity.location || 'TBD'
          }));
        }
        
        return data;
      } catch (error) {
        console.error('❌ API.get call failed:', error);
        // Return empty array instead of mock data
        return [];
      }
    }
    
    // If not an API call, return empty array
    return [];
  },

  post: async (url, data) => {
    // If it's a real API call, use the Railway backend
    if (url.startsWith('/api/') || url.startsWith('/api/dashboard/') || url.startsWith('/auth/') || url.startsWith('/api/auth/')) {
      try {
        // Get token from localStorage
        const token = localStorage.getItem('token');
        if (!token) {
          console.warn('⚠️ No token found for API call:', url);
          // Don't redirect immediately - let AuthContext handle it
          throw new Error('No authentication token');
        }

        console.log('🚀 API.post making call to:', `${API_BASE_URL}${url}`);
        const response = await fetch(`${API_BASE_URL}${url}`, {
          method: 'POST',
          credentials: 'include', // Required for CORS with credentials
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });
        
        console.log('📡 API.post Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ API.post Response data:', result);
        return result;
      } catch (error) {
        console.error('❌ API.post call failed:', error);
        throw error;
      }
    }
    
    // If not an API call, throw error
    throw new Error('Invalid API call');
  },

  patch: async (url, data) => {
    // If it's a real API call, use the Railway backend
    if (url.startsWith('/api/') || url.startsWith('/api/dashboard/') || url.startsWith('/auth/') || url.startsWith('/api/auth/')) {
      try {
        // Get token from localStorage
        const token = localStorage.getItem('token');
        if (!token) {
          console.warn('⚠️ No token found for API call:', url);
          throw new Error('No authentication token');
        }

        console.log('🚀 API.patch making call to:', `${API_BASE_URL}${url}`);
        const response = await fetch(`${API_BASE_URL}${url}`, {
          method: 'PATCH',
          credentials: 'include', // Required for CORS with credentials
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });
        
        console.log('📡 API.patch Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ API.patch Response data:', result);
        return result;
      } catch (error) {
        console.error('❌ API.patch call failed:', error);
        throw error;
      }
    }
    
    // If not an API call, throw error
    throw new Error('Invalid API call');
  },

  put: async (url, data) => {
    // If it's a real API call, use the Railway backend
    if (url.startsWith('/api/') || url.startsWith('/api/dashboard/') || url.startsWith('/auth/') || url.startsWith('/api/auth/')) {
      try {
        // Get token from localStorage
        const token = localStorage.getItem('token');
        if (!token) {
          console.warn('⚠️ No token found for API call:', url);
          throw new Error('No authentication token');
        }

        console.log('🚀 API.put making call to:', `${API_BASE_URL}${url}`);
        const response = await fetch(`${API_BASE_URL}${url}`, {
          method: 'PUT',
          credentials: 'include', // Required for CORS with credentials
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });
        
        console.log('📡 API.put Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ API.put Response data:', result);
        return result;
      } catch (error) {
        console.error('❌ API.put call failed:', error);
        throw error;
      }
    }
    
    // If not an API call, throw error
    throw new Error('Invalid API call');
  },

  delete: async (url) => {
    // If it's a real API call, use the Railway backend
    if (url.startsWith('/api/') || url.startsWith('/api/dashboard/') || url.startsWith('/auth/') || url.startsWith('/api/auth/')) {
      try {
        // Get token from localStorage
        const token = localStorage.getItem('token');
        if (!token) {
          console.warn('⚠️ No token found for API call:', url);
          throw new Error('No authentication token');
        }

        console.log('🚀 API.delete making call to:', `${API_BASE_URL}${url}`);
        const response = await fetch(`${API_BASE_URL}${url}`, {
          method: 'DELETE',
          credentials: 'include', // Required for CORS with credentials
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        
        console.log('📡 API.delete Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ API.delete Response data:', result);
        return result;
      } catch (error) {
        console.error('❌ API.delete call failed:', error);
        throw error;
      }
    }
    
    // If not an API call, throw error
    throw new Error('Invalid API call');
  }
};

export default api;