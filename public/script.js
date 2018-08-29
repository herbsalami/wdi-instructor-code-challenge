"use strict";
(() => {
	// Declare our lobal variables to help manage the different states of the page.
	let movies, searchTerms, page, totalResults;

	/*	
		Search function to initate our fetch request to OMDB API.
		Because OMDB's response is paginated (responds with a maximum of 10 results at a time),
		we need to prepare our app to keep track of which page of results we are on, 
		and be able to request the next page of results, should a user want to see more.
		Since this function only runs for the first request, we set the global page variable to 1.
		We want our search terms to persist, in case a user accidentally types something else into the search bar,
		but wants to continue to the next page of the previously searched term(s), 
		so we save the search term as a global variable. The total number of results is also important,
		as we do not want to display a "next" or "previous" page option if our last response was the final or first page, respectively.
	*/
	const search = (terms) => {
		page = 1;
		searchTerms = terms;
		fetch(`https://omdbapi.com/?apikey=251ae3b0&s=${searchTerms}&page=${page}`)
		.then(response => response.json())
		.then((json) => {
			totalResults = parseInt(json.totalResults);
			movies = json.Search;
			displayResults(movies);
		})
	}

	/* 	
		Function to display a modal confirming that a favorite was added, 
		and then hide the modal automatically after 3 seconds, if it wasn't already closed by the user.
	*/

	const displayConfirmation = (name) => {
		displayModal({Added: name});
		setTimeout(hideModal, 3000);
	}

	/*
		Our handler function for a user clicking the "favorite" button.
		We refer to the movie in our global "movies" array with the associated ID of the movie the user clicked,
		in order to find the title of that movie, 
		and then supply the name of that movie to the displayConfirmation function so that it can better describe the action.
	*/

	const handleFavorite = (element) => {
		fetch('/favorites', {
			method: 'POST',
			headers: {
	            "Content-Type": "application/json; charset=utf-8",
	        },
			body: JSON.stringify({
				name: movies.find(el => el.imdbID === element.dataset.id).Title,
				oid: element.dataset.id
			})
		}).then(response => response.json())
		.then((json) => {
			displayConfirmation(json.pop().name);
		})
	}

	//	Our function to format movie information from search results into a DOM element for display.

	const formatResult = (result) => {
		return `<div class="movie-item" data-id=${result.imdbID}>
					<div class="poster" style="background-image: url(${result.Poster})"> 
						<div class="favorite-button"> &#9734; Favorite &#9734; </div>
					</div>
					<h4> ${result.Title} </h4>
				</div>`;
	}

	//	Our function to format movie information from search results into a DOM element for display.

	const formatFavorite = (favorite) => {
		return `<div class="movie-item" data-id=${favorite.oid}>
					<h4> ${favorite.name} </h4>
				</div>`;
	}

	/* 
		Handler function for the 'Ratings' property of OMDB's response object for a specific movie title.
		Since the ratings property is an array,
		we must iterate through the array and format each rating as a list item.
	*/

	const handleRatings = (ratings) => {
		let displayed = '';
		for(let i = 0; i < ratings.length; i++) {
			displayed += `<li>${ratings[i].Source}: ${ratings[i].Value}</li>`
		}
		return displayed;
	}

	/*
		Function to format the specific information retrieved for a movie.
		We check each property for special cases wherein we may need to display information differently.
		For example, the 'Response' property is not useful to the user,
		as it only communicates that the response object was correctly sent.
	*/

	const displayInfo = (info) => {
		let displayed = '';
		for(let prop in info) {
			if(prop === 'Ratings') {
				displayed += `<div class="info-item">${prop}: <ul> ${handleRatings(info[prop])} </ul> </div>`;
			}
			else if(prop === 'Response' || prop === 'Poster') {
				displayed += '';
			}
			else {
				displayed += `<div class="info-item">${prop}: ${prop === "BoxOffice" ? decodeURIComponent(info[prop]) : info[prop]} </div>`;
			}
		}
		return displayed;
	}

	//	Our function to display (show) the modal in front of the rest of the page

	const displayModal = (info) => {
		const modal = document.querySelector('#modal');
		modal.style.display = 'flex';
		modal.innerHTML = `<div id="modal-content"> ${displayInfo(info)} </div>`;
	}

	//	Our fetch function to grab information about a specific movie from the OMDB API.

	const getInfo = (item) => {
		fetch(`http://omdbapi.com/?apikey=251ae3b0&i=${item.dataset.id}`)
		.then(response => response.json())
		.then((json) => {
			displayModal(json);
		})
	}

	// Function to reset the page to the default view in order to prepare for the 'Favorites' view.

	const resetPage = () => {
		document.querySelector('resultsContainer').innerHTML = '';
		document.querySelector('#next-page').style.display = 'none';
		document.querySelector('#previous-page').style.display = 'none';
	}

	/*
		Our function to display favorites to the user.
		First, we remove pagination buttons and any displayed search results,
		then we append each favorite to the results container
	*/

	const displayFavorites = (favorites) => {
		resetPage();
		favorites.forEach((favorite) => {
			document.querySelector('resultsContainer').innerHTML += ((formatFavorite(favorite)));
		})

	}

	/*
		Function to display the results of a movie search.
		First, we reset the page.
		Then, we iterate through the results, formatting them and adding them to the results container.
		Then, we add an event listener to each item, listening for the user clicking on it.
		Depending on which component of the movie item is clicked, 
		we either get the info about that movie from OMDB or add the movie to our favorites. 
		Finally, we check the pagination given our result metrics, 
		in case we need to display the option to fetch the next or previous page of results.
	*/

	const displayResults = (results) => {
		resetPage();
		results.forEach((result) => {
			document.querySelector('resultsContainer').innerHTML += ((formatResult(result)));
		});
		document.querySelectorAll('.movie-item').forEach((item) => {
			item.addEventListener('click', (e) => {

				switch (e.target.className) {
					case 'movie-item':
						getInfo(e.target);
						break;
					case 'favorite-button':
						handleFavorite(e.path[2]);
						break;
					default: 
						getInfo(e.path[1]);
				}
			});
		});
		checkPagination();
	}

	/* 
		Function to fetch more results from the last searched term.
		We set the new page number to either the previous or next page, 
		depending on which button was clicked. Then, we fetch and display the results.
	*/

	const fetchMore = (target) => {
		page = target.id === 'next-page' ? page + 1 : page - 1;
		fetch(`https://omdbapi.com/?apikey=251ae3b0&s=${searchTerms}&page=${page}`)
		.then(response => response.json())
		.then((json) => {
			movies = json.Search;
			displayResults(movies);
		})
	}

	// Function to show the next or previous page button to the user.

	const paginate = (direction) => {
		document.querySelector(`#${direction}-page`).style.display = 'block';
	}

	// Function to hide the next or previous page button from the user.

	const dePaginate = (direction) => {
		document.querySelector(`#${direction}-page`).style.display = 'none';
	}

	/*
		Function to check whether or not we need to add/remove page buttons, 
		given our global result metrics.
		If the number of previous pages * 10 + the number of results on the current page are less than the total results,
		we need to show the 'next' button. If not, we need to make sure that we hide it.
		If we are on any page other than the first page, we need to show the 'previous' button.
		Otherwise, we make sure it is hidden.
	*/

	const checkPagination = () => {
		if((page - 1) * 10 + movies.length < totalResults) {
			paginate('next');
		}
		else {
			dePaginate('next');
		}
		if(page > 1) {
			paginate('previous');
		}
		else {
			dePaginate('previous');
		}
	}

	// Function to hide the modal display

	const hideModal = () => {
		document.getElementById('modal').style.display = 'none';
	}

	// Function to get the favorites from the backend and then display them

	const getFavorites = () => {
		fetch('/favorites')
		.then(response => response.json())
		.then((json) => {
			displayFavorites(json);
		})
	}

	/* 
		We call this function to add an event listener to the search button.
		When the user clicks the search button, the function fires, 
		which will call our 'search' function, supplying it the value of the search box.
	*/

	document.querySelector('#search-trigger').addEventListener('click', () => {
		search(document.querySelector('#search-term').value);
	});

	/*
		We call this function to add an event listener to each navigation button for pagination.
		When one of the buttons is clicked, 
		the 'fetchMore' function is called with the clicked element as its argument.
	*/

	document.querySelectorAll('.page-nav').forEach((element) => {
		element.addEventListener('click', (e) => {
			fetchMore(e.target);
		});
	});

	/*
		We call this function to add an event listener to the entire modal. 
		When clicked (and if it is determined that the clicked element is the modal itself, i.e. outside the content box),
		we hide the modal.
	*/

	document.querySelector('#modal').addEventListener('click', (e) => {
		if(e.target == document.getElementById('modal')) {
			hideModal();
		}
	});

	/*
		We call this function to add an event listener to the 'favorites' button.
		When clicked, we fetch our favorites from the backend.
	*/

	document.querySelector('#favorites-trigger').addEventListener('click', getFavorites);
})();
