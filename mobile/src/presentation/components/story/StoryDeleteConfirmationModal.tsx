import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { useSurfaceTheme } from '../../hooks/useSurfaceTheme';

interface StoryDeleteConfirmationModalProps {
    visible: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

export const StoryDeleteConfirmationModal = ({
    visible,
    onCancel,
    onConfirm,
}: StoryDeleteConfirmationModalProps) => {
    const modalTheme = useSurfaceTheme();
    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={[styles.overlay, modalTheme.styles.modalOverlaySoft]}>
                <View style={[styles.container, modalTheme.styles.modalCard]}>
                    <View style={styles.content}>
                        <Text style={[styles.title, { color: modalTheme.textPrimary }]}>Bu hikayeyi silmek istiyor musunuz?</Text>
                        <Text style={[styles.message, { color: modalTheme.textPrimary }]}>
                            Silinen hikayeler 24 saat boyunca geri alınabilir. Bu sürenin sonunda kalıcı olarak silinir.
                        </Text>
                    </View>

                    <View style={[styles.separator, modalTheme.styles.separator]} />

                    <TouchableOpacity style={styles.button} onPress={onConfirm}>
                        <Text style={[styles.buttonText, styles.destructiveText]}>Hikayeyi sil</Text>
                    </TouchableOpacity>

                    <View style={[styles.separator, modalTheme.styles.separator]} />

                    <TouchableOpacity style={styles.button} onPress={onCancel}>
                        <Text style={[styles.buttonText, { color: modalTheme.actionPrimary }]}>İptal</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: 270,
        borderRadius: 32,
        overflow: 'hidden',
        alignItems: 'center',
    },
    content: {
        padding: 16,
        paddingBottom: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 17,
        fontWeight: '600',
        marginBottom: 4,
        textAlign: 'center',
    },
    message: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
    },
    separator: {
        height: 1,
        width: '100%',
    },
    button: {
        width: '100%',
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 17,
        fontWeight: '400',
    },
    destructiveText: {
        color: '#FF453A',
        fontWeight: '600',
    },
});
