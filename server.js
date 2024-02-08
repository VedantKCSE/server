const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const pg = require("pg");
const cors = require("cors");
const nodemailer = require("nodemailer");
const smtpTransport = require("nodemailer-smtp-transport");
const crypto = require("crypto");
const bcrypt = require("bcrypt");

// PostgreSQL connection configuration
const db = new pg.Pool({
  user: "cdrvpeqs",
  host: "rain.db.elephantsql.com",
  database: "cdrvpeqs",
  password: "5MyiH_pPZfuMumjbJKobriKWRXxR6dL-",
  port: 5432,
});

db.connect((err) => {
  if (err) {
    console.error("Database connection error:", err);
  } else {
    console.log("Connected to the database");
    console.log("<--------------------------->");
    console.log("Authentication System Activated");
  }
});

app.use(cors());
app.use(bodyParser.json());

app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  // Hash the password before storing it
  const hashedPassword = await bcrypt.hash(password, 10);

  const sql = "INSERT INTO users (email, password, name) VALUES ($1, $2, $3)";
  db.query(sql, [email, hashedPassword, name], (error, result) => {
    if (error) {
      console.error("Error while signing up:", error);
      res.json({ success: false });
    } else {
      res.json({ success: true });
    }
  });
});

app.post("/signin", (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT * FROM users WHERE email = $1";
  db.query(sql, [email], async (error, results) => {
    if (error) {
      console.error("Error while signing in:", error);
      res.json({ success: false });
    } else {
      if (results.rowCount === 1) {
        const user = results.rows[0];
        const storedPassword = user.password;
        const success = await bcrypt.compare(password, storedPassword);

        if (success) {
          res.json({ success: true });
        } else {
          res.json({ success: false });
        }
      } else {
        res.json({ success: false });
      }
    }
  });
});

// Nodemailer configuration
const transporter = nodemailer.createTransport(
  smtpTransport({
    service: "gmail",
    auth: {
      user: "servicegauth@gmail.com",
      pass: "ywfg errc cvwa kzfq",
    },
  })
);

// Generate a random token for password reset
function generateToken() {
  return crypto.randomBytes(20).toString("hex");
}

// Store the token in the database along with the user's email
function storeResetToken(email, token) {
  const updateTokenSql = "UPDATE users SET reset_token = $1 WHERE email = $2";
  db.query(updateTokenSql, [token, email], (error, result) => {
    if (error) {
      console.error("Error storing reset token:", error);
    }
  });
}

app.post("/forgot-password", (req, res) => {
  const { email } = req.body;
  const resetToken = generateToken();

  // Send reset email
  const resetLink = `http://localhost:5500/forgot/reset.html`;
  const mailOptions = {
    to: email,
    subject: "GAuth Password Reset",
    html: `Click <a href="${resetLink}">here</a> to reset your password.<br> Token: ${resetToken}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending reset email:", error);
      res.json({ success: false });
    } else {
      storeResetToken(email, resetToken);
      console.log("Reset email sent:", info.response);
      res.json({ success: true });
    }
  });
});

app.post("/reset-password", async (req, res) => {
  const { email, password, token } = req.body;

  // Verify the token against the stored token in the database
  const verifyTokenSql =
    "SELECT * FROM users WHERE email = $1 AND reset_token = $2";
  db.query(verifyTokenSql, [email, token], async (error, results) => {
    if (error) {
      console.error("Error verifying reset token:", error);
      res.json({ success: false });
    } else {
      if (results.rowCount === 1) {
        // Update the password and reset token in the database
        const hashedPassword = await bcrypt.hash(password, 10);
        const updatePasswordSql =
          "UPDATE users SET password = $1, reset_token = NULL WHERE email = $2";
        db.query(
          updatePasswordSql,
          [hashedPassword, email],
          (updateError, updateResult) => {
            if (updateError) {
              console.error("Error updating password:", updateError);
              res.json({ success: false });
            } else {
              res.json({ success: true });
            }
          }
        );
      } else {
        // Invalid token or email
        res.json({ success: false });
      }
    }
  });
});

const port = 3000;
app.listen(port, () => {
  console.log("<--------------------------->");
  console.log(`Server is running on port ${port}`);
});
