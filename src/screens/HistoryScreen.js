// HistoryScreen.js - Lịch sử đo với API integration
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api.service';

const HistoryScreen = ({ navigation }) => {
    const { user } = useAuth();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    // Load data khi component mount
    useEffect(() => {
        fetchRecords();
    }, []);

    // Fetch records từ API
    const fetchRecords = async () => {
        if (!user?.username) {
            setError('Chưa đăng nhập');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            console.log('📥 Fetching records for:', user.username);

            // Gọi API getRecords
            const response = await apiService.getRecords(user.username);

            console.log('✅ Records received:', response);

            // Set data
            if (Array.isArray(response)) {
                setRecords(response);
            } else if (response.data && Array.isArray(response.data)) {
                setRecords(response.data);
            } else {
                setRecords([]);
            }

        } catch (err) {
            console.error('❌ Fetch records error:', err);
            setError(err.message || 'Không thể tải dữ liệu');
            Alert.alert('Lỗi', 'Không thể tải lịch sử. Vui lòng thử lại.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Pull to refresh
    const handleRefresh = () => {
        setRefreshing(true);
        fetchRecords();
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return '--';

        try {
            const date = new Date(dateString);
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();

            return `${day}/${month}/${year}`;
        } catch (error) {
            return '--';
        }
    };

    // Format time
    const formatTime = (dateString) => {
        if (!dateString) return '--';

        try {
            const date = new Date(dateString);
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');

            return `${hours}:${minutes}`;
        } catch (error) {
            return '--';
        }
    };

    // Get SPO2 color
    const getSpo2Color = (value) => {
        if (value >= 95) return '#22c55e';
        if (value >= 90) return '#f59e0b';
        return '#ef4444';
    };

    // Get Heart Rate color
    const getHeartRateColor = (value) => {
        if (value >= 60 && value <= 100) return '#22c55e';
        if ((value >= 50 && value < 60) || (value > 100 && value <= 120)) return '#f59e0b';
        return '#ef4444';
    };

    // Get Battery color
    const getBatteryColor = (value) => {
        if (value >= 50) return '#22c55e';
        if (value >= 20) return '#f59e0b';
        return '#ef4444';
    };

    // Render empty state
    const renderEmpty = () => {
        if (loading) return null;

        return (
            <View style={styles.emptyContainer}>
                <Icon name="document-text-outline" size={80} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>Chưa có dữ liệu</Text>
                <Text style={styles.emptyText}>
                    Lịch sử đo sẽ hiển thị ở đây
                </Text>
                <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={fetchRecords}
                >
                    <Text style={styles.refreshButtonText}>Tải lại</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderItem = ({ item }) => {
        return (
            <View style={styles.card}>
                {/* Header: Time & Date (Giữ nguyên) */}
                <View style={styles.cardHeader}>
                    <View style={styles.timeContainer}>
                        <Icon name="time-outline" size={16} color="#0ea5e9" />
                        <Text style={styles.time}>{formatTime(item.recordedAt)}</Text>
                    </View>
                    <Text style={styles.date}>{formatDate(item.recordedAt)}</Text>
                </View>

                {/* Data Row: Chuyển thành một hàng ngang ngắn gọn */}
                <View style={styles.dataRow}>
                    {/* SPO2 */}
                    <View style={styles.dataShortItem}>
                        <Icon name="water" size={16} color="#0ea5e9" /> {/* Giảm size icon */}
                        <Text style={styles.dataShortLabel}>SpO2</Text>
                        <Text style={[
                            styles.dataShortValue,
                            { color: getSpo2Color(item.spo2) }
                        ]}>
                            {item.spo2}%
                        </Text>
                    </View>

                    {/* Heart Rate */}
                    <View style={styles.dataShortItem}>
                        <Icon name="heart" size={16} color="#ef4444" /> {/* Giảm size icon */}
                        <Text style={styles.dataShortLabel}>Nhịp tim</Text>
                        <Text style={[
                            styles.dataShortValue,
                            { color: getHeartRateColor(item.heartRate) }
                        ]}>
                            {item.heartRate}
                        </Text>
                    </View>

                    {/* Battery */}
                    <View style={styles.dataShortItem}>
                        <Icon name="battery-charging" size={16} color="#22c55e" /> {/* Giảm size icon */}
                        <Text style={styles.dataShortLabel}>Pin</Text>
                        <Text style={[
                            styles.dataShortValue,
                            { color: getBatteryColor(item.battery) }
                        ]}>
                            {item.battery}%
                        </Text>
                    </View>

                    {/* Device/ID (Tích hợp) */}
                    <View style={styles.dataShortItem}>
                        <Icon name="hardware-chip" size={16} color="#8b5cf6" /> {/* Giảm size icon */}
                        <Text style={styles.dataShortLabel}>Thiết bị</Text>
                        <Text style={styles.dataShortValueId} numberOfLines={1}>
                            #{item.id}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Lịch sử đo</Text>
                    <Text style={styles.subtitle}>
                        {records.length} bản ghi
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.refreshIconButton}
                    onPress={fetchRecords}
                    disabled={loading}
                >
                    <Icon
                        name="refresh"
                        size={24}
                        color={loading ? '#cbd5e1' : '#0ea5e9'}
                    />
                </TouchableOpacity>
            </View>

            {/* Error Message */}
            {error && (
                <View style={styles.errorContainer}>
                    <Icon name="alert-circle" size={20} color="#ef4444" />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            {/* Loading */}
            {loading && !refreshing && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0ea5e9" />
                    <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
                </View>
            )}

            {/* List */}
            {!loading && (
                <FlatList
                    data={records}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={renderEmpty}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={['#0ea5e9']}
                            tintColor="#0ea5e9"
                        />
                    }
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ecfeff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0c4a6e',
    },
    subtitle: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 2,
    },
    refreshIconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fee2e2',
        padding: 12,
        marginHorizontal: 20,
        marginTop: 12,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#ef4444',
    },
    errorText: {
        color: '#991b1b',
        fontSize: 14,
        marginLeft: 8,
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#64748b',
    },
    listContent: {
        padding: 12, // Giảm padding tổng thể của danh sách
    },
    card: {
        backgroundColor: '#fff',
        padding: 12, // **GIẢM PADDING THẺ**
        borderRadius: 12, // Giảm nhẹ border radius
        marginBottom: 8, // **GIẢM MARGIN THẺ**
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 }, // Giảm nhẹ shadow
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10, // **GIẢM MARGIN**
        paddingBottom: 8, // **GIẢM PADDING**
        borderBottomWidth: 0.5, // Giảm độ dày border
        borderBottomColor: '#f1f5f9',
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    time: {
        fontSize: 16, // **GIẢM FONT SIZE**
        fontWeight: '700',
        color: '#0c4a6e',
        marginLeft: 4, // Giảm margin
    },
    date: {
        fontSize: 12, // **GIẢM FONT SIZE**
        color: '#64748b',
        fontWeight: '600',
    },

    // *** Bố cục mới: Hàng ngang ngắn gọn ***
    dataRow: {
        flexDirection: 'row',
        justifyContent: 'space-between', // Phân bố đều các mục
    },
    dataShortItem: {
        flex: 1, // Chia đều không gian
        alignItems: 'center', // Căn giữa nội dung
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    dataShortLabel: {
        fontSize: 10, // **GIẢM FONT SIZE**
        color: '#64748b',
        marginTop: 2, // Giảm margin
        textAlign: 'center',
    },
    dataShortValue: {
        fontSize: 15, // **GIẢM FONT SIZE**
        fontWeight: '700',
        color: '#1e293b',
        marginTop: 2, // Giảm margin
        textAlign: 'center',
    },
    dataShortValueId: {
        fontSize: 12, // **GIẢM FONT SIZE**
        color: '#8b5cf6',
        marginTop: 2,
        fontWeight: '600',
        textAlign: 'center',
    },
    dataGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -6,
    },
    dataItem: {
        width: '50%',
        padding: 6,
        marginBottom: 12,
    },
    dataLabel: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 4,
        marginLeft: 2,
    },
    dataValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1e293b',
        marginTop: 2,
        marginLeft: 2,
    },
    deviceId: {
        fontSize: 11,
        color: '#8b5cf6',
        marginTop: 2,
        marginLeft: 2,
        fontWeight: '600',
    },
    signalQuality: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    signalText: {
        fontSize: 12,
        color: '#64748b',
        marginLeft: 6,
    },
    recordId: {
        fontSize: 11,
        color: '#94a3b8',
        marginTop: 8,
        textAlign: 'right',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1e293b',
        marginTop: 16,
    },
    emptyText: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 8,
        textAlign: 'center',
    },
    refreshButton: {
        marginTop: 20,
        backgroundColor: '#0ea5e9',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    refreshButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default HistoryScreen;