import fetch from 'cross-fetch';

interface ISpotifyResponseToken {
    access_token: string;
    token_type: string;
    expires_in: number;
}

export class SpotifyController {

    token: string | null;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    authorizationCode: string | null;
    queue: string[] = [];
    deamon_kill: boolean = false;
    is_playing: boolean = false;
    deezerId: string;

    constructor(clientId: string, clientSecret: string, deezerId : string, redirectUri: string = 'http://localhost:3000/spotify/callback') {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.token = null;
        this.redirectUri = redirectUri;
        this.authorizationCode = null;
        this.queue = [];
        this.deezerId = deezerId;
        this.fetchTokenSync();
        this.daemon()
        console.log(this.getAuthorizationUrl(['user-read-playback-state', 'user-modify-playback-state'], 'state'))
    }

    private async fetchToken() {
        const url = 'https://accounts.spotify.com/api/token';
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `grant_type=client_credentials&client_id=${this.clientId}&client_secret=${this.clientSecret}`
        });
        const data: any = await res.json();
        this.token = data.access_token;
        console.log('Spotify token fetched with success');
    }

    public async fetchTokenSync() {
        try {
            await this.fetchToken();
        } catch (error) {
            throw "Error fetching Spotify token verify your credentials"
        }
    }


    public getAuthorizationUrl(scopes: string[], state: string) {
        const params = new URLSearchParams({
            client_id: this.clientId,
            response_type: 'code',
            redirect_uri: this.redirectUri,
            scope: scopes.join(' '),
            state,
        });
        return `https://accounts.spotify.com/authorize?${params.toString()}`;
    }

    public setAuthorizationCode(code: string) {
        this.authorizationCode = code;
    }

    public async requestAccessToken() {
        if (!this.authorizationCode) {
            throw new Error('No authorization code provided.');
        }

        const url = 'https://accounts.spotify.com/api/token';
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `grant_type=authorization_code&code=${this.authorizationCode}&redirect_uri=${this.redirectUri}&client_id=${this.clientId}&client_secret=${this.clientSecret}`,
        });

        if (res.ok) {
            const data: ISpotifyResponseToken = await res.json();
            this.token = data.access_token;
            console.log('Spotify access token obtained successfully.');
        } else {
            throw new Error('Failed to obtain Spotify access token.');
        }
    }


    pauseActiveDevice() {
        fetch('https://api.spotify.com/v1/me/player/pause', {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + this.token,
                'Content-Type': 'application/json'
            }
        })
    }

    public async searchAndPlay(query: string) {
        if (!this.token) {
            throw new Error('Access token is not available. Make sure to fetch the token first.');
        }

        // Search for tracks
        const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`;
        const searchRes = await fetch(searchUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!searchRes.ok) {
            throw new Error('Failed to search for tracks on Spotify.');
        }

        const searchData: any = await searchRes.json();
        const tracks = searchData.tracks.items;

        if (tracks.length === 0) {
            throw new Error('No tracks found for the search query.');
        }

        const trackUri = tracks[0].uri;

        // Play the track on the active device
        const playUrl = 'https://api.spotify.com/v1/me/player/play';
        await fetch(playUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                uris: [trackUri],
            }),
        });

        console.log(`Now playing: ${tracks[0].name} by ${tracks[0].artists[0].name}`);
    }


    public searchAndAddToQueue(query: string) {
        // Search for tracks
        console.log('searching for track ' + query)
        const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`;
        return fetch(searchUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
            },
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to search for tracks on Spotify.');
                }
                return response.json();
            })
            .then(data => {
                const tracks = data.tracks.items;
                if (tracks.length === 0) {
                    throw new Error('No tracks found for the search query.');
                }
                const trackUri = tracks[0].uri;
                this.queue.push(trackUri);
                console.log(`Track added to the local queue: ${tracks[0].name} by ${tracks[0].artists[0].name}`);
            })
            .catch(error => {
                console.error('Error adding track to the local queue:', error);
            });
    }

    public async getDeezerFlow(id: string) {
        console.log('getting deezer flow')
        const res = await fetch(`https://api.deezer.com/user/${id}/flow`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        const data = await res.json();
        data.data.forEach((track: any) => {
                this.searchAndAddToQueue(`${track.artist.name} ${track.title}`)
                console.log('added ' + track.title)
            }
        )
    }


    public async daemon() {
        let coldStart = true;
        console.log('Daemon started.');
        while (true) {
            if (this.queue.length > 0) {
                coldStart = false;
                console.log('Playing from the queue.');
                const trackUri = this.queue.shift();
                const playUrl = 'https://api.spotify.com/v1/me/player/play';
                console.log('playing ' + trackUri)
                try {
                   const response =  await fetch(playUrl, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${this.token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            uris: [trackUri],
                        }),
                    });
                    if (!response.ok) {
                        throw new Error('Failed to play track from the queue on Spotify.');
                    }
                    console.log(`Playback started for track: ${trackUri}`);
                    await this.waitForTrackToFinish();
                } catch (error) {
                    console.error('Error playing track from the queue:', error);
                }
            } else {
                if (!coldStart) {
                    console.log('Queue is empty. Fetching Deezer flow.');
                    this.getDeezerFlow(this.deezerId);
                }
            }
            await this.delay(1000);
        }
    }

    private delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }


    private async waitForTrackToFinish() {
        while (true) {
            const playbackStatus = await this.getPlaybackStatus();
            if (!playbackStatus || playbackStatus.is_playing === false) {
                break; // Exit the loop if playback has stopped
            }
            await this.delay(1000);
        }
    }

    private async getPlaybackStatus() {
        const playbackUrl = 'https://api.spotify.com/v1/me/player';
        const response = await fetch(playbackUrl, {
            headers: {
                'Authorization': `Bearer ${this.token}`,
            },
        });
        if (response.ok) {
            const data = await response.json();
            return data.is_playing ? data : null;
        }
        throw new Error('Failed to get playback status from Spotify API.');
    }
}
