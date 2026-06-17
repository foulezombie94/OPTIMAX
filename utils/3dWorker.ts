// @ts-ignore
import assimpjs from 'assimpjs';

function rewriteReferences(content: string, fileMap: Map<string, string>, isObj: boolean): string {
  const lines = content.split(/\r?\n/);
  const rewrittenLines = lines.map(line => {
    const trimmed = line.trim();
    if (isObj) {
      if (trimmed.toLowerCase().startsWith('mtllib ')) {
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 2) {
          const refPath = parts.slice(1).join(' ');
          const cleanRef = refPath.replace(/['"]/g, '').trim();
          const baseName = cleanRef.split(/[/\\]/).pop() || '';
          const exactName = fileMap.get(baseName.toLowerCase());
          if (exactName) {
            return `mtllib ${exactName}`;
          }
        }
      }
    } else {
      // It's an MTL file
      const match = trimmed.match(/^(map_Kd|map_Ka|map_Ks|map_Ns|map_d|map_bump|bump|disp|decal)\s+(.+)$/i);
      if (match) {
        const command = match[1];
        const refPath = match[2];
        const cleanRef = refPath.replace(/['"]/g, '').trim();
        const baseName = cleanRef.split(/[/\\]/).pop() || '';
        const exactName = fileMap.get(baseName.toLowerCase());
        if (exactName) {
          return `${command} ${exactName}`;
        }
      }
    }
    return line;
  });
  return rewrittenLines.join('\n');
}

function embedTexturesInGlb(glbArrayBuffer: ArrayBuffer, fileMap: Map<string, { name: string, buffer: ArrayBuffer }>): ArrayBuffer {
  const dataView = new DataView(glbArrayBuffer);
  
  // Read GLB header
  const magic = dataView.getUint32(0, true);
  const version = dataView.getUint32(4, true);
  const totalLength = dataView.getUint32(8, true);
  
  if (magic !== 0x46546c67) { // "glTF"
    throw new Error('Invalid GLB file');
  }
  
  // Read JSON chunk header
  const jsonChunkLength = dataView.getUint32(12, true);
  const jsonChunkType = dataView.getUint32(16, true);
  
  if (jsonChunkType !== 0x4e4f534a) {
    throw new Error('First chunk is not JSON');
  }
  
  // Read JSON chunk data
  const jsonBytes = new Uint8Array(glbArrayBuffer, 20, jsonChunkLength);
  const jsonString = new TextDecoder('utf-8').decode(jsonBytes);
  const gltf = JSON.parse(jsonString);
  
  let modified = false;
  if (gltf.images) {
    for (const img of gltf.images) {
      if (img.uri && !img.uri.startsWith('data:')) {
        const baseName = img.uri.split(/[/\\]/).pop().toLowerCase();
        const exactFile = fileMap.get(baseName);
        if (exactFile) {
          const lowerName = exactFile.name.toLowerCase();
          let mimeType = 'image/jpeg';
          if (lowerName.endsWith('.png')) mimeType = 'image/png';
          else if (lowerName.endsWith('.gif')) mimeType = 'image/gif';
          else if (lowerName.endsWith('.bmp')) mimeType = 'image/bmp';
          else if (lowerName.endsWith('.webp')) mimeType = 'image/webp';
          
          // Convert ArrayBuffer to base64 string
          const bytes = new Uint8Array(exactFile.buffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64Data = btoa(binary);
          
          img.uri = `data:${mimeType};base64,${base64Data}`;
          modified = true;
        }
      }
    }
  }
  
  if (!modified) {
    return glbArrayBuffer;
  }
  
  // Re-serialize JSON
  let newJsonString = JSON.stringify(gltf);
  // Pad with spaces to 4-byte boundary
  const remainder = newJsonString.length % 4;
  if (remainder !== 0) {
    newJsonString += ' '.repeat(4 - remainder);
  }
  
  const newJsonBytes = new TextEncoder().encode(newJsonString);
  
  // Prepare new GLB buffer
  const binChunkOffset = 20 + jsonChunkLength;
  const binChunkBytes = new Uint8Array(glbArrayBuffer, binChunkOffset);
  
  const newTotalLength = 20 + newJsonBytes.length + binChunkBytes.length;
  const newGlbBuffer = new ArrayBuffer(newTotalLength);
  const newGlbBytes = new Uint8Array(newGlbBuffer);
  const newGlbDataView = new DataView(newGlbBuffer);
  
  // Write header
  newGlbDataView.setUint32(0, magic, true);
  newGlbDataView.setUint32(4, version, true);
  newGlbDataView.setUint32(8, newTotalLength, true);
  
  // Write JSON chunk header and data
  newGlbDataView.setUint32(12, newJsonBytes.length, true);
  newGlbDataView.setUint32(16, 0x4e4f534a, true);
  newGlbBytes.set(newJsonBytes, 20);
  
  // Write BIN chunk (if exists)
  if (binChunkBytes.length > 0) {
    newGlbBytes.set(binChunkBytes, 20 + newJsonBytes.length);
  }
  
  return newGlbBuffer;
}

self.onmessage = async (e: MessageEvent) => {
  const { type, files, mainFileName, targetFormat } = e.data;

  if (type === 'convert') {
    try {
      self.postMessage({ type: 'progress', progress: 0.1 });
      
      const ajs = await (assimpjs as any)({
        locateFile: (path: string) => {
          if (path.endsWith('.wasm')) {
            return '/assimpjs.wasm';
          }
          return path;
        }
      });
      let fileList = new ajs.FileList();
      
      // Pre-read all file buffers and build the maps
      const fileMap = new Map<string, { name: string, buffer: ArrayBuffer }>();
      for (let i = 0; i < files.length; i++) {
        const item = files[i];
        const buffer = await item.file.arrayBuffer();
        fileMap.set(item.file.name.toLowerCase(), {
          name: item.file.name,
          buffer: buffer
        });
      }
      
      // Build a flat map of lowercase filenames to original name (for text rewriting)
      const flatMap = new Map<string, string>();
      fileMap.forEach((val, key) => flatMap.set(key, val.name));
      
      for (let i = 0; i < files.length; i++) {
        const item = files[i];
        // Normalize backslashes to forward slashes and clean leading slashes/dots
        const normalizedPath = item.path.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\//, '');
        const fileName = item.file.name;
        
        const fileInfo = fileMap.get(fileName.toLowerCase())!;
        const ext = fileName.split('.').pop()?.toLowerCase();
        let uint8Array: Uint8Array;
        
        if (ext === 'obj' || ext === 'mtl') {
          const text = new TextDecoder('utf-8').decode(fileInfo.buffer);
          const rewrittenText = rewriteReferences(text, flatMap, ext === 'obj');
          uint8Array = new TextEncoder().encode(rewrittenText);
        } else {
          uint8Array = new Uint8Array(fileInfo.buffer);
        }
        
        fileList.AddFile(normalizedPath, uint8Array);
        if (fileName !== normalizedPath) {
          fileList.AddFile(fileName, uint8Array);
        }
      }
      
      self.postMessage({ type: 'progress', progress: 0.5 });
      
      let format = targetFormat;
      if (format === 'glb' || format === 'gltf') format = 'glb2';
      if (format === 'obj') format = 'objnomtl'; // Usually safer for obj
      
      let result = ajs.ConvertFileList(fileList, format);
      
      if (!result.IsSuccess() || result.FileCount() === 0) {
        throw new Error(result.GetErrorCode() || 'Unknown conversion error');
      }
      
      const out = result.GetFile(0);
      const outContent = out.GetContent();
      
      let finalBuffer = outContent.slice().buffer;
      if (targetFormat === 'glb') {
        try {
          finalBuffer = embedTexturesInGlb(finalBuffer, fileMap);
        } catch (embedError) {
          console.error('Failed to embed textures in GLB:', embedError);
        }
      }
      
      if (finalBuffer.byteLength > 48 * 1024 * 1024) {
        throw new Error('Le fichier converti dépasse la limite de 48 Mo. (Les textures sont trop lourdes)');
      }
      
      let mimeType = 'application/octet-stream';
      if (targetFormat === 'glb') mimeType = 'model/gltf-binary';
      else if (targetFormat === 'gltf') mimeType = 'model/gltf+json';
      else if (targetFormat === 'obj') mimeType = 'model/obj';
      
      const resultBlob = new Blob([finalBuffer], { type: mimeType });
      
      self.postMessage({ type: 'progress', progress: 1.0 });
      self.postMessage({ 
        type: 'done', 
        blob: resultBlob 
      });
    } catch (error: any) {
      console.error('Conversion error:', error);
      self.postMessage({ type: 'error', error: error.message || 'Failed to convert 3D model.' });
    }
  }
};
