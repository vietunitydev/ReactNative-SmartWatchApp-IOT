// screens/PatientDetailScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import apiService from '../services/api.service';

const POLL_INTERVAL = 5000; // 5s

const PatientDetailScreen = ({ route, navigation }) => {
  const { username, name } = route.params;

  const [latestRecord, setLatestRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  const getSpo2Color = (value) => {
    if (value >= 95) return '#22c55e';
    if (value >= 90) return '#f59e0b';
    return '#ef4444';
  };

  const getHeartRateColor = (hr, valid) => {
    if (!valid) return '#94a3b8';
    if (hr >= 60 && hr <= 100) return '#22c55e';
    return '#ef4444';
  };

  const formatTimestamp = (isoString) => {
    if (!isoString) return '—';
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  // Hàm fetch record mới nhất
  const fetchLatestRecord = async () => {
    try {
      const res = await apiService.getRecords(username);

      if (Array.isArray(res) && res.length > 0) {
        // Tùy backend: nếu record mới nhất ở đầu / cuối thì chỉnh ở đây
        const latest = res[0]; // hoặc res[res.length - 1]
        console.log(latest)
        setLatestRecord(latest);
      } else {
        setLatestRecord(null);
      }
    } catch (e) {
      console.log('Error fetching records', e);
    } finally {
      setLoading(false);
    }
  };

  // Polling mỗi 5s
  useEffect(() => {
    let isMounted = true;

    const wrappedFetch = async () => {
      if (!isMounted) return;
      await fetchLatestRecord();
    };

    wrappedFetch(); // gọi lần đầu khi vào screen

    const intervalId = setInterval(wrappedFetch, POLL_INTERVAL);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [username]);

  // Map record -> object dùng cho UI
  const patient = {
    name: name || username,
    spo2: latestRecord?.spo2 ?? 0,
    heartRate: latestRecord?.heartRate ?? 0,
    heartRateValid: latestRecord?.heartRateValid ?? true,
    fallDetected: latestRecord?.fallDetected ?? false,
    severity: latestRecord?.severity || 'moderate',
    batteryLevel: latestRecord?.battery ?? 0,
    isCharging: latestRecord?.isCharging ?? false,
    signalQuality: latestRecord?.signalQuality || 'good',
    timestamp: latestRecord ? formatTimestamp(latestRecord.recordedAt) : 'Đang tải...',
    deviceId: latestRecord?.deviceId || 'N/A',
    step: latestRecord?.step ?? 0,
  };

  return (
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Icon name="arrow-back" size={28} color="#0c4a6e" />
            </TouchableOpacity>
            <Text style={styles.title}>{patient.name}</Text>
            <TouchableOpacity onPress={() => Alert.alert('Gọi khẩn cấp', `Đang gọi cho ${patient.name}...`)}>
              <Icon name="call-outline" size={26} color="#ef4444" />
            </TouchableOpacity>
          </View>

          {/* Nếu đang load lần đầu thì show loading */}
          {loading && !latestRecord && (
              <View style={{ paddingTop: 80, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0ea5e9" />
                <Text style={{ marginTop: 12, color: '#64748b' }}>
                  Đang tải dữ liệu mới nhất...
                </Text>
              </View>
          )}

          {/* Main Card – vẫn dùng UI cũ nhưng lấy dữ liệu từ patient (map từ latestRecord) */}
          {!loading && !latestRecord && (
              <View style={{ paddingHorizontal: 20, paddingTop: 40 }}>
                <Text style={{ textAlign: 'center', color: '#64748b' }}>
                  Chưa có bản ghi nào cho người dùng này.
                </Text>
              </View>
          )}

          {latestRecord && (
              <View style={styles.mainCard}>
                {/* Device Header */}
                <View style={styles.deviceHeader}>
                  <Icon name="bluetooth" size={22} color="#fff" />
                  <Text style={styles.deviceId}>{patient.deviceId}</Text>
                  <Icon name="checkmark-circle" size={18} color="#22c55e" style={{ marginLeft: 8 }} />
                  <Text style={styles.onlineText}>Đang kết nối</Text>
                </View>

                {/* Vital Signs */}
                <View style={styles.vitalGrid}>
                  {/* SpO2 */}
                  <View style={styles.vitalItem}>
                    <View style={[styles.vitalIcon, { backgroundColor: getSpo2Color(patient.spo2) + '20' }]}>
                      <Icon name="water" size={30} color={getSpo2Color(patient.spo2)} />
                    </View>
                    <Text style={styles.vitalValue}>
                      {patient.spo2}
                      <Text style={styles.unit}>%</Text>
                    </Text>
                    <Text style={styles.vitalLabel}>SpO2</Text>
                  </View>

                  {/* Heart Rate */}
                  <View style={styles.vitalItem}>
                    <View
                        style={[
                          styles.vitalIcon,
                          { backgroundColor: getHeartRateColor(patient.heartRate, patient.heartRateValid) + '20' },
                        ]}
                    >
                      <Icon
                          name="heart"
                          size={30}
                          color={getHeartRateColor(patient.heartRate, patient.heartRateValid)}
                      />
                    </View>
                    <Text style={styles.vitalValue}>
                      {patient.heartRate}
                      <Text style={styles.unit}> bpm</Text>
                    </Text>
                    <Text style={styles.vitalLabel}>Nhịp tim</Text>
                    {patient.heartRate > 100 && (
                        <Text style={styles.warningText}>Cao</Text>
                    )}
                  </View>

                  {/* Steps */}
                  <View style={styles.vitalItem}>
                    <View style={[styles.vitalIcon, { backgroundColor: '#8b5cf620' }]}>
                      <Icon name="walk" size={30} color="#8b5cf6" />
                    </View>
                    <Text style={styles.vitalValue}>{patient.step}</Text>
                    <Text style={styles.vitalLabel}>Bước chân</Text>
                  </View>
                </View>

                {/* Fall Alert */}
                <View style={[styles.fallAlert, patient.fallDetected && styles.fallActive]}>
                  <Icon
                      name={patient.fallDetected ? 'warning' : 'shield-checkmark'}
                      size={26}
                      color={patient.fallDetected ? '#fff' : '#22c55e'}
                  />
                  <Text style={[styles.fallText, patient.fallDetected && styles.fallTextActive]}>
                    {patient.fallDetected
                        ? `ĐÃ TÉ NGÃ – ${patient.severity?.toUpperCase() || 'NGHIÊM TRỌNG'}!`
                        : 'Hiện tại an toàn'}
                  </Text>
                </View>

                {/* Extra Info */}
                <View style={styles.extraInfo}>
                  <View style={styles.infoRow}>
                    <Icon
                        name={
                          patient.isCharging
                              ? 'battery-charging'
                              : patient.batteryLevel > 20
                                  ? 'battery-half'
                                  : 'battery-dead'
                        }
                        size={24}
                        color={patient.batteryLevel > 20 ? '#22c55e' : '#ef4444'}
                    />
                    <Text style={styles.infoText}>
                      {patient.batteryLevel}% {patient.isCharging && '(đang sạc)'}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Icon
                        name={patient.signalQuality === 'excellent' ? 'wifi' : 'wifi-outline'}
                        size={24}
                        color={patient.signalQuality === 'excellent' ? '#22c55e' : '#f59e0b'}
                    />
                    <Text style={styles.infoText}>
                      Tín hiệu {patient.signalQuality === 'excellent' ? 'rất tốt' : 'tốt'}
                    </Text>
                  </View>
                </View>

                {/* Timestamp */}
                <View style={styles.timestamp}>
                  <Icon name="time-outline" size={16} color="#64748b" />
                  <Text style={styles.timestampText}>Cập nhật: {patient.timestamp}</Text>
                </View>
              </View>
          )}

        {/* Action Buttons */}
        {/*<View style={styles.actionButtons}>*/}
        {/*  <TouchableOpacity*/}
        {/*    style={styles.actionBtn}*/}
        {/*    onPress={() => navigation.navigate('Location', { patient })}*/}
        {/*  >*/}
        {/*    <Icon name="location" size={26} color="#0ea5e9" />*/}
        {/*    <Text style={styles.actionText}>Xem vị trí</Text>*/}
        {/*  </TouchableOpacity>*/}

        {/*  <TouchableOpacity*/}
        {/*    style={styles.actionBtn}*/}
        {/*    onPress={() => navigation.navigate('History', { patient })}*/}
        {/*  >*/}
        {/*    <Icon name="time-outline" size={26} color="#0ea5e9" />*/}
        {/*    <Text style={styles.actionText}>Lịch sử</Text>*/}
        {/*  </TouchableOpacity>*/}
        {/*</View>*/}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ecfeff' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#0c4a6e' },

  mainCard: {
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },

  deviceHeader: {
    backgroundColor: '#0ea5e9',
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceId: { color: '#fff', fontWeight: '700', marginLeft: 10, fontSize: 16, flex: 1 },
  onlineText: { color: '#fff', marginLeft: 6, fontWeight: '600' },

  vitalGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 30,
  },
  vitalItem: { alignItems: 'center' },
  vitalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  vitalValue: { fontSize: 30, fontWeight: '800', color: '#1e293b' },
  unit: { fontSize: 16, color: '#64748b' },
  vitalLabel: { fontSize: 13, color: '#64748b', marginTop: 4 },
  warningText: { fontSize: 11, color: '#ef4444', marginTop: 4 },

  fallAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    backgroundColor: '#f0fdf4',
  },
  fallActive: { backgroundColor: '#ef4444' },
  fallText: { marginLeft: 12, fontWeight: '700', fontSize: 16, color: '#166534' },
  fallTextActive: { color: '#fff' },

  extraInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 18,
    backgroundColor: '#f8fafc',
  },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoText: { marginLeft: 10, fontWeight: '600', color: '#475569' },

  timestamp: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  timestampText: { marginLeft: 6, fontSize: 13, color: '#64748b', fontWeight: '500' },

  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  actionBtn: {
    backgroundColor: '#f0f9ff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
  actionText: { marginLeft: 10, fontWeight: '600', color: '#0ea5e9', fontSize: 15 },
});

export default PatientDetailScreen;