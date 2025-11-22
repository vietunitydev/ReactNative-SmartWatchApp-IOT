import axios from 'axios';
import AsyncStorage from "@react-native-async-storage/async-storage";
import {Dayjs as Date} from "dayjs";

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

export const UserService = {
    register: (username, password, name) => {
        return api.post('/auth/register', { username, password, name });
    },

    login: (username, password) => {
        return api.post('/auth/login', { username, password });
    }
};


// Helper function để giả lập network delay
const simulateDelay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

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

    // ============ Real-time Data APIs ============

    /**
     * Lấy nhịp tim realtime
     */
    async getHeartRate(userId) {
        await simulateDelay(200);

        return createResponse({
            userId,
        });
    }

    /**
     * Lấy trạng thái hiện tại (bình thường / đang chạy / té ngã)
     */
    async getStatus(userId) {
        await simulateDelay(200);

        return createResponse({
            userId,
        });
    }

    /**
     * Cập nhật trạng thái (từ thiết bị IoT)
     */
    async updateStatus(userId, status) {
        await simulateDelay(200);

        return createResponse({
            userId,
            status,
            message: 'Cập nhật trạng thái thành công'
        });
    }

    /**
     * Phát hiện té ngã
     */
    async detectFall(userId, fallData) {
        await simulateDelay(300);

        console.log('⚠️ Phát hiện té ngã!', fallData);

        return createResponse({
            userId,
            fallDetected: true,
            timestamp: new Date().toISOString(),
            message: 'Đã ghi nhận sự cố té ngã'
        });
    }


    // ============ History APIs ============

    /**
     * Lấy lịch sử đo
     */
    async getMeasurementHistory(userId, limit = 50) {
        await simulateDelay(300);

        return createResponse({
        });
    }

    // ============ Family/Watcher APIs ============

    /**
     * Lấy danh sách người theo dõi
     */
    async getWatchers(userId) {
        await simulateDelay(200);

        return createResponse({  });
    }

    /**
     * Thêm người theo dõi
     */
    async addWatcher(userId, watcherUsername) {
        await simulateDelay(300);

        return createResponse({
            message: 'Đã thêm người theo dõi',
            watcher: {
            }
        });
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