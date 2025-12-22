# Project context
This project aims to be a desktop software working on MacOS, Linux and Windows and provides mail anti spam AI features, using OpenRouter and Ollama. The user can configure antispam rules and they are sent to the AI 

# Project design
You shall use Shadcn UI for every component and tailwind whenever you need some adjustments.
You need to respect and use the Shadcn UI colors. The colors are globally defined in app/globals.css. Refer to this file whenever you need to use colors. If you need some colors not defined in this file, use tailwind css classes.
If you need to use toasts, sonner is installed.

# Project configuration
The project is a NextJS project and aims to be desktop only with ElectronJS.
The UI library is Shadcn UI with TailwindCSS and Tailwind Animate CSS. If needed, add the shadcn components with: npx shadcn@latest add <component>
As this is a desktop app, there are no backend server. All the data need to be stored locally using electron-store only.
The project uses NPM as package manager.
If you need icons, lucide-icons is installed.
Never write tests, build or run npm run dev as npm run dev is always running. If an app restart is needed, just tell me.


# Documentation
Always use context7 when I need code generation, setup or configuration steps, or
library/API documentation. This means you should automatically use the Context7 MCP
tools to resolve library id and get library docs without me having to explicitly ask whenever you need it.
