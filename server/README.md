# OTP Backend Proxy Server

This is a simple Express.js backend server that acts as a proxy between your frontend and the OTP.dev API. It helps bypass CORS issues and keeps your API keys secure on the server side.

## Setup

1. **Install dependencies:**
   ```bash
   cd server
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

   The server will run on `http://localhost:5000`

## API Endpoints

### POST `/api/send-otp`
Sends an OTP to the specified phone number.

**Request Body:**
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
Verifies the OTP code entered by the user.

**Request Body:**
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

## Environment Variables

You can set the port using the `PORT` environment variable:

```bash
PORT=5000 npm start
```

## Notes

- The API keys are stored in the server code (for simplicity)
- The server uses CORS to allow requests from localhost
- Error handling is included for better debugging

