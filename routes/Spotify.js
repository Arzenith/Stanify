// Node.js libraries
const express = require('express');
const axios = require('axios');
const { response } = require('express');
const router = express.Router();

// Spotify id's and secrets
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET

// Url used to request a new token from Spotify
const tokenUrl = 'https://accounts.spotify.com/api/token';
// Url used as the base for all of Spotify's Endpoints
const baseUrl = 'https://api.spotify.com/v1/';

// Variable to hold the token
var accessToken = ''

// Request options to be sent when request for a new token 
const reqOptions = {
    method: "POST",
    url: tokenUrl,
    data: "grant_type=client_credentials",
    auth: {
      username: SPOTIFY_CLIENT_ID,
      password: SPOTIFY_CLIENT_SECRET,
    }
};



// ----- Middleware for the base endpoint of spotify ------
// Middleware will generate a new token when the user first accesses the  website
router.use('/', async (req, res, next) => {
    console.log("Token Middleware Ran!")
    // Function will generate a new key every hour
    setInterval(async function(){
        accessToken = await generateAccessToken();
        console.log('Generated a new access token');
    }, 60 * 60 * 1000);

    // if statment to generate the key for the first time
    if(accessToken === '')
    {
        console.log('Generating a new token...');
        accessToken = await generateAccessToken();
        next();
        return;
    }

    // Calls onto the next middleware in the sequence
    next();
})

// ----- Middleware for the endpoint 'spotify/search/artist' -----

// Function to retreive the artist
router.use('/search/artist/:search', async (req, res, next) =>{
    console.log("Search for artist Middleware ran!");

    // Error handling for if the query is empty
    if(req.params.search === ' ' || req.params.search == undefined)
    {
        res.render('index.ejs', { artistName: []});
        return;
    }

    var response;
    var artistSearchResult;

    // Try-catch to handle errors
    try{
        const customUrl = baseUrl + `search?query=${req.params.search}&type=artist&offset=0&limit=1&market=US`
        response = await axios.get(customUrl, { 
            headers: {
                'Authorization': 'Bearer ' + accessToken,
                'Content-Type': 'application/json'
            }
         });

        console.log("Query was a success");
        // Formats the response and puts artists in an array
        artistSearchResult = await formatArtistSearch(response.data.artists.items);
    }
    catch(err)
    {
        console.error("Error: " + err.message);
    }
    
    // Sets the current artist data to local storage within the server
    res.locals.artistData = artistSearchResult;
    next();
})

// Function to retreive the artist's albums
router.use('/search/artist/:search', async (req, res, next) =>{
    console.log("Grabbing artists albums Middleware Ran!");

    // Iterates through each artist and grabs their albums
    for(let i = 0; i < res.locals.artistData.length; i++)
    {
        res.locals.artistData[i].albums = await getArtistAlbums(res.locals.artistData[i].id);
    }

    next();
})

// Function to retreive the album's tracks
router.use('/search/artist/:search', async (req, res, next) =>{
    console.log("Grabbing the songs from each album!");
    
    // Try-catch to handle any errors in requesting artists
    try{
        if(res.locals.artistData[0] == undefined)
        {
            throw new Error('Cannot send an empty artist');
        }
    }
    catch(error)
    {
        console.log(error.message);
        res.redirect('https://localhost:8888/');
    }

    var tracks = [];
    var response;

    for(let i = 0; i < res.locals.artistData[0].albums.length; i++)
    {
        
        try{
            // creates a customUrl to retreive the albums tracks in the US market
            var customUrl = baseUrl + `albums/${res.locals.artistData[0].albums[i].id}/tracks?market=US`
            response = await axios.get(customUrl, { 
                headers: {
                    'Authorization': 'Bearer ' + accessToken,
                    'Content-Type': 'application/json'
                }
            })
            
            for(let i = 0; i < response.data.items.length; i++)
            {
                tracks.push(new Track(response.data.items[i].name, response.data.items[i].preview_url, response.data.items[i].id));
            }

            res.locals.artistData[0].albums[i].tracks = tracks;
            tracks = [];
        }
        catch(error)
        {
            console.log(error.message);
        }
    }

    console.log("Done getting the songs!");

    next();
})

// ---- Endpoints -----

// Root endpoint of the Spotify router
router.get('/', async (req, res) => {
    console.log(`Welcome to the Spotify Endpoint\nCurrent Token: ${accessToken}`);
    res.redirect("http://localhost:8888/");
})

// Endpoint for user to request an artist that takes in a search parameter
router.get('/search/artist/:search', async (req, res) => {
    res.send({ artistData : res.locals.artistData });
})

router.get('/search/track/:name/:artist', async (req, res) => {
    if(!(req.params.artist && req.params.name))
        res.redirect("http://localhost:8888")

    var customUrl = baseUrl + `search?query=track:${req.params.name} artist:${req.params.artist}&type=track&limit=1`

    try{
        var response = await axios.get(customUrl, { 
            headers: {
                'Authorization': 'Bearer ' + accessToken,
                'Content-Type': 'application/json'
            }
         });

        res.send(response.data.tracks.items[0])
    }
    catch(err)
    {
        console.log(err.message)
        res.redirect("http://localhost:8888")
    }
})

// Function to generate the access token
async function generateAccessToken() {
    const response = await axios(reqOptions);
    return response.data.access_token;
}

// Function to format the data received from the response once the query is sent to Spotify
async function formatArtistSearch(artistData){
    var artistArray = [];

    // Iterates through each artist and creates a new 'Artist' object
    artistData.forEach(element => {
        if(element.images[0] != null)
        {
            artistArray.push(new Artist(element.name, element.images[0].url, element.id));
        }
    })

    return artistArray;
}

// Function to fetch each artist's albums
async function getArtistAlbums(artistid){
    var tempArray = []
    
    try{
        // creates a customUrl to return only albums in the US market and limits the response to 50 albums
        const customUrl = baseUrl + `artists/${artistid}/albums?include_groups=album&market=US&limit=50`
        var response = await axios.get(customUrl, { 
            headers: {
                'Authorization': 'Bearer ' + accessToken,
                'Content-Type': 'application/json'
            }
         });

         // Calls on the formatArtistAlbums function to format the album data
         tempArray = await formatArtistAlbums(response.data.items);
    }
    catch(err)
    {
        console.log(err.message);
    }

    return tempArray;
}

// Function to format the response from fetching the artist's albums
async function formatArtistAlbums(artistAlbums){
    var tempArray = [];

    // Iterates through each album and creates a new 'ArtistAlbum' object
    artistAlbums.forEach(element =>{
        tempArray.push(new ArtistAlbums(element.name, element.images[0].url, element.id, null));
    })

    return tempArray;
}

// ---- Object defintions ----
function Artist(name, artistPicture, id, albums)
{
    this.name = name;
    this.artistPicture = artistPicture;
    this.id = id;
    this.albums = albums;
}

function ArtistAlbums(name, albumPicture, id, tracks)
{
    this.name = name;
    this.albumPicture = albumPicture;
    this.id = id;
    this.tracks = tracks;
}

function Track(name, previewUrl, id)
{
    this.name = name;
    this.previewUrl = previewUrl;
    this.id = id;
}

module.exports = router;
