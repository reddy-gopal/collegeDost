import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = "f39384e1f09080d8237dfa7849a215fe";
const SENDER_ID = "f0a99e9c-8cbe-4ed5-80df-18958c057702";
const TEMPLATE_ID = "19793c18-d417-4087-aeec-0e027ae883d6";

// ✅ Send OTP
app.post("/api/send-otp", async (req, res) => {
  const { phone } = req.body;
  
  if (!phone) {
    return res.status(400).json({ error: "Phone number is required" });
  }

  try {
    const response = await fetch("https://api.otp.dev/v1/verifications", {
      method: "POST",
      headers: {
        "X-OTP-Key": API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        data: {
          channel: "sms",
          sender: SENDER_ID,
          phone,
          template: TEMPLATE_ID,
          code_length: 4,
        },
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({ 
        success: false, 
        error: data.error?.message || data.message || "Failed to send OTP" 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: "OTP sent successfully" 
    });
  } catch (err) {
    console.error("Error sending OTP:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message || "Failed to send OTP" 
    });
  }
});

// ✅ Verify OTP
app.post("/api/verify-otp", async (req, res) => {
  const { phone, code } = req.body;
  
  if (!phone || !code) {
    return res.status(400).json({ 
      success: false, 
      error: "Phone number and code are required" 
    });
  }

  try {
    const response = await fetch("https://api.otp.dev/v1/verifications/verify", {
      method: "POST",
      headers: {
        "X-OTP-Key": API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ 
        data: { phone, code } 
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({ 
        success: false, 
        error: data.error?.message || data.message || "Invalid OTP" 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: "OTP verified successfully" 
    });
  } catch (err) {
    console.error("Error verifying OTP:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message || "Failed to verify OTP" 
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ OTP Backend running on http://localhost:${PORT}`);
});

