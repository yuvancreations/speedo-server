require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const qs = require("querystring");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Speedo Payment Server Running 🚀");
});

// ✅ Correct PhonePe OAuth (Form-Encoded Body)
app.get("/get-token", async (req, res) => {
  try {
    const response = await axios.post(
      "https://api.phonepe.com/apis/identity-manager/v1/oauth/token",
      qs.stringify({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: "client_credentials",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    res.status(500).json({
      message: "Token generation failed",
      error: error.response?.data || error.message,
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});