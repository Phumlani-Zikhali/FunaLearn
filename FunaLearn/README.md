# FunaLearn

An accessible local learning platform for learners, teachers and school administrators. Built with React, TypeScript, Vite and a Node.js server with SQLite.

## What it does

- Lessons, read-aloud support, flashcards and quizzes with saved progress.
- Ten earned badges and class leaderboards.
- Teacher resources, assignments, messages and learner reports.
- Class joining using a teacher-issued code.
- Private, open-ended AI tutor conversations, with optional local Ollama fallback.
- Reading fonts, spacing, contrast, dark mode and focus tools.

## Requirements

- **Node.js 24.14 or newer within Node 24**, including npm. `.nvmrc` selects Node 24.
- Windows for the double-click launcher. The npm commands are also suitable for other systems.
- Internet for installing dependencies and using cloud AI. Ollama and a downloaded Llama 3.2 model are optional for local AI.

## Run a fresh copy

From the project directory:

```sh
npm ci
npm run build
npm start
```

Open **http://127.0.0.1:4311**. The first run creates a new local database automatically. Create the first administrator account through the welcome screen. Later registrations are learners; the administrator can assign teacher roles and create classes.

On Windows, after installing and building, double-click **Open FunaLearn.bat** instead. It starts the app at **http://127.0.0.1:4310**, opens the browser, and starts an installed Ollama service if available. It reuses an already-running FunaLearn server.

For development:

```sh
npm run dev
```

This opens the development server at **http://127.0.0.1:4310**, with the API on port 4311. Stop an existing app using those ports before starting development.

## Optional AI setup

Copy `.env.example` to `.env` in the project root. Enter your own keys locally. Never commit `.env`.

- `AI_PROVIDER=auto`: Gemini, then OpenRouter if configured, then local Ollama.
- `AI_PROVIDER=ollama`: use only the local model.
- `AI_PROVIDER=disabled`: disable the tutor; other learning features remain available.

For local AI, install Ollama, download `llama3.2`, and run its service at `http://127.0.0.1:11434`. No model files or API keys are included in this repository. Online services may require an account and have usage charges or quotas. Automated tests use mocks or disabled AI and require no keys.

The tutor stores each account's conversation locally and sends recent chat context to the selected AI service. Activity Studio sends selected lesson material and permitted class resources when generating drafts. Provider names are not shown in tutor replies. AI explanations and generated practice need educator review.

## Optional simulation

```sh
npm run simulate
```

This creates **eight students, one teacher and one administrator**, plus a simulation class, varied progress, quizzes, notes, a resource, assignment and messages. Generated sign-in details are written to **Simulation accounts.txt** on your computer. The file and the database are excluded from Git. Never upload that file, even to a private repository.

Create your own administrator account first if you want one separate from the simulation administrator. The script refuses to overwrite an existing simulation or credentials file. Streaks naturally change as calendar days pass; earned badges remain.

## Classes

Teachers find join codes under **Messages**; administrators find them under **Classes**. Learners without a class get a join prompt after sign-in and can also join through **Messages → Join class**. A code adds only the signed-in learner to the class.

## Checks

```sh
npm run check:repository
npm run format:check
npm test
npm run build
```

The repository check requires Git and scans staged/tracked file contents for private-file names and common credential patterns. It is an additional safeguard, not a complete security audit. GitHub Actions runs these checks on pushes and pull requests using Node 24 on Linux and Windows.

## Data and current scope

Records are stored in `data/funalearn.sqlite`; `.env`, database files, backups, logs and simulation passwords are never included in the repository. Back up the database consistently before moving an installation. A fresh checkout starts without existing accounts or learning records.

This is a **local application**, bound to the loopback interface. Publishing its source on GitHub does not host the website. GitHub Pages cannot run its Node server or SQLite database. Public deployment requires separate work on administrator bootstrap, HTTPS, account recovery, per-user abuse controls, persistence, privacy and operations. Local Ollama works only on the machine running the server.

The included introductory lessons are not a complete or certified curriculum. See [Security and privacy](SECURITY.md) and [Repository publishing](docs/PUBLISHING.md).

## Project layout

- `src/`: interface, routes and accessibility tools.
- `server/`: authentication, permissions, database, learning rules and AI adapters.
- `scripts/`: local launch, simulation and repository checks.
- `tests/`: isolated tests for access, learning progress, chat, class joining and AI fallback.
- `public/fonts/`: self-hosted fonts and their licences.

## Permissions and third-party notices

The project is marked `UNLICENSED`; no open-source reuse licence has been selected. Repository access does not add a separate reuse licence. Third-party libraries and fonts retain their respective licences; font notices are included alongside the font files. Choose an appropriate project licence before offering the code for public reuse.
