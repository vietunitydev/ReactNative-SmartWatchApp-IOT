// FallAlertModalAdvanced.js - Modal thông báo té ngã với countdown
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

const { width, height } = Dimensions.get('window');

const FallAlertModalAdvanced = () => {
    const { sensorData } = useIoT();
    const [visible, setVisible] = useState(false);
    const [fallData, setFallData] = useState(null);
    const [countdown, setCountdown] = useState(30); // 30 giây countdown
    const [autoCallCancelled, setAutoCallCancelled] = useState(false);

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const countdownAnim = useRef(new Animated.Value(1)).current;

    // Countdown timer
    const timerRef = useRef(null);

    // Detect fall
    useEffect(() => {
        if (sensorData.fallDetected && !visible) {
            handleFallDetected();
        }
    }, [sensorData.fallDetected]);

    // Countdown effect
    useEffect(() => {
        if (visible && !autoCallCancelled && countdown > 0) {
            timerRef.current = setTimeout(() => {
                setCountdown(prev => prev - 1);

                // Pulse animation for countdown
                Animated.sequence([
                    Animated.timing(countdownAnim, {
                        toValue: 1.2,
                        duration: 100,
                        useNativeDriver: true,
                    }),
                    Animated.timing(countdownAnim, {
                        toValue: 1,
                        duration: 100,
                        useNativeDriver: true,
                    }),
                ]).start();

                // Vibrate mỗi 5 giây
                if (countdown % 5 === 0) {
                    Vibration.vibrate(200);
                }
            }, 1000);
        } else if (countdown === 0 && !autoCallCancelled) {
            // Hết thời gian → Tự động gọi cấp cứu
            handleEmergencyCall();
        }

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [visible, countdown, autoCallCancelled]);

    const handleFallDetected = () => {
        // Reset states
        setCountdown(30);
        setAutoCallCancelled(false);

        // Save fall data
        setFallData({
            time: new Date().toLocaleTimeString('vi-VN'),
            date: new Date().toLocaleDateString('vi-VN'),
            spo2: sensorData.spo2,
            heartRate: sensorData.heartRate,
            severity: sensorData.severity,
            deviceId: sensorData.deviceId,
        });

        // Show modal
        setVisible(true);

        // Vibrate pattern
        if (Platform.OS === 'android') {
            Vibration.vibrate([0, 500, 200, 500, 200, 500], false);
        } else {
            Vibration.vibrate([500, 200, 500, 200, 500]);
        }

        // Start animations
        startAnimations();
    };

    const startAnimations = () => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();

        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 5,
            tension: 40,
            useNativeDriver: true,
        }).start();

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

        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
    };

    const handleImOk = () => {
        // Hủy auto call
        setAutoCallCancelled(true);
        Vibration.cancel();

        // Close modal
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 0.8, duration: 200, useNativeDriver: true }),
        ]).start(() => {
            setVisible(false);
            resetAnimations();
        });
    };

    const handleEmergencyCall = () => {
        Vibration.cancel();

        // TODO: Implement emergency call logic
        console.log('🚨 TỰ ĐỘNG GỌI CẤP CỨU!');
        console.log('Fall data:', fallData);

        // Show confirmation
        // Alert.alert(
        //   'Đang gọi cấp cứu',
        //   'Hệ thống đang liên hệ với dịch vụ y tế khẩn cấp...',
        // );

        // Close modal sau khi gọi
        setTimeout(() => {
            handleImOk();
        }, 2000);
    };

    const resetAnimations = () => {
        fadeAnim.setValue(0);
        scaleAnim.setValue(0.8);
        pulseAnim.stopAnimation();
        pulseAnim.setValue(1);
        countdownAnim.setValue(1);
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical': return '#dc2626';
            case 'high': return '#ea580c';
            case 'medium': return '#f59e0b';
            default: return '#ef4444';
        }
    };

    const getSeverityText = (severity) => {
        switch (severity) {
            case 'critical': return 'NGUY HIỂM CAO';
            case 'high': return 'NGHIÊM TRỌNG';
            case 'medium': return 'CẦN QUAN SÁT';
            default: return 'TÉ NGÃ';
        }
    };

    const getCountdownColor = () => {
        if (countdown <= 10) return '#dc2626';
        if (countdown <= 20) return '#f59e0b';
        return '#0ea5e9';
    };

    if (!visible || !fallData) return null;

    const severityColor = getSeverityColor(fallData.severity);
    const severityText = getSeverityText(fallData.severity);
    const countdownColor = getCountdownColor();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleImOk}
        >
            <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
                <Animated.View
                    style={[
                        styles.container,
                        { transform: [{ scale: scaleAnim }, { translateX: shakeAnim }] },
                    ]}
                >
                    {/* Countdown Circle */}
                    <View style={styles.countdownContainer}>
                        <Animated.View
                            style={[
                                styles.countdownCircle,
                                {
                                    borderColor: countdownColor,
                                    transform: [{ scale: countdownAnim }],
                                },
                            ]}
                        >
                            <Text style={[styles.countdownNumber, { color: countdownColor }]}>
                                {countdown}
                            </Text>
                            <Text style={styles.countdownLabel}>giây</Text>
                        </Animated.View>
                        <Text style={styles.countdownText}>
                            Tự động gọi cấp cứu nếu không phản hồi
                        </Text>
                    </View>

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
                        <View style={[styles.severityBadge, { backgroundColor: severityColor }]}>
                            <Text style={styles.severityText}>{severityText}</Text>
                        </View>
                    </View>

                    {/* Alert Message */}
                    <View style={styles.messageContainer}>
                        <Text style={styles.message}>
                            Hệ thống phát hiện té ngã! Bạn có ổn không?
                        </Text>
                    </View>

                    {/* Fall Details */}
                    <View style={styles.detailsContainer}>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>🕐 Thời gian:</Text>
                            <Text style={styles.detailValue}>{fallData.time}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>💓 Nhịp tim:</Text>
                            <Text style={styles.detailValue}>{fallData.heartRate} BPM</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>🫁 SpO2:</Text>
                            <Text style={[styles.detailValue, fallData.spo2 < 95 && { color: '#dc2626' }]}>
                                {fallData.spo2}%
                            </Text>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.primaryButton]}
                            onPress={handleImOk}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.primaryButtonText}>
                                ✓ Tôi ổn, hủy gọi cấp cứu
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.emergencyButton]}
                            onPress={handleEmergencyCall}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.emergencyButtonText}>
                                🚨 Gọi cấp cứu ngay
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
    countdownContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    countdownCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginBottom: 8,
    },
    countdownNumber: {
        fontSize: 40,
        fontWeight: 'bold',
    },
    countdownLabel: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '600',
    },
    countdownText: {
        fontSize: 12,
        color: '#64748b',
        textAlign: 'center',
        fontWeight: '500',
    },
    iconContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: 16,
        shadowColor: '#dc2626',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 10,
    },
    iconText: {
        fontSize: 36,
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
        marginBottom: 16,
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
        paddingVertical: 6,
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

export default FallAlertModalAdvanced;