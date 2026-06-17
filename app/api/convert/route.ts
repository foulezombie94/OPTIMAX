import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import assimpjs from 'assimpjs';
import AdmZip from 'adm-zip';
import path from 'path';

function getCleanFilename(pathOrOptions: string): string {
  // Decode URL encoding if any
  let clean = decodeURIComponent(pathOrOptions).trim();
  // Strip outer quotes if any
  if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.substring(1, clean.length - 1).trim();
  }
  
  // Only split by whitespace if we detect option flags starting with a hyphen
  if (clean.includes(' -') || clean.startsWith('-')) {
    const quoteMatch = clean.match(/["']([^"']+)["']$/);
    if (quoteMatch) {
      clean = quoteMatch[1];
    } else {
      const parts = clean.split(/\s+/);
      clean = parts[parts.length - 1];
    }
  }
  
  // Take the filename from the path
  return clean.split(/[/\\]/).pop() || '';
}

function embedTexturesInGlb(glbArrayBuffer: ArrayBuffer, fileMap: Map<string, { name: string, data: Buffer }>): ArrayBuffer {
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
        const cleanName = getCleanFilename(img.uri).toLowerCase();
        const exactFile = fileMap.get(cleanName);
        if (exactFile) {
          const lowerName = exactFile.name.toLowerCase();
          let mimeType = 'image/jpeg';
          if (lowerName.endsWith('.png')) mimeType = 'image/png';
          else if (lowerName.endsWith('.gif')) mimeType = 'image/gif';
          else if (lowerName.endsWith('.bmp')) mimeType = 'image/bmp';
          else if (lowerName.endsWith('.webp')) mimeType = 'image/webp';
          
          const base64Data = exactFile.data.toString('base64');
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

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    const fileMap = new Map<string, { name: string, data: Buffer }>();
    let mainFileName = '';
    const targetFormat = (formData.get('targetFormat') as string) || 'glb';
    
    // Check if a single ZIP file was uploaded
    const zipFile = formData.get('file') as File | null;
    
    if (zipFile && zipFile.name.endsWith('.zip')) {
      const arrayBuffer = await zipFile.arrayBuffer();
      const zip = new AdmZip(Buffer.from(arrayBuffer));
      const entries = zip.getEntries();
      
      for (const entry of entries) {
        if (entry.isDirectory) continue;
        const data = entry.getData();
        const path = entry.entryName.replace(/\\/g, '/');
        const fileName = path.split('/').pop() || '';
        
        fileMap.set(path.toLowerCase(), { name: fileName, data });
        fileMap.set(fileName.toLowerCase(), { name: fileName, data });
        
        if (!mainFileName && fileName.match(/\.(obj|fbx|stl|glb|gltf|ply|dae)$/i)) {
          mainFileName = fileName;
        }
      }
    } else {
      // Handle multiple files
      const files = formData.getAll('files') as File[];
      const paths = formData.getAll('paths') as string[];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const path = paths[i] || file.name;
        const normalizedPath = path.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\//, '');
        const fileName = file.name;
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        fileMap.set(normalizedPath.toLowerCase(), { name: fileName, data: buffer });
        fileMap.set(fileName.toLowerCase(), { name: fileName, data: buffer });
        
        if (!mainFileName && fileName.match(/\.(obj|fbx|stl|glb|gltf|ply|dae)$/i)) {
          mainFileName = fileName;
        }
      }
    }
    
    if (!mainFileName) {
      return NextResponse.json({ error: 'Aucun fichier 3D valide trouvé (.obj, .fbx, .stl...)' }, { status: 400 });
    }
    
    const wasmPath = path.join(process.cwd(), 'node_modules', 'assimpjs', 'dist', 'assimpjs.wasm');
    const ajs = await assimpjs({
      locateFile: (name: string) => {
        if (name.endsWith('.wasm')) {
          return wasmPath;
        }
        return name;
      }
    });
    
    // Helper to rewrite references in OBJ/MTL
    const rewriteReferences = (content: string, isObj: boolean): string => {
      const lines = content.split(/\r?\n/);
      let hasMtllib = false;
      const rewrittenLines = lines.map(line => {
        const trimmed = line.trim();
        if (isObj) {
          if (trimmed.toLowerCase().startsWith('mtllib ')) {
            hasMtllib = true;
            const rest = trimmed.substring(7).trim();
            const cleanName = getCleanFilename(rest);
            const exactFile = fileMap.get(cleanName.toLowerCase());
            if (exactFile) {
              const formattedName = exactFile.name.includes(' ') ? `"${exactFile.name}"` : exactFile.name;
              return `mtllib ${formattedName}`;
            }
          }
        } else {
          const match = trimmed.match(/^(map_Kd|map_Ka|map_Ks|map_Ns|map_d|map_bump|bump|disp|decal|map_Ke|map_Pr|map_Pm|map_Ps|norm|map_norm|map_Refl|refl)\s+(.+)$/i);
          if (match) {
            const command = match[1];
            const rest = match[2].trim();
            
            // Extract options and filename
            let refPath = '';
            let options = '';
            
            const quoteMatch = rest.match(/(.*?)["']([^"']+)["']$/);
            if (quoteMatch) {
              options = quoteMatch[1].trim();
              refPath = quoteMatch[2];
            } else {
              // If there are options (containing hyphen), split. Otherwise, the whole rest is the path.
              if (rest.includes(' -') || rest.startsWith('-')) {
                const tokens = rest.split(/\s+/);
                refPath = tokens[tokens.length - 1];
                options = tokens.slice(0, tokens.length - 1).join(' ').trim();
              } else {
                refPath = rest;
              }
            }
            
            const cleanName = getCleanFilename(refPath);
            const exactFile = fileMap.get(cleanName.toLowerCase());
            if (exactFile) {
              const newName = exactFile.name;
              const formattedName = newName.includes(' ') ? `"${newName}"` : newName;
              const separator = options ? ' ' : '';
              return `${command} ${options}${separator}${formattedName}`;
            }
          }
        }
        return line;
      });

      // Fail-safe: if OBJ file has no mtllib link but we have an MTL file, inject it!
      if (isObj && !hasMtllib) {
        let mtlFile = '';
        for (const val of fileMap.values()) {
          if (val.name.toLowerCase().endsWith('.mtl')) {
            mtlFile = val.name;
            break;
          }
        }
        if (mtlFile) {
          const formattedMtl = mtlFile.includes(' ') ? `"${mtlFile}"` : mtlFile;
          rewrittenLines.unshift(`mtllib ${formattedMtl}`);
        }
      }

      return rewrittenLines.join('\n');
    };
    
    const existsCallback = (name: string): boolean => {
      const cleanName = getCleanFilename(name).toLowerCase();
      return fileMap.has(cleanName);
    };
    
    const loadCallback = (name: string): Uint8Array => {
      const cleanName = getCleanFilename(name).toLowerCase();
      const fileInfo = fileMap.get(cleanName);
      
      if (!fileInfo) return new Uint8Array();
      
      const ext = fileInfo.name.split('.').pop()?.toLowerCase();
      if (ext === 'obj' || ext === 'mtl') {
        const text = new TextDecoder('utf-8').decode(fileInfo.data);
        const rewritten = rewriteReferences(text, ext === 'obj');
        return new TextEncoder().encode(rewritten);
      }
      
      return new Uint8Array(fileInfo.data);
    };
    
    // Read the main file
    const mainFileInfo = fileMap.get(mainFileName.toLowerCase())!;
    const mainExt = mainFileName.split('.').pop()?.toLowerCase();
    let mainContent: Uint8Array;
    if (mainExt === 'obj' || mainExt === 'mtl') {
      const text = new TextDecoder('utf-8').decode(mainFileInfo.data);
      const rewritten = rewriteReferences(text, mainExt === 'obj');
      mainContent = new TextEncoder().encode(rewritten);
    } else {
      mainContent = new Uint8Array(mainFileInfo.data);
    }
    
    let format = targetFormat;
    if (format === 'glb' || format === 'gltf') format = 'glb2';
    
    const result = ajs.ConvertFile(
      mainFileName,
      format,
      mainContent,
      existsCallback,
      loadCallback
    );
    
    if (!result.IsSuccess() || result.FileCount() === 0) {
      return NextResponse.json({ error: result.GetErrorCode() || 'Erreur lors de la conversion' }, { status: 500 });
    }
    
    const out = result.GetFile(0);
    const outContent = out.GetContent();
    let finalBuffer = outContent.slice().buffer;
    
    // Embed textures if we target GLB
    if (targetFormat === 'glb') {
      try {
        finalBuffer = embedTexturesInGlb(finalBuffer, fileMap);
      } catch (embedError) {
        console.error('Failed to embed textures in GLB on server:', embedError);
      }
    }
    
    let mimeType = 'application/octet-stream';
    if (targetFormat === 'glb') mimeType = 'model/gltf-binary';
    else if (targetFormat === 'gltf') mimeType = 'model/gltf+json';
    else if (targetFormat === 'obj') mimeType = 'model/obj';
    else if (targetFormat === 'stl') mimeType = 'model/stl';
    
    return new Response(finalBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="converted_${mainFileName.split('.')[0]}.${targetFormat}"`,
      }
    });
  } catch (error: any) {
    console.error('Error in conversion API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
