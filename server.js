require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());

// Root route
app.get("/", (req, res) => {
  res.send("Speedo Payment Server Running 🚀");
});

// ✅ Correct OAuth using Basic Auth
app.get("/get-token", async (req, res) => {
  try {
    const authString = Buffer.from(
      `${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`
    ).toString("base64");

    const response = await axios.post(
      "https://api.phonepe.com/apis/identity-manager/v1/oauth/token",
      "grant_type=client_credentials",
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${authString}`,
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