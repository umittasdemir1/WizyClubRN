import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';

interface UserOptionsModalProps {
    visible: boolean;
    username: string;
    onClose: () => void;
    onAction: (type: 'block' | 'mute' | 'report') => void;
}

export const UserOptionsModal = ({ visible, username, onClose, onAction }: UserOptionsModalProps) => {
    const [confirmType, setConfirmType] = useState<'none' | 'block' | 'mute' | 'report'>('none');

    const handleActionPress = (type: 'block' | 'mute' | 'report') => {
        setConfirmType(type);
    };

    const resetAndClose = () => {
        setConfirmType('none');
        onClose();
    };

    const renderMainOptions = () => (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>@{username}</Text>
            </View>

            <View style={styles.separator} />
            <TouchableOpacity style={styles.button} onPress={() => handleActionPress('block')}>
                <Text style={[styles.buttonText, styles.destructiveText]}>Engelle</Text>
            </TouchableOpacity>

            <View style={styles.separator} />
            <TouchableOpacity style={styles.button} onPress={() => handleActionPress('mute')}>
                <Text style={styles.buttonText}>Sessize Al</Text>
            </TouchableOpacity>

            <View style={styles.separator} />
            <TouchableOpacity style={styles.button} onPress={() => handleActionPress('report')}>
                <Text style={styles.buttonText}>Bildir / Raporla</Text>
            </TouchableOpacity>

            <View style={styles.separator} />
            <TouchableOpacity style={styles.button} onPress={resetAndClose}>
                <Text style={[styles.buttonText, { fontWeight: '600' }]}>İptal</Text>
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
            <View style={styles.container}>
                <View style={styles.content}>
                    <Text style={styles.title}>{config.title}</Text>
                    <Text style={styles.message}>{config.msg}</Text>
                </View>

                <View style={styles.separator} />
                <TouchableOpacity style={styles.button} onPress={() => { onAction(type); resetAndClose(); }}>
                    <Text style={[styles.buttonText, styles.destructiveText]}>{config.title}</Text>
                </TouchableOpacity>

                <View style={styles.separator} />
                <TouchableOpacity style={styles.button} onPress={() => setConfirmType('none')}>
                    <Text style={styles.buttonText}>Geri Dön</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={resetAndClose}>
            <View style={styles.overlay}>
                {confirmType === 'none' ? renderMainOptions() : renderConfirmOption(confirmType)}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: 270,
        backgroundColor: '#1C1C1E',
        borderRadius: 32,
        overflow: 'hidden',
    },
    content: {
        padding: 16,
        alignItems: 'center',
    },
    title: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '600',
        textAlign: 'center',
    },
    message: {
        color: '#FFFFFF',
        fontSize: 13,
        textAlign: 'center',
        marginTop: 4,
        lineHeight: 18,
    },
    separator: {
        height: 1,
        width: '100%',
        backgroundColor: '#38383A',
    },
    button: {
        width: '100%',
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: '#0A84FF',
        fontSize: 17,
    },
    destructiveText: {
        color: '#FF453A',
    },
});
