const express = require('express');
const { generateSlug } = require('random-word-slugs');
const { ECSClient, RunTaskCommand } = require('@aws-sdk/client-ecs');
const { Server } = require('socket.io');
const Redis = require('ioredis');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors({ origin: '*' }));
const PORT = 9000;

const subscriber = new Redis(
  'rediss://default:AVNS_cuXZWgGVn3POFWMVcRq@redis-153115e7-comder6674-115b.a.aivencloud.com:15267'
);
console.log(subscriber);

const io = new Server({ cors: '*' });

io.on('connection', (socket) => {
  socket.on('subscribe', (channel) => {
    socket.join(channel);
    socket.emit('message', `Joined ${channel}`);
  });
});

io.listen(9002, () => console.log('Socket Server 9002'));

const ecsClient = new ECSClient({
  region: 'ap-south-1',
  credentials: {
    accessKeyId: 'AKIAZQ3DTPO5VBM3VUZM',
    secretAccessKey: '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',
  },
});

const config = {
  CLUSTER: 'arn:aws:ecs:ap-south-1:654654536635:cluster/builder-clusterr',
  TASK: 'arn:aws:ecs:ap-south-1:654654536635:task-definition/builder-task',
};

app.use(express.json());

app.post('/project', async (req, res) => {
  const { gitURL, slug } = req.body;
  const projectSlug = slug ? slug : generateSlug();

  // Spin the container
  const command = new RunTaskCommand({
    cluster: config.CLUSTER,
    taskDefinition: config.TASK,
    launchType: 'FARGATE',
    count: 1,
    networkConfiguration: {
      awsvpcConfiguration: {
        assignPublicIp: 'ENABLED',
        subnets: [
          'subnet-0107757958dedecac',
          'subnet-0b981cdd76f12029e',
          'subnet-074d1221760982c76',
        ],
        securityGroups: ['sg-0696e2f76a7e0d367'],
      },
    },
    overrides: {
      containerOverrides: [
        {
          name: 'builder-image',
          environment: [
            { name: 'GIT_REPOSITORY__URL', value: gitURL },
            { name: 'PROJECT_ID', value: projectSlug },
          ],
        },
      ],
    },
  });

  await ecsClient.send(command);

  return res.json({
    status: 'queued',
    data: { projectSlug, url: `http://${projectSlug}.localhost:8000` },
  });
});

async function initRedisSubscribe() {
  console.log('Subscribed to logs....');
  subscriber.psubscribe('logs:*');
  subscriber.on('pmessage', (pattern, channel, message) => {
    io.to(channel).emit('message', message);
  });
}

initRedisSubscribe();

app.listen(PORT, () => console.log(`API Server Running..${PORT}`));
