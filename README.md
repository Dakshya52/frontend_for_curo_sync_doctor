# frontend_for_curo_sync_doctor

Doctor-facing frontend (Vite) app for the **CURO sync** project. Communicates with the backend using `VITE_API_BASE_URL`.

## Requirements
- Node.js (LTS recommended)
- npm

## Setup

### 1) Install dependencies
```sh
cd frontend_for_curo_sync_doctor
npm install
```

### 2) Create `.env`
Create `frontend_for_curo_sync_doctor/.env` (do **not** commit it).

Use this exact template (update values for your environment):
```env
VITE_API_BASE_URL=http://localhost:4000
# Optional: tune doctor polling interval (ms)
VITE_DOCTOR_POLL_INTERVAL_MS=8000
```

### 3) Run the app
```sh
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173` or the next available port).

## Backend dependency
Ensure the backend is running and matches the base URL:
- Backend: `http://localhost:4000`
- Frontend env: `VITE_API_BASE_URL = http://localhost:4000`

## Build (optional)
```sh
npm run build
npm run preview
```

## Troubleshooting
- **API requests fail**: confirm `VITE_API_BASE_URL` and that the backend server is up.
- **Env changes not applied**: restart `npm run dev` after editing `.env`.
