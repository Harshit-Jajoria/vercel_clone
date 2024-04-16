const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const mime = require('mime-types');
const Redis = require('ioredis');

const publisher = new Redis(
  'rediss://default:AVNS_cuXZWgGVn3POFWMVcRq@redis-153115e7-comder6674-115b.a.aivencloud.com:15267'
);



// console.log(publisher);

const s3Client = new S3Client({
  region: 'ap-south-1',
  credentials: {
    accessKeyId: 'AKIAZQ3DTPO5VBM3VUZM',
    secretAccessKey: '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',
  },
});

const PROJECT_ID = process.env.PROJECT_ID;

function publishLog(log) {
  publisher.publish(`logs:${PROJECT_ID}`, JSON.stringify({ log }));
}

async function init() {
  console.log('Executing script.js');
  publishLog('Build Started...');
  const outDirPath = path.join(__dirname, 'output');

  const p = exec(`cd ${outDirPath} && npm install && BUILD_PATH='./dist' npm run build`);

  p.stdout.on('data', function (data) {
    console.log(data.toString());
    publishLog(data.toString());
  });

  p.stdout.on('error', function (data) {
    console.log('Error', data.toString());
    publishLog(`error: ${data.toString()}`);
  });

  p.on('close', async function () {
    console.log('Build Complete');
    publishLog(`Build Complete`);

    let distFolderName;
    if (fs.existsSync(path.join(outDirPath, 'dist'))) {
      distFolderName = 'dist';
    } else if (fs.existsSync(path.join(outDirPath, 'build'))) {
      distFolderName = 'build';
    } else {
      console.log('Neither dist nor build folder exists. Exiting...');
      return;
    }
    const distFolderPath = path.join(outDirPath, distFolderName);
    const distFolderContents = fs.readdirSync(distFolderPath, {
      recursive: true,
    });

    publishLog(`Starting to upload`);
    for (const file of distFolderContents) {
      const filePath = path.join(distFolderPath, file);
      if (fs.lstatSync(filePath).isDirectory()) continue;

      console.log('uploading', filePath);
      publishLog(`uploading ${file}`);

      const command = new PutObjectCommand({
        Bucket: 'harshitjajoria',
        Key: `__outputs/${PROJECT_ID}/${file}`,
        Body: fs.createReadStream(filePath),
        ContentType: mime.lookup(filePath),
      });

      await s3Client.send(command);
      publishLog(`uploaded ${file}`);
      console.log('uploaded', filePath);
    }
    publishLog(`Done`);
    console.log('Done...');
  });
}

init();
