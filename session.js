// sessionController.js
const express = require('express');
const router = express.Router();
const connection = require('./db'); 
const path = require('path');
const fs = require('fs');

const winston = require('winston');

const logDirectory = path.join(__dirname, 'logs');
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory);
}


const currentDate = new Date();
const year = String(currentDate.getFullYear()).slice(-2); 
const month = String(currentDate.getMonth() + 1).padStart(2, '0'); 
const day = String(currentDate.getDate()).padStart(2, '0'); 

const timestamp = `${year}-${month}-${day}`; 

const sessionLog = path.join(logDirectory, `session_logs_${timestamp}.log`);
const sessionErrorLog = path.join(logDirectory, `session_error_logs_${timestamp}.log`); 

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: sessionErrorLog, level: 'error' }),
        new winston.transports.File({ filename: sessionLog })
    ],
});

module.exports = logger; 
const LocaleSDateFormat = {
    'en-US': 'MM/DD/YYYY',
    'en-GB': 'DD/MM/YYYY',
    'fr-FR': 'DD/MM/YYYY',
    'de-DE': 'DD.MM.YYYY',
   
};
router.post('/authenticate', (req, res, next) => {

    var action = req.body.action;

    //--------------------------------------------------------------------------------------------------

    if (action == "authenticate") {

        var userId = req.body.userId;
        var pwd = req.body.password;

        var resp = {};
        
        // Escape the user input to prevent SQL injection
        var sqlquery = "SELECT * FROM t_user WHERE f_user_id=" + connection.escape(userId) + " AND f_password=" + connection.escape(pwd);
        logger.debug(sqlquery);
        
        connection.query(sqlquery, function (err, result) {
            if (err) {
                logger.error("Database error: ", err);
                return res.status(500).send("Internal Server Error");
            }

            if (result.length != 0) {
                const user = result[0];

                // Prepare response object
                resp.userId = userId;
                resp.role = user.f_role;
                resp.token = user.f_app_token;
                resp.tz = user.f_timezone;
                resp.locale = user.f_locale;

                // Store account ID and other info in session
                session = req.session;
                session.account_id = user.f_account_id;
                session.login_id = userId; 
                session.user_type = user.f_role; 
                session.tz = user.f_timezone;
                session.locale = user.f_locale;

                // Set date format based on locale
                var temp = LocaleSDateFormat[session.locale];
                session.appDateFmt = temp ? temp : "%d/%m/%y";
                session.appDateTimeFmt = temp ? temp + " %H:%i" : "%d/%m/%y %H:%i";

                session.save(function (err) {
                    if (err) {
                        logger.error("Session save error: ", err);
                        return res.status(500).send("Internal Server Error");
                    }

                    logger.info("User authenticated and session saved");
                    logger.debug("Timezone:", session.tz);
                    logger.debug("Locale:", session.locale);

                    // Send response back to the client
                    res.status(200);
                    res.setHeader('Content-Type', 'application/json');
                    res.send(JSON.stringify(resp));
                });
            } else {
                res.status(400).send("Login failed. Please check your credentials and try again.");
            }
        });
    }
});

router.get('/check-session', (req, res) => {
    // Check if the session contains an account_id
    if (req.session && req.session.account_id) {
        res.status(200).json({
            message: "Session is active",
            account_id: req.session.account_id, 
            userId: req.session.login_id,        
            role: req.session.user_type,         
            tz: req.session.tz,                  
            locale: req.session.locale          
        });
    } else {
        // If account_id is not present in session, return error
        res.status(401).json({ message: "No active session. Please log in." });
    }
  });


module.exports = router;
