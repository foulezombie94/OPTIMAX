const assimpjs = require('assimpjs')();

assimpjs.then((ajs) => {
    let fileList = new ajs.FileList();
    const objContent = `v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n`;
    fileList.AddFile('test.obj', new TextEncoder().encode(objContent));
    
    let result = ajs.ConvertFileList(fileList, 'glb2');
    console.log("Keys on Result prototype:", Object.keys(Object.getPrototypeOf(result)));
});
