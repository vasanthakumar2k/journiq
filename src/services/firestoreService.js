import firestore from '@react-native-firebase/firestore';

/**
 * Creates or updates a user profile in Firestore after Google Login.
 * @param {Object} user - The user object from Google Sign-In.
 */
export const createUser = async (user) => {
  try {
    const userId = user.id || user.uid; // Google Sign-In uses .id, Firebase Auth uses .uid
    
    await firestore()
      .collection('users')
      .doc(userId)
      .set({
        name: user.name,
        email: user.email,
        photo: user.photo,
        lastLogin: firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    
    console.log("User record synced with Firestore for UID:", userId);
  } catch (error) {
    console.error("Error syncing user with Firestore:", error);
    throw error;
  }
};

/**
 * Adds a new journal entry (story) to the user's stories subcollection.
 * @param {string} userId - The unique user ID.
 * @param {Object} storyData - The journal entry data.
 */
export const addStory = async (userId, storyData) => {
  try {
    const { title, images, location, narrative, tags } = storyData;
    
    // Data Mapping as requested:
    // 1. First image as bannerImage
    // 2. Others as gallery array
    const bannerImage = images && images.length > 0 ? images[0] : null;
    const gallery = images && images.length > 1 ? images.slice(1) : [];

    const result = await firestore()
      .collection('users')
      .doc(userId)
      .collection('stories')
      .add({
        title,
        bannerImage,
        gallery,
        location,
        narrative,
        tags,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
    
    console.log("Journal entry successfully saved to Firestore with ID:", result.id);
    return result.id;
  } catch (error) {
    console.error("Error adding story to Firestore:", error);
    throw error;
  }
};

/**
 * Fetches all stories for a specific user.
 */
export const getUserStories = async (userId) => {
  try {
    const snapshot = await firestore()
      .collection('users')
      .doc(userId)
      .collection('stories')
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching user stories:", error);
    throw error;
  }
};

/**
 * Fetches ALL stories across all users using Collection Group.
 */
export const getAllStories = async () => {
  try {
    const snapshot = await firestore()
      .collectionGroup('stories')
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error performing collectionGroup query:", error);
    throw error;
  }
};

/**
 * Updates an existing story.
 */
export const updateStory = async (userId, storyId, data) => {
  try {
    await firestore()
      .collection('users')
      .doc(userId)
      .collection('stories')
      .doc(storyId)
      .update(data);
    return true;
  } catch (error) {
    console.error("Error updating story:", error);
    throw error;
  }
};

/**
 * Deletes a story.
 */
export const deleteStory = async (userId, storyId) => {
  try {
    await firestore()
      .collection('users')
      .doc(userId)
      .collection('stories')
      .doc(storyId)
      .delete();
    return true;
  } catch (error) {
    console.error("Error deleting story:", error);
    throw error;
  }
};
