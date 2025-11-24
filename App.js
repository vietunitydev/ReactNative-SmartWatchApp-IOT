// App.js - Main application file

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { IoTProvider } from './src/contexts/IoTContext';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import BluetoothScreen from './src/screens/BluetoothScreen';
import LocationScreen from './src/screens/LocationScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import DebugScreen from "./src/screens/DebugScreen";
import RelationsScreen from "./src/screens/RelationsScreen";
import PatientDetailScreen from "./src/screens/PatientDetailScreen";
import FallAlertModal from "./src/components/FallAlertModal";
import SensorSender from "./src/screens/SensorSender";
import SensorDashboard from "./src/screens/SensorDashboard";
import ChatBotScreen from './src/screens/ChatBotScreen';

const Stack = createNativeStackNavigator();

// Navigation component
const AppNavigator = () => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        // Có thể thêm màn hình loading ở đây
        return null;
    }

    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{
                    headerShown: false,
                    animation: 'slide_from_right'
                }}
            >
                {!isAuthenticated ? (
                    // Auth Stack
                    <>
                        <Stack.Screen name="Login" component={LoginScreen} />
                        <Stack.Screen name="Register" component={RegisterScreen} />
                    </>
                ) : (
                    // Main App Stack
                    <>
                        <Stack.Screen name="Home" component={HomeScreen} />
                        <Stack.Screen name="Bluetooth" component={BluetoothScreen} />
                        <Stack.Screen name="Location" component={LocationScreen} />
                        <Stack.Screen name="History" component={HistoryScreen} />
                        <Stack.Screen name="Debug" component={DebugScreen} />
                        <Stack.Screen name="SensorDashboard" component={SensorDashboard} />
                        <Stack.Screen name="Relations" component={RelationsScreen} />
                        <Stack.Screen name="PatientDetail" component={PatientDetailScreen} />
                        <Stack.Screen name="ChatBot" component={ChatBotScreen} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};

// Main App component
const App = () => {
    return (
        <AuthProvider>
            <IoTProvider>
                <AppNavigator />
                <SensorSender />
                <FallAlertModal />
            </IoTProvider>
        </AuthProvider>
    );
};

export default App;