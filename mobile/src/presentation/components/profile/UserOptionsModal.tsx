import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { useSurfaceTheme } from '../../hooks/useSurfaceTheme';

interface UserOptionsModalProps {
    visible: boolean;
    username: string;
    onClose: () => void;
    onAction: (type: 'block' | 'mute' | 'report') => void;
}

export const UserOptionsModal = ({ visible, username, onClose, onAction }: UserOptionsModalProps) => {
    const modalTheme = useSurfaceTheme();
    const [confirmType, setConfirmType] = useState<'none' | 'block' | 'mute' | 'report'>('none');

    const handleActionPress = (type: 'block' | 'mute' | 'report') => {
        setConfirmType(type);
    };

    const resetAndClose = () => {
        setConfirmType('none');
        onClose();
    };

    const renderMainOptions = () => (
        <View style={[styles.container, modalTheme.styles.modalCard]}>
            <View style={styles.content}>
                <Text style={[styles.title, { color: modalTheme.textPrimary }]}>@{username}</Text>
            </View>

            <View style={[styles.separator, modalTheme.styles.separator]} />
            <TouchableOpacity style={styles.button} onPress={() => handleActionPress('block')}>
                <Text style={[styles.buttonText, styles.destructiveText]}>Engelle</Text>
            </TouchableOpacity>

            <View style={[styles.separator, modalTheme.styles.separator]} />
            <TouchableOpacity style={styles.button} onPress={() => handleActionPress('mute')}>
                <Text style={[styles.buttonText, { color: modalTheme.actionPrimary }]}>Sessize Al</Text>
            </TouchableOpacity>

            <View style={[styles.separator, modalTheme.styles.separator]} />
            <TouchableOpacity style={styles.button} onPress={() => handleActionPress('report')}>
                <Text style={[styles.buttonText, { color: modalTheme.actionPrimary }]}>Bildir / Raporla</Text>
            </TouchableOpacity>

            <View style={[styles.separator, modalTheme.styles.separator]} />
            <TouchableOpacity style={styles.button} onPress={resetAndClose}>
                <Text style={[styles.buttonText, { color: modalTheme.actionPrimary, fontWeight: '600' }]}>İptal</Text>
            </TouchableOpacity>
        </View>
    );

    const renderConfirmOption = (type: 'block' | 'mute' | 'report') => {
        const config = {
            block: { title: 'Engelle', msg: 'Bu kullanıcıyı engellemek istediğinize emin misiniz?' },
            mute: { title: 'Sessize Al', msg: 'Bu kullanıcının paylaşımlarını artık görmeyeceksiniz.' },
            report: { title: 'Bildir', msg: 'Bu kullanıcıyı topluluk kurallarını ihlal ettiği gerekçesiyle bildir.' },
        }[type];

        return (
            <View style={[styles.container, modalTheme.styles.modalCard]}>
                <View style={styles.content}>
                    <Text style={[styles.title, { color: modalTheme.textPrimary }]}>{config.title}</Text>
                    <Text style={[styles.message, { color: modalTheme.textPrimary }]}>{config.msg}</Text>
                </View>

                <View style={[styles.separator, modalTheme.styles.separator]} />
                <TouchableOpacity style={styles.button} onPress={() => { onAction(type); resetAndClose(); }}>
                    <Text style={[styles.buttonText, styles.destructiveText]}>{config.title}</Text>
                </TouchableOpacity>

                <View style={[styles.separator, modalTheme.styles.separator]} />
                <TouchableOpacity style={styles.button} onPress={() => setConfirmType('none')}>
                    <Text style={[styles.buttonText, { color: modalTheme.actionPrimary }]}>Geri Dön</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={resetAndClose}>
            <View style={[styles.overlay, modalTheme.styles.modalOverlay]}>
                {confirmType === 'none' ? renderMainOptions() : renderConfirmOption(confirmType)}
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
    },
    content: {
        padding: 16,
        alignItems: 'center',
    },
    title: {
        fontSize: 17,
        fontWeight: '600',
        textAlign: 'center',
    },
    message: {
        fontSize: 13,
        textAlign: 'center',
        marginTop: 4,
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
    },
    destructiveText: {
        color: '#FF453A',
    },
});
