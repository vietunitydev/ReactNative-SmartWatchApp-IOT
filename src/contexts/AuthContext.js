import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../services/api.service';
import notificationService from '../services/notification.service';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Kiểm tra user đã đăng nhập khi app khởi động
    useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        try {
            setLoading(true);

            // Lấy token từ AsyncStorage
            const savedToken = await AsyncStorage.getItem('authToken');
            const savedUser = await AsyncStorage.getItem('user');

            if (savedToken && savedUser) {
                setToken(savedToken);
                setUser(JSON.parse(savedUser));
                apiService.authToken = savedToken;
                apiService.currentUser = JSON.parse(savedUser);

                // Đăng ký FCM token
                await notificationService.initialize();
                await notificationService.registerToken(JSON.parse(savedUser).id);
            }
        } catch (err) {
            console.error('Lỗi kiểm tra trạng thái đăng nhập:', err);
        } finally {
            setLoading(false);
        }
    };

    const login = async (username, password) => {
        try {
            setLoading(true);
            setError(null);

            const response = await apiService.login(username, password);

            if (response.success) {
                const { token: newToken, user: userData } = response.data;

                setToken(newToken);
                setUser(userData);

                await AsyncStorage.setItem('authToken', newToken);
                await AsyncStorage.setItem('user', JSON.stringify(userData));

                await notificationService.initialize();
                await notificationService.registerToken(userData.id);

                console.log('Đăng nhập thành công:', userData.username);

                return { success: true, user: userData };
            }
        } catch (err) {
            const errorMessage = err.message || 'Đăng nhập thất bại';
            setError(errorMessage);
            console.error('Lỗi đăng nhập:', err);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    const register = async (userData) => {
        try {
            setLoading(true);
            setError(null);

            const response = await apiService.register(userData);

            if (response.success) {
                return await login(userData.username, userData.password);
            }
        } catch (err) {
            const errorMessage = err.message || 'Đăng ký thất bại';
            setError(errorMessage);
            console.error('Lỗi đăng ký:', err);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            setLoading(true);

            // Gọi API logout
            await apiService.logout();

            // Hủy FCM token
            await notificationService.unregisterToken();

            // Xóa khỏi AsyncStorage
            await AsyncStorage.removeItem('authToken');
            await AsyncStorage.removeItem('user');

            // Reset state
            setToken(null);
            setUser(null);
            setError(null);

            console.log('✅ Đăng xuất thành công');
        } catch (err) {
            console.error('Lỗi đăng xuất:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateUser = async (updates) => {
        try {
            const updatedUser = { ...user, ...updates };
            setUser(updatedUser);
            await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        } catch (err) {
            console.error('Lỗi cập nhật thông tin user:', err);
        }
    };

    const value = {
        user,
        token,
        loading,
        error,
        isAuthenticated: !!user && !!token,
        login,
        register,
        logout,
        updateUser,
        clearError: () => setError(null)
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;