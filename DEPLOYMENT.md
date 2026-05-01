# Dr.Assist AI Deployment Guide

This guide provides instructions on how to deploy the Dr.Assist AI platform to production.

## Environment Variables

### Backend (`/backend/.env`)
The following variables must be set in your production environment:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `PORT` | The port the server listens on | `5000` |
| `NODE_ENV` | Set to `production` | `production` |
| `MONGODB_URI` | Your MongoDB connection string | `mongodb+srv://...` |
| `JWT_SECRET` | A long, secure random string | `e.g. openssl rand -base64 32` |
| `CLIENT_URL` | Comma-separated list of allowed origins | `https://dr-assist.onrender.com` |
| `HF_API_URL` | Your Hugging Face Space API URL | `https://user-space.hf.space` |
| `PYTHON_CMD` | Command to run python (usually `python3` on Linux) | `python3` |
| `VITE_METERED_API_KEY` | Metered.ca API Key | `...` |
| `VITE_METERED_APP_NAME` | Metered.ca App Name | `...` |

### Frontend (`/frontend/.env`)
Vite environment variables must be prefixed with `VITE_`.

| Variable | Description | Example |
| :--- | :--- | :--- |
| `VITE_API_URL` | The production URL of your backend API | `https://api.dr-assist.com/api` |
| `VITE_ENV` | Set to `production` | `production` |
| `VITE_METERED_API_KEY` | Same as backend | `...` |
| `VITE_METERED_APP_NAME` | Same as backend | `...` |

## Deployment Steps

### 1. Build the Frontend
Navigate to the frontend directory and run:
```bash
cd frontend
npm install
npm run build
```
This generates a `dist` folder which can be served as static files.

### 2. Start the Backend
Navigate to the backend directory and run:
```bash
cd backend
npm install
npm start
```

## Security Recommendations
1.  **SSL/TLS**: Always serve the application over HTTPS.
2.  **CORS**: Ensure `CLIENT_URL` strictly matches your production frontend URL.
3.  **Secrets**: Never commit `.env` files to version control.
4.  **Database**: Use a managed database service (e.g., MongoDB Atlas) with IP whitelisting.

## Video Calls (TURN Servers)
The application uses Metered.ca for TURN/STUN services. Ensure your API keys are valid and have sufficient quota for production traffic.
