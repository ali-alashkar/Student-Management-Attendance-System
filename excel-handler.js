// Excel Handler Module for Import/Export functionality
class ExcelHandler {
    constructor(dataManager) {
        this.dataManager = dataManager;
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

    // Export all data to a comprehensive Excel file
    exportAllData() {
        const students = this.dataManager.getAllStudents();
        const records = this.dataManager.getAllStudentRecords();
        const logs = this.dataManager.getAttendanceLogs();

        if (students.length === 0 && records.length === 0 && logs.length === 0) {
            throw new Error('No data to export');
        }

        const wb = XLSX.utils.book_new();

        // Student Info Sheet
        if (students.length > 0) {
            const studentData = students.map(student => ({
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
            const ws1 = XLSX.utils.json_to_sheet(studentData);
            XLSX.utils.book_append_sheet(wb, ws1, "Student Info");
        }

        // Student Records Sheet
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

        // Attendance Logs Sheet
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

        const fileName = `Complete_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);

        return {
            success: true,
            fileName,
            sheets: {
                students: students.length,
                records: records.length,
                logs: logs.length
            }
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