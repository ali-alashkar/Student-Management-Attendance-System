// server.js - Node.js Backend Server for Student Management System
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const os = require('os');
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync('uploads')) {
            fs.mkdirSync('uploads');
        }
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// In-memory database (synchronized across all clients)
let appData = {
    students: [],
    studentRecords: [],
    attendanceLogs: [],
    deletedStudents: [],
    lastUpdated: new Date().toISOString(),
    version: '2.0.0'
};

// Connected clients tracking
let connectedClients = new Map();

// Get local IP addresses
function getLocalIPAddresses() {
    const interfaces = os.networkInterfaces();
    const addresses = [];
    
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                addresses.push(iface.address);
            }
        }
    }
    
    return addresses;
}

// Socket.io connection handling
io.on('connection', (socket) => {
    const clientId = socket.id;
    const clientInfo = {
        id: clientId,
        connectedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        deviceType: 'unknown'
    };
    
    connectedClients.set(clientId, clientInfo);
    
    console.log(`✅ Client connected: ${clientId}`);
    console.log(`📊 Total connected clients: ${connectedClients.size}`);
    
    // Send initial data to newly connected client
    socket.emit('initial-data', appData);
    
    // Broadcast updated client count to all clients
    io.emit('clients-update', {
        count: connectedClients.size,
        clients: Array.from(connectedClients.values())
    });
    
    // Handle client identification
    socket.on('client-info', (info) => {
        clientInfo.deviceType = info.deviceType || 'unknown';
        clientInfo.deviceName = info.deviceName || 'Unknown Device';
        connectedClients.set(clientId, clientInfo);
        
        io.emit('clients-update', {
            count: connectedClients.size,
            clients: Array.from(connectedClients.values())
        });
    });
    
    // Handle data updates from clients
    socket.on('data-update', (data) => {
        console.log(`📝 Data update received from ${clientId}`);
        
        // Update server data
        appData = {
            ...data,
            lastUpdated: new Date().toISOString()
        };
        
        // Broadcast to all OTHER clients (not the sender)
        socket.broadcast.emit('data-sync', appData);
        
        // Send confirmation to sender
        socket.emit('update-confirmed', {
            success: true,
            timestamp: appData.lastUpdated
        });
    });
    
    // Handle student operations
    socket.on('add-student', (studentData) => {
        console.log(`➕ Adding student: ${studentData.fullName}`);
        
        try {
            // Check for duplicate ID
            const exists = appData.students.some(s => s.id === studentData.id);
            if (exists) {
                socket.emit('operation-error', {
                    operation: 'add-student',
                    error: `Student with ID ${studentData.id} already exists`
                });
                return;
            }
            
            // Add student
            const newStudent = {
                ...studentData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            appData.students.push(newStudent);
            appData.lastUpdated = new Date().toISOString();
            
            // Create student record
            const record = {
                id: newStudent.id,
                fullName: newStudent.fullName,
                parentPhone: newStudent.parentPhone,
                sessions: {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            // Initialize sessions
            for (let i = 1; i <= 8; i++) {
                record.sessions[i] = {
                    attendance: null,
                    homework: null,
                    quiz: null,
                    date: null
                };
            }
            
            appData.studentRecords.push(record);
            
            // Broadcast to all clients
            io.emit('data-sync', appData);
            
            socket.emit('operation-success', {
                operation: 'add-student',
                data: newStudent
            });
            
        } catch (error) {
            socket.emit('operation-error', {
                operation: 'add-student',
                error: error.message
            });
        }
    });
    
    // Handle attendance marking
    socket.on('mark-attendance', (attendanceData) => {
        console.log(`✅ Marking attendance for student: ${attendanceData.studentId}`);
        
        try {
            // Update student record
            const recordIndex = appData.studentRecords.findIndex(r => r.id === attendanceData.studentId);
            if (recordIndex >= 0) {
                const session = attendanceData.session;
                appData.studentRecords[recordIndex].sessions[session] = {
                    attendance: attendanceData.attendance,
                    homework: attendanceData.homework,
                    quiz: attendanceData.quiz,
                    date: attendanceData.date || new Date().toLocaleDateString('en-US')
                };
                appData.studentRecords[recordIndex].updatedAt = new Date().toISOString();
            }
            
            // Add attendance log
            const logEntry = {
                id: Date.now() + Math.random() * 1000,
                date: attendanceData.date || new Date().toLocaleDateString('en-US'),
                time: attendanceData.time || new Date().toLocaleTimeString('en-US'),
                studentId: attendanceData.studentId,
                studentName: attendanceData.studentName,
                session: parseInt(attendanceData.session),
                attendance: attendanceData.attendance,
                homework: attendanceData.homework,
                quiz: parseInt(attendanceData.quiz),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            // Check if log already exists for today and update it
            const existingLogIndex = appData.attendanceLogs.findIndex(log =>
                log.studentId === attendanceData.studentId &&
                log.date === logEntry.date &&
                log.session === logEntry.session
            );
            
            if (existingLogIndex >= 0) {
                logEntry.id = appData.attendanceLogs[existingLogIndex].id;
                logEntry.createdAt = appData.attendanceLogs[existingLogIndex].createdAt;
                appData.attendanceLogs[existingLogIndex] = logEntry;
            } else {
                appData.attendanceLogs.unshift(logEntry);
            }
            
            appData.lastUpdated = new Date().toISOString();
            
            // Broadcast to all clients
            io.emit('data-sync', appData);
            
            socket.emit('operation-success', {
                operation: 'mark-attendance',
                data: logEntry
            });
            
        } catch (error) {
            socket.emit('operation-error', {
                operation: 'mark-attendance',
                error: error.message
            });
        }
    });
    
    // Handle QR code scan
    // ✅ FIXED QR Scan Handler - Offline First + Auto Sync
    socket.on('qr-scan', (data) => {
        console.log(`📷 QR Code scanned: ${data.studentId}`);

        let student = appData.students.find(s => s.id === data.studentId);

        // ⭐ IF STUDENT NOT ON SERVER BUT CLIENT HAS IT → ACCEPT
        if (!student && data.student) {
            console.log('🟡 Student missing on server → importing from client');

            student = {
                ...data.student,
                syncedFromClient: true,
                createdAt: new Date().toISOString()
            };

            appData.students.push(student);

            // Also create empty record if not exists
            if (!appData.studentRecords.find(r => r.id === student.id)) {
                appData.studentRecords.push({
                    id: student.id,
                    fullName: student.fullName,
                    sessions: {},
                    createdAt: new Date().toISOString()
                });
            }
        }

        // NOW ACCEPT THE SCAN
        if (student) {
            socket.emit('qr-scan-result', {
                success: true,
                student: student
            });

            io.emit('student-scanned', {
                studentId: student.id,
                studentName: student.fullName,
                timestamp: new Date().toISOString()
            });

            return;
        }

        // Final fallback
        socket.emit('qr-scan-result', {
            success: false,
            error: 'Student not found'
        });
    });

    
    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`❌ Client disconnected: ${clientId}`);
        connectedClients.delete(clientId);
        
        io.emit('clients-update', {
            count: connectedClients.size,
            clients: Array.from(connectedClients.values())
        });
    });
    
    // Handle heartbeat
    socket.on('heartbeat', () => {
        const client = connectedClients.get(clientId);
        if (client) {
            client.lastActivity = new Date().toISOString();
            connectedClients.set(clientId, client);
        }
    });
});

// REST API Endpoints

// Get server info
app.get('/api/info', (req, res) => {
    const addresses = getLocalIPAddresses();
    res.json({
        serverName: 'Student Management Server',
        version: appData.version,
        uptime: process.uptime(),
        connectedClients: connectedClients.size,
        addresses: addresses,
        port: PORT,
        urls: addresses.map(addr => `http://${addr}:${PORT}`)
    });
});

// Get all data
app.get('/api/data', (req, res) => {
    res.json(appData);
});

// Import data
app.post('/api/import', (req, res) => {
    try {
        const importedData = req.body;
        
        // Validate data structure
        if (!importedData.students || !Array.isArray(importedData.students)) {
            return res.status(400).json({ error: 'Invalid data format' });
        }
        
        // Update app data
        appData = {
            ...importedData,
            lastUpdated: new Date().toISOString()
        };
        
        // Broadcast to all clients
        io.emit('data-sync', appData);
        
        res.json({
            success: true,
            imported: {
                students: appData.students.length,
                records: appData.studentRecords.length,
                logs: appData.attendanceLogs.length
            }
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Export data
app.get('/api/export', (req, res) => {
    res.json(appData);
});

// File upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    
    res.json({
        success: true,
        filename: req.file.filename,
        path: `/uploads/${req.file.filename}`,
        size: req.file.size
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        clients: connectedClients.size
    });
});

// Serve main application
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
    console.log('\n🚀 Student Management Server Started!\n');
    console.log('═══════════════════════════════════════════');
    console.log(`📡 Server running on port: ${PORT}`);
    console.log('═══════════════════════════════════════════\n');
    
    const addresses = getLocalIPAddresses();
    
    if (addresses.length > 0) {
        console.log('🌐 Access the system from these URLs:\n');
        addresses.forEach((addr, index) => {
            console.log(`   ${index + 1}. http://${addr}:${PORT}`);
        });
        console.log('\n📱 Share these URLs with devices on your network!');
    } else {
        console.log(`🌐 Access locally at: http://localhost:${PORT}`);
    }
    
    console.log('\n═══════════════════════════════════════════');
    console.log('💡 Tips:');
    console.log('   - Make sure all devices are on the same WiFi');
    console.log('   - Open any URL above on phones/tablets');
    console.log('   - Press Ctrl+C to stop the server');
    console.log('═══════════════════════════════════════════\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});