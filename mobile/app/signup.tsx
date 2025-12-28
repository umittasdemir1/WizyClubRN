import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Pressable,
    ImageBackground,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Mail, Lock, Eye, EyeOff, CheckCircle, User, Check } from 'lucide-react-native';
import { useAuthStore } from '../src/presentation/store/useAuthStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function SignupScreen() {
    const insets = useSafeAreaInsets();
    const { signUp, isLoading, error, clearError } = useAuthStore();

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [localError, setLocalError] = useState('');

    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleSignup = async () => {
        clearError();
        setLocalError('');
        setSuccessMessage('');

        if (!fullName.trim()) {
            setLocalError('Ad soyad gerekli.');
            return;
        }

        if (!email.trim()) {
            setLocalError('E-posta adresi gerekli.');
            return;
        }

        if (!validateEmail(email)) {
            setLocalError('Girilen e-posta adresi geçersiz.');
            return;
        }

        if (password.length < 6) {
            setLocalError('Şifre en az 6 karakter olmalı.');
            return;
        }

        if (password !== confirmPassword) {
            setLocalError('Şifreler eşleşmiyor.');
            return;
        }

        if (!termsAccepted) {
            setLocalError('Şartlar ve koşulları kabul etmelisiniz.');
            return;
        }

        const result = await signUp(email, password, fullName);
        if (result.success) {
            setSuccessMessage('Hesabınız başarıyla oluşturuldu! Şimdi giriş yapabilirsiniz.');
            // Navigate to login after 2 seconds
            setTimeout(() => {
                router.replace('/login');
            }, 2000);
        }
    };

    return (
        <View style={styles.container}>
            <ImageBackground
                source={require('../assets/images/auth_background.png')}
                style={styles.backgroundImage}
                resizeMode="cover"
            >
                <LinearGradient
                    colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
                    style={styles.gradient}
                />

                {/* Header Content */}
                <View style={[styles.headerContent, { paddingTop: insets.top + 40 }]}>
                    <Text style={styles.welcomeText}>Hesap Oluştur</Text>
                    <Text style={styles.subtitleText}>
                        Hemen katılın! Başlamak için bilgilerinizi girin.
                    </Text>
                </View>
            </ImageBackground>

            {/* Form Card */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.formWrapper}
            >
                <ScrollView
                    contentContainerStyle={styles.formContainer}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.formCard}>
                        {/* Success Message */}
                        {successMessage ? (
                            <View style={styles.successBanner}>
                                <Check size={20} color="#16A34A" />
                                <View style={styles.successTextContainer}>
                                    <Text style={styles.successTitle}>Başarılı</Text>
                                    <Text style={styles.successText}>{successMessage}</Text>
                                </View>
                            </View>
                        ) : null}

                        {/* Full Name Input */}
                        <View style={styles.inputWrapper}>
                            <View style={styles.inputContainer}>
                                <User size={20} color="#9CA3AF" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ad Soyad"
                                    placeholderTextColor="#9CA3AF"
                                    value={fullName}
                                    onChangeText={(text) => {
                                        setFullName(text);
                                        setLocalError('');
                                        clearError();
                                    }}
                                    autoCapitalize="words"
                                />
                            </View>
                        </View>

                        {/* Email Input */}
                        <View style={styles.inputWrapper}>
                            <View style={styles.inputContainer}>
                                <Mail size={20} color="#9CA3AF" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="E-posta adresi"
                                    placeholderTextColor="#9CA3AF"
                                    value={email}
                                    onChangeText={(text) => {
                                        setEmail(text);
                                        setLocalError('');
                                        clearError();
                                    }}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoComplete="email"
                                />
                            </View>
                        </View>

                        {/* Password Input */}
                        <View style={styles.inputWrapper}>
                            <View style={styles.inputContainer}>
                                <Lock size={20} color="#9CA3AF" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Şifre"
                                    placeholderTextColor="#9CA3AF"
                                    value={password}
                                    onChangeText={(text) => {
                                        setPassword(text);
                                        setLocalError('');
                                    }}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                />
                                <Pressable
                                    onPress={() => setShowPassword(!showPassword)}
                                    hitSlop={10}
                                >
                                    {showPassword ? (
                                        <Eye size={20} color="#9CA3AF" />
                                    ) : (
                                        <EyeOff size={20} color="#9CA3AF" />
                                    )}
                                </Pressable>
                            </View>
                        </View>

                        {/* Confirm Password Input */}
                        <View style={styles.inputWrapper}>
                            <View style={styles.inputContainer}>
                                <Lock size={20} color="#9CA3AF" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Şifre Tekrar"
                                    placeholderTextColor="#9CA3AF"
                                    value={confirmPassword}
                                    onChangeText={(text) => {
                                        setConfirmPassword(text);
                                        setLocalError('');
                                    }}
                                    secureTextEntry={!showConfirmPassword}
                                    autoCapitalize="none"
                                />
                                <Pressable
                                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                    hitSlop={10}
                                >
                                    {showConfirmPassword ? (
                                        <Eye size={20} color="#9CA3AF" />
                                    ) : (
                                        <EyeOff size={20} color="#9CA3AF" />
                                    )}
                                </Pressable>
                            </View>
                        </View>

                        {/* Error Message */}
                        {(localError || error) ? (
                            <Text style={styles.generalError}>{localError || error}</Text>
                        ) : null}

                        {/* Terms Checkbox */}
                        <Pressable
                            style={styles.checkboxRow}
                            onPress={() => setTermsAccepted(!termsAccepted)}
                        >
                            <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                                {termsAccepted && <CheckCircle size={18} color="#8B5CF6" />}
                            </View>
                            <Text style={styles.termsText}>
                                <Text style={styles.termsLink}>Şartlar ve Koşullar</Text> ile{' '}
                                <Text style={styles.termsLink}>Gizlilik Politikası</Text>'nı kabul ediyorum.
                            </Text>
                        </Pressable>

                        {/* Signup Button */}
                        <Pressable
                            style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                            onPress={handleSignup}
                            disabled={isLoading}
                        >
                            <LinearGradient
                                colors={['#A855F7', '#7C3AED']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.buttonGradient}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.buttonText}>Hesap Oluştur</Text>
                                )}
                            </LinearGradient>
                        </Pressable>

                        {/* Login Link */}
                        <View style={styles.loginRow}>
                            <Text style={styles.loginText}>Zaten hesabın var mı? </Text>
                            <Pressable onPress={() => router.push('/login')}>
                                <Text style={styles.loginLink}>Giriş Yap</Text>
                            </Pressable>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    backgroundImage: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT * 0.38,
    },
    gradient: {
        ...StyleSheet.absoluteFillObject,
    },
    headerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    welcomeText: {
        fontSize: 32,
        fontWeight: '700',
        color: '#FFF',
        textAlign: 'center',
        marginBottom: 12,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    subtitleText: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
        maxWidth: 280,
        lineHeight: 22,
    },
    formWrapper: {
        flex: 1,
        marginTop: -40,
    },
    formContainer: {
        flexGrow: 1,
    },
    formCard: {
        flex: 1,
        backgroundColor: '#FFF',
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 40,
    },
    successBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#F0FDF4',
        borderLeftWidth: 4,
        borderLeftColor: '#16A34A',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },
    successTextContainer: {
        marginLeft: 12,
        flex: 1,
    },
    successTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#16A34A',
        marginBottom: 4,
    },
    successText: {
        fontSize: 14,
        color: '#16A34A',
        lineHeight: 20,
    },
    inputWrapper: {
        marginBottom: 14,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 50,
        paddingHorizontal: 20,
        height: 54,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#1F2937',
    },
    generalError: {
        color: '#EF4444',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 12,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        marginTop: 2,
    },
    checkboxChecked: {
        borderColor: '#8B5CF6',
        backgroundColor: '#F3E8FF',
    },
    termsText: {
        flex: 1,
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
    },
    termsLink: {
        color: '#1F2937',
        fontWeight: '600',
    },
    primaryButton: {
        borderRadius: 50,
        overflow: 'hidden',
        marginBottom: 24,
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonGradient: {
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#FFF',
        fontSize: 17,
        fontWeight: '600',
    },
    loginRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loginText: {
        color: '#6B7280',
        fontSize: 15,
    },
    loginLink: {
        color: '#1F2937',
        fontSize: 15,
        fontWeight: '700',
    },
});
