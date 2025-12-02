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
  const [latestFall, setLatestFall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fallLoading, setFallLoading] = useState(true);

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
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getSeverityText = (severity) => {
    const severityMap = {
      'low': 'Thấp',
      'medium': 'Trung bình',
      'high': 'Cao',
      'critical': 'Nguy hiểm'
    };
    return severityMap[severity?.toLowerCase()] || severity || 'Không xác định';
  };

  const getSeverityColor = (severity) => {
    const colorMap = {
      'low': '#22c55e',
      'medium': '#f59e0b',
      'high': '#ef4444',
      'critical': '#dc2626'
    };
    return colorMap[severity?.toLowerCase()] || '#64748b';
  };

  // Hàm fetch record mới nhất
  const fetchLatestRecord = async () => {
    try {
      const res = await apiService.getRecords(username);

      if (Array.isArray(res) && res.length > 0) {
        const latest = res[0];
        console.log('Latest record:', latest);
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

  // Hàm fetch dữ liệu ngã gần nhất
  const fetchLatestFall = async () => {
    try {
      const response = await apiService.getFalls(username);

      if (response && response.length > 0) {
        const latestFallData = response.sort((a, b) =>
            new Date(b.detectedAt) - new Date(a.detectedAt)
        )[0];

        console.log('Latest fall:', latestFallData);
        setLatestFall(latestFallData);
      } else {
        setLatestFall(null);
      }
    } catch (err) {
      console.error('Error fetching falls:', err);
      setLatestFall(null);
    } finally {
      setFallLoading(false);
    }
  };

  // Polling mỗi 5s cho cả record và fall
  useEffect(() => {
    let isMounted = true;

    const wrappedFetch = async () => {
      if (!isMounted) return;
      await fetchLatestRecord();
      await fetchLatestFall();
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
    battery: latestRecord?.battery ?? 0,
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

          {/* Main Card */}
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
                              : patient.battery > 20
                                  ? 'battery-half'
                                  : 'battery-dead'
                        }
                        size={24}
                        color={patient.battery > 20 ? '#22c55e' : '#ef4444'}
                    />
                    <Text style={styles.infoText}>
                      {patient.battery}% {patient.isCharging && '(đang sạc)'}
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

          {/* Card hiển thị thông tin ngã gần nhất */}
          {!fallLoading && latestFall && (
              <View style={styles.fallHistoryCard}>
                <View style={styles.fallHistoryHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icon name="alert-circle" size={24} color="#ef4444" />
                    <Text style={styles.fallHistoryTitle}>Lần ngã gần nhất</Text>
                  </View>
                  <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(latestFall.severity) }]}>
                    <Text style={styles.severityBadgeText}>{getSeverityText(latestFall.severity).toUpperCase()}</Text>
                  </View>
                </View>

                <View style={styles.fallInfoContainer}>
                  <View style={styles.fallInfoRow}>
                    <View style={styles.fallIconCircle}>
                      <Icon name="time-outline" size={20} color="#0ea5e9" />
                    </View>
                    <View style={styles.fallTextContainer}>
                      <Text style={styles.fallLabel}>Thời gian phát hiện</Text>
                      <Text style={styles.fallValue}>{formatTimestamp(latestFall.detectedAt)}</Text>
                    </View>
                  </View>

                  <View style={styles.fallInfoRow}>
                    <View style={styles.fallIconCircle}>
                      <Icon name="heart" size={20} color="#ef4444" />
                    </View>
                    <View style={styles.fallTextContainer}>
                      <Text style={styles.fallLabel}>Nhịp tim khi ngã</Text>
                      <Text style={styles.fallValue}>{latestFall.heartRate} BPM</Text>
                    </View>
                  </View>

                  <View style={styles.fallInfoRow}>
                    <View style={styles.fallIconCircle}>
                      <Icon name="water" size={20} color="#06b6d4" />
                    </View>
                    <View style={styles.fallTextContainer}>
                      <Text style={styles.fallLabel}>SpO₂ khi ngã</Text>
                      <Text style={styles.fallValue}>{latestFall.spo2}%</Text>
                    </View>
                  </View>

                  <View style={styles.fallInfoRow}>
                    <View style={styles.fallIconCircle}>
                      <Icon name="location" size={20} color="#22c55e" />
                    </View>
                    <View style={styles.fallTextContainer}>
                      <Text style={styles.fallLabel}>Tọa độ GPS</Text>
                      <Text style={styles.fallValue}>
                        {latestFall.latitude.toFixed(4)}°, {latestFall.longitude.toFixed(4)}°
                      </Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                    style={styles.viewLocationBtn}
                    // onPress={() => navigation.navigate('Location')}
                    activeOpacity={0.8}
                >
                  <Icon name="map" size={20} color="#fff" />
                  <Text style={styles.viewLocationBtnText}>Xem vị trí trên bản đồ</Text>
                </TouchableOpacity>
              </View>
          )}

          {/* Hiển thị khi đang tải thông tin ngã */}
          {fallLoading && (
              <View style={styles.fallHistoryCard}>
                <ActivityIndicator size="small" color="#0ea5e9" />
                <Text style={{ marginTop: 8, color: '#64748b', textAlign: 'center' }}>
                  Đang tải thông tin ngã...
                </Text>
              </View>
          )}

          {/* Hiển thị khi không có dữ liệu ngã */}
          {!fallLoading && !latestFall && (
              <View style={styles.fallHistoryCard}>
                <Icon name="shield-checkmark" size={48} color="#22c55e" />
                <Text style={styles.noFallText}>Chưa phát hiện té ngã nào</Text>
                <Text style={styles.noFallSubText}>Người dùng này chưa có lịch sử té ngã</Text>
              </View>
          )}
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

  // Fall History Card Styles
  fallHistoryCard: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },

  fallHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },

  fallHistoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0c4a6e',
    marginLeft: 8,
  },

  severityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },

  severityBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  fallInfoContainer: {
    marginBottom: 16,
  },

  fallInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 12,
  },

  fallIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  fallTextContainer: {
    flex: 1,
  },

  fallLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 2,
  },

  fallValue: {
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '700',
  },

  viewLocationBtn: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
  },

  viewLocationBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },

  // No fall data styles
  noFallText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    marginTop: 12,
  },

  noFallSubText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default PatientDetailScreen;