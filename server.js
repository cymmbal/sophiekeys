const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer(function (req, res) {
    console.log('Request URL:', req.url);

    // Normalize the URL to prevent directory traversal
    const safePath = path.normalize(req.url).replace(/^(\.\.[\/\\])+/, '');
    let filePath = path.join(__dirname, 'public', safePath);

    // If no specific file is requested, serve index.html
    if (req.url === '/') {
        filePath = path.join(__dirname, 'public', 'index.html');
    }

    console.log('Attempting to serve:', filePath);

    // Get the file extension and set content type
    const extname = path.extname(filePath);
    let contentType = 'text/html';
    switch (extname) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
        case '.json':
            contentType = 'application/json';
            break;
        case '.png':
            contentType = 'image/png';
            break;
        case '.jpg':
            contentType = 'image/jpg';
            break;
        case '.svg':
            contentType = 'image/svg+xml';
            break;
        case '.woff':
            contentType = 'application/font-woff';
            break;
        case '.woff2':
            contentType = 'application/font-woff2';
            break;
    }

    // Check if file exists before trying to read it
    if (!fs.existsSync(filePath)) {
        console.error('File does not exist:', filePath);
        // Try without /public in the path (in case it's in the URL)
        const altPath = filePath.replace('/public/public/', '/public/');
        if (fs.existsSync(altPath)) {
            filePath = altPath;
        } else {
            console.error('Alternative path also does not exist:', altPath);
            res.writeHead(404);
            res.end('404 Not Found');
            return;
        }
    }

    // Read and serve the file
    fs.readFile(filePath, function(error, content) {
        if (error) {
            console.error('Error reading file:', error);
            if(error.code === 'ENOENT') {
                console.error('File not found:', filePath);
                res.writeHead(404);
                res.end('404 Not Found');
            } else {
                console.error('Server error:', error);
                res.writeHead(500);
                res.end('Server Error: ' + error.code);
            }
        } else {
            console.log('Successfully serving:', filePath);
            // Add CORS headers to allow local testing
            res.writeHead(200, { 
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Surrogate-Control': 'no-store'
            });
            res.end(content, 'utf-8');
        }
    });
});

const PORT = 8000;
server.listen(PORT, () => {
    console.log(`HTTP Server running at http://localhost:${PORT}/`);
    console.log('Serving files from:', path.join(__dirname, 'public'));
}); 