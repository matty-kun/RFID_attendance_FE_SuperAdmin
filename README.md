# RFID Attendance System - Super Admin Web App

Modern, tactile web dashboard built for **Super Administrators** to monitor live campus RFID kiosk stations, configure tournament events and attendance sessions, assign gate marshals, view real-time scan telemetry, and export analytical reports.

---

## 🛠 Tech Stack

- **Framework**: React 19 + Vite 6 (SPA)
- **Language**: TypeScript (strict mode)
- **Routing**: React Router DOM (v7)
- **Styling**: Tailwind CSS with custom RFID purple tactile design system
- **Icons**: Lucide React
- **HTTP Client**: Axios with Bearer token interceptor

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
VITE_API_URL=http://localhost:3000/api/v1
```

### 3. Start Development Server
```bash
npm run dev
```
The portal will be live at `http://localhost:5174`.

### 4. Build for Production
```bash
npm run build
```

---

## 📂 Architecture

```
src/
├── components/
│   ├── common/         # Tactile Button, Card, Badge, Input, Modal, Table
│   └── layout/         # Sidebar, Header, SuperAdminLayout, ProtectedRoute
├── context/
│   └── AuthContext.tsx # Super Admin state & permission guards
├── pages/
│   ├── LoginPage.tsx   # Super Admin sign-in & demo prefill
│   ├── DashboardPage.tsx # Real-time telemetry, KPI cards, scan streams
│   ├── EventsPage.tsx  # Create & maintain campus events
│   ├── SessionsPage.tsx # Attendance windows (Morning/Afternoon)
│   ├── LocationsPage.tsx # Kiosks & scanner stations (CITE, Gym, Auditorium)
│   ├── AdminsPage.tsx  # Gate marshals & super admin access control
│   ├── LiveScansPage.tsx # Real-time RFID scan audit stream
│   ├── ReportsPage.tsx # Attendance analytics & CSV exports
│   └── SettingsPage.tsx # Backend ping & infrastructure health
├── services/
│   ├── api.ts          # Axios client with JWT interceptor
│   ├── authService.ts  # Super admin login & credentials
│   └── adminService.ts # Events, sessions, kiosks, marshals API
├── types/
│   └── index.ts        # Shared TypeScript domain contracts
└── utils/
    └── cn.ts           # Tailwind merge & clsx utility
```
