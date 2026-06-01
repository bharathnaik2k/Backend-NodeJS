const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const verifyToken = require("../middlewares/authMiddleware"); // ನಮ್ಮ ಗಾರ್ಡ್ ಫೈಲ್ ಅನ್ನು ಇಂಪೋರ್ಟ್ ಮಾಡುವುದು

// ಇದು /signup ಎಂಬ URL ಗೆ ಬರುವ POST ರಿಕ್ವೆಸ್ಟ್ ಅನ್ನು ಕಂಟ್ರೋಲರ್‌ಗೆ ಕಳುಹಿಸುತ್ತದೆ
router.post("/signup", authController.signup);

// ಇದು /login ಎಂಬ URL ಗೆ ಬರುವ POST ರಿಕ್ವೆಸ್ಟ್ ಅನ್ನು ಕಂಟ್ರೋಲರ್‌ಗೆ ಕಳುಹಿಸುತ್ತದೆ
router.post("/login", authController.login);

// ಲಾಗಿನ್ ಆದವರಿಗೆ ಮಾತ್ರ ಪ್ರೊಫೈಲ್ ನೋಡಲು ಅವಕಾಶ (ನಡುವೆ verifyToken ಸೆಕ್ಯುರಿಟಿ ಗಾರ್ಡ್ ಇರುತ್ತಾನೆ)
router.get("/profile", verifyToken, authController.getProfile);

// ಪ್ರೊಫೈಲ್ ಅಪ್ಡೇಟ್ ಮಾಡಲು (ಹೆಸರು ಅಥವಾ ಪಾಸ್ವರ್ಡ್ ಚೇಂಜ್ ಮಾಡಲು)
router.put("/profile", verifyToken, authController.updateProfile);

// ಹೊಸ ಟೋಕನ್ ಪಡೆಯಲು (Refresh Token ಬಳಸಿ)
router.post("/refresh", authController.refreshToken);

// ಲಾಗ್ ಔಟ್ ಆಗಲು (Token ಅನ್ನು ಡೇಟಾಬೇಸ್ ನಿಂದ ಡಿಲೀಟ್ ಮಾಡಲು)
router.post("/logout", verifyToken, authController.logout);

// ಎಲ್ಲಾ ಯೂಸರ್ಸ್ ಅನ್ನು ನೋಡಲು
router.get("/users", authController.getAllUsers);

module.exports = router;
