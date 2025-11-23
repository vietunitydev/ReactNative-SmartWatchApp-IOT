// FallAlertModal.js - Modal thông báo té ngã (lấy vị trí từ điện thoại)
import React, { useState, useEffect, useRef } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Dimensions,
    Platform,
    Vibration,
    PermissionsAndroid,
    Alert,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { useIoT } from '../contexts/IoTContext';
import apiService from "../services/api.service";

const { width } = Dimensions.get('window');

const FallAlertModal = () => {
    const { sensorData } = useIoT();
    const [visible, setVisible] = useState(false);
    const [fallData, setFallData] = useState(null);

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const shakeAnim = useRef(new Animated.Value(0)).current;

    // ========= LOCATION HELPERS =========
    const requestLocationPermission = async () => {
        if (Platform.OS === 'android') {
            try {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    {
                        title: 'Quyền truy cập vị trí',
                        message: 'Ứng dụng cần truy cập vị trí để gửi cảnh báo té ngã.',
                        buttonPositive: 'Đồng ý',
                        buttonNegative: 'Hủy',
                    }
                );

                return granted === PermissionsAndroid.RESULTS.GRANTED;
            } catch (err) {
                console.warn('Location permission error:', err);
                return false;
            }
        }
        // iOS: quyền sẽ được hệ thống hỏi tự động lần đầu
        return true;
    };

    const getCurrentPosition = () => {
        return new Promise((resolve, reject) => {
            Geolocation.getCurrentPosition(
                (position) => resolve(position),
                (error) => reject(error),
                {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 5000,
                    forceRequestLocation: true,
                    showLocationDialog: true,
                }
            );
        });
    };

    // Detect fall
    useEffect(() => {
        if (sensorData?.fallDetected && !visible) {
            handleFallDetected();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sensorData?.fallDetected]);

    const handleFallDetected = async () => {
        const now = new Date();

        let latitude = null;
        let longitude = null;

        // ======== LẤY VỊ TRÍ ĐIỆN THOẠI ========
        try {
            const hasPermission = await requestLocationPermission();
            if (hasPermission) {
                const pos = await getCurrentPosition();
                latitude = pos.coords.latitude;
                longitude = pos.coords.longitude;
            }
        } catch (error) {
            console.warn('Get location error:', error);
            // Không có vị trí thì vẫn continue, chỉ gửi null
        }

        // Save fall data for UI
        const uiFallData = {
            time: now.toLocaleTimeString('vi-VN'),
            date: now.toLocaleDateString('vi-VN'),
            spo2: sensorData.spo2,
            heartRate: sensorData.heartRate,
            severity: sensorData.severity,
            deviceId: sensorData.deviceId,
            latitude,
            longitude,
        };
        setFallData(uiFallData);

        // Show modal
        setVisible(true);

        // Vibrate pattern: [wait, vibrate, wait, vibrate]
        if (Platform.OS === 'android') {
            Vibration.vibrate([0, 500, 200, 500, 200, 500], false);
        } else {
            Vibration.vibrate([500, 200, 500, 200, 500]);
        }

        // Start animations
        startAnimations();

        // Gửi API detect fall
        try {
            await apiService.detectFall({
                deviceId: sensorData.deviceId,
                severity: sensorData.severity || 'severe',
                spo2: sensorData.spo2,
                heartRate: sensorData.heartRate,
                detectedAt: now.toISOString(),
                longitude,
                latitude,
            });
        } catch (e) {
            console.warn('detectFall API error:', e?.message || e);
            // Có thể show toast / Alert nếu cần
            // Alert.alert('Lỗi', 'Không thể gửi dữ liệu té ngã lên server');
        }
    };

    const startAnimations = () => {
        // Fade in
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();

        // Scale in
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 5,
            tension: 40,
            useNativeDriver: true,
        }).start();

        // Pulse animation (loop)
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.1,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Shake animation
        Animated.sequence([
            Animated.timing(shakeAnim, {
                toValue: 10,
                duration: 50,
                useNativeDriver: true,
            }),
            Animated.timing(shakeAnim, {
                toValue: -10,
                duration: 50,
                useNativeDriver: true,
            }),
            Animated.timing(shakeAnim, {
                toValue: 10,
                duration: 50,
                useNativeDriver: true,
            }),
            Animated.timing(shakeAnim, {
                toValue: 0,
                duration: 50,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const handleDismiss = () => {
        // Stop vibration
        Vibration.cancel();

        // Fade out
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 0.8,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setVisible(false);
            // Reset animations
            fadeAnim.setValue(0);
            scaleAnim.setValue(0.8);
            pulseAnim.stopAnimation();
            pulseAnim.setValue(1);
            shakeAnim.setValue(0);
            setFallData(null);
        });
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical':
                return '#dc2626';
            case 'high':
                return '#ea580c';
            case 'medium':
                return '#f59e0b';
            default:
                return '#ef4444';
        }
    };

    const getSeverityText = (severity) => {
        switch (severity) {
            case 'critical':
                return 'NGUY HIỂM CAO';
            case 'high':
                return 'NGHIÊM TRỌNG';
            case 'medium':
                return 'CẦN QUAN SÁT';
            default:
                return 'TÉ NGÃ';
        }
    };

    if (!visible || !fallData) return null;

    const severityColor = getSeverityColor(fallData.severity);
    const severityText = getSeverityText(fallData.severity);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleDismiss}
        >
            <Animated.View
                style={[
                    styles.overlay,
                    {
                        opacity: fadeAnim,
                    },
                ]}
            >
                <Animated.View
                    style={[
                        styles.container,
                        {
                            transform: [
                                { scale: scaleAnim },
                                { translateX: shakeAnim },
                            ],
                        },
                    ]}
                >
                    {/* Alert Icon */}
                    <Animated.View
                        style={[
                            styles.iconContainer,
                            {
                                backgroundColor: severityColor,
                                transform: [{ scale: pulseAnim }],
                            },
                        ]}
                    >
                        <Text style={styles.iconText}>⚠️</Text>
                    </Animated.View>

                    {/* Alert Title */}
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>CẢNH BÁO TÉ NGÃ</Text>
                        <View
                            style={[
                                styles.severityBadge,
                                { backgroundColor: severityColor },
                            ]}
                        >
                            <Text style={styles.severityText}>{severityText}</Text>
                        </View>
                    </View>

                    {/* Alert Message */}
                    <View style={styles.messageContainer}>
                        <Text style={styles.message}>
                            Hệ thống phát hiện té ngã! Vui lòng kiểm tra ngay.
                        </Text>
                    </View>

                    {/* Fall Details */}
                    <View style={styles.detailsContainer}>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>🕐 Thời gian:</Text>
                            <Text style={styles.detailValue}>
                                {fallData.time} - {fallData.date}
                            </Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>💓 Nhịp tim:</Text>
                            <Text style={styles.detailValue}>
                                {fallData.heartRate} BPM
                            </Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>🫁 SpO2:</Text>
                            <Text
                                style={[
                                    styles.detailValue,
                                    fallData.spo2 < 95 && { color: '#dc2626' },
                                ]}
                            >
                                {fallData.spo2}%
                            </Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>📱 Thiết bị:</Text>
                            <Text style={styles.detailValue}>{fallData.deviceId}</Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>📍 Vị trí:</Text>
                            <Text style={styles.detailValue}>
                                {fallData.latitude && fallData.longitude
                                    ? `${fallData.latitude.toFixed(5)}, ${fallData.longitude.toFixed(5)}`
                                    : 'Không xác định'}
                            </Text>
                        </View>
                    </View>

                    {/* Warning Note */}
                    <View style={[styles.warningBox, { borderLeftColor: severityColor }]}>
                        <Text style={styles.warningText}>
                            ⚠️ Nếu không có phản hồi, hệ thống sẽ tự động thông báo đến người nhà.
                        </Text>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.primaryButton]}
                            onPress={handleDismiss}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.primaryButtonText}>
                                ✓ Tôi ổn, đã xác nhận
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.emergencyButton]}
                            onPress={() => {
                                // TODO: Implement emergency call
                                handleDismiss();
                                // callEmergency();
                            }}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.emergencyButtonText}>
                                🚨 Cần trợ giúp khẩn cấp
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        width: width - 40,
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.5,
        shadowRadius: 30,
        elevation: 30,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: 20,
        shadowColor: '#dc2626',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 10,
    },
    iconText: {
        fontSize: 40,
    },
    titleContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    severityBadge: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 12,
    },
    severityText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    messageContainer: {
        backgroundColor: '#fef2f2',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    message: {
        fontSize: 15,
        color: '#991b1b',
        textAlign: 'center',
        fontWeight: '600',
        lineHeight: 22,
    },
    detailsContainer: {
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    detailLabel: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '600',
    },
    detailValue: {
        fontSize: 14,
        color: '#1e293b',
        fontWeight: 'bold',
        textAlign: 'right',
        flexShrink: 1,
        marginLeft: 12,
    },
    warningBox: {
        backgroundColor: '#fffbeb',
        borderLeftWidth: 4,
        borderRadius: 8,
        padding: 12,
        marginBottom: 20,
    },
    warningText: {
        fontSize: 13,
        color: '#92400e',
        lineHeight: 18,
    },
    buttonContainer: {
        gap: 12,
    },
    button: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButton: {
        backgroundColor: '#0ea5e9',
        shadowColor: '#0ea5e9',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    emergencyButton: {
        backgroundColor: '#dc2626',
        shadowColor: '#dc2626',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    emergencyButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default FallAlertModal;
