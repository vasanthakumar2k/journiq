import firestore, { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  updateDoc,
  deleteDoc,
} from '@react-native-firebase/firestore';

const db = getFirestore();

/**
 * Creates or updates a user profile in Firestore after Google Login.
 * @param {Object} user - The user object from Google Sign-In.
 */
export const createUser = async (user) => {
  try {
    const userId = user.id || user.uid;
    
    await setDoc(doc(db, 'users', userId), {
      name: user.name,
      email: user.email,
      photo: user.photo,
      lastLogin: serverTimestamp(),
    }, { merge: true });
    
    console.log("User record synced with Firestore for UID:", userId);
  } catch (error) {
    console.error("Error syncing user with Firestore:", error);
    throw error;
  }
};

/**
 * Adds a new journal entry (story) to the standalone 'stories' collection.
 * @param {string} userId - The unique user ID of the creator.
 * @param {Object} storyData - The journal entry data.
 */
export const addStory = async (userId, storyData) => {
  try {
    const { title, images, location, narrative, tags, email } = storyData;
    
    const bannerImage = images && images.length > 0 ? images[0] : null;
    const gallery = images && images.length > 1 ? images.slice(1) : [];

    const result = await addDoc(collection(db, 'stories'), {
      userId,
      email: email || '',
      title,
      bannerImage,
      gallery,
      location,
      narrative,
      tags,
      createdAt: serverTimestamp(),
    });
    
    console.log("Journal entry successfully saved to global stories collection with ID:", result.id);
    return result.id;
  } catch (error) {
    console.error("Error adding story to Firestore:", error);
    throw error;
  }
};

/**
 * Fetches all stories from the global 'stories' collection filtered by email.
 * @param {string} userEmail - The user's email address.
 */
export const getUserStories = async (userEmail) => {
  try {
    const q = query(
      collection(db, 'stories'),
      where('email', '==', userEmail),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching user stories from root collection:", error);
    throw error;
  }
};

/**
 * Fetches ALL stories across all users from the global 'stories' collection.
 */
export const getAllStories = async () => {
  try {
    const q = query(
      collection(db, 'stories'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching all stories from global collection:", error);
    throw error;
  }
};

/**
 * Updates an existing story in the root stories collection.
 */
export const updateStory = async (storyId, data) => {
  try {
    const storyDocRef = doc(db, 'stories', storyId);
    await updateDoc(storyDocRef, data);
    return true;
  } catch (error) {
    console.error("Error updating story in root collection:", error);
    throw error;
  }
};

/**
 * Deletes a story from the root stories collection.
 */
export const deleteStory = async (storyId) => {
  try {
    const storyDocRef = doc(db, 'stories', storyId);
    await deleteDoc(storyDocRef);
    return true;
  } catch (error) {
    console.error("Error deleting story from root collection:", error);
    throw error;
  }
};




