require("dotenv").config(); // טוען את משתני הסביבה מהקובץ .env
const express = require("express"); // ליצירת שרת Express
const mongoose = require("mongoose"); // ל-MongoDB
const cors = require("cors"); // מאפשר קריאות CORS מהדפדפן
const nodemailer = require("nodemailer"); // לשליחת מיילים

const app = express();

// middleware
app.use(cors()); // מאפשר קריאות ממקורות שונים
app.use(express.json()); // מאפשר קריאת JSON מבקשות POST

// בדיקת שרת בסיסית
app.get("/", (req, res) => {
  res.send("API is running ✅");
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

// פונקציה לשליחת מייל עם כמה נמענים
async function sendLeadEmail(lead) {
  // יצירת טרנספורטר של Nodemailer
  let transporter = nodemailer.createTransport({
    service: "gmail", // שרת Gmail
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  // רשימת מיילים לקבלת הליד
  const targets = process.env.EMAIL_TARGETS.split(","); // מפריד לפי פסיקים למערך

  // הגדרת תוכן המייל
  let mailOptions = {
    from: process.env.EMAIL_USER, // מי שולח
    to: targets, // רשימת נמענים
    subject: `ליד חדש מ-${lead.firstName} ${lead.lastName}`, // נושא
    html: `
      <h2>פרטי הליד</h2>
      <p><strong>שם פרטי:</strong> ${lead.firstName}</p>
      <p><strong>שם משפחה:</strong> ${lead.lastName}</p>
      <p><strong>טלפון:</strong> ${lead.phone}</p>
      <p><strong>אימייל:</strong> ${lead.email}</p>
      <p><strong>נשלח בתאריך:</strong> ${lead.createdAt}</p>
    `
  };

  // שליחת המייל
  await transporter.sendMail(mailOptions);
}

// קבלת ליד
app.post("/api/leads", async (req, res) => {
  try {
    console.log("📥 BODY שהגיע מהטופס:", req.body);

    // שמירת הליד בבסיס הנתונים
    const lead = new Lead(req.body);
    await lead.save();

    // שליחת מייל עם פרטי הליד
    await sendLeadEmail(lead);

    // החזרת תשובה לדפדפן
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
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
