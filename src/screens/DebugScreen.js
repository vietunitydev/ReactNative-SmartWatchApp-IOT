// DebugScreen.js - Màn hình debug để xem logs và test kết nối

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIoT } from '../contexts/IoTContext';

const DebugScreen = ({ navigation }) => {
    const {
        isBluetoothConnected,
        connectedDevice,
        sensorData,
        dataHistory,
        debugLogs,
        readSensorData
    } = useIoT();

    const handleManualRead = async () => {
        const data = await readSensorData();
        if (data) {
            Alert.alert('Đọc thành công', JSON.stringify(data, null, 2));
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backButton}>← Quay lại</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Debug Console</Text>
                <View style={{ width: 60 }} />
            </View>

            <ScrollView style={styles.scrollView}>
                {/* Connection Status */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📡 Trạng thái kết nối</Text>
                    <View style={styles.infoBox}>
                        <Text style={styles.infoText}>
                            Kết nối: {isBluetoothConnected ? '✓ Đã kết nối' : '✗ Chưa kết nối'}
                        </Text>
                        {connectedDevice && (
                            <>
                                <Text style={styles.infoText}>
                                    Thiết bị: {connectedDevice.name}
                                </Text>
                                <Text style={styles.infoText}>
                                    ID: {connectedDevice.id}
                                </Text>
                            </>
                        )}
                    </View>
                </View>

                {/* Sensor Data */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📊 Dữ liệu cảm biến</Text>
                    <View style={styles.infoBox}>
                        <Text style={styles.infoText}>
                            SpO2: {sensorData.spo2 ?? 'N/A'}%
                        </Text>
                        <Text style={styles.infoText}>
                            Heart Rate: {sensorData.heartRate ?? 'N/A'} bpm
                        </Text>
                        <Text style={styles.infoText}>
                            HR Valid: {sensorData.heartRateValid ? 'Yes' : 'No'}
                        </Text>
                        <Text style={styles.infoText}>
                            Fall Detected: {sensorData.fallDetected ? '⚠️ YES' : 'No'}
                        </Text>
                        <Text style={styles.infoText}>
                            Severity: {sensorData.severity ?? 'N/A'}
                        </Text>
                        <Text style={styles.infoText}>
                            Battery: {sensorData.battery ?? 'N/A'}%
                        </Text>
                        <Text style={styles.infoText}>
                            Charging: {sensorData.isCharging ? '🔌 Yes' : 'No'}
                        </Text>
                        <Text style={styles.infoText}>
                            Signal: {sensorData.signalQuality ?? 'N/A'}
                        </Text>
                        <Text style={styles.infoText}>
                            Steps: {sensorData.step ?? 'N/A'}
                        </Text>
                        <Text style={styles.infoText}>
                            Device: {sensorData.deviceId ?? 'N/A'}
                        </Text>
                        <Text style={styles.infoText}>
                            Cập nhật: {sensorData.timestamp ?? 'N/A'}
                        </Text>
                    </View>

                    {isBluetoothConnected && (
                        <TouchableOpacity
                            style={styles.testButton}
                            onPress={handleManualRead}
                        >
                            <Text style={styles.testButtonText}>
                                🔄 Đọc dữ liệu thủ công
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* RAW Data từ ESP32 */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        🔍 RAW DATA từ ESP32 (Mới nhất)
                    </Text>
                    <View style={styles.rawDataBox}>
                        {dataHistory.length > 0 ? (
                            <Text style={styles.rawDataText}>
                                {JSON.stringify(dataHistory[0], null, 2)}
                            </Text>
                        ) : (
                            <Text style={styles.infoText}>Chưa nhận được dữ liệu</Text>
                        )}
                    </View>
                </View>

                {/* Data History */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        📋 Lịch sử dữ liệu ({dataHistory.length})
                    </Text>
                    <View style={styles.infoBox}>
                        {dataHistory.length > 0 ? (
                            dataHistory.slice(0, 5).map((item, index) => (
                                <View key={index} style={styles.historyItem}>
                                    <Text style={styles.historyText}>
                                        #{dataHistory.length - index}: SpO2={item.spo2}%, HR={item.heartRate}bpm
                                    </Text>
                                    <Text style={styles.historyTime}>
                                        {new Date(item.receivedAt).toLocaleTimeString('vi-VN')}
                                    </Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.infoText}>Chưa có dữ liệu</Text>
                        )}
                    </View>
                </View>

                {/* Debug Logs */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        🐛 Debug Logs ({debugLogs.length})
                    </Text>
                    <View style={styles.logBox}>
                        {debugLogs.length > 0 ? (
                            debugLogs.map((log, index) => (
                                <Text key={index} style={styles.logText}>
                                    {log}
                                </Text>
                            ))
                        ) : (
                            <Text style={styles.infoText}>Chưa có logs</Text>
                        )}
                    </View>
                </View>

                {/* UUID Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🔑 UUID Configuration</Text>
                    <View style={styles.infoBox}>
                        <Text style={styles.uuidText}>
                            Service UUID:{'\n'}6E400001-B5A3-F393-E0A9-E50E24DCCA9E
                        </Text>
                        <Text style={styles.uuidText}>
                            Characteristic UUID:{'\n'}6E400003-B5A3-F393-E0A9-E50E24DCCA9E
                        </Text>
                    </View>
                </View>

                {/* Troubleshooting */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>💡 Hướng dẫn khắc phục</Text>
                    <View style={styles.troubleshootBox}>
                        <Text style={styles.troubleshootText}>
                            ✓ Kiểm tra ESP32 đã được lập trình đúng UUID
                        </Text>
                        <Text style={styles.troubleshootText}>
                            ✓ Kiểm tra ESP32 đang notify/indicate dữ liệu
                        </Text>
                        <Text style={styles.troubleshootText}>
                            ✓ Thử nhấn "Đọc dữ liệu thủ công" để test
                        </Text>
                        <Text style={styles.troubleshootText}>
                            ✓ Xem Debug Logs để biết lỗi cụ thể
                        </Text>
                        <Text style={styles.troubleshootText}>
                            ✓ Đảm bảo characteristic có property NOTIFY hoặc INDICATE
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0'
    },
    backButton: {
        fontSize: 16,
        color: '#2196F3',
        fontWeight: '600'
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333'
    },
    scrollView: {
        flex: 1
    },
    section: {
        margin: 16,
        marginBottom: 0
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8
    },
    infoBox: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0'
    },
    infoText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
        fontFamily: 'monospace'
    },
    testButton: {
        backgroundColor: '#2196F3',
        borderRadius: 8,
        padding: 12,
        marginTop: 8,
        alignItems: 'center'
    },
    testButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600'
    },
    historyItem: {
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        paddingVertical: 8
    },
    historyText: {
        fontSize: 13,
        color: '#333',
        fontFamily: 'monospace'
    },
    historyTime: {
        fontSize: 11,
        color: '#999',
        marginTop: 2
    },
    logBox: {
        backgroundColor: '#000',
        borderRadius: 8,
        padding: 12,
        maxHeight: 300
    },
    logText: {
        fontSize: 11,
        color: '#0f0',
        fontFamily: 'monospace',
        marginBottom: 2
    },
    rawDataBox: {
        backgroundColor: '#1a1a1a',
        borderRadius: 8,
        padding: 12,
        maxHeight: 400,
        borderWidth: 1,
        borderColor: '#333'
    },
    rawDataText: {
        fontSize: 12,
        color: '#00ff00',
        fontFamily: 'monospace',
        lineHeight: 18
    },
    uuidText: {
        fontSize: 12,
        color: '#666',
        fontFamily: 'monospace',
        marginBottom: 8
    },
    troubleshootBox: {
        backgroundColor: '#fff3cd',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#ffc107'
    },
    troubleshootText: {
        fontSize: 13,
        color: '#856404',
        marginBottom: 6
    }
});

export default DebugScreen;