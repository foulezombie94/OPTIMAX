import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

const ffmpeg = new FFmpeg();

self.onmessage = async (e: MessageEvent) => {
  const { type, file, targetExt } = e.data;
  
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

    if (type === 'compress') {
      await ffmpeg.writeFile('input.mp4', await fetchFile(file));
      await ffmpeg.exec(['-i', 'input.mp4', '-vcodec', 'libx264', '-crf', '28', '-preset', 'fast', 'output.mp4']);
      const data = await ffmpeg.readFile('output.mp4');
      const blob = new Blob([data as any], { type: 'video/mp4' });
      self.postMessage({ type: 'done', blob });
    } else if (type === 'convert') {
      // Dynamic input/output based on file and target format
      const inExt = file.name.split('.').pop();
      const inName = `input.${inExt}`;
      const outName = `output.${targetExt}`;

      await ffmpeg.writeFile(inName, await fetchFile(file));
      
      let args = ['-i', inName];
      
      const audioFormats = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'];
      if (audioFormats.includes(targetExt)) {
        // Audio extraction / conversion
        args.push('-vn'); // no video
        if (targetExt === 'mp3') args.push('-acodec', 'libmp3lame');
        if (targetExt === 'ogg') args.push('-acodec', 'libvorbis');
      }
      
      // For GIF, we might want to optimize palette or just use default
      if (targetExt === 'gif') {
        args = ['-i', inName, '-vf', 'fps=10,scale=320:-1:flags=lanczos', '-c:v', 'gif'];
      }
      
      args.push(outName);

      await ffmpeg.exec(args);
      const data = await ffmpeg.readFile(outName);
      
      const mimes: Record<string, string> = {
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'mkv': 'video/x-matroska',
        'avi': 'video/x-msvideo',
        'mov': 'video/quicktime',
        'flv': 'video/x-flv',
        'gif': 'image/gif',
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg',
        'flac': 'audio/flac',
        'aac': 'audio/aac',
        'm4a': 'audio/mp4'
      };
      
      let outMime = mimes[targetExt] || 'application/octet-stream';

      const blob = new Blob([data as any], { type: outMime });
      self.postMessage({ type: 'done', blob });
    } else if (type === 'edit') {
      const { startTime, endTime, crop, filter } = e.data;
      const inExt = file.name.split('.').pop() || 'mp4';
      const inName = `input.${inExt}`;
      const outName = `output.${targetExt || 'mp4'}`;

      await ffmpeg.writeFile(inName, await fetchFile(file));

      let args = [];
      if (startTime !== undefined) args.push('-ss', startTime.toString());
      if (endTime !== undefined) args.push('-to', endTime.toString());
      args.push('-i', inName);

      const vfFilters = [];
      
      if (crop === '1:1') vfFilters.push(`crop='min(iw,ih)':'min(iw,ih)'`);
      else if (crop === '16:9') vfFilters.push(`crop='min(iw,ih*16/9)':'min(ih,iw*9/16)'`);
      else if (crop === '9:16') vfFilters.push(`crop='min(iw,ih*9/16)':'min(ih,iw*16/9)'`);

      if (filter === 'grayscale') vfFilters.push('hue=s=0');
      else if (filter === 'contrast') vfFilters.push('eq=contrast=1.5');

      if (vfFilters.length > 0) {
        args.push('-vf', vfFilters.join(','));
      }

      // Fast encoding
      args.push('-preset', 'fast');
      args.push(outName);

      await ffmpeg.exec(args);
      const data = await ffmpeg.readFile(outName);
      
      const outMime = targetExt === 'webm' ? 'video/webm' : 'video/mp4';
      const blob = new Blob([data as any], { type: outMime });
      self.postMessage({ type: 'done', blob });
    } else if (type === 'pro_edit') {
      const { settings, targetExt } = e.data;
      const inExt = file.name.split('.').pop() || 'mp4';
      const inName = `input.${inExt}`;
      const outName = `output.${targetExt || 'mp4'}`;

      await ffmpeg.writeFile(inName, await fetchFile(file));
      
      // Attempt to load a font for drawtext if text is used
      if (settings.text) {
        try {
          const fontUrl = 'https://raw.githubusercontent.com/googlefonts/roboto/main/src/hinted/Roboto-Regular.ttf';
          await ffmpeg.writeFile('font.ttf', await fetchFile(fontUrl));
        } catch (err) {
          console.warn("Could not load font.ttf, text might fail or use default.");
        }
      }

      let args = [];
      if (settings.startTime) args.push('-ss', settings.startTime.toString());
      if (settings.endTime) args.push('-to', settings.endTime.toString());
      args.push('-i', inName);

      const vFilters = [];
      const aFilters = [];

      // Speed
      if (settings.speed !== 1) {
        vFilters.push(`setpts=${1 / settings.speed}*PTS`);
        // atempo only supports 0.5 to 2.0. If we need 4, we must chain.
        let s = settings.speed;
        while (s > 2.0) { aFilters.push(`atempo=2.0`); s /= 2.0; }
        while (s < 0.5) { aFilters.push(`atempo=0.5`); s /= 0.5; }
        if (s !== 1) aFilters.push(`atempo=${s}`);
      }

      // Flips
      if (settings.flipH) vFilters.push('hflip');
      if (settings.flipV) vFilters.push('vflip');

      // Colors: brightness (0 to 2, default 1 -> map to -1.0 to 1.0)
      const b = settings.brightness - 1;
      const c = settings.contrast; // 0 to 2
      const sat = settings.saturation; // 0 to 3
      if (b !== 0 || c !== 1 || sat !== 1) {
        vFilters.push(`eq=brightness=${b}:contrast=${c}:saturation=${sat}`);
      }

      // Text
      if (settings.text) {
        // Simple escaped text (no complex chars)
        const escapedText = settings.text.replace(/'/g, "\\'");
        // Using font.ttf if loaded, else standard
        vFilters.push(`drawtext=fontfile=/font.ttf:text='${escapedText}':fontcolor=${settings.textColor}:fontsize=h/10:x=(w-text_w)/2:y=(h-text_h)/2`);
      }

      if (vFilters.length > 0) args.push('-vf', vFilters.join(','));

      // Audio volume
      if (settings.volume !== 1) aFilters.push(`volume=${settings.volume}`);
      if (aFilters.length > 0) args.push('-af', aFilters.join(','));

      // Fast encoding
      args.push('-preset', 'fast');
      args.push(outName);

      await ffmpeg.exec(args);
      const data = await ffmpeg.readFile(outName);
      
      const outMime = targetExt === 'webm' ? 'video/webm' : 'video/mp4';
      const blob = new Blob([data as any], { type: outMime });
      self.postMessage({ type: 'done', blob });
    } else if (type === 'pro_nle_export') {
      const { clips, duration } = e.data;
      const outName = 'export.mp4';
      
      let args: string[] = [];
      let filterComplex = '';
      
      // Base canvas (1920x1080 black)
      filterComplex += `color=c=black:s=1920x1080:d=${duration} [base0];`;

      // Download font if there is any text clip
      if (clips.some((c: any) => c.type === 'text')) {
        try {
          const fontUrl = 'https://raw.githubusercontent.com/googlefonts/roboto/main/src/hinted/Roboto-Regular.ttf';
          await ffmpeg.writeFile('font.ttf', await fetchFile(fontUrl));
        } catch (err) {
          console.warn("Could not load font");
        }
      }

      // Sort clips by track index roughly (simulate layers)
      const sortedClips = clips.sort((a: any, b: any) => {
        // Assume 'v2' is above 'v1'. In a real NLE we'd pass track index explicitly.
        if (a.trackId === 'v2' && b.trackId === 'v1') return 1;
        if (a.trackId === 'v1' && b.trackId === 'v2') return -1;
        return 0;
      });

      let videoClipIndex = 0;
      for (let i = 0; i < sortedClips.length; i++) {
        const clip = sortedClips[i];
        if (clip.type === 'audio') continue; // Audio support requires complex amix, skipping for basic POC
        
        if (clip.type === 'text') {
          const prevBase = `base${videoClipIndex}`;
          const nextBase = `base${videoClipIndex + 1}`;
          
          const escapedText = clip.textData.content.replace(/'/g, "\\'");
          const color = clip.textData.color.replace('#', '0x'); // #ffffff -> 0xffffff
          const size = clip.textData.fontSize;
          const x = `(W-tw)/2 + (${clip.transform.posX}*W/2)`;
          const y = `(H-th)/2 + (${clip.transform.posY}*H/2)`;
          const alpha = clip.transform.opacity;
          
          filterComplex += `[${prevBase}] drawtext=fontfile=/font.ttf:text='${escapedText}':fontcolor=${color}@${alpha}:fontsize=${size}:x='${x}':y='${y}':enable='between(t,${clip.start},${clip.end})' [${nextBase}];`;
          videoClipIndex++;
          continue;
        }

        const inName = `input_${i}.mp4`;
        await ffmpeg.writeFile(inName, await fetchFile(clip.file));
        args.push('-i', inName);

        // Build clip chain
        const b = clip.transform.brightness - 1;
        const c = clip.transform.contrast;
        const sat = clip.transform.saturation;
        
        let chain = `[${i}:v] trim=start=${clip.trimIn}:end=${clip.trimOut}, setpts=PTS-STARTPTS+${clip.start}/TB`;
        
        // Transitions
        if (clip.transitionIn && clip.transitionIn > 0) {
          chain += `, fade=t=in:st=${clip.start}:d=${clip.transitionIn}`;
        }
        if (clip.transitionOut && clip.transitionOut > 0) {
          chain += `, fade=t=out:st=${clip.end - clip.transitionOut}:d=${clip.transitionOut}`;
        }
        
        // Transform
        if (clip.transform.scale !== 1) {
          chain += `, scale=iw*${clip.transform.scale}:-1`;
        }
        
        // Colors
        if (b !== 0 || c !== 1 || sat !== 1) {
          chain += `, eq=brightness=${b}:contrast=${c}:saturation=${sat}`;
        }
        
        // Effects
        if (clip.effects && clip.effects.length > 0) {
          clip.effects.forEach((ef: any) => {
            if (ef.type === 'blur' && ef.intensity > 0) {
              chain += `, boxblur=luma_radius=${Math.floor(ef.intensity * 20)}`;
            } else if (ef.type === 'grayscale' && ef.intensity > 0) {
              if (ef.intensity > 0.1) chain += `, colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3:0`;
            } else if (ef.type === 'sepia' && ef.intensity > 0) {
              if (ef.intensity > 0.1) chain += `, colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131:0`;
            } else if (ef.type === 'invert' && ef.intensity > 0) {
              if (ef.intensity > 0.1) chain += `, negate`;
            } else if (ef.type === 'vhs' && ef.intensity > 0) {
              chain += `, noise=alls=${Math.floor(ef.intensity * 60)}:allf=t+u`;
            }
          });
        }
        
        // Opacity & Keyframes
        let opacityExpr = `${clip.transform.opacity}`;
        if (clip.keyframes && clip.keyframes.length > 0) {
          const kfs = clip.keyframes;
          if (kfs.length === 1) {
            opacityExpr = `if(lt(t,${kfs[0].time}), ${clip.transform.opacity}, ${kfs[0].opacity})`;
          } else {
            let expr = `${kfs[kfs.length - 1].opacity}`;
            for (let k = kfs.length - 1; k >= 1; k--) {
              const prev = kfs[k-1];
              const curr = kfs[k];
              const interp = `${prev.opacity}+(${curr.opacity}-${prev.opacity})*(t-${prev.time})/(${curr.time}-${prev.time})`;
              expr = `if(lt(t,${curr.time}), if(lt(t,${prev.time}), ${prev.opacity}, ${interp}), ${expr})`;
            }
            opacityExpr = expr;
          }
        }

        chain += `, format=rgba, colorchannelmixer=aa='${opacityExpr}'`;

        chain += ` [v${i}];`;
        filterComplex += chain;

        // Overlay
        const prevBase = `base${videoClipIndex}`;
        const nextBase = `base${videoClipIndex + 1}`;
        // Map posX, posY (-1 to 1) to actual pixels (assuming 1920x1080 canvas)
        const xExpr = `(W-w)/2 + (${clip.transform.posX}*W/2)`;
        const yExpr = `(H-h)/2 + (${clip.transform.posY}*H/2)`;
        
        filterComplex += `[${prevBase}][v${i}] overlay=x='${xExpr}':y='${yExpr}':enable='between(t,${clip.start},${clip.end})' [${nextBase}];`;
        
        videoClipIndex++;
      }

      args.push('-filter_complex', filterComplex);
      args.push('-map', `[base${videoClipIndex}]`);
      args.push('-preset', 'fast');
      args.push(outName);

      self.postMessage({ type: 'progress', progress: 0 }); // Start
      
      await ffmpeg.exec(args);
      const data = await ffmpeg.readFile(outName);
      
      const blob = new Blob([data as any], { type: 'video/mp4' });
      self.postMessage({ type: 'done', blob });
    }
  } catch (error: any) {
    self.postMessage({ type: 'error', error: error.message });
  }
};
