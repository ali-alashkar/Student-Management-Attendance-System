// Configuration file for Student Management System
function generateQRId(studentId) {
    return `STU-${studentId}-${crypto.randomUUID()}`;
}

function ensureStudentHasQR(student) {
    if (!student.qrId) {
        student.qrId = generateQRId(student.id);
    }
}
const CONFIG = {
    // Session Configuration
    sessions: {
        maxSessions: 8,
        defaultSession: 1,
        sessionNames: [
            'Session 1', 'Session 2', 'Session 3', 'Session 4',
            'Session 5', 'Session 6', 'Session 7', 'Session 8'
        ]
    },

    // Homework Options
    homework: {
        options: [
            { value: 'complete', label: 'Complete ✅', shortCode: 'C' },
            { value: 'partial', label: 'Partial 📝', shortCode: 'P' },
            { value: 'not-done', label: 'Not Done ❌', shortCode: 'N' }
        ],
        defaultOption: 'complete'
    },

    // Attendance Options
    attendance: {
        options: [
            { value: 'present', label: 'Present', shortCode: 'P' },
            { value: 'absent', label: 'Absent', shortCode: 'A' }
        ],
        defaultOption: 'present'
    },

    // Quiz Configuration
    quiz: {
        minScore: 0,
        maxScore: 10,
        defaultScore: 0
    },

    // Export File Naming
    export: {
        fileNames: {
            studentInfo: 'Student_Info',
            studentRecords: 'Student_Records',
            attendanceLogs: 'Attendance_Logs'
        },
        dateFormat: 'YYYY-MM-DD',
        includeTimestamp: true,
        fileExtension: '.xlsx'
    },

    // Import Configuration
    import: {
        acceptedFileTypes: ['.xlsx', '.xls', '.csv'],
        requiredColumns: {
            basic: ['ID', 'Full Name', 'Phone Number'],
            optional: ['Email', 'Preferred Contact Method', 'Parent\'s Phone Number', 'Grade/Year Level', 'Center', 'School']
        },
        sessionColumnPatterns: {
            attendance: [
                'Session {n} Attendance',
                'S{n} Att',
                'Session{n}_Attendance',
                'Session {n} Att',
                'S{n} Attendance'
            ],
            homework: [
                'Session {n} HW',
                'S{n} HW',
                'Session{n}_HW',
                'Session {n} Homework',
                'S{n} Homework'
            ],
            quiz: [
                'Session {n} Quiz',
                'S{n} Quiz',
                'Session{n}_Quiz',
                'Session {n} Score',
                'S{n} Score'
            ],
            date: [
                'Session {n} Date',
                'S{n} Date',
                'Session{n}_Date'
            ]
        }
    },

    // UI Configuration
    ui: {
        alerts: {
            duration: 3000, // 3 seconds
            fadeOutDuration: 300 // 0.3 seconds
        },
        search: {
            minSearchLength: 1,
            searchFields: ['fullName', 'id', 'phoneNumber', 'parentPhone']
        },
        tables: {
            defaultSortDirection: 'asc',
            enableSorting: true
        },
        time: {
            updateInterval: 1000, // 1 second
            format: {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }
        }
    },

    // Data Validation
    validation: {
        student: {
            id: {
                required: true,
                type: 'string'
            },
            fullName: {
                required: true,
                type: 'string',
                minLength: 2
            },
            phoneNumber: {
                required: true,
                type: 'string',
                pattern: /^[\+\-\s\(\)\d]+$/
            },
            email: {
                required: false,
                type: 'string',
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            }
        }
    },

    // Application Metadata
    app: {
        name: 'Student Management & Attendance System',
        version: '1.0.0',
        author: 'Eng/Ali Alashkar',
        description: 'Manage student attendance, homework, and quiz tracking'
    }
};

// Helper functions for configuration
CONFIG.getSessionName = function (sessionNumber) {
    return this.sessions.sessionNames[sessionNumber - 1] || `Session ${sessionNumber}`;
};

CONFIG.getExportFileName = function (type, includeDate = true) {
    const baseName = this.export.fileNames[type] || type;
    const timestamp = includeDate && this.export.includeTimestamp
        ? `_${new Date().toISOString().split('T')[0]}`
        : '';
    return `${baseName}${timestamp}${this.export.fileExtension}`;
};

CONFIG.getSessionColumnPatterns = function (sessionNumber) {
    const patterns = {};
    Object.keys(this.import.sessionColumnPatterns).forEach(key => {
        patterns[key] = this.import.sessionColumnPatterns[key].map(pattern =>
            pattern.replace('{n}', sessionNumber)
        );
    });
    return patterns;
};

CONFIG.validateStudent = function (student) {
    const errors = [];

    Object.keys(this.validation.student).forEach(field => {
        const rules = this.validation.student[field];
        const value = student[field];

        if (rules.required && (!value || value.toString().trim() === '')) {
            errors.push(`${field} is required`);
            return;
        }

        if (value && rules.minLength && value.length < rules.minLength) {
            errors.push(`${field} must be at least ${rules.minLength} characters long`);
        }

        if (value && rules.pattern && !rules.pattern.test(value)) {
            errors.push(`${field} format is invalid`);
        }
    });

    return {
        isValid: errors.length === 0,
        errors: errors
    };
};


// Data Manager Module for Student Management System
class DataManager {
    constructor() {
        this.students = [];
        this.studentRecords = [];
        this.attendanceLogs = [];
        this.deletedStudents = []; // For temporary storage of deleted students
        this.initialized = false;
    }

    // Initialize the data manager
    init() {
        this.loadFromStorage();
        this.initialized = true;
        return this;
    }

    // Student Management
    async addStudent(studentData) {
        const validation = CONFIG.validateStudent(studentData);
        if (!validation.isValid) {
            throw new Error(`Invalid student data: ${validation.errors.join(', ')}`);
        }

        // Check for duplicate ID
        const existingStudent = this.getStudentById(studentData.id);
        if (existingStudent) {
            const nextId = this.generateNextAvailableId();
            throw new Error(`DUPLICATE_ID|Student with ID "${studentData.id}" already exists (${existingStudent.fullName}). Suggested next ID: ${nextId}`);
        }

        const student = {
            id: studentData.id,
            fullName: studentData.fullName,
            phoneNumber: studentData.phoneNumber,
            email: studentData.email || '',
            contactMethod: studentData.contactMethod || 'phone',
            parentPhone: studentData.parentPhone || '',
            gradeLevel: studentData.gradeLevel || '',
            center: studentData.center || '',
            school: studentData.school || '',
            qrCodeUrl: studentData.qrCodeUrl || null, // Add QR URL field
            qrGeneratedAt: studentData.qrGeneratedAt || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.students.push(student);
        this.createStudentRecord(student);

        // Generate QR code if not provided
        if (!student.qrCodeUrl && window.qrHandler) {
            try {
                await this.generatePermanentQR(student.id);
            } catch (error) {
                console.warn('Failed to generate QR for new student:', error);
                // Don't fail the whole operation if QR generation fails
            }
        }

        this.saveToStorage();

        if (window.syncClient && syncClient.isConnected()) {
            syncClient.sendDataUpdate();
        }

        return this.getStudentById(student.id); // Return updated student with QR
    }
    // Generate and store permanent QR code for student
    async generatePermanentQR(studentId) {
        const student = this.getStudentById(studentId);
        if (!student) {
            throw new Error(`Student with ID ${studentId} not found`);
        }

        // If student already has a QR URL, return it
        if (student.qrCodeUrl) {
            return student.qrCodeUrl;
        }

        try {
            // Generate QR code as data URL
            const qrUrl = await window.qrHandler.generateStudentQRDataURL(studentId);

            // Update student with QR URL
            const studentIndex = this.students.findIndex(s => s.id == studentId);
            if (studentIndex !== -1) {
                this.students[studentIndex].qrCodeUrl = qrUrl;
                this.students[studentIndex].qrGeneratedAt = new Date().toISOString();
                this.saveToStorage();
            }

            return qrUrl;
        } catch (error) {
            console.error('Failed to generate QR for student:', studentId, error);
            throw error;
        }
    }

    // Generate QR codes for all students who don't have one
    async generateAllMissingQRs() {
        const studentsWithoutQR = this.students.filter(s => !s.qrCodeUrl);

        console.log(`Generating QR codes for ${studentsWithoutQR.length} students...`);

        const results = {
            successful: [],
            failed: [],
            total: studentsWithoutQR.length
        };

        for (const student of studentsWithoutQR) {
            try {
                await this.generatePermanentQR(student.id);
                results.successful.push(student.id);
            } catch (error) {
                results.failed.push({
                    id: student.id,
                    name: student.fullName,
                    error: error.message
                });
            }
        }

        return results;
    }


    // SOLUTION 2: Fix the addMultipleStudents to handle async addStudent
    async addMultipleStudents(studentsData) {
        const results = {
            successful: [],
            failed: [],
            total: studentsData.length
        };

        for (const [index, studentData] of studentsData.entries()) {
            try {
                const student = await this.addStudent(studentData); // Add await here
                results.successful.push({ index, student });
            } catch (error) {
                results.failed.push({ index, error: error.message, data: studentData });
            }
        }

        return results;
    }

    getStudentById(id) {
        return this.students.find(student => student.id == id);
    }

    getAllStudents() {
        return [...this.students];
    }

    updateStudent(id, updates) {
        const studentIndex = this.students.findIndex(student => student.id == id);
        if (studentIndex === -1) {
            throw new Error(`Student with ID ${id} not found`);
        }

        const updatedStudent = {
            ...this.students[studentIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        const validation = CONFIG.validateStudent(updatedStudent);
        if (!validation.isValid) {
            throw new Error(`Invalid student data: ${validation.errors.join(', ')}`);
        }

        this.students[studentIndex] = updatedStudent;

        // Update related student record
        const recordIndex = this.studentRecords.findIndex(record => record.id == id);
        if (recordIndex !== -1) {
            this.studentRecords[recordIndex].fullName = updatedStudent.fullName;
            this.studentRecords[recordIndex].parentPhone = updatedStudent.parentPhone;
            this.studentRecords[recordIndex].updatedAt = new Date().toISOString();
        }

        this.saveToStorage();

        return updatedStudent;
    }

    // NEW: Temporary delete (move to deleted students array)
    deleteStudentTemporary(id) {
        const studentIndex = this.students.findIndex(student => student.id == id);
        if (studentIndex === -1) {
            throw new Error(`Student with ID ${id} not found`);
        }

        const deletedStudent = this.students.splice(studentIndex, 1)[0];

        // Move associated data to temporary storage
        const studentRecord = this.studentRecords.find(record => record.id == id);
        const studentLogs = this.attendanceLogs.filter(log => log.studentId == id);

        // Add to deleted students with timestamp
        const deletedData = {
            student: deletedStudent,
            record: studentRecord,
            logs: studentLogs,
            deletedAt: new Date().toISOString(),
            deletedBy: 'system' // You can modify this to track who deleted
        };

        this.deletedStudents.push(deletedData);

        // Remove from active data but keep in deleted storage
        this.studentRecords = this.studentRecords.filter(record => record.id != id);
        this.attendanceLogs = this.attendanceLogs.filter(log => log.studentId != id);

        this.saveToStorage();
        return deletedData;
    }

    // NEW: Restore temporarily deleted student
    // Fixed restore function in data-manager.js
    // Add this improved method to your DataManager class

    restoreStudent(id) {
        console.log('Attempting to restore student with ID:', id);
        console.log('Current deleted students:', this.deletedStudents);

        // Try to find the deleted student - handle both old and new data structures
        let deletedIndex = -1;
        let deletedData = null;

        // Check if deletedStudents array has proper structure
        for (let i = 0; i < this.deletedStudents.length; i++) {
            const item = this.deletedStudents[i];

            // Handle new structure (with deletedAt, deletedBy, etc.)
            if (item.student && item.student.id == id) {
                deletedIndex = i;
                deletedData = item;
                break;
            }

            // Handle old structure (direct student object)
            if (item.id == id) {
                deletedIndex = i;
                // Convert old structure to new structure
                deletedData = {
                    student: item,
                    record: null,
                    logs: [],
                    deletedAt: new Date().toISOString(),
                    deletedBy: 'system'
                };
                break;
            }

            // Handle imported data that might have different structure
            if (typeof item === 'object' && (item.fullName || item.name)) {
                // Try to find by ID in any nested property
                const studentId = item.id || item.studentId ||
                    (item.student && item.student.id);
                if (studentId == id) {
                    deletedIndex = i;
                    deletedData = {
                        student: item.student || item,
                        record: item.record || null,
                        logs: item.logs || [],
                        deletedAt: item.deletedAt || new Date().toISOString(),
                        deletedBy: item.deletedBy || 'system'
                    };
                    break;
                }
            }
        }

        if (deletedIndex === -1 || !deletedData) {
            console.error('Deleted student not found. Available deleted students:',
                this.deletedStudents.map(d => ({
                    structure: typeof d,
                    hasStudent: !!d.student,
                    id: d.id || (d.student && d.student.id),
                    name: d.fullName || (d.student && d.student.fullName)
                })));
            throw new Error(`Deleted student with ID ${id} not found`);
        }

        console.log('Found deleted student:', deletedData);

        // Remove from deleted array
        this.deletedStudents.splice(deletedIndex, 1);

        // Ensure we have valid student data
        if (!deletedData.student || !deletedData.student.id) {
            throw new Error('Invalid deleted student data structure');
        }

        // Check if student with same ID already exists in active students
        const existingStudent = this.getStudentById(deletedData.student.id);
        if (existingStudent) {
            // Put it back in deleted array
            this.deletedStudents.splice(deletedIndex, 0, deletedData);
            throw new Error(`Student with ID ${deletedData.student.id} already exists in active students`);
        }

        // Restore student data
        this.students.push(deletedData.student);

        // Restore record if it exists
        if (deletedData.record) {
            // Check if record already exists
            const existingRecordIndex = this.studentRecords.findIndex(r => r.id == deletedData.student.id);
            if (existingRecordIndex >= 0) {
                // Update existing record
                this.studentRecords[existingRecordIndex] = deletedData.record;
            } else {
                // Add new record
                this.studentRecords.push(deletedData.record);
            }
        } else {
            // Create new record if none exists
            this.createStudentRecord(deletedData.student);
        }

        // Restore logs if they exist
        if (deletedData.logs && Array.isArray(deletedData.logs) && deletedData.logs.length > 0) {
            // Check for duplicate logs before adding
            deletedData.logs.forEach(log => {
                const existingLogIndex = this.attendanceLogs.findIndex(existing =>
                    existing.studentId == log.studentId &&
                    existing.date === log.date &&
                    existing.session == log.session
                );

                if (existingLogIndex >= 0) {
                    // Update existing log
                    this.attendanceLogs[existingLogIndex] = log;
                } else {
                    // Add new log
                    this.attendanceLogs.push(log);
                }
            });
        }

        this.saveToStorage();
        console.log('Student restored successfully:', deletedData.student);
        return deletedData.student;
    }

    // Also add this helper method to better handle imported data
    validateAndFixDeletedStudentsStructure() {
        console.log('Validating deleted students structure...');

        this.deletedStudents = this.deletedStudents.map(item => {
            // If item already has correct structure, return as is
            if (item.student && item.deletedAt) {
                return item;
            }

            // If item is a direct student object, wrap it
            if (item.id && item.fullName) {
                return {
                    student: item,
                    record: null,
                    logs: [],
                    deletedAt: new Date().toISOString(),
                    deletedBy: 'imported'
                };
            }

            // If item has some other structure, try to extract student data
            const student = item.student || item;
            if (student && student.id) {
                return {
                    student: student,
                    record: item.record || null,
                    logs: item.logs || [],
                    deletedAt: item.deletedAt || new Date().toISOString(),
                    deletedBy: item.deletedBy || 'imported'
                };
            }

            // If we can't fix it, log error and exclude
            console.error('Cannot fix deleted student structure:', item);
            return null;
        }).filter(item => item !== null);

        console.log('Fixed deleted students structure. Count:', this.deletedStudents.length);
    }

    
    // NEW: Permanent delete
    deleteStudentPermanent(id) {
        const studentIndex = this.students.findIndex(student => student.id == id);

        if (studentIndex !== -1) {
            // Delete from active students
            const deletedStudent = this.students.splice(studentIndex, 1)[0];

            // Remove associated records permanently
            this.studentRecords = this.studentRecords.filter(record => record.id != id);
            this.attendanceLogs = this.attendanceLogs.filter(log => log.studentId != id);

            this.saveToStorage();
            return { student: deletedStudent, source: 'active' };
        }

        // Check in deleted students
        const deletedIndex = this.deletedStudents.findIndex(deleted => deleted.student.id == id);
        if (deletedIndex !== -1) {
            const deletedData = this.deletedStudents.splice(deletedIndex, 1)[0];
            this.saveToStorage();
            return { student: deletedData.student, source: 'deleted' };
        }

        throw new Error(`Student with ID ${id} not found in active or deleted records`);
    }

    // NEW: Get all deleted students
    getDeletedStudents() {
        return [...this.deletedStudents];
    }

    // NEW: Clear all deleted students permanently
    clearDeletedStudents() {
        const count = this.deletedStudents.length;
        this.deletedStudents = [];
        this.saveToStorage();
        return count;
    }

    deleteStudent(id) {
        // This method now calls temporary delete for backward compatibility
        return this.deleteStudentTemporary(id);
    }

    searchStudents(searchTerm) {
        if (!searchTerm || searchTerm.trim() === '') {
            return [];
        }

        const searchTermLower = searchTerm.toLowerCase();
        const searchFields = CONFIG.ui.search.searchFields;

        return this.students.filter(student => {
            return searchFields.some(field => {
                const value = student[field];
                return value && value.toString().toLowerCase().includes(searchTermLower);
            });
        });
    }

    // Student Records Management
    createStudentRecord(student) {
        const existingRecord = this.studentRecords.find(record => record.id == student.id);
        if (existingRecord) {
            return existingRecord;
        }

        const record = {
            id: student.id,
            fullName: student.fullName,
            parentPhone: student.parentPhone,
            sessions: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Initialize sessions
        for (let i = 1; i <= CONFIG.sessions.maxSessions; i++) {
            record.sessions[i] = {
                attendance: null,
                homework: null,
                quiz: null,
                date: null
            };
        }

        this.studentRecords.push(record);
        this.saveToStorage();

        return record;
    }

    getStudentRecord(studentId) {
        return this.studentRecords.find(record => record.id == studentId);
    }

    getAllStudentRecords() {
        return [...this.studentRecords];
    }

    updateStudentSession(studentId, sessionNumber, sessionData) {
        let studentRecord = this.getStudentRecord(studentId);

        if (!studentRecord) {
            const student = this.getStudentById(studentId);
            if (!student) {
                throw new Error(`Student with ID ${studentId} not found`);
            }
            studentRecord = this.createStudentRecord(student);
        }

        if (sessionNumber < 1 || sessionNumber > CONFIG.sessions.maxSessions) {
            throw new Error(`Session number must be between 1 and ${CONFIG.sessions.maxSessions}`);
        }

        studentRecord.sessions[sessionNumber] = {
            ...studentRecord.sessions[sessionNumber],
            ...sessionData,
            date: sessionData.date || new Date().toLocaleDateString('en-US')
        };

        studentRecord.updatedAt = new Date().toISOString();
        this.saveToStorage();

        return studentRecord;
    }

    // Attendance Logs Management
    addAttendanceLog(logData) {
        const requiredFields = ['studentId', 'studentName', 'session', 'attendance'];
        for (const field of requiredFields) {
            if (!logData[field]) {
                throw new Error(`${field} is required for attendance log`);
            }
        }

        // Check for existing log for same student, session, and date
        const today = logData.date || new Date().toLocaleDateString('en-US');
        const existingLogIndex = this.attendanceLogs.findIndex(log =>
            log.studentId == logData.studentId &&
            log.date === today &&
            log.session == logData.session
        );

        const logEntry = {
            id: logData.id || Date.now() + Math.random() * 1000,
            date: today,
            time: logData.time || new Date().toLocaleTimeString('en-US'),
            studentId: logData.studentId,
            studentName: logData.studentName,
            session: parseInt(logData.session),
            attendance: logData.attendance,
            homework: logData.homework || CONFIG.homework.defaultOption,
            quiz: parseInt(logData.quiz) || CONFIG.quiz.defaultScore,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (existingLogIndex >= 0) {
            // Update existing log
            logEntry.id = this.attendanceLogs[existingLogIndex].id;
            logEntry.createdAt = this.attendanceLogs[existingLogIndex].createdAt;
            this.attendanceLogs[existingLogIndex] = logEntry;
        } else {
            // Add new log
            this.attendanceLogs.unshift(logEntry);
        }

        this.saveToStorage();
        return logEntry;
    }

    getAttendanceLogs(filters = {}) {
        let logs = [...this.attendanceLogs];

        if (filters.studentId) {
            logs = logs.filter(log => log.studentId == filters.studentId);
        }

        if (filters.session) {
            logs = logs.filter(log => log.session == filters.session);
        }

        if (filters.date) {
            logs = logs.filter(log => log.date === filters.date);
        }

        if (filters.attendance) {
            logs = logs.filter(log => log.attendance === filters.attendance);
        }

        return logs;
    }

    getTodayAttendance() {
        const today = new Date().toLocaleDateString('en-US');
        return this.getAttendanceLogs({ date: today });
    }

    // Statistics and Analytics
    getStatistics() {
        const today = new Date().toLocaleDateString('en-US');
        const todayLogs = this.getTodayAttendance();

        return {
            totalStudents: this.students.length,
            deletedStudents: this.deletedStudents.length,
            totalRecords: this.attendanceLogs.length,
            todayPresent: todayLogs.filter(log => log.attendance === 'present').length,
            todayAbsent: todayLogs.filter(log => log.attendance === 'absent').length,
            totalSessions: CONFIG.sessions.maxSessions,
            lastUpdated: new Date().toISOString()
        };
    }

    getStudentStatistics(studentId) {
        const logs = this.getAttendanceLogs({ studentId });
        const record = this.getStudentRecord(studentId);

        if (!record) {
            return null;
        }

        const stats = {
            totalAttendance: logs.length,
            presentCount: logs.filter(log => log.attendance === 'present').length,
            absentCount: logs.filter(log => log.attendance === 'absent').length,
            homeworkComplete: 0,
            homeworkPartial: 0,
            homeworkNotDone: 0,
            averageQuizScore: 0,
            sessionsCompleted: 0
        };

        let totalQuizScore = 0;
        let quizCount = 0;

        Object.values(record.sessions).forEach(session => {
            if (session.attendance) {
                stats.sessionsCompleted++;
            }
            if (session.homework === 'complete') stats.homeworkComplete++;
            if (session.homework === 'partial') stats.homeworkPartial++;
            if (session.homework === 'not-done') stats.homeworkNotDone++;
            if (session.quiz !== null && session.quiz !== undefined) {
                totalQuizScore += session.quiz;
                quizCount++;
            }
        });

        if (quizCount > 0) {
            stats.averageQuizScore = (totalQuizScore / quizCount).toFixed(2);
        }

        stats.attendanceRate = stats.totalAttendance > 0
            ? ((stats.presentCount / stats.totalAttendance) * 100).toFixed(2)
            : 0;

        return stats;
    }

    // Data Persistence
    saveToStorage() {
        try {
            const data = {
                students: this.students,
                studentRecords: this.studentRecords,
                attendanceLogs: this.attendanceLogs,
                deletedStudents: this.deletedStudents,
                lastSaved: new Date().toISOString(),
                version: CONFIG.app.version
            };

            // In a real application, you might save to localStorage, IndexedDB, or a server
            // For now, we'll just keep data in memory
            this._savedData = data;

            return true;
        } catch (error) {
            console.error('Failed to save data:', error);
            return false;
        }
    }

    loadFromStorage() {
        try {
            // In a real application, you might load from localStorage, IndexedDB, or a server
            if (this._savedData) {
                this.students = this._savedData.students || [];
                this.studentRecords = this._savedData.studentRecords || [];
                this.attendanceLogs = this._savedData.attendanceLogs || [];
                this.deletedStudents = this._savedData.deletedStudents || [];
            }

            return true;
        } catch (error) {
            console.error('Failed to load data:', error);
            return false;
        }
    }

    clearAllData() {
        this.students = [];
        this.studentRecords = [];
        this.attendanceLogs = [];
        this.deletedStudents = [];
        this.saveToStorage();
    }

    exportData() {
        return {
            students: this.students,
            studentRecords: this.studentRecords,
            attendanceLogs: this.attendanceLogs,
            deletedStudents: this.deletedStudents,
            exportedAt: new Date().toISOString(),
            version: CONFIG.app.version
        };
    }

    importData(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data format');
        }

        // Validate data structure
        const requiredFields = ['students', 'studentRecords', 'attendanceLogs'];
        for (const field of requiredFields) {
            if (!Array.isArray(data[field])) {
                throw new Error(`Invalid or missing ${field} array`);
            }
        }

        // Backup current data
        const backup = this.exportData();

        try {
            this.students = data.students;
            this.studentRecords = data.studentRecords;
            this.attendanceLogs = data.attendanceLogs;
            this.deletedStudents = data.deletedStudents || [];

            // Validate and fix deleted students structure after import
            this.validateAndFixDeletedStudentsStructure();

            this.saveToStorage();

            return {
                success: true,
                imported: {
                    students: data.students.length,
                    records: data.studentRecords.length,
                    logs: data.attendanceLogs.length,
                    deleted: this.deletedStudents.length
                }
            };
        } catch (error) {
            // Restore backup on failure
            this.students = backup.students;
            this.studentRecords = backup.studentRecords;
            this.attendanceLogs = backup.attendanceLogs;
            this.deletedStudents = backup.deletedStudents;
            this.saveToStorage();

            throw new Error(`Import failed: ${error.message}`);
        }
    }
    // Enhanced Data Manager - Add these methods to your DataManager class

    // Add this method to generate the next available ID
    generateNextAvailableId() {
        const allStudents = this.getAllStudents();

        if (allStudents.length === 0) {
            return "2024001"; // Default first ID
        }

        // Extract numeric IDs and find the highest
        const numericIds = allStudents
            .map(student => {
                const id = String(student.id);
                // Extract numbers from ID (handles formats like "2024001", "STU001", etc.)
                const match = id.match(/(\d+)$/);
                return match ? parseInt(match[1]) : 0;
            })
            .filter(num => num > 0);

        if (numericIds.length === 0) {
            return "2024001"; // Default if no numeric IDs found
        }

        const maxId = Math.max(...numericIds);
        const nextId = maxId + 1;

        // Format the next ID based on the pattern of existing IDs
        const lastStudentId = String(allStudents[allStudents.length - 1].id);

        if (lastStudentId.match(/^\d{7}$/)) {
            // Format: 2024001
            return nextId.toString().padStart(7, '0');
        } else if (lastStudentId.includes('2024')) {
            // Format: 2024XXX
            return `2024${nextId.toString().padStart(3, '0')}`;
        } else {
            // Default format
            return nextId.toString().padStart(4, '0');
        }
    }

    // Enhanced addStudent method with better error handling


   
}

// Create singleton instance
const dataManager = new DataManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DataManager, dataManager };
} else {
    window.DataManager = DataManager;
    window.dataManager = dataManager;
}
// Excel Handler Module for Import/Export functionality
class ExcelHandler {
    constructor(dataManager) {
        this.dataManager = dataManager;
    }
    // Export student info WITH QR codes
    async exportStudentInfoWithQR() {
        const students = this.dataManager.getAllStudents();

        if (students.length === 0) {
            throw new Error('No student data to export');
        }

        // Generate missing QR codes first
        const studentsNeedingQR = students.filter(s => !s.qrCodeUrl);
        if (studentsNeedingQR.length > 0) {
            console.log(`Generating ${studentsNeedingQR.length} missing QR codes...`);
            await this.dataManager.generateAllMissingQRs();
        }

        // Get updated student data
        const updatedStudents = this.dataManager.getAllStudents();

        const exportData = updatedStudents.map(student => ({
            'ID': student.id,
            'Full Name': student.fullName,
            'Phone Number': student.phoneNumber,
            'Email': student.email,
            'Preferred Contact Method': student.contactMethod,
            'Parent\'s Phone Number': student.parentPhone,
            'Grade/Year Level': student.gradeLevel,
            'Center': student.center,
            'School': student.school,
            'QR Code URL': student.qrCodeUrl || 'Not Generated',
            'QR Generated Date': student.qrGeneratedAt ? new Date(student.qrGeneratedAt).toLocaleDateString() : 'N/A'
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);

        // Set column widths
        ws['!cols'] = [
            { wch: 10 },  // ID
            { wch: 25 },  // Full Name
            { wch: 15 },  // Phone Number
            { wch: 25 },  // Email
            { wch: 20 },  // Contact Method
            { wch: 15 },  // Parent Phone
            { wch: 15 },  // Grade Level
            { wch: 15 },  // Center
            { wch: 20 },  // School
            { wch: 50 },  // QR Code URL
            { wch: 18 }   // QR Generated Date
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Students with QR");

        const fileName = `Students_with_QR_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);

        return {
            success: true,
            fileName,
            recordCount: students.length,
            qrCodesIncluded: updatedStudents.filter(s => s.qrCodeUrl).length
        };
    }

    // Import student data and preserve QR codes
    async importStudentDataWithQR(file) {
        if (!file) {
            throw new Error('No file provided');
        }

        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (!CONFIG.import.acceptedFileTypes.some(type => type.includes(fileExtension))) {
            throw new Error(`Unsupported file type. Accepted types: ${CONFIG.import.acceptedFileTypes.join(', ')}`);
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);

                    const result = await this.processImportedDataWithQR(jsonData);
                    resolve(result);
                } catch (error) {
                    reject(new Error(`Failed to read Excel file: ${error.message}`));
                }
            };

            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };

            reader.readAsArrayBuffer(file);
        });
    }

    // Process imported data and handle QR codes
    async processImportedDataWithQR(jsonData) {
        if (!Array.isArray(jsonData) || jsonData.length === 0) {
            throw new Error('No data found in the Excel file');
        }

        const results = {
            successful: [],
            failed: [],
            studentsImported: 0,
            recordsImported: 0,
            qrCodesRestored: 0,
            qrCodesGenerated: 0,
            errors: []
        };

        for (let index = 0; index < jsonData.length; index++) {
            const row = jsonData[index];

            try {
                const studentData = this.extractStudentData(row, index);

                // Check for existing QR code URL in import
                if (row['QR Code URL'] && row['QR Code URL'] !== 'Not Generated') {
                    studentData.qrCodeUrl = row['QR Code URL'];
                    studentData.qrGeneratedAt = row['QR Generated Date']
                        ? new Date(row['QR Generated Date']).toISOString()
                        : new Date().toISOString();
                    results.qrCodesRestored++;
                }

                // Add student (this will generate QR if not provided)
                const student = await this.dataManager.addStudent(studentData);

                // Track if QR was generated during import
                if (!studentData.qrCodeUrl && student.qrCodeUrl) {
                    results.qrCodesGenerated++;
                }

                // Process session data if available
                const sessionData = this.extractSessionData(row);
                this.importSessionData(student.id, sessionData);

                results.successful.push(student);
                results.studentsImported++;
                results.recordsImported += Object.keys(sessionData).length;

            } catch (error) {
                const errorInfo = {
                    row: index + 1,
                    error: error.message,
                    data: this.sanitizeRowData(row)
                };
                results.failed.push(errorInfo);
                results.errors.push(`Row ${index + 1}: ${error.message}`);
            }
        }

        return results;
    }
    // Helper function to parse session data from Excel
    parseSessionData(value) {
        if (!value || value === '' || value === '-') return null;

        const cleanValue = String(value).trim().toLowerCase();

        // Handle attendance
        if (cleanValue === 'p' || cleanValue === 'present') return 'present';
        if (cleanValue === 'a' || cleanValue === 'absent') return 'absent';

        // Handle homework
        if (cleanValue === 'c' || cleanValue === 'complete') return 'complete';
        if (cleanValue === 'p' || cleanValue === 'partial') return 'partial';
        if (cleanValue === 'n' || cleanValue === 'not-done' || cleanValue === 'not done') return 'not-done';

        // Handle quiz scores
        const num = parseInt(value);
        if (!isNaN(num) && num >= CONFIG.quiz.minScore && num <= CONFIG.quiz.maxScore) {
            return num;
        }

        return cleanValue;
    }

    // Parse Excel date values
    parseExcelDate(dateValue) {
        if (!dateValue) return null;

        if (typeof dateValue === 'number') {
            // Excel serial date number
            const excelEpoch = new Date(1899, 11, 30);
            const jsDate = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
            return jsDate.toLocaleDateString('en-US');
        } else if (dateValue instanceof Date) {
            return dateValue.toLocaleDateString('en-US');
        } else {
            // Try to parse string date
            const parsedDate = new Date(dateValue);
            if (!isNaN(parsedDate.getTime())) {
                return parsedDate.toLocaleDateString('en-US');
            }
            return String(dateValue);
        }
    }

    // Find column data using multiple possible column name patterns
    findColumnData(row, patterns, sessionNumber = null) {
        const columnNames = sessionNumber
            ? patterns.map(pattern => pattern.replace('{n}', sessionNumber))
            : patterns;

        for (const columnName of columnNames) {
            if (row[columnName] !== undefined && row[columnName] !== null && row[columnName] !== '') {
                return row[columnName];
            }
        }
        return null;
    }

    // Import student data from Excel file
    async importStudentData(file) {
        if (!file) {
            throw new Error('No file provided');
        }

        // Validate file type
        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (!CONFIG.import.acceptedFileTypes.some(type => type.includes(fileExtension))) {
            throw new Error(`Unsupported file type. Accepted types: ${CONFIG.import.acceptedFileTypes.join(', ')}`);
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);

                    const result = this.processImportedData(jsonData);
                    resolve(result);
                } catch (error) {
                    reject(new Error(`Failed to read Excel file: ${error.message}`));
                }
            };

            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };

            reader.readAsArrayBuffer(file);
        });
    }

    // Process imported Excel data
    processImportedData(jsonData) {
        if (!Array.isArray(jsonData) || jsonData.length === 0) {
            throw new Error('No data found in the Excel file');
        }

        const results = {
            successful: [],
            failed: [],
            studentsImported: 0,
            recordsImported: 0,
            errors: []
        };

        jsonData.forEach((row, index) => {
            try {
                const studentData = this.extractStudentData(row, index);
                const student = this.dataManager.addStudent(studentData);

                // Process session data if available
                const sessionData = this.extractSessionData(row);
                this.importSessionData(student.id, sessionData);

                results.successful.push(student);
                results.studentsImported++;
                results.recordsImported += Object.keys(sessionData).length;

            } catch (error) {
                const errorInfo = {
                    row: index + 1,
                    error: error.message,
                    data: this.sanitizeRowData(row)
                };
                results.failed.push(errorInfo);
                results.errors.push(`Row ${index + 1}: ${error.message}`);
            }
        });

        return results;
    }

    // Extract basic student data from Excel row
    extractStudentData(row, index) {
        const studentId = row['ID'] || row['id'] || row['Student ID'] ||
            (Date.now() + index + Math.floor(Math.random() * 1000));

        const studentData = {
            id: studentId,
            fullName: String(row['Full Name'] || row['fullName'] || row['name'] || '').trim(),
            phoneNumber: String(row['Phone Number'] || row['phoneNumber'] || row['phone'] || '').trim(),
            email: String(row['Email'] || row['email'] || '').trim(),
            contactMethod: String(row['Preferred Contact Method'] || row['contactMethod'] || 'phone').trim(),
            parentPhone: String(row['Parent\'s Phone Number'] || row['parentPhone'] || row['parent_phone'] || '').trim(),
            gradeLevel: String(row['Grade/Year Level'] || row['gradeLevel'] || row['grade'] || '').trim(),
            center: String(row['Center?'] || row['Center'] || row['center'] || '').trim(),
            school: String(row['School'] || row['school'] || '').trim()
        };

        // Validate required fields
        if (!studentData.fullName || !studentData.phoneNumber) {
            throw new Error(`Missing required fields: ${!studentData.fullName ? 'Full Name' : ''} ${!studentData.phoneNumber ? 'Phone Number' : ''}`.trim());
        }

        return studentData;
    }

    // Extract session data from Excel row
    extractSessionData(row) {
        const sessionData = {};

        for (let i = 1; i <= CONFIG.sessions.maxSessions; i++) {
            const patterns = CONFIG.getSessionColumnPatterns(i);

            const attendanceValue = this.findColumnData(row, patterns.attendance);
            const homeworkValue = this.findColumnData(row, patterns.homework);
            const quizValue = this.findColumnData(row, patterns.quiz);
            const dateValue = this.findColumnData(row, patterns.date);

            if (attendanceValue || homeworkValue || quizValue || dateValue) {
                sessionData[i] = {
                    attendance: attendanceValue ? this.parseSessionData(attendanceValue) : null,
                    homework: homeworkValue ? this.parseSessionData(homeworkValue) : null,
                    quiz: quizValue ? this.parseSessionData(quizValue) : null,
                    date: dateValue ? this.parseExcelDate(dateValue) : null
                };
            }
        }

        return sessionData;
    }

    // Import session data for a specific student
    importSessionData(studentId, sessionData) {
        Object.keys(sessionData).forEach(sessionNumber => {
            const session = sessionData[sessionNumber];
            if (session && (session.attendance || session.homework || session.quiz !== null)) {
                this.dataManager.updateStudentSession(studentId, parseInt(sessionNumber), session);
            }
        });
    }

    // Sanitize row data for error reporting (remove sensitive information)
    sanitizeRowData(row) {
        const sanitized = { ...row };
        // Remove potentially sensitive fields
        delete sanitized['Phone Number'];
        delete sanitized['phoneNumber'];
        delete sanitized['Email'];
        delete sanitized['email'];
        delete sanitized['Parent\'s Phone Number'];
        delete sanitized['parentPhone'];
        return sanitized;
    }

    // Export student information to Excel
    exportStudentInfo() {
        const students = this.dataManager.getAllStudents();

        if (students.length === 0) {
            throw new Error('No student data to export');
        }

        const exportData = students.map(student => ({
            'ID': student.id,
            'Full Name': student.fullName,
            'Phone Number': student.phoneNumber,
            'Email': student.email,
            'Preferred Contact Method': student.contactMethod,
            'Parent\'s Phone Number': student.parentPhone,
            'Grade/Year Level': student.gradeLevel,
            'Center': student.center,
            'School': student.school
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Student Info");

        const fileName = CONFIG.getExportFileName('studentInfo');
        XLSX.writeFile(wb, fileName);

        return {
            success: true,
            fileName,
            recordCount: students.length
        };
    }

    // Export student records to Excel
    exportStudentRecords() {
        const records = this.dataManager.getAllStudentRecords();

        if (records.length === 0) {
            throw new Error('No student records to export');
        }

        const exportData = records.map(record => {
            const row = {
                'ID': record.id,
                'Full Name': record.fullName,
                'Parent\'s Phone Number': record.parentPhone
            };

            // Add session data including dates
            for (let i = 1; i <= CONFIG.sessions.maxSessions; i++) {
                const session = record.sessions[i];
                row[`Session ${i} Attendance`] = session.attendance || '';
                row[`Session ${i} HW`] = session.homework || '';
                row[`Session ${i} Quiz`] = session.quiz !== null && session.quiz !== undefined ? session.quiz : '';
                row[`Session ${i} Date`] = session.date || '';
            }

            return row;
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Student Records");

        const fileName = CONFIG.getExportFileName('studentRecords');
        XLSX.writeFile(wb, fileName);

        return {
            success: true,
            fileName,
            recordCount: records.length
        };
    }

    // Export attendance logs to Excel
    exportAttendanceLogs() {
        const logs = this.dataManager.getAttendanceLogs();

        if (logs.length === 0) {
            throw new Error('No attendance logs to export');
        }

        const exportData = logs.map(log => ({
            'Date': log.date,
            'Time': log.time,
            'Student ID': log.studentId,
            'Full Name': log.studentName,
            'Session': log.session,
            'Attendance': log.attendance,
            'Homework Status': log.homework,
            'Quiz Score': log.quiz
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Attendance Logs");

        const fileName = CONFIG.getExportFileName('attendanceLogs');
        XLSX.writeFile(wb, fileName);

        return {
            success: true,
            fileName,
            recordCount: logs.length
        };
    }

    // Export all data to a comprehensive Excel file with QR code
    async exportAllDataWithQR() {
        const students = this.dataManager.getAllStudents();
        const records = this.dataManager.getAllStudentRecords();
        const logs = this.dataManager.getAttendanceLogs();

        if (students.length === 0 && records.length === 0 && logs.length === 0) {
            throw new Error('No data to export');
        }

        // Generate missing QR codes
        const studentsNeedingQR = students.filter(s => !s.qrCodeUrl);
        if (studentsNeedingQR.length > 0) {
            console.log(`Generating ${studentsNeedingQR.length} missing QR codes before export...`);
            await this.dataManager.generateAllMissingQRs();
        }

        const wb = XLSX.utils.book_new();
        const updatedStudents = this.dataManager.getAllStudents();

        // Student Info Sheet WITH QR
        if (updatedStudents.length > 0) {
            const studentData = updatedStudents.map(student => ({
                'ID': student.id,
                'Full Name': student.fullName,
                'Phone Number': student.phoneNumber,
                'Email': student.email,
                'Preferred Contact Method': student.contactMethod,
                'Parent\'s Phone Number': student.parentPhone,
                'Grade/Year Level': student.gradeLevel,
                'Center': student.center,
                'School': student.school,
                'QR Code URL': student.qrCodeUrl || 'Not Generated',
                'QR Generated Date': student.qrGeneratedAt ? new Date(student.qrGeneratedAt).toLocaleDateString() : 'N/A'
            }));
            const ws1 = XLSX.utils.json_to_sheet(studentData);
            ws1['!cols'] = [
                { wch: 10 }, { wch: 25 }, { wch: 15 }, { wch: 25 }, { wch: 20 },
                { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 50 }, { wch: 18 }
            ];
            XLSX.utils.book_append_sheet(wb, ws1, "Student Info");
        }

        // Student Records Sheet (unchanged)
        if (records.length > 0) {
            const recordData = records.map(record => {
                const row = {
                    'ID': record.id,
                    'Full Name': record.fullName,
                    'Parent\'s Phone Number': record.parentPhone
                };

                for (let i = 1; i <= CONFIG.sessions.maxSessions; i++) {
                    const session = record.sessions[i];
                    row[`Session ${i} Attendance`] = session.attendance || '';
                    row[`Session ${i} HW`] = session.homework || '';
                    row[`Session ${i} Quiz`] = session.quiz !== null && session.quiz !== undefined ? session.quiz : '';
                    row[`Session ${i} Date`] = session.date || '';
                }

                return row;
            });
            const ws2 = XLSX.utils.json_to_sheet(recordData);
            XLSX.utils.book_append_sheet(wb, ws2, "Student Records");
        }

        // Attendance Logs Sheet (unchanged)
        if (logs.length > 0) {
            const logData = logs.map(log => ({
                'Date': log.date,
                'Time': log.time,
                'Student ID': log.studentId,
                'Full Name': log.studentName,
                'Session': log.session,
                'Attendance': log.attendance,
                'Homework Status': log.homework,
                'Quiz Score': log.quiz
            }));
            const ws3 = XLSX.utils.json_to_sheet(logData);
            XLSX.utils.book_append_sheet(wb, ws3, "Attendance Logs");
        }

        const fileName = `Complete_Export_with_QR_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);

        return {
            success: true,
            fileName,
            sheets: {
                students: updatedStudents.length,
                records: records.length,
                logs: logs.length
            },
            qrCodesIncluded: updatedStudents.filter(s => s.qrCodeUrl).length
        };
    }

    // Create a sample Excel template for import
    createImportTemplate() {
        const templateData = [
            {
                'ID': '12345',
                'Full Name': 'John Doe',
                'Phone Number': '555-0123',
                'Email': 'john.doe@email.com',
                'Preferred Contact Method': 'phone',
                'Parent\'s Phone Number': '555-0124',
                'Grade/Year Level': '10th Grade',
                'Center': 'Main Center',
                'School': 'ABC High School',
                'Session 1 Attendance': 'P',
                'Session 1 HW': 'C',
                'Session 1 Quiz': '8',
                'Session 1 Date': '1/15/2024',
                'Session 2 Attendance': 'P',
                'Session 2 HW': 'P',
                'Session 2 Quiz': '7',
                'Session 2 Date': '1/22/2024'
            },
            {
                'ID': '12346',
                'Full Name': 'Jane Smith',
                'Phone Number': '555-0125',
                'Email': 'jane.smith@email.com',
                'Preferred Contact Method': 'email',
                'Parent\'s Phone Number': '555-0126',
                'Grade/Year Level': '11th Grade',
                'Center': 'East Center',
                'School': 'XYZ High School',
                'Session 1 Attendance': 'A',
                'Session 1 HW': 'N',
                'Session 1 Quiz': '0',
                'Session 1 Date': '1/15/2024'
            }
        ];

        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();

        // Add instructions sheet
        const instructions = [
            { 'Field': 'ID', 'Description': 'Unique student identifier (required)', 'Example': '12345' },
            { 'Field': 'Full Name', 'Description': 'Student full name (required)', 'Example': 'John Doe' },
            { 'Field': 'Phone Number', 'Description': 'Student phone number (required)', 'Example': '555-0123' },
            { 'Field': 'Email', 'Description': 'Student email address (optional)', 'Example': 'john@email.com' },
            { 'Field': 'Preferred Contact Method', 'Description': 'phone or email (optional)', 'Example': 'phone' },
            { 'Field': 'Parent\'s Phone Number', 'Description': 'Parent/guardian phone (optional)', 'Example': '555-0124' },
            { 'Field': 'Grade/Year Level', 'Description': 'Student grade level (optional)', 'Example': '10th Grade' },
            { 'Field': 'Center', 'Description': 'Learning center (optional)', 'Example': 'Main Center' },
            { 'Field': 'School', 'Description': 'Student school (optional)', 'Example': 'ABC High School' },
            { 'Field': 'Session X Attendance', 'Description': 'P for Present, A for Absent', 'Example': 'P' },
            { 'Field': 'Session X HW', 'Description': 'C for Complete, P for Partial, N for Not Done', 'Example': 'C' },
            { 'Field': 'Session X Quiz', 'Description': 'Score from 0 to 10', 'Example': '8' },
            { 'Field': 'Session X Date', 'Description': 'Session date (MM/DD/YYYY)', 'Example': '1/15/2024' }
        ];

        const wsInstructions = XLSX.utils.json_to_sheet(instructions);
        XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");
        XLSX.utils.book_append_sheet(wb, ws, "Sample Data");

        const fileName = 'Student_Import_Template.xlsx';
        XLSX.writeFile(wb, fileName);

        return {
            success: true,
            fileName
        };
    }

    // Validate Excel file structure before import
    validateImportFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                    if (jsonData.length < 2) {
                        reject(new Error('File must contain at least a header row and one data row'));
                        return;
                    }

                    const headers = jsonData[0];
                    const requiredColumns = CONFIG.import.requiredColumns.basic;
                    const missingColumns = requiredColumns.filter(col => !headers.includes(col));

                    if (missingColumns.length > 0) {
                        reject(new Error(`Missing required columns: ${missingColumns.join(', ')}`));
                        return;
                    }

                    resolve({
                        isValid: true,
                        headers,
                        rowCount: jsonData.length - 1,
                        sheets: workbook.SheetNames
                    });

                } catch (error) {
                    reject(new Error(`File validation failed: ${error.message}`));
                }
            };

            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }
}

// Create singleton instance
const excelHandler = new ExcelHandler(dataManager);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ExcelHandler, excelHandler };
} else {
    window.ExcelHandler = ExcelHandler;
    window.excelHandler = excelHandler;
}
// UI Components Module for Student Management System
class UIComponents {
    constructor(dataManager, excelHandler) {
        this.dataManager = dataManager;
        this.excelHandler = excelHandler;
        this.currentStudent = null;
        this.sortStates = {};
        this.initialized = false;
        this.editMode = false;
        this.editingStudentId = null;
    }

    // Initialize UI components and event listeners
    init() {
        this.setupEventListeners();
        this.startTimeUpdate();
        this.updateCounters();
        this.displayAllData();
        this.initialized = true;
        return this;
    }

    // Setup event listeners
    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchStudent();
                }
            });
        }

        // File input change
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.validateFileInput(e.target.files[0]);
                }
            });
        }

        // Before unload warning
        window.addEventListener('beforeunload', (e) => {
            if (this.dataManager.students.length > 0 || this.dataManager.attendanceLogs.length > 0) {
                const message = 'Are you sure you want to leave? Any unsaved data will be lost.';
                e.returnValue = message;
                return message;
            }
        });

        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.textContent.includes('Import') ? 'import' :
                    e.target.textContent.includes('Attendance') ? 'attendance' :
                        e.target.textContent.includes('Records') ? 'students' : 'reports';
                this.showTab(tabName);
            });
        });
    }

    // Time display functionality
    startTimeUpdate() {
        this.updateCurrentTime();
        setInterval(() => this.updateCurrentTime(), CONFIG.ui.time.updateInterval);
    }

    updateCurrentTime() {
        const timeElement = document.getElementById('currentTime');
        if (timeElement) {
            const now = new Date();
            const timeString = now.toLocaleString('en-US', CONFIG.ui.time.format);
            timeElement.textContent = timeString;
        }
    }

    // Tab management
    showTab(tabName) {
        // Remove active class from all tabs and content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });

        // Add active class to selected tab and content
        const tabContent = document.getElementById(tabName);
        const tabButton = event ? event.target : document.querySelector('.tab');

        if (tabContent) tabContent.classList.add('active');
        if (tabButton) tabButton.classList.add('active');

        // Update displays based on tab
        switch (tabName) {
            case 'students':
                this.displayStudentRecords();
                break;
            case 'reports':
                this.updateCounters();
                this.displayAttendanceLogs();
                break;
            case 'import':
                this.displayImportedStudents();
                break;
        }
    }

    // Alert system
    showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('alertContainer');
        if (!alertContainer) return;

        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type === 'success' ? 'success' : 'error'}`;
        alertDiv.textContent = message;

        alertContainer.innerHTML = '';
        alertContainer.appendChild(alertDiv);

        // Auto-hide alert
        setTimeout(() => {
            alertDiv.style.opacity = '0';
            setTimeout(() => {
                if (alertContainer.contains(alertDiv)) {
                    alertContainer.removeChild(alertDiv);
                }
            }, CONFIG.ui.alerts.fadeOutDuration);
        }, CONFIG.ui.alerts.duration);
    }

    // Enhanced Add Student Form with auto-ID suggestion
    showAddStudentForm() {
        // Get suggested next ID for placeholder
        const suggestedId = this.dataManager.generateNextAvailableId ?
            this.dataManager.generateNextAvailableId() : '';

        const formHtml = `
        <div class="student-form-container" id="studentFormContainer">
            <div class="student-form">
                <h3>Add New Student</h3>
                <form id="addStudentForm">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="studentId">Student ID*</label>
                            <input type="text" id="studentId" name="id" required 
                                   placeholder="${suggestedId ? `Suggested: ${suggestedId}` : 'Enter unique ID'}"
                                   title="Enter a unique student ID">
                            ${suggestedId ? `
                            <button type="button" class="btn btn-sm" onclick="document.getElementById('studentId').value='${suggestedId}'" 
                                    style="margin-top: 5px; background: #17a2b8; color: white; font-size: 12px; padding: 5px 10px;">
                                Use Suggested: ${suggestedId}
                            </button>
                            ` : ''}
                        </div>
                        <div class="form-group">
                            <label for="fullName">Full Name*</label>
                            <input type="text" id="fullName" name="fullName" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="phoneNumber">Phone Number*</label>
                            <input type="tel" id="phoneNumber" name="phoneNumber" required>
                        </div>
                        <div class="form-group">
                            <label for="email">Email</label>
                            <input type="email" id="email" name="email">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="parentPhone">Parent's Phone</label>
                            <input type="tel" id="parentPhone" name="parentPhone">
                        </div>
                        <div class="form-group">
                            <label for="gradeLevel">Grade Level</label>
                            <input type="text" id="gradeLevel" name="gradeLevel">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="center">Center</label>
                            <input type="text" id="center" name="center">
                        </div>
                        <div class="form-group">
                            <label for="school">School</label>
                            <input type="text" id="school" name="school">
                        </div>
                    </div>
                    <div class="form-buttons">
                        <button type="submit" class="btn btn-success">Add Student</button>
                        <button type="button" class="btn btn-warning" onclick="uiComponents.hideAddStudentForm()">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;

        document.body.insertAdjacentHTML('beforeend', formHtml);

        // Add form event listener
        document.getElementById('addStudentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddStudent(e);
        });
    }

    // NEW: Hide Add Student Form
    hideAddStudentForm() {
        const container = document.getElementById('studentFormContainer');
        if (container) {
            container.remove();
        }
    }

    // NEW: Handle Add Student Form Submission
    handleAddStudent(e) {
        const formData = new FormData(e.target);
        const studentData = {};

        for (let [key, value] of formData.entries()) {
            studentData[key] = value.trim();
        }

        try {
            const student = this.dataManager.addStudent(studentData);
            this.showAlert(`Student "${student.fullName}" added successfully with ID: ${student.id}`, 'success');
            this.hideAddStudentForm();
            this.displayAllData();
            this.updateCounters();
        } catch (error) {
            // Check if it's a duplicate ID error
            if (error.message.startsWith('DUPLICATE_ID|')) {
                const parts = error.message.split('|');
                const message = parts[1];
                this.handleDuplicateIdError(message, studentData);
            } else {
                this.showAlert(`Failed to add student: ${error.message}`, 'error');
            }
        }
    }
    handleDuplicateIdError(errorMessage, studentData) {
        // Extract suggested ID from error message
        const suggestedIdMatch = errorMessage.match(/Suggested next ID: (\w+)/);
        const suggestedId = suggestedIdMatch ? suggestedIdMatch[1] : null;

        // Create enhanced error dialog
        const dialogHtml = `
        <div class="student-form-container" id="duplicateIdDialog" style="z-index: 1001;">
            <div class="student-form" style="max-width: 500px;">
                <h3 style="color: #e74c3c; margin-bottom: 20px;">Duplicate ID Error</h3>
                <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 15px; margin-bottom: 20px; color: #721c24;">
                    <strong>Error:</strong> ${errorMessage}
                </div>
                
                <div style="margin-bottom: 25px;">
                    <h4 style="margin-bottom: 15px; color: #2c3e50;">What would you like to do?</h4>
                    
                    <div style="display: flex; flex-direction: column; gap: 15px;">
                        ${suggestedId ? `
                        <button class="btn btn-success" onclick="uiComponents.useSuggestedId('${suggestedId}', ${JSON.stringify(studentData).replace(/"/g, '&quot;')})" style="padding: 15px;">
                            <strong>Use Suggested ID: ${suggestedId}</strong><br>
                            <small>Automatically use the next available ID</small>
                        </button>
                        ` : ''}
                        
                        <button class="btn btn-primary" onclick="uiComponents.editCurrentId(${JSON.stringify(studentData).replace(/"/g, '&quot;')})" style="padding: 15px;">
                            <strong>Edit Current ID</strong><br>
                            <small>Modify the ID "${studentData.id}" manually</small>
                        </button>
                        
                        <button class="btn btn-warning" onclick="uiComponents.showExistingStudent('${studentData.id}')" style="padding: 15px;">
                            <strong>View Existing Student</strong><br>
                            <small>See who already has ID "${studentData.id}"</small>
                        </button>
                    </div>
                </div>
                
                <div style="display: flex; gap: 15px; justify-content: center; margin-top: 20px;">
                    <button class="btn btn-export" onclick="uiComponents.closeDuplicateIdDialog()" style="background: #6c757d;">
                        Cancel & Go Back
                    </button>
                </div>
            </div>
        </div>
    `;

        document.body.insertAdjacentHTML('beforeend', dialogHtml);
    }
    useSuggestedId(suggestedId, studentData) {
        this.closeDuplicateIdDialog();

        // Update the student data with the suggested ID
        studentData.id = suggestedId;

        try {
            const student = this.dataManager.addStudent(studentData);
            this.showAlert(`Student "${student.fullName}" added successfully with ID: ${student.id}`, 'success');
            this.hideAddStudentForm();
            this.displayAllData();
            this.updateCounters();
        } catch (error) {
            this.showAlert(`Failed to add student with suggested ID: ${error.message}`, 'error');
            // If suggested ID also fails, show the form again
            this.editCurrentId(studentData);
        }
    }

    // Edit the current ID
    editCurrentId(studentData) {
        this.closeDuplicateIdDialog();

        // Pre-fill the form with the student data and focus on ID field
        this.showAddStudentForm();

        // Wait for form to be created, then fill it
        setTimeout(() => {
            const form = document.getElementById('addStudentForm');
            if (form) {
                // Fill all fields with the data
                Object.keys(studentData).forEach(key => {
                    const field = form.querySelector(`[name="${key}"]`);
                    if (field) {
                        field.value = studentData[key];
                    }
                });

                // Focus on the ID field and select its content
                const idField = form.querySelector('[name="id"]');
                if (idField) {
                    idField.focus();
                    idField.select();
                    // Add a red border to highlight the problematic field
                    idField.style.borderColor = '#e74c3c';
                    idField.style.boxShadow = '0 0 10px rgba(231, 76, 60, 0.3)';
                }
            }
        }, 100);
    }

    // Show existing student with the duplicate ID
    showExistingStudent(duplicateId) {
        this.closeDuplicateIdDialog();

        const existingStudent = this.dataManager.getStudentById(duplicateId);
        if (existingStudent) {
            // Show the existing student's information
            this.hideAddStudentForm(); // Close add form first

            // Create info display
            const infoHtml = `
            <div class="student-form-container" id="existingStudentInfo">
                <div class="student-form">
                    <h3 style="color: #2c3e50;">Existing Student with ID: ${duplicateId}</h3>
                    
                    <div style="background: #e8f5e8; border: 1px solid #27ae60; border-radius: 8px; padding: 20px; margin: 20px 0;">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                            <div>
                                <strong>Full Name:</strong><br>
                                ${existingStudent.fullName}
                            </div>
                            <div>
                                <strong>Phone:</strong><br>
                                ${existingStudent.phoneNumber}
                            </div>
                            <div>
                                <strong>Email:</strong><br>
                                ${existingStudent.email || 'Not provided'}
                            </div>
                            <div>
                                <strong>Grade:</strong><br>
                                ${existingStudent.gradeLevel || 'Not provided'}
                            </div>
                            <div>
                                <strong>School:</strong><br>
                                ${existingStudent.school || 'Not provided'}
                            </div>
                            <div>
                                <strong>Created:</strong><br>
                                ${new Date(existingStudent.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 15px; justify-content: center; margin-top: 25px; flex-wrap: wrap;">
                        <button class="btn btn-success" onclick="uiComponents.showEditStudentForm(uiComponents.dataManager.getStudentById('${duplicateId}'))">
                            Edit This Student
                        </button>
                        <button class="btn btn-primary" onclick="uiComponents.closeExistingStudentInfo(); uiComponents.showAddStudentForm();">
                            Add New Student Instead
                        </button>
                        <button class="btn btn-warning" onclick="uiComponents.closeExistingStudentInfo()">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;

            document.body.insertAdjacentHTML('beforeend', infoHtml);
        } else {
            this.showAlert('Existing student not found', 'error');
        }
    }

    // Close duplicate ID dialog
    closeDuplicateIdDialog() {
        const dialog = document.getElementById('duplicateIdDialog');
        if (dialog) {
            dialog.remove();
        }
    }

    // Close existing student info
    closeExistingStudentInfo() {
        const info = document.getElementById('existingStudentInfo');
        if (info) {
            info.remove();
        }
    }

    // NEW: Show Edit Student Form
    showEditStudentForm(student) {
        if (!student) {
            this.showAlert('No student selected for editing', 'error');
            return;
        }

        this.editingStudentId = student.id;
        this.editMode = true;

        const formHtml = `
            <div class="student-form-container" id="editStudentFormContainer">
                <div class="student-form">
                    <h3>Edit Student - ${student.fullName}</h3>
                    <form id="editStudentForm">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="editStudentId">Student ID*</label>
                                <input type="text" id="editStudentId" name="id" value="${student.id}" readonly>
                            </div>
                            <div class="form-group">
                                <label for="editFullName">Full Name*</label>
                                <input type="text" id="editFullName" name="fullName" value="${student.fullName}" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="editPhoneNumber">Phone Number*</label>
                                <input type="tel" id="editPhoneNumber" name="phoneNumber" value="${student.phoneNumber}" required>
                            </div>
                            <div class="form-group">
                                <label for="editEmail">Email</label>
                                <input type="email" id="editEmail" name="email" value="${student.email || ''}">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="editParentPhone">Parent's Phone</label>
                                <input type="tel" id="editParentPhone" name="parentPhone" value="${student.parentPhone || ''}">
                            </div>
                            <div class="form-group">
                                <label for="editGradeLevel">Grade Level</label>
                                <input type="text" id="editGradeLevel" name="gradeLevel" value="${student.gradeLevel || ''}">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="editCenter">Center</label>
                                <input type="text" id="editCenter" name="center" value="${student.center || ''}">
                            </div>
                            <div class="form-group">
                                <label for="editSchool">School</label>
                                <input type="text" id="editSchool" name="school" value="${student.school || ''}">
                            </div>
                        </div>
                        <div class="form-buttons">
                            <button type="submit" class="btn btn-success">Update Student</button>
                            <button type="button" class="btn btn-warning" onclick="uiComponents.hideEditStudentForm()">Cancel</button>
                            <button type="button" class="btn btn-export" onclick="uiComponents.deleteStudentTemporary('${student.id}')" style="background: #e74c3c;">Delete (Temp)</button>
                            <button type="button" class="btn btn-export" onclick="uiComponents.deleteStudentPermanent('${student.id}')" style="background: #c0392b;">Delete (Permanent)</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', formHtml);

        // Add form event listener
        document.getElementById('editStudentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEditStudent(e);
        });
    }

    // NEW: Hide Edit Student Form
    hideEditStudentForm() {
        const container = document.getElementById('editStudentFormContainer');
        if (container) {
            container.remove();
        }
        this.editMode = false;
        this.editingStudentId = null;
    }

    // NEW: Handle Edit Student Form Submission
    handleEditStudent(e) {
        const formData = new FormData(e.target);
        const updates = {};

        for (let [key, value] of formData.entries()) {
            if (key !== 'id') { // Don't update ID
                updates[key] = value.trim();
            }
        }

        try {
            const updatedStudent = this.dataManager.updateStudent(this.editingStudentId, updates);
            this.showAlert(`Student "${updatedStudent.fullName}" updated successfully`, 'success');
            this.hideEditStudentForm();
            this.displayAllData();
            this.updateCounters();

            // Update current student if it's the same one being edited
            if (this.currentStudent && this.currentStudent.id === updatedStudent.id) {
                this.currentStudent = updatedStudent;
                this.showStudentInfo(updatedStudent);
            }
        } catch (error) {
            this.showAlert(`Failed to update student: ${error.message}`, 'error');
        }
    }

    // NEW: Delete Student Temporarily
    deleteStudentTemporary(studentId) {
        if (!studentId) {
            this.showAlert('No student ID provided', 'error');
            return;
        }

        const student = this.dataManager.getStudentById(studentId);
        if (!student) {
            this.showAlert('Student not found', 'error');
            return;
        }

        const confirmMessage = `Are you sure you want to temporarily delete "${student.fullName}"?\nThis action can be undone by restoring the student.`;
        if (!confirm(confirmMessage)) return;

        try {
            const deletedData = this.dataManager.deleteStudentTemporary(studentId);
            this.showAlert(`Student "${deletedData.student.fullName}" moved to deleted records. Can be restored if needed.`, 'success');
            this.hideEditStudentForm();
            this.hideStudentInfo();
            this.displayAllData();
            this.updateCounters();
        } catch (error) {
            this.showAlert(`Failed to delete student: ${error.message}`, 'error');
        }
    }

    // NEW: Delete Student Permanently
    deleteStudentPermanent(studentId) {
        if (!studentId) {
            this.showAlert('No student ID provided', 'error');
            return;
        }

        const student = this.dataManager.getStudentById(studentId) ||
            this.dataManager.getDeletedStudents().find(d => d.student.id === studentId)?.student;

        if (!student) {
            this.showAlert('Student not found', 'error');
            return;
        }

        const confirmMessage = `WARNING\n\nAre you absolutely sure you want to permanently delete "${student.fullName}"?\n\nThis action CANNOT be undone and will remove:\n- Student information\n- All attendance records\n- All session data\n\nType "DELETE" to confirm:`;

        const confirmation = prompt(confirmMessage);
        if (confirmation !== 'DELETE') {
            this.showAlert('Deletion cancelled', 'success');
            return;
        }

        try {
            const result = this.dataManager.deleteStudentPermanent(studentId);
            this.showAlert(`Student "${result.student.fullName}" permanently deleted from ${result.source} records.`, 'success');
            this.hideEditStudentForm();
            this.hideStudentInfo();
            this.displayAllData();
            this.updateCounters();
        } catch (error) {
            this.showAlert(`Failed to permanently delete student: ${error.message}`, 'error');
        }
    }

    // FIXED: Show Deleted Students with improved error handling
    showDeletedStudents() {
        try {
            // Validate and fix deleted students structure before displaying
            if (this.dataManager.validateAndFixDeletedStudentsStructure) {
                this.dataManager.validateAndFixDeletedStudentsStructure();
            }

            const deletedStudents = this.dataManager.getDeletedStudents();

            if (deletedStudents.length === 0) {
                this.showAlert('No deleted students found', 'success');
                return;
            }

            console.log('Showing deleted students:', deletedStudents);

            const deletedListHtml = `
                <div class="deleted-students-container" id="deletedStudentsContainer">
                    <div class="deleted-students-list">
                        <h3>Deleted Students (${deletedStudents.length})</h3>
                        <div class="deleted-students-grid">
                            ${deletedStudents.map((deleted, index) => {
                // Handle different data structures
                const student = deleted.student || deleted;
                const deletedAt = deleted.deletedAt || 'Unknown';
                const studentId = student.id || `unknown_${index}`;
                const studentName = student.fullName || student.name || 'Unknown Student';
                const studentPhone = student.phoneNumber || student.phone || 'N/A';

                return `
                                    <div class="deleted-student-card">
                                        <h4>${studentName}</h4>
                                        <p><strong>ID:</strong> ${studentId}</p>
                                        <p><strong>Phone:</strong> ${studentPhone}</p>
                                        <p><strong>Deleted:</strong> ${new Date(deletedAt).toLocaleDateString()}</p>
                                        <p><strong>Structure:</strong> ${deleted.student ? 'Complete' : 'Basic'}</p>
                                        <div class="deleted-student-actions">
                                            <button class="btn btn-success btn-sm" onclick="uiComponents.restoreStudent('${studentId}')">
                                                Restore
                                            </button>
                                            <button class="btn btn-export btn-sm" onclick="uiComponents.deleteStudentPermanent('${studentId}')" style="background: #c0392b;">
                                                Delete Forever
                                            </button>
                                            <button class="btn btn-warning btn-sm" onclick="uiComponents.debugDeletedStudent(${index})" style="background: #17a2b8; font-size: 11px;">
                                                Debug
                                            </button>
                                        </div>
                                    </div>
                                `;
            }).join('')}
                        </div>
                        <div class="deleted-students-actions">
                            <button class="btn btn-warning" onclick="uiComponents.hideDeletedStudents()">Close</button>
                            <button class="btn btn-export" onclick="uiComponents.fixDeletedStudentsStructure()" style="background: #17a2b8;">Fix Structure</button>
                            <button class="btn btn-export" onclick="uiComponents.clearAllDeletedStudents()" style="background: #c0392b;">Clear All Deleted</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', deletedListHtml);
        } catch (error) {
            console.error('Error showing deleted students:', error);
            this.showAlert(`Error displaying deleted students: ${error.message}`, 'error');
        }
    }

    // NEW: Hide Deleted Students
    hideDeletedStudents() {
        const container = document.getElementById('deletedStudentsContainer');
        if (container) {
            container.remove();
        }
    }

    // FIXED: Restore Student with improved error handling
    restoreStudent(studentId) {
        if (!studentId || studentId === 'undefined' || studentId === 'null') {
            this.showAlert('Invalid student ID provided', 'error');
            return;
        }

        console.log('UI: Attempting to restore student with ID:', studentId);

        try {
            // First, let's see what deleted students we have
            const deletedStudents = this.dataManager.getDeletedStudents();
            console.log('Available deleted students:', deletedStudents.map(d => ({
                hasStudent: !!d.student,
                id: d.id || (d.student && d.student.id),
                name: d.fullName || (d.student && d.student.fullName),
                structure: typeof d
            })));

            // Find the student to confirm it exists
            let studentToRestore = null;
            for (const deleted of deletedStudents) {
                const student = deleted.student || deleted;
                if (student.id == studentId) {
                    studentToRestore = student;
                    break;
                }
            }

            if (!studentToRestore) {
                this.showAlert('Deleted student not found in records', 'error');
                console.error('Student not found. Looking for ID:', studentId);
                return;
            }

            const confirmMessage = `Restore "${studentToRestore.fullName || studentToRestore.name}" to active students?`;
            if (!confirm(confirmMessage)) return;

            // Attempt the restore
            const restoredStudent = this.dataManager.restoreStudent(studentId);

            this.showAlert(`Student "${restoredStudent.fullName}" restored successfully`, 'success');
            this.hideDeletedStudents();
            this.displayAllData();
            this.updateCounters();

        } catch (error) {
            console.error('Restore failed:', error);
            this.showAlert(`Failed to restore student: ${error.message}. Check console for details.`, 'error');

            // Show more detailed error info
            console.error('Detailed error info:', {
                studentId,
                error: error.message,
                stack: error.stack,
                deletedStudents: this.dataManager.getDeletedStudents()
            });
        }
    }

    // NEW: Debug function to examine deleted student structure
    debugDeletedStudent(index) {
        try {
            const deletedStudents = this.dataManager.getDeletedStudents();
            const student = deletedStudents[index];

            console.log('=== DELETED STUDENT DEBUG ===');
            console.log('Index:', index);
            console.log('Raw object:', student);
            console.log('Type:', typeof student);
            console.log('Has student property:', !!student.student);
            console.log('Direct ID:', student.id);
            console.log('Student ID:', student.student && student.student.id);
            console.log('Direct name:', student.fullName);
            console.log('Student name:', student.student && student.student.fullName);
            console.log('Has deletedAt:', !!student.deletedAt);
            console.log('Structure keys:', Object.keys(student));

            if (student.student) {
                console.log('Student object keys:', Object.keys(student.student));
            }

            alert(`Debug info logged to console for student at index ${index}. Check console for details.`);
        } catch (error) {
            console.error('Debug failed:', error);
            alert(`Debug failed: ${error.message}`);
        }
    }

    // NEW: Fix deleted students structure
    fixDeletedStudentsStructure() {
        try {
            if (!this.dataManager.validateAndFixDeletedStudentsStructure) {
                this.showAlert('Structure fix function not available', 'error');
                return;
            }

            const beforeCount = this.dataManager.getDeletedStudents().length;
            this.dataManager.validateAndFixDeletedStudentsStructure();
            const afterCount = this.dataManager.getDeletedStudents().length;

            this.dataManager.saveToStorage();
            this.showAlert(`Structure fixed. ${beforeCount} -> ${afterCount} deleted students`, 'success');

            // Refresh the display
            this.hideDeletedStudents();
            setTimeout(() => this.showDeletedStudents(), 100);

        } catch (error) {
            console.error('Fix structure failed:', error);
            this.showAlert(`Failed to fix structure: ${error.message}`, 'error');
        }
    }

    // NEW: Clear All Deleted Students
    clearAllDeletedStudents() {
        const deletedCount = this.dataManager.getDeletedStudents().length;

        if (deletedCount === 0) {
            this.showAlert('No deleted students to clear', 'success');
            return;
        }

        const confirmMessage = `PERMANENT ACTION\n\nAre you sure you want to permanently delete ALL ${deletedCount} students from the deleted records?\n\nThis action CANNOT be undone.\n\nType "CLEAR ALL" to confirm:`;

        const confirmation = prompt(confirmMessage);
        if (confirmation !== 'CLEAR ALL') {
            this.showAlert('Action cancelled', 'success');
            return;
        }

        try {
            const clearedCount = this.dataManager.clearDeletedStudents();
            this.showAlert(`${clearedCount} deleted students permanently removed`, 'success');
            this.hideDeletedStudents();
            this.updateCounters();
        } catch (error) {
            this.showAlert(`Failed to clear deleted students: ${error.message}`, 'error');
        }
    }

    // File validation
    async validateFileInput(file) {
        try {
            const validation = await this.excelHandler.validateImportFile(file);
            this.showAlert(`File is valid: ${validation.rowCount} rows found`, 'success');
        } catch (error) {
            this.showAlert(`File validation failed: ${error.message}`, 'error');
        }
    }

    // FIXED: Import functionality with structure validation
    // SOLUTION 3: Update UIComponents.importStudentData to be properly async
    async importStudentData() {
        const fileInput = document.getElementById('fileInput');
        const file = fileInput.files[0];

        if (!file) {
            this.showAlert('Please select a file to import', 'error');
            return;
        }

        try {
            // Show loading state
            this.setLoadingState(true, 'Importing student data with QR codes...');

            // Use the new import method that handles QR codes
            const result = await this.excelHandler.importStudentDataWithQR(file);

            // After import, validate deleted students structure
            if (this.dataManager.validateAndFixDeletedStudentsStructure) {
                this.dataManager.validateAndFixDeletedStudentsStructure();
            }

            // Show detailed results
            let message = `Imported ${result.studentsImported} students with ${result.recordsImported} session records.`;

            if (result.qrCodesRestored > 0) {
                message += ` Restored ${result.qrCodesRestored} QR codes.`;
            }

            if (result.qrCodesGenerated > 0) {
                message += ` Generated ${result.qrCodesGenerated} new QR codes.`;
            }

            if (result.failed.length > 0) {
                message += ` ${result.failed.length} rows failed.`;
                console.warn('Some imports failed:', result.failed);
            }

            this.showAlert(message, result.studentsImported > 0 ? 'success' : 'error');

            // Clear the file input
            fileInput.value = '';

            // Update displays
            this.displayImportedStudents();
            this.updateCounters();

        } catch (error) {
            console.error('Import failed:', error);
            this.showAlert(`Import failed: ${error.message}`, 'error');
        } finally {
            this.setLoadingState(false);
        }
    }

    // Export functionality
    async exportStudentInfo() {
        try {
            const result = this.excelHandler.exportStudentInfo();
            this.showAlert(`Student info exported: ${result.fileName}`, 'success');
        } catch (error) {
            this.showAlert(`Export failed: ${error.message}`, 'error');
        }
    }

    async exportStudentRecords() {
        try {
            const result = this.excelHandler.exportStudentRecords();
            this.showAlert(`Student records exported: ${result.fileName}`, 'success');
        } catch (error) {
            this.showAlert(`Export failed: ${error.message}`, 'error');
        }
    }

    async exportAttendanceLogs() {
        try {
            const result = this.excelHandler.exportAttendanceLogs();
            this.showAlert(`Attendance logs exported: ${result.fileName}`, 'success');
        } catch (error) {
            this.showAlert(`Export failed: ${error.message}`, 'error');
        }
    }

    // Search functionality
    searchStudent() {
        const searchTerm = document.getElementById('searchInput').value.trim();

        if (!searchTerm || searchTerm.length < CONFIG.ui.search.minSearchLength) {
            this.showAlert('Please enter a search term', 'error');
            return;
        }


        const results = this.dataManager.searchStudents(searchTerm);

        if (results.length === 0) {
            this.showAlert(`No results found for "${searchTerm}". Total students: ${this.dataManager.students.length}`, 'error');
            this.hideStudentInfo();
            return;
        }

        if (results.length === 1) {
            this.showStudentInfo(results[0]);
        } else {
            this.showSearchResults(results);
        }
    }

    // Search results display
    showSearchResults(results) {
        const resultsDiv = document.getElementById('searchResults');
        if (!resultsDiv) return;

        resultsDiv.innerHTML = '<h4 style="margin: 15px 0; color: #2c3e50;">Search Results:</h4>';

        results.forEach(student => {
            const resultDiv = document.createElement('div');
            resultDiv.style.cssText = `
                background: white; 
                padding: 15px; 
                margin: 10px 0; 
                border-radius: 8px; 
                border: 2px solid #e9ecef; 
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;
            resultDiv.innerHTML = `
                <div>
                    <strong>${student.fullName}</strong><br>
                    <small>ID: ${student.id} | Phone: ${student.phoneNumber}</small>
                </div>
                <div class="student-actions">
                    <button class="btn btn-sm btn-primary" onclick="uiComponents.showStudentInfo(uiComponents.dataManager.getStudentById('${student.id}'))" style="margin-right: 5px;">
                        View
                    </button>
                    <button class="btn btn-sm btn-success" onclick="uiComponents.showEditStudentForm(uiComponents.dataManager.getStudentById('${student.id}'))">
                        Edit
                    </button>
                </div>
            `;

            resultDiv.addEventListener('mouseover', () => {
                resultDiv.style.borderColor = '#3498db';
            });

            resultDiv.addEventListener('mouseout', () => {
                resultDiv.style.borderColor = '#e9ecef';
            });

            resultsDiv.appendChild(resultDiv);
        });
    }

    // Student information display
    showStudentInfo(student) {
        this.currentStudent = student;
        const detailsDiv = document.getElementById('studentDetails');
        if (!detailsDiv) return;

        detailsDiv.innerHTML = `
        <div class="detail-item">
            <div class="detail-label">Student ID</div>
            <div class="detail-value">${student.id}</div>
        </div>

        <div class="detail-item">
            <div class="detail-label">Full Name</div>
            <div class="detail-value">${student.fullName}</div>
        </div>

        <div class="detail-item">
            <div class="detail-label">Phone Number</div>
            <div class="detail-value">${student.phoneNumber}</div>
        </div>

        <div class="detail-item">
            <div class="detail-label">Parent's Phone</div>
            <div class="detail-value">${student.parentPhone}</div>
        </div>

        <div class="detail-item">
            <div class="detail-label">Grade Level</div>
            <div class="detail-value">${student.gradeLevel}</div>
        </div>

        <div class="detail-item">
            <div class="detail-label">School</div>
            <div class="detail-value">${student.school}</div>
        </div>

        <div class="detail-item" style="grid-column: 1 / -1;">
            <div class="student-action-buttons" style="margin-top: 15px; display: flex; gap: 10px; flex-wrap: wrap;">
                <button class="btn btn-success" onclick="uiComponents.showEditStudentForm(uiComponents.currentStudent)">
                    Edit Student
                </button>

                <button class="btn btn-qr" onclick="qrHandler.showStudentQR(uiComponents.currentStudent)">
                    📱 Generate QR Code
                </button>

                <button class="btn btn-warning" onclick="uiComponents.deleteStudentTemporary('${student.id}')" style="background:#f39c12;">
                    Delete (Temp)
                </button>

                <button class="btn btn-export" onclick="uiComponents.deleteStudentPermanent('${student.id}')" style="background:#e74c3c;">
                    Delete (Permanent)
                </button>
            </div>
        </div>
    `;

        this.displayStudentSessionRecords(student);

        document.getElementById('studentInfo')?.classList.add('show');
        document.getElementById('searchResults')?.replaceChildren();
    }


    hideStudentInfo() {
        const studentInfoDiv = document.getElementById('studentInfo');
        if (studentInfoDiv) {
            studentInfoDiv.classList.remove('show');
        }
        this.currentStudent = null;
    }

    // Display student session records
    displayStudentSessionRecords(student) {
        const studentRecord = this.dataManager.getStudentRecord(student.id);
        const recordsContent = document.getElementById('studentRecordsContent');

        if (!recordsContent) return;

        if (!studentRecord) {
            recordsContent.innerHTML = '<p>No session records found for this student.</p>';
            return;
        }

        let recordsHTML = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 15px;">';

        for (let i = 1; i <= CONFIG.sessions.maxSessions; i++) {
            const session = studentRecord.sessions[i];
            const hasData = session.attendance || session.homework || session.quiz !== null || session.date;

            if (hasData) {
                const attStatus = this.getStatusDisplay(session.attendance, 'attendance');
                const hwStatus = this.getStatusDisplay(session.homework, 'homework');
                const quizScore = session.quiz !== null ? `${session.quiz}/10` : 'Not Set';
                const sessionDate = session.date ? `${session.date}` : 'Date not recorded';

                recordsHTML += `
                    <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #3498db;">
                        <h5 style="color: #2c3e50; margin-bottom: 10px;">${CONFIG.getSessionName(i)}</h5>
                        <div class="session-date" style="margin-bottom: 8px; font-size: 11px; color: #666; font-style: italic;">${sessionDate}</div>
                        <div style="font-size: 13px; margin-bottom: 5px;"><strong>Attendance:</strong> ${attStatus}</div>
                        <div style="font-size: 13px; margin-bottom: 5px;"><strong>Homework:</strong> ${hwStatus}</div>
                        <div style="font-size: 13px;"><strong>Quiz:</strong> ${quizScore}</div>
                    </div>
                `;
            }
        }

        recordsHTML += '</div>';

        if (recordsHTML === '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 15px;"></div>') {
            recordsContent.innerHTML = '<p style="color: #666; font-style: italic;">No session records available yet.</p>';
        } else {
            recordsContent.innerHTML = recordsHTML;
        }
    }

    // Get status display with appropriate formatting
    getStatusDisplay(value, type) {
        const statusMaps = {
            attendance: {
                'present': 'Present',
                'absent': 'Absent'
            },
            homework: {
                'complete': 'Complete',
                'partial': 'Partial',
                'not-done': 'Not Done'
            }
        };

        return statusMaps[type] && statusMaps[type][value] || 'Not Set';
    }

    // Attendance marking
    markAttendance(status) {
        if (!this.currentStudent) {
            this.showAlert('Please select a student first', 'error');
            return;
        }

        const sessionNum = document.getElementById('sessionNumber').value;
        const hwStatus = document.getElementById('hwStatus').value;
        const quizScore = document.getElementById('quizScore').value || CONFIG.quiz.defaultScore;

        try {
            // Update student session record
            const sessionData = {
                attendance: status,
                homework: hwStatus,
                quiz: parseInt(quizScore),
                date: new Date().toLocaleDateString('en-US')
            };

            this.dataManager.updateStudentSession(this.currentStudent.id, parseInt(sessionNum), sessionData);

            // Create attendance log
            const logData = {
                studentId: this.currentStudent.id,
                studentName: this.currentStudent.fullName,
                session: parseInt(sessionNum),
                attendance: status,
                homework: hwStatus,
                quiz: parseInt(quizScore)
            };

            const logResult = this.dataManager.addAttendanceLog(logData);
		        // ⭐ ADD THIS BLOCK:
        if (window.syncClient && syncClient.isConnected()) {
            syncClient.markAttendance({
                studentId: this.currentStudent.id,
                studentName: this.currentStudent.fullName,
                session: parseInt(sessionNum),
                attendance: status,
                homework: hwStatus,
                quiz: parseInt(quizScore),
                date: new Date().toLocaleDateString('en-US'),
                time: new Date().toLocaleTimeString('en-US')
            });
        }

            const action = logResult.createdAt === logResult.updatedAt ? 'New record created' : 'Updated existing record';
            this.showAlert(`${action}: ${this.currentStudent.fullName} - ${CONFIG.getSessionName(parseInt(sessionNum))} - ${status.toUpperCase()}`, 'success');

            // Update displays
            this.displayStudentSessionRecords(this.currentStudent);
            this.updateCounters();

            // Clear quiz score input
            const quizInput = document.getElementById('quizScore');
            if (quizInput) quizInput.value = '';

        } catch (error) {
            this.showAlert(`Failed to mark attendance: ${error.message}`, 'error');
        }
    }

    // Mark all others as absent
    markAllOthersAbsent() {
        if (!this.currentStudent) {
            this.showAlert('Please select a student first to determine the current session', 'error');
            return;
        }

        const sessionNum = document.getElementById('sessionNumber').value;
        const today = new Date().toLocaleDateString('en-US');

        // Find students not marked for this session today
        const allStudents = this.dataManager.getAllStudents();
        const studentsToMarkAbsent = allStudents.filter(student => {
            if (student.id === this.currentStudent.id) return false;

            const todayLogs = this.dataManager.getAttendanceLogs({
                studentId: student.id,
                date: today,
                session: parseInt(sessionNum)
            });

            return todayLogs.length === 0;
        });

        if (studentsToMarkAbsent.length === 0) {
            this.showAlert(`All other students have already been marked for ${CONFIG.getSessionName(parseInt(sessionNum))} today`, 'success');
            return;
        }

        const confirmMessage = `Mark ${studentsToMarkAbsent.length} students as ABSENT for ${CONFIG.getSessionName(parseInt(sessionNum))}?\n\nStudents to be marked ABSENT:\n${studentsToMarkAbsent.slice(0, 5).map(s => `• ${s.fullName}`).join('\n')}${studentsToMarkAbsent.length > 5 ? `\n... and ${studentsToMarkAbsent.length - 5} more` : ''}`;

        if (!confirm(confirmMessage)) return;

        let markedCount = 0;

        studentsToMarkAbsent.forEach(student => {
            try {
                // Update student session record
                const sessionData = {
                    attendance: 'absent',
                    homework: 'not-done',
                    quiz: 0,
                    date: today
                };

                this.dataManager.updateStudentSession(student.id, parseInt(sessionNum), sessionData);

                // Create attendance log
                const logData = {
                    studentId: student.id,
                    studentName: student.fullName,
                    session: parseInt(sessionNum),
                    attendance: 'absent',
                    homework: 'not-done',
                    quiz: 0
                };

                this.dataManager.addAttendanceLog(logData);
                markedCount++;

            } catch (error) {
                console.error(`Failed to mark ${student.fullName} as absent:`, error);
            }
        });

        this.showAlert(`Successfully marked ${markedCount} students as ABSENT for ${CONFIG.getSessionName(parseInt(sessionNum))}`, 'success');

        this.updateCounters();
        if (this.currentStudent) {
            this.displayStudentSessionRecords(this.currentStudent);
        }
    }

    // Display functions
    displayImportedStudents() {
        const tbody = document.querySelector('#importedStudentsTable tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        const students = this.dataManager.getAllStudents();

        students.forEach(student => {
            const hasQR = student.qrCodeUrl ? '✅' : '❌';
            const row = document.createElement('tr');
            row.innerHTML = `
            <td>${student.id}</td>
            <td>${student.fullName}</td>
            <td>${student.phoneNumber}</td>
            <td>${student.email}</td>
            <td>${student.parentPhone}</td>
            <td>${student.gradeLevel}</td>
            <td>
                <div class="student-actions">
                    <button class="btn btn-sm btn-primary" onclick="uiComponents.showStudentInfo(uiComponents.dataManager.getStudentById('${student.id}'))" title="View Details">
                        👁️
                    </button>
                    <button class="btn btn-sm btn-success" onclick="uiComponents.showEditStudentForm(uiComponents.dataManager.getStudentById('${student.id}'))" title="Edit Student">
                        ✏️
                    </button>
                    <button class="btn btn-sm" onclick="qrHandler.showStudentQR(uiComponents.dataManager.getStudentById('${student.id}'))" 
                            title="${hasQR === '✅' ? 'View QR Code' : 'Generate QR Code'}"
                            style="background: ${hasQR === '✅' ? '#9b59b6' : '#95a5a6'}; color: white;">
                        ${hasQR}
                    </button>
                </div>
            </td>
        `;
            tbody.appendChild(row);
        });
    }


    displayStudentRecords() {
        const tbody = document.querySelector('#studentRecordsTable tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        const records = this.dataManager.getAllStudentRecords();

        records.forEach(record => {
            const row = document.createElement('tr');
            let html = `
                <td>${record.id}</td>
                <td>${record.fullName}</td>
                <td>${record.parentPhone}</td>
            `;

            // Show first 3 sessions in the table
            for (let i = 1; i <= 3; i++) {
                const session = record.sessions[i];
                const attStatus = session.attendance ? (session.attendance === 'present' ? 'P' : 'A') : '-';
                const hwStatus = session.homework ? session.homework.charAt(0).toUpperCase() : '-';
                const quizScore = session.quiz !== null && session.quiz !== undefined ? session.quiz : '-';

                html += `
                    <td><span class="status-${session.attendance || 'absent'}">${attStatus}</span></td>
                    <td><span class="status-${session.homework || 'not-done'}">${hwStatus}</span></td>
                    <td>${quizScore}</td>
                `;
            }

            html += `
                <td>
                    <div class="student-actions">
                        <button class="btn btn-sm btn-primary" onclick="uiComponents.showStudentInfo(uiComponents.dataManager.getStudentById('${record.id}'))" title="View Details">
                            👁️
                        </button>
                        <button class="btn btn-sm btn-success" onclick="uiComponents.showEditStudentForm(uiComponents.dataManager.getStudentById('${record.id}'))" title="Edit Student">
                            ✏️
                        </button>
                    </div>
                </td>
            `;

            row.innerHTML = html;
            tbody.appendChild(row);
        });
    }

    displayAttendanceLogs() {
        const tbody = document.querySelector('#attendanceTable tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        const logs = this.dataManager.getAttendanceLogs();

        logs.forEach(log => {
            const row = document.createElement('tr');

            const hwStatusText = {
                'complete': 'Complete',
                'partial': 'Partial',
                'not-done': 'Not Done'
            };

            row.innerHTML = `
                <td>${log.date}</td>
                <td>${log.time}</td>
                <td>${log.studentId}</td>
                <td>${log.studentName}</td>
                <td>${CONFIG.getSessionName(log.session)}</td>
                <td><span class="status-${log.attendance}">${log.attendance.toUpperCase()}</span></td>
                <td><span class="status-${log.homework}">${hwStatusText[log.homework]}</span></td>
                <td>${log.quiz}/10</td>
            `;
            tbody.appendChild(row);
        });
    }

    // Update counters
    updateCounters() {
        const stats = this.dataManager.getStatistics();

        const elements = {
            totalStudentsCount: stats.totalStudents,
            totalRecordsCount: stats.totalRecords,
            presentTodayCount: stats.todayPresent,
            absentTodayCount: stats.todayAbsent
        };

        Object.keys(elements).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = elements[id];
            }
        });

        // Update all deleted students counters
        const deletedCount = stats.deletedStudents || 0;
        ['deletedStudentsCount', 'deletedStudentsCount2', 'deletedStudentsCountReport'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = deletedCount;
            }
        });

        // Update QR statistics
        this.updateQRStats();
    }

    updateQRStats() {
        if (!this.dataManager) return;

        const students = this.dataManager.getAllStudents();
        const withQR = students.filter(s => s.qrCodeUrl).length;
        const withoutQR = students.length - withQR;

        const generatedElement = document.getElementById('qrGeneratedCount');
        const missingElement = document.getElementById('qrMissingCount');

        if (generatedElement) generatedElement.textContent = withQR;
        if (missingElement) missingElement.textContent = withoutQR;
    }


    // Display all data
    displayAllData() {
        this.displayImportedStudents();
        this.displayStudentRecords();
        this.displayAttendanceLogs();
        this.updateCounters();
    }

    // Table sorting functionality
    sortTable(tableId, columnIndex) {
        const table = document.getElementById(tableId);
        if (!table) return;

        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));

        const sortKey = `${tableId}_${columnIndex}`;
        if (!this.sortStates[sortKey]) {
            this.sortStates[sortKey] = 'asc';
        } else {
            this.sortStates[sortKey] = this.sortStates[sortKey] === 'asc' ? 'desc' : 'asc';
        }

        const isAscending = this.sortStates[sortKey] === 'asc';

        rows.sort((rowA, rowB) => {
            const cellA = rowA.cells[columnIndex];
            const cellB = rowB.cells[columnIndex];

            if (!cellA || !cellB) return 0;

            let textA = cellA.textContent.trim();
            let textB = cellB.textContent.trim();

            const numA = parseFloat(textA);
            const numB = parseFloat(textB);

            if (!isNaN(numA) && !isNaN(numB)) {
                return isAscending ? numA - numB : numB - numA;
            }

            textA = textA.toLowerCase();
            textB = textB.toLowerCase();

            if (textA < textB) return isAscending ? -1 : 1;
            if (textA > textB) return isAscending ? 1 : -1;
            return 0;
        });

        tbody.innerHTML = '';
        rows.forEach(row => tbody.appendChild(row));

        this.updateSortArrows(tableId, columnIndex, isAscending);
    }

    updateSortArrows(tableId, activeColumn, isAscending) {
        const table = document.getElementById(tableId);
        if (!table) return;

        const headers = table.querySelectorAll('th .sort-arrow');

        headers.forEach((arrow, index) => {
            if (index === activeColumn) {
                arrow.textContent = isAscending ? '↑' : '↓';
                arrow.style.opacity = '1';
            } else {
                arrow.textContent = '↕';
                arrow.style.opacity = '0.6';
            }
        });
    }

    // Loading state management
    setLoadingState(isLoading, message = 'Loading...') {
        // You can implement loading overlays, spinners, etc.
        if (isLoading) {
            console.log(message);
            // Disable buttons, show spinner, etc.
        } else {
            console.log('Loading complete');
            // Re-enable buttons, hide spinner, etc.
        }
    }

    // Utility methods
    formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    formatTime(time) {
        return new Date(time).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Create sample data for testing
    createSampleData() {
        const sampleStudents = [
            {
                id: '2024001',
                fullName: 'Ahmed Mohamed Ali',
                phoneNumber: '01234567890',
                email: 'ahmed.ali@email.com',
                parentPhone: '01987654321',
                gradeLevel: '10th Grade',
                school: 'Cairo International School'
            },
            {
                id: '2024002',
                fullName: 'Fatima Hassan Ibrahim',
                phoneNumber: '01234567891',
                email: 'fatima.hassan@email.com',
                parentPhone: '01987654322',
                gradeLevel: '11th Grade',
                school: 'New Cairo High School'
            }
        ];

        try {
            const results = this.dataManager.addMultipleStudents(sampleStudents);
            this.showAlert(`Created ${results.successful.length} sample students`, 'success');
            this.displayAllData();
        } catch (error) {
            this.showAlert(`Failed to create sample data: ${error.message}`, 'error');
        }
    }

    // Download template
    downloadTemplate() {
        try {
            const result = this.excelHandler.createImportTemplate();
            this.showAlert(`Template downloaded: ${result.fileName}`, 'success');
        } catch (error) {


            this.showAlert(`Failed to create template: ${error.message}`, 'error');
        }
    }
  
// Add this function to app.js in the UIComponents class
    updateQRStats() {
    if (!window.dataManager) return;

    const students = dataManager.getAllStudents();
    const withQR = students.filter(s => s.qrCodeUrl).length;
    const withoutQR = students.length - withQR;

    const generatedElement = document.getElementById('qrGeneratedCount');
    const missingElement = document.getElementById('qrMissingCount');

    if (generatedElement) generatedElement.textContent = withQR;
    if (missingElement) missingElement.textContent = withoutQR;
}

    // Call this in updateCounters() method
    // Add at the end of updateCounters() in UIComponents class:
}

// Create singleton instance
const uiComponents = new UIComponents(dataManager, excelHandler);

// Global functions for HTML onclick events

function showTab(tabName) {
    uiComponents.showTab(tabName);
}

function importStudentData() {
    uiComponents.importStudentData();
}

function exportStudentInfo() {
    uiComponents.exportStudentInfo();
}

function exportStudentRecords() {
    uiComponents.exportStudentRecords();
}

function exportAttendanceLogs() {
    uiComponents.exportAttendanceLogs();
}

function searchStudent() {
    uiComponents.searchStudent();
}

function markAttendance(status) {
    uiComponents.markAttendance(status);
}

function markAllOthersAbsent() {
    uiComponents.markAllOthersAbsent();
}

function sortTable(tableId, columnIndex) {
    uiComponents.sortTable(tableId, columnIndex);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UIComponents, uiComponents };
} else {
    window.UIComponents = UIComponents;
    window.uiComponents = uiComponents;
}
// Main Script - Integrates all modules for Student Management System


// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', async function () {
    console.log('Initializing Student Management System...');

    // Initialize data manager
    dataManager.init();

    // Initialize UI components
    uiComponents.init();

    // Check for students without QR codes and offer to generate
    setTimeout(async () => {
        const students = dataManager.getAllStudents();
        const studentsWithoutQR = students.filter(s => !s.qrCodeUrl);

        if (studentsWithoutQR.length > 0) {
            console.log(`Found ${studentsWithoutQR.length} students without QR codes`);

            const shouldGenerate = confirm(
                `Found ${studentsWithoutQR.length} students without QR codes.\n\n` +
                `Would you like to generate QR codes for them now?\n\n` +
                `(You can also generate them later from the QR Code Management section)`
            );

            if (shouldGenerate && window.qrHandler) {
                await qrHandler.generateQRForAllStudents();
            }
        }
    }, 1000); // Wait 1 second after initialization

    // Show welcome message
    showWelcomeMessage();

    console.log('System initialized successfully!');
});

// Create global app object
window.app = {
    data: dataManager,
    excel: excelHandler,
    ui: uiComponents
};
function showWelcomeMessage() {
    const alertContainer = document.getElementById('alertContainer');
    if (alertContainer) {
        const welcomeDiv = document.createElement('div');
        welcomeDiv.className = 'alert alert-success';
        welcomeDiv.innerHTML = `
            <strong>Welcome to ${CONFIG.app.name}!</strong><br>
            System ready. You can now:
            <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Add new students manually</li>
                <li>Import student data from Excel files</li>
                <li>Edit existing student information</li>
                <li>Mark attendance and track progress</li>
                <li>View deleted students and restore if needed</li>
            </ul>
            <button onclick="this.parentElement.style.display='none'" style="float: right; background: none; border: none; font-size: 18px; cursor: pointer;">&times;</button>
        `;
        alertContainer.appendChild(welcomeDiv);
    }
}

// Development helper functions (remove in production)
// Development helper functions (remove in production)
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    // Development mode - add helper functions
    window.DEV = {
        createSampleData: async () => {
            try {
                const sampleStudents = [
                    {
                        id: '2024001',
                        fullName: 'Ahmed Mohamed Ali',
                        phoneNumber: '01234567890',
                        email: 'ahmed.ali@email.com',
                        parentPhone: '01987654321',
                        gradeLevel: '10th Grade',
                        school: 'Cairo International School',
                        center: 'Main Center'
                    },
                    {
                        id: '2024002',
                        fullName: 'Fatima Hassan Ibrahim',
                        phoneNumber: '01234567891',
                        email: 'fatima.hassan@email.com',
                        parentPhone: '01987654322',
                        gradeLevel: '11th Grade',
                        school: 'New Cairo High School',
                        center: 'East Center'
                    },
                    {
                        id: '2024003',
                        fullName: 'Omar Khaled Mahmoud',
                        phoneNumber: '01234567892',
                        email: 'omar.khaled@email.com',
                        parentPhone: '01987654323',
                        gradeLevel: '9th Grade',
                        school: 'Nasr City School',
                        center: 'West Center'
                    }
                ];

                const results = await dataManager.addMultipleStudents(sampleStudents);

                // Add some sample session data
                for (const result of results.successful) {
                    const studentId = result.student.id;

                    // Add session data for first 2 sessions
                    for (let session = 1; session <= 2; session++) {
                        const sessionData = {
                            attendance: Math.random() > 0.2 ? 'present' : 'absent',
                            homework: ['complete', 'partial', 'not-done'][Math.floor(Math.random() * 3)],
                            quiz: Math.floor(Math.random() * 11),
                            date: new Date(Date.now() - (session * 7 * 24 * 60 * 60 * 1000)).toLocaleDateString('en-US')
                        };

                        dataManager.updateStudentSession(studentId, session, sessionData);

                        // Create attendance log
                        dataManager.addAttendanceLog({
                            studentId: studentId,
                            studentName: result.student.fullName,
                            session: session,
                            attendance: sessionData.attendance,
                            homework: sessionData.homework,
                            quiz: sessionData.quiz,
                            date: sessionData.date
                        });
                    }
                }

                uiComponents.displayAllData();
                uiComponents.showAlert(`Created ${results.successful.length} sample students with session data`, 'success');
                console.log('Sample data created successfully');

                return results;
            } catch (error) {
                console.error('Failed to create sample data:', error);
                uiComponents.showAlert(`Failed to create sample data: ${error.message}`, 'error');
            }
        },

        clearAllData: () => {
            if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
                dataManager.clearAllData();
                uiComponents.displayAllData();
                uiComponents.updateCounters();
                console.log('All data cleared');
                uiComponents.showAlert('All data has been cleared', 'success');
            }
        },

        exportAllData: async () => {
            try {
                const result = await excelHandler.exportAllDataWithQR();
                console.log('All data exported:', result);
                uiComponents.showAlert(`Data exported to ${result.fileName}`, 'success');
                return result;
            } catch (error) {
                console.error('Export failed:', error);
                uiComponents.showAlert(`Export failed: ${error.message}`, 'error');
            }
        },

        getStats: () => {
            const stats = dataManager.getStatistics();
            console.table(stats);
            return stats;
        },

        downloadTemplate: () => uiComponents.downloadTemplate(),

        testStudentOperations: async () => {
            try {
                console.log('Testing student CRUD operations...');

                // Test add student
                const testStudent = {
                    id: 'TEST001',
                    fullName: 'Test Student',
                    phoneNumber: '01000000000',
                    email: 'test@test.com',
                    parentPhone: '01000000001',
                    gradeLevel: '12th Grade',
                    school: 'Test School'
                };

                const addedStudent = await dataManager.addStudent(testStudent);
                console.log('✅ Add student test passed');

                // Test update student
                const updatedStudent = dataManager.updateStudent('TEST001', {
                    fullName: 'Updated Test Student',
                    email: 'updated@test.com'
                });
                console.log('✅ Update student test passed');

                // Test temporary delete
                const tempDeleted = dataManager.deleteStudentTemporary('TEST001');
                console.log('✅ Temporary delete test passed');

                // Test restore student
                const restored = dataManager.restoreStudent('TEST001');
                console.log('✅ Restore student test passed');

                // Test permanent delete
                const permDeleted = dataManager.deleteStudentPermanent('TEST001');
                console.log('✅ Permanent delete test passed');

                console.log('🎉 All CRUD operations tests passed!');
                uiComponents.displayAllData();
                uiComponents.updateCounters();

                return 'All tests passed!';
            } catch (error) {
                console.error('❌ Test failed:', error);
                return `Test failed: ${error.message}`;
            }
        },

        showDeletedStudents: () => uiComponents.showDeletedStudents(),

        addTestStudent: async (suffix = '') => {
            const student = {
                id: `TEST${suffix || Date.now()}`,
                fullName: `Test Student ${suffix || Date.now()}`,
                phoneNumber: `010000${Math.floor(Math.random() * 10000)}`,
                email: `test${suffix || Date.now()}@test.com`,
                parentPhone: `011000${Math.floor(Math.random() * 10000)}`,
                gradeLevel: '10th Grade',
                school: 'Test School'
            };

            try {
                const added = await dataManager.addStudent(student);
                uiComponents.displayAllData();
                uiComponents.updateCounters();
                console.log('Test student added:', added);
                return added;
            } catch (error) {
                console.error('Failed to add test student:', error);
                return null;
            }
        },

        generateAllQR: async () => {
            console.log('Generating QR codes for all students...');
            const results = await dataManager.generateAllMissingQRs();
            console.log('Results:', results);
            uiComponents.updateQRStats();
            uiComponents.displayAllData();
            return results;
        },

        checkQRStatus: () => {
            const students = dataManager.getAllStudents();
            const withQR = students.filter(s => s.qrCodeUrl);
            const withoutQR = students.filter(s => !s.qrCodeUrl);

            console.log('=== QR CODE STATUS ===');
            console.log(`Total Students: ${students.length}`);
            console.log(`With QR: ${withQR.length}`);
            console.log(`Without QR: ${withoutQR.length}`);
            console.log('\nStudents without QR:', withoutQR.map(s => ({ id: s.id, name: s.fullName })));

            return { total: students.length, withQR: withQR.length, withoutQR: withoutQR.length };
        }
    };

    console.log('Development mode active. Available commands:');
    console.log('- DEV.createSampleData() - Create sample student data with session records');
    console.log('- DEV.clearAllData() - Clear all data');
    console.log('- DEV.exportAllData() - Export all data to Excel with QR codes');
    console.log('- DEV.getStats() - Show statistics');
    console.log('- DEV.downloadTemplate() - Download import template');
    console.log('- DEV.testStudentOperations() - Test all CRUD operations');
    console.log('- DEV.showDeletedStudents() - Show deleted students interface');
    console.log('- DEV.addTestStudent(suffix) - Add a test student quickly');
    console.log('- DEV.generateAllQR() - Generate QR codes for all students');
    console.log('- DEV.checkQRStatus() - Check QR code generation status');
}

// Error handling
window.addEventListener('error', function (e) {
    console.error('Application Error:', e.error);

    if (uiComponents && uiComponents.showAlert) {
        uiComponents.showAlert('An unexpected error occurred. Please refresh the page if the problem persists.', 'error');
    }
});

// Unhandled promise rejection handling
window.addEventListener('unhandledrejection', function (e) {
    console.error('Unhandled Promise Rejection:', e.reason);

    if (uiComponents && uiComponents.showAlert) {
        uiComponents.showAlert('An error occurred while processing your request. Please try again.', 'error');
    }

    e.preventDefault();
});

// Performance monitoring (optional)
if ('performance' in window) {
    window.addEventListener('load', function () {
        setTimeout(() => {
            const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
            console.log(`Page load time: ${loadTime}ms`);

            if (performance.memory) {
                console.log('Memory usage:', {
                    used: `${Math.round(performance.memory.usedJSHeapSize / 1048576)}MB`,
                    total: `${Math.round(performance.memory.totalJSHeapSize / 1048576)}MB`,
                    limit: `${Math.round(performance.memory.jsHeapSizeLimit / 1048576)}MB`
                });
            }
        }, 0);
    });
}

// Keyboard shortcuts
document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        uiComponents.showAddStudentForm();
    }

    if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.focus();
            uiComponents.showTab('attendance');
        }
    }

    if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        uiComponents.showDeletedStudents();
    }

    if (e.key === 'Escape') {
        const modals = [
            'studentFormContainer',
            'editStudentFormContainer',
            'deletedStudentsContainer'
        ];

        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.remove();
            }
        });

        if (uiComponents.editMode) {
            uiComponents.editMode = false;
            uiComponents.editingStudentId = null;
        }
    }
});

// Export functions
async function exportStudentInfoWithQR() {
    try {
        const result = await excelHandler.exportStudentInfoWithQR();
        uiComponents.showAlert(
            `Exported ${result.recordCount} students with ${result.qrCodesIncluded} QR codes!`,
            'success'
        );
    } catch (error) {
        uiComponents.showAlert(`Export failed: ${error.message}`, 'error');
    }
}

async function exportAllDataWithQR() {
    try {
        const result = await excelHandler.exportAllDataWithQR();
        uiComponents.showAlert(
            `Complete export with ${result.qrCodesIncluded} QR codes saved!`,
            'success'
        );
    } catch (error) {
        uiComponents.showAlert(`Export failed: ${error.message}`, 'error');
    }
}

// Make functions globally available
window.exportStudentInfoWithQR = exportStudentInfoWithQR;
window.exportAllDataWithQR = exportAllDataWithQR;

// Make all modules globally available
window.CONFIG = CONFIG;
window.DataManager = DataManager;
window.dataManager = dataManager;
window.ExcelHandler = ExcelHandler;
window.excelHandler = excelHandler;
window.UIComponents = UIComponents;
window.uiComponents = uiComponents;

console.log('Student Management System fully loaded and ready!');