import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectPath = __dirname;
const srcPath = path.join(projectPath, 'src');
const pluginsFilePath = path.join(srcPath, 'plugins-data.json');

// Create HTTP server
const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Serve static files
    if (req.method === 'GET' && !req.url.startsWith('/save')) {
        let filePath;
        if (req.url === '/') {
            filePath = path.join(srcPath, 'index.html');
        } else if (req.url.startsWith('/src/')) {
            filePath = path.join(projectPath, req.url);
        } else {
            filePath = path.join(srcPath, req.url);
        }
        
        fs.readFile(filePath, (err, data) => {
            if (err) {
                console.log(`❌ File not found: ${filePath}`);
                res.writeHead(404);
                res.end('File not found');
                return;
            }
            
            const ext = path.extname(filePath);
            let contentType = 'text/html';
            
            if (ext === '.js') contentType = 'text/javascript';
            else if (ext === '.css') contentType = 'text/css';
            else if (ext === '.json') contentType = 'application/json';
            else if (ext === '.png') contentType = 'image/png';
            else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
            else if (ext === '.svg') contentType = 'image/svg+xml';
            
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
    }
    else if (req.method === 'POST' && req.url === '/save-plugins') {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                JSON.parse(body);
                
                // Write to file
                fs.writeFile(pluginsFilePath, body, err => {
                    if (err) {
                        console.error('❌ Write error:', err);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: 'Write error: ' + err.message }));
                        return;
                    }
                    
                    console.log(`✅ Successfully saved to ${pluginsFilePath}`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: true, 
                        message: '✅ JSON file saved successfully' 
                    }));
                });
            } catch (e) {
                console.error('❌ Invalid JSON:', e);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'Invalid JSON: ' + e.message }));
            }
        });
    } else {
        res.writeHead(404);
        res.end('Endpoint not found');
    }
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`✅ Server started on http://localhost:${PORT}`);
    console.log(`ℹ️  Admin page accessible at http://localhost:${PORT}/src/Admin/index.html`);
    console.log(`ℹ️  Changes will be saved to ${pluginsFilePath}`);
});