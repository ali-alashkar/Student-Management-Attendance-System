// Configuration file for Student Management System
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
CONFIG.getSessionName = function(sessionNumber) {
    return this.sessions.sessionNames[sessionNumber - 1] || `Session ${sessionNumber}`;
};

CONFIG.getExportFileName = function(type, includeDate = true) {
    const baseName = this.export.fileNames[type] || type;
    const timestamp = includeDate && this.export.includeTimestamp 
        ? `_${new Date().toISOString().split('T')[0]}`
        : '';
    return `${baseName}${timestamp}${this.export.fileExtension}`;
};

CONFIG.getSessionColumnPatterns = function(sessionNumber) {
    const patterns = {};
    Object.keys(this.import.sessionColumnPatterns).forEach(key => {
        patterns[key] = this.import.sessionColumnPatterns[key].map(pattern => 
            pattern.replace('{n}', sessionNumber)
        );
    });
    return patterns;
};

CONFIG.validateStudent = function(student) {
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

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.CONFIG = CONFIG;
}