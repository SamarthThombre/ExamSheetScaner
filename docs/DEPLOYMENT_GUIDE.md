# ExamScanWeb — Unified Single-Server Deployment Guide

This guide explains **what to deploy** and **how to deploy** the entire ExamScanWeb application on a single server for semester pilots, presentations, and production testing.

---

## 🏗️ Deployment Architecture: Unified Monolith

Rather than managing separate frontend and backend hosting services with complex cross-domain cookie and CORS challenges, this setup runs everything under **one unified server**:

```
                       [ Incoming Visitors / Students / Teachers ]
                                            │
                                            ▼
                           ┌─────────────────────────────────┐
                           │   Express Web Server (:5000)    │
                           ├─────────────────────────────────┤
    Web Pages (/, /login)  │ ──► React SPA (client/dist)     │
    API Calls (/api/*)     │ ──► Express REST API            │
    Scan Images (/uploads) │ ──► Static Uploads Storage      │
                           └────────────────┬────────────────┘
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     ▼                                             ▼
          [ Python FastAPI OCR :8000 ]                   [ MongoDB Database :27017 ]
          (Handwritten digit extraction)                 (Or MongoDB Atlas Cloud)
```

### Key Advantages:
* **Zero Cross-Origin / Cookie Blocking**: Frontend and API share the exact same domain. Session cookies are treated as first-party and work seamlessly on every browser and mobile device.
* **No Cold Starts**: Eliminates 50-second wake-up delays experienced on free multi-tier clouds.
* **One Single URL**: One web address for both users and your Google Cloud OAuth console.

---

## 📦 1. What to Deploy (File Checklist)

When deploying to a server (or zipping your codebase), include these folders and exclude build caches:

### ✅ Files & Folders to Upload
```
examscanweb/
├── client/                     # Frontend source & build
│   ├── dist/                   # (Generated via npm run build)
│   ├── src/
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── server/                     # Express Backend
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── uploads/                # Stores scan images (keep empty folder with .gitkeep)
│   ├── package.json
│   ├── server.js
│   └── .env                    # Production environment variables
├── python/
│   └── exam_paper_extractor/   # FastAPI OCR Microservice
│       ├── app/
│       ├── requirements.txt
│       └── ...
└── package.json                # Root automation scripts
```

### ❌ Files to EXCLUDE (Do NOT copy / commit)
* `client/node_modules/` (Re-installed on server via `npm install`)
* `server/node_modules/` (Re-installed on server via `npm install`)
* `python/.../.venv/` (Re-created on server)
* `server/.env` (Create fresh on server with secure production keys)
* `.git/` (If uploading via ZIP)

---

## ☁️ 2. Deploying on Render (Step-by-Step)

Render is a popular cloud hosting platform that connects directly to your GitHub repository and handles automatic builds, deployment, and free SSL certificates (`https://your-app.onrender.com`).

### 2.1 The Two Render Services Required
Since MongoDB Atlas hosts your database in the cloud, Render needs two services from your repository:
1. **`examscan-web` (Web Service - Node.js)**: Runs Express backend AND serves the React frontend build on the same domain.
2. **`examscan-ocr` (Web Service - Python)**: Runs the FastAPI OCR microservice.

---

### 2.2 Method 1: 1-Click Deploy via Render Blueprint (`render.yaml`) ⭐ Recommended
Your repository now includes a [`render.yaml`](../render.yaml) file at the root.

1. Push your latest code to your GitHub repository.
2. Log in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** &rarr; **Blueprint**.
4. Connect your GitHub repository.
5. Render will automatically detect [`render.yaml`](../render.yaml) and configure both services:
   - `examscan-web` (Node.js)
   - `examscan-ocr` (Python 3.10)
6. Fill in the missing secret environment variables in the Render prompt:
   - `MONGO_URI`: Your MongoDB Atlas connection string (`mongodb+srv://...`)
   - `OCR_BASE_URL`: Will be the internal or public URL of `examscan-ocr` (e.g. `https://examscan-ocr.onrender.com`)
   - `CLIENT_URL`: The URL of your web service (e.g. `https://examscan-web.onrender.com`)
7. Click **Apply**. Both services will build and deploy automatically!

---

### 2.3 Method 2: Manual Setup via Render Dashboard

If you prefer configuring the services manually:

#### Service 1: `examscan-web` (Unified Frontend + Backend)
* **Type**: Web Service
* **Runtime**: Node
* **Build Command**:
  ```bash
  npm --prefix client install && npm --prefix client run build && npm --prefix server install
  ```
* **Start Command**:
  ```bash
  cd server && node server.js
  ```
* **Environment Variables**:
  ```env
  NODE_ENV=production
  JWT_SECRET=<generate_a_random_64_char_secret>
  JWT_EXPIRE=7d
  COOKIE_SAME_SITE=lax
  MONGO_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/examscanweb
  OCR_BASE_URL=https://examscan-ocr.onrender.com
  OCR_API_KEY=ep_admin_master_secret_key_deploy2
  CLIENT_URL=https://examscan-web.onrender.com
  GOOGLE_CLIENT_ID=384571428576-9gd4al45asr9f87i5b3055i6tb52sb05.apps.googleusercontent.com
  ```

#### Service 2: `examscan-ocr` (Python FastAPI Engine)
* **Type**: Web Service
* **Runtime**: Python 3
* **Build Command**:
  ```bash
  cd python/exam_paper_extractor && pip install -r requirements.txt && pip install opencv-python-headless
  ```
* **Start Command**:
  ```bash
  cd python/exam_paper_extractor && uvicorn app.main:app --host 0.0.0.0 --port $PORT
  ```
* **Environment Variables**:
  ```env
  PYTHON_VERSION=3.10.12
  ```

> [!NOTE]
> **Render Free Tier Memory Alert**: Render's free tier provides 512 MB of RAM. While the Node/React web service uses ~120 MB (runs effortlessly), Python deep learning libraries (`paddlepaddle` and `ultralytics` YOLO) can consume 800 MB–1 GB RAM during heavy image inference. If your OCR service runs out of memory on the free tier, consider deploying the OCR service on an inexpensive Starter plan ($7/mo with 1 GB RAM) or using a single Linux VPS (Section 3).

---

## 🖥️ 3. Linux VPS / On-Premise Deployment Walkthrough (Step-by-Step)

### Step 1: Install System Prerequisites
Log into your server terminal via SSH:
```bash
sudo apt update && sudo apt upgrade -y

# 1. Install Node.js (v20 LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 2. Install Python 3 & Virtual Environment tools
sudo apt install -y python3 python3-pip python3-venv libgl1-mesa-glx

# 3. Install PM2 (Process Manager for 24/7 uptime)
sudo npm install -g pm2

# 4. Install MongoDB (Or use MongoDB Atlas Cloud URI)
sudo apt install -y mongodb-org || sudo apt install -y mongodb
sudo systemctl enable --now mongodb
```

---

### Step 2: Clone or Transfer the Codebase
```bash
cd /var/www
# Either git clone or SCP transfer your project:
sudo git clone https://github.com/your-username/examscanweb.git
cd examscanweb
sudo chown -R $USER:$USER .
```

---

### Step 3: Setup the Python FastAPI OCR Microservice
```bash
cd python/exam_paper_extractor
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install opencv-python-headless  # Recommended for headless Linux servers
deactivate
cd ../..
```

---

### Step 4: Install Dependencies & Build Frontend
```bash
# Install server dependencies
cd server
npm install --production=false
cd ..

# Install client dependencies & compile production bundle
cd client
npm install
npm run build
cd ..
```
*(This produces the optimized `client/dist` directory that Express serves automatically).*

---

### Step 5: Configure Production Environment Variables

Create `/var/www/examscanweb/server/.env`:
```env
PORT=5000
NODE_ENV=production
MONGO_URI=mongodb://127.0.0.1:27017/examscanweb
# (Or MongoDB Atlas: mongodb+srv://<user>:<password>@cluster0.mongodb.net/examscanweb)

JWT_SECRET=super_secret_64_char_hex_random_key_production_2026
JWT_EXPIRE=7d

OCR_BASE_URL=http://127.0.0.1:8000
OCR_API_KEY=ep_admin_master_secret_key_deploy2

# Your server's public domain or IP:
CLIENT_URL=http://your-server-ip:5000

# Google OAuth Client ID
GOOGLE_CLIENT_ID=384571428576-9gd4al45asr9f87i5b3055i6tb52sb05.apps.googleusercontent.com

COOKIE_SAME_SITE=lax
```

Also create `/var/www/examscanweb/client/.env`:
```env
VITE_GOOGLE_CLIENT_ID=384571428576-9gd4al45asr9f87i5b3055i6tb52sb05.apps.googleusercontent.com
```

---

### Step 6: Start Services 24/7 with PM2

PM2 ensures your Node backend and Python OCR services stay running 24/7 and automatically restart if the server reboots:

```bash
# 1. Start Python FastAPI OCR Service
cd /var/www/examscanweb/python/exam_paper_extractor
pm2 start ".venv/bin/python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000" --name "examscan-ocr"

# 2. Start Express Backend & React SPA
cd /var/www/examscanweb/server
pm2 start server.js --name "examscan-web"

# 3. Configure PM2 to start on system boot
pm2 save
pm2 startup
```

Check service status anytime:
```bash
pm2 status
pm2 logs
```

---

### Step 7: Configure Nginx & Free SSL (Optional but Recommended)

If you have a domain (e.g. `exams.college.edu`):
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Create `/etc/nginx/sites-available/examscanweb`:
```nginx
server {
    server_name exams.college.edu;

    # Maximum file upload size for scanned answer sheets
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site & get free SSL certificate:
```bash
sudo ln -s /etc/nginx/sites-available/examscanweb /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d exams.college.edu
```

---

### Step 8: Update Google Cloud Console

1. Open [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Edit Client ID `384571428576-9gd4al45asr9f87i5b3055i6tb52sb05`.
3. Under **Authorized JavaScript origins**, add your server URL:
   * `http://your-server-ip:5000` (if using direct IP)
   * `https://exams.college.edu` (if using domain with SSL)
4. Save changes.

---

## ⚡ Quick Update Cheat Sheet

Whenever you make code updates in the future, run:
```bash
# Pull latest code
cd /var/www/examscanweb
git pull origin main

# Rebuild React frontend
cd client && npm run build

# Restart Node backend
pm2 restart examscan-web
```
*Zero downtime and takes under 30 seconds.*
