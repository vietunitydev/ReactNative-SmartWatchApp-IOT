import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    Animated,
    TouchableOpacity,
    RefreshControl,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useIoT } from '../contexts/IoTContext';
import Icon from 'react-native-vector-icons/Ionicons';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
    const { user, logout } = useAuth();
    const {
        isBluetoothConnected,
        connectedDevice,
        sensorData,
        readSensorData,
        loading
    } = useIoT();

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
        ]).start();
    }, []);

    const onRefresh = async () => {
        if (isBluetoothConnected) {
            console.log(sensorData);

            await readSensorData();
        }
    };

    // Xác định trạng thái kết nối
    const getConnectionStatus = () => {
        if (!isBluetoothConnected) {
            return {
                color: '#ef4444',
                text: 'Chưa kết nối',
                icon: 'close-circle'
            };
        }
        return {
            color: '#22c55e',
            text: 'Đang kết nối',
            icon: 'checkmark-circle'
        };
    };

    const connectionStatus = getConnectionStatus();

    // Xác định màu sắc cho SpO2
    const getSpo2Color = (spo2) => {
        if (!spo2 || spo2 === 'N/A') return '#94a3b8';
        if (spo2 >= 95) return '#22c55e';
        if (spo2 >= 90) return '#f59e0b';
        return '#ef4444';
    };

    // Xác định màu sắc cho nhịp tim
    const getHeartRateColor = (hr, valid) => {
        if (!valid || !hr || hr === 'N/A') return '#94a3b8';
        if (hr >= 60 && hr <= 100) return '#22c55e';
        if (hr > 100 && hr <= 120) return '#f59e0b';
        return '#ef4444';
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                refreshControl={
                    <RefreshControl
                        refreshing={loading}
                        onRefresh={onRefresh}
                        tintColor="#0ea5e9"
                    />
                }
            >
                {/* Header */}
                <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    <View>
                        <Text style={styles.greeting}>Xin chào,</Text>
                        <Text style={styles.userName}>{user?.name || 'Người dùng'}</Text>
                    </View>
                    <TouchableOpacity onPress={logout}>
                        <Icon name="log-out-outline" size={28} color="#64748b" />
                    </TouchableOpacity>
                </Animated.View>

                {/* Main Card */}
                <Animated.View style={[styles.mainCard, { opacity: fadeAnim }]}>
                    {/* Header - Hiển thị trạng thái kết nối */}
                    <View style={[
                        styles.headerBlue,
                        !isBluetoothConnected && styles.headerDisconnected
                    ]}>
                        <Icon
                            name={isBluetoothConnected ? "bluetooth" : "bluetooth-outline"}
                            size={24}
                            color="#fff"
                        />
                        <Text style={styles.deviceId}>
                            {isBluetoothConnected
                                ? (connectedDevice?.name || sensorData.deviceId || 'ESP32-001')
                                : 'Chưa kết nối'
                            }
                        </Text>
                        <Icon
                            name={connectionStatus.icon}
                            size={18}
                            color={connectionStatus.color}
                            style={{ marginLeft: 12 }}
                        />
                        <Text style={styles.onlineText}>{connectionStatus.text}</Text>
                    </View>

                    {isBluetoothConnected ? (
                        <>
                            {/* Vital Signs */}
                            <View style={styles.vitalContainer}>
                                <View style={styles.vitalItem}>
                                    <View style={[
                                        styles.vitalIcon,
                                        { backgroundColor: getSpo2Color(sensorData.spo2) + '20' }
                                    ]}>
                                        <Icon
                                            name="water"
                                            size={28}
                                            color={getSpo2Color(sensorData.spo2)}
                                        />
                                    </View>
                                    <Text style={styles.vitalValue}>
                                        {sensorData.spo2 ?? '--'}
                                        <Text style={styles.unit}>%</Text>
                                    </Text>
                                    <Text style={styles.vitalLabel}>SpO2</Text>
                                </View>

                                <View style={styles.vitalItem}>
                                    <View style={[
                                        styles.vitalIcon,
                                        { backgroundColor: getHeartRateColor(sensorData.heartRate, sensorData.heartRateValid) + '20' }
                                    ]}>
                                        <Icon
                                            name="heart"
                                            size={28}
                                            color={getHeartRateColor(sensorData.heartRate, sensorData.heartRateValid)}
                                        />
                                    </View>
                                    <Text style={styles.vitalValue}>
                                        {sensorData.heartRate ?? '--'}
                                        <Text style={styles.unit}> bpm</Text>
                                    </Text>
                                    <Text style={styles.vitalLabel}>Nhịp tim</Text>
                                    {!sensorData.heartRateValid && sensorData.heartRate && (
                                        <Text style={styles.invalidText}>Không hợp lệ</Text>
                                    )}
                                </View>

                                <View style={styles.vitalItem}>
                                    <View style={styles.vitalIcon}>
                                        <Icon name="walk" size={28} color="#8b5cf6" />
                                    </View>
                                    <Text style={styles.vitalValue}>
                                        {sensorData.step ?? '--'}
                                    </Text>
                                    <Text style={styles.vitalLabel}>Bước chân</Text>
                                </View>
                            </View>

                            {/* Extra Info */}
                            <View style={styles.extraInfo}>
                                <View style={styles.infoRow}>
                                    <Icon
                                        name={sensorData.isCharging ? "battery-charging" :
                                            sensorData.battery > 20 ? "battery-half" : "battery-dead"}
                                        size={22}
                                        color={sensorData.battery > 20 ? '#22c55e' : '#ef4444'}
                                    />
                                    <Text style={styles.infoText}>
                                        {sensorData.battery ?? '--'}%
                                        {sensorData.isCharging && ' (đang sạc)'}
                                    </Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Icon
                                        name="pulse"
                                        size={22}
                                        color={
                                            sensorData.signalQuality === 'excellent' ? '#22c55e' :
                                                sensorData.signalQuality === 'good' ? '#f59e0b' :
                                                    '#ef4444'
                                        }
                                    />
                                    <Text style={styles.infoText}>
                                        {sensorData.signalQuality === 'excellent' ? 'Tín hiệu tốt' :
                                            sensorData.signalQuality === 'good' ? 'Tín hiệu trung bình' :
                                                sensorData.signalQuality === 'poor' ? 'Tín hiệu yếu' :
                                                    'Không xác định'}
                                    </Text>
                                </View>
                            </View>

                            {/* Fall Alert */}
                            <View style={[
                                styles.fallAlert,
                                sensorData.fallDetected && styles.fallActive
                            ]}>
                                <Icon
                                    name={sensorData.fallDetected ? "warning" : "shield-checkmark"}
                                    size={24}
                                    color={sensorData.fallDetected ? '#ef4444' : '#22c55e'}
                                />
                                <Text style={[
                                    styles.fallText,
                                    sensorData.fallDetected && { color: '#991b1b' }
                                ]}>
                                    {sensorData.fallDetected
                                        ? `ĐÃ PHÁT HIỆN TÉ NGÃ! (${sensorData.severity || 'N/A'})`
                                        : 'Chưa phát hiện té ngã'
                                    }
                                </Text>
                            </View>

                            {/* Timestamp */}
                            {sensorData.timestamp && (
                                <View style={styles.timestampContainer}>
                                    <Icon name="time-outline" size={16} color="#64748b" />
                                    <Text style={styles.timestampText}>
                                        Cập nhật: {sensorData.timestamp}
                                    </Text>
                                </View>
                            )}
                        </>
                    ) : (
                        /* Disconnected State */
                        <View style={styles.disconnectedContainer}>
                            <Icon name="bluetooth-outline" size={80} color="#cbd5e1" />
                            <Text style={styles.disconnectedTitle}>Chưa kết nối thiết bị</Text>
                            <Text style={styles.disconnectedText}>
                                Vui lòng kết nối với thiết bị Bluetooth để xem dữ liệu sức khỏe
                            </Text>
                            <TouchableOpacity
                                style={styles.connectButton}
                                onPress={() => navigation.navigate('Bluetooth')}
                            >
                                <Icon name="bluetooth" size={20} color="#fff" />
                                <Text style={styles.connectButtonText}>Kết nối thiết bị</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </Animated.View>

                {/* Menu */}
                <View style={styles.menuGrid}>
  {[
    { icon: 'bluetooth', label: 'Bluetooth', screen: 'Bluetooth' },
    { icon: 'time-outline', label: 'Lịch sử', screen: 'History' },
    { icon: 'location-outline', label: 'Vị trí', screen: 'Location' },
    { icon: 'people-outline', label: 'Người thân', screen: 'Relations' },
    // { icon: 'bug-outline', label: 'Debug', screen: 'Debug' },
    // { icon: 'stats-chart-outline', label: 'Dashboard', screen: 'SensorDashboard' },
    // Tách riêng item ChatBot để truy cập được sensorData
  ].map((item, i) => (
    <TouchableOpacity
      key={i}
      style={styles.menuItem}
      onPress={() => {
        if (item.screen === 'ChatBot') {
          // Trường hợp đặc biệt: truyền dữ liệu sensor
          navigation.navigate('ChatBot', { latestSensorData: sensorData });
        } else {
          // Các màn hình khác: navigate bình thường
          navigation.navigate(item.screen);
        }
      }}
      activeOpacity={0.75}
    >
      <View style={styles.menuIconBg}>
        <Icon name={item.screen === 'ChatBot' ? 'chatbubble-ellipses-outline' : item.icon} size={32} color="#0ea5e9" />
      </View>
      <Text style={styles.menuLabel}>
        {item.screen === 'ChatBot' ? 'Trợ lý sức khỏe' : item.label}
      </Text>
    </TouchableOpacity>
  ))}

  {/* Hoặc cách đẹp hơn: tách riêng item ChatBot ra ngoài map */}
  <TouchableOpacity
    style={styles.menuItem}
    onPress={() => navigation.navigate('ChatBot', { latestSensorData: sensorData })}
    activeOpacity={0.75}
  >
    <View style={styles.menuIconBg}>
      <Icon name="chatbubble-ellipses-outline" size={32} color="#0ea5e9" />
    </View>
    <Text style={styles.menuLabel}>Trợ lý sức khỏe</Text>
  </TouchableOpacity>
</View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ecfeff' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
    greeting: { fontSize: 16, color: '#64748b' },
    userName: { fontSize: 26, fontWeight: '800', color: '#0c4a6e' },
    mainCard: {
        margin: 20,
        backgroundColor: '#fff',
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 20
    },
    headerBlue: {
        backgroundColor: '#0ea5e9',
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center'
    },
    headerDisconnected: {
        backgroundColor: '#64748b'
    },
    deviceId: { color: '#fff', fontWeight: '700', marginLeft: 12, fontSize: 17, flex: 1 },
    onlineText: { color: '#fff', marginLeft: 8, fontWeight: '600' },
    vitalContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 32
    },
    vitalItem: { alignItems: 'center' },
    vitalIcon: {
        width: 62,
        height: 62,
        borderRadius: 31,
        backgroundColor: '#f8fafc',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10
    },
    vitalValue: { fontSize: 28, fontWeight: '800', color: '#1e293b' },
    unit: { fontSize: 15, color: '#64748b' },
    vitalLabel: { fontSize: 13, color: '#64748b', marginTop: 4 },
    invalidText: { fontSize: 11, color: '#ef4444', marginTop: 2 },
    extraInfo: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 16,
        backgroundColor: '#f8fafc'
    },
    infoRow: { flexDirection: 'row', alignItems: 'center' },
    infoText: { marginLeft: 10, fontWeight: '600', color: '#475569' },
    fallAlert: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backgroundColor: '#f0fdf4'
    },
    fallActive: { backgroundColor: '#fee2e2' },
    fallText: { marginLeft: 12, fontWeight: '700', color: '#166534' },
    timestampContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        backgroundColor: '#f8fafc',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0'
    },
    timestampText: {
        marginLeft: 6,
        fontSize: 12,
        color: '#64748b',
        fontWeight: '500'
    },
    disconnectedContainer: {
        paddingVertical: 60,
        paddingHorizontal: 30,
        alignItems: 'center'
    },
    disconnectedTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0f172a',
        marginTop: 20,
        marginBottom: 8
    },
    disconnectedText: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24
    },
    connectButton: {
        backgroundColor: '#0ea5e9',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
        shadowColor: '#0ea5e9',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6
    },
    connectButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 8
    },
    menuGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 20,
        justifyContent: 'space-between'
    },
    menuItem: {
        width: width / 2 - 30,
        alignItems: 'center',
        marginBottom: 24
    },
    menuIconBg: {
        width: 82,
        height: 82,
        borderRadius: 24,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 12
    },
    menuLabel: {
        marginTop: 12,
        fontSize: 14.5,
        fontWeight: '600',
        color: '#1e293b'
    },
});

export default HomeScreen;