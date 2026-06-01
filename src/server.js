// // const express = require('express');
// // const env = require('dotenv');

// // env.config();
// // const app = express();

// // const port = process.env.PORT;

// // app.get('/', (req, res) => res.send('hello world'));

// // app.listen(port, () => {
// //     console.log('hai');
// // })

// const express = require('express');
// const cors = require('cors');

// const app = express();
// app.use(cors()); // enable CORS

// app.get('/', (req, res) => {
//     res.json({ message: 'Hello from backend!' });
// });

// app.listen(3000, () => console.log('Server running on port 3000'));
require("dotenv").config();

const express = require("express");
const pool = require("./config/database");
const authRoutes = require("./routes/authRoutes"); // Auth ರೌಟ್ಸ್ ಇಂಪೋರ್ಟ್ ಮಾಡಿಕೊಳ್ಳುವುದು

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// ನಮ್ಮ API ದಾರಿಗಳು (Routes)
app.use("/api/auth", authRoutes); // ಇದು /api/auth/signup ಎಂದು ಕೆಲಸ ಮಾಡುತ್ತದೆ

console.log(process.env.DB_HOST);

app.get("/", async (req, res) => {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows);
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});