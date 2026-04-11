import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, TextInput, ActivityIndicator, Alert, StatusBar } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { uploadToS3 } from '../services/s3Service';
import { requestMediaLibraryPermission } from '../utils/permissionHelper';
import { Platform } from 'react-native';

const EditProfileScreen = () => {
    const navigation = useNavigation();
    const { theme, isDarkMode } = useTheme();
    const styles = createStyles(theme, isDarkMode);

    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState({
        id: '',
        name: '',
        email: '',
        photo: 'https://i.pravatar.cc/300',
        age: ''
    });

    const [tempUser, setTempUser] = useState({ ...user });
    const [newPhoto, setNewPhoto] = useState(null);
    const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'info', onPress: null });

    useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = async () => {
        try {
            const sessionStr = await AsyncStorage.getItem('userSession');
            if (sessionStr) {
                const session = JSON.parse(sessionStr);
                const userData = {
                    id: session.id || session.uid || '',
                    name: session.name || '',
                    email: session.email || '',
                    photo: session.photo || 'https://i.pravatar.cc/300',
                    age: session.age || ''
                };
                setUser(userData);
                setTempUser(userData);
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    };

    const handlePickImage = async () => {
        if (!isEditing) return;

        // 🛡️ SECURITY: Explicitly request permission before opening library
        const hasPermission = await requestMediaLibraryPermission();
        if (!hasPermission) {
            setAlertConfig({
                visible: true,
                title: 'Permission Denied',
                message: 'Please allow access to your photo library in Settings to update your profile.',
                type: 'warning'
            });
            return;
        }

        // EXTRA STABILITY: Delay for Android to prevent picker closing immediately after permission grant
        if (Platform.OS === 'android') {
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        const options = {
            mediaType: 'photo',
            includeBase64: false,
            maxHeight: 1000,
            maxWidth: 1000,
            quality: 0.8,
        };

        launchImageLibrary(options, (response) => {
            if (response.didCancel) return;
            if (response.errorCode) {
                setAlertConfig({
                    visible: true,
                    title: 'Error',
                    message: response.errorMessage || 'Something went wrong while picking the photo.',
                    type: 'error'
                });
                return;
            }
            if (response.assets && response.assets.length > 0) {
                const asset = response.assets[0];
                setNewPhoto(asset);
                setTempUser({ ...tempUser, photo: asset.uri });
            }
        });
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            let photoUrl = tempUser.photo;

            // 1. Upload to S3 if photo changed
            if (newPhoto) {
                const fileName = `profile_${user.id}_${Date.now()}.jpg`;
                photoUrl = await uploadToS3(newPhoto.uri, fileName, 'image/jpeg');
            }

            // 2. Update Firestore
            if (user.id) {
                await firestore().collection('users').doc(user.id).update({
                    name: tempUser.name,
                    age: tempUser.age,
                    photo: photoUrl
                });
            }

            // 3. Update AsyncStorage
            const updatedSession = {
                ...user,
                name: tempUser.name,
                age: tempUser.age,
                photo: photoUrl
            };
            await AsyncStorage.setItem('userSession', JSON.stringify(updatedSession));

            setUser(updatedSession);
            setIsEditing(false);
            setNewPhoto(null);

            setAlertConfig({
                visible: true,
                title: 'Success',
                message: 'Profile updated successfully!',
                type: 'success',
                onPress: () => navigation.goBack()
            });
        } catch (error) {
            console.error('Error saving profile:', error);
            setAlertConfig({
                visible: true,
                title: 'Error',
                message: 'Failed to update profile. Please try again.',
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const toggleEdit = () => {
        if (isEditing) {
            // Cancel editing
            setTempUser({ ...user });
            setNewPhoto(null);
            setIsEditing(false);
        } else {
            setIsEditing(true);
        }
    };

    return (
        <View style={{ flex: 1 }}>
            {/* 🏙️ Attractive Popup */}
            <Modal
                transparent
                visible={alertConfig.visible}
                animationType="fade"
                onRequestClose={() => setAlertConfig({ ...alertConfig, visible: false })}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={[styles.modalIconContainer, { backgroundColor: alertConfig.type === 'success' ? 'rgba(80, 227, 194, 0.15)' : 'rgba(255, 97, 171, 0.15)' }]}>
                            <MaterialCommunityIcons
                                name={alertConfig.type === 'success' ? 'check-decagram' : 'alert-circle-outline'}
                                size={50}
                                color={alertConfig.type === 'success' ? '#50E3C2' : '#FF61AB'}
                            />
                        </View>
                        <Text style={styles.modalTitle}>{alertConfig.title}</Text>
                        <Text style={styles.modalMessage}>{alertConfig.message}</Text>
                        <TouchableOpacity
                            style={[styles.modalButton, { backgroundColor: alertConfig.type === 'success' ? '#50E3C2' : '#FF61AB' }]}
                            onPress={() => {
                                setAlertConfig({ ...alertConfig, visible: false });
                                if (alertConfig.onPress) alertConfig.onPress();
                            }}
                        >
                            <Text style={styles.modalButtonText}>Alright</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
                <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Personal Information</Text>
                    <TouchableOpacity onPress={toggleEdit} style={styles.editHeaderButton}>
                        <Text style={styles.editHeaderText}>{isEditing ? 'Cancel' : 'Edit'}</Text>
                    </TouchableOpacity>
                </View>

                {/* Avatar Section */}
                <View style={styles.avatarSection}>
                    <TouchableOpacity
                        activeOpacity={isEditing ? 0.8 : 1}
                        onPress={handlePickImage}
                        style={styles.avatarContainer}
                    >
                        <Image source={{ uri: tempUser.photo }} style={styles.avatar} />
                        {isEditing && (
                            <View style={styles.cameraOverlay}>
                                <MaterialCommunityIcons name="camera" size={24} color="#FFF" />
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Fields Section */}
                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>FULL NAME</Text>
                        {isEditing ? (
                            <TextInput
                                style={styles.input}
                                value={tempUser.name}
                                onChangeText={(text) => setTempUser({ ...tempUser, name: text })}
                                placeholder="Your Name"
                                placeholderTextColor={theme.colors.muted}
                            />
                        ) : (
                            <Text style={styles.valueText}>{user.name}</Text>
                        )}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>EMAIL ADDRESS (READ-ONLY)</Text>
                        <Text style={[styles.valueText, styles.disabledText]}>{user.email}</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>AGE</Text>
                        <View style={styles.row}>
                            {isEditing ? (
                                <TextInput
                                    style={[styles.input, { flex: 1 }]}
                                    value={tempUser.age}
                                    onChangeText={(text) => setTempUser({ ...tempUser, age: text })}
                                    placeholder="Your Age"
                                    placeholderTextColor={theme.colors.muted}
                                    keyboardType="numeric"
                                />
                            ) : (
                                <Text style={styles.valueText}>{user.age || 'Not specified'}</Text>
                            )}
                            {!isEditing && (
                                <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.inlineEditButton}>
                                    <MaterialCommunityIcons name="pencil-outline" size={18} color={theme.colors.primary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>

                {/* Save Button */}
                {isEditing && (
                    <TouchableOpacity
                        style={[styles.saveButton, loading && { opacity: 0.7 }]}
                        onPress={handleSave}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.saveButtonText}>Save Changes</Text>
                        )}
                    </TouchableOpacity>
                )}
            </ScrollView>
        </View>
    );
};

const createStyles = (theme, isDarkMode) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    editHeaderButton: {
        padding: 8,
    },
    editHeaderText: {
        color: theme.colors.primary,
        fontWeight: 'bold',
        fontSize: 16,
    },
    avatarSection: {
        alignItems: 'center',
        marginVertical: 30,
    },
    avatarContainer: {
        width: 150,
        height: 150,
        borderRadius: 75,
        borderWidth: 4,
        borderColor: theme.colors.primary,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: theme.colors.surface,
        ...theme.shadows.md,
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    cameraOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    form: {
        paddingHorizontal: 24,
    },
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 10,
        fontWeight: '900',
        color: theme.colors.textSecondary,
        marginBottom: 8,
        letterSpacing: 1,
    },
    valueText: {
        fontSize: 16,
        color: theme.colors.text,
        fontWeight: '600',
        paddingVertical: 10,
    },
    disabledText: {
        color: theme.colors.muted,
    },
    input: {
        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0,0,0,0.02)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: theme.colors.text,
        borderWidth: 1,
        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0,0,0,0.05)',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    inlineEditButton: {
        padding: 8,
        backgroundColor: 'rgba(123, 97, 255, 0.1)',
        borderRadius: 8,
    },
    saveButton: {
        backgroundColor: theme.colors.primary,
        marginHorizontal: 24,
        marginTop: 20,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        ...theme.shadows.md,
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        width: '100%',
        backgroundColor: theme.colors.surface,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        ...theme.shadows.lg,
    },
    modalIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: theme.colors.text,
        marginBottom: 8,
    },
    modalMessage: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    modalButton: {
        width: '100%',
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.md,
    },
    modalButtonText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '800',
    },
});

export default EditProfileScreen;