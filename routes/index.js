const express = require('express');
const router = express.Router();
const path = require('path');
const logger = require('../utils/logger');
const config = require('../utils/config');
const fs = require('fs');

// Route to serve patients.html
router.get('/patients', (req, res, next) => {
    if (req.session.login_id) {
        res.sendFile(path.join(__dirname, '../views/patients.html'));
    } else {
        logger.error("Invalid session. Please log in.");
        res.redirect('/');
    }
});

// Route to serve logs.html
router.get('/logs', (req, res, next) => {
    if (req.session.login_id) {
        // Serve the logs.html file
        res.sendFile(path.join(__dirname, '../views/logs.html'));
    } else {
        logger.error("Invalid session. Please log in.");
        res.redirect('/');
    }
});

// Route to retrieve the latest log entries
router.get('/logstream', (req, res) => {
    // Define the path for the logs directory
    const logsDirectory = config.logFileDirectory;

    // Check if the logs directory exists
    if (!fs.existsSync(logsDirectory)) {
        return res.status(404).json({ error: 'Logs directory not found.' });
    }

    // Get today's date in the YY-MM-DD format
    const currentDate = new Date();
    const year = String(currentDate.getFullYear()).slice(-2); // Get last 2 digits of the year
    const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Month is 0-based, pad with 0 if needed
    const day = String(currentDate.getDate()).padStart(2, '0'); // Pad with 0 if needed
    const formattedDate = `${year}-${month}-${day}`; // Create the formatted date string

    // Construct the expected log file name
    const logFileName = `device_data_log_${formattedDate}.log`;
    const logFilePath = path.join(logsDirectory, logFileName);

    // Check if the specific log file exists
    if (!fs.existsSync(logFilePath)) {
        return res.status(404).json({ error: 'Log file not found for today.' });
    }

    // Read the specific log file
    fs.readFile(logFilePath, 'utf8', (err, data) => {
        if (err) {
            logger.error(`Error reading log file ${logFileName}:`, err);
            return res.status(500).json({ error: 'Error reading log file' });
        }

        // Parse each line in the log file as JSON
        const logEntries = data
            .trim() // Remove leading/trailing whitespace
            .split('\n')
            .filter(entry => entry) // Remove empty lines
            .map(entry => {
                try {
                    return JSON.parse(entry); // Parse each log line
                } catch (parseError) {
                    logger.error('Error parsing log entry:', parseError);
                    return { error: 'Error parsing log entry', entry };
                }
            });

        // Filter out any undefined or null entries
        const filteredLogEntries = logEntries.filter(entry => entry !== undefined && entry !== null);
        res.json(filteredLogEntries);
    });
});

module.exports = router;
