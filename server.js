require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());

// Root check
app.get("/", (req, res) => {
  res.send("Speedo Payment Server Running 🚀");
});

// ✅ PhonePe OAuth using JSON body (correct format)
app.get("/get-token", async (req, res) => {
  try {
    const response = await axios.post(
      "https://api.phonepe.com/apis/identity-manager/v1/oauth/token",
      {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: "client_credentials"
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    res.status(500).json({
      message: "Token generation failed",
      error: error.response?.data || error.message
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// ✅ Create Payment Route (Production)
app.post("/create-payment", async (req, res) => {
  try {
    const { amount, mobileNumber } = req.body;

    if (!amount || !mobileNumber) {
      return res.status(400).json({ message: "Amount and mobileNumber required" });
    }

    // 1️⃣ Get Access Token
    const tokenResponse = await axios.post(
      "https://api.phonepe.com/apis/identity-manager/v1/oauth/token",
      {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: "client_credentials"
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        }
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // 2️⃣ Create Unique Order ID
    const merchantOrderId = "ORDER_" + Date.now();

    // 3️⃣ Payment Request
    const paymentResponse = await axios.post(
      "https://api.phonepe.com/apis/pg/v1/pay",
      {
        merchantId: process.env.MERCHANT_ID,
        merchantOrderId: merchantOrderId,
        amount: amount * 100, // convert to paise
        redirectUrl: "https://speedo-server.onrender.com/payment-status",
        redirectMode: "POST",
        mobileNumber: mobileNumber,
        paymentInstrument: {
          type: "UPI_INTENT"
        }
      },
      {
        headers: {
          Authorization: `O-Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json(paymentResponse.data);

  } catch (error) {
    res.status(500).json({
      message: "Payment creation failed",
      error: error.response?.data || error.message
    });
  }
});