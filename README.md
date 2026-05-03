# Dr.AssistAI — Intelligent Telemedicine Platform

> A full-stack, AI-powered telemedicine platform connecting patients and doctors through HD video consultations, real-time chat, machine learning health screening, digital prescriptions, and secure health records — all in one unified interface.

---

## Table of Contents

- [Overview](#overview)
- [Live Demo & Credentials](#live-demo--credentials)
- [Feature Breakdown](#feature-breakdown)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [WebSocket Events](#websocket-events)
- [ML Models](#ml-models)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## Overview

Dr.AssistAI is a production-grade telemedicine web application built for both patients and healthcare providers. It eliminates the friction of traditional healthcare by letting patients book appointments, conduct video calls, receive AI-powered risk assessments, and manage their entire medical journey from one dashboard. Doctors get a complete practice management suite including scheduling, patient records, digital prescriptions, real-time earnings tracking, and an integrated video consultation room.

The platform is architected as a **monorepo** with a React + Vite frontend, a Node.js + Express REST API backend, MongoDB as the primary database, Socket.io for real-time bidirectional communication, and Python-based ML inference scripts that optionally offload to HuggingFace-hosted models.

---

## Live Demo & Credentials

| Role    | Email                | Password    |
|---------|----------------------|-------------|
| Doctor  | doctor@test.com      | doctor123   |
| Patient | patient@test.com     | patient123  |

Default demo accounts are seeded automatically on first server start via `backend/utils/seedUsers.js`.

---

## Feature Breakdown

### Patient Features

| Feature | Description |
|---------|-------------|
| **Dashboard Overview** | Stat cards for total appointments, upcoming consultations, AI screenings completed, and unread messages |
| **Appointment Booking** | Browse doctors by specialization, view dynamic time slots (respects doctor's availability settings), select date and time, submit reason for visit, and complete mock payment checkout |
| **Video Consultation** | WebRTC HD video calls with peer-to-peer connection, ICE/STUN/TURN support via Metered, mute/unmute, camera toggle, PiP local video |
| **Real-time Chat** | In-appointment messaging during confirmed consultations, read receipts, unread badge counts |
| **Appointment History** | Full appointment log with status badges, cancel requests, delete completed records |
| **AI Health Screening — Diabetes** | 8-field risk model (glucose, BMI, insulin, etc.), sample data presets (low/moderate/high risk), probability bar, PDF report download |
| **AI Health Screening — Heart Disease** | 13-field cardiovascular model, ECG/angina/ST metrics, downloadable medical report |
| **AI Health Screening — Pneumonia** | Chest X-ray image upload with drag-and-drop, binary classification (Normal / Pneumonia), cloud + local inference |
| **AI Health Screening — Brain Tumor** | Brain MRI upload, 4-class classification (Glioma / Meningioma / Pituitary / No Tumor), detailed probability breakdown |
| **Report Scanner (OCR)** | Upload PDF lab reports to auto-fill diabetes or heart disease screening forms via AI extraction |
| **Health Records** | View doctor-created records, upload self-reports with optional file attachments, send reports to a doctor (with $10 fee simulation), mark as read, filter by type |
| **Prescriptions** | View all prescriptions, read medicine/dosage/frequency details, request medication refills |
| **Toast Notifications** | Real-time incoming call alerts, appointment status changes, new prescription/record notifications with action buttons |
| **Dark Mode** | Full dark theme toggle persisted to localStorage, cascades across all components |
| **Multi-language** | Google Translate integration with 13 South Asian / global languages via a custom dropdown |

### Doctor Features

| Feature | Description |
|---------|-------------|
| **Dashboard Overview** | Today's appointments, total earnings, pending feedback queue, total patients |
| **Appointment Management** | Accept/decline/complete appointments, filter by status, start video call, message patient |
| **Patient Directory** | Auto-built from appointment and record data, shows visit count and last visit date |
| **Schedule View** | 7-day upcoming calendar view |
| **Video Consultation** | Initiate calls to confirmed patients, ICE negotiation, call timer, end call |
| **Health Records — Doctor View** | Create records for patients with severity tagging (normal / moderate / severe), add doctor's feedback/notes, attach files, update to notify patients |
| **Prescriptions** | Create new prescriptions with dynamic medicine list builder (name, dosage, frequency, duration), set validity dates, update prescriptions, receive refill requests |
| **Reports & Analytics** | Earnings summary, total consultations, completed consultations, active patients |
| **Wallet & Earnings** | View current balance (earnings minus withdrawals), withdraw to mock bank account, full transaction history with type and amount |
| **Practice Settings** | Set days off, working hours (start/end time), slot duration (15/30/45/60 min), consultation fee |
| **Pending Feedback Queue** | Quick view of health records that still require doctor notes |
| **Unread Indicators** | Badge counts on nav items for pending appointments, unread health records, unread prescriptions, unread messages |

### Platform-wide Features

- JWT authentication with 7-day expiry
- Role-based access control (patient / doctor)
- Mobile-responsive design with slide-in sidebar navigation
- Real-time appointment slot blocking (prevents double booking via WebSocket)
- 5-minute pre-appointment reminders via polling
- Payment simulation with card number formatting, expiry, CVC
- Appointment cancellation refund simulation (reverses doctor earnings)
- Rate limiting (100 req / 15 min per IP)
- CORS with multi-origin support
- Helmet security headers

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18 | Component framework |
| Vite | 5 | Build tool and dev server |
| React Router DOM | 6 | Client-side routing |
| Axios | 1.x | HTTP client with interceptors |
| Socket.io-client | 4.x | WebSocket client |
| jsPDF | 2.x | PDF report generation |
| Lucide React | 0.383 | Icon library |
| TailwindCSS | 3.x | Utility CSS (supplemental) |

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | 18+ | Runtime |
| Express | 4.x | HTTP server framework |
| MongoDB | 6.x | Primary database |
| Mongoose | 7.x | ODM with schema validation |
| Socket.io | 4.x | WebSocket server |
| JWT (jsonwebtoken) | 9.x | Authentication tokens |
| bcryptjs | 2.x | Password hashing |
| Multer | 1.x | File upload handling (memory storage) |
| Helmet | 7.x | Security headers |
| express-rate-limit | 7.x | API rate limiting |
| cors | 2.x | Cross-origin resource sharing |
| dotenv | 16.x | Environment configuration |
| axios | 1.x | HuggingFace API client |

### ML / AI

| Technology | Purpose |
|-----------|---------|
| Python 3.x | ML inference scripts |
| scikit-learn | Diabetes + Heart Disease prediction models |
| PyTorch / TorchVision | Pneumonia + Brain Tumor image models |
| HuggingFace Inference API | Cloud fallback for all models |
| Pillow | Image preprocessing |
| NumPy | Numerical operations |

### Infrastructure

| Service | Purpose |
|---------|---------|
| MongoDB Atlas | Managed database hosting |
| Render | Backend API hosting |
| Vercel / Netlify | Frontend hosting |
| Metered.ca | TURN server credentials for WebRTC |
| HuggingFace | Hosted ML model inference |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (React)                        │
│   PatientDashboard  ←→  WebSocket  ←→  DoctorDashboard      │
│       ↕ REST API                                             │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────────┐
│                    BACKEND (Express)                         │
│  /api/auth  /api/appointments  /api/health-records          │
│  /api/prescriptions  /api/doctors  /api/stats               │
│  /api/predict-diabetes  /api/predict-heart-disease          │
│  /api/predict-pneumonia  /api/predict-brain-tumor           │
│  /api/extract-report  /api/messages                         │
│                                                             │
│         Socket.io Server (user:${userId} rooms)             │
└────────┬──────────────────┬───────────────┬────────────────┘
         │                  │               │
    ┌────▼────┐      ┌──────▼──────┐  ┌────▼────────────┐
    │ MongoDB │      │  Python ML  │  │  HuggingFace    │
    │ Atlas   │      │  Scripts    │  │  API (fallback) │
    └─────────┘      └─────────────┘  └─────────────────┘

WebRTC Video Call (direct peer-to-peer):
Patient  ←── ICE via TURN/STUN ──→  Doctor
         (signaling via Socket.io)
```

### Key Architectural Decisions

**WebSocket Room Strategy** — Each authenticated user joins a room `user:${userId}` on connection. Events are broadcast to rooms rather than socket IDs, so multiple browser tabs for the same user all receive updates correctly.

**ML Inference Chain** — Every prediction endpoint tries HuggingFace first (30s timeout), falls back to local Python subprocess on failure. This gives production-grade reliability without requiring local GPU hardware.

**File Storage** — All uploaded files (health record attachments, X-rays, MRIs) are stored as binary `Buffer` in MongoDB. This avoids the need for a separate object storage service in development.

**Transaction Ledger** — Doctor earnings are tracked as a ledger of `earning` and `withdrawal` transactions rather than a single balance field. The balance is computed as `sum(earnings) - sum(withdrawals)` in a MongoDB aggregation pipeline, making the audit trail complete.

---

## Project Structure

```
dr-assistai/
├── backend/
│   ├── config/
│   │   └── db.js                    # MongoDB connection + seed users
│   ├── controllers/
│   │   ├── appointmentController.js  # CRUD + double-booking check + refunds
│   │   ├── authController.js         # Register, login, JWT, profile
│   │   ├── doctorController.js       # Settings, withdrawals, transactions
│   │   ├── healthRecordController.js # Records CRUD + file serving + read status
│   │   ├── messageController.js      # In-appointment messaging
│   │   ├── predictionController.js   # ML inference orchestration
│   │   ├── prescriptionController.js # Prescriptions + refill requests
│   │   └── statsController.js        # Aggregated dashboard stats
│   ├── middleware/
│   │   ├── auth.js                   # JWT verification middleware
│   │   └── upload.js                 # Multer memory storage config
│   ├── ml_model/
│   │   ├── predict.py                # Diabetes prediction (scikit-learn)
│   │   ├── heart_predict.py          # Heart disease prediction
│   │   ├── pneumonia_predict.py      # Chest X-ray classification (PyTorch)
│   │   ├── brain_tumor_predict.py    # MRI classification (PyTorch)
│   │   └── ocr_extract.py            # PDF medical report extraction
│   ├── models/
│   │   ├── Appointment.js
│   │   ├── BrainTumorPrediction.js
│   │   ├── DiabetesPrediction.js
│   │   ├── HeartDiseasePrediction.js
│   │   ├── HealthRecord.js
│   │   ├── Message.js
│   │   ├── PneumoniaPrediction.js
│   │   ├── Prescription.js
│   │   ├── Transaction.js
│   │   └── User.js
│   ├── routes/
│   │   ├── appointments.js
│   │   ├── auth.js
│   │   ├── doctors.js
│   │   ├── healthRecords.js
│   │   ├── messages.js
│   │   ├── predictions.js
│   │   ├── prescriptions.js
│   │   └── stats.js
│   ├── socket/
│   │   └── index.js                 # Socket.io init, call signaling, rooms
│   ├── utils/
│   │   ├── migrateHealthRecords.js  # One-time data migration script
│   │   └── seedUsers.js             # Default test account creation
│   ├── .env.example
│   ├── package.json
│   └── server.js                    # Express app entry point
│
└── frontend/
    ├── public/
    │   └── assets/
    │       └── doctorimage2.jpeg    # Landing page hero image
    ├── src/
    │   ├── components/
    │   │   ├── AppointmentBooking.jsx   # Doctor select + slot picker + payment
    │   │   ├── BrainTumorPrediction.jsx # MRI upload + classification UI
    │   │   ├── Chat.jsx                 # In-appointment messaging widget
    │   │   ├── DiabetesPrediction.jsx   # Diabetes risk form + history
    │   │   ├── HealthRecords.jsx        # Records list + detail modal + file upload
    │   │   ├── HeartDiseasePrediction.jsx
    │   │   ├── PneumoniaPrediction.jsx  # X-ray drag-and-drop + results
    │   │   ├── Prescriptions.jsx        # Prescription list + refill requests
    │   │   ├── ReportScanner.jsx        # PDF upload + OCR auto-fill
    │   │   ├── UI.jsx                   # Shared component library (Sidebar, StatCard, etc.)
    │   │   └── VideoCall.jsx            # WebRTC video consultation component
    │   ├── contexts/
    │   │   └── AuthContext.jsx          # Auth state, login/register/logout, WS connection
    │   ├── pages/
    │   │   ├── DoctorDashboard.jsx      # Doctor portal (all tabs)
    │   │   ├── Landing.jsx              # Public marketing page
    │   │   ├── Login.jsx                # Auth page with demo account buttons
    │   │   ├── PatientDashboard.jsx     # Patient portal (all tabs)
    │   │   └── Register.jsx             # Patient / doctor registration
    │   ├── services/
    │   │   ├── api.js                   # Re-export barrel for apiClient
    │   │   ├── apiClient.js             # Axios instance + all API functions
    │   │   └── websocket.js             # Socket.io client service class
    │   ├── App.jsx                      # Router + PrivateRoute
    │   ├── index.css                    # Global styles + CSS variables
    │   └── main.jsx
    ├── .env.example
    ├── index.html
    ├── package.json
    └── vite.config.js
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.8+ (for local ML inference, optional)
- MongoDB 6+ (local or Atlas URI)
- Git

### 1 — Clone the repository

```bash
git clone https://github.com/your-username/dr-assistai.git
cd dr-assistai
```

### 2 — Backend setup

```bash
cd backend
cp .env.example .env
# Edit .env with your values (see Environment Variables below)
npm install
npm run dev      # or: node server.js
```

The server starts on `http://localhost:5000` by default. On first run it creates the default doctor and patient demo accounts.

### 3 — Frontend setup

```bash
cd frontend
cp .env.example .env
# Set VITE_API_URL=http://localhost:5000/api
npm install
npm run dev
```

The React app starts on `http://localhost:5173`.

### 4 — Python ML (optional — local inference)

```bash
cd backend/ml_model
pip install scikit-learn torch torchvision pillow numpy pandas
```

If Python is not configured, all prediction endpoints automatically fall back to HuggingFace cloud inference (requires `HF_API_URL` in `.env`).

---

## Environment Variables

### Backend `.env`

```env
# Required
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/telemedicine
JWT_SECRET=your-super-secret-jwt-key-at-least-32-chars

# Server
PORT=5000
NODE_ENV=development

# Frontend origin(s) — comma-separated for multiple
CLIENT_URL=http://localhost:5173,http://localhost:3000

# ML — HuggingFace Space base URL (e.g. https://your-username-your-space.hf.space)
HF_API_URL=https://your-hf-space.hf.space

# Python command (python3 on Linux/macOS, python on Windows)
PYTHON_CMD=python3
```

### Frontend `.env`

```env
# Backend API base URL
VITE_API_URL=http://localhost:5000/api

# WebRTC TURN server (Metered.ca) — optional, falls back to STUN only
VITE_METERED_APP_NAME=your-metered-app-name
VITE_METERED_API_KEY=your-metered-api-key
```

---

## API Reference

All endpoints require `Authorization: Bearer <token>` unless marked **public**.

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | Public | Create patient or doctor account |
| POST | `/api/auth/login` | Public | Login, returns JWT + user object |
| POST | `/api/auth/forgot-password` | Public | Trigger password reset email |
| GET | `/api/auth/me` | ✓ | Get current authenticated user |
| PUT | `/api/auth/profile` | ✓ | Update name, phone, specialization |

### Appointments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/appointments` | ✓ | List own appointments (role-aware) |
| POST | `/api/appointments` | ✓ | Book new appointment + log earnings |
| PATCH | `/api/appointments/:id` | ✓ | Update status; handles refund on cancel |
| DELETE | `/api/appointments/:id` | ✓ | Delete completed/cancelled appointment |
| GET | `/api/appointments/booked-slots` | ✓ | Query `?doctorId=&date=` for taken slots |

### Doctors

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/doctors` | ✓ | List all doctors |
| PUT | `/api/doctors/settings` | Doctor | Update availability & fees |
| POST | `/api/doctors/withdraw` | Doctor | Log withdrawal transaction |
| GET | `/api/doctors/transactions` | Doctor | Full transaction history |

### Health Records

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health-records` | ✓ | List own records (role-aware) |
| POST | `/api/health-records` | ✓ | Create record (multipart with optional file) |
| GET | `/api/health-records/:id` | ✓ | Get single record |
| PATCH | `/api/health-records/:id` | ✓ | Update record (doctor: own; patient: self-created) |
| DELETE | `/api/health-records/:id` | ✓ | Delete record |
| GET | `/api/health-records/:id/file` | ✓ | Stream attached file |
| PATCH | `/api/health-records/:id/read` | Patient | Mark record as read |
| PATCH | `/api/health-records/:id/doctor-read` | Doctor | Mark record as read by doctor |
| GET | `/api/health-records/type/:type` | ✓ | Filter by record type |
| GET | `/api/health-records/patient/:patientId` | Doctor | Doctor's records for a specific patient |
| POST | `/api/health-records/:id/vitals` | Doctor | Add vital sign to record |

### Prescriptions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/prescriptions` | ✓ | List own prescriptions |
| POST | `/api/prescriptions` | Doctor | Create prescription |
| GET | `/api/prescriptions/:id` | ✓ | Get single prescription |
| PATCH | `/api/prescriptions/:id` | Doctor | Update prescription |
| DELETE | `/api/prescriptions/:id` | ✓ | Delete prescription |
| PATCH | `/api/prescriptions/:id/read` | Patient | Mark as read |
| POST | `/api/prescriptions/:id/refill` | Patient | Request refill |
| GET | `/api/prescriptions/patient/:patientId` | Doctor | All prescriptions for a patient |

### Predictions

| Method | Path | Auth | Body | Description |
|--------|------|------|------|-------------|
| POST | `/api/predict-diabetes` | ✓ | JSON: 8 numeric fields | Returns prediction, probability, risk_level |
| GET | `/api/predictions` | ✓ | — | Diabetes prediction history |
| POST | `/api/predict-heart-disease` | ✓ | JSON: 13 numeric fields | Returns prediction_label, probability_disease |
| GET | `/api/heart-predictions` | ✓ | — | Heart disease history |
| POST | `/api/predict-pneumonia` | ✓ | `multipart/form-data`: image file | Returns prediction, probability, risk |
| GET | `/api/pneumonia-predictions` | ✓ | — | Pneumonia screening history |
| POST | `/api/predict-brain-tumor` | ✓ | `multipart/form-data`: image file | Returns prediction, probability, probabilities map |
| GET | `/api/brain-tumor-predictions` | ✓ | — | Brain tumor screening history |
| POST | `/api/extract-report` | ✓ | `multipart/form-data`: report (PDF) + type | Returns extracted field values |
| DELETE | `/api/clear` | ✓ | `{ type: "diabetes"|"heart"|"pneumonia"|"tumor" }` | Clear prediction history |

### Messages

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/messages` | ✓ | Query `?appointmentId=` |
| POST | `/api/messages` | ✓ | Send message (requires confirmed appointment) |
| POST | `/api/messages/read` | ✓ | Mark all messages in appointment as read |

### Stats

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/stats` | ✓ | Dashboard stats (role-aware aggregation) |
| POST | `/api/stats/reset` | ✓ | Clear all records (dev only) |

---

## WebSocket Events

The Socket.io server uses `user:${userId}` rooms. All connected tabs for a user receive events in their room.

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `user:online` | `userId` | Join user room, broadcast online status |
| `call:initiate` | `{ appointmentId, callerId, callerName, receiverId, offer }` | Send WebRTC offer |
| `call:answer` | `{ appointmentId, answer }` | Send WebRTC answer |
| `call:ice-candidate` | `{ appointmentId, candidate, senderId }` | Relay ICE candidate |
| `call:reject` | `{ appointmentId, userId }` | Decline incoming call |
| `call:end` | `{ appointmentId }` | End active call |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `appointment:created` | `{ type, appointment, initiatorId }` | New appointment booked |
| `appointment:updated` | `{ type, appointment, initiatorId }` | Appointment status changed |
| `appointment:deleted` | `{ type, appointmentId, initiatorId }` | Appointment removed |
| `slot:booked` | `{ doctorId, date, time }` | Time slot taken (broadcast) |
| `call:incoming` | `{ appointmentId, callerId, callerName, offer }` | Incoming WebRTC call |
| `call:answered` | `{ appointmentId, answer }` | Remote peer accepted call |
| `call:ice-candidate` | `{ appointmentId, candidate }` | Relay ICE candidate |
| `call:rejected` | `{ appointmentId }` | Remote peer declined |
| `call:ended` | `{ appointmentId }` | Call terminated |
| `prescription:created` | `{ type, prescription, initiatorId }` | New prescription |
| `prescription:updated` | `{ type, prescription, initiatorId }` | Prescription updated |
| `prescription:deleted` | `{ type, prescriptionId, initiatorId }` | Prescription removed |
| `prescription:refill-request` | `{ prescriptionId, patientName, ... }` | Patient requested refill |
| `health-record:created` | `{ type, record, initiatorId }` | New health record |
| `health-record:updated` | `{ type, record, initiatorId }` | Record updated |
| `health-record:deleted` | `{ type, recordId, initiatorId }` | Record deleted |
| `chat:message` | `{ appointmentId, sender, content, senderName, ... }` | New chat message |
| `chat:cleared` | `{ otherId }` | Chat cleared (appointment completed) |
| `user:status` | `{ userId, status: "online"\|"offline" }` | Presence update |

---

## ML Models

### Diabetes Prediction (`predict.py`)

- **Algorithm**: Logistic Regression / Random Forest trained on Pima Indians Diabetes Dataset
- **Features**: Pregnancies, Glucose, BloodPressure, SkinThickness, Insulin, BMI, DiabetesPedigreeFunction, Age
- **Output**: `{ prediction: 0|1, probability: float, risk_level: "Low"|"Moderate"|"High" }`

### Heart Disease Prediction (`heart_predict.py`)

- **Algorithm**: Gradient Boosting / SVM trained on Cleveland Heart Disease Dataset
- **Features**: Age, Sex, ChestPainType, RestingBP, Cholesterol, FastingBS, RestingECG, MaxHeartRate, ExerciseAngina, Oldpeak, STSlope, MajorVessels, Thalassemia
- **Output**: `{ prediction: 0|1, label: string, probability: float, risk_level: string }`

### Pneumonia Detection (`pneumonia_predict.py`)

- **Model**: CNN trained on Chest X-Ray Images (Kaggle)
- **Input**: Base64-encoded PNG/JPEG chest X-ray
- **Output**: `{ prediction: "NORMAL"|"PNEUMONIA", probability: float, risk: string }`

### Brain Tumor Detection (`brain_tumor_predict.py`)

- **Model**: ResNet-based CNN trained on Brain MRI Dataset
- **Input**: Base64-encoded PNG/JPEG brain MRI
- **Classes**: No Tumor, Glioma, Meningioma, Pituitary
- **Output**: `{ prediction: string, probability: float, probabilities: { class: float }, risk: string }`

### OCR Report Extraction (`ocr_extract.py`)

- **Method**: PDF text extraction + regex/NLP matching for medical values
- **Supported Types**: `diabetes` (glucose, BMI, insulin, etc.) | `heart` (cholesterol, BP, ECG, etc.)
- **Output**: `{ extracted: { fieldName: value }, confidence: float }`

All models first attempt HuggingFace Spaces inference. If `HF_API_URL` is unset or the request fails, the backend spawns a local Python subprocess as fallback.

---

## Database Schema

### User

```
name, email, password (hashed), role (patient|doctor|admin),
gender, birthDate, phone, specialization, licenseNumber,
licenseStatus (pending|verified|rejected),
availability: { daysOff[], startTime, endTime, slotDuration, consultationFee, withdrawnAmount }
```

### Appointment

```
patientId (ref User), doctorId (ref User),
patientName, doctorName, date, time, reason,
status (pending|confirmed|completed|cancelled),
fee, paymentStatus (pending|paid|refunded),
readByDoctor
```

### HealthRecord

```
patientId (ref User), doctorId (ref User),
title, type, content, severity (normal|mild|moderate|severe|critical),
notes, fileData (Buffer), fileContentType, fileName,
date, readByPatient, readByDoctor,
vitals[], fee, paymentStatus
```

### Prescription

```
patientId (ref User), doctorId (ref User), doctorName,
diagnosis, medicines[{ name, dosage, frequency, duration }],
advice, status (active|expired|cancelled),
prescribedDate, validUntil,
readByPatient, readByDoctor, refillRequested
```

### Transaction

```
userId (ref User), type (earning|withdrawal),
amount, status (pending|completed|failed),
description, relatedId (ref Appointment|HealthRecord)
```

### Message

```
appointmentId (ref Appointment),
sender (ref User), receiver (ref User),
content, isRead
```

### Prediction Models (DiabetesPrediction, HeartDiseasePrediction, PneumoniaPrediction, BrainTumorPrediction)

Each stores the userId, the input fields, prediction result, probability score, and metadata like filename/filesize for image-based models.

---

## Deployment

### Backend (Render)

1. Connect your GitHub repo to Render
2. Set **Build Command**: `npm install`
3. Set **Start Command**: `node server.js`
4. Add all backend environment variables in the Render dashboard
5. Set `NODE_ENV=production`

### Frontend (Vercel)

1. Import the `frontend/` directory as a Vercel project
2. Set **Framework**: Vite
3. Set `VITE_API_URL` to your Render backend URL (e.g. `https://your-app.onrender.com/api`)
4. Deploy

### MongoDB Atlas

1. Create a free M0 cluster at mongodb.com/atlas
2. Add your Render IP (or 0.0.0.0/0 for development) to the IP allowlist
3. Copy the connection string to `MONGODB_URI`

### HuggingFace Spaces (ML)

1. Create a Gradio or FastAPI Space with your Python ML scripts
2. Copy the Space URL to `HF_API_URL` (e.g. `https://your-username-your-space.hf.space`)
3. The backend will route prediction requests there first, falling back to local Python

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

### Code Style

- Frontend: React functional components, hooks-based state
- Backend: Async/await with try-catch, no callback-style code
- Naming: camelCase for variables/functions, PascalCase for components/models
- Comments: Only where intent is non-obvious
