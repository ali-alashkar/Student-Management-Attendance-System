// Main Script - Integrates all modules for Student Management System

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all modules in the correct order
    initializeApplication();
});

async function initializeApplication() {
    try {
        console.log('Initializing Student Management System...');
        
        // Check if all required modules are loaded
        if (typeof CONFIG === 'undefined') {
            throw new Error('CONFIG module not loaded');
        }
        if (typeof DataManager === 'undefined') {
            throw new Error('DataManager module not loaded');
        }
        if (typeof ExcelHandler === 'undefined') {
            throw new Error('ExcelHandler module not loaded');
        }
        if (typeof UIComponents === 'undefined') {
            throw new Error('UIComponents module not loaded');
        }

        // Initialize data manager
        console.log('Initializing data manager...');
        dataManager.init();

        // Initialize UI components
        console.log('Initializing UI components...');
        uiComponents.init();

        console.log('✅ Student Management System initialized successfully');
        
        // Show welcome message
        showWelcomeMessage();

    } catch (error) {
        console.error('Failed to initialize application:', error);
        alert(`Failed to initialize application: ${error.message}`);
    }
}

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
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    // Development mode - add helper functions
    window.DEV = {
        createSampleData: () => {
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

                const results = dataManager.addMultipleStudents(sampleStudents);
                
                // Add some sample session data
                results.successful.forEach((result, index) => {
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
                });

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
        
        exportAllData: () => {
            try {
                const result = excelHandler.exportAllData();
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
        
        testStudentOperations: () => {
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
                
                const addedStudent = dataManager.addStudent(testStudent);
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
        
        addTestStudent: (suffix = '') => {
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
                const added = dataManager.addStudent(student);
                uiComponents.displayAllData();
                uiComponents.updateCounters();
                console.log('Test student added:', added);
                return added;
            } catch (error) {
                console.error('Failed to add test student:', error);
                return null;
            }
        }
    };
    
    console.log('Development mode active. Available commands:');
    console.log('- DEV.createSampleData() - Create sample student data with session records');
    console.log('- DEV.clearAllData() - Clear all data');
    console.log('- DEV.exportAllData() - Export all data to Excel');
    console.log('- DEV.getStats() - Show statistics');
    console.log('- DEV.downloadTemplate() - Download import template');
    console.log('- DEV.testStudentOperations() - Test all CRUD operations');
    console.log('- DEV.showDeletedStudents() - Show deleted students interface');
    console.log('- DEV.addTestStudent(suffix) - Add a test student quickly');
}

// Error handling
window.addEventListener('error', function(e) {
    console.error('Application Error:', e.error);
    
    // Show user-friendly error message
    if (uiComponents && uiComponents.showAlert) {
        uiComponents.showAlert('An unexpected error occurred. Please refresh the page if the problem persists.', 'error');
    }
});

// Unhandled promise rejection handling
window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled Promise Rejection:', e.reason);
    
    if (uiComponents && uiComponents.showAlert) {
        uiComponents.showAlert('An error occurred while processing your request. Please try again.', 'error');
    }
    
    e.preventDefault();
});

// Performance monitoring (optional)
if ('performance' in window) {
    window.addEventListener('load', function() {
        setTimeout(() => {
            const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
            console.log(`Page load time: ${loadTime}ms`);
            
            // Log memory usage if available
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
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + Alt + A: Add new student
    if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        uiComponents.showAddStudentForm();
    }
    
    // Ctrl/Cmd + Alt + S: Search students (focus search input)
    if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.focus();
            uiComponents.showTab('attendance');
        }
    }
    
    // Ctrl/Cmd + Alt + D: Show deleted students
    if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        uiComponents.showDeletedStudents();
    }
    
    // Escape key: Close modals
    if (e.key === 'Escape') {
        // Close any open forms or modals
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
        
        // Reset edit mode
        if (uiComponents.editMode) {
            uiComponents.editMode = false;
            uiComponents.editingStudentId = null;
        }
    }
});

// Auto-save functionality (if needed in the future)
let autoSaveInterval;

function enableAutoSave(intervalMinutes = 5) {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
    }
    
    autoSaveInterval = setInterval(() => {
        try {
            dataManager.saveToStorage();
            console.log('Auto-save completed');
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    }, intervalMinutes * 60 * 1000);
    
    console.log(`Auto-save enabled (every ${intervalMinutes} minutes)`);
}

function disableAutoSave() {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        autoSaveInterval = null;
        console.log('Auto-save disabled');
    }
}

// Optional: Enable auto-save in development mode
if (window.location.hostname === 'localhost') {
    // enableAutoSave(1); // Every 1 minute in development
}

console.log('Student Management System fully loaded and ready!');