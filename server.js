require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware (MUST be before routes) ────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Root check ────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("Speedo Payment Server Running 🚀 v2");
});

// ── Helper: Get PhonePe OAuth Token ──────────────────────────
async function getAccessToken() {
  // PhonePe OAuth — always uses the production identity-manager endpoint
  // (even for sandbox CLIENT_IDs starting with SU)
  const params = new URLSearchParams();
  params.append("client_id", process.env.CLIENT_ID);
  params.append("client_secret", process.env.CLIENT_SECRET);
  params.append("grant_type", "client_credentials");
  params.append("client_version", process.env.CLIENT_VERSION || "1"); // ✅ Required

  const response = await axios.post(
    "https://api.phonepe.com/apis/identity-manager/v1/oauth/token",
    params.toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
    }
  );
  return response.data.access_token;
}

// ── GET /get-token (debug endpoint) ─────────────────────────
app.get("/get-token", async (req, res) => {
  try {
    const token = await getAccessToken();
    res.json({ access_token: token });
  } catch (error) {
    res.status(500).json({
      message: "Token generation failed",
      error: error.response?.data || error.message,
    });
  }
});

// ── POST /create-payment ──────────────────────────────────────
app.post("/create-payment", async (req, res) => {
  try {
    const { amount, mobileNumber, bookingId } = req.body;

    if (!amount || !mobileNumber) {
      return res.status(400).json({ message: "amount and mobileNumber are required" });
    }

    // Step 1: Get access token
    const accessToken = await getAccessToken();

    // Step 2: Create unique order ID
    const merchantOrderId = bookingId || "ORDER_" + Date.now();

    // Step 3: Call PhonePe Checkout V2 Pay API (production endpoint works for all accounts)
    const paymentResponse = await axios.post(
      "https://api.phonepe.com/apis/pg/checkout/v2/pay",
      {
        merchantOrderId: merchantOrderId,
        amount: Number(amount) * 100,  // paise
        paymentFlow: {
          type: "PG_CHECKOUT",
          message: "Speedo Airport Ride Booking",
          merchantUrls: {
            redirectUrl: "https://speedo-server.onrender.com/payment-status?txnId=" + merchantOrderId,
          },
        },
      },
      {
        headers: {
          Authorization: `O-Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
      }
    );

    // Return full response — Flutter extracts the redirect URL
    res.json({
      success: true,
      merchantTransactionId: merchantOrderId,
      data: paymentResponse.data,
    });

  } catch (error) {
    console.error("Payment creation error:", error.response?.data || error.message);
    res.status(500).json({
      message: "Payment creation failed",
      error: error.response?.data || error.message,
    });
  }
});

// ── GET /payment-status ───────────────────────────────────────
app.get("/payment-status", async (req, res) => {
  try {
    const { txnId } = req.query;
    if (!txnId) return res.status(400).json({ message: "txnId required" });

    const accessToken = await getAccessToken();

    const statusResponse = await axios.get(
      `https://api.phonepe.com/apis/pg/v1/order/${txnId}/status`,
      {
        headers: {
          Authorization: `O-Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
      }
    );

    const state = statusResponse.data?.state || "FAILED";
    // PhonePe states: COMPLETED, FAILED, PENDING
    res.json({ status: state, raw: statusResponse.data });

  } catch (error) {
    res.status(500).json({ status: "FAILED", error: error.response?.data || error.message });
  }
});

// ── POST /payment-callback (PhonePe webhook) ──────────────────
app.post("/payment-callback", (req, res) => {
  console.log("PhonePe callback received:", JSON.stringify(req.body));
  res.status(200).json({ message: "OK" });
});

// ── Start Server ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Speedo server running on port ${PORT}`);
});