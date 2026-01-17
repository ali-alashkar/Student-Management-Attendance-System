// qr-handler.js - QR Code Generation and Scanning
class QRHandler {
    constructor() {
        this.qrScanner = null;
        this.isScanning = false;
    }

    // Generate QR code for a student
    async generateStudentQR(studentId, containerElement) {
        try {
            if (!containerElement) {
                throw new Error("QR container missing");
            }

            const qrData = `STUDENT:${studentId}`;
            containerElement.innerHTML = "";

            new QRCode(containerElement, {
                text: qrData,
                width: 256,
                height: 256,
                colorDark: "#000000",
                colorLight: "#FFFFFF",
                correctLevel: QRCode.CorrectLevel.H
            });

        } catch (error) {
            console.error("Failed to generate QR code:", error);
            throw error;
        }
    }

    // Generate QR code as data URL
    async generateStudentQRDataURL(studentId) {
        return new Promise((resolve, reject) => {
            try {
                const tempDiv = document.createElement("div");
                tempDiv.style.display = "none";
                document.body.appendChild(tempDiv);

                new QRCode(tempDiv, {
                    text: `STUDENT:${studentId}`,
                    width: 256,
                    height: 256
                });

                setTimeout(() => {
                    const img = tempDiv.querySelector("img");
                    const canvas = tempDiv.querySelector("canvas");

                    if (img) {
                        resolve(img.src);
                    } else if (canvas) {
                        resolve(canvas.toDataURL("image/png"));
                    } else {
                        reject("QR not generated");
                    }

                    document.body.removeChild(tempDiv);
                }, 100);

            } catch (err) {
                reject(err);
            }
        });
    }

    // Show QR code for a student
    async showStudentQR(student) {
        // Check if student has permanent QR, if not generate it
        if (!student.qrCodeUrl && window.dataManager) {
            try {
                await dataManager.generatePermanentQR(student.id);
                student = dataManager.getStudentById(student.id);
            } catch (error) {
                console.error('Failed to generate permanent QR:', error);
            }
        }

        const modalHtml = `
        <div class="qr-modal-container" id="qrModalContainer">
            <div class="qr-modal">
                <div class="qr-modal-header">
                    <h3>Student QR Code</h3>
                    <button class="close-button" onclick="qrHandler.closeQRModal()">×</button>
                </div>
                <div class="qr-modal-body">
                    <div class="student-info-qr">
                        <h4>${student.fullName}</h4>
                        <p>ID: ${student.id}</p>
                        <p>Grade: ${student.gradeLevel || 'N/A'}</p>
                        ${student.qrGeneratedAt ? `<p style="font-size: 11px; color: #7f8c8d;">QR Generated: ${new Date(student.qrGeneratedAt).toLocaleDateString()}</p>` : ''}
                    </div>
                    <div id="qrCodeContainer" class="qr-code-container">
                        ${student.qrCodeUrl
                ? `<img src="${student.qrCodeUrl}" alt="QR Code" style="border: 4px solid #9b59b6; border-radius: 10px; padding: 10px; background: white; max-width: 280px;" />`
                : '<div class="loading">Generating QR Code...</div>'}
                    </div>
                    <div class="qr-instructions">
                        <p>📱 This is ${student.fullName}'s permanent QR code</p>
                        <p style="font-size: 12px; color: #7f8c8d;">This QR code is saved and will remain the same</p>
                    </div>
                    <div class="qr-actions">
                        <button class="btn btn-primary" onclick="qrHandler.downloadQR('${student.id}', '${student.fullName}')">
                            Download QR Code
                        </button>
                        <button class="btn btn-export" onclick="qrHandler.printQR('${student.id}')">
                            Print QR Code
                        </button>
                        <button class="btn btn-warning" onclick="qrHandler.regenerateQR('${student.id}')" style="background: #f39c12;">
                            🔄 Regenerate QR
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        if (!student.qrCodeUrl) {
            const container = document.getElementById('qrCodeContainer');
            try {
                await this.generateStudentQR(student.id, container);
            } catch (error) {
                container.innerHTML = '<p style="color: red;">Failed to generate QR code</p>';
            }
        }
    }

    async regenerateQR(studentId) {
        if (!window.dataManager) {
            console.error('DataManager not available');
            return;
        }

        const student = dataManager.getStudentById(studentId);
        if (!student) {
            console.error('Student not found');
            return;
        }

        if (!confirm(`Regenerate QR code for ${student.fullName}?\n\nThis will create a new QR code and replace the existing one.`)) {
            return;
        }

        try {
            const studentIndex = dataManager.students.findIndex(s => s.id == studentId);
            if (studentIndex !== -1) {
                dataManager.students[studentIndex].qrCodeUrl = null;
                dataManager.students[studentIndex].qrGeneratedAt = null;
            }

            await dataManager.generatePermanentQR(studentId);

            if (window.uiComponents) {
                uiComponents.showAlert('QR code regenerated successfully!', 'success');
            }

            this.closeQRModal();
            const updatedStudent = dataManager.getStudentById(studentId);
            this.showStudentQR(updatedStudent);

        } catch (error) {
            console.error('Failed to regenerate QR:', error);
            if (window.uiComponents) {
                uiComponents.showAlert('Failed to regenerate QR code', 'error');
            }
        }
    }

    closeQRModal() {
        const modal = document.getElementById('qrModalContainer');
        if (modal) {
            modal.remove();
        }
    }

    async downloadQR(studentId, studentName) {
        try {
            let dataUrl;

            if (window.dataManager) {
                const student = dataManager.getStudentById(studentId);
                if (student && student.qrCodeUrl) {
                    dataUrl = student.qrCodeUrl;
                }
            }

            if (!dataUrl) {
                dataUrl = await this.generateStudentQRDataURL(studentId);
            }

            const link = document.createElement('a');
            link.download = `QR_${studentName}_${studentId}.png`;
            link.href = dataUrl;
            link.click();

            if (window.uiComponents) {
                uiComponents.showAlert('QR Code downloaded successfully!', 'success');
            }
        } catch (error) {
            console.error('Download failed:', error);
            if (window.uiComponents) {
                uiComponents.showAlert('Failed to download QR code', 'error');
            }
        }
    }

    async generateQRForAllStudents() {
        if (!window.dataManager) {
            console.error('DataManager not available');
            return;
        }

        const students = dataManager.getAllStudents();
        const studentsNeedingQR = students.filter(s => !s.qrCodeUrl);

        if (studentsNeedingQR.length === 0) {
            if (window.uiComponents) {
                uiComponents.showAlert('All students already have QR codes!', 'success');
            }
            return;
        }

        if (!confirm(`Generate QR codes for ${studentsNeedingQR.length} students?\n\nThis may take a moment...`)) {
            return;
        }

        if (window.uiComponents) {
            uiComponents.setLoadingState(true, 'Generating QR codes...');
        }

        try {
            const results = await dataManager.generateAllMissingQRs();

            if (window.uiComponents) {
                uiComponents.setLoadingState(false);

                if (results.failed.length > 0) {
                    uiComponents.showAlert(
                        `Generated ${results.successful.length} QR codes. ${results.failed.length} failed.`,
                        'success'
                    );
                    console.error('Failed QR generations:', results.failed);
                } else {
                    uiComponents.showAlert(
                        `Successfully generated ${results.successful.length} QR codes!`,
                        'success'
                    );
                }

                uiComponents.displayAllData();
            }

            return results;
        } catch (error) {
            console.error('Batch QR generation failed:', error);
            if (window.uiComponents) {
                uiComponents.setLoadingState(false);
                uiComponents.showAlert('Failed to generate QR codes', 'error');
            }
        }
    }

    async printQR(studentId) {
        try {
            const student = dataManager.getStudentById(studentId);
            if (!student) {
                throw new Error('Student not found');
            }

            const dataUrl = await this.generateStudentQRDataURL(studentId);

            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>QR Code - ${student.fullName}</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            min-height: 100vh;
                            margin: 0;
                            flex-direction: column;
                        }
                        .qr-print-container {
                            text-align: center;
                            padding: 40px;
                            border: 2px solid #333;
                            border-radius: 10px;
                        }
                        h2 { margin-bottom: 10px; }
                        p { margin: 5px 0; color: #666; }
                        img { margin: 20px 0; }
                        @media print {
                            body { margin: 0; }
                            .qr-print-container { border: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="qr-print-container">
                        <h2>${student.fullName}</h2>
                        <p>Student ID: ${student.id}</p>
                        <p>Grade: ${student.gradeLevel || 'N/A'}</p>
                        <img src="${dataUrl}" alt="QR Code" />
                        <p style="font-size: 12px;">Student Management System</p>
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();

            setTimeout(() => {
                printWindow.print();
            }, 250);

        } catch (error) {
            console.error('Print failed:', error);
            if (window.uiComponents) {
                uiComponents.showAlert('Failed to print QR code', 'error');
            }
        }
    }

    async generateAllQRCodes() {
        const students = dataManager.getAllStudents();

        if (students.length === 0) {
            if (window.uiComponents) {
                uiComponents.showAlert('No students to generate QR codes for', 'error');
            }
            return;
        }

        const modalHtml = `
            <div class="qr-modal-container" id="qrBulkModalContainer">
                <div class="qr-modal" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
                    <div class="qr-modal-header">
                        <h3>All Student QR Codes (${students.length})</h3>
                        <button class="close-button" onclick="qrHandler.closeBulkQRModal()">×</button>
                    </div>
                    <div class="qr-modal-body">
                        <div class="qr-bulk-actions" style="margin-bottom: 20px; text-align: center;">
                            <button class="btn btn-primary" onclick="qrHandler.downloadAllQRCodes()">
                                📥 Download All
                            </button>
                            <button class="btn btn-export" onclick="qrHandler.printAllQRCodes()">
                                🖨️ Print All
                            </button>
                        </div>
                        <div id="qrBulkGrid" class="qr-bulk-grid">
                            <div class="loading">Generating QR Codes...</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const grid = document.getElementById('qrBulkGrid');
        grid.innerHTML = '';

        for (const student of students) {
            const qrCard = document.createElement('div');
            qrCard.className = 'qr-card';
            qrCard.innerHTML = `
                <div class="qr-card-header">
                    <strong>${student.fullName}</strong>
                    <small>ID: ${student.id}</small>
                </div>
                <div class="qr-card-body" id="qr-${student.id}"></div>
                <div class="qr-card-footer">
                    <button class="btn btn-sm btn-primary" onclick="qrHandler.downloadQR('${student.id}', '${student.fullName}')">
                        Download
                    </button>
                </div>
            `;
            grid.appendChild(qrCard);

            try {
                await this.generateStudentQR(student.id, document.getElementById(`qr-${student.id}`));
            } catch (error) {
                document.getElementById(`qr-${student.id}`).innerHTML = '<small style="color: red;">Error</small>';
            }
        }
    }

    closeBulkQRModal() {
        const modal = document.getElementById('qrBulkModalContainer');
        if (modal) {
            modal.remove();
        }
    }

    // Start QR code scanner
    async startScanner() {
        const scannerHtml = `
            <div class="qr-scanner-container" id="qrScannerContainer">
                <div class="qr-scanner-modal">
                    <div class="qr-scanner-header">
                        <h3>📷 Scan Student QR Code</h3>
                        <button class="close-button" onclick="qrHandler.stopScanner()">×</button>
                    </div>
                    <div class="qr-scanner-body">
                        <video id="qrVideo" style="width: 100%; max-width: 500px; border-radius: 10px;"></video>
                        <div id="qrScanResult" class="qr-scan-result"></div>
                        <div class="qr-scanner-instructions">
                            <p>📱 Point your camera at a student's QR code</p>
                            <p>The system will automatically detect and show student info</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', scannerHtml);

        const video = document.getElementById('qrVideo');
        const resultDiv = document.getElementById('qrScanResult');

        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera not supported in this browser');
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });

            video.srcObject = stream;
            video.play();

            this.isScanning = true;
            this.scanQRCode(video, resultDiv);

        } catch (error) {
            console.error('Scanner error:', error);
            resultDiv.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
        }
    }

    // Scan QR code from video stream
    scanQRCode(video, resultDiv) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        const tick = () => {
            if (!this.isScanning) return;

            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

                if (typeof jsQR !== 'undefined') {
                    const code = jsQR(imageData.data, imageData.width, imageData.height);

                    if (code) {
                        this.handleQRScan(code.data, resultDiv);
                        return;
                    }
                }
            }

            requestAnimationFrame(tick);
        };

        tick();
    }

    // ⭐ FIXED: Handle scanned QR code
    handleQRScan(data, resultDiv) {
        console.log('QR Code scanned:', data);

        // Parse QR code data (format: STUDENT:{ID})
        if (data.startsWith('STUDENT:')) {
            const studentId = data.replace('STUDENT:', '');

            // First check locally
            const student = dataManager.getStudentById(studentId);

            if (student) {
                console.log('Student found locally:', student.fullName);

                // Show student info in UI
                if (window.uiComponents) {
                    // Stop scanner
                    this.stopScanner();

                    // Switch to attendance tab
                    uiComponents.showTab('attendance');

                    // Show student info
                    uiComponents.showStudentInfo(student);

                    // Show success alert
                    uiComponents.showAlert(`✅ Student found: ${student.fullName} (ID: ${studentId})`, 'success');
                }

                // Send to server if connected
                if (window.syncClient && syncClient.isConnected()) {
                    syncClient.sendQRScan(studentId);
                }
            } else {
                // Student not found locally, try server
                console.warn('Student not found locally, checking server...');
                resultDiv.innerHTML = '<p style="color: orange;">Checking server...</p>';

                if (window.syncClient && syncClient.isConnected()) {
                    syncClient.sendQRScan(studentId);
                } else {
                    resultDiv.innerHTML = '<p style="color: red;">Student not found</p>';
                    if (window.uiComponents) {
                        uiComponents.showAlert(`❌ Student with ID ${studentId} not found`, 'error');
                    }
                }
            }
        } else {
            resultDiv.innerHTML = '<p style="color: orange;">Invalid QR code format</p>';
            console.warn('Invalid QR code format:', data);
        }
    }

    // Stop QR code scanner
    stopScanner() {
        this.isScanning = false;

        const video = document.getElementById('qrVideo');
        if (video && video.srcObject) {
            const tracks = video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
        }

        const container = document.getElementById('qrScannerContainer');
        if (container) {
            container.remove();
        }
    }
}

// Create global instance
const qrHandler = new QRHandler();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { QRHandler, qrHandler };
} else {
    window.QRHandler = QRHandler;
    window.qrHandler = qrHandler;
}