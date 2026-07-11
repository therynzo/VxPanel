# VxPanel

VxPanel is a premium, next-generation Minecraft server management panel designed for high performance, ease of use, and a sleek aesthetic interface.

## Installation & Setup

To get started with VxPanel locally, follow these steps:

1. **Clone the repository** (or download the source):
   \`\`\`bash
   git clone <YOUR_GITHUB_REPO_URL_HERE>
   cd vxpanel
   \`\`\`
   *(Note: Remember to link your GitHub repository here once you push the code!)*

2. **Install dependencies**:
   \`\`\`bash
   npm install
   \`\`\`

3. **Build the application**:
   \`\`\`bash
   npm run build
   \`\`\`

4. **Start the server**:
   \`\`\`bash
   npm start
   \`\`\`
   *(Alternatively, run \`npm run dev\` for the development server).*

   **The website/panel is hosted at http://localhost:7777**

## Creating an Admin User

To easily create a new admin user from your terminal, use the provided custom command:

\`\`\`bash
npm run createuser
\`\`\`

Follow the prompts to enter a username, email, and password. This command securely hashes your password and creates a master admin account so you can log in to the panel immediately.

## Features

- **Minecraft Server Management:** Full control over your Minecraft servers (Paper, Purpur, Fabric).
- **Real-time Console & Analytics:** Live terminal logs and resource utilization graphs (CPU, RAM, Disk).
- **File Manager:** Built-in web file manager for server files.
- **Admin Dashboard:** Total administration of servers, nodes, users, and global settings.
- **Modern UI:** Premium design with customizable themes and responsive layouts.

## Default Admin Account

Upon first start, an administrative account is automatically generated:
- **CreateUser:** bash npm createuser

> **Security Warning:** Please change the default admin credentials immediately after your first login!

## License
© 2026 VxPanel. All rights reserved.
