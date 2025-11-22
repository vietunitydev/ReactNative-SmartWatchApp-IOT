// screens/RelationsScreen.js  ← PHIÊN BẢN SIÊU ĐẸP VỚI TOAST HIỆN ĐẠI
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

const pendingRequests = [
  { id: '1', name: 'Trần Thị Lan', username: 'tranthilan', time: '10 phút trước' },
  { id: '2', name: 'Nguyễn Văn Hùng', username: 'nguyenvanhung', time: '2 giờ trước' },
];

const followingList = [
  { id: '1', name: 'Nguyễn Thị Mai', spo2: 97, heartRate: 72, fallDetected: false, battery: 88, timestamp: 'Vừa xong', isOnline: true },
  { id: '2', name: 'Lê Văn Minh', spo2: 94, heartRate: 105, fallDetected: true, severity: 'moderate', battery: 32, timestamp: '5 phút trước', isOnline: false },
  { id: '3', name: 'Phạm Thị Hồng', spo2: 99, heartRate: 68, fallDetected: false, battery: 91, timestamp: '1 giờ trước', isOnline: true },
];

const searchResults = [
  { id: '10', name: 'Hoàng Văn Nam', username: 'hoangnam' },
  { id: '11', name: 'Bùi Thị Ngọc', username: 'buingoc' },
];

// Component Toast nhỏ xinh
const Toast = ({ visible, message, type = 'success' }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-100)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 100, friction: 8, useNativeDriver: true }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -100, duration: 300, useNativeDriver: true }),
        ]).start();
      }, 2200);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  const bgColor = type === 'success' ? '#22c55e' : '#ef4444';
  const iconName = type === 'success' ? 'checkmark-circle' : 'close-circle';

  return (
    <Animated.View style={[styles.toast, { backgroundColor: bgColor, opacity, transform: [{ translateY }] }]}>
      <Icon name={iconName} size={24} color="#fff" />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
};

const RelationsScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('add');
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState([]);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ ...toast, visible: false }), 3000);
  };

  const handleSearch = () => {
    setResults(searchResults);
  };

  const sendRequest = (user) => {
    showToast(`Đã gửi lời mời tới ${user.name} 🎉`, 'success');
  };

  const acceptRequest = (name) => {
    showToast(`${name} giờ là người thân của bạn rồi ❤️`, 'success');
  };

  const rejectRequest = (name) => {
    showToast(`Đã từ chối ${name} 😔`, 'error');
  };

  const goToPatientDetail = (patient) => {
    navigation.navigate('PatientDetail', { patient });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Toast đẹp lung linh */}
      <Toast visible={toast.visible} message={toast.message} type={toast.type} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={28} color="#0c4a6e" />
        </TouchableOpacity>
        <Text style={styles.title}>Người thân</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {[
          { key: 'add', icon: 'person-add-outline', label: 'Thêm mới', color: '#0ea5e9' },
          { key: 'requests', icon: 'mail-outline', label: 'Lời mời', color: '#f59e0b', badge: pendingRequests.length },
          { key: 'following', icon: 'people-outline', label: 'Đang theo dõi', color: '#22c55e' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabItem, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <View style={styles.tabContent}>
              <Icon name={tab.icon} size={22} color={activeTab === tab.key ? tab.color : '#94a3b8'} />
              {tab.badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{tab.badge}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        <View style={styles.tabContentPadding}>

          {/* TAB 1: Thêm người thân */}
          {activeTab === 'add' && (
            <>
              <View style={styles.searchBox}>
                <Icon name="search" size={20} color="#94a3b8" style={{ marginRight: 12 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm tên hoặc username..."
                  value={searchText}
                  onChangeText={setSearchText}
                  onSubmitEditing={handleSearch}
                />
                <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
                  <Text style={styles.searchBtnText}>Tìm</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={results.length > 0 ? results : searchResults}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <View style={styles.userRow}>
                    <View style={styles.avatarContainer}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
                      </View>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{item.name}</Text>
                      <Text style={styles.username}>@{item.username}</Text>
                    </View>
                    <TouchableOpacity style={styles.addBtn} onPress={() => sendRequest(item)}>
                      <Icon name="person-add" size={20} color="#fff" />
                      <Text style={styles.addBtnText}>Thêm</Text>
                    </TouchableOpacity>
                  </View>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Icon name="search-outline" size={64} color="#cbd5e1" />
                    <Text style={styles.emptyText}>Nhập tên để tìm người thân</Text>
                  </View>
                }
              />
            </>
          )}

          {/* TAB 2: Lời mời */}
          {activeTab === 'requests' && (
            <FlatList
              data={pendingRequests}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={styles.userRow}>
                  <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
                    </View>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.name}</Text>
                    <Text style={styles.username}>@{item.username} • {item.time}</Text>
                  </View>
                  <View style={styles.requestActions}>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectRequest(item.name)}>
                      <Icon name="close" size={24} color="#ef4444" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptRequest(item.name)}>
                      <Icon name="checkmark" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Icon name="mail-open-outline" size={64} color="#cbd5e1" />
                  <Text style={styles.emptyText}>Chưa có lời mời nào</Text>
                </View>
              }
            />
          )}

          {/* TAB 3: Đang theo dõi */}
          {activeTab === 'following' && (
            <FlatList
              data={followingList}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.userRow} onPress={() => goToPatientDetail(item)}>
                  <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
                    </View>
                    <View style={[styles.onlineDot, item.isOnline ? styles.online : styles.offline]} />
                  </View>

                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.name}</Text>
                    <View style={styles.vitalRow}>
                      <Text style={{ color: item.spo2 >= 95 ? '#22c55e' : '#ef4444', fontWeight: '600' }}>
                        SpO2 {item.spo2}%
                      </Text>
                      <Text style={{ marginLeft: 16, color: item.heartRate <= 100 ? '#22c55e' : '#ef4444', fontWeight: '600' }}>
                        {item.heartRate} bpm
                      </Text>
                    </View>
                    <Text style={styles.lastUpdate}>Cập nhật: {item.timestamp}</Text>
                  </View>

                  {item.fallDetected && (
                    <View style={styles.fallBadge}>
                      <Icon name="warning" size={20} color="#fff" />
                    </View>
                  )}

                  <Icon name="chevron-forward" size={24} color="#94a3b8" />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Icon name="heart-outline" size={64} color="#cbd5e1" />
                  <Text style={styles.emptyText}>Bạn chưa theo dõi ai</Text>
                </View>
              }
            />
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ecfeff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: '800', color: '#0c4a6e' },

  // Toast siêu đẹp
  toast: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  toastText: {
    color: '#fff',
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '700',
  },

  // Các style còn lại giữ nguyên (gọn hơn)
  tabBar: { /* ... như cũ */ },
  // ... (giữ nguyên tất cả style cũ, chỉ thêm toast ở trên)
  // (để ngắn gọn mình không paste lại hết, nhưng toàn bộ style cũ vẫn giữ nguyên 100%)

  // Dưới đây là phần style còn lại (copy từ bản trước, chỉ thêm toast)
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 16, position: 'relative' },
  tabActive: { backgroundColor: '#f0f9ff' },
  tabContent: { flexDirection: 'row', alignItems: 'center' },
  tabLabel: { marginTop: 6, fontSize: 12.5, fontWeight: '600', color: '#94a3b8' },
  tabLabelActive: { color: '#0c4a6e' },
  badge: { position: 'absolute', top: -6, right: -10, backgroundColor: '#ef4444', minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  tabContentPadding: { paddingHorizontal: 20 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 6 },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 14 },
  searchBtn: { backgroundColor: '#0ea5e9', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  searchBtnText: { color: '#fff', fontWeight: '700' },
  userRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 4 },
  avatarContainer: { position: 'relative', marginRight: 14 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#0ea5e9', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, borderWidth: 2.5, borderColor: '#fff' },
  online: { backgroundColor: '#22c55e' },
  offline: { backgroundColor: '#94a3b8' },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  vitalRow: { flexDirection: 'row', marginTop: 6 },
  lastUpdate: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  addBtn: { backgroundColor: '#22c55e', flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  addBtnText: { color: '#fff', marginLeft: 6, fontWeight: '600' },
  requestActions: { flexDirection: 'row', gap: 10 },
  rejectBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center' },
  acceptBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#22c55e', justifyContent: 'center', alignItems: 'center' },
  fallBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: '#ef4444', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyText: { marginTop: 16, fontSize: 15, color: '#94a3b8' },
});

export default RelationsScreen;