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
- **Deployment**: Vercel (separate frontend & backend projects)

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

**Backend** (`backend/.env`):
```bash
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-super-secret-jwt-key-here
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
LOCAL_API_URL=http://localhost:5000
# Optional: comma-separated additional origins
ALLOWED_ORIGINS=
# Optional: allow any https://*.vercel.app origins (use "true" in Vercel)
ALLOW_VERCEL_PREVIEWS=false
# Telegram bot configuration
BOT_TOKEN=
TELEGRAM_WEBHOOK_URL=
```

**Frontend** (`frontend/.env`):
```bash
# Leave empty to use runtime configuration
VITE_API_BASE_URL=
```

4. Start development servers:

```bash
# Backend (from backend directory)
npm run dev

# Frontend (from frontend directory)
npm run dev
```

## 🌐 Deployment

Deploy both apps to Vercel as separate projects. The frontend uses the `frontend/` directory and the backend uses the `backend/` directory (serverless function at `api/index.js`).  
See `DEPLOYMENT.md` for a detailed step-by-step guide, including required environment variables.

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
│   ├── api/                 # Serverless entry point for Vercel
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/           # React pages
│   │   ├── components/      # Reusable components
│   │   ├── utils/           # API utilities
│   │   └── main.jsx         # React entry point
│   └── package.json
└── README.md
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
