// Enemy.js
import { CELL_SIZE } from "./script.js";

// Global variable for enemy placement
let choosedIndex = new Set();

export class Enemy {
  constructor(game) {
    this.game = game;
    const div = document.createElement("div");
    this.element = div;
    const style = div.style;
    this.style = style;
    style.backgroundImage = "url('ressources/enemy.png')";
    style.backgroundSize = "360px";
    style.width = "40px";
    style.height = "45px";
    style.position = "absolute";
    div.classList.add("enemy");

    const floors = [...document.querySelectorAll(".floor")];
    const rightSideFloors = floors.filter(floor => {
      const y = parseInt(floor.getAttribute("data-y"));
      return y >= 6;
    });
    let randomIndex = Math.floor(Math.random() * rightSideFloors.length);
    while (choosedIndex.has(randomIndex)) {
      randomIndex++;
    }
    choosedIndex.add(randomIndex)
    const choosedFloor = rightSideFloors[randomIndex];

    choosedFloor.onload = () => {
      style.left = `${choosedFloor.offsetLeft}px`;
      style.top = `${choosedFloor.offsetTop}px`;
    };

    const floorX = choosedFloor.getAttribute("data-x");
    const floorY = choosedFloor.getAttribute("data-y");
    this.x = Number(floorX);
    this.y = Number(floorY);
    this.element.setAttribute("data-x", this.x);
    this.element.setAttribute("data-y", this.y);

    this.frameX = 0;
    this.directionY = 0;
    this.translate = { x: 0, y: 0 };
    this.isDying = false;
    this.movementActive = false;
    this.animationActive = false;

    setTimeout(() => {
      this.startMovement();
      this.startAnimation();
    }, 1000);
  }

  startMovement() {
    if (!this.movementActive) {
      this.movementActive = true;
      requestAnimationFrame(() => this.moveRandomly());
    }
  }

  stopMovement() {
    this.movementActive = false;
  }

  startAnimation() {
    if (!this.animationActive) {
      this.animationActive = true;
      this.lastFrameTime = performance.now();
      requestAnimationFrame((timestamp) => this.animateSprite(timestamp));
    }
  }

  stopAnimation() {
    this.animationActive = false;
  }

  async moveRandomly() {
    if (this.game.paused || this.isDying) {
      // Pause movement but keep the flag so we can resume
      this.movementActive = false;
      return;
    }

    const nextPoint = {
      x: this.x,
      y: this.y,
    };

    const randomSign = Math.random() > 0.5 ? -1 : 1;
    const randomDirection = Math.random() > 0.5 ? "x" : "y";
    nextPoint[randomDirection] += 1 * randomSign;

    const nextBlock = document.querySelector(
      `.floor[data-x="${nextPoint.x}"][data-y="${nextPoint.y}"]`
    );

    const bomb = document.querySelector(
      `.bomb[data-x="${nextPoint.x}"][data-y="${nextPoint.y}"]`
    );
    if (nextBlock && !bomb) {
      await this.step(randomSign, randomDirection);
      this.x = nextPoint.x
      this.y = nextPoint.y
    }
    
    // Only continue the loop if we're still active
    if (this.movementActive) {
      requestAnimationFrame(() => this.moveRandomly());
    }
  }

  playEnemyDeath() {
    this.isDying = true;
    this.stopMovement();
    this.stopAnimation();
    
    const deathRow = 4; // 5th row (0-based index)
    const frameCount = 8; // 8 frames in death animation
    const frameWidth = 40; // Width of each frame
    const frameHeight = 45; // Height of each frame
    const animationDuration = 1000; // Total animation duration in ms
    const frameDelay = animationDuration / frameCount;

    // Set initial death animation frame
    this.style.backgroundPositionY = `-${deathRow * frameHeight}px`;
    this.style.backgroundPositionX = "0px";

    let currentFrame = 0;
    const startTime = performance.now();

    const animateDeath = (timestamp) => {
      if (!this.deathStartTime) this.deathStartTime = timestamp;
      const elapsed = timestamp - this.deathStartTime;
      const frame = Math.min(
        Math.floor(elapsed / frameDelay),
        frameCount - 1
      );

      if (frame !== currentFrame) {
        currentFrame = frame;
        this.style.backgroundPositionX = `-${currentFrame * frameWidth}px`;
      }

      if (currentFrame < frameCount - 1) {
        requestAnimationFrame(animateDeath);
      } else {
        // Animation complete - remove enemy
        this.destroy();
      }
    };

    this.deathStartTime = null;
    requestAnimationFrame(animateDeath);
  }

  step(distanceSign, direction) {
    if (this.game.paused || this.isDying) return Promise.resolve(); // Don't move if dying

    const duration = 600;
    const startValue = this.translate[direction] || 0;
    const startTime = performance.now();
    const distance = distanceSign * CELL_SIZE;
    this[direction] += 1 * distanceSign;

    return new Promise((resolve) => {
      const animate = (timestamp) => {
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentValue = startValue + distance * progress;
        this.translate[direction] = currentValue;
        this.style.transform = `translate(${this.translate.y}px, ${this.translate.x}px)`;

        if (direction === "x") {
          if (distance > 0) {
            this.directionY = 0;
          } else {
            this.directionY = -138;
          }
        } else if (direction === "y") {
          if (distance > 0) {
            this.directionY = -CELL_SIZE;
          } else {
            this.directionY = -92;
          }
        }

        this.style.backgroundPositionY = `${this.directionY}px`;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  animateSprite = (timestamp) => {
    if (this.game.paused || this.isDying) {
      // Pause animation but keep the flag so we can resume
      this.animationActive = false;
      return;
    }

    if (!this.lastFrameTime) this.lastFrameTime = timestamp;
    const elapsed = timestamp - this.lastFrameTime;

    if (elapsed >= 200) {
      this.frameX = (this.frameX + 1) % 3;
      this.style.backgroundPositionX = `-${this.frameX * CELL_SIZE}px`;
      this.lastFrameTime = timestamp;
    }

    // Only continue the animation if we're still active
    if (this.animationActive) {
      requestAnimationFrame((timestamp) => this.animateSprite(timestamp));
    }
  };

  destroy() {
    this.stopMovement();
    this.stopAnimation();
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }

  // Add this method to your Game class to call on enemies when resuming
  resume() {
    if (!this.isDying && !this.movementActive) {
      this.startMovement();
      this.startAnimation();
    }
  }

  move() {
    // This method exists just to satisfy the loop call
    // You can use it to monitor for pause/resume events
    if (!this.game.paused && !this.isDying) {
      if (!this.movementActive) {
        this.startMovement();
      }
      if (!this.animationActive) {
        this.startAnimation();
      }
    }
  }
}