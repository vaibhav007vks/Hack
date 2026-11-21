// SMART LIBRARY SEAT FINDER - BACKEND (Node.js + Express)
// Data is stored in data.json so it survives server restarts.

const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data.json");

const TOTAL_FLOORS = 4;
const SEATS_PER_FLOOR = 150;
const BREAK_DURATION_MS = 20 * 60 * 1000; // 20 minutes


// ---------- DATABASE (simple JSON file) ----------

function createDefaultData() {
    const floors = {};

    for (let floor = 1; floor <= TOTAL_FLOORS; floor++) {
        floors[floor] = [];

        for (let i = 1; i <= SEATS_PER_FLOOR; i++) {
            floors[floor].push({
                id: "F" + floor + "-S" + i,
                // demo data: some seats are already used by other students
                occupied: (i % 4 === 0 || i % 7 === 0)
            });
        }
    }

    // bookings are stored by userId: { userId: { seat, floor, checkedIn, ... } }
    return { floors: floors, bookings: {} };
}

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
        }
    } catch (error) {
        console.log("Could not read data.json, creating fresh data.", error.message);
    }
    return createDefaultData();
}

let db = loadData();

function saveData() {
    // write to a temp file first so data.json never gets half-written
    const tempFile = DATA_FILE + ".tmp";
    fs.writeFileSync(tempFile, JSON.stringify(db, null, 2));
    fs.renameSync(tempFile, DATA_FILE);
}

saveData();


// ---------- HELPER FUNCTIONS ----------

function findSeat(floor, seatId) {
    const list = db.floors[floor];
    if (!list) return undefined;
    return list.find(function (s) { return s.id === seatId; });
}

// Frees seats whose 20-minute break has ended
function releaseExpiredBreaks() {
    let changed = false;
    const now = Date.now();

    Object.keys(db.bookings).forEach(function (userId) {
        const booking = db.bookings[userId];

        if (booking.onBreak && booking.breakEndsAt <= now) {
            const seat = findSeat(booking.floor, booking.seat);
            if (seat) seat.occupied = false;

            delete db.bookings[userId];
            changed = true;
        }
    });

    if (changed) saveData();
}

setInterval(releaseExpiredBreaks, 5000);


// ---------- MIDDLEWARE ----------

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Release expired seats before handling any API request
app.use("/api", function (req, res, next) {
    releaseExpiredBreaks();
    next();
});

// Each browser sends its own ID (no login system in this demo)
function requireUser(req, res, next) {
    const userId = req.get("X-User-Id");

    if (!userId || !/^[A-Za-z0-9-]{8,64}$/.test(userId)) {
        return res.status(401).json({ error: "Missing or invalid user ID." });
    }

    req.userId = userId;
    next();
}


// ---------- ROUTES ----------

// Get all seats of one floor
app.get("/api/seats/:floor", function (req, res) {
    const floor = Number(req.params.floor);

    if (!db.floors[floor]) {
        return res.status(404).json({ error: "Floor not found." });
    }

    res.json({ floor: floor, seats: db.floors[floor] });
});

// Get my current booking (booking is null if none)
app.get("/api/booking", requireUser, function (req, res) {
    res.json({ booking: db.bookings[req.userId] || null });
});

// Book a seat
app.post("/api/booking", requireUser, function (req, res) {
    const seatId = req.body.seat;
    const floor = Number(req.body.floor);

    if (db.bookings[req.userId]) {
        return res.status(409).json({ error: "Cancel your current booking before booking another seat." });
    }

    const seat = findSeat(floor, seatId);

    if (!seat) {
        return res.status(404).json({ error: "Seat not found." });
    }

    if (seat.occupied) {
        return res.status(409).json({ error: "Seat is not available!" });
    }

    seat.occupied = true;

    db.bookings[req.userId] = {
        seat: seatId,
        floor: floor,
        checkedIn: false,
        onBreak: false
    };

    saveData();
    res.status(201).json({ booking: db.bookings[req.userId] });
});

// Check in using QR code text
app.post("/api/booking/checkin", requireUser, function (req, res) {
    const booking = db.bookings[req.userId];

    if (!booking) {
        return res.status(404).json({ error: "You have no booking." });
    }

    if (booking.checkedIn) {
        return res.status(409).json({ error: "Already checked in." });
    }

    const parts = String(req.body.qrData || "").split("|");

    const valid =
        parts[0] === "SLF" &&
        parts[1] === booking.seat &&
        parts[2] === "F" + booking.floor;

    if (!valid) {
        return res.status(400).json({ error: "This QR code does not match your booking." });
    }

    booking.checkedIn = true;
    saveData();
    res.json({ booking: booking });
});

// Start the 20-minute break
app.post("/api/booking/break", requireUser, function (req, res) {
    const booking = db.bookings[req.userId];

    if (!booking) {
        return res.status(404).json({ error: "You have no booking." });
    }

    if (!booking.checkedIn) {
        return res.status(400).json({ error: "Check in before starting a break." });
    }

    if (booking.onBreak) {
        return res.status(409).json({ error: "Break already started." });
    }

    booking.onBreak = true;
    booking.breakEndsAt = Date.now() + BREAK_DURATION_MS;

    saveData();
    res.json({ booking: booking });
});

// Cancel booking
app.delete("/api/booking", requireUser, function (req, res) {
    const booking = db.bookings[req.userId];

    if (!booking) {
        return res.status(404).json({ error: "You have no booking." });
    }

    const seat = findSeat(booking.floor, booking.seat);
    if (seat) seat.occupied = false;

    delete db.bookings[req.userId];

    saveData();
    res.json({ message: "Booking cancelled successfully!" });
});

// Reset all demo data (handy before a project demonstration)
app.post("/api/reset", function (req, res) {
    db = createDefaultData();
    saveData();
    res.json({ message: "Demo data reset." });
});

// Unknown API route
app.use("/api", function (req, res) {
    res.status(404).json({ error: "API route not found." });
});

// Bad JSON etc.
app.use(function (err, req, res, next) {
    console.log(err.message);
    res.status(400).json({ error: "Bad request." });
});

app.listen(PORT, function () {
    console.log("Smart Library running at http://localhost:" + PORT);
});
