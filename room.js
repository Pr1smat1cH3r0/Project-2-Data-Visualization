"use strict";

class DungeonGame {
  constructor(data) {
    this.weapons = data.weapons;
    this.rarities = data.rarities;

    this.room = "main";
    this.player = { x: 400, y: 440 };
    this.keys = {};

    this.time = 0;
    this.transitionTime = 0;
    this.transitioning = false;
    this.switchedRoom = false;
    this.destination = "";

    this.chestOpen = false;
    this.chestProgress = 0;
    this.reward = null;
    this.showReward = false;
    this.lootCount = 0;

    window.addEventListener("keydown", event => {
      const key = event.key.toLowerCase();

      if (["arrowup", "arrowdown", "arrowleft",
           "arrowright", " "].includes(key)) {
        event.preventDefault();
      }

      this.keys[key] = true;

      if (event.repeat) return;

      if (key === "e") {
        this.interact();
      }

      if (key === "escape") {
        this.showReward = false;
      }
    });

    window.addEventListener("keyup", event => {
      this.keys[event.key.toLowerCase()] = false;
    });

    window.addEventListener("blur", () => {
      this.keys = {};
    });
  }

  // -----------------------------
  // DRAWING HELPERS
  // -----------------------------

  rect(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }

  circle(ctx, x, y, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  text(ctx, value, x, y, size = 16, color = "white") {
    ctx.fillStyle = color;
    ctx.font = `bold ${size}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText(String(value), x, y);
  }

  // -----------------------------
  // WEAPON RANDOMIZER
  // -----------------------------

  randomWeapon() {
    const total = this.weapons.reduce(
      (sum, weapon) => sum + weapon.weight, 0
    );

    let roll = Math.random() * total;

    for (const weapon of this.weapons) {
      roll -= weapon.weight;

      if (roll < 0) {
        return weapon;
      }
    }

    return this.weapons[this.weapons.length - 1];
  }

  // -----------------------------
  // ROOM TRANSITIONS
  // -----------------------------

  startTransition(destination) {
    if (this.transitioning) return;

    this.destination = destination;
    this.transitioning = true;
    this.transitionTime = 0;
    this.switchedRoom = false;
    this.showReward = false;
    this.keys = {};
  }

  switchRoom() {
    this.room = this.destination;

    if (this.room === "secret") {
      this.player.x = 400;
      this.player.y = 465;

      // Reset chest each time we enter
      this.chestOpen = false;
      this.chestProgress = 0;
      this.reward = null;
      this.showReward = false;
    } else {
      this.player.x = 400;
      this.player.y = 132;
    }
  }

  // -----------------------------
  // CHEST INTERACTION
  // -----------------------------

  interact() {
    if (this.transitioning) return;

    // Close reward screen with E
    if (this.showReward) {
      this.showReward = false;
      return;
    }

    if (this.room !== "secret") return;

    const distance = Math.hypot(
      this.player.x - 400,
      this.player.y - 280
    );

    if (distance > 105) return;

    if (!this.chestOpen) {
      this.chestOpen = true;
      this.chestProgress = 0;
      this.reward = this.randomWeapon();
      this.lootCount++;
    } else if (this.chestProgress >= 1) {
      this.showReward = true;
    }
  }

  // -----------------------------
  // COLLISION DETECTION
  // -----------------------------

  canMove(x, y) {
    if (x < 64 || x > 736) return false;
    if (y < 86 || y > 516) return false;

    if (this.room === "secret") {
      // Chest collision rectangle
      if (
        x > 337 && x < 463 &&
        y > 222 && y < 327
      ) {
        return false;
      }
    }

    return true;
  }

  // -----------------------------
  // GAME UPDATE
  // -----------------------------

  update(dt) {
    this.time += dt;

    // Secret-room circle transition
    if (this.transitioning) {
      this.transitionTime += dt;

      if (
        this.transitionTime >= 0.6 &&
        !this.switchedRoom
      ) {
        this.switchRoom();
        this.switchedRoom = true;
      }

      if (this.transitionTime >= 1.2) {
        this.transitioning = false;
        this.transitionTime = 0;
      }

      return;
    }

    // Chest lid animation
    if (this.chestOpen && this.chestProgress < 1) {
      this.chestProgress = Math.min(
        1,
        this.chestProgress + dt * 1.5
      );

      if (this.chestProgress >= 1) {
        this.showReward = true;
      }
    }

    if (this.showReward) return;

    let dx = 0;
    let dy = 0;

    if (this.keys["w"] || this.keys["arrowup"]) dy--;
    if (this.keys["s"] || this.keys["arrowdown"]) dy++;
    if (this.keys["a"] || this.keys["arrowleft"]) dx--;
    if (this.keys["d"] || this.keys["arrowright"]) dx++;

    if (dx === 0 && dy === 0) return;

    const length = Math.hypot(dx, dy);
    const speed = 190;

    dx = (dx / length) * speed * dt;
    dy = (dy / length) * speed * dt;

    const nextX = this.player.x + dx;
    const nextY = this.player.y + dy;

    // Main room: top doorway
    if (
      this.room === "main" &&
      nextX >= 365 && nextX <= 435 &&
      nextY <= 105 && dy < 0
    ) {
      this.startTransition("secret");
      return;
    }

    // Treasure room: bottom doorway
    if (
      this.room === "secret" &&
      nextX >= 365 && nextX <= 435 &&
      nextY >= 495 && dy > 0
    ) {
      this.startTransition("main");
      return;
    }

    if (this.canMove(nextX, this.player.y)) {
      this.player.x = nextX;
    }

    if (this.canMove(this.player.x, nextY)) {
      this.player.y = nextY;
    }
  }

  // -----------------------------
  // DUNGEON FLOOR
  // -----------------------------

  drawFloor(ctx) {
    this.rect(ctx, 0, 0, 800, 600, "#17101f");

    for (let y = 48; y < 552; y += 32) {
      for (let x = 48; x < 752; x += 32) {
        const alternate =
          (Math.floor(x / 32) + Math.floor(y / 32)) % 3;

        const color =
          alternate === 0 ? "#513a5c" : "#44304e";

        this.rect(ctx, x, y, 31, 31, color);
        this.rect(ctx, x, y, 31, 2, "#665072");
        this.rect(ctx, x, y, 2, 31, "#30223d");
      }
    }

    // Cracks and damaged tiles
    for (let i = 0; i < 20; i++) {
      const x = 85 + (i * 109) % 610;
      const y = 100 + (i * 73) % 380;

      ctx.strokeStyle = "#2b2037";
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 13, y - 8);
      ctx.lineTo(x + 22, y + 5);
      ctx.stroke();
    }
  }

  // -----------------------------
  // WALLS AND DOORS
  // -----------------------------

  drawBrick(ctx, x, y) {
    this.rect(ctx, x, y, 32, 32, "#201629");
    this.rect(ctx, x + 2, y + 2, 28, 27, "#55415e");
    this.rect(ctx, x + 2, y + 2, 28, 5, "#896e8c");
  }

  drawWalls(ctx) {
    for (let x = 16; x < 784; x += 32) {
      this.drawBrick(ctx, x, 14);
      this.drawBrick(ctx, x, 554);
    }

    for (let y = 46; y < 554; y += 32) {
      this.drawBrick(ctx, 16, y);
      this.drawBrick(ctx, 752, y);
    }

    if (this.room === "main") {
      this.drawDoor(ctx, "top");
    } else {
      this.drawDoor(ctx, "bottom");
    }
  }

  drawDoor(ctx, side) {
    const y = side === "top" ? 14 : 542;

    this.rect(ctx, 365, y, 70, 47, "#160d20");
    this.rect(ctx, 373, y + 4, 54, 39, "#542839");
    this.rect(ctx, 380, y + 6, 40, 35, "#28172f");

    this.rect(ctx, 363, y, 8, 45, "#c08c53");
    this.rect(ctx, 429, y, 8, 45, "#c08c53");
  }

  // -----------------------------
  // DECORATIONS
  // -----------------------------

  drawTorch(ctx, x, y) {
    const flicker = Math.sin(this.time * 11 + x) * 3;

    this.circle(ctx, x, y, 20, "#6b3d2f");
    this.rect(ctx, x - 5, y + 5, 10, 20, "#765033");
    this.circle(ctx, x, y - 4 + flicker, 12, "#ff742f");
    this.circle(ctx, x, y + flicker, 6, "#ffdf70");
  }

  drawTable(ctx, x, y) {
    this.rect(ctx, x - 43, y - 27, 86, 54, "#4c2d2b");
    this.rect(ctx, x - 37, y - 21, 74, 42, "#a96a3c");

    for (let i = -1; i <= 1; i++) {
      this.rect(ctx, x - 35, y + i * 12, 70, 3, "#73432e");
    }

    this.rect(ctx, x - 39, y - 34, 10, 13, "#bf824f");
    this.rect(ctx, x + 29, y - 34, 10, 13, "#bf824f");
  }

  drawBarrel(ctx, x, y) {
    this.rect(ctx, x - 17, y - 20, 34, 42, "#945830");
    this.rect(ctx, x - 20, y - 14, 40, 7, "#89878b");
    this.rect(ctx, x - 20, y + 8, 40, 7, "#89878b");
    this.circle(ctx, x, y - 17, 15, "#b67940");
    this.circle(ctx, x, y - 17, 10, "#70472c");
  }

  drawAmmo(ctx, x, y) {
    this.rect(ctx, x, y, 56, 40, "#354b3c");
    this.rect(ctx, x + 4, y - 5, 48, 8, "#738b5c");

    for (let i = 0; i < 3; i++) {
      this.rect(
        ctx, x + 14 + i * 11, y + 16,
        6, 14, "#f7c451"
      );
    }
  }

  // -----------------------------
  // MAIN ROOM
  // -----------------------------

  drawMainRoom(ctx) {
    this.drawFloor(ctx);

    // Central rug
    this.rect(ctx, 298, 225, 204, 150, "#a33d50");
    this.rect(ctx, 307, 234, 186, 132, "#602d46");

    this.text(ctx, "★", 400, 318, 65, "#e5ad50");

    // Furniture
    this.drawTable(ctx, 210, 230);
    this.drawTable(ctx, 580, 295);
    this.drawTable(ctx, 245, 440);
    this.drawTable(ctx, 560, 440);

    this.drawBarrel(ctx, 130, 355);
    this.drawBarrel(ctx, 670, 360);

    this.drawAmmo(ctx, 125, 145);
    this.drawAmmo(ctx, 620, 425);

    // Scattered bullet casings
    for (let i = 0; i < 35; i++) {
      const x = 90 + (i * 107) % 620;
      const y = 115 + (i * 73) % 385;

      this.rect(ctx, x, y, 9, 4, "#eeb748");
    }

    this.drawWalls(ctx);

    this.drawTorch(ctx, 115, 105);
    this.drawTorch(ctx, 685, 105);
    this.drawTorch(ctx, 115, 480);
    this.drawTorch(ctx, 685, 480);

    this.text(
      ctx, "SECRET PASSAGE",
      400, 102, 15, "#ffe095"
    );
  }

  // -----------------------------
  // TREASURE CHEST
  // -----------------------------

  drawChest(ctx) {
    const x = 400;
    const y = 280;
    const open = this.chestProgress;

    // Shadow
    this.rect(ctx, x - 49, y + 29, 98, 17, "#201321");

    // Chest base
    this.rect(ctx, x - 43, y - 9, 86, 49, "#542d35");
    this.rect(ctx, x - 37, y - 4, 74, 38, "#aa344b");

    // Golden reinforcements
    this.rect(ctx, x - 43, y + 26, 86, 8, "#efb544");
    this.rect(ctx, x - 30, y - 9, 9, 49, "#efb544");
    this.rect(ctx, x + 21, y - 9, 9, 49, "#efb544");

    // Chest opening
    const lidY = y - 29 - open * 37;
    const lidHeight = 24 - open * 12;

    this.rect(
      ctx, x - 46, lidY,
      92, lidHeight, "#e7a341"
    );

    this.rect(
      ctx, x - 39, lidY + 4,
      78, Math.max(3, lidHeight - 8),
      open > 0.5 ? "#38253b" : "#ad3d4e"
    );

    // Lock
    if (open < 0.8) {
      this.rect(ctx, x - 8, y, 16, 18, "#ffd36c");
      this.rect(ctx, x - 2, y + 6, 4, 7, "#503025");
    }

    // Golden particles after opening
    if (open > 0.3) {
      for (let i = 0; i < 7; i++) {
        const sx =
          x + Math.sin(this.time * 3 + i * 2) * 65;

        const sy =
          y - 60 - (i * 13) % 38 +
          Math.sin(this.time * 4 + i) * 7;

        this.circle(ctx, sx, sy, 4, "#ffdc77");
      }
    }
  }

  // -----------------------------
  // SECRET ROOM
  // -----------------------------

  drawSecretRoom(ctx) {
    this.drawFloor(ctx);

    this.rect(ctx, 270, 130, 260, 320, "#a57846");
    this.rect(ctx, 279, 139, 242, 302, "#5d3e66");

    // Gold ornaments
    for (let i = 0; i < 8; i++) {
      this.rect(
        ctx, 300 + i * 28, 157, 9, 9, "#ffd37b"
      );

      this.rect(
        ctx, 300 + i * 28, 414, 9, 9, "#ffd37b"
      );
    }

    this.drawChest(ctx);
    this.drawWalls(ctx);

    this.drawTorch(ctx, 145, 115);
    this.drawTorch(ctx, 655, 115);
    this.drawTorch(ctx, 145, 475);
    this.drawTorch(ctx, 655, 475);

    this.text(
      ctx, "TREASURE ROOM",
      400, 102, 22, "#ffdc90"
    );

    this.text(ctx, "EXIT", 400, 535, 14, "#ffe095");

    const distance = Math.hypot(
      this.player.x - 400,
      this.player.y - 280
    );

    if (distance <= 105 && !this.chestOpen) {
      this.text(
        ctx, "Press E to open chest",
        400, 384, 16, "#ffe68f"
      );
    }

    if (distance <= 105 &&
        this.chestOpen &&
        this.chestProgress >= 1 &&
        !this.showReward) {
      this.text(
        ctx, "Press E to inspect reward",
        400, 384, 15, "#ffe68f"
      );
    }
  }

  // -----------------------------
  // PLAYER CHARACTER
  // -----------------------------

  drawPlayer(ctx) {
    const x = this.player.x;
    const y = this.player.y;

    // Shadow
    this.circle(ctx, x, y + 12, 14, "#201827");

    // Legs
    this.rect(ctx, x - 9, y + 7, 7, 14, "#34445d");
    this.rect(ctx, x + 2, y + 7, 7, 14, "#34445d");

    // Body
    this.rect(ctx, x - 11, y - 7, 22, 20, "#3186ab");

    // Face
    this.rect(ctx, x - 10, y - 24, 20, 19, "#e6ba8b");

    // Hair
    this.rect(ctx, x - 12, y - 27, 24, 8, "#503a35");

    // Eyes
    this.rect(ctx, x - 6, y - 15, 3, 4, "#221a22");
    this.rect(ctx, x + 4, y - 15, 3, 4, "#221a22");

    // Small gun
    this.rect(ctx, x + 9, y + 1, 17, 5, "#9ca5a5");
    this.rect(ctx, x + 22, y, 7, 4, "#ffbf53");
  }

  // -----------------------------
  // TEXT WRAPPING
  // -----------------------------

  wrapText(ctx, content, x, y, maxWidth, lineHeight) {
    ctx.fillStyle = "#e8d8eb";
    ctx.font = "14px monospace";
    ctx.textAlign = "center";

    const words = String(content).split(" ");
    const lines = [];
    let line = "";

    for (const word of words) {
      const test = line ? line + " " + word : word;

      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }

    if (line) lines.push(line);

    lines.forEach((item, index) => {
      ctx.fillText(item, x, y + index * lineHeight);
    });
  }

  // -----------------------------
  // WEAPON REWARD SCREEN
  // -----------------------------

  drawReward(ctx) {
    if (!this.reward) return;

    const w = this.reward;
    const rarity = this.rarities[w.rarity];
    const color = rarity ? rarity.color : "#ffffff";

    // Dark background overlay
    this.rect(ctx, 0, 0, 800, 600, "#100b1bef");

    // Panel border and inside
    this.rect(ctx, 70, 22, 660, 554, color);
    this.rect(ctx, 77, 29, 646, 540, "#251a34");

    this.text(
      ctx, "TREASURE FOUND!",
      400, 69, 26, color
    );

    this.text(
      ctx, w.name,
      400, 106, 28, "#ffedcf"
    );

    this.text(
      ctx,
      w.rarity + " | Quality " + w.quality,
      400, 139, 17, color
    );

    this.text(
      ctx,
      '"' + w.gameDescription + '"',
      400, 173, 16, "#ffcf8f"
    );

    this.wrapText(
      ctx, w.fanDescription,
      400, 205, 570, 20
    );

    const stats = [
      ["Type", w.type],
      ["Max Ammo", w.maxAmmo],
      ["Clip Size", w.clipSize],
      ["Quality", w.quality],
      ["Damage", w.damage],
      ["Fire Rate", w.fireRate],
      ["Shot Speed", w.shotSpeed],
      ["Range", w.range],
      ["Knockback", w.knockback],
      ["Spread", w.spread]
    ];

    stats.forEach((stat, index) => {
      const column = index < 5 ? 0 : 1;
      const row = index % 5;

      const x = column === 0 ? 240 : 550;
      const y = 286 + row * 46;

      this.text(ctx, stat[0], x, y, 14, color);

      const value = String(stat[1]);
      const fontSize = value.length > 22 ? 10 : 14;

      this.text(
        ctx, value, x, y + 20,
        fontSize, "#ffffff"
      );
    });

    this.text(
      ctx, "Press E or ESC to close",
      400, 546, 15, "#ffdd92"
    );
  }

  // -----------------------------
  // CIRCULAR MARIO-STYLE TRANSITION
  // -----------------------------

  drawTransition(ctx) {
    if (!this.transitioning) return;

    const t = this.transitionTime;

    const progress =
      t < 0.6 ? t / 0.6 : (1.2 - t) / 0.6;

    const radius = Math.max(
      0, 1000 * (1 - progress)
    );

    ctx.save();

    ctx.fillStyle = "#090510";
    ctx.beginPath();
    ctx.rect(0, 0, 800, 600);
    ctx.arc(
      400, 300, radius,
      0, Math.PI * 2, true
    );
    ctx.fill("evenodd");

    ctx.restore();

    if (progress > 0.85) {
      this.text(
        ctx, "SECRET PASSAGE",
        400, 300, 24, "#ffdc77"
      );
    }
  }

  // -----------------------------
  // FINAL DRAW FUNCTION
  // -----------------------------

  draw(ctx) {
    ctx.imageSmoothingEnabled = false;

    if (this.room === "main") {
      this.drawMainRoom(ctx);
    } else {
      this.drawSecretRoom(ctx);
    }

    this.drawPlayer(ctx);

    // HUD
    this.rect(ctx, 0, 565, 800, 35, "#1b1325");

    this.text(
      ctx,
      this.room === "main" ? "MAIN ROOM" : "SECRET ROOM",
      115, 587, 15, "#ffe0a5"
    );

    this.text(
      ctx,
      "Chests Opened: " + this.lootCount,
      650, 587, 14, "#ffe0a5"
    );

    if (this.showReward) {
      this.drawReward(ctx);
    }

    this.drawTransition(ctx);
  }
}