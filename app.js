const express = require("express");
const bodyParser = require('body-parser');
const path = require('path');
const sessions = require('express-session');
const fs = require('fs');

const login = require('./routes/login');
const index = require('./routes/index');
const winston = require('winston');
const connection = require('./db');
const session = require('./session');

const app = express();
app.use(express.json());
const port = process.env.PORT 

// Create log directory if it doesn't exist
const logDirectory = path.join(__dirname, 'logs');
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory);
}


const formatTimestamp = (date) => {
    const year = String(date.getFullYear()).slice(-2); 
    const month = String(date.getMonth() + 1).padStart(2, '0'); 
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};


const timestamp = formatTimestamp(new Date());
const errorLogFile = path.join(logDirectory, `error_logs_${timestamp}.log`);
const combinedLogFile = path.join(logDirectory, `all_logs_${timestamp}.log`);
const deviceDataLogFile = path.join(logDirectory, `device_data_log_${timestamp}.log`);


const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: errorLogFile, level: 'error' }),
        new winston.transports.File({ filename: combinedLogFile })
    ],
});


const deviceDataLogger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: deviceDataLogFile })
    ],
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));


app.set('views', path.join(__dirname, 'views'));

const oneDay = 1000 * 60 * 60 * 24;

app.use(sessions({
    secret: "iudshfaohgiwjoiugf",
    saveUninitialized: true,
    cookie: {
        maxAge: oneDay,
        sameSite: "strict"
    },
    resave: false
}));

app.use('/',session);

app.use(express.static(path.join(__dirname, 'public')));



app.post('/api/patients', (req, res) => {
    const {
        f_patient_id,
        f_name,
        f_account_id,
        f_age,
        f_gender,
        f_device_id,
        f_created           
    } = req.body;

    if (!f_patient_id || !f_name || !f_account_id || typeof f_age === 'undefined' || !f_gender || !f_device_id) {
        logger.error('Missing required fields in request body', {
            f_patient_id, f_name, f_account_id, f_age, f_gender, f_device_id
        });
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    logger.info('POST /api/patients', {
        f_patient_id,
        f_name,
        f_account_id,
        f_age,
        f_gender,
        f_device_id
    });

    const checkDeviceQuery = `
        SELECT f_patient_id FROM t_patient
        WHERE f_device_id = ?
    `;

    connection.query(checkDeviceQuery, [f_device_id], (err, results) => {
        if (err) {
            logger.error('Error checking for existing device ID:', { error: err.message });
            return res.status(500).json({ error: 'Database error while checking device ID', details: err.message });
        }

        if (results.length > 0) {
            const existingPatientId = results[0].f_patient_id;
            logger.info(`Found existing patient with ID: ${existingPatientId} and device ID: ${f_device_id}`);

            const nullifyDeviceQuery = `
                UPDATE t_patient
                SET f_device_id = NULL
                WHERE f_patient_id = ?
            `;

            connection.query(nullifyDeviceQuery, [existingPatientId], (err) => {
                if (err) {
                    logger.error('Error nullifying existing device ID:', { error: err.message });
                    return res.status(500).json({ error: 'Database error while nullifying device ID', details: err.message });
                }

                logger.info(`Device ID nullified for existing patient with ID: ${existingPatientId}`);
                insertNewPatient();  
            });
        } else {

            insertNewPatient();
        }
    });

    function insertNewPatient() {
        const insertQuery = `
            INSERT INTO t_patient (
                f_patient_id, f_name, f_account_id, f_age, f_gender, f_device_id,
                f_created
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            f_patient_id,
            f_name,
            f_account_id,
            f_age,
            f_gender,
            f_device_id,
            f_created || new Date().toISOString()          
        ];

        connection.query(insertQuery, values, (err, result) => {
            if (err) {
                logger.error('Error inserting data into t_patient:', { error: err.message });
                return res.status(500).json({ error: 'Database error while inserting patient data', details: err.message });
            }

            logger.info('Data inserted successfully into t_patient', {
                f_patient_id,
                f_name
            });

            const fetchRecordsQuery = `
                SELECT * FROM t_patient
                ORDER BY f_created DESC
                LIMIT 1000
            `;

            connection.query(fetchRecordsQuery, (err, records) => {
                if (err) {
                    logger.error('Error fetching latest patient records:', { error: err.message });
                    return res.status(500).json({ error: 'Database error while fetching records', details: err.message });
                }

                const newPatientRecord = {
                    f_patient_id,
                    f_name,
                    f_account_id,
                    f_age,
                    f_gender,
                    f_device_id,
                    f_created: f_created || new Date().toISOString()
                };


                const responseRecords = [newPatientRecord, ...records];


                res.status(201).json({
                    message: 'Patient data added successfully',
                    id: f_patient_id,
                    records: responseRecords 
                });
            });
        });
    }
});






app.get('/api/patients', (req, res) => {
    const accountId = req.session.account_id;

    logger.info(`GET /api/patients request received from accountId: ${accountId}`);

    if (!accountId) {
        logger.warn('No active session for accountId:', accountId);
        return res.status(401).json({ message: "No active session. Please log in." });
    }

    const sql = `
        SELECT p.*, 
            (SELECT um.f_volume 
             FROM t_uroflow_meter um 
             WHERE um.f_patient_id = p.f_patient_id 
             ORDER BY um.f_timestamp DESC 
             LIMIT 1) AS f_uroflow_vol,
            (SELECT um.f_timestamp 
             FROM t_uroflow_meter um 
             WHERE um.f_patient_id = p.f_patient_id 
             ORDER BY um.f_timestamp DESC 
             LIMIT 1) AS f_uroflow_recived
        FROM t_patient p
    `;

    connection.query(sql, [accountId], (err, results) => {
        if (err) {
            logger.error('Database query error:', err.message);
            return res.status(500).json({ error: err.message });
        }

        logger.info(`Successfully retrieved ${results.length} patients for accountId: ${accountId}`);
        res.json(results);
    });
});




app.get('/api/hourly-data/:patientId', (req, res) => {
    const patientId = req.params.patientId;

    logger.info(`GET /api/hourly-data request received for patientId: ${patientId}`);

    if (!patientId) {
        logger.warn('Patient ID is required for hourly data retrieval');
        return res.status(400).json({ error: 'Patient ID is required' });
    }

    const query = `
        SELECT f_device_id, f_patient_id, f_timestamp, f_volume 
        FROM t_uroflow_meter 
        WHERE f_patient_id = ? 
        ORDER BY f_timestamp
    `;

    connection.query(query, [patientId], (err, results) => {
        if (err) {
            logger.error('Error retrieving data:', err.message);
            return res.status(500).json({ error: 'Error retrieving data' });
        }

        logger.info(`Successfully retrieved ${results.length} records for patientId: ${patientId}`);

        const hourlyData = {};
        let previousVolume = null; 
        let previousHourKey = null; 

        results.forEach((row) => {
            const timestamp = new Date(row.f_timestamp); // Convert to Date object
            const hourKey = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${String(timestamp.getDate()).padStart(2, '0')} ${String(timestamp.getHours()).padStart(2, '0')}:00:00`;

            // Initialize the hour data if it doesn't exist
            if (!hourlyData[hourKey]) {
                hourlyData[hourKey] = {
                    data: [],
                    deltas: [], 
                    hourlyDeltaSum: 0 
                };
            }

            // Calculate delta only if there is a previous volume
            if (previousVolume !== null && previousHourKey === hourKey) {
                const delta = row.f_volume - previousVolume; // Calculate the delta
                hourlyData[hourKey].deltas.push(Math.abs(delta)); // Store absolute value of delta
            }

            // Store the current row's volume and patient data
            previousVolume = row.f_volume;
            previousHourKey = hourKey; // Update previous hour key for the next iteration

            hourlyData[hourKey].data.push({
                patient_id: row.f_patient_id,
                device_id: row.f_device_id,
                timestamp: timestamp, 
                volume: row.f_volume
            });
        });

        // Calculate the sum of deltas for each hour
        Object.keys(hourlyData).forEach(hour => {
            const hourData = hourlyData[hour];
            hourData.hourlyDeltaSum = hourData.deltas.reduce((sum, delta) => sum + delta, 0);
        });

        const responseData = Object.entries(hourlyData).map(([hour, { data, hourlyDeltaSum }]) => ({
            hour,
            data,
            hourlyDeltaSum 
        }));

        res.json(responseData); 
    });
});



app.post('/api/device-data', (req, res) => {
    const { deviceId, timestamp, signalStrength, ssid, params } = req.body;
    const { status, volume, uom } = params.uroflowMeter;

    const mysqlTimestamp = new Date(timestamp * 1000);
    const formattedDate = mysqlTimestamp.toISOString().slice(0, 10); 
    const formattedTime = mysqlTimestamp.toTimeString().slice(0, 5); 
    const mysqlFormattedTimestamp = `${formattedDate} ${formattedTime}`;


    deviceDataLogger.info(`Received data: Device ID: ${deviceId}, Timestamp: ${timestamp}, Signal Strength: ${signalStrength}`);
    deviceDataLogger.info(`Converted timestamp to MySQL format: ${mysqlFormattedTimestamp}`);

    const findPatientSql = `
        SELECT f_patient_id FROM t_patient
        WHERE f_device_id = ?
    `;

    connection.query(findPatientSql, [deviceId], (err, results) => {
        if (err) {
            logger.error(`Error retrieving patient ID for device: ${err}`);
            return res.status(500).json({ message: 'Failed to retrieve patient data', error: err });
        }

        if (results.length === 0) {
            logger.warn(`No patient found for Device ID: ${deviceId}`);
            return res.status(404).json({ message: 'No patient found for provided device ID' });
        }

        const patientId = results[0].f_patient_id;
        deviceDataLogger.info(`Found patient ID: ${patientId} for Device ID: ${deviceId}`);

        const updatePatientSql = `
            UPDATE t_patient
            SET f_uroflow_vol = ?, f_uroflow_recived = ?
            WHERE f_patient_id = ?
        `;

        connection.query(updatePatientSql, [volume, mysqlFormattedTimestamp, patientId], (err, updateResult) => {
            if (err) {
                logger.error(`Error updating t_patient data: ${err}`);
                return res.status(500).json({ message: 'Failed to update t_patient data', error: err });
            }

            deviceDataLogger.info('t_patient table updated successfully');

            const insertSql = `
                INSERT INTO t_uroflow_meter (f_device_id, f_patient_id, f_timestamp, f_signal_strength, f_ssid, f_status, f_volume, f_uom)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            connection.query(insertSql, [deviceId, patientId, mysqlFormattedTimestamp, signalStrength, ssid, status, volume, uom], (err, result) => {
                if (err) {
                    logger.error(`Error inserting data into t_uroflow_meter: ${err}`);
                    return res.status(500).json({ message: 'Failed to insert data into t_uroflow_meter', error: err });
                } else {
                    deviceDataLogger.info('Data inserted successfully into t_uroflow_meter');
                    return res.status(200).json({ message: 'Data updated in t_patient and inserted into t_uroflow_meter successfully', result });
                }
            });
        });
    });
});

app.get('/api/uroflow/:patient_id', (req, res) => {
    const accountId = req.session.account_id;
    const patientId = req.params.patient_id; 

    if (!accountId) {
        return res.status(403).json({ error: 'Account ID is required' });
    }

    if (!patientId) {
        return res.status(400).json({ error: 'Patient ID is required' });
    }

    const query = `
        SELECT f_device_id, f_patient_id, 
               DATE_FORMAT(f_timestamp, '%y-%m-%d %H:%i') AS formatted_timestamp, 
               f_signal_strength, f_ssid, f_status, f_volume, f_uom
        FROM t_uroflow_meter
        WHERE f_patient_id = ? AND f_device_id IN (
            SELECT f_device_id FROM t_patient WHERE f_account_id = ?
        )
    `;

    connection.query(query, [patientId, accountId], (err, results) => {
        if (err) {
            logger.error('Error retrieving data from t_uroflow_meter:', err); 
            return res.status(500).json({ error: 'Database error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'No data found for the specified patient ID' });
        }

        logger.info('Retrieved data for patient ID:', patientId, results); 
        res.status(200).json({ results });
    });
});


app.get('/api/uroflow', (req, res) => {
    const accountId = req.session.account_id;

    if (!accountId) {
        return res.status(403).json({ error: 'Account ID is required' });
    }

    const query = `
        SELECT f_device_id, f_patient_id, 
               DATE_FORMAT(f_timestamp, '%y-%m-%d %H:%i') AS formatted_timestamp, 
               f_signal_strength, f_ssid, f_status, f_volume, f_uom
        FROM t_uroflow_meter
        WHERE f_device_id IN (
            SELECT f_device_id FROM t_patient WHERE f_account_id = ?
        )
    `;

    connection.query(query, [accountId], (err, results) => {
        if (err) {
            logger.error('Error retrieving data from t_uroflow_meter:', err); 
            return res.status(500).json({ error: 'Database error' });
        }

        logger.info('Retrieved data from t_uroflow_meter:', results);
        res.status(200).json({ results });
    });
});


app.post('/api/updateDevice', (req, res) => {
    const { patientId, newDeviceId } = req.body;

    logger.info(`POST /api/updateDevice request received with patientId: ${patientId} and newDeviceId: ${newDeviceId}`);

    if (!patientId || !newDeviceId) {
        logger.warn('Patient ID and Device ID are required');
        return res.status(400).json({ status: 'FAIL', msg: 'Patient ID and Device ID are required' });
    }

    const updateQuery = 'UPDATE t_patient SET f_device_id = ? WHERE f_patient_id = ?';

    connection.query(updateQuery, [newDeviceId, patientId], (err, result) => {
        if (err) {
            logger.error('Error updating device ID:', err.message);
            return res.status(500).json({ status: 'FAIL', msg: 'Database error' });
        }

        if (result.affectedRows > 0) {
            logger.info(`Device ID for patient ${patientId} updated to ${newDeviceId}`);
            return res.status(200).json({ status: 'SUCCESS', msg: 'Device ID updated successfully' });
        } else {
            logger.warn(`Patient not found for patientId: ${patientId}`);
            return res.status(404).json({ status: 'FAIL', msg: 'Patient not found' });
        }
    });
});

// Routes
app.use('/', login);

app.use('/', index);

// Serve the views
app.get('/uroflow', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'uroflow.html'));
});

app.get('/inflow', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'inflow.html'));
});

// Start the server
app.listen(port, () => {
    console.log(`App listening on port ${port}!`);
});
