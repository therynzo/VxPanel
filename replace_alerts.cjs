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
  
  if (!content.includes('import { showToast }')) {
    content = content.replace(/import React[^;]*;\n/, match => match + 'import { showToast } from "../utils/toast";\n');
  }

  // Replace alert(err.message) -> showToast(err.message, "error")
  content = content.replace(/alert\(err\.message\);/g, 'showToast(err.message, "error");');
  
  // Replace alert("error message") -> showToast("error message", "error") for known error messages
  content = content.replace(/alert\("Failed to/g, 'showToast("Failed to');
  content = content.replace(/alert\("Please provide/g, 'showToast("Please provide');
  content = content.replace(/alert\("Error: /g, 'showToast("Error: ');
  content = content.replace(/alert\("Save failed/g, 'showToast("Save failed');

  // Replace alert(...) generic
  content = content.replace(/alert\((['"`])/g, (match, p1) => `showToast(${p1}`);

  // Need to fix the closing parenthesis for the ones that were just replaced above
  // This is tricky with simple regex if there are variables.
  // Instead, let's write a custom replace function.
  
  content = content.replace(/alert\((.*)\)/g, (match, p1) => {
    let type = '"info"';
    if (p1.toLowerCase().includes('success') || p1.toLowerCase().includes('written and saved')) type = '"success"';
    else if (p1.toLowerCase().includes('fail') || p1.toLowerCase().includes('error') || p1.toLowerCase().includes('please')) type = '"error"';
    
    return `showToast(${p1}, ${type})`;
  });

  fs.writeFileSync(file, content);
});
console.log("Done");
