import {SpotifyController} from "./spotify/spotify";
import {startServer} from "./spotify/express/express";


const clientID = '97ae9d179615480f898dfd7121e68b29';
const secretId = '0bb68eb1769442c5811c3c0457437a46';


const spotify = new SpotifyController(clientID, secretId);
startServer(3000, spotify)


