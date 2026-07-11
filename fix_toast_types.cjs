const fs = require('fs');

const files = [
  'src/components/UserManagement.tsx',
  'src/components/ServerManagement.tsx',
  'src/components/LoginView.tsx',
  'src/components/AppearanceSettings.tsx',
  'src/components/ServerDetail.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf-8');
  
  // Make "Failed to" and "Error:" into error type if they aren't already
  content = content.replace(/showToast\("Failed to([^"]+)"\)/g, 'showToast("Failed to$1", "error")');
  content = content.replace(/showToast\("Please provide([^"]+)"\)/g, 'showToast("Please provide$1", "error")');
  content = content.replace(/showToast\("Error:([^"]+)"\)/g, 'showToast("Error:$1", "error")');
  content = content.replace(/showToast\("Save failed([^"]*)"\)/g, 'showToast("Save failed$1", "error")');
  
  // Make "successfully" into success type
  content = content.replace(/showToast\("([^"]*successfully[^"]*)"\)/g, 'showToast("$1", "success")');
  content = content.replace(/showToast\("([^"]*Successfully[^"]*)"\)/g, 'showToast("$1", "success")');

  fs.writeFileSync(file, content);
});
console.log("Fixed toast types");
