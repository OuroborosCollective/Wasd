import { google, youtube_v3 } from 'googleapis';
import fs from 'fs';

interface VideoMetadata {
    title: string;
    description: string;
    tags: string[];
    categoryId: string;
    privacyStatus: 'private' | 'public' | 'unlisted';
}

export class YoutubeBotService {
    private youtube: youtube_v3.Youtube;
    private oauth2Client: InstanceType<typeof google.auth.OAuth2>;

    constructor(
        clientId: string,
        clientSecret: string,
        redirectUri: string,
        refreshToken: string
    ) {
        this.oauth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
            redirectUri
        );

        this.oauth2Client.setCredentials({
            refresh_token: refreshToken
        });

        this.youtube = google.youtube({
            version: 'v3',
            auth: this.oauth2Client
        });
    }

    public async uploadVideo(
        videoPath: string,
        metadata: VideoMetadata
    ): Promise<youtube_v3.Schema$Video> {
        try {
            const fileSize = fs.statSync(videoPath).size;
            const res = await this.youtube.videos.insert(
                {
                    part: ['snippet', 'status'],
                    requestBody: {
                        snippet: {
                            title: metadata.title,
                            description: metadata.description,
                            tags: metadata.tags,
                            categoryId: metadata.categoryId,
                        },
                        status: {
                            privacyStatus: metadata.privacyStatus,
                        },
                    },
                    media: {
                        body: fs.createReadStream(videoPath),
                    },
                },
                {
                    onUploadProgress: (evt) => {
                        const progress = (evt.bytesRead / fileSize) * 100;
                        process.stdout.write(`Upload progress: ${Math.round(progress)}%\r`);
                    },
                }
            );

            return res.data;
        } catch (error) {
            throw new Error(`YouTube Upload failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    public async updateThumbnail(videoId: string, thumbnailPath: string): Promise<void> {
        try {
            await this.youtube.thumbnails.set({
                videoId: videoId,
                media: {
                    body: fs.createReadStream(thumbnailPath),
                },
            });
        } catch (error) {
            throw new Error(`Thumbnail upload failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    public async checkVideoStatus(videoId: string): Promise<string | null | undefined> {
        try {
            const res = await this.youtube.videos.list({
                part: ['status', 'uploadStatus'],
                id: [videoId]
            });
            return res.data.items?.[0]?.status?.uploadStatus;
        } catch (error) {
            throw new Error(`Status check failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
