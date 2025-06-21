# SmartEve Deployment Guide

## Prerequisites
- GitHub repository with your code
- PostgreSQL database (Neon, Supabase, or Render PostgreSQL)
- Google Gemini API key

## Step 1: Database Setup

### Option A: Neon (Recommended - Free Tier)
1. Go to [neon.tech](https://neon.tech) and sign up
2. Create a new project: `smarteve-db`
3. Copy your connection string (looks like):
   ```
   postgresql://username:password@ep-something.region.aws.neon.tech/database
   ```

### Option B: Supabase (Free Tier)
1. Go to [supabase.com](https://supabase.com) and sign up
2. Create a new project: `smarteve-db`
3. Go to Settings → Database → Connection string
4. Copy the connection string

### Option C: Render PostgreSQL (Free Tier)
1. In Render dashboard, go to "New +" → "PostgreSQL"
2. Name: `smarteve-db`
3. Copy the connection string from the database dashboard

## Step 2: Deploy Backend to Render

1. **Go to [render.com](https://render.com)** and sign up/login

2. **Create New Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select your repository

3. **Configure Service**:
   - **Name**: `smarteve-backend`
   - **Root Directory**: `Backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`

4. **Add Environment Variables**:
   ```
   DATABASE_URL=your-postgresql-connection-string
   JWT_SECRET_KEY=your-super-secret-jwt-key
   GEMINI_API_KEY=your-gemini-api-key
   ```

5. **Click "Create Web Service"**

6. **Wait for deployment** (5-10 minutes)

7. **Copy your backend URL** (e.g., `https://smarteve-backend.onrender.com`)

## Step 3: Deploy Frontend to Vercel

1. **Go to [vercel.com](https://vercel.com)** and sign up/login

2. **Import Repository**:
   - Click "New Project"
   - Import your GitHub repository
   - Set **Root Directory** to `Frontend`

3. **Configure Project**:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

4. **Add Environment Variables**:
   ```
   VITE_API_URL=https://your-backend-url.onrender.com/api
   ```

5. **Click "Deploy"**

6. **Copy your frontend URL** (e.g., `https://smarteve.vercel.app`)

## Step 4: Update CORS Configuration

After getting your Vercel URL, update the backend CORS:

1. **In Render dashboard**, go to your backend service
2. **Go to Environment** tab
3. **Add new environment variable**:
   ```
   CORS_ORIGINS=https://your-frontend-url.vercel.app
   ```

4. **Update your backend code** to use this environment variable:
   ```python
   # In app.py, replace the CORS origins with:
   cors_origins = os.environ.get('CORS_ORIGINS', 'http://localhost:8080').split(',')
   CORS(app, origins=cors_origins, supports_credentials=True)
   ```

5. **Redeploy** your backend service

## Step 5: Test Your Deployment

1. **Test Backend**: Visit `https://your-backend-url.onrender.com/api/ping`
   - Should return: `{"message": "pong"}`

2. **Test Frontend**: Visit your Vercel URL
   - Should load the login page

3. **Test Full Flow**:
   - Register a new user
   - Login
   - Create a question paper (teacher)
   - Solve a paper (student)

## Environment Variables Summary

### Backend (Render)
```
DATABASE_URL=postgresql://username:password@host:port/database
JWT_SECRET_KEY=your-super-secret-jwt-key
GEMINI_API_KEY=your-gemini-api-key
CORS_ORIGINS=https://your-frontend-url.vercel.app
```

### Frontend (Vercel)
```
VITE_API_URL=https://your-backend-url.onrender.com/api
```

## Troubleshooting

### Common Issues:
1. **Database Connection Error**: Check your DATABASE_URL format
2. **CORS Error**: Make sure CORS_ORIGINS includes your frontend URL
3. **Build Error**: Check if all dependencies are in requirements.txt
4. **API 404**: Ensure your backend routes are working

### Useful Commands:
```bash
# Test backend locally
cd Backend
python app.py

# Test frontend locally
cd Frontend
npm run dev

# Check logs in Render
# Go to your service → Logs tab
```

## Security Notes
- Never commit `.env` files to Git
- Use strong JWT secrets (32+ characters)
- Keep your API keys secure
- Enable HTTPS (automatic with Render/Vercel) 