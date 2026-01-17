// sync-client.js - Real-time Synchronization Client
class SyncClient {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.serverUrl = this.detectServerUrl();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.heartbeatInterval = null;
        this.deviceInfo = this.getDeviceInfo();
    }

    // Detect server URL (works for local network)
    detectServerUrl() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        return host ? `${protocol}//${host}` : 'ws://localhost:3000';
    }

    // Get device information
    getDeviceInfo() {
        const ua = navigator.userAgent;
        let deviceType = 'desktop';
        
        if (/mobile/i.test(ua)) {
            deviceType = 'mobile';
        } else if (/tablet/i.test(ua)) {
            deviceType = 'tablet';
        }
        
        return {
            deviceType: deviceType,
            deviceName: this.getDeviceName(),
            userAgent: ua,
            screenWidth: window.screen.width,
            screenHeight: window.screen.height
        };
    }

    getDeviceName() {
        const ua = navigator.userAgent;
        
        if (/iPhone/i.test(ua)) return 'iPhone';
        if (/iPad/i.test(ua)) return 'iPad';
        if (/Android/i.test(ua)) {
            if (/mobile/i.test(ua)) return 'Android Phone';
            return 'Android Tablet';
        }
        if (/Mac/i.test(ua)) return 'Mac';
        if (/Windows/i.test(ua)) return 'Windows PC';
        if (/Linux/i.test(ua)) return 'Linux PC';
        
        return 'Unknown Device';
    }

    // Initialize connection
    connect() {
        console.log('🔌 Connecting to server...');
        
        // Initialize Socket.io
        this.socket = io(this.serverUrl, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: this.maxReconnectAttempts
        });

        this.setupEventHandlers();
    }

    // Setup all event handlers
    setupEventHandlers() {
        // Connection established
        this.socket.on('connect', () => {
            console.log('✅ Connected to server!');
            this.connected = true;
            this.reconnectAttempts = 0;
            
            // Send device info
            this.socket.emit('client-info', this.deviceInfo);
            
            // Update UI
            this.updateConnectionStatus(true);
            
            // Start heartbeat
            this.startHeartbeat();
            
            // Show notification
            if (window.uiComponents) {
                uiComponents.showAlert('Connected to server successfully!', 'success');
            }
        });

        // Receive initial data
        this.socket.on('initial-data', (data) => {
            console.log('📥 Received initial data from server');
            this.handleDataSync(data);
        });

        // Real-time data sync
        this.socket.on('data-sync', (data) => {
            console.log('🔄 Data synchronized from another device');
            this.handleDataSync(data);
        });

        // Update confirmation
        this.socket.on('update-confirmed', (response) => {
            console.log('✅ Update confirmed by server', response);
        });

        // Operation success
        this.socket.on('operation-success', (response) => {
            console.log('✅ Operation successful:', response.operation);
            
            if (window.uiComponents) {
                uiComponents.showAlert(`Operation "${response.operation}" completed successfully`, 'success');
            }
        });

        // Operation error
        this.socket.on('operation-error', (response) => {
            console.error('❌ Operation failed:', response.operation, response.error);
            
            if (window.uiComponents) {
                uiComponents.showAlert(`Error: ${response.error}`, 'error');
            }
        });

        // QR scan result
        this.socket.on('qr-scan-result', (result) => {
            if (result.success) {
                console.log('✅ QR Scan successful:', result.student.fullName);
                
                if (window.uiComponents) {
                    uiComponents.showStudentInfo(result.student);
                    uiComponents.showAlert(`Student found: ${result.student.fullName}`, 'success');
                }
            } else {
                console.error('❌ QR Scan failed:', result.error);
                
                if (window.uiComponents) {
                    uiComponents.showAlert(`QR Scan failed: ${result.error}`, 'error');
                }
            }
        });

        // Student scanned notification
        this.socket.on('student-scanned', (data) => {
            console.log('📷 Student scanned by another device:', data.studentName);
            
            // Optional: Show notification that another device scanned a student
            // This helps coordinate between multiple users
        });

        // Connected clients update
        this.socket.on('clients-update', (data) => {
            console.log(`👥 Connected devices: ${data.count}`);
            this.updateConnectedClientsDisplay(data);
        });

        // Connection lost
        this.socket.on('disconnect', (reason) => {
            console.log('❌ Disconnected from server:', reason);
            this.connected = false;
            this.updateConnectionStatus(false);
            this.stopHeartbeat();
            
            if (window.uiComponents) {
                uiComponents.showAlert('Connection lost. Attempting to reconnect...', 'error');
            }
        });

        // Reconnection attempts
        this.socket.on('reconnect_attempt', (attemptNumber) => {
            console.log(`🔄 Reconnection attempt ${attemptNumber}...`);
            this.reconnectAttempts = attemptNumber;
        });

        // Reconnection successful
        this.socket.on('reconnect', (attemptNumber) => {
            console.log(`✅ Reconnected after ${attemptNumber} attempts`);
            
            if (window.uiComponents) {
                uiComponents.showAlert('Reconnected to server!', 'success');
            }
        });

        // Reconnection failed
        this.socket.on('reconnect_failed', () => {
            console.error('❌ Failed to reconnect to server');
            
            if (window.uiComponents) {
                uiComponents.showAlert('Unable to reconnect to server. Please refresh the page.', 'error');
            }
        });

        // Connection error
        this.socket.on('connect_error', (error) => {
            console.error('❌ Connection error:', error.message);
        });
    }

    // Handle incoming data synchronization
    handleDataSync(data) {
        if (!window.dataManager) {
            console.error('DataManager not available');
            return;
        }

        try {
            // Import data without triggering another sync
            dataManager.students = data.students || [];
            dataManager.studentRecords = data.studentRecords || [];
            dataManager.attendanceLogs = data.attendanceLogs || [];
            dataManager.deletedStudents = data.deletedStudents || [];
            dataManager.saveToStorage();

            // Update UI
            if (window.uiComponents) {
                uiComponents.displayAllData();
                uiComponents.updateCounters();
            }

            console.log('✅ Data synchronized successfully');
        } catch (error) {
            console.error('❌ Error syncing data:', error);
        }
    }

    // Send data update to server
    sendDataUpdate() {
        if (!this.connected || !this.socket) {
            console.warn('⚠️ Not connected to server');
            return;
        }

        const data = {
            students: dataManager.students,
            studentRecords: dataManager.studentRecords,
            attendanceLogs: dataManager.attendanceLogs,
            deletedStudents: dataManager.deletedStudents
        };

        this.socket.emit('data-update', data);
    }

    // Add student through server
    addStudent(studentData) {
        if (!this.connected || !this.socket) {
            console.warn('⚠️ Not connected to server');
            return Promise.reject(new Error('Not connected to server'));
        }

        return new Promise((resolve, reject) => {
            this.socket.emit('add-student', studentData);
            
            // Listen for response
            const successHandler = (response) => {
                if (response.operation === 'add-student') {
                    this.socket.off('operation-success', successHandler);
                    this.socket.off('operation-error', errorHandler);
                    resolve(response.data);
                }
            };
            
            const errorHandler = (response) => {
                if (response.operation === 'add-student') {
                    this.socket.off('operation-success', successHandler);
                    this.socket.off('operation-error', errorHandler);
                    reject(new Error(response.error));
                }
            };
            
            this.socket.on('operation-success', successHandler);
            this.socket.on('operation-error', errorHandler);
        });
    }

    // Mark attendance through server
    markAttendance(attendanceData) {
        if (!this.connected || !this.socket) {
            console.warn('⚠️ Not connected to server');
            return Promise.reject(new Error('Not connected to server'));
        }

        return new Promise((resolve, reject) => {
            this.socket.emit('mark-attendance', attendanceData);
            
            // Listen for response
            const successHandler = (response) => {
                if (response.operation === 'mark-attendance') {
                    this.socket.off('operation-success', successHandler);
                    this.socket.off('operation-error', errorHandler);
                    resolve(response.data);
                }
            };
            
            const errorHandler = (response) => {
                if (response.operation === 'mark-attendance') {
                    this.socket.off('operation-success', successHandler);
                    this.socket.off('operation-error', errorHandler);
                    reject(new Error(response.error));
                }
            };
            
            this.socket.on('operation-success', successHandler);
            this.socket.on('operation-error', errorHandler);
        });
    }

    // Send QR scan data
    sendQRScan(studentId) {
        if (!this.connected || !this.socket) {
            console.warn('⚠️ Not connected to server');
            return;
        }

        this.socket.emit('qr-scan', { studentId });
    }

    // Heartbeat to keep connection alive
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.connected && this.socket) {
                this.socket.emit('heartbeat');
            }
        }, 30000); // Every 30 seconds
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    // Update connection status in UI
    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            statusElement.className = `connection-status ${connected ? 'connected' : 'disconnected'}`;
            statusElement.innerHTML = connected 
                ? '🟢 Connected' 
                : '🔴 Disconnected';
        }
    }

    // Update connected clients display
    updateConnectedClientsDisplay(data) {
        const clientsElement = document.getElementById('connectedClients');
        if (clientsElement) {
            clientsElement.textContent = data.count;
        }

        const clientsListElement = document.getElementById('clientsList');
        if (clientsListElement && data.clients) {
            clientsListElement.innerHTML = data.clients.map(client => `
                <div class="client-item">
                    <span class="client-device">${client.deviceName || 'Unknown'}</span>
                    <span class="client-time">${new Date(client.connectedAt).toLocaleTimeString()}</span>
                </div>
            `).join('');
        }
    }

    // Disconnect from server
    disconnect() {
        if (this.socket) {
            this.stopHeartbeat();
            this.socket.disconnect();
            this.connected = false;
            console.log('🔌 Disconnected from server');
        }
    }

    // Check if connected
    isConnected() {
        return this.connected && this.socket && this.socket.connected;
    }
}

// Create global sync client instance
const syncClient = new SyncClient();

// Auto-connect when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing sync client...');
    syncClient.connect();
});

// Disconnect on page unload
window.addEventListener('beforeunload', () => {
    syncClient.disconnect();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SyncClient, syncClient };
} else {
    window.SyncClient = SyncClient;
    window.syncClient = syncClient;
}