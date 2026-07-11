# VxPanel

VxPanel is a premium, next-generation Minecraft server management panel designed for high performance, ease of use, and a sleek aesthetic interface.

## Installation & Setup

To get started with VxPanel locally, follow these steps step-by-step:

### 1. Prerequisites
Ensure you have the following installed on your system:
- **Node.js** (v18 or higher recommended)
- **Git**

### 2. Clone the Repository
\`\`\`bash
git clone <YOUR_GITHUB_REPO_URL_HERE>
cd vxpanel
\`\`\`
*(Note: Replace the URL with your actual GitHub repository URL once uploaded)*

### 3. Install Dependencies
Install all required packages, including PM2 for process management:
\`\`\`bash
npm install
npm install -g pm2
\`\`\`

### 4. Build the Panel
Compile the TypeScript and React frontend:
\`\`\`bash
npm run build
\`\`\`

### 5. Create an Admin Account
Initialize the database and create your master administrator account using the custom command:
\`\`\`bash
npm run createuser
\`\`\`
Follow the prompts to set your username, email, and password.

### 6. Configure the Port (Optional but recommended for localhost:7777)
By default, the panel runs on port \`3000\`. If you want to run it on port \`7777\`, open the \`ecosystem.config.cjs\` file and add \`PORT: 7777\` to the \`env\` block like this:
\`\`\`javascript
module.exports = {
  apps: [
    {
      name: 'vxpanel',
      script: 'dist/server.cjs',
      env: {
        NODE_ENV: 'production',
        PORT: 7777
      }
    }
  ]
};
\`\`\`

### 7. Start the Server
Start the panel using PM2:
\`\`\`bash
npm start
\`\`\`
*(This will run \`pm2 start ecosystem.config.cjs\` in the background or foreground depending on configuration).*

You can now access your panel at: **http://localhost:3000** (or **http://localhost:7777** if you changed the port).

---

## Updating the Panel from GitHub
Whenever you push new changes to your GitHub repository, you can update your live server easily with a single command:
\`\`\`bash
npm run update
\`\`\`
This custom command will automatically pull the latest files from Git, install dependencies, rebuild the panel, and restart the PM2 process!

## Features

- **Minecraft Server Management:** Full control over your Minecraft servers (Paper, Purpur, Fabric).
- **Real-time Console & Analytics:** Live terminal logs and resource utilization graphs (CPU, RAM, Disk).
- **File Manager:** Built-in web file manager for server files.
- **Admin Dashboard:** Total administration of servers, nodes, users, and global settings.
- **Modern UI:** Premium design with customizable themes and responsive layouts.

## License
© 2026 VxPanel. All rights reserved.
