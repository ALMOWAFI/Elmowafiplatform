const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const render = require('./lib/render');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'family-tree', port: PORT });
});

// Get available example family trees
app.get('/api/examples', (req, res) => {
  try {
    const examplesDir = path.join(__dirname, 'examples');
    const files = fs.readdirSync(examplesDir)
      .filter(file => file.endsWith('.yml'))
      .map(file => ({
        name: file.replace('.yml', ''),
        filename: file
      }));
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load examples' });
  }
});

// Generate family tree from YAML data
app.post('/api/generate', async (req, res) => {
  try {
    const { yamlData, format = 'svg' } = req.body;
    
    if (!yamlData) {
      return res.status(400).json({ error: 'YAML data is required' });
    }

    // Parse YAML
    const familyData = yaml.safeLoad(yamlData);
    
    // Generate family tree
    const result = await render(familyData, { format, async: true });
    
    res.json({ 
      success: true, 
      format,
      result 
    });
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate family tree',
      details: error.message 
    });
  }
});

// Upload and generate family tree from file
app.post('/api/upload', upload.single('yamlFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const yamlContent = fs.readFileSync(req.file.path, 'utf8');
    const familyData = yaml.safeLoad(yamlContent);
    const format = req.body.format || 'svg';
    
    const result = await render(familyData, { format, async: true });
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    res.json({ 
      success: true, 
      format,
      result 
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to process uploaded file',
      details: error.message 
    });
  }
});

// Get example family tree
app.get('/api/examples/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'examples', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Example not found' });
    }
    
    const yamlContent = fs.readFileSync(filePath, 'utf8');
    res.json({ 
      filename,
      content: yamlContent 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load example' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Family Tree Service running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  GET  /health - Health check');
  console.log('  GET  /api/examples - List available examples');
  console.log('  GET  /api/examples/:filename - Get example content');
  console.log('  POST /api/generate - Generate tree from YAML data');
  console.log('  POST /api/upload - Upload and generate tree from file');
});

module.exports = app;