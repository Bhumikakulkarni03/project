const path = require('path');
const fs = require('fs');
const winston = require("winston");
require('winston-daily-rotate-file');

const config = require('./config');
const { combine, timestamp, json } = winston.format;

// Ensure log directory exists
if (!fs.existsSync(config.logFileDirectory)) {
    fs.mkdirSync(config.logFileDirectory, { recursive: true });
}

// Set up file rotation transport
const fileRotateTransport = new winston.transports.DailyRotateFile({
    filename: path.join(config.logFileDirectory, 'api-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d',
    json: true
});

// Create logger
const logger = winston.createLogger({
    levels: winston.config.syslog.levels,
    level: "debug",
    format: combine(timestamp(), json()),
    transports: [
        fileRotateTransport,
        new winston.transports.Console() // Console transport for debugging
    ],
});

module.exports = logger;
