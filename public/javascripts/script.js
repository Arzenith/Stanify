// const replaceWord = require("./test.js")
// console.log(replaceWord.replaceWord("xxxx"))
// import { replaceWord } from "./test.mjs";

// replaceWord("that easy")

// DOM Variables
var player = document.getElementById('player');
var appendTens = document.getElementById("tens");
var appendSeconds = document.getElementById("seconds");

var lastGuess = document.getElementById("last-guess");

var buttonList = document.getElementById("button-list");
var addButton = document.getElementById("add-button").addEventListener("click", addArtist);
// TODO User can click button multiple times and speed up timer
// TODO Disable replay button until after 30 seconds 
// TODO Decide whether replay button can be pressed during song or only after
var replayButton = document.getElementById("replay-button").addEventListener("click", replayTrack);
var revealButton = document.getElementById("reveal-button").addEventListener("click", () => { revealTrack(false) });
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
var res;
var songs = [];
var songNames = [];
var artist = "Kendrick Lamar";

// Stopwatch Variables
var seconds = 0; 
var tens = 0; 
var Interval;

// Global var
var currentSong = "";
var currentFocus;
var songIndex = 0;

// Data Types
function Song(name, albumPicture, previewUrl, artistName) {
    this.name = name;
    this.albumPicture = albumPicture;
    this.previewUrl = previewUrl;
    this.artistName = artistName;
}

// Function fetches data and parses based off input artist
function fetchSongs(artistInput) {
    // Reset Game
    songs = [];
    songNames = [];
    player.pause();
    resetTimer(false);

    // When Fetching, display loading gif
    albumArt.src = "/public/images/load.gif";
    albumArt.classList.remove("blur");

    // Create artist URL used for fetch
    artistURL = "http://localhost:8888/spotify/search/artist/" + artistInput

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
    })
}

async function fetchNextTrack(song) {
    fetch(`http://localhost:8888/spotify/search/track/${song.name}/${song.artistName}`)
    .then(async res => {
        if(!res.ok)
        {
            console.log('Something went wrong');
            return;
        }
        return res.json();
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
                songs.push(new Song(track.name, album.albumPicture, track.previewUrl, artistParsed.name));

                nonNullTrackCount++;
            }
            else {
                songs.push(new Song(track.name, album.albumPicture, null, artistParsed.name))

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
    if(songIndex != 0) {
        player.play();
        // When user skips song, reset timer
        resetTimer(true);
    }

    songIndex += 1;
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
    // Start Player by pressing 0
    if(e.code == "Digit0"){
        // If the player is paused, begin playing -- vice versa
        if (player.paused) {
            player.play();

            // Begin Stopwatch
            clearInterval(Interval);
            Interval = setInterval(startTimer, 10);
        }
        else {
            player.pause();
        }
    }
    // Play Random Song by pressing Right Arrow Key
    if(e.code == "ArrowRight"){
        closeAllLists();
        currentSong = songs[songIndex++];
        console.log(currentSong)
        console.log(replaceWord(currentSong))

        if(currentSong.previewUrl == null) {
            await fetchNextTrack(currentSong);
        }
        else {
            loadNextTrack(currentSong);
        }
    }
    if(e.code == "ArrowLeft"){
        // TODO Add Arrow Left Functionality
        // closeAllLists()
        // currentSong = songs[songIndex--];
        // loadNextTrack(currentSong);
    }
};

// Called when song begins playing, counts up
function startTimer() {
    tens++;

    if(tens <= 9) {
        appendTens.innerHTML = "0" + tens;
    }
    if (tens > 9) {
        appendTens.innerHTML = tens;
    }
    if (tens > 99) {
        seconds++;
        appendSeconds.innerHTML = "0" + seconds;
        tens = 0;
        appendTens.innerHTML = "0" + 0;
    }
    if (seconds > 9){
        appendSeconds.innerHTML = seconds;
    }

    // If the track track is over, stop the timer
    if(seconds % 30 == 0 && tens == 0) {
        clearInterval(Interval);
        player.pause();
    }
}

function resetTimer(nextFlag) {
    clearInterval(Interval);
    tens = "00";
    seconds = "00";

    // Update HTML
    appendTens.innerHTML = tens;
    appendSeconds.innerHTML = seconds;

    // If right arrow key is pressed, reset timer
    if(nextFlag == true) {
        Interval = setInterval(startTimer, 10);
    }
}

// Adds artist to dropdown menu when add button is clicked
function addArtist() {
    // TODO Check if input is a legitamate artist
    // If no artist was input, do nothing
    if(searchArtistInput.value == "") {
        return;
    }

    // Create <a> tag
    var newArtist = document.createElement("a");
    // Set tag HTML to value in input box 
    newArtist.innerHTML = searchArtistInput.value;
    newArtist.href = "#";
    // Add class for styling/functionality
    newArtist.classList += "dropdown-item";
    // Add onclick function with user input
    newArtist.setAttribute("onclick", `fetchSongs('${searchArtistInput.value}')`);

    buttonList.appendChild(newArtist);

    // Reset input box when finished
    searchArtistInput.value = "";
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
guessInput.addEventListener("keydown", function(e) {
    
    var possibleSongItem = document.getElementById(this.id + "autocomplete-list");
    if (possibleSongItem) possibleSongItem = possibleSongItem.getElementsByTagName("div");
    if (e.code == "ArrowDown") {
        // If the arrow DOWN key is pressed, increase the currentFocus variable:
        currentFocus++;
        // Make the current item more visible:
        addActive(possibleSongItem);
    } else if (e.code == "ArrowUp") { //up
        // If the arrow UP key is pressed, decrease the currentFocus variable
        currentFocus--;
        // Make the current item more visible:
        addActive(possibleSongItem);
    } else if (e.code == "Enter") {
        // If the ENTER key is pressed, prevent the form from being submitted,
        e.preventDefault();
        if (currentFocus > -1) {
            // Simulate a click on the "active" item:
            if (possibleSongItem) possibleSongItem[currentFocus].click();
        }
        
        checkGuessInput()
    }
});

// Function checks the current guess box input with the correct song name
function checkGuessInput() {
    if(guessInput.value.toLowerCase() === currentSong.name.toLowerCase()) {
        revealTrack(true)
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
    Interval = setInterval(startTimer, 10);
    player.play();
}

function revealTrack(guessFlag) {
    clearInterval(Interval)
    
    // Save Last Guess time if user guesses through guess input box
    // Specified by guessFlag boolean var
    // If user clicks revealTrack button, don't save last time
    if(guessFlag) {
        // If the hundreds place is 0, add a zero to the string
        // BUGGYYY!!!! If .01 then displays .10 this is obv wrong
        if(String(tens).length == 1) {
            tens = tens + "0"
        }

        // Update Lastest Score
        score = String(seconds + "." + tens + " seconds");
        lastGuess.innerHTML = score;
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

document.addEventListener("DOMContentLoaded", () => { fetchSongs(artist) })