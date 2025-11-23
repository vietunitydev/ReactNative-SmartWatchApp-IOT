// SensorDashboard.js - Dashboard hiển thị sensor data real-time và auto sync
import React, { useState, useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIoT } from '../contexts/IoTContext';
import apiService from "../services/api.service";
import {useAuth} from "../contexts/AuthContext";

const { width } = Dimensions.get('window');

const SensorDashboard = ({ navigation }) => {
    const {user} = useAuth();
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
        if(!user) return;
        if (isSyncing) return;

        setIsSyncing(true);
        setSyncStatus('syncing');
        startSyncAnimation();

        try {
            const response = await apiService.saveRecord( {
                spo2: sensorData.spo2,
                heartRate: sensorData.heartRate,
                heartRateValid: sensorData.heartRateValid,
                // fallDetected: sensorData.fallDetected,
                // severity: sensorData.severity,
                battery: sensorData.batteryLevel,
                // isCharging: sensorData.isCharging,
                // signalQuality: sensorData.signalQuality,
                recordedAt: new Date().toISOString(),
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



    return (
        <SafeAreaView> </SafeAreaView>
    );
};

export default SensorDashboard;