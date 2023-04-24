import { startTimer, pauseTimer, resetTimer } from "./Timer.mjs";
import { loadVisualizer, renderFrame, context } from "./Visualizer.mjs";
import { getCurrentUserArtistList, setCurrentArtist, getCurrentArtist, setCurrentUserArtistList, setUserStatistics, getUserStatistics } from "./Session.mjs";

// DOM Variables
var player = document.getElementById('player');
player.volume = 0.2;
player.crossOrigin = "anonymous";

var lastGuessElem = document.getElementById("last-guess");
var bestGuessElem = document.getElementById("best-guess");
var averageGuessElem = document.getElementById("average-guess");

var buttonList = document.getElementById("button-list");
var addButton = document.getElementById("add-button").addEventListener("click", addArtist);
// TODO User can click button multiple times and speed up timer
// TODO Disable replay button until after 30 seconds
// TODO Decide whether replay button can be pressed during song or only after
var replayButton = document.getElementById("replay-button").addEventListener("click", replayTrack);
var revealButton = document.getElementById("reveal-button").addEventListener("click", () => {  globalGuessFlag = true; revealTrack(globalGuessFlag); });
var searchArtistInput = document.getElementById("lookup-input");
// When user presses enter in input box, call add artist function
searchArtistInput.addEventListener("keyup", ({key}) => {
    if(key === "Enter") {
        addArtist()
    }
})

var albumArt = document.getElementById("album-art");
var guessInput = document.getElementById("input-box");

// Fetch Variables
var songs = []; 
var songNames = [];
var artist = "";

// Global var
var currentSong = "";
var currentFocus;
var songIndex = 0;
var firstSongFlag = 0;
// var sessionAvg = 0;
// var guessedSongCount = 0;
var bestGuess = Number.MAX_SAFE_INTEGER;
var globalGuessFlag = false;

// Variables to keep track of the user's statistics
var userAddedArtists = []
var indexFound = 0;
var currentArtistStatisticsList = [];

//initialize visualizer
loadVisualizer(player);
renderFrame();

// Data Types
function Song(name, albumPicture, previewUrl, artistName, guess) {
    this.name = name;
    this.albumPicture = albumPicture;
    this.previewUrl = previewUrl;
    this.artistName = artistName;
    this.guess = guess;
}

function ArtistStatistics(name, attempts, bestAttempt)
{
    this.name = name;

    if(attempts.length == 0)
        this.attempts = [];
    else
        this.attempts = attempts;

    this.bestAttempt = bestAttempt;
}

async function setArtist()
{
    var usersArtist;

    // sends a GET request to grab the current artist that the user has
    usersArtist = await getCurrentArtist();
   
    // sends a GET request for the user's current list of artists
    userAddedArtists = await getCurrentUserArtistList()

    if(userAddedArtists == undefined)
        userAddedArtists = []

    // Plan: add a user's previously added artists to the drop down dynamically
    // Here just for testing purposes as of now
    if(userAddedArtists != undefined)
        userAddedArtists.forEach(addArtists);

    // user doesnt have previous artist
    if(usersArtist == "" || usersArtist == undefined)
    {
        artist = "Mac Miller";
    }
    else
    {
        artist = usersArtist;
    }

    // sends in the artist to update the webpage with the correct artist
    await fetchSongs(artist)
}

// Checks to see if the stat view is able to be updated, this guards in the case in which the user is
// new or hasn't had any attempts for the current selected artist
async function updateStatView()
{
    if(currentArtistStatisticsList.length != 0 && currentArtistStatisticsList[indexFound].attempts.length != 0)
    {
        console.log("We can update the stat view")
        bestGuessElem.innerHTML = String(currentArtistStatisticsList[indexFound].bestAttempt + " seconds");

        lastGuessElem.innerHTML = String(currentArtistStatisticsList[indexFound].attempts[currentArtistStatisticsList[indexFound].attempts.length - 1] + " seconds")
        
        averageGuessElem.innerHTML = String(Number(calculateAverage(currentArtistStatisticsList[indexFound].attempts)).toFixed(2) + " seconds");
    }
    else
        console.log("We can't update the stat view")
}

// Function that sets the statistics into the global variables. Sends a GET request for the user's
// data and checks to see if they have any data (for previous user). If they don't then initalize an 
// artistStatistics object of the default artist (for new user).
async function setArtistStatistics(artist)
{
    // grabs the user's previous statistics and sets it to the global variable
    var userStatistics = await getUserStatistics()
    currentArtistStatisticsList = userStatistics
    
    if(currentArtistStatisticsList == undefined)
    {
        currentArtistStatisticsList = []
    }

    var i;
    
    // iterates through the list of artistStatistic objects to find the current artist. if
    // the current artist is found, then set the working 'statistics' variable to it. else
    // create a new object for the artist and add it to the list
    if(currentArtistStatisticsList.length != 0)
    {
        for(i = 0; i < currentArtistStatisticsList.length; i++)
        {
            if(currentArtistStatisticsList[i].name === artist)
            {
                console.log("Artist object exists")
                indexFound = i
                return
            }
        }    

        console.log("Creating a new object")
        currentArtistStatisticsList.push(new ArtistStatistics(artist, [], 0))
    }   
    else
    {
        console.log("List is empty initalizing the list with the default artist")
        currentArtistStatisticsList.push(new ArtistStatistics(artist, [], 0))
        i = 0;
    }

    indexFound = i;
    console.log(currentArtistStatisticsList);
}


// Function fetches data and parses based off input artist
async function fetchSongs(artistInput) {
    // Reset Game
    songs = [];
    songNames = [];
    songIndex = 0;
    player.pause();
    resetTimer();
    firstSongFlag = 1;

    artist = artistInput

    // System will update the current user's artist to the artist selected
    await setCurrentArtist(artistInput);

    // When Fetching, display loading gif
    albumArt.src = "./img/load.gif";
    albumArt.classList.remove("blur");

    // Create artist URL used for fetch
    var artistURL = "http://localhost:8888/spotify/search/artist/" + artistInput

    // Use artistURL to fetch data from Spotify's API
    fetch(artistURL)
    .then(response =>{
        if(!response.ok)
        {
            console.log('Something went wrong');
            return;
        }
        return response.json();
    })
    .then(async (response) =>{
        // After the response is received, begin to parse the default arist and generate all tracks
        await parseArtist(response);
        // Load Audio Player with all generated tracks
        await loadAudioPlayer();

        await setArtistStatistics(artist);
        
        // Updates the stat view
        if(currentArtistStatisticsList != undefined)
            await updateStatView();
    })
}

async function fetchNextTrack(song) {
    // Handles songs with | symbol messing with fetch requested
    // If song starts with | symbol, song won't load in
    let x;
    if(song.name.indexOf("|") != -1) {
        x = song.name.split("|")[0];
    }
    else {
        x = song.name;
    }
    
    fetch(`http://localhost:8888/spotify/search/track/${x}/${song.artistName}`)
    .then(async res => {
        if(!res.ok)
        {
            console.log('Something went wrong');
            return;
        }
        return await res.json();
    })
    .then(async res => {
        song.previewUrl = res.preview_url;
        await loadNextTrack(song)
    })
}

// https://stackoverflow.com/a/9229821
// Grabs first instance of song name literal and disregards the others following it
function uniqByKeepFirst(allSongs, key) {
    let seenSong = new Set();
    return allSongs.filter(item => {
        let songName = key(item);
        return seenSong.has(songName) ? false : seenSong.add(songName);
    });
}

// Passed fetch json, parse artist data and load into songs[] array
async function parseArtist(res) {
    var nonNullTrackCount = 0;
    var nullTrackCount = 0;
    var albumCount = 0;
    var allSongs = [];

    var artistParsed = res.artistData[0];

    // Parse through the JSON and iterate through the tracks of each album
    artistParsed.albums.forEach((album) => {
        album.tracks.forEach((track) => {
            // If the track exists
            if(track.previewUrl != null) {
                // Add track to songs array
                songs.push(new Song(track.name, album.albumPicture, track.previewUrl, artistParsed.name, false));

                nonNullTrackCount++;
            }
            else {
                songs.push(new Song(track.name, album.albumPicture, null, artistParsed.name, false))

                nullTrackCount++;
            }
        })
    })

    // Print out fetch data info
    console.log(artistParsed.name)
    // console.log('Album Count', albumCount);
    console.log("Total Song Count", nonNullTrackCount + nullTrackCount)
    console.log('Available Tracks', nonNullTrackCount);
    console.log('Not Available Tracks', nullTrackCount);

    console.log("All Songs Count Before Filtering", allSongs.length)
    allSongs = uniqByKeepFirst(allSongs, song => song.name)
    console.log("All Songs Count after Filtering", allSongs.length)

    console.log("Available Songs Count Before Filtering", songs.length)
    songs = uniqByKeepFirst(songs, song => song.name)
    console.log("Available Songs Count After Filtering", songs.length)

    console.log(songs)

    songs.forEach(song =>{
        songNames.push(song.name);
    })
}

// Loads audio player when songs have been loaded
async function loadAudioPlayer() {
    // Random Song Loaded
    songs = shuffle(songs);
    currentSong = songs[songIndex];

    if(currentSong.previewUrl == null) {
        await fetchNextTrack(currentSong);
    }
    else {
        loadNextTrack(currentSong);
    }
}

async function loadNextTrack(currentSong) {
    // Load into player
    player.src = currentSong.previewUrl;
    context.resume();

    // Album Art Handling
    albumArt.src = currentSong.albumPicture;
    albumArt.classList.remove("unblur");
    albumArt.classList.add("blur");
    
    // Reset guessbox input val and style
    guessInput.value = ""
    guessInput.classList.remove("invalid");
    guessInput.classList.remove("correct");
    guessInput.style.border = "solid 2px #1DB954";

    // If the first song is loaded, don't start player
    if(firstSongFlag != 1) {
        player.play();
        // When user skips song, reset timer
        resetTimer();
        startTimer();
    }
}

// https://stackoverflow.com/a/2450976
function shuffle(array) {
    let currentIndex = array.length,  randomIndex;
  
    // While there remain elements to shuffle.
    while (currentIndex != 0) {
        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
  
    return array;
}

// Audio Player Functionality
document.onkeydown = async function (e) {

    //ignore key press if user is in a text field
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }

    // Start Player by pressing 0
    if(e.code == "Digit0"){
        // If the player is paused, begin playing -- vice versa
        if (player.paused) {
            player.play();

            // loadVisualizer(player);
            // renderFrame();

            startTimer();
        }
        else {
            player.pause();
        }
        
        firstSongFlag = 0;
    }
    // Play Random Song by pressing Right Arrow Key
    if(e.code == "ArrowRight"){
        closeAllLists();
        songIndex++;
        if(songIndex >= songs.length){
            songIndex = 0;
            
            songs = shuffle(songs);
        }
        currentSong = songs[songIndex];

        if(currentSong.previewUrl == null) {
            await fetchNextTrack(currentSong);
        }
        else {
            loadNextTrack(currentSong);
        }
        globalGuessFlag = false;

        firstSongFlag = 0;
    }
    // Play previous song in queue
    if(e.code == "ArrowLeft"){
        // Do nothing when the user tries to go back further than first track
        if(songIndex == 0){
            return;
        }

        closeAllLists();
        songIndex--;
        currentSong = songs[songIndex];
        
        loadNextTrack(currentSong);
    }
};

// Adds artist to dropdown menu when add button is clicked
async function addArtist() {
    let newArtistName = searchArtistInput.value;
    // TODO Check if input is a legitamate artist
    // If no artist was input, do nothing
    if(newArtistName == "" || newArtistName == undefined) {
        return;
    }

    if(userAddedArtists != undefined)
    {
        if(!userAddedArtists.includes(newArtistName))
            userAddedArtists.push(newArtistName)
    }
    else
    {
        userAddedArtists.push(newArtistName)
    }

    // Create <a> tag
    let newArtist = document.createElement("a");
    // Set tag HTML to value in input box 
    newArtist.innerHTML = newArtistName;
    newArtist.href = "#";
    // Add class for styling/functionality
    newArtist.classList += "dropdown-item";
    // Add onclick function with user input
    newArtist.addEventListener("click", async () => {
        await setUserStatistics(currentArtistStatisticsList)
        await fetchSongs(input);
    });

    // makes a request to save the list of artists
    await setCurrentUserArtistList(userAddedArtists)
        .then(console.log("SUCCESS"))
        .catch(error => {
            console.log(error.message)
         });
    
    // Call because song was entered through input box
    fetchSongs(newArtistName);

    buttonList.appendChild(newArtist);

    // Reset input box when finished
    searchArtistInput.value = "";
}

// Temporary function used to generate artists through dropdown menu for dev purposes
function addArtists(input) {
    let newArtist = document.createElement("a");
    // Set tag HTML to value in input box
    newArtist.innerHTML = input;
    newArtist.href = "#";
    // Add class for styling/functionality
    newArtist.classList += "dropdown-item";
    // Add onclick function with user input
    newArtist.addEventListener("click", async () => {
        await setUserStatistics(currentArtistStatisticsList)
        await fetchSongs(input);
    });
    buttonList.appendChild(newArtist);
}

// On each input event for the Guess box
guessInput.addEventListener('input', function(e) {
    // Update input animation
    updateInputAnimation()
    
    var possibleSongDiv, possibleSongItem, i, val = this.value;
    // Close any already open lists of autocompleted values
    closeAllLists();
    if (!val) { return false;}
    currentFocus = -1;

    // Create a DIV element that will contain the items (values):
    possibleSongDiv = document.createElement("DIV");
    possibleSongDiv.setAttribute("id", this.id + "autocomplete-list");
    possibleSongDiv.setAttribute("class", "autocomplete-items");
    // Append the DIV element as a child of the autocomplete container:
    this.parentNode.appendChild(possibleSongDiv);

    var possible_song_count = 0;
    // For each item in the array...
    for (i = 0; i < songNames.length; i++) {
        // Check if the item starts with the same letters as the text field value:
        if (songNames[i].substr(0, val.length).toUpperCase() == val.toUpperCase() && possible_song_count <= 3) {
            // Create a DIV element for each matching element:
            possibleSongItem = document.createElement("DIV");
            // Make the matching letters bold:
            possibleSongItem.innerHTML = "<strong>" + songNames[i].substr(0, val.length) + "</strong>";
            possibleSongItem.innerHTML += songNames[i].substr(val.length);
            possibleSongItem.innerHTML += `<input type='hidden' value="${songNames[i]}">`;
            // Execute a function when someone clicks on the item value (DIV element):
            possibleSongItem.addEventListener("click", function(e) {
                // Insert the value for the autocomplete text field:
                guessInput.value = this.getElementsByTagName("input")[0].value;
                // Check if input is correct
                checkGuessInput();
                // Close the list of autocompleted values,(or any other open lists of autocompleted values)
                closeAllLists();
            });
            possibleSongDiv.appendChild(possibleSongItem);

            possible_song_count += 1;
        }
    }
});

// Trigger function when input box is selected and key down is pressed
guessInput.addEventListener("keydown", async function(e) {
    
    var possibleSongItem = document.getElementById(this.id + "autocomplete-list");
    if (possibleSongItem) possibleSongItem = possibleSongItem.getElementsByTagName("div");
    if (e.code == "ArrowDown") {
        // If the arrow DOWN key is pressed, increase the currentFocus variable:
        currentFocus++;
        // Make the current item more visible:
        addActive(possibleSongItem);
    } else if (e.code == "ArrowUp") {
        // If the arrow UP key is pressed, decrease the currentFocus variable
        currentFocus--;
        // Make the current item more visible:
        addActive(possibleSongItem);
    } else if (e.code == "Enter") {
        // If the ENTER key is pressed, prevent the form from being submitted,
        e.preventDefault();
        if (currentFocus > -1) {
            // Simulate a click on the "active" item:
            if (possibleSongItem)
            {
                possibleSongItem[currentFocus].click();
                return
            } 
                

        }
        
       await checkGuessInput()
    }
});

// Function checks the current guess box input with the correct song name
async function checkGuessInput() {
    if(guessInput.value.toLowerCase() === currentSong.name.toLowerCase()) {
        await revealTrack(globalGuessFlag);
    }
    // If incorrect
    else {
        // Change border to red, add invalid aniamtion class
        guessInput.style.border = "solid 2px red";
        guessInput.classList.add("invalid");
        guessInput.classList.remove("correct");
    }
}

// Function classifies a potential song guess as "Active" for functionality
function addActive(possibleSongItem) {
    if (!possibleSongItem) return false;
    // Start by removing the "active" class on all items:
    removeActive(possibleSongItem);
    if (currentFocus >= possibleSongItem.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = (possibleSongItem.length - 1);
    // Add class "autocomplete-active":
    possibleSongItem[currentFocus].classList.add("autocomplete-active");
}

// A function to remove the "active" class from all autocomplete items
function removeActive(possibleSongItem) {
    for (var i = 0; i < possibleSongItem.length; i++) {
        possibleSongItem[i].classList.remove("autocomplete-active");
    }
}

// Close all autocomplete lists in the document, except the one passed as an argument
function closeAllLists(elmnt) {
    var x = document.getElementsByClassName("autocomplete-items");
    for (var i = 0; i < x.length; i++) {
        if (elmnt != x[i] && elmnt != guessInput) {
            x[i].parentNode.removeChild(x[i]);
        }
    }
}

// Close autocomplete div when user clicks away from guess input box
document.addEventListener("click", function (e) {
    closeAllLists(e.target);
});

// Called by HTML when input is changed, allows animation to replay
function updateInputAnimation() {
    guessInput.classList.remove("invalid");
    guessInput.classList.remove("correct");
}

function replayTrack() {
    startTimer();
    player.play();
}

async function revealTrack(guessFlag) {
    const [seconds, miliseconds] = pauseTimer();
    
    //if the song was already guessed, move on
    if(currentSong.guess == true){
        //alert('song already guessed');                          //temporary
        return;
    }

    // If user clicks revealTrack button, don't save last time
    if(!guessFlag) {
        // Update Lastest Score
        let score = (seconds * 1000 + miliseconds * 10) / 1000;

        // if the score is either 0 or is less than the bestGuess then update the stat view, add the score
        // to the list of attempts, and update the bestGuess. Else then add the score the list of attempts
        if(score <= bestGuess || score == 0) {
            bestGuess = score;
            currentArtistStatisticsList[indexFound].attempts.push(score)
            currentArtistStatisticsList[indexFound].bestAttempt = bestGuess
            bestGuessElem.innerHTML = String(seconds + "." + miliseconds + " seconds");
        }
        else
        {
            currentArtistStatisticsList[indexFound].attempts.push(score)
        }
        
        lastGuessElem.innerHTML = String(seconds + "." + miliseconds + " seconds");

        // updates the average stat 
        averageGuessElem.innerHTML = String(Number(calculateAverage(currentArtistStatisticsList[indexFound].attempts)).toFixed(2) + " seconds");

        await setUserStatistics(currentArtistStatisticsList);
    }
    else{
        guessInput.value = currentSong.name;
    }

    // Begin Unblur Animation
    albumArt.classList.remove("blur");
    albumArt.classList.add("unblur");

    // Change border to green, add correct animation class
    guessInput.style.border = "solid 2px #1DB954";
    guessInput.classList.remove("invalid");
    guessInput.classList.add("correct");
}

document.addEventListener("DOMContentLoaded", () => { setArtist() })

// Calculates the average time of the current selected artist 
function calculateAverage(attempts)
{
    var total = 0;
    for(var i = 0; i < attempts.length; i++) 
    {
        total += attempts[i]
    }
    
    
    return total / attempts.length;
}


//volume stuff
/*
 let volume = document.querySelector("#volume-control");
 volume.addEventListener("change", function(e) {
 audio.volume = e.currentTarget.value / 100;
 })
 */

 



