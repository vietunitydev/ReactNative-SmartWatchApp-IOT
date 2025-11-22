// SensorDashboard.js - Dashboard hiển thị sensor data real-time và auto sync
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Animated,
    Dimensions,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIoT } from '../contexts/IoTContext';
import api from '../services/api';

const { width } = Dimensions.get('window');

const SensorDashboard = ({ navigation }) => {
    const { sensorData, isBluetoothConnected, connectedDevice } = useIoT();

    // States
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState(null);
    const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, success, error
    const [syncCount, setSyncCount] = useState(0);
    const [errorCount, setErrorCount] = useState(0);

    // Animation refs
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const syncIconAnim = useRef(new Animated.Value(0)).current;

    // Auto sync data khi sensor data thay đổi
    useEffect(() => {
        if (sensorData.spo2 !== null && isBluetoothConnected) {
            handleAutoSync();
        }
    }, [
        sensorData.spo2,
        sensorData.heartRate,
        sensorData.fallDetected,
        sensorData.batteryLevel,
        sensorData.step,
    ]);

    // Pulse animation cho các giá trị quan trọng
    useEffect(() => {
        if (sensorData.fallDetected || sensorData.severity === 'critical') {
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
        }
    }, [sensorData.fallDetected, sensorData.severity]);

    // Sync icon rotation
    const startSyncAnimation = () => {
        syncIconAnim.setValue(0);
        Animated.loop(
            Animated.timing(syncIconAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            })
        ).start();
    };

    const stopSyncAnimation = () => {
        syncIconAnim.stopAnimation();
        syncIconAnim.setValue(0);
    };

    // Auto sync data lên server
    const handleAutoSync = async () => {
        if (isSyncing) return; // Đang sync thì skip

        setIsSyncing(true);
        setSyncStatus('syncing');
        startSyncAnimation();

        try {
            console.log('📤 Syncing data to server...');

            const response = await api.post('/sensor-data/add', {
                spo2: sensorData.spo2,
                heartRate: sensorData.heartRate,
                heartRateValid: sensorData.heartRateValid,
                fallDetected: sensorData.fallDetected,
                severity: sensorData.severity,
                batteryLevel: sensorData.batteryLevel,
                isCharging: sensorData.isCharging,
                signalQuality: sensorData.signalQuality,
                timestamp: new Date().toISOString(),
                deviceId: sensorData.deviceId || connectedDevice?.id,
                step: sensorData.step,
            });

            console.log('✅ Sync success:', response);

            setSyncStatus('success');
            setLastSyncTime(new Date());
            setSyncCount(prev => prev + 1);

            // Reset về idle sau 2s
            setTimeout(() => {
                setSyncStatus('idle');
            }, 2000);

        } catch (error) {
            console.error('❌ Sync error:', error);

            setSyncStatus('error');
            setErrorCount(prev => prev + 1);

            // Reset về idle sau 3s
            setTimeout(() => {
                setSyncStatus('idle');
            }, 3000);
        } finally {
            setIsSyncing(false);
            stopSyncAnimation();
        }
    };

    // Manual sync
    const handleManualSync = () => {
        if (!isBluetoothConnected || !sensorData.spo2) {
            alert('Chưa có dữ liệu để đồng bộ');
            return;
        }
        handleAutoSync();
    };

    // Get colors
    const getSpo2Color = (value) => {
        if (value >= 95) return '#22c55e';
        if (value >= 90) return '#f59e0b';
        return '#ef4444';
    };

    const getHeartRateColor = (value) => {
        if (value >= 60 && value <= 100) return '#22c55e';
        if (value >= 50 && value <= 120) return '#f59e0b';
        return '#ef4444';
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical': return '#dc2626';
            case 'high': return '#ea580c';
            case 'medium': return '#f59e0b';
            case 'low': return '#3b82f6';
            default: return '#22c55e';
        }
    };

    const getSyncStatusColor = () => {
        switch (syncStatus) {
            case 'syncing': return '#3b82f6';
            case 'success': return '#22c55e';
            case 'error': return '#ef4444';
            default: return '#64748b';
        }
    };

    const getSyncStatusText = () => {
        switch (syncStatus) {
            case 'syncing': return 'Đang đồng bộ...';
            case 'success': return 'Đã đồng bộ';
            case 'error': return 'Lỗi đồng bộ';
            default: return 'Chờ đồng bộ';
        }
    };

    const rotate = syncIconAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Sensor Dashboard</Text>
                        <Text style={styles.subtitle}>Real-time Monitoring</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.settingsButton}
                        onPress={() => navigation.navigate('Debug')}
                    >
                        <Text style={styles.settingsIcon}>⚙️</Text>
                    </TouchableOpacity>
                </View>

                {/* Connection Status */}
                <View style={styles.connectionCard}>
                    <View style={styles.connectionRow}>
                        <View style={[
                            styles.statusDot,
                            { backgroundColor: isBluetoothConnected ? '#22c55e' : '#ef4444' }
                        ]} />
                        <Text style={styles.connectionText}>
                            {isBluetoothConnected ? 'Đã kết nối' : 'Chưa kết nối'}
                        </Text>
                    </View>
                    {connectedDevice && (
                        <Text style={styles.deviceName}>{connectedDevice.name}</Text>
                    )}
                </View>

                {/* Sync Status Card */}
                <View style={[
                    styles.syncCard,
                    { borderLeftColor: getSyncStatusColor() }
                ]}>
                    <View style={styles.syncHeader}>
                        <Animated.Text style={[
                            styles.syncIcon,
                            { transform: [{ rotate }] }
                        ]}>
                            🔄
                        </Animated.Text>
                        <View style={styles.syncInfo}>
                            <Text style={[styles.syncStatus, { color: getSyncStatusColor() }]}>
                                {getSyncStatusText()}
                            </Text>
                            {lastSyncTime && (
                                <Text style={styles.syncTime}>
                                    Lần cuối: {lastSyncTime.toLocaleTimeString('vi-VN')}
                                </Text>
                            )}
                        </View>
                        <TouchableOpacity
                            style={styles.syncButton}
                            onPress={handleManualSync}
                            disabled={isSyncing}
                        >
                            <Text style={styles.syncButtonText}>Sync</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.syncStats}>
                        <View style={styles.syncStat}>
                            <Text style={styles.syncStatValue}>{syncCount}</Text>
                            <Text style={styles.syncStatLabel}>Thành công</Text>
                        </View>
                        <View style={styles.syncStat}>
                            <Text style={[styles.syncStatValue, { color: '#ef4444' }]}>
                                {errorCount}
                            </Text>
                            <Text style={styles.syncStatLabel}>Lỗi</Text>
                        </View>
                    </View>
                </View>

                {/* Main Data Grid */}
                <View style={styles.dataGrid}>
                    {/* SPO2 */}
                    <Animated.View style={[
                        styles.dataCard,
                        sensorData.spo2 < 95 && { transform: [{ scale: pulseAnim }] }
                    ]}>
                        <Text style={styles.dataIcon}>🫁</Text>
                        <Text style={styles.dataLabel}>SpO2</Text>
                        <Text style={[
                            styles.dataValue,
                            { color: getSpo2Color(sensorData.spo2) }
                        ]}>
                            {sensorData.spo2 !== null ? `${sensorData.spo2}%` : '--'}
                        </Text>
                        <View style={[
                            styles.dataIndicator,
                            { backgroundColor: getSpo2Color(sensorData.spo2) }
                        ]} />
                    </Animated.View>

                    {/* Heart Rate */}
                    <Animated.View style={[
                        styles.dataCard,
                        (sensorData.heartRate < 60 || sensorData.heartRate > 100) &&
                        { transform: [{ scale: pulseAnim }] }
                    ]}>
                        <Text style={styles.dataIcon}>💓</Text>
                        <Text style={styles.dataLabel}>Nhịp tim</Text>
                        <Text style={[
                            styles.dataValue,
                            { color: getHeartRateColor(sensorData.heartRate) }
                        ]}>
                            {sensorData.heartRate !== null ? sensorData.heartRate : '--'}
                        </Text>
                        <Text style={styles.dataUnit}>BPM</Text>
                        {!sensorData.heartRateValid && (
                            <Text style={styles.invalidBadge}>Invalid</Text>
                        )}
                    </Animated.View>

                    {/* Battery */}
                    <View style={styles.dataCard}>
                        <Text style={styles.dataIcon}>
                            {sensorData.isCharging ? '⚡' : '🔋'}
                        </Text>
                        <Text style={styles.dataLabel}>Pin</Text>
                        <Text style={[
                            styles.dataValue,
                            { color: sensorData.batteryLevel < 20 ? '#ef4444' : '#22c55e' }
                        ]}>
                            {sensorData.batteryLevel !== null ? `${sensorData.batteryLevel}%` : '--'}
                        </Text>
                        {sensorData.isCharging && (
                            <Text style={styles.chargingBadge}>Đang sạc</Text>
                        )}
                    </View>

                    {/* Steps */}
                    <View style={styles.dataCard}>
                        <Text style={styles.dataIcon}>👟</Text>
                        <Text style={styles.dataLabel}>Bước chân</Text>
                        <Text style={[styles.dataValue, { color: '#3b82f6' }]}>
                            {sensorData.step !== null ? sensorData.step.toLocaleString() : '--'}
                        </Text>
                        {sensorData.isWalking && (
                            <Text style={styles.walkingBadge}>Đang đi</Text>
                        )}
                    </View>
                </View>

                {/* Fall Detection Alert */}
                {sensorData.fallDetected && (
                    <Animated.View style={[
                        styles.fallAlert,
                        { transform: [{ scale: pulseAnim }] }
                    ]}>
                        <Text style={styles.fallIcon}>🚨</Text>
                        <View style={styles.fallInfo}>
                            <Text style={styles.fallTitle}>CẢNH BÁO TÉ NGÃ</Text>
                            <Text style={styles.fallText}>
                                Phát hiện té ngã lúc {sensorData.timestamp}
                            </Text>
                        </View>
                    </Animated.View>
                )}

                {/* Severity Status */}
                {sensorData.severity && sensorData.severity !== 'none' && (
                    <View style={[
                        styles.severityCard,
                        { borderLeftColor: getSeverityColor(sensorData.severity) }
                    ]}>
                        <Text style={styles.severityLabel}>Mức độ nghiêm trọng:</Text>
                        <Text style={[
                            styles.severityValue,
                            { color: getSeverityColor(sensorData.severity) }
                        ]}>
                            {sensorData.severity.toUpperCase()}
                        </Text>
                    </View>
                )}

                {/* Signal Quality */}
                <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>📡 Chất lượng tín hiệu:</Text>
                        <Text style={[
                            styles.infoValue,
                            {
                                color: sensorData.signalQuality === 'excellent' ? '#22c55e' :
                                    sensorData.signalQuality === 'good' ? '#3b82f6' :
                                        sensorData.signalQuality === 'fair' ? '#f59e0b' : '#ef4444'
                            }
                        ]}>
                            {sensorData.signalQuality || 'Unknown'}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>🕐 Cập nhật lần cuối:</Text>
                        <Text style={styles.infoValue}>
                            {sensorData.timestamp || '--'}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>📱 Thiết bị:</Text>
                        <Text style={styles.infoValue}>
                            {sensorData.deviceId || connectedDevice?.id || '--'}
                        </Text>
                    </View>
                </View>

                {/* Data History Summary */}
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>📊 Tổng quan phiên làm việc</Text>
                    <View style={styles.summaryGrid}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryValue}>{syncCount}</Text>
                            <Text style={styles.summaryLabel}>Records đã lưu</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={[styles.summaryValue, { color: '#ef4444' }]}>
                                {errorCount}
                            </Text>
                            <Text style={styles.summaryLabel}>Lỗi đồng bộ</Text>
                        </View>
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f1f5f9',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingBottom: 10,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    subtitle: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 2,
    },
    settingsButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    settingsIcon: {
        fontSize: 20,
    },
    connectionCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 16,
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    connectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 8,
    },
    connectionText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
    },
    deviceName: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 4,
        marginLeft: 20,
    },
    syncCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 16,
        padding: 16,
        borderRadius: 12,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    syncHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    syncIcon: {
        fontSize: 24,
        marginRight: 12,
    },
    syncInfo: {
        flex: 1,
    },
    syncStatus: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    syncTime: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2,
    },
    syncButton: {
        backgroundColor: '#0ea5e9',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    syncButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    syncStats: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        paddingTop: 12,
    },
    syncStat: {
        flex: 1,
        alignItems: 'center',
    },
    syncStatValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#22c55e',
    },
    syncStatLabel: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 4,
    },
    dataGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    dataCard: {
        backgroundColor: '#fff',
        width: (width - 52) / 2,
        padding: 16,
        borderRadius: 16,
        marginRight: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        position: 'relative',
    },
    dataIcon: {
        fontSize: 32,
        marginBottom: 8,
    },
    dataLabel: {
        fontSize: 13,
        color: '#64748b',
        marginBottom: 4,
    },
    dataValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    dataUnit: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 4,
    },
    dataIndicator: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    invalidBadge: {
        fontSize: 10,
        color: '#ef4444',
        fontWeight: 'bold',
        marginTop: 4,
    },
    chargingBadge: {
        fontSize: 10,
        color: '#22c55e',
        fontWeight: 'bold',
        marginTop: 4,
    },
    walkingBadge: {
        fontSize: 10,
        color: '#3b82f6',
        fontWeight: 'bold',
        marginTop: 4,
    },
    fallAlert: {
        backgroundColor: '#fef2f2',
        marginHorizontal: 20,
        marginBottom: 16,
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#ef4444',
        flexDirection: 'row',
        alignItems: 'center',
    },
    fallIcon: {
        fontSize: 40,
        marginRight: 16,
    },
    fallInfo: {
        flex: 1,
    },
    fallTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#dc2626',
        marginBottom: 4,
    },
    fallText: {
        fontSize: 14,
        color: '#991b1b',
    },
    severityCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 16,
        padding: 16,
        borderRadius: 12,
        borderLeftWidth: 4,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    severityLabel: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '600',
    },
    severityValue: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    infoCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 16,
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    infoLabel: {
        fontSize: 14,
        color: '#64748b',
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e293b',
    },
    summaryCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 20,
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 16,
    },
    summaryGrid: {
        flexDirection: 'row',
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#f8fafc',
        borderRadius: 8,
        marginHorizontal: 4,
    },
    summaryValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#22c55e',
    },
    summaryLabel: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 4,
        textAlign: 'center',
    },
});

export default SensorDashboard;