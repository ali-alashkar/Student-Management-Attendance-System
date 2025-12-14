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
    addStudent(studentData) {
        const validation = CONFIG.validateStudent(studentData);
        if (!validation.isValid) {
            throw new Error(`Invalid student data: ${validation.errors.join(', ')}`);
        }

        // Check for duplicate ID
        if (this.getStudentById(studentData.id)) {
            throw new Error(`Student with ID ${studentData.id} already exists`);
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
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.students.push(student);
        this.createStudentRecord(student);
        this.saveToStorage();
        
        return student;
    }

    addMultipleStudents(studentsData) {
        const results = {
            successful: [],
            failed: [],
            total: studentsData.length
        };

        studentsData.forEach((studentData, index) => {
            try {
                const student = this.addStudent(studentData);
                results.successful.push({ index, student });
            } catch (error) {
                results.failed.push({ index, error: error.message, data: studentData });
            }
        });

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

// Modified importData method to handle deleted students properly
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
            this.saveToStorage();
            
            return {
                success: true,
                imported: {
                    students: data.students.length,
                    records: data.studentRecords.length,
                    logs: data.attendanceLogs.length,
                    deleted: (data.deletedStudents || []).length
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
addStudent(studentData) {
    const validation = CONFIG.validateStudent(studentData);
    if (!validation.isValid) {
        throw new Error(`Invalid student data: ${validation.errors.join(', ')}`);
    }

    // Check for duplicate ID with enhanced error message
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    this.students.push(student);
    this.createStudentRecord(student);
    this.saveToStorage();
    
    return student;
}
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