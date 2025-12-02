// FallAlertModal.js - Modal thông báo té ngã
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
} from 'react-native';
import { useIoT } from '../contexts/IoTContext';
import apiService from "../services/api.service";
import Geolocation from '@react-native-community/geolocation';

const { width, height } = Dimensions.get('window');

const FallAlertModal = () => {
    const { sensorData } = useIoT();
    const [visible, setVisible] = useState(false);
    const [fallData, setFallData] = useState(null);

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const shakeAnim = useRef(new Animated.Value(0)).current;

    // Detect fall
    useEffect(() => {
        if (sensorData.fallDetected && !visible) {
            // Fall detected!
            handleFallDetected();
        }
    }, [sensorData.fallDetected]);

    const handleFallDetected = () => {
        Geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;

                setFallData({
                    time: new Date().toLocaleTimeString('vi-VN'),
                    date: new Date().toLocaleDateString('vi-VN'),
                    spo2: sensorData.spo2,
                    heartRate: sensorData.heartRate,
                    severity: sensorData.severity,
                    deviceId: sensorData.deviceId,
                    latitude,
                    longitude,
                });

                setVisible(true);
                startAnimations();

                // vibrate
                if (Platform.OS === 'android') {
                    Vibration.vibrate([0, 500, 200, 500, 200, 500], false);
                } else {
                    Vibration.vibrate([500, 200, 500, 200, 500]);
                }

                console.log("Bat dau send api (detect Fall ) toi server")
                // ⬇⬇⬇ Gửi API detect fall
                await apiService.detectFall({
                    deviceId: sensorData.deviceId,
                    severity: sensorData.severity,
                    spo2: sensorData.spo2,
                    heartRate: sensorData.heartRate,
                    detectedAt: new Date().toISOString(),
                    latitude,
                    longitude,
                });

                console.log("Send xong api (detect Fall ) toi server")

            },
            async (error) => {
                console.log("Location error:", error);

                // fallback nếu không có GPS
                setFallData({
                    time: new Date().toLocaleTimeString('vi-VN'),
                    date: new Date().toLocaleDateString('vi-VN'),
                    spo2: sensorData.spo2,
                    heartRate: sensorData.heartRate,
                    severity: sensorData.severity,
                    deviceId: sensorData.deviceId,
                    latitude: null,
                    longitude: null,
                });

                setVisible(true);
                startAnimations();

                console.log("Bat dau send api (detect Fall ) toi server")
                // ⬇⬇⬇ Gửi API detect fall
                await apiService.detectFall({
                    deviceId: sensorData.deviceId,
                    severity: sensorData.severity,
                    spo2: sensorData.spo2,
                    heartRate: sensorData.heartRate,
                    detectedAt: new Date().toISOString(),
                    latitude: null,
                    longitude: null
                });

                console.log("Send xong api (detect Fall ) toi server")
            },
            {
                enableHighAccuracy: true,
                timeout: 8000,
                maximumAge: 1000,
            }
        );
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
                            <Text style={styles.detailLabel}>Thời gian:</Text>
                            <Text style={styles.detailValue}>
                                {fallData.time} - {fallData.date}
                            </Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Nhịp tim:</Text>
                            <Text style={styles.detailValue}>
                                {fallData.heartRate} BPM
                            </Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>SpO2:</Text>
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
                            <Text style={styles.detailLabel}>Thiết bị:</Text>
                            <Text style={styles.detailValue}>{fallData.deviceId}</Text>
                        </View>
                    </View>

                    {/* Warning Note */}
                    <View style={[styles.warningBox, { borderLeftColor: severityColor }]}>
                        <Text style={styles.warningText}>
                            Nếu không có phản hồi, hệ thống sẽ tự động thông báo đến người nhà.
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
                                Tôi ổn, đã xác nhận
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.emergencyButton]}
                            onPress={() => {
                                handleDismiss();
                                // TODO: Implement emergency call
                                // callEmergency();
                            }}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.emergencyButtonText}>
                                Cần trợ giúp khẩn cấp
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