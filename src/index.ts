import {SpotifyController} from "./spotify/spotify";
import {startServer} from "./spotify/express/express";



const spotify = new SpotifyController(clientID, secretId, deezerId);
startServer(3000, spotify)


