class FakeDataGenerator {
    constructor() {
        this.intervalId = null;
        this.listeners = [];
        this.isRunning = false;

        this.ranges = {
            spo2: { min: 90, max: 100, normal: { min: 95, max: 100 } },
            heartRate: { min: 50, max: 120, normal: { min: 60, max: 100 } },
            battery: { min: 0, max: 100 },
            fallProbability: 0.02,
            stepIncrement: { min: 0, max: 3 },
        };
        this.currentState = {
            spo2: 98,
            heartRate: 75,
            battery: 85,
            fallDetected: false,
            isCharging: false,
            step: 0,
            isWalking: false,
        };
    }

    /**
     * Generate random number trong khoảng min-max
     */
    randomInRange(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Generate random number với xu hướng về giá trị hiện tại (smooth transition)
     */
    smoothTransition(current, min, max, maxChange = 2) {
        const change = this.randomInRange(-maxChange, maxChange);
        let newValue = current + change;

        // Đảm bảo trong range
        if (newValue < min) newValue = min;
        if (newValue > max) newValue = max;

        return newValue;
    }

    /**
     * Generate signal quality dựa trên spo2 và heartRate
     */
    getSignalQuality(spo2, heartRateValid) {
        if (!heartRateValid || spo2 < 90) return 'poor';
        if (spo2 < 95) return 'fair';
        if (spo2 < 98) return 'good';
        return 'excellent';
    }

    /**
     * Generate severity level dựa trên các chỉ số
     */
    getSeverity(fallDetected, spo2, heartRate) {
        if (fallDetected) {
            if (spo2 < 90 || heartRate > 110 || heartRate < 50) {
                return 'critical';
            }
            return 'high';
        }

        if (spo2 < 92 || heartRate > 110 || heartRate < 55) {
            return 'medium';
        }

        if (spo2 < 95 || heartRate > 100 || heartRate < 60) {
            return 'low';
        }

        return 'none';
    }

    /**
     * Update step count - Tăng số bước chân
     */
    updateStepCount() {
        // Random quyết định có đang đi bộ không (70% chance đang đi)
        if (Math.random() < 0.7) {
            this.currentState.isWalking = true;
        } else {
            this.currentState.isWalking = false;
        }

        // Nếu đang đi bộ, tăng số bước
        if (this.currentState.isWalking) {
            const increment = this.randomInRange(
                this.ranges.stepIncrement.min,
                this.ranges.stepIncrement.max
            );
            this.currentState.step += increment;

            // Khi đi bộ, heart rate tăng nhẹ
            if (this.currentState.heartRate < 100) {
                this.currentState.heartRate = Math.min(
                    100,
                    this.currentState.heartRate + 1
                );
            }
        } else {
            // Khi đứng yên, heart rate giảm về bình thường
            if (this.currentState.heartRate > 75) {
                this.currentState.heartRate = Math.max(
                    75,
                    this.currentState.heartRate - 1
                );
            }
        }
    }

    /**
     * Generate một data point
     */
    generateData() {
        // SPO2: smooth transition
        this.currentState.spo2 = this.smoothTransition(
            this.currentState.spo2,
            this.ranges.spo2.min,
            this.ranges.spo2.max,
            1 // Thay đổi tối đa 1 đơn vị mỗi lần
        );

        // Heart Rate: smooth transition
        this.currentState.heartRate = this.smoothTransition(
            this.currentState.heartRate,
            this.ranges.heartRate.min,
            this.ranges.heartRate.max,
            3 // Thay đổi tối đa 3 đơn vị mỗi lần
        );

        // Update step count
        this.updateStepCount();

        // Heart Rate Valid: 95% chance là valid
        const heartRateValid = Math.random() > 0.05;

        // Fall Detection: random với xác suất thấp
        const fallDetected = Math.random() < this.ranges.fallProbability;
        if (fallDetected) {
            this.currentState.fallDetected = true;
            this.currentState.isWalking = false; // Ngừng đi khi té
            // Sau 5 giây tự reset fall detection
            setTimeout(() => {
                this.currentState.fallDetected = false;
            }, 5000);
        }

        // Battery Level: giảm dần nếu không sạc
        // Đi bộ làm pin giảm nhanh hơn
        const batteryDrainChance = this.currentState.isWalking ? 0.90 : 0.95;
        if (!this.currentState.isCharging && Math.random() > batteryDrainChance) {
            this.currentState.battery = Math.max(0, this.currentState.battery - 1);
        }

        // Charging: random change charging status (hiếm khi thay đổi)
        if (Math.random() < 0.001) {
            this.currentState.isCharging = !this.currentState.isCharging;
        }

        // Tăng pin khi đang sạc
        if (this.currentState.isCharging && this.currentState.battery < 100) {
            if (Math.random() > 0.9) {
                this.currentState.battery = Math.min(100, this.currentState.battery + 1);
            }
        }

        const signalQuality = this.getSignalQuality(this.currentState.spo2, heartRateValid);
        const severity = this.getSeverity(
            this.currentState.fallDetected,
            this.currentState.spo2,
            this.currentState.heartRate
        );

        return {
            spo2: this.currentState.spo2,
            heartRate: this.currentState.heartRate,
            heartRateValid,
            fallDetected: this.currentState.fallDetected,
            severity,
            battery: this.currentState.battery,
            isCharging: this.currentState.isCharging,
            signalQuality,
            timestamp: Date.now(),
            deviceId: 'ESP32-001',
            firmwareVersion: '1.0',
            step: this.currentState.step, // ← THÊM MỚI
            isWalking: this.currentState.isWalking, // ← THÊM MỚI (optional)
        };
    }

    /**
     * Bắt đầu generate data
     */
    start(callback, interval = 10) {
        if (this.isRunning) {
            console.warn('Generator đang chạy rồi!');
            return;
        }

        this.isRunning = true;
        console.log(`🚀 Bắt đầu generate data mỗi ${interval}ms`);

        this.intervalId = setInterval(() => {
            const data = this.generateData();

            // Gọi callback
            if (callback && typeof callback === 'function') {
                callback(data);
            }

            // Notify tất cả listeners
            this.listeners.forEach(listener => {
                listener(data);
            });
        }, interval);
    }

    /**
     * Dừng generate data
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            this.isRunning = false;
            console.log('⏹️ Dừng generate data');
        }
    }

    /**
     * Subscribe để nhận data
     */
    subscribe(callback) {
        if (typeof callback === 'function') {
            this.listeners.push(callback);
            return () => {
                // Unsubscribe function
                this.listeners = this.listeners.filter(cb => cb !== callback);
            };
        }
    }

    /**
     * Reset state về giá trị mặc định
     */
    reset() {
        this.currentState = {
            spo2: 98,
            heartRate: 75,
            battery: 85,
            fallDetected: false,
            isCharging: false,
            step: 0, // Reset về 0
            isWalking: false,
        };
        console.log('🔄 Reset state về mặc định');
    }

    /**
     * Set custom state
     */
    setState(newState) {
        this.currentState = { ...this.currentState, ...newState };
    }

    /**
     * Trigger fall detection manually
     */
    triggerFall() {
        this.currentState.fallDetected = true;
        this.currentState.isWalking = false; // Ngừng đi khi té
        setTimeout(() => {
            this.currentState.fallDetected = false;
        }, 5000);
    }

    /**
     * Set battery level
     */
    setBatteryLevel(level) {
        this.currentState.battery = Math.max(0, Math.min(100, level));
    }

    /**
     * Toggle charging
     */
    toggleCharging() {
        this.currentState.isCharging = !this.currentState.isCharging;
    }

    /**
     * Set step count - MỚI
     */
    setStepCount(count) {
        this.currentState.step = Math.max(0, count);
    }

    /**
     * Add steps - MỚI
     */
    addSteps(count) {
        this.currentState.step += count;
    }

    /**
     * Reset step count - MỚI
     */
    resetSteps() {
        this.currentState.step = 0;
    }

    /**
     * Toggle walking state - MỚI
     */
    toggleWalking() {
        this.currentState.isWalking = !this.currentState.isWalking;
    }

    /**
     * Set walking state - MỚI
     */
    setWalking(isWalking) {
        this.currentState.isWalking = isWalking;
    }
}

// Export singleton instance
const fakeDataGenerator = new FakeDataGenerator();

export default fakeDataGenerator;

// Export class nếu cần tạo nhiều instances
export { FakeDataGenerator };