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
import { Mail, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react-native';
import { useAuthStore } from '../src/presentation/store/useAuthStore';
import { shadowStyle, textShadowStyle } from '@/core/utils/shadow';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function LoginScreen() {
    const insets = useSafeAreaInsets();
    const { signIn, isLoading, error, clearError } = useAuthStore();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(true);
    const [emailError, setEmailError] = useState('');

    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleLogin = async () => {
        clearError();
        setEmailError('');

        if (!email.trim()) {
            setEmailError('E-posta adresi gerekli.');
            return;
        }

        if (!validateEmail(email)) {
            setEmailError('Girilen e-posta adresi geçersiz.');
            return;
        }

        if (!password.trim()) {
            return;
        }

        const result = await signIn(email, password);
        if (result.success) {
            router.replace('/(tabs)');
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
                <View style={[styles.headerContent, { paddingTop: insets.top + 60 }]}>
                    <Text style={styles.welcomeText}>Hoş Geldiniz!</Text>
                    <Text style={styles.subtitleText}>
                        Tam erişim için giriş yapın veya hesap oluşturun.
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
                        {/* Email Input */}
                        <View style={styles.inputWrapper}>
                            <View style={[styles.inputContainer, emailError ? styles.inputError : null]}>
                                <Mail size={20} color="#9CA3AF" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="E-posta adresi"
                                    placeholderTextColor="#9CA3AF"
                                    value={email}
                                    onChangeText={(text) => {
                                        setEmail(text);
                                        setEmailError('');
                                        clearError();
                                    }}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoComplete="email"
                                />
                            </View>
                            {emailError ? (
                                <Text style={styles.errorText}>{emailError}</Text>
                            ) : null}
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
                                    onChangeText={setPassword}
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

                        {/* Error Message */}
                        {error ? (
                            <Text style={styles.generalError}>{error}</Text>
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

                        {/* Login Button */}
                        <Pressable
                            style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                            onPress={handleLogin}
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
                                    <Text style={styles.buttonText}>Giriş Yap</Text>
                                )}
                            </LinearGradient>
                        </Pressable>

                        {/* Divider */}
                        <View style={styles.dividerRow}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>veya şununla giriş yap</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* Social Buttons */}
                        <View style={styles.socialRow}>
                            <Pressable style={styles.socialButton}>
                                <Text style={styles.appleIcon}></Text>
                            </Pressable>
                            <Pressable style={styles.socialButton}>
                                <Text style={styles.googleIcon}>G</Text>
                            </Pressable>
                        </View>

                        {/* Sign Up Link */}
                        <View style={styles.signupRow}>
                            <Text style={styles.signupText}>Hesabın yok mu? </Text>
                            <Pressable onPress={() => router.push('/signup')}>
                                <Text style={styles.signupLink}>Kayıt Ol</Text>
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
        height: SCREEN_HEIGHT * 0.45,
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
        fontSize: 36,
        fontWeight: '700',
        color: '#FFF',
        textAlign: 'center',
        marginBottom: 12,
        ...textShadowStyle('rgba(0,0,0,0.5)', { width: 0, height: 2 }, 4),
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
        paddingTop: 40,
        paddingBottom: 40,
    },
    inputWrapper: {
        marginBottom: 16,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 50,
        paddingHorizontal: 20,
        height: 56,
    },
    inputError: {
        borderColor: '#EF4444',
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#1F2937',
    },
    errorText: {
        color: '#EF4444',
        fontSize: 13,
        marginTop: 8,
        marginLeft: 20,
    },
    generalError: {
        color: '#EF4444',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 16,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 24,
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
        ...shadowStyle({ color: '#8B5CF6', offset: { width: 0, height: 4 }, opacity: 0.3, radius: 8, elevation: 6 }),
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
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E5E7EB',
    },
    dividerText: {
        paddingHorizontal: 16,
        color: '#9CA3AF',
        fontSize: 14,
    },
    socialRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
        marginBottom: 32,
    },
    socialButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
        ...shadowStyle({ color: '#000', offset: { width: 0, height: 2 }, opacity: 0.05, radius: 4, elevation: 2 }),
    },
    appleIcon: {
        fontSize: 24,
        color: '#000',
    },
    googleIcon: {
        fontSize: 22,
        fontWeight: '700',
        color: '#EA4335',
    },
    signupRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    signupText: {
        color: '#6B7280',
        fontSize: 15,
    },
    signupLink: {
        color: '#1F2937',
        fontSize: 15,
        fontWeight: '700',
    },
});
