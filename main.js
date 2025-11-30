// --- CONFIG ---
const API_KEY = "28e720e21cc54874bf2635856736548e";
const BASE_URL = "https://api.rawg.io/api";

//
// --- 1. FIREBASE CONFIG (COMPLETED) ---
//
// I've pasted your specific config object here.
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
// We use 'let' because they are initialized after the scripts load
let app;
let auth;
let db;
let currentUserId = null; // The unique ID of the currently logged-in user

// --- MAIN CODE EXECUTION ---
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded and parsed");

  try {
    // --- 2. INITIALIZE FIREBASE ---
    // We use the "compat" version, which is loaded from the scripts in your HTML
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    console.log("Firebase initialized.");
    
    // --- 3. AUTH STATE LISTENER ---
    // This is the most important listener. It runs on *every* page load
    // and checks if a user is logged in or out.
    auth.onAuthStateChanged(user => {
      const loggedInNav = document.getElementById("nav-logged-in");
      const loggedOutNav = document.getElementById("nav-logged-out");
      const userActions = document.getElementById("user-actions"); // On details page
      const dashboardContainer = document.getElementById("dashboard-container");

      if (user) {
        // --- USER IS LOGGED IN ---
        console.log("User is LOGGED IN:", user.uid);
        currentUserId = user.uid; // Store the user's ID globally

        // Update Navbar
        if (loggedInNav) loggedInNav.classList.remove("d-none");
        if (loggedOutNav) loggedOutNav.classList.add("d-none");
        
        // Show user-specific buttons on details page
        const userActionButtons = document.getElementById("user-action-buttons");
        if (userActionButtons) userActionButtons.classList.remove("d-none");
        
        // Populate username on dashboard
        const usernameEl = document.getElementById("dashboard-username");
        if (usernameEl) {
          // --- UPDATED ---
          // Use the saved displayName first, fall back to email
          usernameEl.textContent = user.displayName || user.email.split('@')[0];
        }

      } else {
        // --- USER IS LOGGED OUT ---
        console.log("User is LOGGED OUT");
        currentUserId = null;

        // Update Navbar
        if (loggedInNav) loggedInNav.classList.add("d-none");
        if (loggedOutNav) loggedOutNav.classList.remove("d-none");

        // Hide user-specific buttons on details page
        const userActionButtons = document.getElementById("user-action-buttons");
        if (userActionButtons) userActionButtons.classList.add("d-none");
        
        // If on dashboard, show "logged out" message
        if (dashboardContainer) {
          dashboardContainer.innerHTML = `<h2 class="text-center text-white-50">Please <a href="login.html">log in</a> to view your dashboard.</h2>`;
        }
      }
    });

  } catch (error) {
    console.error("Firebase initialization failed:", error);
    // You could show a "site down" message here
  }

  // --- Global Listeners (for logged-in users) ---
  
  // 1. Navbar Search (for both logged-in and logged-out states)
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

  // 2. Log a Game Button
  const logAGameBtn = document.getElementById("log-a-game-btn");
  if (logAGameBtn) {
    logAGameBtn.addEventListener("click", (event) => {
      event.preventDefault();
      window.location.href = "library.html";
    });
  }

  // 3. Logout Button
  const logoutButton = document.getElementById("logout-button");
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      auth.signOut().then(() => {
        console.log("User logged out.");
        window.location.href = "home.html"; // Redirect to home on logout
      }).catch((error) => {
        console.error("Logout failed:", error);
      });
    });
  }


  // --- Page-Specific Logic ---
  // We check for elements *before* adding listeners

  // 1. Check if we are on the LIBRARY page
  const libraryContainer = document.getElementById("game-library-display");
  if (libraryContainer) {
    console.log("On Library page.");
    populateFilterDropdowns(); // Populate platform filter
    
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('search');
    let initialParams = `&page_size=20`;
    let loadingQuery = null; // --- NEW ---

    if (searchQuery) {
      console.log(`Searching for: ${searchQuery}`);
      // --- UPDATED: Added search_exact=true ---
      initialParams += `&search=${encodeURIComponent(searchQuery)}&search_exact=true`;
      loadingQuery = searchQuery; // --- NEW ---
      const searchInput = document.getElementById("searchInput");
      if(searchInput) searchInput.value = searchQuery;
    } else {
      console.log("Populating default game list...");
      initialParams += `&ordering=-rating`;
    }
    
    // --- UPDATED: Pass loadingQuery to the function ---
    fetchAndDisplayLibraryGames(initialParams, libraryContainer, loadingQuery);

    // Add listener for the IN-PAGE search/filter form
    const librarySearchForm = document.getElementById("library-filter-form");
    if (librarySearchForm) {
      librarySearchForm.addEventListener("submit", (event) => {
        event.preventDefault();
        
        let queryParams = `&page_size=20`;
        const query = document.getElementById("searchInput").value;
        if (query) {
          // --- UPDATED: Added search_exact=true ---
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
        // --- UPDATED: Pass the query to show the correct loading message ---
        fetchAndDisplayLibraryGames(queryParams, libraryContainer, query);
      });
    }
  } // end if(libraryContainer)


  // 2. Check if we are on the DETAILS page
  const detailsContainer = document.getElementById("game-details-container");
  if (detailsContainer) {
    console.log("On Details page.");
    const urlParams = new URLSearchParams(window.location.search);
    const gameSlug = urlParams.get('slug');

    if (gameSlug) {
      console.log(`Fetching details for slug: ${gameSlug}`);
      fetchAndDisplayGameDetails(gameSlug);
      
      // Add listeners to our status buttons
      document.getElementById("btn-status-completed")?.addEventListener("click", () => {
        logGameStatus(gameSlug, "Completed");
      });
      document.getElementById("btn-status-playing")?.addEventListener("click", () => {
        logGameStatus(gameSlug, "Playing");
      });
      document.getElementById("btn-status-backlog")?.addEventListener("click", () => {
        logGameStatus(gameSlug, "Backlog"); // This is the "Log this Game" button
      });
      
      const starRatingContainer = document.getElementById("user-star-rating");
      if (starRatingContainer) {
        // We must wait for auth to know if we should load the rating
        auth.onAuthStateChanged(user => {
          if (user) {
            loadAndHighlightSavedRating(gameSlug);
          }
        });
        
        starRatingContainer.addEventListener("click", (e) => {
          if (e.target.classList.contains("star")) {
            const rating = e.target.dataset.value;
            if (rating && currentUserId) { // Only save if logged in
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
  } // end if(detailsContainer)


  // 3. Check if we are on the LOGIN page
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    console.log("Login form found.");
    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const email = event.target.email.value;
      const password = event.target.password.value;
      
      auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
          // Signed in
          console.log("User logged in:", userCredential.user.uid);
          window.location.href = "dashboard.html"; // Redirect to dashboard
        })
        .catch((error) => {
          console.error("Login failed:", error.message);
          alert(`Login failed: ${error.message}`);
        });
    });
  } // end if(loginForm)
  

  // 4. Check if we are on the REGISTRATION page
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
          // Signed up
          const user = userCredential.user;
          console.log("New user created:", user.uid);

          // --- NEW: Save the username to their Auth profile ---
          return user.updateProfile({
            displayName: username
          }).then(() => {
            // --- NEW: Also save it to their Firestore document ---
            db.collection("userLogs").doc(user.uid).set({
              userId: user.uid,
              username: username, // Save the username
              email: email, // Save the email
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
          });
        })
        .then(() => {
          alert("Registration successful! Welcome!");
          // Redirect to dashboard since they are now logged in
          window.location.href = "dashboard.html"; 
        })
        .catch((error) => {
          console.error("Registration failed:", error.message);
          alert(`Registration failed: ${error.message}`);
        });
    });
  } // end if(registrationForm)
  

  // 5. Check if we are on the DASHBOARD page
  const dashboardContainer = document.getElementById("dashboard-container");
  if (dashboardContainer) {
    console.log("On Dashboard page.");
    
    // Auth listener handles showing/hiding content,
    // but we still need to fetch data *if* the user is logged in
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
  } // end if(dashboardContainer)
  
  
  // 6. Check if we are on the SETTINGS page
  const settingsForm = document.getElementById("settings-form");
  if (settingsForm) {
    console.log("On Settings page.");

    // Populate user info when auth is ready
    auth.onAuthStateChanged(user => {
      if (user) {
        // --- UPDATED ---
        // Use the saved displayName first, fall back to email
        document.getElementById('settings-username').value = user.displayName || user.email.split('@')[0];
        document.getElementById('settings-email').value = user.email;
      } else {
        // If user is not logged in, show a message
        const mainContainer = document.querySelector(".container.my-5");
        if (mainContainer) {
            mainContainer.innerHTML = `<h2 class="text-center text-white-50">Please <a href="login.html">log in</a> to view your settings.</h2>`;
        }
      }
    });

    // Add listener for the main "Save Changes" button
    settingsForm.addEventListener("submit", (event) => {
      event.preventDefault();
      
      // Read values from the form (placeholders)
      const theme = document.getElementById('themeDark').checked ? 'dark' : 'light';
      const emailNotifications = document.getElementById('emailNotifications').checked;
      const inAppNotifications = document.getElementById('inAppNotifications').checked;
      
      console.log("Settings form submitted (placeholder):");
      console.log("Theme:", theme);
      console.log("Email Notifications:", emailNotifications);
      console.log("In-App Notifications:", inAppNotifications);
      
      alert("Settings saved (check console for details)!\nThis is a placeholder.");
    });
    
    // Add placeholder listeners for other buttons
    document.getElementById("btn-edit-profile")?.addEventListener("click", () => {
      alert("Edit Profile button clicked!\n(This is a placeholder)");
    });
    
    document.getElementById("btn-change-password")?.addEventListener("click", () => {
      alert("Change Password button clicked!\n(This is a placeholder)");
    });
    
    document.getElementById("btn-download-data")?.addEventListener("click", () => {
      alert("Download User Data button clicked!\n(This is a placeholder)");
    });
    
    document.getElementById("btn-delete-account")?.addEventListener("click", () => {
      if (confirm("Are you sure you want to delete your account?\nThis is a placeholder and cannot be undone.")) {
        alert("Account deleted (placeholder)!");
      }
    });
  } // end if(settingsForm)
  

  // --- Home Page Specific Logic ---
  if (document.title === "Beat the Backlog - Home") {
    console.log("On Home page.");
    // No specific API calls needed on home load anymore
  }
  
}); // end DOMContentLoaded


// --- FIRESTORE HELPER FUNCTIONS (REPLACES LOCALSTORAGE) ---

/**
 * Gets a reference to the user's "games" subcollection in Firestore.
 * @returns {firebase.firestore.CollectionReference | null}
 */
function getUserGamesCollection() {
  if (!currentUserId) {
    console.log("Not logged in, cannot get user collection.");
    return null;
  }
  return db.collection("userLogs").doc(currentUserId).collection("games");
}

/**
 * Gets a specific logged game document from Firestore.
 * @param {string} gameSlug - The slug of the game to find.
 * @returns {Promise<object | null>} A promise that resolves to the game data or null.
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
 * Saves a game's status to Firestore. Creates/merges the doc.
 * @param {string} gameSlug - The unique ID (slug) of the game.
 * @param {string} status - The status ("Completed", "Playing", "Backlog").
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
    // Use server timestamp to track when it was logged/updated
    updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
  };
  
  try {
    // .doc(gameSlug).set(..., { merge: true }) will create OR update the doc
    await gamesCollection.doc(gameSlug).set(gameData, { merge: true });
    alert(`Game saved as '${status}'! It will now appear on your dashboard.`);
    console.log(`Firestore: Saved status for ${gameSlug}`);
  } catch (error) {
    console.error("Error saving game status:", error);
    alert(`Error saving status: ${error.message}`);
  }
}

/**
 * Saves a game's rating to Firestore. Creates/merges the doc.
 * @param {string} gameSlug - The unique ID (slug) of the game.
 * @param {number} rating - The rating (1-5).
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
    await gamesCollection.doc(gameSlug).set(gameData, { merge: true });
    alert(`Game rating saved as ${rating} stars!`);
    console.log(`Firestore: Saved rating for ${gameSlug}`);
  } catch (error) {
    console.error("Error saving game rating:", error);
    alert(`Error saving rating: ${error.message}`);
  }
}

/**
 * Removes a game from the user's Firestore log.
 * @param {string} gameSlug - The slug of the game to remove.
 */
async function removeGameFromLog(gameSlug) {
  const gamesCollection = getUserGamesCollection();
  if (!gamesCollection) {
    alert("You must be logged in to remove a game!");
    return;
  }

  try {
    await gamesCollection.doc(gameSlug).delete();
    console.log(`Removed game: ${gameSlug}`);
    
    // Refresh the dashboard list and stats
    const gameListContainer = document.getElementById("dashboard-game-list");
    if (gameListContainer) {
      populateUserGameList(gameListContainer); // Refresh list
    }
    updateDashboardStats(); // Update counts
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

/**
 * Loads the saved rating from Firestore and highlights the stars.
 * @param {string} gameSlug - The unique ID (slug) of the game.
 */
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

/**
 * Populates the dashboard with games saved in Firestore.
 * @param {HTMLElement} container - The container to display the games in.
 */
async function populateUserGameList(container) {
  const gamesCollection = getUserGamesCollection();
  if (!gamesCollection) {
    container.innerHTML = `<p class="text-center text-white-50">Error: Not logged in.</p>`;
    return;
  }

  try {
    container.innerHTML = `<p class="text-center text-white-50">Loading your logged games...</p>`;
    
    // 1. Get all logged game documents from Firestore
    const snapshot = await gamesCollection.get();
    
    if (snapshot.empty) {
      container.innerHTML = `<p class="text-center text-white-50">You haven't logged any games yet. Go to the <a href="library.html" class="text-white">Games</a> page to find some!</p>`;
      return;
    }

    const loggedGames = snapshot.docs.map(doc => doc.data());
    
    // 2. Create an array of fetch promises to get full game details from RAWG
    const gamePromises = loggedGames.map(game => 
      fetch(`${BASE_URL}/games/${game.slug}?key=${API_KEY}`)
        .then(response => {
          if (!response.ok) {
            console.error(`API Error for ${game.slug}: ${response.status}`);
            return null; // Skip if API fails for one game
          }
          return response.json();
        })
        .then(gameData => {
          // Re-attach our saved data (status, rating) to the API data
          if (gameData) {
            gameData.savedStatus = game.status;
            gameData.userRating = game.rating;
          }
          return gameData;
        })
    );
    
    let games = await Promise.all(gamePromises);
    games = games.filter(game => game !== null); // Filter out any failed fetches
    
    console.log("Dashboard/Local Games Data:", games);
    
    container.innerHTML = ""; // Clear loading message
    
    const row = document.createElement("div");
    row.className = "row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4";
    
    games.forEach(game => {
      // Pass 'true' to createGameCard to tell it to add a remove button
      row.appendChild(createGameCard(game, game.savedStatus, game.userRating, true));
    });
    
    container.appendChild(row);
    
    // 3. After cards are added, find all remove buttons and add listeners
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
 * Fetches and displays games in the library based on a query string.
 * @param {string} queryParams - The full query string for the API call (e.g., "&search=...").
 * @param {HTMLElement} container - The container to display the games in.
 * @param {string | null} loadingQuery - The search term, if any, for the loading message.
 */
async function fetchAndDisplayLibraryGames(queryParams, container, loadingQuery = null) {
  try {
    // --- UPDATED: Use dynamic loading message ---
    const loadingMessage = loadingQuery 
      ? `Searching for '${loadingQuery}'...` 
      : "Loading popular games...";
    container.innerHTML = `<h2 class="text-center text-white-50">${loadingMessage}</h2>`;
    
    const response = await fetch(`${BASE_URL}/games?key=${API_KEY}${queryParams}`);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log("Library Games Data:", data);
    
    container.innerHTML = ""; // Clear "Loading..."
    
    if (data.results.length === 0) {
      container.innerHTML = `<h2 class="text-center text-white-50">No results found.</h2>`;
      return;
    }
    
    // We must wait for auth to be ready before we can check our local data
    auth.onAuthStateChanged(async (user) => {
      // Clear the container again in case auth was slow
      container.innerHTML = "";
      
      let loggedGames = [];
      if (user) {
        // If logged in, get all their logged games *once* for comparison
        const gamesCollection = getUserGamesCollection();
        const snapshot = await gamesCollection.get();
        loggedGames = snapshot.docs.map(doc => ({ slug: doc.id, ...doc.data() }));
      }
      
      for (const game of data.results) {
        let userRating = 0;
        let status = null;

        if (user) {
          // Check our pre-fetched list
          const savedGame = loggedGames.find(g => g.slug === game.slug);
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
 * Fetches and displays the details for a single game.
 */
async function fetchAndDisplayGameDetails(gameSlug) {
  const container = document.getElementById("game-details-container");
  try {
    const response = await fetch(`${BASE_URL}/games/${gameSlug}?key=${API_KEY}`);
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
    
    // Note: loadAndHighlightSavedRating is now called *after* auth check
    // in the main DOMContentLoaded listener for this page.
    
  } catch (error) {
    console.error(`Failed to fetch game details: ${error}`);
    if (container) {
        container.innerHTML = `<p class="text-danger text-center fs-3">Failed to load game details. ${error.message}</p>`;
    }
  }
}

/**
 * Creates a Bootstrap card HTML element for a single game.
 * @param {object} game - A game object from the RAWG API.
 * @param {string} [status] - Optional status (e.g., "Completed")
 * @param {number} [userRating] - Optional user rating (1-5)
 * @param {boolean} [showRemoveButton] - Optional, if true, adds a remove button
 * @returns {HTMLElement} A div element formatted as a Bootstrap card.
 */
function createGameCard(game, status, userRating, showRemoveButton = false) {
  const col = document.createElement("div");
  col.className = "col";

  const imageUrl = game.background_image || "https://placehold.co/600x400/222/888?text=No+Image";
  
  let ratingText = "Not rated";
  if (userRating > 0) {
    ratingText = `${userRating} ★ (Your Rating)`;
  }
  // This version no longer shows community rating

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
    // We use currentTarget, so we must make the slug part of the button itself
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


/**
 * Counts logged games from Firestore and updates the dashboard stats.
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
    
    // Calculate stats
    const completed = games.filter(g => g.status === "Completed").length;
    const playing = games.filter(g => g.status === "Playing").length;
    const backlog = games.filter(g => g.status === "Backlog").length;
    
    // Find elements
    const elCompleted = document.getElementById("stats-completed");
    const elPlaying = document.getElementById("stats-playing");
    const elBacklog = document.getElementById("stats-backlog");
    
    // Update text
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
 * Fetches all platforms from the API.
 */
async function fetchPlatforms() {
  try {
    console.log("Fetching platforms...");
    const response = await fetch(`${BASE_URL}/platforms?key=${API_KEY}&page_size=20`); 
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
 * Populates the filter dropdowns on the library page.
 */
async function populateFilterDropdowns() {
  const platformFilter = document.getElementById("platformFilter");
  if (!platformFilter) return;

  // Clear any existing options (like "All Platforms")
  platformFilter.innerHTML = '<option value="">All Platforms</option>';

  const platforms = await fetchPlatforms();

  if (platforms.length > 0) {
    // We only care about the main parent platforms for a clean filter
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