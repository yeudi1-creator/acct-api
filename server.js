require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const { Resend } = require("resend");
const path = require("path");

const app = express();
app.use(express.json());

// ==== 1) התחברות ל-MongoDB ====

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected ✅"))
  .catch(err => console.error("MongoDB error ❌", err));

// ==== 2) הגדרת Resend API ====

const resend = new Resend(process.env.RESEND_KEY);

// ==== 3) מודל ללידים ====

const LeadSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  phone: String,
  email: String,
  createdAt: { type: Date, default: Date.now }
});

const Lead = mongoose.model("Lead", LeadSchema);

// ==== 4) API לקבלת לידים ושילוח מייל ====

app.post("/api/leads", async (req, res) => {
  try {
    const { firstName, lastName, phone, email } = req.body;

    // שמירה למסד
    const lead = new Lead({ firstName, lastName, phone, email });
    await lead.save();
    console.log("📥 Lead saved:", lead);

    // שליחת מייל דרך Resend
    const result = await resend.emails.send({
      from: process.env.EMAIL_SENDER,          // לדוגמא: no-reply@yourdomain.com
      to: process.env.EMAIL_TARGETS.split(","), // נמענים מ־.env
      subject: `ליד חדש מ-${firstName} ${lastName}`,
      html: `
        <h2>📨 ליד חדש הגיע</h2>
        <p><strong>שם פרטי:</strong> ${firstName}</p>
        <p><strong>שם משפחה:</strong> ${lastName}</p>
        <p><strong>טלפון:</strong> ${phone}</p>
        <p><strong>אימייל:</strong> ${email}</p>
        <p><strong>נשלח בתאריך:</strong> ${lead.createdAt}</p>
      `
    });

    console.log("📧 Mail sent:", result);

    return res.status(201).json({
      success: true,
      message: "הליד נשלח בהצלחה והמייל נשלח ✅"
    });
  } catch (err) {
    console.error("❌ Error saving lead or sending mail:", err);
    return res.status(500).json({
      success: false,
      message: "שגיאה בשליחה ❌"
    });
  }
});

// ==== 5) הגשת ה-HTML מתוך public ====

app.use(express.static(path.join(__dirname, "public")));

// כשפותחים את הבסיס Render או localhost → מראה את index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ==== 6) הרצת השרת ====

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🚀`);
});
