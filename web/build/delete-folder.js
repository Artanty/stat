const fs = require('fs');
const path = require('path');

const folderPath = path.join(__dirname, '../.parcel-cache');

fs.rm(folderPath, { recursive: true, force: true }, (err) => {
  if (err) {
    console.error('Error deleting folder:', err);
    process.exit(1); // Exit with error code
  } else {
    console.log('Folder deleted successfully:', folderPath);
  }
});