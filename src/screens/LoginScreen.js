// LoginScreen.js – ĐÃ THÊM PLACEHOLDER "Tên đăng nhập" và "Mật khẩu" MỜ
import React, { useState, useEffect, useRef, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Animated,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

// Floating Input + Placeholder mờ khi chưa có nội dung
const FloatingInput = memo(({ label, value, onChangeText, secureTextEntry = false }) => {
  const [focused, setFocused] = useState(false);
  const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(labelAnim, {
      toValue: focused || value?.length > 0 ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [focused]);

  const labelStyle = {
    top: labelAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 4] }),
    fontSize: labelAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 13] }),
    color: labelAnim.interpolate({ inputRange: [0, 1], outputRange: ['#94a3b8', '#0ea5e9'] }),
  };

  // Placeholder chỉ hiện khi không có text và không focus
  const placeholderText = !value && !focused ? label : '';

  return (
    <View style={styles.inputWrapper}>
      <Animated.Text style={[styles.floatingLabel, labelStyle]}>
        {label}
      </Animated.Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        style={[styles.textInput, focused && styles.textInputFocused]}
        placeholder={placeholderText}               // ← Đây chính là chữ mờ
        placeholderTextColor="#94a3b8"              // ← Màu mờ nhẹ nhàng
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
});

const LoginScreen = ({ navigation }) => {
  const { login, loading, error } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(60)).current;
  const scale = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, friction: 9, tension: 70, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }
    const result = await login(username, password);
    if (!result.success) Alert.alert('Đăng nhập thất bại', result.error);
  };

  const Bubble = ({ size, left, top, duration = 8000, delay = 0 }) => {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration, delay, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    }, []);

    const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [50, -120] });
    const opacity = anim.interpolate({ inputRange: [0, 0.3, 0.7, 1], outputRange: [0.3, 0.7, 0.7, 0.3] });

    return (
      <Animated.View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: 'rgba(14, 165, 233, 0.22)',
          left,
          top,
          opacity,
          transform: [{ translateY }],
        }}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Background + Bong bóng động */}
      <View style={StyleSheet.absoluteFill}>
        <View style={{ flex: 1, backgroundColor: '#ecfeff' }} />
        <Bubble size={260} left={-70} top={height * 0.12} duration={8500} />
        <Bubble size={190} left={width * 0.68} top={height * 0.38} delay={3000} duration={7500} />
        <Bubble size={320} left={width * 0.2} top={height * 0.58} delay={5000} duration={10000} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <View style={styles.inner}>

            <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
              <Text style={styles.title}>Đăng nhập</Text>
            </Animated.View>

            <Animated.View style={[styles.card, { opacity: fade, transform: [{ scale }] }]}>
              <Text style={styles.welcome}>Chào mừng trở lại</Text>

              {/* 2 ô nhập giờ có chữ mờ gợi ý */}
              <FloatingInput label="Tên đăng nhập" value={username} onChangeText={setUsername} />
              <FloatingInput label="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry />

              {error && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.9}>
                <View style={styles.loginBtn}>
                  {loading ? <ActivityIndicator color="#fff" size={28} /> : <Text style={styles.loginBtnText}>Đăng nhập</Text>}
                </View>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.registerLink}>
                <Text style={styles.registerText}>
                  Chưa có tài khoản? <Text style={styles.highlight}>Đăng ký ngay</Text>
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/*<Animated.View style={[styles.demoCard, { opacity: fade, transform: [{ translateY: slide }] }]}>*/}
            {/*  <Text style={styles.demoTitle}>Tài khoản thử nghiệm</Text>*/}
            {/*  <View style={styles.demoBox}>*/}
            {/*    <Text style={styles.demoItem}>• Người đeo A:  nguoideoA / 123456</Text>*/}
            {/*    <Text style={styles.demoItem}>• Người nhà B:  nguoinhaB / 123456</Text>*/}
            {/*    <Text style={styles.demoItem}>• Người nhà C:  nguoinhaC / 123456</Text>*/}
            {/*  </View>*/}
            {/*</Animated.View>*/}

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { paddingHorizontal: width * 0.07, paddingVertical: 20 },
  title: { fontSize: width < 380 ? 32 : 38, fontWeight: '800', color: '#0c4a6e', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#0369a1', textAlign: 'center', fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 32, paddingVertical: 40, paddingHorizontal: 28, marginVertical: 30,
    shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.28, shadowRadius: 35, elevation: 28 },
  welcome: { fontSize: 26, fontWeight: '700', color: '#1e293b', textAlign: 'center', marginBottom: 36 },
  inputWrapper: { marginBottom: 26 },
  textInput: { height: 58, borderRadius: 18, paddingHorizontal: 20, fontSize: 16, backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: 'transparent' },
  textInputFocused: { backgroundColor: '#fff', borderColor: '#0ea5e9' },
  floatingLabel: { position: 'absolute', left: 20, backgroundColor: '#fff', paddingHorizontal: 8, fontWeight: '600' },
  underline: { position: 'absolute', bottom: 0, left: 20, right: 20, height: 3, backgroundColor: 'transparent', transform: [{ scaleX: 0 }] },
  errorText: { color: '#ef4444', textAlign: 'center', marginVertical: 10, fontSize: 14 },
  loginBtn: { backgroundColor: '#0ea5e9', height: 58, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginTop: 10,
    shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.45, shadowRadius: 25, elevation: 20 },
  loginBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  registerLink: { alignItems: 'center', marginTop: 24 },
  registerText: { color: '#64748b', fontSize: 15.5 },
  highlight: { color: '#0ea5e9', fontWeight: '700' },
  demoCard: { backgroundColor: 'rgba(255,255,255,0.97)', borderRadius: 24, padding: 22, marginTop: 10, borderWidth: 1.5, borderColor: '#ccfbfe' },
  demoTitle: { fontSize: 17, fontWeight: '700', color: '#0c4a6e', textAlign: 'center', marginBottom: 14 },
  demoBox: { backgroundColor: '#ecfeff', borderRadius: 16, padding: 18 },
  demoItem: { fontSize: 14.5, color: '#0c4a6e', marginBottom: 8, fontWeight: '500' },
});

export default LoginScreen;