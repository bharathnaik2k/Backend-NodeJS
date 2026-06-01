const pool = require("../config/database");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken"); // ಲಾಗಿನ್ ಟೋಕನ್ ಗಾಗಿ ಬೇಕು

// Signup API Logic
const signup = async (req, res) => {
    try {
        // 1. ಯೂಸರ್ ಕಳುಹಿಸಿದ ಡೇಟಾವನ್ನು ತೆಗೆದುಕೊಳ್ಳುವುದು
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "Please provide name, email, and password." });
        }

        // 2. ಡೇಟಾಬೇಸ್ ನಲ್ಲಿ ಈ ಇಮೇಲ್ ಈಗಾಗಲೇ ಇದೆಯಾ ಎಂದು ಚೆಕ್ ಮಾಡುವುದು
        const userCheck = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ message: "User already exists with this email!" });
        }

        // 3. ಪಾಸ್ವರ್ಡ್ ಅನ್ನು ಹ್ಯಾಶ್ ಮಾಡುವುದು (Security ಗಾಗಿ)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. ಹೊಸ ಯೂಸರ್ ಅನ್ನು ಡೇಟಾಬೇಸ್ ಗೆ ಸೇರಿಸುವುದು
        const newUser = await pool.query(
            "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email",
            [name, email, hashedPassword]
        );

        // 5. ಯಶಸ್ವಿಯಾಗಿದೆ ಎಂದು ರಿಪ್ಲೈ ಕಳುಹಿಸುವುದು
        res.status(201).json({ 
            message: "User registered successfully!", 
            user: newUser.rows[0] 
        });

    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ message: "Server error during signup" });
    }
};

// Login API Logic
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Please provide email and password." });
        }

        // 1. ಡೇಟಾಬೇಸ್ ನಲ್ಲಿ ಯೂಸರ್ ಇದ್ದಾರಾ ಎಂದು ಚೆಕ್ ಮಾಡುವುದು
        const userCheck = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userCheck.rows.length === 0) {
            return res.status(400).json({ message: "Invalid email or password!" });
        }

        const user = userCheck.rows[0];

        // 2. ಪಾಸ್ವರ್ಡ್ ಮ್ಯಾಚ್ ಆಗುತ್ತದೆಯಾ ಎಂದು ಚೆಕ್ ಮಾಡುವುದು
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password!" });
        }

        // 3. Access Token ಜನರೇಟ್ ಮಾಡುವುದು (ಕಡಿಮೆ ಟೈಮ್ ಇರುತ್ತದೆ)
        const accessToken = jwt.sign(
            { id: user.id, email: user.email }, 
            process.env.JWT_SECRET || "fallback_secret", 
            { expiresIn: "15m" } // 15 ನಿಮಿಷಗಳ ಕಾಲ ವ್ಯಾಲಿಡ್ ಇರುತ್ತದೆ
        );

        // 4. Refresh Token ಜನರೇಟ್ ಮಾಡುವುದು (ಹೆಚ್ಚು ಟೈಮ್ ಇರುತ್ತದೆ)
        const refreshToken = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_REFRESH_SECRET || "fallback_refresh_secret",
            { expiresIn: "7d" } // 7 ದಿನಗಳ ಕಾಲ ವ್ಯಾಲಿಡ್ ಇರುತ್ತದೆ
        );

        // ಹೊಸ ಸೇರ್ಪಡೆ: ಈ Refresh Token ಅನ್ನು ಡೇಟಾಬೇಸ್‌ನಲ್ಲಿ ಸೇವ್ ಮಾಡುವುದು (Logout ಗೆ ಬೇಕಾಗುತ್ತದೆ)
        await pool.query("UPDATE users SET refresh_token = $1 WHERE id = $2", [refreshToken, user.id]);

        res.json({
            message: "Login successful!",
            accessToken: accessToken,
            refreshToken: refreshToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Server error during login" });
    }
};

// Profile API Logic (ಯಾರ ಹತ್ತಿರ ಟೋಕನ್ ಇದೆಯೋ ಅವರು ಮಾತ್ರ ನೋಡಬಹುದು)
const getProfile = async (req, res) => {
    try {
        // 1. ಟೋಕನ್ ನಿಂದ ಬಂದ ಯೂಸರ್ ಐಡಿ (req.user.id) ಅನ್ನು ತೆಗೆದುಕೊಳ್ಳುವುದು
        const userId = req.user.id;
        
        // 2. ಆ ಐಡಿ ಬಳಸಿ ಡೇಟಾಬೇಸ್ ನಿಂದ ಅವರ ಸಂಪೂರ್ಣ ಡೇಟಾ ತರುವುದು (ಪಾಸ್ವರ್ಡ್ ಬಿಟ್ಟು)
        const userQuery = await pool.query("SELECT id, name, email, created_at FROM users WHERE id = $1", [userId]);
        
        if (userQuery.rows.length === 0) {
            return res.status(404).json({ message: "User not found!" });
        }

        // 3. ಯಶಸ್ವಿಯಾಗಿ ಡೇಟಾ ಸಿಕ್ಕರೆ ಯೂಸರ್ ಗೆ ಕಳುಹಿಸುವುದು
        res.json({
            message: "Profile data fetched successfully!",
            user: userQuery.rows[0]
        });
    } catch (error) {
        console.error("Profile fetch error:", error);
        res.status(500).json({ message: "Server error while fetching profile" });
    }
};

// Get All Users API Logic (For Testing)
const getAllUsers = async (req, res) => {
    try {
        // ಪಾಸ್ವರ್ಡ್ ಅನ್ನು ಬಿಟ್ಟು ಕೇವಲ id, name, email ಮಾತ್ರ ತರುತ್ತಿದ್ದೇವೆ
        const allUsers = await pool.query("SELECT id, name, email, created_at FROM users");
        res.json(allUsers.rows);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Profile Update API Logic (ಹೆಸರು ಅಥವಾ ಪಾಸ್ವರ್ಡ್ ಬದಲಾಯಿಸಲು)
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id; // ಟೋಕನ್ ನಿಂದ ಯೂಸರ್ ಐಡಿ ಸಿಗುತ್ತದೆ
        const { name, password } = req.body;

        if (!name && !password) {
            return res.status(400).json({ message: "Please provide name or password to update." });
        }

        let updateFields = [];
        let values = [];
        let index = 1;

        // 1. ಯೂಸರ್ ಹೆಸರನ್ನು ಬದಲಾಯಿಸಲು ಕೇಳಿದ್ದರೆ
        if (name) {
            updateFields.push(`name = $${index}`);
            values.push(name);
            index++;
        }

        // 2. ಯೂಸರ್ ಪಾಸ್ವರ್ಡ್ ಅನ್ನು ಬದಲಾಯಿಸಲು ಕೇಳಿದ್ದರೆ
        if (password) {
            // ಹೊಸ ಪಾಸ್ವರ್ಡ್ ಅನ್ನೂ ಸೆಕ್ಯುರಿಟಿಗಾಗಿ ಹ್ಯಾಶ್ ಮಾಡಬೇಕು
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            updateFields.push(`password = $${index}`);
            values.push(hashedPassword);
            index++;
        }

        // ಯೂಸರ್ ಐಡಿಯನ್ನು ಕೊನೆಯದಾಗಿ ಸೇರಿಸುವುದು (WHERE id = $3)
        values.push(userId);
        
        // 3. ಡೇಟಾಬೇಸ್ ಗೆ ಅಂತಿಮ ಅಪ್ಡೇಟ್ ಕಮಾಂಡ್ ಕಳುಹಿಸುವುದು
        const updateQuery = `
            UPDATE users 
            SET ${updateFields.join(", ")} 
            WHERE id = $${index} 
            RETURNING id, name, email
        `;

        const updatedUser = await pool.query(updateQuery, values);

        res.json({
            message: "Profile updated successfully!",
            user: updatedUser.rows[0]
        });

    } catch (error) {
        console.error("Profile update error:", error);
        res.status(500).json({ message: "Server error during profile update" });
    }
};

// Refresh Token API Logic (ಹಳೆಯ ಟೋಕನ್ ಕೊಟ್ಟು ಹೊಸ ಟೋಕನ್ ಪಡೆಯಲು)
const refreshToken = async (req, res) => {
    try {
        const { token } = req.body; // ಯೂಸರ್ ಕಳುಹಿಸುವ ಹಳೆಯ ರಿಫ್ರೆಶ್ ಟೋಕನ್

        if (!token) {
            return res.status(401).json({ message: "Refresh Token is required!" });
        }

        // 1. ಹೊಸ ಸೇರ್ಪಡೆ: ಡೇಟಾಬೇಸ್‌ನಲ್ಲಿ ಈ ಟೋಕನ್ ಇದೆಯಾ ಎಂದು ಚೆಕ್ ಮಾಡುವುದು (Logout ಆದ್ಮೇಲೆ ಇದು ಇರಲ್ಲ)
        const tokenCheck = await pool.query("SELECT * FROM users WHERE refresh_token = $1", [token]);
        if (tokenCheck.rows.length === 0) {
            return res.status(403).json({ message: "Refresh Token is invalid or you have been logged out!" });
        }

        // 2. ಟೋಕನ್ ಒರಿಜಿನಲ್ ಹೌದೋ ಅಲ್ಲವೋ ಎಂದು ಚೆಕ್ ಮಾಡುವುದು
        jwt.verify(token, process.env.JWT_REFRESH_SECRET || "fallback_refresh_secret", (err, user) => {
            if (err) {
                return res.status(403).json({ message: "Invalid or Expired Refresh Token! Please login again." });
            }

            // ಟೋಕನ್ ಸರಿ ಇದ್ದರೆ, ಮತ್ತೆ ಹೊಸ Access Token ಕೊಡುವುದು
            const newAccessToken = jwt.sign(
                { id: user.id, email: user.email },
                process.env.JWT_SECRET || "fallback_secret",
                { expiresIn: "15m" } // ಮತ್ತೆ 15 ನಿಮಿಷ ಟೈಮ್ ಕೊಡುವುದು
            );

            res.json({
                message: "New Access Token generated successfully!",
                accessToken: newAccessToken
            });
        });

    } catch (error) {
        console.error("Refresh token error:", error);
        res.status(500).json({ message: "Server error during token refresh" });
    }
};

// Logout API Logic (Refresh Token ಅನ್ನು ಡೇಟಾಬೇಸ್ ನಿಂದ ಅಳಿಸುವುದು)
const logout = async (req, res) => {
    try {
        const userId = req.user.id; // ಲಾಗಿನ್ ಆದ ಯೂಸರ್ ಐಡಿ (Token ನಿಂದ ಸಿಗುತ್ತದೆ)

        // ಡೇಟಾಬೇಸ್ ನಲ್ಲಿ ಆ ಯೂಸರ್ ನ refresh_token ಅನ್ನು ಖಾಲಿ (NULL) ಮಾಡುವುದು
        await pool.query("UPDATE users SET refresh_token = NULL WHERE id = $1", [userId]);

        res.json({ message: "Logged out successfully! Refresh token destroyed." });
    } catch (error) {
        console.error("Logout error:", error);
        res.status(500).json({ message: "Server error during logout" });
    }
};

module.exports = {
    signup,
    login,
    getProfile,
    getAllUsers,
    refreshToken,
    updateProfile,
    logout
};
