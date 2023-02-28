// Initializes cookies 
if (!document.cookie)
{
    document.cookie = 'appendTens=00';
    document.cookie = 'appendSeconds=00';
    document.cookie = 'lastGuess=00.00 seconds';
    document.cookie = 'albumArt=';
    document.cookie = 'artistList=';
    document.cookie = 'artist= Hanz Zimmer';
}
console.log(document.cookie);

// DOM Variables
var player = document.getElementById('player');
var appendTens = document.getElementById("tens");
var appendSeconds = document.getElementById("seconds");

var lastGuess = document.getElementById("last-guess");

var buttonList = document.getElementById("button-list");
var addButton = document.getElementById("add-button").addEventListener("click", addArtist);
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
var artist;
var songFinished = false;

// Stopwatch Variables
var seconds = 00; 
var tens = 00; 
var Interval;

// Global var
var currentSong = "";
var currentFocus;

// Data Types
function Song(name, albumPicture, previewUrl) {
    this.name = name;
    this.albumPicture = albumPicture;
    this.previewUrl = previewUrl;
}

// Replaces webpage information with the cookie data
lastGuess.innerHTML = getCookie('lastGuess');
appendTens.innerHTML = getCookie('appendTens');
appendSeconds.innerHTML = getCookie('appendSeconds');

albumArt.src = getCookie('albumArt');
albumArt.classList.add("blur");
artist = getCookie('artist');

// Function fetches data and parses based off input artist
function fetchSongs(artistInput) {
    // Reset Game
    songs = [];
    songNames = [];
    player.pause();
    resetTimer(false);

    // When Fetching, display loading gif
    //albumArt.src = "./img/load.gif";
    //albumArt.classList.remove("blur");

    // Create artist URL used for fetch
    artistURL = "http://localhost:8888/spotify/search/artist/" + artistInput

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
        await parseArtist(response);
        await LoadAudioPlayer();
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
    artistParsed.albums.forEach((album) => {
        album.tracks.forEach((track) => {
            if(track.previewUrl != null) {
                songs.push(new Song(track.name, album.albumPicture, track.previewUrl));

                nonNullTrackCount++;
            }
            else {
                nullTrackCount++;
            }

            allSongs.push(new Song(track.name, album.albumPicture, track.previewUrl));
        })

        albumCount++;
    })

    // Print out fetch data info
    console.log(artistParsed.name);
    document.cookie = "artist=" + artistParsed.name;
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
async function LoadAudioPlayer() {
    // Random Song Loaded
    currentSong = songs.at(Math.floor(Math.random() * songs.length));

    // Load current songs album picture and adds styling
    albumArt.src = currentSong.albumPicture;
    document.cookie = "albumArt=" + currentSong.albumPicture;
    cookieLog();
    albumArt.classList.add("blur");
    // Load preview song into source
    player.src = currentSong.previewUrl;


}

// Audio Player Functionality
document.onkeydown = function (e) {
    // Start Player by pressing 0
    if(e.code == "Digit0"){
        // If the player is paused, begin playing -- vice versa
        if (player.paused && !songFinished) {
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
        songFinished = false;
        closeAllLists()
        // Load new first song in array
        currentSong = songs.at(Math.floor(Math.random() * songs.length));
        console.log(currentSong.name);

        // Load into player
        player.src = currentSong.previewUrl;
        player.play();

        // Album Art Handling
        albumArt.src = currentSong.albumPicture;
        albumArt.classList.remove("unblur");
        albumArt.classList.add("blur");
        
        // When user skips song, reset timer
        resetTimer(true)

        // Reset guessbox input val and style
        guessInput.value = ""
        guessInput.classList.remove("invalid");
        guessInput.classList.remove("correct");
        guessInput.style.border = "solid 2px #1DB954";
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
}

function resetTimer(nextFlag) {
    clearInterval(Interval);
    tens = "00";
    seconds = "00";

    // Update HTML and Cookies
    appendTens.innerHTML = tens;
    document.cookie = "appendTens" + tens;

    appendSeconds.innerHTML = seconds;
    document.cookie = "appendSeconds" + seconds;

    // If right arrow key is pressed, reset timer
    if(nextFlag == true) {
        Interval = setInterval(startTimer, 10);
    }
}

// Adds artist to dropdown menu when add button is clicked
function addArtist() {
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
    console.assert(buttonList.lastChild.text === searchArtistInput.value, "Artist did not add correctly")

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
            // Insert a input field that will hold the current array item's value:
            possibleSongItem.innerHTML += "<input type='hidden' value='" + songNames[i] + "'>";
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
        clearInterval(Interval)
        
        // If the hundreds place is 0, add a zero to the string
        // BUGGYYY!!!! If .01 then displays .10 this is obv wrong
        if(String(tens).length == 1) {
            tens = tens + "0"
        }

        songFinished = true;
        // Update Lastest Score
        score = String(seconds + "." + tens + " seconds")
        lastGuess.innerHTML = score

        document.cookie = "lastGuess=" + score;

        document.cookie = "appendTens=" + tens;
        document.cookie = "appendSeconds=" + seconds;

        console.log("HERE: " + document.cookie)
        
        // Begin Unblur Animation
        albumArt.classList.remove("blur");
        albumArt.classList.add("unblur");

        // Change border to green, add correct animation class
        guessInput.style.border = "solid 2px #1DB954";
        guessInput.classList.remove("invalid");
        guessInput.classList.add("correct");
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

function getCookie(cookieID)
{
    let cookie = {};
    document.cookie.split(';').forEach((element) =>{
        let [key, value] = element.split('=');
        cookie[key.trim()] = value;
    });
    return cookie[cookieID]
}

function cookieLog() 
{
    var cookies = document.cookie.split(';').reduce(
        (cookies, cookie) => {
            const [name, val] = cookie.split('=').map(c => c.trim());
            cookies[name] = val;
            return cookies;
        }, {});
        console.log(cookies)
}

cookieLog()

fetchSongs(artist)