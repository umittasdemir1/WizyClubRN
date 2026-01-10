import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';

interface DeleteConfirmationModalProps {
    visible: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

const { width } = Dimensions.get('window');

export const DeleteConfirmationModal = ({ visible, onCancel, onConfirm }: DeleteConfirmationModalProps) => {
    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.content}>
                        <Text style={styles.title}>Bu içeriği silmek istiyor musunuz?</Text>
                        <Text style={styles.message}>
                            Silinen içerik 15 gün boyunca geri alınabilir. Bu sürenin sonunda kalıcı olarak silinir.
                        </Text>
                    </View>

                    <View style={styles.separator} />

                    <TouchableOpacity style={styles.button} onPress={onConfirm}>
                        <Text style={[styles.buttonText, styles.destructiveText]}>İçeriği sil</Text>
                    </TouchableOpacity>

                    <View style={styles.separator} />

                    <TouchableOpacity style={styles.button} onPress={onCancel}>
                        <Text style={styles.buttonText}>İptal</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)', // Black overlay
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: 270, // Standard iOS Alert width
        borderRadius: 32,
        overflow: 'hidden',
        alignItems: 'center',
        backgroundColor: '#1c1c1e',
    },
    content: {
        padding: 16,
        paddingBottom: 20,
        alignItems: 'center',
    },
    title: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '600',
        marginBottom: 4,
        textAlign: 'center',
    },
    message: {
        color: '#FFFFFF',
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
    },
    separator: {
        height: 1, // Hairline
        width: '100%',
        backgroundColor: '#38383A', // iOS Dark Separator
    },
    button: {
        width: '100%',
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: '#0A84FF', // iOS Blue
        fontSize: 17,
        fontWeight: '400',
    },
    destructiveText: {
        color: '#FF453A', // iOS Red
        fontWeight: '600',
    },
});
