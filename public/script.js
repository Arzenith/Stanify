// Stopwatch Example
// https://codepen.io/cathydutton/pen/xxpOOw

// TODO after 30 sec, ask user if they want to reveal answer or replay song

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
var nonNullTrackCount = 0;
var nullTrackCount = 0;
var albumCount = 0;
var songs = [];
var artist;

// Stopwatch Variables
var seconds = 00; 
var tens = 00; 
var Interval;

// Global var
var currentSong = "";

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


// Passed fetch json, parse artist data and load into songs[] array
async function parseArtist(res) {
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
        })

        albumCount++;
    })

    // Print out fetch data info
    console.log(artistParsed.name);
    document.cookie = "artist=" + artistParsed.name;
    console.log('Available', nonNullTrackCount);
    console.log('Not Available', nullTrackCount);
    console.log('Album Count', albumCount);
    console.log(songs)
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

    // Add listener for guessing input box
    guessInput.addEventListener("keyup", ({key}) => {
        // When user presses enter, check if string is correct
        if (key === "Enter") {
            // If correct
            if(guessInput.value.toLowerCase() === currentSong.name.toLowerCase()) {
                clearInterval(Interval)
                
                // If the hundreds place is 0, add a zero to the string
                // BUGGYYY!!!! If .01 then displays .10 this is obv wrong
                if(String(tens).length == 1) {
                    tens = tens + "0"
                }

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
    })
}

// Audio Player Functionality
document.onkeydown = function (e) {
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

// Called by HTML when input is changed, allows animation to replay
function updateInputAnimation() {
    guessInput.classList.remove("invalid");
    guessInput.classList.remove("correct");
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