import axios from 'axios';
import AsyncStorage from "@react-native-async-storage/async-storage";

// Cấu hình base URL
const BASE_URL = 'http://10.0.2.2:8080/api';
// const BASE_URL = 'http://localhost:8080/api';

// Tạo axios instance
const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - Thêm token vào mỗi request
apiClient.interceptors.request.use(
    async (config) => {
        // Lấy token từ AsyncStorage (nếu có)
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - Xử lý response và errors
apiClient.interceptors.response.use(
    (response) => {
        return response.data;
    },
    (error) => {
        if (error.response) {
            // Server trả về error response
            console.error('API Error:', error.response.data);

            // Xử lý các trường hợp đặc biệt
            if (error.response.status === 401) {
                // Token hết hạn, logout user
                // handleLogout();
            }
        } else if (error.request) {
            // Request được gửi nhưng không nhận được response
            console.error('Network Error:', error.request);
        } else {
            console.error('Error:', error.message);
        }

        return Promise.reject(error);
    }
);

const api = {
    // GET request
    get: (url, params = {}) => {
        return apiClient.get(url, { params });
    },

    // POST request
    post: (url, data) => {
        return apiClient.post(url, data);
    },

    // PUT request
    put: (url, data) => {
        return apiClient.put(url, data);
    },

    // PATCH request
    patch: (url, data) => {
        return apiClient.patch(url, data);
    },

    // DELETE request
    delete: (url) => {
        return apiClient.delete(url);
    },

    // Upload file với FormData
    upload: (url, formData) => {
        return apiClient.post(url, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },
};

const UserService = {
    register: (username, password, name) => {
        return api.post('/auth/register', { username, password, name });
    },

    login: (username, password) => {
        return api.post('/auth/login', { username, password });
    }
};

const DeviceService = {
    register: (deviceData) => {
        return api.post('/register-device', deviceData);
    },

    getDevices: () => {
        return api.get('/get-devices');
    }
};

const RecordService = {
    save: (recordData) => {
        return api.post('/save-record', recordData);
    },

    getRecords: (username) => {
        return api.get('/get-records?username=' + username);
    }
};

const FallService = {
    save: (fallData) => {
        return api.post('/save-fall-event', fallData);
    },

    getFalls: (username) => {
        return api.get('/get-fall-events?username=' + username);
    }
};

const UserRelationshipService = {

    search: (search) => {
        return api.get('/search-user?username='+search);
    },

    getFollowing: () => {
        return api.get('/get-following');
    },

    getFollower: () => {
        return api.get('/get-followers');
    },

    invite: (username) => {
        return api.post('/invite', {username: username});
    },

    accept: (userRelationId) => {
        return api.post('/accept', {userRelationId: userRelationId});
    },

    reject: (userRelationId) => {
        return api.post('/reject', {userRelationId: userRelationId});
    }
};

// Helper function để tạo response giống API thực
const createResponse = (data, success = true) => {
    return {
        success,
        data,
        timestamp: new Date().toISOString()
    };
};

class ApiService {
    constructor() {
        this.authToken = null;
        this.currentUser = null;
    }

    async login(username, password) {
        const response = await UserService.login(username, password);
        if (response) {
            const token = response.token;
            this.authToken = token;
            this.currentUser = response.user;

            return createResponse({
                token,
                user: {
                    id: response.user.id,
                    username: response.user.username,
                    name: response.user.name,
                    role: response.user.role,
                }
            });
        }

        throw new Error('Tên đăng nhập hoặc mật khẩu không đúng');
    }

    async register(userData) {

        const response = await UserService.register(userData.username, userData.password, userData.name);
        console.log(response);
        if (!response) {
            throw new Error('Create field');
        }

        const newUser = {
            id: response.id,
            username: response.username,
            name: response.username,
            role: response.role || 'watcher',
            watchingUser: userData.watchingUser
        };


        return createResponse({
            user: newUser
        });
    }

    async logout() {
        this.authToken = null;
        this.currentUser = null;
        return createResponse({ message: 'Đăng xuất thành công' });
    }


    async addDevice(deviceData){
        const response = await DeviceService.register(deviceData);

        if (response) {
            return createResponse({
                deviceData
            });
        }

        throw new Error('Lỗi thêm device');
    }

    async getDevices(){
        const response = await DeviceService.getDevices();

        if (response) {
            return response
        }

        throw new Error('Lỗi get devices');
    }

    async saveRecord(recordData){
        const response = await RecordService.save(recordData);
        if (response) {
            return recordData
        }
    }

    async getRecords(username){
        const response = await RecordService.getRecords(username);
        if (response) {
            return response
        }
    }

    /**
     * Phát hiện té ngã
     */
    async detectFall(fallData) {
        const response = await FallService.save(fallData);
        if (response) {
            return response
        }
    }

    async getFalls(username){
        const response = await FallService.getFalls(username);
        if (response) {
            return response
        }
    }

    async searchUsers(username) {
        const response = await UserRelationshipService.search(username);
        if (response) {
            return response
        }
    }

    async getFollowing(){
        const response = await UserRelationshipService.getFollowing();
        if (response) {
            return response
        }
    }

    async getFollower(){
        const response = await UserRelationshipService.getFollower();
        if (response) {
            return response
        }
    }

    async invite(userName) {
        const response = await UserRelationshipService.invite(userName);
        if (response) {
            return response
        }
    }

    async accept(relationshipId) {
        const response = await UserRelationshipService.accept(relationshipId);
        if (response) {
            return response
        }
    }

    async reject(relationshipId) {
        const response = await UserRelationshipService.reject(relationshipId);
        if (response) {
            return response
        }
    }

    // ============ WebSocket / Real-time Simulation ============

    /**
     * Giả lập WebSocket connection cho real-time updates
     */
    subscribeToRealtime(userId, callbacks) {
        console.log('📡 Đăng ký nhận dữ liệu realtime cho user:', userId);

        // Giả lập cập nhật nhịp tim mỗi 2 giây
        const heartRateInterval = setInterval(async () => {
            try {
                const response = await this.getHeartRate(userId);
                if (callbacks.onHeartRate) {
                    callbacks.onHeartRate(response.data);
                }
            } catch (error) {
                console.error('Error updating heart rate:', error);
            }
        }, 2000);

        // Giả lập cập nhật trạng thái mỗi 3 giây
        const statusInterval = setInterval(async () => {
            try {
                const response = await this.getStatus(userId);
                if (callbacks.onStatusChange) {
                    callbacks.onStatusChange(response.data);
                }
            } catch (error) {
                console.error('Error updating status:', error);
            }
        }, 3000);

        // Giả lập phát hiện té ngã ngẫu nhiên (1% mỗi 10 giây)
        const fallDetectionInterval = setInterval(() => {
            if (Math.random() < 0.01) {
                this.detectFall(userId, {
                    acceleration: 9.8,
                    orientation: 'horizontal',
                    confidence: 0.95
                });
                if (callbacks.onFallDetected) {
                    callbacks.onFallDetected({
                        userId,
                        timestamp: new Date().toISOString(),
                        message: 'Phát hiện té ngã!'
                    });
                }
            }
        }, 10000);

        // Return function để unsubscribe
        return () => {
            clearInterval(heartRateInterval);
            clearInterval(statusInterval);
            clearInterval(fallDetectionInterval);
            console.log('🔌 Ngắt kết nối realtime');
        };
    }
}

const apiService = new ApiService();
export default apiService;