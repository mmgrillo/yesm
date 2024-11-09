const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

async function buildAndCopy() {
  try {
    console.log('Current directory:', process.cwd());
    console.log('Files in current directory:', fs.readdirSync('.'));

    // Install frontend dependencies
    console.log('Installing frontend dependencies...');
    execSync('cd yesm-front && npm install', { stdio: 'inherit' });

    // Build frontend
    console.log('Building frontend...');
    execSync('cd yesm-front && npm run build', { stdio: 'inherit' });

    // Ensure build directory exists
    const buildPath = path.join(process.cwd(), 'build');
    console.log('Creating build directory at:', buildPath);
    fs.ensureDirSync(buildPath);

    // Copy build files
    const sourcePath = path.join(process.cwd(), 'yesm-front', 'build');
    console.log('Copying from:', sourcePath, 'to:', buildPath);
    fs.copySync(sourcePath, buildPath);

    console.log('Build files copied successfully. Contents of build directory:');
    console.log(fs.readdirSync(buildPath));
  } catch (error) {
    console.error('Build script failed:', error);
    process.exit(1);
  }
}

buildAndCopy();