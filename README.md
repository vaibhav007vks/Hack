# Smart Library Seat Finder (with Backend)

## Run it
1. Install Node.js from https://nodejs.org
2. In this folder, run:
   npm install
   npm start
3. Open http://localhost:3000

Always open the site through the server (not by double-clicking index.html).

## Folders
- server.js  -> backend (Express API, saves data in data.json)
- public/    -> frontend (index.html, style.css, app.js)

## API
GET    /api/seats/:floor       seats of a floor
GET    /api/booking            my booking
POST   /api/booking            book a seat      { seat, floor }
POST   /api/booking/checkin    check in         { qrData }
POST   /api/booking/break      start 20-min break
DELETE /api/booking            cancel booking
POST   /api/reset              reset demo data
