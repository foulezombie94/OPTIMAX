import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

const ffmpeg = new FFmpeg();

self.onmessage = async (e: MessageEvent) => {
  const { type, file } = e.data;
  
  if (type === 'compress') {
    try {
      ffmpeg.on('progress', ({ progress }) => {
        self.postMessage({ type: 'progress', progress });
      });

      if (!ffmpeg.loaded) {
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
      }

      await ffmpeg.writeFile('input.mp4', await fetchFile(file));
      await ffmpeg.exec(['-i', 'input.mp4', '-vcodec', 'libx264', '-crf', '28', '-preset', 'fast', 'output.mp4']);
      const data = await ffmpeg.readFile('output.mp4');
      const blob = new Blob([data as any], { type: 'video/mp4' });
      
      self.postMessage({ type: 'done', blob });
    } catch (error: any) {
      self.postMessage({ type: 'error', error: error.message });
    }
  }
};
