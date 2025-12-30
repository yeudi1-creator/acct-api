require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// הגשת ה-HTML מהשרת עצמו קודם
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// חיבור ל-MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected ✅"))
  .catch(err => console.error("MongoDB error ❌", err));

// מודל ליד
const LeadSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  phone: String,
  email: String,
  createdAt: { type: Date, default: Date.now }
});

const Lead = mongoose.model("Lead", LeadSchema);

// פונקציה לשליחת מייל עם פרטי ליד
async function sendLeadEmail(lead) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const targets = process.env.EMAIL_TARGETS
    ? process.env.EMAIL_TARGETS.split(",")
    : [];

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: targets.map(t => t.trim()).join(", "),
    subject: `ליד חדש מ-${lead.firstName} ${lead.lastName}`,
    html: `
      <h2>פרטי הליד</h2>
      <p><strong>שם פרטי:</strong> ${lead.firstName}</p>
      <p><strong>שם משפחה:</strong> ${lead.lastName}</p>
      <p><strong>טלפון:</strong> ${lead.phone}</p>
      <p><strong>אימייל:</strong> ${lead.email}</p>
      <p><strong>נשלח בתאריך:</strong> ${lead.createdAt}</p>
    `
  };

  await transporter.sendMail(mailOptions);
}

// API לקבלת לידים
app.post("/api/leads", async (req, res) => {
  try {
    console.log("📥 BODY שהגיע מהטופס:", req.body);

    const lead = new Lead(req.body);
    await lead.save();

    await sendLeadEmail(lead);

    res.status(201).json({
      success: true,
      message: "הליד נשמר והודעה נשלחה למייל ✅"
    });
  } catch (err) {
    console.error("❌ שגיאה בשמירת ליד או שליחת מייל:", err);
    res.status(500).json({
      success: false,
      message: "שגיאה בשמירת הליד או שליחת המייל ❌"
    });
  }
});

// הפעלת שרת
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🚀`);
});
