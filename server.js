const express = require("express");
const app = express();
const session = require("express-session");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const cors = require("cors");
const nodemailer = require("nodemailer");
const smtpTransport = require("nodemailer-smtp-transport");
const crypto = require("crypto");
const bcrypt = require("bcrypt"); 

app.use(
  session({
    secret: "vedant&sumedh",
    resave: true,
    saveUninitialized: true,
  })
);

const path = require("path");
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "myappdb",
});

db.connect((err) => {
  if (err) {
    console.error("Database connection error:", err);
  } else {
    console.log("Connected to the database");
    console.log(" ");
    console.log("<--------------------------->");
    console.log(" ");
    console.log("Authentication System Activated");
  }
});

app.use(cors());
app.use(bodyParser.json());

app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  // Hash the password before storing it
  const hashedPassword = await bcrypt.hash(password, 10);

  const sql = "INSERT INTO users (email, password, name) VALUES (?, ?, ?)";
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

  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], async (error, results) => {
    if (error) {
      console.error("Error while signing in:", error);
      res.json({ success: false });
    } else {
      if (results.length === 1) {
        const user = results[0];
        const storedPassword = user.password;
        const success = await bcrypt.compare(password, storedPassword);

        if (success) {
          // Store user data in session
          req.session.user = user;
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


app.get("/dashboard", (req, res) => {
  console.log("Session Data:", req.session);
  res.render("dashboard", { user: req.session.user });
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
  const updateTokenSql = "UPDATE users SET reset_token = ? WHERE email = ?";
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

// Add this to your existing Node.js server code

// ... (existing code)

// app.post("/reset-password", (req, res) => {
//   const { email, password, token } = req.body;

//   // Verify the token against the stored token in the database
//   const verifyTokenSql =
//     "SELECT * FROM users WHERE email = ? AND reset_token = ?";
//   db.query(verifyTokenSql, [email, token], (error, results) => {
//     if (error) {
//       console.error("Error verifying reset token:", error);
//       res.json({ success: false });
//     } else {
//       if (results.length === 1) {
//         // Update the password and reset token in the database
//         const updatePasswordSql =
//           "UPDATE users SET password = ?, reset_token = NULL WHERE email = ?";
//         db.query(
//           updatePasswordSql,
//           [password, email],
//           (updateError, updateResult) => {
//             if (updateError) {
//               console.error("Error updating password:", updateError);
//               res.json({ success: false });
//             } else {
//               res.json({ success: true });
//             }
//           }
//         );
//       } else {
//         // Invalid token or email
//         res.json({ success: false });
//       }
//     }
//   });
// });

app.post("/reset-password", async (req, res) => {
  const { email, password, token } = req.body;

  // Verify the token against the stored token in the database
  const verifyTokenSql =
    "SELECT * FROM users WHERE email = ? AND reset_token = ?";
  db.query(verifyTokenSql, [email, token], async (error, results) => {
    if (error) {
      console.error("Error verifying reset token:", error);
      res.json({ success: false });
    } else {
      if (results.length === 1) {
        // Update the password and reset token in the database
        const hashedPassword = await bcrypt.hash(password, 10);
        const updatePasswordSql =
          "UPDATE users SET password = ?, reset_token = NULL WHERE email = ?";
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
  console.log(" ");
  console.log(`Server is running on port ${port}`);
});
