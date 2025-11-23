// RegisterScreen.js - Màn hình đăng ký
import React, { useState, useEffect, useRef, memo } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    Animated,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

// Floating Input Component
const FloatingInput = memo(({ label, value, onChangeText, secureTextEntry = false, keyboardType = 'default' }) => {
    const [focused, setFocused] = useState(false);
    const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(labelAnim, {
            toValue: focused || value?.length > 0 ? 1 : 0,
            duration: 200,
            useNativeDriver: false,
        }).start();
    }, [focused, value]);

    const labelStyle = {
        top: labelAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 4] }),
        fontSize: labelAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 13] }),
        color: labelAnim.interpolate({ inputRange: [0, 1], outputRange: ['#94a3b8', '#0ea5e9'] }),
    };

    const placeholderText = !value && !focused ? label : '';

    return (
        <View style={styles.inputWrapper}>
            <Animated.Text style={[styles.floatingLabel, labelStyle]}>
                {label}
            </Animated.Text>

            <TextInput
                value={value}
                onChangeText={onChangeText}
                secureTextEntry={secureTextEntry}
                keyboardType={keyboardType}
                style={[styles.textInput, focused && styles.textInputFocused]}
                placeholder={placeholderText}
                placeholderTextColor="#94a3b8"
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                autoCapitalize="none"
                autoCorrect={false}
            />
        </View>
    );
});

const RegisterScreen = ({ navigation }) => {
    const { register, loading } = useAuth();
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        email: '',
        phone: '',
    });

    const fade = useRef(new Animated.Value(0)).current;
    const slide = useRef(new Animated.Value(60)).current;
    const scale = useRef(new Animated.Value(0.94)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fade, { toValue: 1, duration: 1000, useNativeDriver: true }),
            Animated.spring(scale, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }),
            Animated.spring(slide, { toValue: 0, friction: 9, tension: 70, useNativeDriver: true }),
        ]).start();
    }, []);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const validateForm = () => {
        const { username, password, confirmPassword, fullName } = formData;

        if (!username || !password || !confirmPassword || !fullName) {
            Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin bắt buộc');
            return false;
        }

        if (username.length < 4) {
            Alert.alert('Lỗi', 'Tên đăng nhập phải có ít nhất 4 ký tự');
            return false;
        }

        if (password.length < 6) {
            Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
            return false;
        }

        if (password !== confirmPassword) {
            Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
            return false;
        }

        // // Validate email format
        // const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        // if (!emailRegex.test(email)) {
        //     Alert.alert('Lỗi', 'Email không hợp lệ');
        //     return false;
        // }
        //
        // // Validate phone (optional but if provided must be valid)
        // if (phone && !/^[0-9]{10,11}$/.test(phone)) {
        //     Alert.alert('Lỗi', 'Số điện thoại không hợp lệ (10-11 chữ số)');
        //     return false;
        // }

        return true;
    };

    const handleRegister = async () => {
        if (!validateForm()) return;

        const { username, password, fullName } = formData;

        const result = await register({
            username,
            password,
            name: fullName,
        });

        if (result.success) {
            Alert.alert(
                'Đăng ký thành công',
                'Tài khoản của bạn đã được tạo. Vui lòng đăng nhập.',
                [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
            );
        } else {
            Alert.alert('Đăng ký thất bại', result.error || 'Có lỗi xảy ra, vui lòng thử lại');
        }
    };

    const Bubble = ({ size, left, top, duration = 8000, delay = 0 }) => {
        const anim = useRef(new Animated.Value(0)).current;
        useEffect(() => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(anim, { toValue: 1, duration, delay, useNativeDriver: true }),
                    Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
                ])
            ).start();
        }, []);

        const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [50, -120] });
        const opacity = anim.interpolate({ inputRange: [0, 0.3, 0.7, 1], outputRange: [0.3, 0.7, 0.7, 0.3] });

        return (
            <Animated.View
                style={{
                    position: 'absolute',
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: 'rgba(14, 165, 233, 0.22)',
                    left,
                    top,
                    opacity,
                    transform: [{ translateY }],
                }}
            />
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Background + Bong bóng động */}
            <View style={StyleSheet.absoluteFill}>
                <View style={{ flex: 1, backgroundColor: '#ecfeff' }} />
                <Bubble size={240} left={-60} top={height * 0.08} duration={8500} />
                <Bubble size={180} left={width * 0.7} top={height * 0.3} delay={2500} duration={7500} />
                <Bubble size={300} left={width * 0.15} top={height * 0.65} delay={4500} duration={10000} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, paddingVertical: 20 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.inner}>
                        {/* Header */}
                        <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
                            {/*<TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>*/}
                            {/*    <Text style={styles.backButtonText}>← Quay lại</Text>*/}
                            {/*</TouchableOpacity>*/}
                            <Text style={styles.title}>Tạo tài khoản</Text>
                        </Animated.View>

                        {/* Form Card */}
                        <Animated.View style={[styles.card, { opacity: fade, transform: [{ scale }] }]}>
                            <Text style={styles.welcome}>Thông tin đăng ký</Text>

                            {/* Thông tin đăng nhập */}
                            <Text style={styles.sectionTitle}>Thông tin đăng nhập</Text>
                            <FloatingInput
                                label="Tên đăng nhập *"
                                value={formData.username}
                                onChangeText={(value) => handleInputChange('username', value)}
                            />
                            <FloatingInput
                                label="Mật khẩu *"
                                value={formData.password}
                                onChangeText={(value) => handleInputChange('password', value)}
                                secureTextEntry
                            />
                            <FloatingInput
                                label="Xác nhận mật khẩu *"
                                value={formData.confirmPassword}
                                onChangeText={(value) => handleInputChange('confirmPassword', value)}
                                secureTextEntry
                            />

                            {/* Thông tin cá nhân */}
                            <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
                            <FloatingInput
                                label="Họ và tên *"
                                value={formData.fullName}
                                onChangeText={(value) => handleInputChange('fullName', value)}
                            />

                            {/* Nút đăng ký */}
                            <TouchableOpacity
                                onPress={handleRegister}
                                disabled={loading}
                                activeOpacity={0.9}
                                style={{ marginTop: 10 }}
                            >
                                <View style={styles.registerBtn}>
                                    {loading ? (
                                        <ActivityIndicator color="#fff" size={28} />
                                    ) : (
                                        <Text style={styles.registerBtnText}>Đăng ký</Text>
                                    )}
                                </View>
                            </TouchableOpacity>

                            {/* Link đăng nhập */}
                            <TouchableOpacity
                                onPress={() => navigation.navigate('Login')}
                                style={styles.loginLink}
                            >
                                <Text style={styles.loginText}>
                                    Đã có tài khoản? <Text style={styles.highlight}>Đăng nhập ngay</Text>
                                </Text>
                            </TouchableOpacity>
                        </Animated.View>

                        {/* Ghi chú */}
                        <Animated.View style={[styles.noteCard, { opacity: fade, transform: [{ translateY: slide }] }]}>
                            <Text style={styles.noteTitle}>📋 Lưu ý</Text>
                            <View style={styles.noteBox}>
                                <Text style={styles.noteItem}>• Tên đăng nhập: tối thiểu 4 ký tự</Text>
                                <Text style={styles.noteItem}>• Mật khẩu: tối thiểu 6 ký tự</Text>
                            </View>
                        </Animated.View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    inner: { paddingHorizontal: width * 0.07, paddingBottom: 20 },
    backButton: { marginBottom: 15, marginTop: 10 },
    backButtonText: { fontSize: 16, color: '#0369a1', fontWeight: '600' },
    title: {
        fontSize: width < 380 ? 28 : 34,
        fontWeight: '800',
        color: '#0c4a6e',
        textAlign: 'center',
        marginBottom: 8
    },
    subtitle: {
        fontSize: 15,
        color: '#0369a1',
        textAlign: 'center',
        fontWeight: '600',
        marginBottom: 10
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 32,
        paddingVertical: 35,
        paddingHorizontal: 28,
        marginVertical: 20,
        shadowColor: '#0ea5e9',
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.28,
        shadowRadius: 35,
        elevation: 28,
    },
    welcome: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1e293b',
        textAlign: 'center',
        marginBottom: 28
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0c4a6e',
        marginBottom: 15,
        marginTop: 10,
    },
    inputWrapper: { marginBottom: 20 },
    textInput: {
        height: 58,
        borderRadius: 18,
        paddingHorizontal: 20,
        fontSize: 16,
        backgroundColor: '#f8fafc',
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    textInputFocused: {
        backgroundColor: '#fff',
        borderColor: '#0ea5e9',
    },
    floatingLabel: {
        position: 'absolute',
        left: 20,
        backgroundColor: '#fff',
        paddingHorizontal: 8,
        fontWeight: '600',
        zIndex: 1,
    },
    registerBtn: {
        backgroundColor: '#0ea5e9',
        height: 58,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        shadowColor: '#0ea5e9',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.45,
        shadowRadius: 25,
        elevation: 20,
    },
    registerBtnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    loginLink: {
        alignItems: 'center',
        marginTop: 24,
    },
    loginText: {
        color: '#64748b',
        fontSize: 15.5,
    },
    highlight: {
        color: '#0ea5e9',
        fontWeight: '700',
    },
    noteCard: {
        backgroundColor: 'rgba(255,255,255,0.97)',
        borderRadius: 24,
        padding: 22,
        marginTop: 10,
        borderWidth: 1.5,
        borderColor: '#ccfbfe',
    },
    noteTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#0c4a6e',
        textAlign: 'center',
        marginBottom: 14,
    },
    noteBox: {
        backgroundColor: '#ecfeff',
        borderRadius: 16,
        padding: 18,
    },
    noteItem: {
        fontSize: 14,
        color: '#0c4a6e',
        marginBottom: 8,
        fontWeight: '500',
    },
});

export default RegisterScreen;