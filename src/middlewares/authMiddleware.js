const jwt = require("jsonwebtoken");

// ಇದು ನಮ್ಮ ಸೆಕ್ಯುರಿಟಿ ಗಾರ್ಡ್! ಪ್ರತಿಯೊಂದು ಸುರಕ್ಷಿತ ರಿಕ್ವೆಸ್ಟ್ ಬರುವಾಗಲೂ ಇದು ಚೆಕ್ ಮಾಡುತ್ತದೆ.
const verifyToken = (req, res, next) => {
    try {
        // 1. ರಿಕ್ವೆಸ್ಟ್ ನ ಹೆಡರ್ (Headers) ನಲ್ಲಿ Authorization ಇದೆಯಾ ಎಂದು ಹುಡುಕುವುದು
        const authHeader = req.headers["authorization"];

        // 2. ಹೆಡರ್ ಇಲ್ಲದಿದ್ದರೆ ಅಥವಾ 'Bearer ' ಇಂದ ಶುರುವಾಗದಿದ್ದರೆ ಹೊರಗೆ ಕಳುಹಿಸುವುದು
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Access Denied! Token is missing." });
        }

        // 3. 'Bearer ' ಪದವನ್ನು ಬಿಟ್ಟು ಬರೀ ಟೋಕನ್ ಅನ್ನು ಮಾತ್ರ ಬೇರ್ಪಡಿಸುವುದು
        const token = authHeader.split(" ")[1];

        // 4. ಟೋಕನ್ ಒರಿಜಿನಲ್ ಹೌದಾ ಅಂತ ನಮ್ಮ ಸೀಕ್ರೆಟ್ ಕೀ (JWT_SECRET) ಬಳಸಿ ಚೆಕ್ ಮಾಡುವುದು
        const verified = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");

        // 5. ಟೋಕನ್ ಸರಿ ಇದ್ದರೆ, ಅದರೊಳಗಿರುವ ಯೂಸರ್ ಡೇಟಾವನ್ನು (id, email) ಮುಂದಿನ ಕೆಲಸಕ್ಕೆ ಕಳುಹಿಸುವುದು
        req.user = verified; 
        
        // 6. ಎಲ್ಲವೂ ಸರಿ ಇದೆ, ಮುಂದಿನ ಲಾಜಿಕ್ (Controller) ರನ್ ಆಗಲಿ ಎಂದು ಹೇಳುವುದು
        next();
        
    } catch (error) {
        // ಟೋಕನ್ ಎಕ್ಸ್ಪೈರ್ ಆಗಿದ್ದರೆ ಅಥವಾ ಫೇಕ್ ಆಗಿದ್ದರೆ ಈ ಎರರ್ ಬರುತ್ತದೆ
        return res.status(403).json({ message: "Invalid Token!" });
    }
};

module.exports = verifyToken;
