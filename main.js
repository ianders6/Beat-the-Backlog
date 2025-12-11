// --- CONFIG ---
// API Key for RAWG (Global constant for external service authentication)
const API_KEY = "28e720e21cc54874bf2635856736548e";
const BASE_URL = "https://api.rawg.io/api";

//
// --- 1. FIREBASE CONFIG ---
// Configuration object for initializing the Firebase app instance.
const firebaseConfig = {
  apiKey: "AIzaSyCWHBOS1kGTq4O8UluV0Mu55gIoUwW6OiQ",
  authDomain: "beat-the-backlog.firebaseapp.com",
  projectId: "beat-the-backlog",
  storageBucket: "beat-the-backlog.firebasestorage.app",
  messagingSenderId: "411836598422",
  appId: "1:411836598422:web:ec711fc25374a3287f5ab7",
  measurementId: "G-ND8J7H0NL1"
};

// --- GLOBAL FIREBASE VARIABLES ---
// Will hold the Firebase App instance.
let app;
// Will hold the Firebase Authentication service instance.
let auth;
// Will hold the Firestore Database service instance.
let db;
// Stores the currently authenticated user's ID for data access control.
let currentUserId = null; 

// --- HELPER FUNCTION ---
/**
 * Decodes the API key at runtime.
 * @returns {string} The RAWG API key.
 * This is a simple wrapper, useful if decryption logic were later added.
 */
function getApiKey() {
  return API_KEY;
}


// --- MAIN CODE EXECUTION ---
// Ensures all necessary HTML elements are loaded before attempting DOM manipulation.
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded and parsed");

  try {
    // --- 2. INITIALIZE FIREBASE ---
    app = firebase.initializeApp(firebaseConfig);
    // Get the Auth and Firestore service instances for global use.
    auth = firebase.auth();
    db = firebase.firestore();
    console.log("Firebase initialized.");
    
    // --- 3. AUTH STATE LISTENER ---
    // A persistent listener that fires whenever the user's sign-in status changes.
    auth.onAuthStateChanged(user => {
      // Get navigation and UI elements to toggle visibility based on auth state.
      const loggedInNav = document.getElementById("nav-logged-in");
      const loggedOutNav = document.getElementById("nav-logged-out");
      const userActions = document.getElementById("user-action-buttons"); // Wrapper on details page
      const dashboardContainer = document.getElementById("dashboard-container");

      if (user) {
        // --- USER IS LOGGED IN (State Transition: Logged Out -> Logged In) ---
        console.log("User is LOGGED IN:", user.uid);
        // Store the user ID globally for Firestore access.
        currentUserId = user.uid;

        // Update UI visibility.
        if (loggedInNav) loggedInNav.classList.remove("d-none");
        if (loggedOutNav) loggedOutNav.classList.add("d-none");
        if (userActions) userActions.classList.remove("d-none");

        // Display the user's name or a simplified email.
        const usernameEl = document.getElementById("dashboard-username");
        if (usernameEl) {
          usernameEl.textContent = user.displayName || user.email.split('@')[0];
        }

        // Conditional loading logic for the settings page.
        const settingsForm = document.getElementById("settings-form");
        if (settingsForm) {
          loadUserSettings(user);
        }

      } else {
        // --- USER IS LOGGED OUT (State Transition: Logged In -> Logged Out) ---
        console.log("User is LOGGED OUT");
        currentUserId = null;

        // Update UI visibility.
        if (loggedInNav) loggedInNav.classList.add("d-none");
        if (loggedOutNav) loggedOutNav.classList.remove("d-none");
        if (userActions) userActions.classList.add("d-none");

        // Display a prompt on the dashboard if logged out.
        if (dashboardContainer) {
          dashboardContainer.innerHTML = `<h2 class="text-center text-white-50">Please <a href="login.html">log in</a> to view your dashboard.</h2>`;
        }

        // Display a login prompt on the settings page if logged out.
        const settingsForm = document.getElementById("settings-form");
        if (settingsForm) {
          const mainContainer = document.querySelector(".container.my-5");
          if (mainContainer) {
            mainContainer.innerHTML = `<h2 class="text-center text-white-50">Please <a href="login.html">log in</a> to view your settings.</h2>`;
          }
        }
      }
    });

  } catch (error) {
    // Graceful error handling for Firebase initialization failure (e.g., missing script).
    console.error("Firebase initialization failed:", error);
  }

  // --- Global Listeners ---
  // Search form listener for the logged-out navigation bar.
  const navbarSearchForm = document.getElementById("navbar-search-form");
  if (navbarSearchForm) {
    navbarSearchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const searchInput = document.getElementById("navbar-search-input");
      const query = searchInput.value;
      if (query) {
        // Redirect to the library page with the search query as a URL parameter.
        window.location.href = `library.html?search=${encodeURIComponent(query)}`;
      }
    });
  }
  // Search form listener for the logged-in navigation bar.
  const navbarSearchFormAuth = document.getElementById("navbar-search-form-auth");
  if (navbarSearchFormAuth) {
     navbarSearchFormAuth.addEventListener("submit", (event) => {
      event.preventDefault();
      const searchInput = document.getElementById("navbar-search-input-auth");
      const query = searchInput.value;
      if (query) {
        window.location.href = `library.html?search=${encodeURIComponent(query)}`;
      }
    });
  }

// Listener for the "Log a Game" button, redirects to the library page.
  const logAGameBtn = document.getElementById("log-a-game-btn");
  if (logAGameBtn) {
    logAGameBtn.addEventListener("click", (event) => {
      event.preventDefault();
      window.location.href = "library.html";
    });
  }

// Listener for the global Logout button.
  const logoutButton = document.getElementById("logout-button");
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      auth.signOut().then(() => {
        console.log("User logged out.");
        window.location.href = "home.html"; 
      }).catch((error) => {
        console.error("Logout failed:", error);
      });
    });
  }


  // --- Page-Specific Logic (Routing by DOM Element presence) ---

  // 1. Check if we are on the LIBRARY page (Search and filter functionality).
  const libraryContainer = document.getElementById("game-library-display");
  if (libraryContainer) {
    console.log("On Library page.");
    // Populate the platform and sort filter dropdowns asynchronously.
    populateFilterDropdowns();

    // Check for initial search query from URL (e.g., from the navbar search).
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('search');
    let initialParams = `&page_size=20&exclude_adults=true`;
    let loadingQuery = null;

    if (searchQuery) {
      console.log(`Searching for: ${searchQuery}`);
      // Append search parameters to the initial API call.
      initialParams += `&search=${encodeURIComponent(searchQuery)}&search_exact=true`;
      loadingQuery = searchQuery;
      // Pre-fill the search input on the library page.
      const searchInput = document.getElementById("searchInput");
      if (searchInput) searchInput.value = searchQuery;
    } else {
      console.log("Populating default game list...");
      initialParams += `&exclude_adults=true`;
    }

    // Initial fetch and display of games based on URL or defaults.
    fetchAndDisplayLibraryGames(initialParams, libraryContainer, loadingQuery);

    // Listener for the Library Filter Form submission (manual filter/search).
    const librarySearchForm = document.getElementById("library-filter-form");
    if (librarySearchForm) {
      librarySearchForm.addEventListener("submit", (event) => {
        event.preventDefault();

        // Dynamically build query parameters from form inputs.
        let queryParams = `&page_size=20&exclude_adults=true`;
        const query = document.getElementById("searchInput").value;
        if (query) {
          queryParams += `&search=${encodeURIComponent(query)}&search_exact=true`;
        }

        const platform = document.getElementById("platformFilter").value;
        if (platform) {
          queryParams += `&platforms=${platform}`;
        }

        const sort = document.getElementById("sortFilter").value;
        if (sort) {
          queryParams += `&ordering=${sort}`;
        }

        console.log(`Library page filtering API. Params: ${queryParams}`);
        // Re-fetch and display games with new filters.
        fetchAndDisplayLibraryGames(queryParams, libraryContainer, query);
      });
    }
  }


  // 2. Check if we are on the DETAILS page (Game logging and rating).
  const detailsContainer = document.getElementById("game-details-container");
  if (detailsContainer) {
    console.log("On Details page.");
    const urlParams = new URLSearchParams(window.location.search);
    // Get the game slug identifier from the URL.
    const gameSlug = urlParams.get('slug');

    if (gameSlug) {
      console.log(`Fetching details for slug: ${gameSlug}`);
      // Fetch and render game details from the RAWG API.
      fetchAndDisplayGameDetails(gameSlug);
      
      // Add listeners to the three status buttons.
      document.getElementById("btn-status-completed")?.addEventListener("click", () => {
        logGameStatus(gameSlug, "Completed");
      });
      document.getElementById("btn-status-playing")?.addEventListener("click", () => {
        logGameStatus(gameSlug, "Playing");
      });
      document.getElementById("btn-status-backlog")?.addEventListener("click", () => {
        logGameStatus(gameSlug, "Backlog"); 
      });

      // Handle user rating logic.
      const starRatingContainer = document.getElementById("user-star-rating");
      if (starRatingContainer) {
        // Load the existing rating once the auth state is known.
        auth.onAuthStateChanged(user => {
          if (user) {
            const actions = document.getElementById("user-action-buttons");
            if (actions) actions.classList.remove("d-none");
            loadAndHighlightSavedRating(gameSlug);
          }
        });

        // Click listener for saving the selected rating.
        starRatingContainer.addEventListener("click", (e) => {
          if (e.target.classList.contains("star")) {
            const rating = e.target.dataset.value;
            if (rating && currentUserId) { 
              saveGameRating(gameSlug, parseInt(rating));
              highlightStars(rating);
              starRatingContainer.dataset.currentRating = rating; // Update local state for mouseout.
            } else if (!currentUserId) {
              alert("Please log in to save a rating.");
            }
          }
        });

        // Mouseover listener for visual feedback (temporary highlighting).
        starRatingContainer.addEventListener("mouseover", (e) => {
          if (e.target.classList.contains("star")) {
            const rating = e.target.dataset.value;
            if (rating) {
              highlightStars(rating);
            }
          }
        });
        // Mouseout listener to revert to the saved rating's highlight.
        starRatingContainer.addEventListener("mouseout", () => {
          const savedRating = starRatingContainer.dataset.currentRating;
          highlightStars(savedRating);
        });
      }
      
    } else {
      console.error("No game slug found in URL.");
      detailsContainer.innerHTML = `<p class="text-danger text-center fs-3">Error: No game was specified.</p>`;
    }
  } 


  // 3. Check if we are on the LOGIN page.
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    console.log("Login form found.");
    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const email = event.target.email.value;
      const password = event.target.password.value;

      // Use Firebase Auth's sign-in function.
      auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
          console.log("User logged in:", userCredential.user.uid);
          window.location.href = "dashboard.html"; 
        })
        .catch((error) => {
          console.error("Login failed:", error.message);
          alert(`Login failed: ${error.message}`);
        });
    });
  } 
  

  // 4. Check if we are on the REGISTRATION page.
  const registrationForm = document.getElementById("registration-form");
  if (registrationForm) {
    console.log("Registration form found.");
    registrationForm.addEventListener("submit", (event) => {
      event.preventDefault();
      
      const username = event.target.username.value;
      const email = event.target.email.value;
      const password = event.target.password.value;
      const confirmPassword = event.target.confirmPassword.value;
      
      if (password !== confirmPassword) {
        alert("Passwords do not match.");
        return;
      }

      // 1. Create the user with email and password.
      auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
          const user = userCredential.user;
      // 2. Update the Auth profile to save the display name (username).
          return user.updateProfile({
            displayName: username
          }).then(() => {
      // 3. Create a corresponding document in Firestore for user settings/metadata.      
            db.collection("userLogs").doc(user.uid).set({
              userId: user.uid,
              username: username,
              email: email, 
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
          });
        })
        .then(() => {
          alert("Registration successful! Welcome!");
          // Redirect on successful registration.
          window.location.href = "dashboard.html"; 
        })
        .catch((error) => {
          console.error("Registration failed:", error.message);
          alert(`Registration failed: ${error.message}`);
        });
    });
  } 
  

  // 5. Check if we are on the DASHBOARD page.
  const dashboardContainer = document.getElementById("dashboard-container");
  if (dashboardContainer) {
    console.log("On Dashboard page.");

    // Load dashboard content only after the user is confirmed to be logged in.
    auth.onAuthStateChanged(user => {
      if (user) {
        updateDashboardStats();
        // Update the statistics (Completed, Playing, Backlog counts).
        const gameListContainer = document.getElementById("dashboard-game-list");
        if (gameListContainer) {
          console.log("Populating dashboard game list from Firestore...");
          // Fetch and display the user's logged games.
          populateUserGameList(gameListContainer); 
        }
      }
    });
  } 
  
  
  // 6. Check if we are on the SETTINGS page.
  const settingsForm = document.getElementById("settings-form");
  if (settingsForm) {
    console.log("On Settings page.");

    // Handler for the Main "Save Changes" button
    settingsForm.addEventListener("submit", (event) => {
      event.preventDefault();
      handleSettingsFormSubmit();
    });

    // Handler for Delete Account (Requires confirmation).
    document.getElementById("btn-delete-account")?.addEventListener("click", () => {
      if (confirm("Are you sure you want to delete your account? This cannot be undone!")) {
        deleteUserAccount();
      }
    });
  }

}); // end DOMContentLoaded


// --- SETTINGS FUNCTIONS (UPDATED) ---

/**
 * Loads current user data (displayName and email) into the settings form inputs.
 * @param {firebase.User} user - The currently authenticated Firebase user object.
 */
function loadUserSettings(user) {
  if (!user) return;

  const usernameInput = document.getElementById('settings-username');
  const emailInput = document.getElementById('settings-email');

  if (usernameInput) usernameInput.value = user.displayName || "";
  if (emailInput) emailInput.value = user.email || "";
}

/**
 * Handles the main Settings Form submission.
 * Updates Username (Auth & Firestore), Email (Auth & Firestore), and Password (Auth) if changed.
 */
async function handleSettingsFormSubmit() {
  const user = auth.currentUser;
  if (!user) {
    alert("You must be logged in to save settings.");
    return;
  }

  const newUsername = document.getElementById('settings-username').value.trim();
  const newEmail = document.getElementById('settings-email').value.trim();
  const newPassword = document.getElementById('settings-password').value;

  const updates = [];
  let message = "";

  // 1. Update Username (Display Name) if changed.
  if (newUsername && newUsername !== user.displayName) {
    // Create a Promise for the Auth profile update and chained Firestore update.
    const p1 = user.updateProfile({ displayName: newUsername })
      .then(() => {
        return db.collection("userLogs").doc(user.uid).set({ username: newUsername }, { merge: true });
      })
      .then(() => { message += "Username updated. "; });
    updates.push(p1);
  }

  // 2. Update Email if changed.
  if (newEmail && newEmail !== user.email) {
    // Create a Promise for the Auth email update and chained Firestore update.
    const p2 = user.updateEmail(newEmail)
      .then(() => {
        return db.collection("userLogs").doc(user.uid).set({ email: newEmail }, { merge: true });
      })
      .then(() => { message += "Email updated. "; });
    updates.push(p2);
  }

  // 3. Update Password if field is not empty (requires minimum length validation).
  if (newPassword && newPassword.length > 0) {
    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    // Create a Promise for the Auth password update.
    const p3 = user.updatePassword(newPassword)
      .then(() => { message += "Password changed. "; });
    updates.push(p3);
  }

  // Execute all accumulated updates in parallel.
  if (updates.length === 0) {
    alert("No changes detected.");
    return;
  }

  try {
    await Promise.all(updates);
    alert("Success! " + message);
    // Clear the password field after a successful change.
    document.getElementById('settings-password').value = "";
  } catch (error) {
    console.error("Settings update error:", error);
    // Handle the security requirement for recent login on sensitive updates.
    if (error.code === 'auth/requires-recent-login') {
      alert("Security Alert: To change sensitive information (Password), you must have logged in recently. Please Log Out and Log In again, then try updating.");
    } else {
      alert(`Error updating settings: ${error.message}`);
    }
  }
}

/**
 * Deletes the user's account from Firebase Auth and their associated data from Firestore.
 */
async function deleteUserAccount() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    // Step 1: Delete all user-specific data from Firestore first.
    await db.collection("userLogs").doc(user.uid).delete();

    // Step 2: Delete the Auth User.
    await user.delete();

    alert("Account deleted. Redirecting to home.");
    window.location.href = "home.html";

  } catch (error) {
    console.error("Error deleting account:", error);
    // Handle the security requirement for recent login on account deletion.
    if (error.code === 'auth/requires-recent-login') {
      alert("Security Alert: To delete your account, you must have logged in recently. Please Log Out and Log In again, then try deleting.");
    } else {
      alert("Failed to delete account: " + error.message);
    }
  }
}


// --- FIRESTORE HELPER FUNCTIONS ---

/**
 * Gets the reference to the current user's 'games' sub-collection in Firestore.
 * @returns {firebase.firestore.CollectionReference|null} The collection reference or null if not logged in.
 */
function getUserGamesCollection() {
  if (!currentUserId) {
    console.log("Not logged in, cannot get user collection.");
    return null;
  }
  // This structure (userLogs/{userId}/games/{gameSlug}) is standard for user data.
  return db.collection("userLogs").doc(currentUserId).collection("games");
}

/**
 * Fetches the saved log data for a specific game slug.
 * @param {string} gameSlug - The unique slug identifier for the game.
 * @returns {Promise<Object|null>} The logged game data or null if not found.
 */
async function getLoggedGame(gameSlug) {
  const gamesCollection = getUserGamesCollection();
  if (!gamesCollection) return null;

  try {
    const doc = await gamesCollection.doc(gameSlug).get();
    if (doc.exists) {
      return doc.data();
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting logged game:", error);
    return null;
  }
}

/**
 * Logs or updates the status (Completed, Playing, Backlog) for a game.
 * @param {string} gameSlug - The unique slug identifier for the game.
 * @param {string} status - The status to save.
 */
async function logGameStatus(gameSlug, status) {
  const gamesCollection = getUserGamesCollection();
  if (!gamesCollection) {
    alert("You must be logged in to log a game!");
    return;
  }

  const gameData = {
    slug: gameSlug,
    status: status,
    // Use serverTimestamp for consistent, non-client-side generated timestamps.
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    // Use { merge: true } to prevent overwriting other fields (like 'rating').
    await gamesCollection.doc(gameSlug).set(gameData, { merge: true });
    alert(`Game saved as '${status}'! It will now appear on your dashboard.`);
  } catch (error) {
    console.error("Error saving game status:", error);
    alert(`Error saving status: ${error.message}`);
  }
}

/**
 * Saves the user's star rating for a specific game.
 * @param {string} gameSlug - The unique slug identifier for the game.
 * @param {number} rating - The star rating (1-5).
 */
async function saveGameRating(gameSlug, rating) {
  const gamesCollection = getUserGamesCollection();
  if (!gamesCollection) {
    alert("You must be logged in to save a rating!");
    return;
  }

  const gameData = {
    slug: gameSlug,
    rating: rating,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    // Use { merge: true } to prevent overwriting other fields (like 'status').
    await gamesCollection.doc(gameSlug).set(gameData, { merge: true });
    alert(`Game rating saved as ${rating} stars!`);
  } catch (error) {
    console.error("Error saving game rating:", error);
    alert(`Error saving rating: ${error.message}`);
  }
}

/**
 * Permanently removes a game entry from the user's log.
 * @param {string} gameSlug - The unique slug identifier for the game to remove.
 */
async function removeGameFromLog(gameSlug) {
  const gamesCollection = getUserGamesCollection();
  if (!gamesCollection) {
    alert("You must be logged in to remove a game!");
    return;
  }

  try {
    // Delete the specific document for the game slug.
    await gamesCollection.doc(gameSlug).delete();
    console.log(`Removed game: ${gameSlug}`);

    // Refresh the dashboard UI after removal.
    const gameListContainer = document.getElementById("dashboard-game-list");
    if (gameListContainer) {
      populateUserGameList(gameListContainer);
    }
    updateDashboardStats();
  } catch (error) {
    console.error("Error removing game:", error);
    alert(`Error removing game: ${error.message}`);
  }
}


// --- RATING HELPER FUNCTIONS ---

/**
 * Visually highlights the appropriate number of stars based on the given rating value.
 * @param {number|string} rating - The number of stars to highlight (1 to 5).
 */
function highlightStars(rating) {
  const stars = document.querySelectorAll("#user-star-rating .star");
  stars.forEach(star => {
    // Apply the 'selected' class if the star's value is less than or equal to the rating.
    if (star.dataset.value <= rating) {
      star.classList.add("selected");
    } else {
      star.classList.remove("selected");
    }
  });
}

/**
 * Loads the user's saved rating for a game and applies the visual star highlighting.
 * @param {string} gameSlug - The unique slug identifier for the game.
 */
async function loadAndHighlightSavedRating(gameSlug) {
  const game = await getLoggedGame(gameSlug);
  const savedRating = game ? game.rating : 0;

  const starRatingContainer = document.getElementById("user-star-rating");
  if (starRatingContainer) {
    // Store the saved rating in a data attribute to persist the state.
    starRatingContainer.dataset.currentRating = savedRating;
  }

  highlightStars(savedRating);
}


// --- API HELPER FUNCTIONS ---
/**
 * Fetches the user's logged games from Firestore, fetches game details from RAWG, and renders them.
 * @param {HTMLElement} container - The DOM element to render the game cards into.
 */
async function populateUserGameList(container) {
  const gamesCollection = getUserGamesCollection();
  if (!gamesCollection) {
    container.innerHTML = `<p class="text-center text-white-50">Error: Not logged in.</p>`;
    return;
  }

  try {
    container.innerHTML = `<p class="text-center text-white-50">Loading your logged games...</p>`;
    // Step 1: Get all logged game documents from Firestore.
    const snapshot = await gamesCollection.get();
    if (snapshot.empty) {
      container.innerHTML = `<p class="text-center text-white-50">You haven't logged any games yet. Go to the <a href="library.html" class="text-white">Games</a> page to find some!</p>`;
      return;
    }

    const loggedGames = snapshot.docs.map(doc => doc.data());

    // Step 2: Fetch full game details from the RAWG API using the stored slugs.
    const gamePromises = loggedGames.map(game => 
      fetch(`${BASE_URL}/games/${game.slug}?key=${getApiKey()}`)
        .then(response => {
          if (!response.ok) {
            console.error(`API Error for ${game.slug}: ${response.status}`);
            return null; // Handle API failures gracefully.
          }
          return response.json();
        })
        .then(gameData => {
          if (gameData) {
            // Merge Firestore data (status, rating) with API data.
            gameData.savedStatus = game.status;
            gameData.userRating = game.rating;
          }
          return gameData;
        })
    );

    // Wait for all API calls to complete.
    let games = await Promise.all(gamePromises);
    // Remove any games that failed the API call.
    games = games.filter(game => game !== null);
    

    console.log("Dashboard/Local Games Data:", games);

    // Step 3: Render the game cards.
    container.innerHTML = ""; 
    
    const row = document.createElement("div");
    // Use Bootstrap grid classes for responsive layout.
    row.className = "row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4";
    
    games.forEach(game => {
      // Create card with a 'remove' button for the dashboard view.
      row.appendChild(createGameCard(game, game.savedStatus, game.userRating, true));
    });
    
    container.appendChild(row);

    // Step 4: Add listeners for the dynamically created 'Remove' buttons.
    container.querySelectorAll(".btn-remove-game").forEach(button => {
      button.addEventListener("click", (event) => {
        const gameSlug = event.currentTarget.dataset.slug;
        if (gameSlug) {
          if (confirm(`Are you sure you want to remove this game from your log?`)) {
            removeGameFromLog(gameSlug);
          }
        }
      });
    });

  } catch (error) {
    console.error("Failed to populate user game list:", error);
    container.innerHTML = `<p class="text-danger text-center">Failed to load your games. ${error.message}</p>`;
  }
}

/**
 * Fetches games from the RAWG API based on query parameters and renders the results.
 * @param {string} queryParams - URL parameters for the RAWG /games endpoint.
 * @param {HTMLElement} container - The DOM element to render the game cards into.
 * @param {string|null} loadingQuery - The search term for display in the loading message.
 */
async function fetchAndDisplayLibraryGames(queryParams, container, loadingQuery = null) {
  try {
    const loadingMessage = loadingQuery 
      ? `Searching for '${loadingQuery}'...` 
      : "Loading popular games...";
    container.innerHTML = `<h2 class="text-center text-white-50">${loadingMessage}</h2>`;
    
    const response = await fetch(`${BASE_URL}/games?key=${getApiKey()}${queryParams}`);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log("Library Games Data:", data);
    
    container.innerHTML = ""; 
    
    if (data.results.length === 0) {
      container.innerHTML = `<h2 class="text-center text-white-50">No results found.</h2>`;
      return;
    }

    // After fetching, check auth state to load and display user's saved status/rating on each card.
    auth.onAuthStateChanged(async (user) => {
      container.innerHTML = "";
      
      for (const game of data.results) {
        if (game.name.toLowerCase().includes('hentai')) continue;

        let userRating = 0;
        let status = null;

        if (user) {
          const savedGame = await getLoggedGame(game.slug);
          userRating = savedGame ? savedGame.rating : 0;
          status = savedGame ? savedGame.status : null;
        }
        
        container.appendChild(createGameCard(game, status, userRating, false));
      }
    });
    
  } catch (error) {
    console.error("Failed to populate game library:", error);
    container.innerHTML = `<p class="text-danger text-center">Failed to load games. ${error.message}</p>`;
  }
}

/**
 * Fetches and displays the full details for a single game on the details page.
 * @param {string} gameSlug - The unique slug identifier for the game.
 */
async function fetchAndDisplayGameDetails(gameSlug) {
  const container = document.getElementById("game-details-container");
  try {
    const response = await fetch(`${BASE_URL}/games/${gameSlug}?key=${getApiKey()}`);
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    const game = await response.json();
    console.log("Game Details Data:", game);

    // Target specific DOM elements for rendering.
    const coverArt = document.getElementById("game-cover-art");
    const gameTitle = document.getElementById("game-title");
    const gameInfo = document.getElementById("game-info");
    const gameDescription = document.getElementById("game-description");
    
    document.title = `Beat the Backlog - ${game.name}`;

    // Populate image, using a placeholder if the image is missing.
    if (coverArt) {
      coverArt.src = game.background_image || "https://placehold.co/600x800/222/888?text=No+Image";
      coverArt.alt = game.name;
    }

    // Populate text fields with game data.
    if (gameTitle) {
      gameTitle.textContent = game.name;
    }
    if (gameInfo) {
      // Safely extract and format key metadata.
      const releaseDate = game.released ? new Date(game.released).toLocaleDateString() : "N/A";
      const publisher = game.publishers.length > 0 ? game.publishers[0].name : "N/A";
      const developer = game.developers.length > 0 ? game.developers[0].name : "N/A";
      const genre = game.genres.length > 0 ? game.genres[0].name : "N/A";
      gameInfo.textContent = `${publisher} | ${developer} | ${genre} | ${releaseDate}`;
    }
    // RAWG descriptions contain HTML, so use innerHTML.
    if (gameDescription) {
      gameDescription.innerHTML = game.description || "No description available.";
    }

    // Check and load user's saved rating if logged in.
    if(currentUserId) {
      loadAndHighlightSavedRating(gameSlug);
    }
    
  } catch (error) {
    console.error(`Failed to fetch game details: ${error}`);
    if (container) {
        container.innerHTML = `<p class="text-danger text-center fs-3">Failed to load game details. ${error.message}</p>`;
    }
  }
}

/**
 * Creates a reusable Bootstrap-styled HTML card element for a game.
 * @param {Object} game - Game data from the RAWG API.
 * @param {string|null} status - User's saved status (Completed, Playing, Backlog).
 * @param {number} userRating - User's saved star rating (0-5).
 * @param {boolean} showRemoveButton - Whether to include a remove button (used on dashboard).
 * @returns {HTMLElement} The created column/card element.
 */
function createGameCard(game, status, userRating, showRemoveButton = false) {
  const col = document.createElement("div");
  col.className = "col";

  const imageUrl = game.background_image || "https://placehold.co/600x400/222/888?text=No+Image";
  
  let ratingText = "Not rated";
  if (userRating > 0) {
    ratingText = `${userRating} ★ (Your Rating)`;
  }

// Generate the status badge element if a status is present.
  let statusBadge = "";
  if (status) {
    let badgeClass = "bg-secondary";
    if (status === "Completed") badgeClass = "bg-success";
    if (status === "Playing") badgeClass = "bg-primary";
    if (status === "Backlog") badgeClass = "bg-warning text-dark";
    
    statusBadge = `<span class="badge ${badgeClass} position-absolute top-0 start-0 m-2">${status}</span>`;
  }
// Generate the remove button element for the dashboard view.
  let removeButton = "";
  if (showRemoveButton) {
    removeButton = `
      <button class="btn btn-danger btn-sm btn-remove-game position-absolute top-0 end-0 m-2" data-slug="${game.slug}" style="width: 32px; height: 32px; padding: 0;" aria-label="Remove game">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16" style="pointer-events: none;">
          <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3.5 1.5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
          <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
        </svg>
      </button>
    `;
  }

  // Use a template literal for clear HTML structure.
  col.innerHTML = `
    <div class="card bg-dark text-white h-100 shadow-sm border-secondary position-relative">
      <img src="${imageUrl}" class="card-img-top" alt="${game.name}" style="height: 200px; object-fit: cover;">
      ${statusBadge}
      ${removeButton}
      <div class="card-body d-flex flex-column">
        <h5 class="card-title">${game.name}</h5>
        <p class="card-text text-white-50"><small>${ratingText}</small></p>
        <a href="details.html?slug=${game.slug}" class="btn btn-primary btn-sm mt-auto">
          View Details
        </a>
      </div>
    </div>
  `;
  
  return col;
}

/**
 * Fetches and calculates the user's game statistics from Firestore and updates the dashboard UI.
 */
async function updateDashboardStats() {
  const gamesCollection = getUserGamesCollection();
  if (!gamesCollection) {
    console.log("Cannot update stats, user not logged in.");
    return;
  }
  
  try {
    const snapshot = await gamesCollection.get();
    const games = snapshot.docs.map(doc => doc.data());

    // Calculate counts for each status category.
    const completed = games.filter(g => g.status === "Completed").length;
    const playing = games.filter(g => g.status === "Playing").length;
    const backlog = games.filter(g => g.status === "Backlog").length;

    // Update the corresponding statistic elements on the dashboard.
    const elCompleted = document.getElementById("stats-completed");
    const elPlaying = document.getElementById("stats-playing");
    const elBacklog = document.getElementById("stats-backlog");
    
    if (elCompleted) elCompleted.textContent = completed;
    if (elPlaying) elPlaying.textContent = playing;
    if (elBacklog) elBacklog.textContent = backlog;
    
    console.log("Dashboard stats updated from Firestore.");
  } catch (error) {
    console.error("Error updating dashboard stats:", error);
  }
}

// --- Filter Population Functions ---
/**
 * Fetches the list of platforms from the RAWG API.
 * @returns {Promise<Array>} An array of platform objects.
 */
async function fetchPlatforms() {
  try {
    console.log("Fetching platforms...");
    // Fetch a manageable list of popular platforms.
    const response = await fetch(`${BASE_URL}/platforms?key=${getApiKey()}&page_size=20`); 
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    console.log("Platforms Data:", data);
    return data.results;
  } catch (error) {
    console.error("Failed to fetch platforms:", error);
    return [];
  }
}

/**
 * Populates the platform filter dropdown with common platform options.
 */
async function populateFilterDropdowns() {
  const platformFilter = document.getElementById("platformFilter");
  if (!platformFilter) return;

  platformFilter.innerHTML = '<option value="">All Platforms</option>';

// Reusing a predefined list for simplicity and relevance.
  const platforms = await fetchPlatforms();
// Instead of iterating through all 20, map to common parent platforms for better filtering.
  if (platforms.length > 0) {
    const parentPlatforms = [
      { id: 4, name: "PC" },
      { id: 187, name: "PlayStation" },
      { id: 186, name: "Xbox" },
      { id: 7, name: "Nintendo" },
      { id: 8, name: "iOS" },
      { id: 21, name: "Android" },
    ];
    
    parentPlatforms.forEach(platform => {
      const option = document.createElement("option");
      // RAWG platform IDs are used as the value for the API query.
      option.value = platform.id;
      option.textContent = platform.name;
      platformFilter.appendChild(option);
    });
  }
}