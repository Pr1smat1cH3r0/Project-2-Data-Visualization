"use strict";

// ==========================================
// SECRET TREASURE DUNGEON
// MAIN GAME FILE
// ==========================================

// Get the HTML canvas
const canvas = document.getElementById("game");
const statusText = document.getElementById("status");

// Make sure the canvas exists
if (!canvas) {
  throw new Error(
    "Canvas not found. Check index.html."
  );
}

// Create the 2D drawing context
const ctx = canvas.getContext("2d");

if (!ctx) {
  throw new Error(
    "Canvas 2D context could not be created."
  );
}

// Turn off image smoothing for pixel art
ctx.imageSmoothingEnabled = false;


// ==========================================
// DISPLAY MESSAGES ON THE CANVAS
// ==========================================

function showMessage(message, color = "#ffdc90") {

  // Clear the canvas
  ctx.fillStyle = "#30223d";
  ctx.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  // Set text appearance
  ctx.fillStyle = color;
  ctx.font = "20px monospace";
  ctx.textAlign = "center";

  // Split long messages into lines
  const words = String(message).split(" ");

  let line = "";
  let y = 260;

  for (const word of words) {

    const testLine = line
      ? line + " " + word
      : word;

    if (
      ctx.measureText(testLine).width > 700 &&
      line !== ""
    ) {

      ctx.fillText(
        line,
        canvas.width / 2,
        y
      );

      line = word;
      y += 30;

    } else {

      line = testLine;

    }
  }

  if (line) {
    ctx.fillText(
      line,
      canvas.width / 2,
      y
    );
  }
}


// ==========================================
// LOAD JSON AND INITIALIZE GAME
// ==========================================

async function startGame() {

  try {

    showMessage("Loading Dungeon...");

    console.log("Step 1: Starting game");

    // Check whether room.js loaded
    if (typeof DungeonGame === "undefined") {

      throw new Error(
        "DungeonGame was not found. Check room.js."
      );

    }

    console.log(
      "Step 2: DungeonGame class found"
    );

    // Load the weapons JSON file
    const response = await fetch("./weapons.json");

    // Check the response
    if (!response.ok) {

      throw new Error(
        "Could not load weapons.json. HTTP " +
        response.status
      );

    }

    // Convert JSON response to JavaScript data
    const weaponData = await response.json();

    console.log(
      "Step 3: Weapon JSON loaded",
      weaponData
    );


    // ======================================
    // VALIDATE WEAPON DATA
    // ======================================

    if (
      !weaponData.weapons ||
      !Array.isArray(weaponData.weapons)
    ) {

      throw new Error(
        "weapons.json is missing its weapons array."
      );

    }

    if (weaponData.weapons.length === 0) {

      throw new Error(
        "No weapons were found in weapons.json."
      );

    }

    if (!weaponData.rarities) {

      throw new Error(
        "weapons.json is missing rarity information."
      );

    }

    console.log(
      "Weapons available:",
      weaponData.weapons.length
    );


    // ======================================
    // CREATE DUNGEON GAME
    // ======================================

    const game = new DungeonGame(weaponData);

    console.log(
      "Step 4: DungeonGame created"
    );

    // Draw the first frame immediately
    game.draw(ctx);

    console.log(
      "Step 5: First frame rendered"
    );

    // Update page status
    if (statusText) {

      statusText.textContent =
        "Dungeon Loaded! WASD = Move | " +
        "E = Open Chest | ESC = Close Reward";

    }


    // ======================================
    // GAME ANIMATION LOOP
    // ======================================

    let lastTime = performance.now();

    function gameLoop(currentTime) {

      try {

        // Calculate elapsed time
        const deltaTime = Math.min(
          (currentTime - lastTime) / 1000,
          0.05
        );

        lastTime = currentTime;

        // Update player movement,
        // chest animations and transitions
        game.update(deltaTime);

        // Clear previous frame
        ctx.clearRect(
          0,
          0,
          canvas.width,
          canvas.height
        );

        // Draw the current room
        game.draw(ctx);

        // Continue animation
        requestAnimationFrame(gameLoop);

      } catch (error) {

        console.error(
          "Game loop error:",
          error
        );

        showMessage(
          "GAME ERROR: " + error.message,
          "#ff7777"
        );

        if (statusText) {

          statusText.textContent =
            "Game error: " + error.message;

        }
      }
    }

    // Start animation
    requestAnimationFrame(gameLoop);

    console.log(
      "Step 6: Animation loop started"
    );

  } catch (error) {

    // ======================================
    // ERROR HANDLING
    // ======================================

    console.error(
      "Dungeon startup error:",
      error
    );

    showMessage(
      "STARTUP ERROR: " + error.message,
      "#ff7777"
    );

    if (statusText) {

      statusText.textContent =
        "Startup error: " + error.message;

    }
  }
}


// ==========================================
// START THE GAME
// ==========================================

startGame();