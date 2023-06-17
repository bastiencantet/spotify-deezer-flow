import fetch from 'cross-fetch';

interface ISpotifyResponseToken {
    access_token : string;
    token_type : string;
    expires_in : number;
}
export class SpotifyController {

    token : string | null;
    clientId : string;
    clientSecret : string;
    constructor(clientId : string, clientSecret : string) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.token = null;
        this.fetchTokenSync();
    }

    private async fetchToken() {
        const url = 'https://accounts.spotify.com/api/token';
        const res = await fetch(url,{
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `grant_type=client_credentials&client_id=${this.clientId}&client_secret=${this.clientSecret}`
        });
        const data: any = await res.json();
        this.token = data.access_token;
        console.log("token",this.token);
    }

    public async fetchTokenSync() {
        try {
            await this.fetchToken();
        } catch (error) {
            throw error;
        }
    }

}
