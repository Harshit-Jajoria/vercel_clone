const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const mime = require('mime-types');
const Redis = require('ioredis');

const s3Client = new S3Client({
    region: 'ap-south-1',
    credentials: {
      accessKeyId: 'AKIAZQ3DTPO5VBM3VUZM',
      secretAccessKey: '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',
    },
  });

const PROJECT_ID = process.env.PROJECT_ID;

async function init() {
  console.log('Executing script.js');
  const outDirPath = path.join(__dirname, 'output');

  const p = exec(`cd ${outDirPath} && npm install && npm run build`);

  p.stdout.on('data', function (data) {
    console.log(data.toString());
  });

  p.stdout.on('error', function (data) {
    console.log('Error', data.toString());
  });

  p.on('close', async function () {
    console.log('Build Complete');

    const contents = fs.readdirSync(outDirPath);

    // Filter out folders
    const folders = contents.filter(item => fs.statSync(path.join(outDirPath, item)).isDirectory());
    console.log('folders',folders);

    // Print folders and their files
    if (folders.length > 0) {
      console.log('Folders and files found after build:');
      folders.forEach(folder => {
        console.log(`${folder}->`);
        const folderPath = path.join(outDirPath, folder);
        const files = fs.readdirSync(folderPath);
        files.forEach(file => console.log(`          ${file}`));
      });
    } else {
      console.log('No folders found after build.');
    }

    console.log('Starting upload...');

    // for (const folder of folders) {
    //   const folderPath = path.join(outDirPath, folder);
    //   const folderContents = fs.readdirSync(folderPath, { recursive: true });

    //   for (const file of folderContents) {
    //     const filePath = path.join(folderPath, file);
    //     if (fs.lstatSync(filePath).isDirectory()) continue;

    //     console.log('Uploading', filePath);

    //     const command = new PutObjectCommand({
    //       Bucket: 'harshitjajoria',
    //       Key: `__outputs/${PROJECT_ID}/${folder}/${file}`,
    //       Body: fs.createReadStream(filePath),
    //       ContentType: mime.lookup(filePath),
    //     });

    //     await s3Client.send(command);

    //     console.log('Uploaded', filePath);
    //   }
    // }

    console.log('Upload complete.');
  });
}

init();


