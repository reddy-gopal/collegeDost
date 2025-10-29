# Phone + OTP Login Setup Guide

This guide will help you set up the complete OTP-based phone authentication system using OTP.dev API.

## 🏗️ Architecture

- **Frontend**: React app with OTP verification UI
- **Backend**: Express.js proxy server (localhost:5000)
- **OTP Service**: OTP.dev API
- **Session**: localStorage-based authentication

## 📋 Prerequisites

- Node.js installed
- npm or yarn package manager
- An active OTP.dev account

## 🚀 Setup Instructions

### Step 1: Install Backend Dependencies

```bash
cd server
npm install
```

### Step 2: Start the Backend Server

```bash
npm start
```

The server will run on `http://localhost:5000`

You should see:
```
✅ OTP Backend running on http://localhost:5000
```

### Step 3: Start the Frontend

In a new terminal:

```bash
cd dost-college-space-06860-87390-99909-04-48214
npm run dev
```

## 🧪 How to Use

1. **Navigate to `/auth`** page
2. **Select a country** from the dropdown (default: India 🇮🇳)
3. **Enter your phone number** (e.g., 9876543210)
4. **Click "Send Code"** - OTP will be sent to your phone
5. **Enter the 4-digit code** you received
6. **Click "Verify Code"** to complete login
7. You'll be redirected to the home page

## 🔄 Features

- ✅ Country code selector (100+ countries)
- ✅ Phone number validation
- ✅ OTP input with 4-digit slots
- ✅ Resend OTP with 30s timer
- ✅ Error handling and toast notifications
- ✅ Loading states
- ✅ Session persistence via localStorage
- ✅ Backend proxy to avoid CORS issues

## 📝 API Endpoints (Backend)

### POST `/api/send-otp`
Sends OTP to phone number

**Request:**
```json
{
  "phone": "+919876543210"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully"
}
```

### POST `/api/verify-otp`
Verifies OTP code

**Request:**
```json
{
  "phone": "+919876543210",
  "code": "1234"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP verified successfully"
}
```

## 🔧 Configuration

### Backend Configuration

API keys are configured in `server/index.js`:

```javascript
const API_KEY = "f39384e1f09080d8237dfa7849a215fe";
const SENDER_ID = "f0a99e9c-8cbe-4ed5-80df-18958c057702";
const TEMPLATE_ID = "19793c18-d417-4087-aeec-0e027ae883d6";
```

### Frontend Configuration

Backend URL is configured in `src/pages/Auth.tsx`:

```typescript
const BACKEND_URL = "http://localhost:5000";
```

## 🐛 Troubleshooting

### Backend not starting
- Check if port 5000 is available
- Try changing the port in `server/index.js`

### OTP not sending
- Verify API keys are correct
- Check OTP.dev account status
- Check console for error messages

### CORS errors
- Make sure backend server is running
- Verify `BACKEND_URL` in frontend

### Phone number validation
- Minimum 10 digits required
- Country code automatically added

## 🔐 Security Notes

- API keys are stored in server-side code
- All requests go through backend proxy
- No direct frontend-to-OTP.dev communication
- Session stored in localStorage

## 📱 Testing

1. Use a real phone number to receive OTP
2. Test with different country codes
3. Test OTP resend functionality
4. Verify session persistence after reload

## 🎯 Next Steps

- Add logout functionality
- Implement session expiry
- Add profile page for phone-authenticated users
- Consider adding 2FA support
- Add analytics for OTP success rates

