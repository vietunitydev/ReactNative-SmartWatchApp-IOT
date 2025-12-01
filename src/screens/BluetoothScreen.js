import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useIoT } from '../contexts/IoTContext';

const BluetoothScreen = ({ navigation }) => {
  const {
    availableDevices,
    isBluetoothConnected,
    connectedDevice,
    scanBluetoothDevices,
    connectBluetooth,
    disconnectBluetooth,
    loading,
    syncTimeToDevice
  } = useIoT();

  const [scanning, setScanning] = useState(false);
  const rotateAnim = new Animated.Value(0);

  useEffect(() => {
    // Tự động quét khi vào màn hình
    handleScan();
  }, []);

  useEffect(() => {
    // Xử lý animation khi scanning
    if (scanning) {
      Animated.loop(
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true
          })
      ).start();
    } else {
      rotateAnim.setValue(0);
    }
  }, [scanning]);

  const handleScan = async () => {
    setScanning(true);
    await scanBluetoothDevices();
    setScanning(false);
  };

  const handleConnect = async (device) => {
    Alert.alert(
        'Kết nối thiết bị',
        `Bạn muốn kết nối với ${device.name}?`,
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Kết nối',
            onPress: async () => {
              const success = await connectBluetooth(device.id);
              if (success) {
                Alert.alert('Thành công', 'Đã kết nối với thiết bị!');
                const syncSuccess = await syncTimeToDevice();
                if (syncSuccess) {
                  console.log('Đồng bộ giờ thành công');
                } else {
                  console.log('Đồng bộ giờ thất bại');
                }
              } else {
                Alert.alert('Lỗi', 'Không thể kết nối với thiết bị');
              }
            }
          }
        ]
    );
  };

  const handleDisconnect = () => {
    Alert.alert(
        'Ngắt kết nối',
        'Bạn có chắc muốn ngắt kết nối?',
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Ngắt kết nối',
            onPress: async () => {
              await disconnectBluetooth();
              Alert.alert('Đã ngắt kết nối', 'Thiết bị đã được ngắt kết nối');
            },
            style: 'destructive'
          }
        ]
    );
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const getSignalStrength = (rssi) => {
    if (rssi > -60) return { color: '#22c55e', icon: 'cellular' };
    if (rssi > -75) return { color: '#f59e0b', icon: 'cellular' };
    return { color: '#ef4444', icon: 'cellular' };
  };

  const renderItem = ({ item }) => {
    const isConnected = isBluetoothConnected && connectedDevice?.id === item.id;
    const signal = getSignalStrength(item.rssi);

    return (
        <TouchableOpacity
            style={[
              styles.deviceCard,
              isConnected && styles.deviceCardConnected
            ]}
            onPress={() => handleConnect(item)}
            disabled={!item.isConnectable || isConnected}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Icon
                name={isConnected ? "bluetooth-connected" : "bluetooth"}
                size={28}
                color={isConnected ? "#22c55e" : "#0ea5e9"}
            />
            <View style={{ marginLeft: 14, flex: 1 }}>
              <Text style={styles.deviceName}>{item.name}</Text>
              <Text style={styles.mac}>{item.id}</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name={signal.icon} size={20} color={signal.color} />
            <Text style={styles.rssiText}>{item.rssi} dBm</Text>
            {isConnected && (
                <View style={styles.connectedDot} />
            )}
          </View>
        </TouchableOpacity>
    );
  };

  const renderContent = () => {
    // Hiển thị loading khi đang quét và chưa có thiết bị
    if (scanning && availableDevices.length === 0) {
      return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0ea5e9" />
            <Text style={styles.loadingText}>Đang tìm kiếm thiết bị...</Text>
            <Text style={styles.loadingSubtext}>Vui lòng chờ trong giây lát</Text>
          </View>
      );
    }

    // Hiển thị danh sách thiết bị
    if (availableDevices.length > 0) {
      return (
          <FlatList
              data={availableDevices}
              renderItem={renderItem}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 20 }}
          />
      );
    }

    // Hiển thị empty state khi không có thiết bị
    return (
        <View style={styles.emptyContainer}>
          <Icon name="bluetooth-outline" size={64} color="#cbd5e1" />
          <Text style={styles.emptyText}>Chưa tìm thấy thiết bị nào</Text>
          <Text style={styles.emptySubtext}>Nhấn nút quét để tìm kiếm thiết bị</Text>
        </View>
    );
  };

  return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={28} color="#0c4a6e" />
          </TouchableOpacity>
          <Text style={styles.title}>Thiết bị Bluetooth</Text>
          <TouchableOpacity onPress={handleScan} disabled={scanning || loading}>
            <Animated.View style={{ transform: [{ rotate: scanning ? spin : '0deg' }] }}>
              <Icon
                  name={scanning ? "sync" : "scan"}
                  size={30}
                  color={scanning ? "#94a3b8" : "#0ea5e9"}
              />
            </Animated.View>
          </TouchableOpacity>
        </View>

        {isBluetoothConnected && connectedDevice && (
            <TouchableOpacity
                style={styles.connected}
                onPress={handleDisconnect}
                activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Icon name="checkmark-circle" size={28} color="#22c55e" />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.connectedText}>Đã kết nối</Text>
                  <Text style={styles.connectedDevice}>{connectedDevice.name}</Text>
                </View>
              </View>
              <Text style={styles.disconnectText}>Ngắt kết nối</Text>
            </TouchableOpacity>
        )}

        {/* Banner hiển thị khi đang quét VÀ đã có thiết bị */}
        {scanning && availableDevices.length > 0 && (
            <View style={styles.scanningBanner}>
              <ActivityIndicator color="#0ea5e9" size="small" />
              <Text style={styles.scanningText}>Đang quét thêm thiết bị...</Text>
            </View>
        )}

        {renderContent()}
      </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ecfeff'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ecfeff'
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0c4a6e'
  },
  connected: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#ecfdf5',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#22c55e'
  },
  connectedText: {
    fontWeight: '700',
    color: '#166534',
    fontSize: 14
  },
  connectedDevice: {
    fontWeight: '600',
    color: '#16a34a',
    fontSize: 16,
    marginTop: 2
  },
  disconnectText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 14
  },
  scanningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#e0f2fe',
    padding: 12,
    borderRadius: 12
  },
  scanningText: {
    marginLeft: 10,
    color: '#0c4a6e',
    fontWeight: '600'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0c4a6e',
    marginTop: 20,
    textAlign: 'center'
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center'
  },
  deviceCard: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 18,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8
  },
  deviceCardConnected: {
    borderWidth: 2,
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4'
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a'
  },
  mac: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2
  },
  rssiText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 6,
    fontWeight: '600'
  },
  connectedDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 12,
    backgroundColor: '#22c55e'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
    marginTop: 16
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8
  },
  infoSection: {
    flexDirection: 'row',
    backgroundColor: '#e0f2fe',
    padding: 16,
    margin: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#0ea5e9'
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0c4a6e',
    marginBottom: 8
  },
  infoText: {
    fontSize: 13,
    color: '#0c4a6e',
    marginBottom: 4
  }
});

export default BluetoothScreen;