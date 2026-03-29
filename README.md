# Hydroleap IoT Dashboard

A full-stack IoT monitoring platform for water management systems. Real-time sensor data, role-based access control, audit trails, and PDF reporting — built with **FastAPI** (Python) and **React 19**.

---

## What Does This App Do?

- **Admins** manage users, approve registrations, and assign project access
- **Users** monitor live IoT sensor data (pumps, pressure, temperature, flow) on dashboards
- Every change to a project is logged in an **audit trail**
- Users can generate **PDF reports** of historical data
- OTP-based email verification for sign-up and password reset

---

## Table of Contents

1. [What You Need Before Starting](#1-what-you-need-before-starting)
2. [Get the Code](#2-get-the-code)
3. [Set Up AWS](#3-set-up-aws)
4. [Set Up the Backend (Python)](#4-set-up-the-backend-python)
5. [Set Up the Frontend (React)](#5-set-up-the-frontend-react)
6. [Run the App](#6-run-the-app)
7. [AWS DynamoDB Tables](#7-aws-dynamodb-tables)
8. [AWS CloudWatch Setup](#8-aws-cloudwatch-setup)
9. [Project Structure](#9-project-structure)
10. [API Reference](#10-api-reference)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. What You Need Before Starting

Think of this section as your grocery list — you need all of these before you start cooking.

| Tool | Version | How to Check | Download Link |
|------|---------|--------------|---------------|
| Python | 3.11 or newer | `python3 --version` | [python.org](https://www.python.org/downloads/) |
| Node.js | 18 or newer | `node --version` | [nodejs.org](https://nodejs.org/) |
| npm | 9 or newer | `npm --version` | Comes with Node.js |
| Git | Any recent | `git --version` | [git-scm.com](https://git-scm.com/) |
| AWS Account | — | — | [aws.amazon.com](https://aws.amazon.com/) |

> **What is a terminal?** It's the black or white box on your computer where you type commands. On Mac it's called "Terminal". On Windows it's "Command Prompt" or "PowerShell". Open it before you start.

---

## 2. Get the Code

Open your terminal and run these commands one at a time. Copy and paste each line, then press Enter.

```bash
# Step 1: Download the code to your computer
git clone https://github.com/ArunMoorthyVenkatesh/Hydroleap.git

# Step 2: Go into the project folder
cd Hydroleap
```

You should now be inside the project folder. You can confirm by running `ls` (Mac/Linux) or `dir` (Windows) — you'll see folders like `hydroleap-backend` and `hydroleap-frontend`.

---

## 3. Set Up AWS

This app uses Amazon Web Services (AWS) to store data and send emails. Follow these steps carefully.

### 3.1 Create an AWS Account

If you don't have one, go to [aws.amazon.com](https://aws.amazon.com/) and sign up. You'll need a credit card but won't be charged for free tier usage in development.

### 3.2 Create an IAM User (Your App's AWS Identity)

This gives the app permission to talk to AWS services.

1. Log in to the [AWS Console](https://console.aws.amazon.com/)
2. Search for **IAM** in the top search bar and click it
3. Click **Users** in the left sidebar
4. Click the orange **Create user** button
5. Enter a username like `hydroleap-app`
6. Click **Next**
7. Select **Attach policies directly**
8. Search for and check these two policies:
   - `AmazonDynamoDBFullAccess`
   - `CloudWatchLogsReadOnlyAccess`
9. Click **Next**, then **Create user**
10. Click on your newly created user, go to the **Security credentials** tab
11. Click **Create access key**
12. Select **Application running outside AWS**, click Next
13. Click **Create access key**
14. **IMPORTANT:** Copy and save both the **Access Key ID** and **Secret Access Key** — you won't see the secret again!

### 3.3 Create DynamoDB Tables

DynamoDB is the database. You need to create these tables manually. See [Section 7](#7-aws-dynamodb-tables) for the full table list and their key schemas.

Quick steps for each table:
1. Go to the [DynamoDB Console](https://console.aws.amazon.com/dynamodb/)
2. Click **Create table**
3. Enter the table name and partition key exactly as listed in Section 7
4. Leave everything else as default (On-demand capacity)
5. Click **Create table**

Repeat for all 10 tables listed in Section 7.

### 3.4 Set Up Gmail for OTP Emails

The app sends verification emails using Gmail.

1. Use an existing Gmail account (or create a new one for the app)
2. Go to your [Google Account settings](https://myaccount.google.com/)
3. Click **Security** in the left sidebar
4. Enable **2-Step Verification** if not already on
5. After enabling 2FA, go back to Security and search for **App passwords**
6. Select app: **Mail**, device: **Other** — name it `Hydroleap`
7. Google will give you a 16-character password like `abcd efgh ijkl mnop`
8. Copy this — it's your `EMAIL_PASS`

---

## 4. Set Up the Backend (Python)

The backend is the engine of the app — it handles all the logic and talks to the database.

### Step 1: Go to the backend folder

```bash
cd hydroleap-backend
```

### Step 2: Create a virtual environment

A virtual environment is like a clean room just for this app's Python packages — it prevents conflicts with other projects.

```bash
# Create the virtual environment (only do this once)
python3 -m venv env

# Activate it
# On Mac/Linux:
source env/bin/activate

# On Windows:
env\Scripts\activate
```

You'll know it worked when you see `(env)` at the start of your terminal line.

### Step 3: Install Python packages

```bash
pip install -r requirements.txt
```

This downloads all the libraries the app needs. It might take 1-2 minutes.

### Step 4: Create your environment file

The `.env` file stores your secret credentials. **Never share this file or commit it to Git.**

```bash
# Copy the example file
cp .env.example .env
```

Now open the `.env` file in a text editor and fill in your values:

```env
AWS_ACCESS_KEY_ID=your_access_key_id_from_step_3.2
AWS_SECRET_ACCESS_KEY=your_secret_access_key_from_step_3.2
AWS_REGION=us-east-1
JWT_SECRET=some-long-random-string-make-it-at-least-32-characters
EMAIL_USER=your.gmail@gmail.com
EMAIL_PASS=your_16_character_app_password
```

> **What is JWT_SECRET?** It's a secret password your app uses to sign login tokens. Make it long and random. You can generate one by running:
> ```bash
> python3 -c "import secrets; print(secrets.token_hex(32))"
> ```

### Step 5: Verify setup

```bash
python3 -c "import fastapi; print('FastAPI installed correctly')"
```

---

## 5. Set Up the Frontend (React)

The frontend is what users see in their browser.

### Step 1: Go to the frontend folder

Open a **new terminal window** (keep the backend terminal open) and run:

```bash
# From the project root
cd hydroleap-frontend
```

### Step 2: Install packages

```bash
npm install
```

This downloads all the JavaScript libraries. It may take 2-5 minutes and will create a `node_modules` folder.

### Step 3: Create the frontend environment file

```bash
# Create a .env file in the hydroleap-frontend folder
touch .env
```

Open it and add:

```env
REACT_APP_API_URL=http://localhost:8000
```

> This tells the frontend where to find the backend. When you deploy to production, change this to your server's URL.

---

## 6. Run the App

You need **two terminals open at the same time** — one for the backend, one for the frontend.

### Terminal 1: Start the Backend

```bash
# Make sure you're in hydroleap-backend with the env activated
cd hydroleap-backend
source env/bin/activate   # (or env\Scripts\activate on Windows)

uvicorn main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
```

Test it by opening [http://localhost:8000](http://localhost:8000) in your browser — you should see `{"status": "ok"}`.

### Terminal 2: Start the Frontend

```bash
# In a separate terminal
cd hydroleap-frontend
npm start
```

Your browser should automatically open to [http://localhost:3000](http://localhost:3000).

### You're Done!

| Service | URL |
|---------|-----|
| Frontend (React app) | http://localhost:3000 |
| Backend (API) | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |

---

## 7. AWS DynamoDB Tables

Create each of these tables in the [DynamoDB Console](https://console.aws.amazon.com/dynamodb/). Use **On-demand** capacity mode for all of them.

### ApprovedUser
| Field | Type | Role |
|-------|------|------|
| `user_id` | String | Partition Key |

Stores all approved/active users.

### ApprovedAdmin
| Field | Type | Role |
|-------|------|------|
| `admin_id` | String | Partition Key |

Stores all approved admins.

### PendingUsers
| Field | Type | Role |
|-------|------|------|
| `user_id` | String | Partition Key |

Users who registered but haven't been approved yet.

### PendingAdmins
| Field | Type | Role |
|-------|------|------|
| `admin_id` | String | Partition Key |

Admins awaiting approval.

### Projects
| Field | Type | Role |
|-------|------|------|
| `projectId` | String | Partition Key |

Stores IoT project metadata and live sensor readings.

### ProjectHistory
| Field | Type | Role |
|-------|------|------|
| `projectId` | String | Partition Key |
| `changedAt` | String | Sort Key |

Audit trail — every change to a project is recorded here as a snapshot.

### UserProjectAccess
| Field | Type | Role |
|-------|------|------|
| `email` | String | Partition Key |
| `projectId` | String | Sort Key |

Maps which users can access which projects.

### CompanyProjectAccess
| Field | Type | Role |
|-------|------|------|
| `company` | String | Partition Key |
| `projectId` | String | Sort Key |

Maps which companies can access which projects.

### PendingProfileUpdates
| Field | Type | Role |
|-------|------|------|
| `update_id` | String | Partition Key |

Stores profile change requests awaiting admin approval.

### UserNotifications
| Field | Type | Role |
|-------|------|------|
| `user_id` | String | Partition Key |
| `notification_id` | String | Sort Key |

In-app notifications for users.

---

## 8. AWS CloudWatch Setup

CloudWatch Logs captures a real-time stream of all database changes (via DynamoDB Streams), used for the audit trail feature.

### Enable DynamoDB Streams on the Projects Table

1. Go to the [DynamoDB Console](https://console.aws.amazon.com/dynamodb/)
2. Click on the **Projects** table
3. Go to the **Exports and streams** tab
4. Under **DynamoDB stream details**, click **Enable**
5. Select **New and old images** and confirm

### Set Up a Lambda Function to Write to CloudWatch

1. Go to the [Lambda Console](https://console.aws.amazon.com/lambda/)
2. Create a new function named `changestreamerlogger`
3. Set the trigger to the DynamoDB **Projects** table stream
4. The Lambda should write events to a CloudWatch log group named `/aws/lambda/changestreamerlogger`

> This step is optional for basic functionality. The rest of the app works without it.

---

## 9. Project Structure

```
IOT-Dashboard/
├── hydroleap-backend/          # Python FastAPI backend
│   ├── main.py                 # App entry point, CORS, router registration
│   ├── requirements.txt        # Python dependencies
│   ├── .env.example            # Environment variable template
│   ├── models/                 # Pydantic data schemas
│   │   ├── user_model.py
│   │   ├── admin_model.py
│   │   └── project_model.py
│   ├── routers/                # API route handlers
│   │   ├── register_router.py  # Registration endpoints
│   │   ├── login_router.py     # Login / JWT issuance
│   │   ├── otp_router.py       # OTP send & verify
│   │   ├── user_router.py      # User profile, sessions, notifications
│   │   ├── admin_routers.py    # Admin approvals, project management
│   │   ├── history_router.py   # Audit trail, CloudWatch logs
│   │   ├── password_router.py  # Forgot password flow
│   │   └── check_router.py     # Email existence check
│   └── utils/
│       ├── dynamo_client.py    # DynamoDB helper functions
│       ├── email_utils.py      # Gmail SMTP email sender
│       └── otp_utils.py        # OTP generation and validation
│
├── hydroleap-frontend/         # React 19 frontend
│   ├── package.json
│   ├── public/
│   └── src/
│       ├── App.js              # Routes + lazy loading
│       ├── index.css           # Global styles + design tokens
│       ├── services/
│       │   └── api.js          # Centralized API calls (axios)
│       ├── context/
│       │   └── AuthContext.js  # Auth state management
│       └── components/         # 39 UI components
│
└── README.md
```

---

## 10. API Reference

The full interactive API docs are at [http://localhost:8000/docs](http://localhost:8000/docs) when the backend is running.

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register` | Register a new user or admin |
| POST | `/api/otp/send` | Send OTP to email |
| POST | `/api/otp/verify` | Verify OTP |
| POST | `/api/login` | Login and receive JWT token |
| POST | `/api/auth/forgot-password/send-otp` | Send password reset OTP |
| POST | `/api/auth/forgot-password/reset` | Reset password with OTP |

### User Endpoints (require `Authorization: Bearer <token>` header)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/me` | Get current user profile |
| PATCH | `/api/user/me` | Update profile |
| POST | `/api/user/change-password` | Change password |
| GET | `/api/user/starred` | Get starred projects |
| POST | `/api/user/starred/toggle` | Star/unstar a project |
| GET | `/api/user/notifications` | Get notifications |
| POST | `/api/user/notifications/mark-read` | Mark notifications as read |
| GET | `/api/user/sessions/active` | List active sessions |
| POST | `/api/user/logout` | Logout current session |

### Admin Endpoints (require `Authorization: Bearer <adminToken>` header)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/me` | Get admin profile |
| GET | `/api/admin/pending-users` | List users awaiting approval |
| POST | `/api/admin/handle-user-request` | Approve or reject a user |
| GET | `/api/admin/pending-admins` | List admins awaiting approval |
| POST | `/api/admin/handle-admin-request` | Approve or reject an admin |
| GET | `/api/projects` | List all projects |
| POST | `/api/user-accesses/assign` | Grant user access to a project |
| POST | `/api/user-accesses/remove` | Revoke user access |
| POST | `/api/company-accesses/assign` | Grant company access to a project |
| POST | `/api/company-accesses/remove` | Revoke company access |

### History Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/history/projects` | Create a project |
| PUT | `/api/history/projects/{project_id}` | Update a project |
| DELETE | `/api/history/projects/{project_id}` | Delete a project |
| GET | `/api/history/history/{project_id}` | Get audit trail for a project |
| GET | `/api/history/cloudwatch/logs` | Get DynamoDB stream events |

---

## 11. Troubleshooting

### "Module not found" or "ImportError" on backend

Make sure your virtual environment is activated — you should see `(env)` in your terminal. If not:
```bash
source env/bin/activate  # Mac/Linux
env\Scripts\activate     # Windows
```

### "npm: command not found"

Node.js is not installed. Download it from [nodejs.org](https://nodejs.org/) and restart your terminal.

### "NoCredentialsError" from AWS

Your `.env` file has incorrect or missing AWS credentials. Double-check `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.

### Emails not sending

- Make sure `EMAIL_PASS` is a **Gmail App Password**, not your regular Gmail password
- 2-Step Verification must be enabled on your Gmail account
- Check that `EMAIL_USER` is the full Gmail address (e.g., `yourname@gmail.com`)

### Frontend shows blank page or "Network Error"

- Make sure the backend is running on port 8000
- Check that `REACT_APP_API_URL=http://localhost:8000` is in `hydroleap-frontend/.env`
- Open browser DevTools (F12) > Console tab for error details

### DynamoDB "ResourceNotFoundException"

A table doesn't exist yet. Check Section 7 and create all required tables in your AWS region. Make sure `AWS_REGION` in `.env` matches the region where you created the tables.

### Port already in use

```bash
# Kill whatever is on port 8000
lsof -ti:8000 | xargs kill -9

# Kill whatever is on port 3000
lsof -ti:3000 | xargs kill -9
```

---

## Key Features

| Feature | Description |
|---------|-------------|
| OTP Registration | Email verification via one-time password |
| Role-Based Auth | Separate flows for users and admins |
| Admin Approvals | Admins manually approve user and admin registrations |
| Company Access | Assign project access by company or individual user |
| Real-Time IoT | Dashboard polls live sensor readings (pump, pressure, flow, temperature) |
| Gauge Displays | Visual speedometer-style gauges for sensor values |
| Audit Trail | Full history of every project change with timestamps |
| Interactive Graphs | Line charts, bar charts for historical sensor data |
| PDF Reports | Export project data as formatted PDF reports |
| Forgot Password | OTP-based password reset via email |
| Session Management | View and revoke active login sessions |
| Notifications | In-app notification system for users |

---

## Roles Explained

### Hydroleap Admin
The top-level admin. Can approve/reject user and admin registrations, manage all projects, and control access for both companies and individual users.

### Company Admin
A user with admin-level access to a specific company's projects. Can view and manage projects assigned to their company.

### Regular User
Can view IoT dashboards for projects they've been granted access to. Can generate reports and view audit trails.

---

## Tech Stack

**Backend**
- [FastAPI](https://fastapi.tiangolo.com/) — Python web framework
- [Uvicorn](https://www.uvicorn.org/) — ASGI server
- [Boto3](https://boto3.amazonaws.com/v1/documentation/api/latest/index.html) — AWS SDK for Python
- [Pydantic](https://docs.pydantic.dev/) — Data validation

**Frontend**
- [React 19](https://react.dev/) — UI framework
- [React Router 7](https://reactrouter.com/) — Client-side routing
- [Axios](https://axios-http.com/) — HTTP client
- [Chart.js](https://www.chartjs.org/) + [Recharts](https://recharts.org/) — Data visualization
- [react-d3-speedometer](https://www.npmjs.com/package/react-d3-speedometer) — Gauge displays
- [jsPDF](https://parall.ax/products/jspdf) — PDF report generation

**AWS Services**
- DynamoDB — NoSQL database
- CloudWatch Logs — Audit log streaming

---

*Built for Hydroleap — water management IoT monitoring.*
