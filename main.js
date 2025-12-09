// --- CONFIG ---
const API_KEY = "28e720e21cc54874bf2635856736548e";
const BASE_URL = "https://api.rawg.io/api";

//
// --- FIREBASE CONFIG ---
//
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
let app;
let auth;
let db;
let currentUserId = null; 

// --- HELPER FUNCTION ---
/**
 * Decodes the API key at runtime.
 */
function getApiKey() {
  // Using plain key as requested in previous steps
  return API_KEY; 
}


// --- MAIN CODE EXECUTION ---
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded and parsed");

  try {
    // --- 2. INITIALIZE FIREBASE ---
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    console.log("Firebase initialized.");
    
    // --- 3. AUTH STATE LISTENER ---
    auth.onAuthStateChanged(user => {
      const loggedInNav = document.getElementById("nav-logged-in");
      const loggedOutNav = document.getElementById("nav-logged-out");
      const userActionButtons = document.getElementById("user-action-buttons"); // Wrapper on details page
      const dashboardContainer = document.getElementById("dashboard-container");

      if (user) {
        // --- USER IS LOGGED IN ---
        console.log("User is LOGGED IN:", user.uid);
        currentUserId = user.uid; 

        if (loggedInNav) loggedInNav.classList.remove("d-none");
        if (loggedOutNav) loggedOutNav.classList.add("d-none");
        
        // Explicitly show user action buttons if they exist
        if (userActionButtons) {
            userActionButtons.classList.remove("d-none");
        }
        
        const usernameEl = document.getElementById("dashboard-username");
        if (usernameEl) {
          usernameEl.textContent = user.displayName || user.email.split('@')[0];
        }
        
        // Load settings if on settings page
        const settingsForm = document.getElementById("settings-form");
        if (settingsForm) {
            loadUserSettings(user);
        }

      } else {
        // --- USER IS LOGGED OUT ---
        console.log("User is LOGGED OUT");
        currentUserId = null;

        if (loggedInNav) loggedInNav.classList.add("d-none");
        if (loggedOutNav) loggedOutNav.classList.remove("d-none");

        // Hide user action buttons
        if (userActionButtons) {
            userActionButtons.classList.add("d-none");
        }
        
        if (dashboardContainer) {
          dashboardContainer.innerHTML = `<h2 class="text-center text-white-50">Please <a href="login.html">log in</a> to view your dashboard.</h2>`;
        }
        
        // Show login prompt on settings page
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
    console.error("Firebase initialization failed:", error);
  }

  // --- Global Listeners ---
  
  const navbarSearchForm = document.getElementById("navbar-search-form");
  if (navbarSearchForm) {
    navbarSearchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const searchInput = document.getElementById("navbar-search-input");
      const query = searchInput.value;
      if (query) {
        window.location.href = `library.html?search=${encodeURIComponent(query)}`;
      }
    });
  }
  
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

  const logAGameBtn = document.getElementById("log-a-game-btn");
  if (logAGameBtn) {
    logAGameBtn.addEventListener("click", (event) => {
      event.preventDefault();
      window.location.href = "library.html";
    });
  }

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


  // --- Page-Specific Logic ---

  // 1. LIBRARY PAGE
  const libraryContainer = document.getElementById("game-library-display");
  if (libraryContainer) {
    console.log("On Library page.");
    populateFilterDropdowns(); 
    
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('search');
    let initialParams = `&page_size=20&exclude_adults=true`;
    let loadingQuery = null;

    if (searchQuery) {
      console.log(`Searching for: ${searchQuery}`);
      initialParams += `&search=${encodeURIComponent(searchQuery)}&search_exact=true`;
      loadingQuery = searchQuery;
      const searchInput = document.getElementById("searchInput");
      if(searchInput) searchInput.value = searchQuery;
    } else {
      console.log("Populating default game list...");
      initialParams += `&exclude_adults=true`;
    }
    
    fetchAndDisplayLibraryGames(initialParams, libraryContainer, loadingQuery);

    const librarySearchForm = document.getElementById("library-filter-form");
    if (librarySearchForm) {
      librarySearchForm.addEventListener("submit", (event) => {
        event.preventDefault();
        
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
        fetchAndDisplayLibraryGames(queryParams, libraryContainer, query);
      });
    }
  } 


  // 2. DETAILS PAGE
  const detailsContainer = document.getElementById("game-details-container");
  if (detailsContainer) {
    console.log("On Details page.");
    const urlParams = new URLSearchParams(window.location.search);
    const gameSlug = urlParams.get('slug');

    if (gameSlug) {
      console.log(`Fetching details for slug: ${gameSlug}`);
      fetchAndDisplayGameDetails(gameSlug);
      
      // Listeners are added regardless of auth state initially, 
      // but only work if logged in (checked inside functions)
      document.getElementById("btn-status-completed")?.addEventListener("click", () => {
        logGameStatus(gameSlug, "Completed");
      });
      document.getElementById("btn-status-playing")?.addEventListener("click", () => {
        logGameStatus(gameSlug, "Playing");
      });
      document.getElementById("btn-status-backlog")?.addEventListener("click", () => {
        logGameStatus(gameSlug, "Backlog"); 
      });
      
      const starRatingContainer = document.getElementById("user-star-rating");
      if (starRatingContainer) {
        auth.onAuthStateChanged(user => {
          if (user) {
            // Re-check visibility here just in case
            const actions = document.getElementById("user-action-buttons");
            if (actions) actions.classList.remove("d-none");
            loadAndHighlightSavedRating(gameSlug);
          }
        });
        
        starRatingContainer.addEventListener("click", (e) => {
          if (e.target.classList.contains("star")) {
            const rating = e.target.dataset.value;
            if (rating && currentUserId) { 
              saveGameRating(gameSlug, parseInt(rating));
              highlightStars(rating);
              starRatingContainer.dataset.currentRating = rating;
            } else if (!currentUserId) {
              alert("Please log in to save a rating.");
            }
          }
        });

        starRatingContainer.addEventListener("mouseover", (e) => {
          if (e.target.classList.contains("star")) {
            const rating = e.target.dataset.value;
            if (rating) {
              highlightStars(rating);
            }
          }
        });

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


  // 3. LOGIN PAGE
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    console.log("Login form found.");
    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const email = event.target.email.value;
      const password = event.target.password.value;
      
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
  

  // 4. REGISTRATION PAGE
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
      
      auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
          const user = userCredential.user;
          return user.updateProfile({
            displayName: username
          }).then(() => {
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
          window.location.href = "dashboard.html"; 
        })
        .catch((error) => {
          console.error("Registration failed:", error.message);
          alert(`Registration failed: ${error.message}`);
        });
    });
  } 
  

  // 5. DASHBOARD PAGE
  const dashboardContainer = document.getElementById("dashboard-container");
  if (dashboardContainer) {
    console.log("On Dashboard page.");
    
    auth.onAuthStateChanged(user => {
      if (user) {
        updateDashboardStats();
        const gameListContainer = document.getElementById("dashboard-game-list");
        if (gameListContainer) {
          console.log("Populating dashboard game list from Firestore...");
          populateUserGameList(gameListContainer); 
        }
      }
    });
  } 
  
  
  // 6. SETTINGS PAGE
  const settingsForm = document.getElementById("settings-form");
  if (settingsForm) {
    console.log("On Settings page.");
    
    // Auth listener at the top handles loading settings.

    // Add listener for the main "Save Changes" button
    settingsForm.addEventListener("submit", (event) => {
      event.preventDefault();
      saveUserSettings();
    });
    
    document.getElementById("btn-download-data")?.addEventListener("click", () => {
      alert("Download User Data button clicked!\n(This is a placeholder)");
    });
    
    document.getElementById("btn-delete-account")?.addEventListener("click", () => {
      if (confirm("Are you sure you want to delete your account? This cannot be undone!")) {
         deleteUserAccount();
      }
    });
  } 
  
}); // end DOMContentLoaded


// --- SETTINGS FUNCTIONS ---

async function loadUserSettings(user) {
    if(!user) return;
    
    // Set basic info from Auth
    document.getElementById('settings-username').value = user.displayName || "";
    document.getElementById('settings-email').value = user.email || "";
    
    // Fetch extended settings from Firestore
    try {
        const doc = await db.collection("userLogs").doc(user.uid).get();
        if(doc.exists) {
            const data = doc.data();
            const settings = data.settings || {};
            // Load notifications
            const emailNotif = document.getElementById('emailNotifications');
            const appNotif = document.getElementById('inAppNotifications');
            if(emailNotif) emailNotif.checked = settings.emailNotifications !== false; 
            if(appNotif) appNotif.checked = settings.inAppNotifications !== false; 
            
            // Load theme (radio buttons)
            if(settings.theme === 'light') {
                document.getElementById('themeLight').checked = true;
            } else {
                document.getElementById('themeDark').checked = true;
            }
        }
    } catch(error) {
        console.error("Error loading settings:", error);
    }
}

async function saveUserSettings() {
    const user = auth.currentUser;
    if(!user) return;
    
    // 1. Get Notification Settings
    const emailNotifications = document.getElementById('emailNotifications')?.checked;
    const inAppNotifications = document.getElementById('inAppNotifications')?.checked;
    
    // 2. Get Theme
    const theme = document.getElementById('themeDark').checked ? 'dark' : 'light';
    
    // 3. Get Profile Changes
    const newUsername = document.getElementById("settings-username").value;
    const newPassword = document.getElementById("settings-password")?.value;

    try {
        // Save preferences to Firestore
        await db.collection("userLogs").doc(user.uid).set({
            settings: {
                theme,
                emailNotifications,
                inAppNotifications
            }
        }, { merge: true });

        // Update profile (Username) if changed
        if(newUsername && newUsername !== user.displayName) {
             console.log("Updating username...");
             await updateProfile(newUsername);
        }
        
        // Update Password if provided
        if (newPassword && newPassword.length > 0) {
             if (newPassword.length >= 6) {
                 console.log("Updating password...");
                 await user.updatePassword(newPassword);
                 alert("Password updated successfully.");
                 document.getElementById("settings-password").value = ""; // Clear field
             } else {
                 alert("Password must be at least 6 characters.");
                 return; // Stop if password is invalid
             }
        }
        
        alert("Settings saved successfully!");
    } catch(error) {
        console.error("Error saving settings:", error);
        // Handle "Requires recent login" error specifically
        if(error.code === 'auth/requires-recent-login') {
            alert("For security, please log out and log back in to change your password.");
        } else {
            alert(`Failed to save settings: ${error.message}`);
        }
    }
}

async function updateProfile(newUsername) {
    const user = auth.currentUser;
    if(!user) return;
    try {
        await user.updateProfile({ displayName: newUsername });
        await db.collection("userLogs").doc(user.uid).update({ username: newUsername });
    } catch(error) {
        console.error("Error updating profile:", error);
        throw error; // Re-throw to be caught in saveUserSettings
    }
}

async function deleteUserAccount() {
    const user = auth.currentUser;
    if(!user) return;
    
    try {
        // Delete Firestore Data
        await db.collection("userLogs").doc(user.uid).delete();
        
        // Delete Auth User
        await user.delete();
        
        alert("Account deleted. Redirecting to home.");
        window.location.href = "home.html";
        
    } catch(error) {
        console.error("Error deleting account:", error);
        alert("Failed to delete account. You may need to re-login to perform this sensitive action.");
    }
}


// --- FIRESTORE HELPER FUNCTIONS ---

function getUserGamesCollection() {
  if (!currentUserId) {
    console.log("Not logged in, cannot get user collection.");
    return null;
  }
  return db.collection("userLogs").doc(currentUserId).collection("games");
}

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

async function logGameStatus(gameSlug, status) {
  const gamesCollection = getUserGamesCollection();
  if (!gamesCollection) {
    alert("You must be logged in to log a game!");
    return;
  }
  
  const gameData = {
    slug: gameSlug,
    status: status,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
  };
  
  try {
    await gamesCollection.doc(gameSlug).set(gameData, { merge: true });
    alert(`Game saved as '${status}'! It will now appear on your dashboard.`);
  } catch (error) {
    console.error("Error saving game status:", error);
    alert(`Error saving status: ${error.message}`);
  }
}

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
    await gamesCollection.doc(gameSlug).set(gameData, { merge: true });
    alert(`Game rating saved as ${rating} stars!`);
  } catch (error) {
    console.error("Error saving game rating:", error);
    alert(`Error saving rating: ${error.message}`);
  }
}

async function removeGameFromLog(gameSlug) {
  const gamesCollection = getUserGamesCollection();
  if (!gamesCollection) {
    alert("You must be logged in to remove a game!");
    return;
  }

  try {
    await gamesCollection.doc(gameSlug).delete();
    console.log(`Removed game: ${gameSlug}`);
    
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

function highlightStars(rating) {
  const stars = document.querySelectorAll("#user-star-rating .star");
  stars.forEach(star => {
    if (star.dataset.value <= rating) {
      star.classList.add("selected");
    } else {
      star.classList.remove("selected");
    }
  });
}

async function loadAndHighlightSavedRating(gameSlug) {
  const game = await getLoggedGame(gameSlug);
  const savedRating = game ? game.rating : 0;
  
  const starRatingContainer = document.getElementById("user-star-rating");
  if(starRatingContainer) {
    starRatingContainer.dataset.currentRating = savedRating;
  }
  
  highlightStars(savedRating);
}


// --- API HELPER FUNCTIONS ---

async function populateUserGameList(container) {
  const gamesCollection = getUserGamesCollection();
  if (!gamesCollection) {
    container.innerHTML = `<p class="text-center text-white-50">Error: Not logged in.</p>`;
    return;
  }

  try {
    container.innerHTML = `<p class="text-center text-white-50">Loading your logged games...</p>`;
    
    const snapshot = await gamesCollection.get();
    
    if (snapshot.empty) {
      container.innerHTML = `<p class="text-center text-white-50">You haven't logged any games yet. Go to the <a href="library.html" class="text-white">Games</a> page to find some!</p>`;
      return;
    }

    const loggedGames = snapshot.docs.map(doc => doc.data());
    
    const gamePromises = loggedGames.map(game => 
      fetch(`${BASE_URL}/games/${game.slug}?key=${getApiKey()}`)
        .then(response => {
          if (!response.ok) {
            console.error(`API Error for ${game.slug}: ${response.status}`);
            return null; 
          }
          return response.json();
        })
        .then(gameData => {
          if (gameData) {
            gameData.savedStatus = game.status;
            gameData.userRating = game.rating;
          }
          return gameData;
        })
    );
    
    let games = await Promise.all(gamePromises);
    games = games.filter(game => game !== null);
    
    // Client-side filter for inappropriate content
    games = games.filter(game => {
        if (game.name.toLowerCase().includes('hentai')) return false;
        return true;
    });

    console.log("Dashboard/Local Games Data:", games);
    
    container.innerHTML = ""; 
    
    const row = document.createElement("div");
    row.className = "row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4";
    
    games.forEach(game => {
      row.appendChild(createGameCard(game, game.savedStatus, game.userRating, true));
    });
    
    container.appendChild(row);
    
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

async function fetchAndDisplayGameDetails(gameSlug) {
  const container = document.getElementById("game-details-container");
  try {
    const response = await fetch(`${BASE_URL}/games/${gameSlug}?key=${getApiKey()}`);
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    const game = await response.json();
    console.log("Game Details Data:", game);

    const coverArt = document.getElementById("game-cover-art");
    const gameTitle = document.getElementById("game-title");
    const gameInfo = document.getElementById("game-info");
    const gameDescription = document.getElementById("game-description");
    
    document.title = `Beat the Backlog - ${game.name}`;
    
    if (coverArt) {
      coverArt.src = game.background_image || "https://placehold.co/600x800/222/888?text=No+Image";
      coverArt.alt = game.name;
    }
    
    if (gameTitle) {
      gameTitle.textContent = game.name;
    }
    if (gameInfo) {
      const releaseDate = game.released ? new Date(game.released).toLocaleDateString() : "N/A";
      const publisher = game.publishers.length > 0 ? game.publishers[0].name : "N/A";
      const developer = game.developers.length > 0 ? game.developers[0].name : "N/A";
      const genre = game.genres.length > 0 ? game.genres[0].name : "N/A";
      gameInfo.textContent = `${publisher} | ${developer} | ${genre} | ${releaseDate}`;
    }
    if (gameDescription) {
      gameDescription.innerHTML = game.description || "No description available.";
    }
    
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

function createGameCard(game, status, userRating, showRemoveButton = false) {
  const col = document.createElement("div");
  col.className = "col";

  const imageUrl = game.background_image || "https://placehold.co/600x400/222/888?text=No+Image";
  
  let ratingText = "Not rated";
  if (userRating > 0) {
    ratingText = `${userRating} ★ (Your Rating)`;
  }

  let statusBadge = "";
  if (status) {
    let badgeClass = "bg-secondary";
    if (status === "Completed") badgeClass = "bg-success";
    if (status === "Playing") badgeClass = "bg-primary";
    if (status === "Backlog") badgeClass = "bg-warning text-dark";
    
    statusBadge = `<span class="badge ${badgeClass} position-absolute top-0 start-0 m-2">${status}</span>`;
  }

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

async function updateDashboardStats() {
  const gamesCollection = getUserGamesCollection();
  if (!gamesCollection) {
    console.log("Cannot update stats, user not logged in.");
    return;
  }
  
  try {
    const snapshot = await gamesCollection.get();
    const games = snapshot.docs.map(doc => doc.data());
    
    const completed = games.filter(g => g.status === "Completed").length;
    const playing = games.filter(g => g.status === "Playing").length;
    const backlog = games.filter(g => g.status === "Backlog").length;
    
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

async function fetchPlatforms() {
  try {
    console.log("Fetching platforms...");
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

async function populateFilterDropdowns() {
  const platformFilter = document.getElementById("platformFilter");
  if (!platformFilter) return;

  platformFilter.innerHTML = '<option value="">All Platforms</option>';

  const platforms = await fetchPlatforms();

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
      option.value = platform.id;
      option.textContent = platform.name;
      platformFilter.appendChild(option);
    });
  }
}