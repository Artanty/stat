const fs = require('fs');
const path = require('path');

const folderPath = path.join(__dirname, '../dist');

// Check if the folder exists
if (fs.existsSync(folderPath)) {
  // Delete the folder
  fs.rm(folderPath, { recursive: true, force: true }, (err) => {
    if (err) {
      console.error('Error deleting folder:', err);
      process.exit(1); // Exit with error code
    } else {
      console.log('Folder deleted successfully:', folderPath);
    }
  });
} else {
  console.log('Folder does not exist:', folderPath);
}