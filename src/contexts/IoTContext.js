// IoTContext.js - Context quản lý kết nối BLE và dữ liệu IoT (với Fake Connection & Devices)

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import fakeDataGenerator from "../services/fakedata";
// import
import apiService from "../services/api.service";

// UUID phải khớp với ESP32
const SERVICE_UUID = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E';
const CHARACTERISTIC_UUID = '6E400003-B5A3-F393-E0A9-E50E24DCCA9E';

// ============================================
// FAKE DEVICES DATA
// ============================================
const FAKE_DEVICES = [
    {
        id: 'FAKE-ESP32-001',
        name: 'ESP32 Device A',
        rssi: -45,
        isConnectable: true,
    },
    {
        id: 'FAKE-ESP32-002',
        name: 'ESP32 Device B',
        rssi: -62,
        isConnectable: true,
    },
    {
        id: 'FAKE-ESP32-003',
        name: 'Fall Detector 1',
        rssi: -58,
        isConnectable: true,
    },
    {
        id: 'FAKE-ESP32-004',
        name: 'Health Monitor Pro',
        rssi: -71,
        isConnectable: true,
    },
    {
        id: 'FAKE-ESP32-005',
        name: 'IoT Sensor X1',
        rssi: -53,
        isConnectable: true,
    },
];

const IoTContext = createContext();

export const useIoT = () => {
    const context = useContext(IoTContext);
    if (!context) {
        throw new Error('useIoT must be used within IoTProvider');
    }
    return context;
};

export const IoTProvider = ({ children }) => {
    // BLE Manager
    const [bleManager] = useState(() => new BleManager());

    // ============================================
    // FAKE DATA MODE - BIẾN MỚI
    // ============================================
    const [useFakeData, setUseFakeData] = useState(false); // false = real data, true = fake data
    const [fakeDataInterval, setFakeDataInterval] = useState(1000);
    const CHARACTERISTIC_UUID_RX = '6E400002-B5A3-F393-E0A9-E50E24DCCA9E'; // Interval cho fake data (ms)

    // Connection states
    const [isBluetoothConnected, setIsBluetoothConnected] = useState(false);
    const [connectedDevice, setConnectedDevice] = useState(null);
    const [availableDevices, setAvailableDevices] = useState([]);

    // Sensor data
    const [sensorData, setSensorData] = useState({
        spo2: null,
        heartRate: null,
        heartRateValid: false,
        fallDetected: false,
        severity: null,
        battery: null,
        isCharging: false,
        signalQuality: null,
        timestamp: null,
        deviceId: null,
        step: null,
    });

    // Loading states
    const [loading, setLoading] = useState(false);
    const [scanning, setScanning] = useState(false);

    // History data
    const [dataHistory, setDataHistory] = useState([]);

    // Debug logs
    const [debugLogs, setDebugLogs] = useState([]);

    // Buffer để ghép dữ liệu BLE bị chia nhỏ
    const [dataBuffer, setDataBuffer] = useState('');

    const addDebugLog = (message) => {
        const timestamp = new Date().toLocaleTimeString('vi-VN');
        const log = `[${timestamp}] ${message}`;
        console.log(log);
        setDebugLogs(prev => [log, ...prev].slice(0, 50));
    };

    // ============================================
    // FAKE DATA MANAGEMENT
    // ============================================
    useEffect(() => {
        if (useFakeData && isBluetoothConnected) {
            // Chỉ bắt đầu fake data generator khi đã "connected"
            addDebugLog('🎭 Bắt đầu generate FAKE DATA');

            const unsubscribe = fakeDataGenerator.subscribe((data) => {
                // Cập nhật sensor data từ fake generator
                setSensorData({
                    spo2: data.spo2,
                    heartRate: data.heartRate,
                    heartRateValid: data.heartRateValid,
                    fallDetected: data.fallDetected,
                    severity: data.severity,
                    battery: data.battery,
                    isCharging: data.isCharging,
                    signalQuality: data.signalQuality,
                    timestamp: new Date(data.timestamp).toLocaleTimeString('vi-VN'),
                    deviceId: connectedDevice?.id || data.deviceId,
                    step: data.step || 0,
                });

                // Lưu vào history
                setDataHistory(prev => [
                    {
                        ...data,
                        receivedAt: new Date().toISOString(),
                    },
                    ...prev
                ].slice(0, 100));
            });

            fakeDataGenerator.start(null, fakeDataInterval);

            return () => {
                fakeDataGenerator.stop();
                unsubscribe();
                addDebugLog('🎭 Dừng generate FAKE DATA');
            };
        } else {
            // Dừng fake data khi không connected hoặc chuyển về real mode
            fakeDataGenerator.stop();
        }
    }, [useFakeData, isBluetoothConnected, fakeDataInterval, connectedDevice]);

    useEffect(() => {
        // Yêu cầu quyền khi khởi động
        if (!useFakeData) {
            requestBluetoothPermissions();
        }

        // Cleanup khi unmount
        return () => {
            if (connectedDevice && !useFakeData) {
                disconnectBluetooth();
            }
            if (!useFakeData) {
                bleManager.destroy();
            }
        };
    }, [useFakeData]);

    // ============================================
    // TOGGLE FAKE DATA MODE
    // ============================================
    const toggleFakeDataMode = () => {
        if (!useFakeData) {
            // Đang chuyển sang fake mode
            if (connectedDevice && !connectedDevice.id.startsWith('FAKE-')) {
                // Đang kết nối với thiết bị THẬT
                Alert.alert(
                    'Xác nhận',
                    'Bạn đang kết nối với thiết bị thật. Chuyển sang fake data sẽ ngắt kết nối. Tiếp tục?',
                    [
                        { text: 'Hủy', style: 'cancel' },
                        {
                            text: 'OK',
                            onPress: async () => {
                                await disconnectBluetooth();
                                setUseFakeData(true);
                                addDebugLog('✅ Đã chuyển sang chế độ FAKE DATA');
                            }
                        }
                    ]
                );
            } else {
                setUseFakeData(true);
                addDebugLog('✅ Đã chuyển sang chế độ FAKE DATA');
            }
        } else {
            // Chuyển về real mode
            if (connectedDevice?.id.startsWith('FAKE-')) {
                // Đang kết nối fake device, ngắt nó
                disconnectBluetooth();
            }
            setUseFakeData(false);
            addDebugLog('✅ Đã chuyển sang chế độ REAL DATA');
        }
    };

    // ============================================
    // SET FAKE DATA INTERVAL
    // ============================================
    const setFakeDataUpdateInterval = (interval) => {
        setFakeDataInterval(interval);
        addDebugLog(`⏱️ Thay đổi interval fake data: ${interval}ms`);
    };

    // ============================================
    // YÊU CẦU QUYỀN BLUETOOTH
    // ============================================
    const requestBluetoothPermissions = async () => {
        if (Platform.OS === 'android') {
            if (Platform.Version >= 31) {
                // Android 12+
                try {
                    const granted = await PermissionsAndroid.requestMultiple([
                        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    ]);

                    const allGranted = Object.values(granted).every(
                        status => status === PermissionsAndroid.RESULTS.GRANTED
                    );

                    if (!allGranted) {
                        Alert.alert(
                            'Cần cấp quyền',
                            'Ứng dụng cần quyền Bluetooth và Location để hoạt động'
                        );
                        return false;
                    }
                    return true;
                } catch (err) {
                    console.error('Permission error:', err);
                    return false;
                }
            } else {
                // Android 11 trở xuống
                try {
                    const granted = await PermissionsAndroid.request(
                        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
                    );

                    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                        Alert.alert(
                            'Cần cấp quyền',
                            'Ứng dụng cần quyền Location để quét Bluetooth'
                        );
                        return false;
                    }
                    return true;
                } catch (err) {
                    console.error('Permission error:', err);
                    return false;
                }
            }
        }
        return true;
    };

    // ============================================
    // QUÉT THIẾT BỊ BLE (Fake + Real)
    // ============================================
    const scanBluetoothDevices = async () => {
        setScanning(true);
        setAvailableDevices([]);
        addDebugLog('Bắt đầu quét thiết bị...');

        // ===== FAKE MODE: Return fake devices =====
        if (useFakeData) {
            addDebugLog('🎭 FAKE MODE: Trả về danh sách thiết bị giả');

            // Simulate scanning delay
            setTimeout(() => {
                // Add devices one by one với delay nhỏ để giống thật
                FAKE_DEVICES.forEach((device, index) => {
                    setTimeout(() => {
                        addDebugLog(`Tìm thấy: ${device.name} (${device.id})`);
                        setAvailableDevices(prev => [...prev, device]);
                    }, index * 300); // Mỗi device cách nhau 300ms
                });
            }, 500);

            // Stop scanning sau 3 giây (giống thật)
            setTimeout(() => {
                setScanning(false);
                addDebugLog(`Kết thúc quét thiết bị - Tìm thấy ${FAKE_DEVICES.length} thiết bị`);
            }, 3000);
            return;
        }

        // ===== REAL MODE: Scan thật =====
        const hasPermission = await requestBluetoothPermissions();
        if (!hasPermission) {
            setScanning(false);
            return;
        }

        try {
            const state = await bleManager.state();
            addDebugLog(`Bluetooth state: ${state}`);

            if (state !== 'PoweredOn') {
                Alert.alert(
                    'Bluetooth tắt',
                    'Vui lòng bật Bluetooth để tiếp tục'
                );
                setScanning(false);
                return;
            }

            // Quét thiết bị trong 10 giây
            bleManager.startDeviceScan(null, null, (error, device) => {
                if (error) {
                    console.error('Scan error:', error);
                    addDebugLog(`Lỗi quét: ${error.message}`);
                    setScanning(false);
                    return;
                }

                if (device && device.name) {
                    addDebugLog(`Tìm thấy: ${device.name} (${device.id})`);
                    setAvailableDevices(prevDevices => {
                        const exists = prevDevices.find(d => d.id === device.id);
                        if (!exists) {
                            return [...prevDevices, {
                                id: device.id,
                                name: device.name,
                                rssi: device.rssi,
                                isConnectable: device.isConnectable || true,
                            }];
                        }
                        return prevDevices;
                    });
                }
            });

            // Dừng scan sau 10 giây
            setTimeout(() => {
                bleManager.stopDeviceScan();
                setScanning(false);
                addDebugLog('Kết thúc quét thiết bị');
            }, 10000);
        } catch (error) {
            console.error('Scan error:', error);
            addDebugLog(`Lỗi: ${error.message}`);
            setScanning(false);
            Alert.alert('Lỗi', 'Không thể quét thiết bị Bluetooth');
        }
    };

    // ============================================
    // KẾT NỐI BLUETOOTH (Fake + Real)
    // ============================================
    const connectBluetooth = async (deviceId) => {
        setLoading(true);
        addDebugLog(`Đang kết nối đến: ${deviceId}`);

        // ===== FAKE MODE: Fake connection =====
        if (useFakeData && deviceId.startsWith('FAKE-')) {
            addDebugLog('🎭 FAKE MODE: Giả lập kết nối...');

            // Simulate connection delay
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Find fake device
            const fakeDevice = FAKE_DEVICES.find(d => d.id === deviceId);
            if (!fakeDevice) {
                addDebugLog('✗ Không tìm thấy thiết bị giả');
                setLoading(false);
                Alert.alert('Lỗi', 'Không tìm thấy thiết bị');
                return false;
            }

            addDebugLog('✓ Đã kết nối thành công! (Fake)');
            addDebugLog(`✓ Device: ${fakeDevice.name}`);
            addDebugLog('✓ MTU đã yêu cầu: 512 (Fake)');
            addDebugLog('✓ Đã discover services và characteristics (Fake)');
            addDebugLog('✓ Service target đã tìm thấy (Fake)');
            addDebugLog('✓ Tìm thấy 3 characteristics (Fake)');
            addDebugLog('Bắt đầu monitor dữ liệu... (Fake)');

            setConnectedDevice({
                id: fakeDevice.id,
                name: fakeDevice.name,
                rssi: fakeDevice.rssi,
            });
            setIsBluetoothConnected(true);
            setLoading(false);

            await apiService.addDevice({id: fakeDevice.id, name: fakeDevice.name, macAddress:"B1:B2:B3:B4:B5:B6"})

            return true;
        }

        // ===== REAL MODE: Real connection =====
        try {
            // Dừng scan nếu đang chạy
            bleManager.stopDeviceScan();

            // Kết nối đến thiết bị
            const device = await bleManager.connectToDevice(deviceId, {
                timeout: 10000
            });
            addDebugLog('Đã kết nối thành công!');
            await apiService.addDevice({id: device.name, name: device.name || 'Unknown', macAddress:deviceId});

            console.log('Connected to device:', device);
            // YÊU CẦU MTU SIZE LỚN HƠN
            try {
                const mtu = await device.requestMTU(512);
                addDebugLog(`MTU đã yêu cầu: ${mtu}`);
            } catch (mtuError) {
                addDebugLog(`Không thể set MTU: ${mtuError.message}`);
            }

            // Discover services và characteristics
            await device.discoverAllServicesAndCharacteristics();
            addDebugLog('Đã discover services và characteristics');

            try {
                const services = await device.services();
                addDebugLog(`Tìm thấy ${services.length} services`);

                services.forEach(service => {
                    addDebugLog(`Service: ${service.uuid}`);
                });

                const targetService = services.find(s => s.uuid.toLowerCase() === SERVICE_UUID.toLowerCase());
                if (targetService) {
                    addDebugLog('✓ Service target đã tìm thấy');

                    const characteristics = await targetService.characteristics();
                    addDebugLog(`Tìm thấy ${characteristics.length} characteristics`);

                    characteristics.forEach(char => {
                        addDebugLog(`Characteristic: ${char.uuid}, readable: ${char.isReadable}, writable: ${char.isWritableWithResponse || char.isWritableWithoutResponse}, notifiable: ${char.isNotifiable}`);
                    });
                } else {
                    addDebugLog('✗ Không tìm thấy service target');
                }
            } catch (err) {
                addDebugLog(`Lỗi khi kiểm tra services: ${err.message}`);
            }

            setConnectedDevice(device);
            setIsBluetoothConnected(true);

            // Bắt đầu monitor dữ liệu
            startMonitoringData(device);

            setLoading(false);
            return true;
        } catch (error) {
            console.error('Connection error:', error);
            addDebugLog(`Lỗi kết nối: ${error.message}`);
            setLoading(false);
            Alert.alert('Lỗi kết nối', 'Không thể kết nối đến thiết bị');
            return false;
        }
    };

    // ============================================
    // MONITOR DỮ LIỆU TỪ ESP32 - REAL DATA LOGIC (KHÔNG THAY ĐỔI)
    // ============================================
    const startMonitoringData = (device) => {
        addDebugLog('Bắt đầu monitor dữ liệu...');
        let buffer = '';

        device.monitorCharacteristicForService(
            SERVICE_UUID,
            CHARACTERISTIC_UUID,
            (error, characteristic) => {
                if (error) {
                    console.error('Monitor error:', error);
                    addDebugLog(`Lỗi monitor: ${error.message}`);
                    return;
                }

                if (characteristic?.value) {
                    try {
                        const chunk = Buffer.from(characteristic.value, 'base64').toString('utf-8');
                        addDebugLog(`Nhận chunk (${chunk.length} bytes): ${chunk.substring(0, 50)}...`);

                        buffer += chunk;

                        if (buffer.includes('}')) {
                            const lastBraceIndex = buffer.lastIndexOf('}');
                            const completeJson = buffer.substring(0, lastBraceIndex + 1);
                            buffer = buffer.substring(lastBraceIndex + 1);

                            addDebugLog(`JSON hoàn chỉnh (${completeJson.length} bytes): ${completeJson}`);

                            try {
                                const data = JSON.parse(completeJson);
                                addDebugLog(`✓ Parse thành công: SpO2=${data.spo2}, HR=${data.heartRate}, Battery=${data.battery}%`);

                                setSensorData({
                                    spo2: data.spo2,
                                    heartRate: data.heartRate,
                                    heartRateValid: data.heartRateValid,
                                    fallDetected: data.fallDetected,
                                    severity: data.severity,
                                    battery: data.batteryLevel,
                                    isCharging: data.isCharging,
                                    signalQuality: data.signalQuality,
                                    timestamp: new Date().toLocaleTimeString('vi-VN'),
                                    deviceId: data.deviceId,
                                    step: data.step,
                                });

                                setDataHistory(prev => [
                                    {
                                        ...data,
                                        receivedAt: new Date().toISOString(),
                                    },
                                    ...prev
                                ].slice(0, 100));

                                buffer = '';

                            } catch (parseError) {
                                addDebugLog(`✗ Lỗi parse JSON: ${parseError.message}`);
                                addDebugLog(`Dữ liệu lỗi: ${completeJson}`);
                                buffer = '';
                            }
                        } else {
                            addDebugLog(`Đang chờ thêm dữ liệu... (buffer hiện tại: ${buffer.length} bytes)`);
                        }

                    } catch (e) {
                        console.error('Process error:', e);
                        addDebugLog(`✗ Lỗi xử lý: ${e.message}`);
                        buffer = '';
                    }
                } else {
                    addDebugLog('Nhận characteristic nhưng không có value');
                }
            }
        );
    };

    // ============================================
    // NGẮT KẾT NỐI (Fake + Real)
    // ============================================
    const disconnectBluetooth = async () => {
        // ===== FAKE MODE =====
        if (useFakeData || connectedDevice?.id.startsWith('FAKE-')) {
            addDebugLog('🎭 Ngắt kết nối fake device...');
            setConnectedDevice(null);
            setIsBluetoothConnected(false);
            setSensorData({
                spo2: null,
                heartRate: null,
                heartRateValid: false,
                fallDetected: false,
                severity: null,
                battery: null,
                isCharging: false,
                signalQuality: null,
                timestamp: null,
                deviceId: null,
                step: null,
            });
            addDebugLog('✓ Đã ngắt kết nối (Fake)');
            return;
        }

        // ===== REAL MODE =====
        if (connectedDevice) {
            try {
                await connectedDevice.cancelConnection();
                setConnectedDevice(null);
                setIsBluetoothConnected(false);
                setSensorData({
                    spo2: null,
                    heartRate: null,
                    heartRateValid: false,
                    fallDetected: false,
                    severity: null,
                    battery: null,
                    isCharging: false,
                    signalQuality: null,
                    timestamp: null,
                    deviceId: null,
                    step: null,
                });
                addDebugLog('Đã ngắt kết nối');
            } catch (error) {
                console.error('Disconnect error:', error);
                addDebugLog(`Lỗi ngắt kết nối: ${error.message}`);
            }
        }
    };

    // ============================================
    // ĐỌC DỮ LIỆU NGAY LẬP TỨC
    // ============================================
    const readSensorData = async () => {
        if (useFakeData || connectedDevice?.id.startsWith('FAKE-')) {
            return sensorData;
        }

        if (!connectedDevice) {
            Alert.alert('Lỗi', 'Chưa kết nối đến thiết bị');
            return null;
        }

        try {
            addDebugLog('Đang đọc dữ liệu...');
            const characteristic = await connectedDevice.readCharacteristicForService(
                SERVICE_UUID,
                CHARACTERISTIC_UUID
            );

            if (characteristic?.value) {
                const rawData = Buffer.from(characteristic.value, 'base64').toString('utf-8');
                addDebugLog(`Đọc được: ${rawData}`);
                const data = JSON.parse(rawData);
                return data;
            }
        } catch (error) {
            console.error('Read error:', error);
            addDebugLog(`Lỗi đọc: ${error.message}`);
            Alert.alert('Lỗi', 'Không thể đọc dữ liệu từ thiết bị');
            return null;
        }
    };
    const syncTimeToDevice = async () => {
        if (!isBluetoothConnected || !connectedDevice) {
            Alert.alert('Lỗi', 'Chưa kết nối đến thiết bị');
            return false;
        }

        // Lấy epoch time hiện tại (Unix timestamp, giây)
        const epoch = Math.floor(Date.now() / 1000);
        const message = `T${epoch}`;
        addDebugLog(`Chuẩn bị gửi đồng bộ giờ: ${message}`);

        // ===== FAKE MODE =====
        if (useFakeData || connectedDevice.id.startsWith('FAKE-')) {
            addDebugLog('🎭 FAKE MODE: Giả lập gửi đồng bộ giờ...');
            await new Promise(resolve => setTimeout(resolve, 500));
            addDebugLog(`✓ Đã gửi thành công (Fake): ${message}`);
            return true;
        }

        // ===== REAL MODE =====
        try {
            const base64Message = Buffer.from(message, 'utf-8').toString('base64');
            addDebugLog(`Gửi base64: ${base64Message}`);
            await connectedDevice.writeCharacteristicWithResponseForService(
                SERVICE_UUID,
                CHARACTERISTIC_UUID_RX,
                base64Message
            );
            addDebugLog('✓ Đã gửi thành công đồng bộ giờ!');
            return true;
        } catch (error) {
            console.error('Sync time error:', error);
            addDebugLog(`✗ Lỗi gửi: ${error.message}`);
            Alert.alert('Lỗi', 'Không thể gửi dữ liệu đồng bộ giờ');
            return false;
        }
    };

    const value = {
        // States
        isBluetoothConnected,
        connectedDevice,
        availableDevices,
        sensorData,
        loading,
        scanning,
        dataHistory,
        debugLogs,

        // Fake Data States
        useFakeData,
        fakeDataInterval,

        // Functions
        scanBluetoothDevices,
        connectBluetooth,
        disconnectBluetooth,
        readSensorData,

        // Fake Data Functions
        toggleFakeDataMode,
        setFakeDataUpdateInterval,

        // Fake Data Generator Controls
        triggerFakeFall: () => fakeDataGenerator.triggerFall(),
        setFakeBatteryLevel: (level) => fakeDataGenerator.setBatteryLevel(level),
        toggleFakeCharging: () => fakeDataGenerator.toggleCharging(),
    };

    return (
        <IoTContext.Provider value={value}>
            {children}
        </IoTContext.Provider>
    );
};

export default IoTContext;