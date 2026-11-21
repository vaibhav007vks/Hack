
// SMART LIBRARY SEAT FINDER

let currentFloor = 1;
let selectedSeat = null;

// Load saved demo data
const savedData = JSON.parse(
    localStorage.getItem("librarySeats")
);

const floors = savedData || {};

if (!savedData) {

    for (let floor = 1; floor <= 4; floor++) {

        floors[floor] = [];

        for (let i = 1; i <= 150; i++) {

            let isOccupied = (i % 4 === 0 || i % 7 === 0);

            floors[floor].push({
                id: "F" + floor + "-S" + i,
                occupied: isOccupied
            });

        }
    }

}

let myBooking = JSON.parse(
    localStorage.getItem("myBooking")
);
let breakInterval = null;


// Save data in this browser
function saveData() {

    localStorage.setItem(
        "librarySeats",
        JSON.stringify(floors)
    );

    localStorage.setItem(
        "myBooking",
        JSON.stringify(myBooking)
    );

}


// DISPLAY SEATS

function displaySeats() {

    const seatGrid = document.getElementById("seatGrid");

    seatGrid.innerHTML = "";

    floors[currentFloor].forEach(function(seat) {

        const button = document.createElement("button");

        button.textContent = seat.id;
        button.classList.add("seat");

        if (seat.occupied) {

            button.classList.add("occupied");
            button.disabled = true;

        } else if (selectedSeat === seat.id) {

            button.classList.add("selected");

        } else {

            button.classList.add("available");

        }

        button.addEventListener("click", function() {

            if (myBooking) {
                alert("Cancel your current booking before booking another seat.");
                return;
            }

            selectedSeat = seat.id;

            updateSelectedSeat();
            displaySeats();

        });

        seatGrid.appendChild(button);

    });

    updateStatistics();

}


// UPDATE STATISTICS

function updateStatistics() {

    const seats = floors[currentFloor];

    const occupied = seats.filter(function(seat) {
        return seat.occupied;
    }).length;

    document.getElementById("totalSeats").textContent =
        seats.length;

    document.getElementById("availableSeats").textContent =
        seats.length - occupied;

    document.getElementById("occupiedSeats").textContent =
        occupied;

}


// SELECTED SEAT

function updateSelectedSeat() {

    document.getElementById("selectedSeat").textContent =
        selectedSeat || "None";

    document.getElementById("bookButton").disabled =
        !selectedSeat || !!myBooking;

}


// FLOOR SELECTION

document.querySelectorAll(".floor-btn").forEach(function(button) {

    button.addEventListener("click", function() {

        currentFloor = Number(button.dataset.floor);

        document.querySelectorAll(".floor-btn").forEach(function(btn) {
            btn.classList.remove("active");
        });

        button.classList.add("active");

        selectedSeat = null;

        updateSelectedSeat();
        displaySeats();

    });

});


// BOOK A SEAT

document.getElementById("bookButton").addEventListener("click", function() {

    if (!selectedSeat || myBooking) {
        return;
    }

    const seat = floors[currentFloor].find(function(item) {
        return item.id === selectedSeat;
    });

    if (!seat || seat.occupied) {
        alert("Seat is not available!");
        return;
    }

    seat.occupied = true;

    myBooking = {
    seat: selectedSeat,
    floor: currentFloor,
    checkedIn: false
};

    selectedSeat = null;

    saveData();
    displaySeats();
    updateSelectedSeat();
    showMyBooking();

    alert("Booking successful!");

});


// DISPLAY BOOKING

function showMyBooking() {

    const bookingDetails =
        document.getElementById("bookingDetails");

    const cancelButton =
        document.getElementById("cancelButton");

    if (myBooking) {

        bookingDetails.innerHTML = `
            <h3>Booking Confirmed!</h3>
            <p>Seat: ${myBooking.seat}</p>
            <p>Floor: ${myBooking.floor}</p>
            <p>Status: ${myBooking.checkedIn ? "Checked In" : "Booked (Demo)"}</p>

            ${
                myBooking.checkedIn && !myBooking.onBreak
                ? `<button id="startBreakButton">Start 20-Minute Break</button>`
                : ""
            }

            ${
                myBooking.onBreak
                ? `<h3>Break Timer</h3>
                   <p id="breakCountdown">20:00</p>`
                : ""
            }
        `;

        cancelButton.hidden = false;

        const breakButton =
            document.getElementById("startBreakButton");

        if (breakButton) {
            breakButton.addEventListener("click", startBreak);
        }

    } else {

        bookingDetails.innerHTML =
            "<p>You haven't booked a seat yet.</p>";

        cancelButton.hidden = true;

    }

    updateQRCode();
}

// START 20-MINUTE BREAK

function startBreak() {

    if (!myBooking || !myBooking.checkedIn) {
        return;
    }

    myBooking.onBreak = true;

    myBooking.breakEndsAt = Date.now() + (20 * 60 * 1000);

    saveData();

    showMyBooking();

    startBreakCountdown();
}


// BREAK COUNTDOWN

function startBreakCountdown() {

    if (breakInterval) {
        clearInterval(breakInterval);
    }

    breakInterval = setInterval(function() {

        if (!myBooking || !myBooking.onBreak) {
            clearInterval(breakInterval);
            return;
        }

        const remaining =
            myBooking.breakEndsAt - Date.now();

        if (remaining <= 0) {

            releaseSeat();
            return;

        }

        const minutes =
            Math.floor(remaining / 60000);

        const seconds =
            Math.floor((remaining % 60000) / 1000);

        const countdown =
            document.getElementById("breakCountdown");

        if (countdown) {

            countdown.textContent =
                String(minutes).padStart(2, "0") +
                ":" +
                String(seconds).padStart(2, "0");

        }

    }, 1000);

}


// AUTOMATIC SEAT RELEASE

function releaseSeat() {

    if (breakInterval) {
        clearInterval(breakInterval);
        breakInterval = null;
    }

    if (!myBooking) return;

    const seat = floors[myBooking.floor].find(function(item) {
        return item.id === myBooking.seat;
    });

    if (seat) {
        seat.occupied = false;
    }

    myBooking = null;
    selectedSeat = null;

    saveData();

    displaySeats();
    updateSelectedSeat();
    showMyBooking();

    alert("Your 20-minute break has ended. Seat released!");
}


// CANCEL BOOKING

document.getElementById("cancelButton").addEventListener("click", function() {

    if (!myBooking) {
        return;
    }

    const seatId = myBooking.seat;
    const floorNumber = myBooking.floor;

    const seat = floors[floorNumber].find(function(item) {
        return item.id === seatId;
    });

    if (seat) {
        seat.occupied = false;
    }

    myBooking = null;
    selectedSeat = null;

    saveData();
    displaySeats();
    updateSelectedSeat();
    showMyBooking();

    alert("Booking cancelled successfully!");

});


// START WEBSITE

displaySeats();
updateSelectedSeat();
showMyBooking();

// RESUME BREAK TIMER AFTER REFRESH

if (myBooking && myBooking.onBreak) {

    if (myBooking.breakEndsAt <= Date.now()) {

        releaseSeat();

    } else {

        startBreakCountdown();

    }

}

// GENERATE QR CODE


// QR CODE GENERATION

function updateQRCode() {

    const qrContainer = document.getElementById("qrCode");
    const status = document.getElementById("checkinStatus");
    const scannerButton = document.getElementById("startScannerButton");

    qrContainer.innerHTML = "";

    if (!myBooking) {

        status.textContent = "Book a seat to generate your QR code.";
        scannerButton.disabled = true;

        return;
    }

    const qrData = "SLF|" + myBooking.seat + "|F" + myBooking.floor;

    new QRCode(qrContainer, {
        text: qrData,
        width: 180,
        height: 180
    });

    status.textContent = myBooking.checkedIn
        ? "Check-in completed!"
        : "Your QR code is ready. Scan it to check in.";

    scannerButton.disabled = myBooking.checkedIn;

}


// CAMERA SCANNER

let html5QrCode = null;

document.getElementById("startScannerButton")
.addEventListener("click", async function() {

    if (!myBooking || myBooking.checkedIn) {
        return;
    }

    try {

        html5QrCode = new Html5Qrcode("reader");

        await html5QrCode.start(
            { facingMode: "environment" },
            {
                fps: 10,
                qrbox: { width: 220, height: 220 }
            },

            async function(decodedText) {

                const qrParts = decodedText.split("|");

                const correctSeat =
                    qrParts[1] === myBooking.seat;

                const correctFloor =
                    qrParts[2] === "F" + myBooking.floor;

                const correctFormat =
                    qrParts[0] === "SLF";

                if (
                    correctFormat &&
                    correctSeat &&
                    correctFloor
                ) {

                    myBooking.checkedIn = true;

                    saveData();

                    await html5QrCode.stop();

                    showMyBooking();

                    document.getElementById("checkinStatus")
                        .textContent = "Check-in successful!";

                    alert("QR verified! Check-in successful.");

                } else {

                    document.getElementById("checkinStatus")
                        .textContent = "This QR code does not match your booking.";

                }

            }

        );

    } catch (error) {

        alert("Camera could not start. Please check camera permission.");

        console.log(error);

    }

});
