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
    async importStudentData() {
        const fileInput = document.getElementById('fileInput');
        const file = fileInput.files[0];

        if (!file) {
            this.showAlert('Please select a file to import', 'error');
            return;
        }

        try {
            // Show loading state
            this.setLoadingState(true, 'Importing student data...');
            
            const result = await this.excelHandler.importStudentData(file);
            
            // After import, validate deleted students structure
            if (this.dataManager.validateAndFixDeletedStudentsStructure) {
                this.dataManager.validateAndFixDeletedStudentsStructure();
            }
            
            if (result.failed.length > 0) {
                console.warn('Some imports failed:', result.failed);
                this.showAlert(
                    `Imported ${result.studentsImported} students. ${result.failed.length} rows failed. Check console for details.`,
                    result.studentsImported > 0 ? 'success' : 'error'
                );
            } else {
                this.showAlert(
                    `Successfully imported ${result.studentsImported} students with ${result.recordsImported} session records`,
                    'success'
                );
            }

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
                    <button class="btn btn-warning" onclick="uiComponents.deleteStudentTemporary('${student.id}')" style="background: #f39c12;">
                        Delete (Temp)
                    </button>
                    <button class="btn btn-export" onclick="uiComponents.deleteStudentPermanent('${student.id}')" style="background: #e74c3c;">
                        Delete (Permanent)
                    </button>
                </div>
            </div>
        `;
        
        this.displayStudentSessionRecords(student);
        
        const studentInfoDiv = document.getElementById('studentInfo');
        if (studentInfoDiv) {
            studentInfoDiv.classList.add('show');
        }
        
        const searchResults = document.getElementById('searchResults');
        if (searchResults) {
            searchResults.innerHTML = '';
        }
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

        // Update deleted students counter if exists
        const deletedCountElement = document.getElementById('deletedStudentsCount');
        if (deletedCountElement) {
            deletedCountElement.textContent = stats.deletedStudents || 0;
        }

        // Update second deleted students counter if exists
        const deletedCountElement2 = document.getElementById('deletedStudentsCount2');
        if (deletedCountElement2) {
            deletedCountElement2.textContent = stats.deletedStudents || 0;
        }
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