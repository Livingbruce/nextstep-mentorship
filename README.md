# NextStep Mentorship Platform

A complete authentication and counseling services platform for Maseno University.

## 🚀 Features

- 🔐 User Authentication (Login/Logout)
- 👤 User Profile Management
- 🎓 Admin Dashboard
- 📱 Responsive Design
- 🔒 Secure JWT Authentication
- 📅 Appointment Management
- 📚 Book Management
- 📢 Announcements
- 🎯 Activities & Mentorship Programs

## 🛠️ Tech Stack

- **Frontend**: React.js, Vite
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Deployment**: Netlify (Frontend + Backend Functions)

## 📋 Prerequisites

- Node.js 20+
- PostgreSQL database
- Git

## 🏃‍♂️ Quick Start

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Livingbruce/nextstep-mentorship.git
cd nextstep-mentorship
```

2. Install dependencies:
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

3. Set up environment variables:

**Backend** (`.env` in `backend/` directory):
```
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-super-secret-jwt-key-here
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
```

**Frontend** (`.env` in `frontend/` directory):
```
VITE_API_BASE_URL=http://localhost:5000
```

4. Start development servers:

```bash
# Backend (from backend directory)
npm run dev

# Frontend (from frontend directory)
npm run dev
```

## 🌐 Deployment

### Netlify Deployment

The application is configured to deploy on Netlify with:
- Frontend served as static site
- Backend running as Netlify Functions (same domain = no CORS issues)

**Environment Variables** (Set in Netlify Dashboard):

**Backend:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `NODE_ENV=production`
- `FRONTEND_URL` - Your Netlify frontend URL

**Frontend:**
- `VITE_API_BASE_URL` - Leave empty to use relative URLs (recommended)

See `NETLIFY_BACKEND_SETUP.md` for detailed deployment instructions.

## 📁 Project Structure

```
nextstep-mentorship/
├── backend/
│   ├── src/
│   │   ├── controllers/    # Route controllers
│   │   ├── routes/          # API routes
│   │   ├── middleware/       # Auth & security middleware
│   │   ├── db/              # Database connection
│   │   └── index.js         # Express app entry point
│   ├── netlify/
│   │   └── functions/       # Netlify Functions
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/           # React pages
│   │   ├── components/      # Reusable components
│   │   ├── utils/           # API utilities
│   │   └── main.jsx         # React entry point
│   └── package.json
└── netlify.toml             # Netlify configuration
```

## 🔑 API Endpoints

- `GET /api/health` - Health check
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/basic-signup` - User signup
- `GET /api/dashboard/*` - Dashboard endpoints
- And more...

## 📝 License

MIT License

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
