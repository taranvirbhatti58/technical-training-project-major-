// API Configuration
const API_KEY = 'YOUR_API_KEY'; // Replace with your OMDb API key
const API_URL = 'https://www.omdbapi.com/?apikey=' + API_KEY;

// DOM Elements
const movieSearchInput = document.getElementById('movieSearch');
const searchBtn = document.getElementById('searchBtn');
const resultsContainer = document.getElementById('resultsContainer');
const loadingSpinner = document.getElementById('loadingSpinner');
const errorMessage = document.getElementById('errorMessage');
const controlsSection = document.getElementById('controlsSection');
const sortSelect = document.getElementById('sortSelect');
const recommendationsSection = document.getElementById('recommendationsSection');
const recommendationsContainer = document.getElementById('recommendationsContainer');

// State Management
let currentMovies = [];
let currentSearchTerm = '';

// Event Listeners
searchBtn.addEventListener('click', handleSearch);
movieSearchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSearch();
    }
});

sortSelect.addEventListener('change', handleSort);

// Main Search Handler
async function handleSearch() {
    const searchTerm = movieSearchInput.value.trim();
    
    // Validate input
    if (!searchTerm) {
        showError('Please enter a movie title to search.');
        return;
    }

    // Reset state
    hideError();
    currentSearchTerm = searchTerm;
    currentMovies = [];
    resultsContainer.innerHTML = '';
    recommendationsContainer.innerHTML = '';
    recommendationsSection.classList.add('hidden');
    controlsSection.classList.add('hidden');

    // Show loading spinner
    showLoading();

    try {
        // Search for movies
        const searchResults = await searchMovies(searchTerm);
        
        if (searchResults && searchResults.length > 0) {
            currentMovies = searchResults;
            displayMovies(searchResults);
            controlsSection.classList.remove('hidden');
            
            // Fetch recommendations
            fetchRecommendations(searchResults[0]);
        } else {
            showError('Movie not found. Please try another title.');
        }
    } catch (error) {
        console.error('Search error:', error);
        showError('An error occurred while searching. Please try again later.');
    } finally {
        hideLoading();
    }
}

// Search Movies Function
async function searchMovies(searchTerm) {
    try {
        const response = await fetch(`${API_URL}&s=${encodeURIComponent(searchTerm)}&type=movie`);
        
        if (!response.ok) {
            throw new Error('API request failed');
        }

        const data = await response.json();

        if (data.Response === 'False') {
            return null;
        }

        // Fetch detailed information for each movie
        const moviePromises = data.Search.map(movie => getMovieDetails(movie.imdbID));
        const detailedMovies = await Promise.all(moviePromises);
        
        return detailedMovies.filter(movie => movie !== null);
    } catch (error) {
        console.error('Search movies error:', error);
        throw error;
    }
}

// Get Movie Details
async function getMovieDetails(imdbID) {
    try {
        const response = await fetch(`${API_URL}&i=${imdbID}&plot=full`);
        
        if (!response.ok) {
            throw new Error('API request failed');
        }

        const data = await response.json();

        if (data.Response === 'False') {
            return null;
        }

        return {
            imdbID: data.imdbID,
            title: data.Title,
            year: data.Year,
            genre: data.Genre || 'N/A',
            plot: data.Plot || 'No description available.',
            rating: data.imdbRating !== 'N/A' ? parseFloat(data.imdbRating) : 0,
            poster: data.Poster !== 'N/A' ? data.Poster : null,
            type: data.Type
        };
    } catch (error) {
        console.error('Get movie details error:', error);
        return null;
    }
}

// Display Movies
function displayMovies(movies) {
    resultsContainer.innerHTML = '';

    if (!movies || movies.length === 0) {
        return;
    }

    movies.forEach(movie => {
        const movieCard = createMovieCard(movie);
        resultsContainer.appendChild(movieCard);
    });
}

// Create Movie Card Element
function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';

    const posterHTML = movie.poster 
        ? `<img src="${movie.poster}" alt="${movie.title}" onerror="this.parentElement.innerHTML='<div style=\'display:flex;align-items:center;justify-content:center;height:100%;color:white;font-size:0.9rem;text-align:center;padding:20px;\'>Poster Not Available</div>'">`
        : '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:white;font-size:0.9rem;text-align:center;padding:20px;">Poster Not Available</div>';

    card.innerHTML = `
        <div class="movie-poster">
            ${posterHTML}
        </div>
        <div class="movie-info">
            <h3 class="movie-title">${movie.title}</h3>
            <div class="movie-meta">
                <span class="movie-year">${movie.year}</span>
                <span class="movie-genre">${movie.genre}</span>
                ${movie.rating > 0 ? `<span class="movie-rating">⭐ ${movie.rating.toFixed(1)}</span>` : '<span class="movie-rating">⭐ N/A</span>'}
            </div>
            <p class="movie-plot">${movie.plot}</p>
        </div>
    `;

    return card;
}

// Handle Sorting
function handleSort() {
    const sortValue = sortSelect.value;
    let sortedMovies = [...currentMovies];

    switch (sortValue) {
        case 'year-asc':
            sortedMovies.sort((a, b) => {
                const yearA = parseInt(a.year) || 0;
                const yearB = parseInt(b.year) || 0;
                return yearA - yearB;
            });
            break;
        case 'year-desc':
            sortedMovies.sort((a, b) => {
                const yearA = parseInt(a.year) || 0;
                const yearB = parseInt(b.year) || 0;
                return yearB - yearA;
            });
            break;
        case 'rating-asc':
            sortedMovies.sort((a, b) => a.rating - b.rating);
            break;
        case 'rating-desc':
            sortedMovies.sort((a, b) => b.rating - a.rating);
            break;
        default:
            // Keep original order
            break;
    }

    displayMovies(sortedMovies);
}

// Fetch Recommendations
async function fetchRecommendations(mainMovie) {
    if (!mainMovie || !mainMovie.genre) {
        return;
    }

    try {
        // Extract first genre for recommendations
        const firstGenre = mainMovie.genre.split(',')[0].trim();
        
        // Search for movies in the same genre
        const response = await fetch(`${API_URL}&s=${encodeURIComponent(firstGenre)}&type=movie`);
        
        if (!response.ok) {
            throw new Error('API request failed');
        }

        const data = await response.json();

        if (data.Response === 'False' || !data.Search) {
            return;
        }

        // Filter out the main movie and get up to 4 recommendations
        const recommendations = data.Search
            .filter(movie => movie.imdbID !== mainMovie.imdbID)
            .slice(0, 4);

        if (recommendations.length === 0) {
            return;
        }

        // Fetch detailed information
        const recommendationPromises = recommendations.map(movie => getMovieDetails(movie.imdbID));
        const detailedRecommendations = await Promise.all(recommendationPromises);
        const validRecommendations = detailedRecommendations.filter(movie => movie !== null);

        if (validRecommendations.length > 0) {
            displayRecommendations(validRecommendations);
            recommendationsSection.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Fetch recommendations error:', error);
        // Silently fail - recommendations are optional
    }
}

// Display Recommendations
function displayRecommendations(movies) {
    recommendationsContainer.innerHTML = '';

    movies.forEach(movie => {
        const movieCard = createMovieCard(movie);
        recommendationsContainer.appendChild(movieCard);
    });
}

// Show/Hide Loading Spinner
function showLoading() {
    loadingSpinner.classList.remove('hidden');
}

function hideLoading() {
    loadingSpinner.classList.add('hidden');
}

// Show/Hide Error Message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

function hideError() {
    errorMessage.classList.add('hidden');
}