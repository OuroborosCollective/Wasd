// @ts-nocheck
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface FactionData {
    id: string;
    name: string;
    updateText: string;
    backgroundPath: string;
    voiceModel?: string;
}

export class VideoGenerator {
    private tempDir: string;
    private outputDir: string;
    private ffmpegPath: string = 'ffmpeg';
    private ttsPath: string = 'piper'; // Lokal: Piper TTS, Coqui oder Ähnliches

    constructor(workDir: string = './media-assets') {
        this.tempDir = path.join(workDir, 'temp');
        this.outputDir = path.join(workDir, 'output');
        this.ensureDirectories();
    }

    private ensureDirectories(): void {
        [this.tempDir, this.outputDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    public async createFactionUpdateVideo(data: FactionData): Promise<string> {
        const audioPath = path.join(this.tempDir, `${data.id}_speech.wav`);
        const videoPath = path.join(this.outputDir, `${data.id}_update.mp4`);

        try {
            await this.generateSpeech(data.updateText, audioPath, data.voiceModel);
            await this.assembleVideo(data.backgroundPath, audioPath, data.name, videoPath);
            return videoPath;
        } catch (error) {
            console.error('Video generation failed:', error);
            throw error;
        } finally {
            this.cleanup(audioPath);
        }
    }

    private generateSpeech(text: string, outputPath: string, model: string = 'en_US-lessac-medium.onnx'): Promise<void> {
        return new Promise((resolve, reject) => {
            // Beispiel für Piper TTS Integration
            const ttsProcess = spawn(this.ttsPath, [
                '--model', model,
                '--output_file', outputPath
            ]);

            ttsProcess.stdin.write(text);
            ttsProcess.stdin.end();

            ttsProcess.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error(`TTS process exited with code ${code}`));
            });

            ttsProcess.on('error', reject);
        });
    }

    private assembleVideo(image: string, audio: string, title: string, output: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const filterComplex = `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[bg];` +
                                 `[bg]drawtext=text='${title}':fontcolor=white:fontsize=72:x=(w-text_w)/2:y=200:box=1:boxcolor=black@0.5:boxborderw=10[v]`;

            const args = [
                '-loop', '1',
                '-i', image,
                '-i', audio,
                '-filter_complex', filterComplex,
                '-map', '[v]',
                '-map', '1:a',
                '-c:v', 'libx264',
                '-tune', 'stillimage',
                '-c:a', 'aac',
                '-b:a', '192k',
                '-pix_fmt', 'yuv420p',
                '-shortest',
                '-y',
                output
            ];

            const ffmpeg = spawn(this.ffmpegPath, args);

            ffmpeg.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error(`FFmpeg process exited with code ${code}`));
            });

            ffmpeg.on('error', reject);
        });
    }

    private cleanup(...files: string[]): void {
        files.forEach(file => {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
            }
        });
    }
}