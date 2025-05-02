# Northern Attitude

A collaborative writing and roleplaying platform.

## Installation

1. Make sure you have Node.js and npm installed
2. Clone this repository
3. Install dependencies:

```bash
# Run installation script
./install-deps.sh

# Or install manually
npm install
```

## Running the application

```bash
# Start the application
npm start

# For development with auto-restart
npm run dev
```

## Troubleshooting

If you encounter dependency errors:

1. Delete the node_modules folder:
```bash
rm -rf node_modules
```

2. Clear npm cache:
```bash
npm cache clean --force
```

3. Reinstall dependencies:
```bash
npm install
```

## Database Setup

Make sure your MySQL database is running and create a `.env` file with your database credentials:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=northern_attitude
SESSION_SECRET=your_session_secret
```
