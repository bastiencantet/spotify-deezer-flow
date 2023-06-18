import express, { Request, Response } from 'express';
import {SpotifyController} from "../spotify";

export  function startServer(port: number, spotify: SpotifyController) {
    const app = express();

    app.get('/spotify/callback', async (req: Request, res: Response) => {
        const { code, state } = req.query;

        // Handle the authorization code and state as needed
        // You can pass the code to your SpotifyController to request the access token
        spotify.setAuthorizationCode(code as string);
        spotify.requestAccessToken().then(
            () => {
               spotify.getDeezerFlow(spotify.deezerId)
            }
        )
        res.send('Authorization code received successfully');
    });

    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}

