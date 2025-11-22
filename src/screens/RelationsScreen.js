// screens/RelationsScreen.js - Logic đơn giản
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ScrollView,
  Animated,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import apiService from "../services/api.service";
import { useAuth } from "../contexts/AuthContext";

// Component Toast
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
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('add');
  const [searchText, setSearchText] = useState('');

  // Data states
  const [searchResults, setSearchResults] = useState([]);
  const [followerList, setFollowerList] = useState([]); // Người muốn follow mình (có thể pending hoặc accepted)
  const [followingList, setFollowingList] = useState([]); // Người mình đang follow (có thể pending hoặc accepted)

  // Loading states
  const [searchLoading, setSearchLoading] = useState(false);
  const [followerLoading, setFollowerLoading] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  // Load follower và following khi component mount
  useEffect(() => {
    loadFollowerList();
    loadFollowingList();
  }, []);

  // Load data khi tab thay đổi
  useEffect(() => {
    if (activeTab === 'requests') {
      loadFollowerList();
    } else if (activeTab === 'following') {
      loadFollowingList();
    }
  }, [activeTab]);

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type }), 3000);
  };

  // Tính toán relationStatus đơn giản
  const getRelationStatus = (searchedUser) => {
    // 1. Check xem mình có đang follow người này không (trong followingList)
    const followingRelation = followingList.find(
        rel => rel.patient.id === searchedUser.id
    );

    if (followingRelation) {
      if (followingRelation.status === 'accepted') {
        return { type: 'following', relation: followingRelation };
      } else if (followingRelation.status === 'pending') {
        return { type: 'pending', relation: followingRelation };
      }
    }

    // 2. Check xem người này có đang muốn follow mình không (trong followerList)
    const followerRelation = followerList.find(
        rel => rel.care.id === searchedUser.id && rel.status === 'pending'
    );

    if (followerRelation) {
      return { type: 'pending_received', relation: followerRelation };
    }

    // 3. Không có quan hệ
    return { type: 'none', relation: null };
  };

  // === SEARCH TAB ===
  const handleSearch = async () => {
    if (searchLoading) return;

    try {
      setSearchLoading(true);

      const keyword = searchText.trim();
      let response;

      // Gọi API search
      try {
        response = await apiService.searchUsersGet(keyword, 0, 100);
      } catch (error) {
        console.log('Search API not available, using fallback');
        // Fallback: combine following + follower
        const [following, followers] = await Promise.all([
          apiService.getFollowing(),
          apiService.getFollower()
        ]);

        const allRelatedUsers = new Map();

        following?.forEach(rel => {
          if (rel.patient && rel.patient.id !== user.id) {
            allRelatedUsers.set(rel.patient.id, rel.patient);
          }
        });

        followers?.forEach(rel => {
          if (rel.care && rel.care.id !== user.id) {
            allRelatedUsers.set(rel.care.id, rel.care);
          }
        });

        response = Array.from(allRelatedUsers.values());
      }

      if (response && Array.isArray(response)) {
        // Lọc bỏ chính mình
        const filteredUsers = response.filter(u => u.id !== user.id);

        // Filter theo keyword nếu có
        if (keyword) {
          const filtered = filteredUsers.filter(u =>
              u.username?.toLowerCase().includes(keyword.toLowerCase()) ||
              u.name?.toLowerCase().includes(keyword.toLowerCase())
          );
          setSearchResults(filtered);
        } else {
          setSearchResults(filteredUsers);
        }
      }
    } catch (error) {
      console.error('Error searching users:', error);
      showToast('Lỗi khi tìm kiếm người dùng', 'error');
    } finally {
      setSearchLoading(false);
    }
  };

  const sendFollowRequest = async (targetUser) => {
    try {
      await apiService.invite(targetUser.username);
      showToast(`Đã gửi yêu cầu theo dõi ${targetUser.name || targetUser.username} 🎉`, 'success');

      // Reload để cập nhật UI
      await loadFollowingList();
    } catch (error) {
      console.error('Error sending follow request:', error);
      showToast('Gửi yêu cầu thất bại', 'error');
    }
  };

  // === FOLLOWER TAB (Lời mời) ===
  const loadFollowerList = async () => {
    try {
      setFollowerLoading(true);

      const response = await apiService.getFollower();

      if (response && Array.isArray(response)) {
        setFollowerList(response);
      }
    } catch (error) {
      console.error('Error loading followers:', error);
      showToast('Lỗi khi tải danh sách', 'error');
    } finally {
      setFollowerLoading(false);
    }
  };

  const acceptRequest = async (item) => {
    try {
      console.log(user.username, item);
      await apiService.accept(item.id);
      showToast(`${item.care.name || item.care.username} giờ đang theo dõi bạn ❤️`, 'success');

      // Reload
      await loadFollowerList();
    } catch (error) {
      console.error('Error accepting request:', error);
      showToast('Chấp nhận thất bại', 'error');
    }
  };

  const rejectRequest = async (item) => {
    try {
      await apiService.reject(item.id);
      showToast(`Đã từ chối ${item.care.name || item.care.username} 😔`, 'error');

      // Reload
      await loadFollowerList();
    } catch (error) {
      console.error('Error rejecting request:', error);
      showToast('Từ chối thất bại', 'error');
    }
  };

  // === FOLLOWING TAB ===
  const loadFollowingList = async () => {
    try {
      setFollowingLoading(true);

      const response = await apiService.getFollowing();

      if (response && Array.isArray(response)) {
        setFollowingList(response);
      }
    } catch (error) {
      console.error('Error loading following list:', error);
      showToast('Lỗi khi tải danh sách theo dõi', 'error');
    } finally {
      setFollowingLoading(false);
    }
  };

  const goToPatientDetail = (item) => {
    navigation.navigate('PatientDetail', {
      patient: item.patient,
      relation: item
    });
  };

  // Refresh handler
  const onRefresh = async () => {
    setRefreshing(true);

    if (activeTab === 'add') {
      await handleSearch();
      await loadFollowerList();
      await loadFollowingList();
    } else if (activeTab === 'requests') {
      await loadFollowerList();
    } else if (activeTab === 'following') {
      await loadFollowingList();
    }

    setRefreshing(false);
  };

  // Render action button trong search
  const renderActionButton = (searchedUser) => {
    const status = getRelationStatus(searchedUser);

    if (status.type === 'following') {
      // Đang theo dõi (accepted)
      return (
          <View style={styles.followingBadge}>
            <Icon name="checkmark-circle" size={20} color="#22c55e" />
            <Text style={styles.followingText}>Đã theo dõi</Text>
          </View>
      );
    } else if (status.type === 'pending') {
      // Đang chờ chấp nhận
      return (
          <View style={styles.pendingBadge}>
            <Icon name="time-outline" size={20} color="#f59e0b" />
            <Text style={styles.pendingText}>Đang chờ</Text>
          </View>
      );
    } else if (status.type === 'pending_received') {
      // Nhận được lời mời từ người này
      return (
          <View style={styles.requestActions}>
            <TouchableOpacity
                style={styles.rejectBtn}
                onPress={() => rejectRequest(status.relation)}
            >
              <Icon name="close" size={24} color="#ef4444" />
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.acceptBtn}
                onPress={() => acceptRequest(status.relation)}
            >
              <Icon name="checkmark" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
      );
    } else {
      // Chưa có quan hệ - Hiển thị nút "Theo dõi"
      return (
          <TouchableOpacity
              style={styles.followBtn}
              onPress={() => sendFollowRequest(searchedUser)}
          >
            <Icon name="person-add" size={20} color="#fff" />
            <Text style={styles.followBtnText}>Theo dõi</Text>
          </TouchableOpacity>
      );
    }
  };

  const getInitials = (name, username) => {
    if (name && name.trim()) {
      return name.charAt(0).toUpperCase();
    }
    if (username) {
      return username.charAt(0).toUpperCase();
    }
    return '?';
  };

  return (
      <SafeAreaView style={styles.container}>
        {/* Toast */}
        <Toast visible={toast.visible} message={toast.message} type={toast.type} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={28} color="#0c4a6e" />
          </TouchableOpacity>
          <Text style={styles.title}>Người thân</Text>
          <TouchableOpacity onPress={onRefresh}>
            <Icon name="refresh" size={24} color="#0c4a6e" />
          </TouchableOpacity>
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          {[
            { key: 'add', icon: 'person-add-outline', label: 'Tìm kiếm', color: '#0ea5e9' },
            {
              key: 'requests',
              icon: 'mail-outline',
              label: 'Lời mời',
              color: '#f59e0b',
              badge: followerList.filter(item => item.status === 'pending').length
            },
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

        <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
          <View style={styles.tabContentPadding}>

            {/* TAB 1: Tìm kiếm */}
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
                    <TouchableOpacity
                        style={styles.searchBtn}
                        onPress={handleSearch}
                        disabled={searchLoading}
                    >
                      {searchLoading ? (
                          <ActivityIndicator size="small" color="#fff" />
                      ) : (
                          <Text style={styles.searchBtnText}>Tìm</Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  <FlatList
                      data={searchResults}
                      keyExtractor={(item) => item.id.toString()}
                      scrollEnabled={false}
                      renderItem={({ item }) => (
                          <View style={styles.userRow}>
                            <View style={styles.avatarContainer}>
                              <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                  {getInitials(item.name, item.username)}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.userInfo}>
                              <Text style={styles.userName}>{item.name || item.username}</Text>
                              <Text style={styles.username}>@{item.username}</Text>
                            </View>
                            {renderActionButton(item)}
                          </View>
                      )}
                      ListEmptyComponent={
                        <View style={styles.emptyState}>
                          <Icon name="search-outline" size={64} color="#cbd5e1" />
                          <Text style={styles.emptyText}>
                            {searchText ? 'Không tìm thấy người dùng' : 'Nhập tên để tìm người thân'}
                          </Text>
                        </View>
                      }
                  />
                </>
            )}

            {/* TAB 2: Lời mời (Follower - pending) */}
            {activeTab === 'requests' && (
                <>
                  {followerLoading ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#0ea5e9" />
                      </View>
                  ) : (
                      <FlatList
                          data={followerList.filter(item => item.status === 'pending')}
                          keyExtractor={(item) => item.id.toString()}
                          scrollEnabled={false}
                          renderItem={({ item }) => (
                              <View style={styles.userRow}>
                                <View style={styles.avatarContainer}>
                                  <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>
                                      {getInitials(item.care.name, item.care.username)}
                                    </Text>
                                  </View>
                                </View>
                                <View style={styles.userInfo}>
                                  <Text style={styles.userName}>
                                    {item.care.name || item.care.username}
                                  </Text>
                                  <Text style={styles.username}>
                                    @{item.care.username}
                                  </Text>
                                  <Text style={styles.requestTime}>
                                    Muốn theo dõi bạn
                                  </Text>
                                </View>
                                <View style={styles.requestActions}>
                                  <TouchableOpacity
                                      style={styles.rejectBtn}
                                      onPress={() => rejectRequest(item)}
                                  >
                                    <Icon name="close" size={24} color="#ef4444" />
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                      style={styles.acceptBtn}
                                      onPress={() => acceptRequest(item)}
                                  >
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
                </>
            )}

            {/* TAB 3: Đang theo dõi (Following) */}
            {activeTab === 'following' && (
                <>
                  {followingLoading ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#0ea5e9" />
                      </View>
                  ) : (
                      <FlatList
                          data={followingList}
                          keyExtractor={(item) => item.id.toString()}
                          scrollEnabled={false}
                          renderItem={({ item }) => (
                              <TouchableOpacity
                                  style={styles.userRow}
                                  onPress={() => {
                                    if (item.status === 'accepted') {
                                      goToPatientDetail(item);
                                    }
                                  }}
                                  disabled={item.status === 'pending'}
                              >
                                <View style={styles.avatarContainer}>
                                  <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>
                                      {getInitials(item.patient.name, item.patient.username)}
                                    </Text>
                                  </View>
                                  {item.status === 'accepted' && (
                                      <View style={[styles.statusDot, styles.acceptedDot]} />
                                  )}
                                </View>

                                <View style={styles.userInfo}>
                                  <Text style={styles.userName}>
                                    {item.patient.name || item.patient.username}
                                  </Text>
                                  <Text style={styles.username}>
                                    @{item.patient.username}
                                  </Text>
                                  {item.status === 'pending' && (
                                      <Text style={styles.pendingStatusText}>
                                        Đang chờ chấp nhận
                                      </Text>
                                  )}
                                  {item.status === 'accepted' && (
                                      <Text style={styles.acceptedStatusText}>
                                        Đã chấp nhận
                                      </Text>
                                  )}
                                </View>

                                {item.status === 'accepted' && (
                                    <Icon name="chevron-forward" size={24} color="#94a3b8" />
                                )}

                                {item.status === 'pending' && (
                                    <View style={styles.pendingBadge}>
                                      <Icon name="time-outline" size={20} color="#f59e0b" />
                                    </View>
                                )}
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
                </>
            )}

          </View>
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
    padding: 20
  },
  title: { fontSize: 24, fontWeight: '800', color: '#0c4a6e' },

  // Toast
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
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    position: 'relative'
  },
  tabActive: { backgroundColor: '#f0f9ff' },
  tabContent: { flexDirection: 'row', alignItems: 'center' },
  tabLabel: { marginTop: 6, fontSize: 12.5, fontWeight: '600', color: '#94a3b8' },
  tabLabelActive: { color: '#0c4a6e' },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#ef4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  tabContentPadding: { paddingHorizontal: 20 },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 14 },
  searchBtn: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  searchBtnText: { color: '#fff', fontWeight: '700' },

  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4
  },
  avatarContainer: { position: 'relative', marginRight: 14 },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0ea5e9',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: '#fff'
  },
  acceptedDot: { backgroundColor: '#22c55e' },

  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  username: { fontSize: 14, color: '#94a3b8', marginTop: 2 },
  requestTime: { fontSize: 12, color: '#64748b', marginTop: 4, fontStyle: 'italic' },
  pendingStatusText: { fontSize: 12, color: '#f59e0b', marginTop: 4, fontWeight: '600' },
  acceptedStatusText: { fontSize: 12, color: '#22c55e', marginTop: 4, fontWeight: '600' },

  followBtn: {
    backgroundColor: '#0ea5e9',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center'
  },
  followBtnText: { color: '#fff', marginLeft: 6, fontWeight: '600' },

  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  pendingText: {
    color: '#f59e0b',
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 14,
  },

  followingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  followingText: {
    color: '#22c55e',
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 14,
  },

  requestActions: { flexDirection: 'row', gap: 10 },
  rejectBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center'
  },
  acceptBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center'
  },

  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyText: { marginTop: 16, fontSize: 15, color: '#94a3b8' },
});

export default RelationsScreen;