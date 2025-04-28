import { CELL_SIZE } from "./script.js";

export class Enemy {
  constructor() {
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

    setTimeout(() => {
      requestAnimationFrame(() => this.moveRandomly());
      requestAnimationFrame((timestamp) => this.animateSprite(timestamp));
    }, 1000);
  }

  async moveRandomly() {
    if (this.isDying) return; // Don't move if dying
    
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
    requestAnimationFrame(() => this.moveRandomly());
  }

  playEnemyDeath() {
    this.isDying = true;
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
    if (this.isDying) return Promise.resolve(); // Don't move if dying
    
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
    if (this.isDying) return; // Don't animate if dying
    
    if (!this.lastFrameTime) this.lastFrameTime = timestamp;
    const elapsed = timestamp - this.lastFrameTime;

    if (elapsed >= 200) {
      this.frameX = (this.frameX + 1) % 3;
      this.style.backgroundPositionX = `-${this.frameX * CELL_SIZE}px`;
      this.lastFrameTime = timestamp;
    }

    requestAnimationFrame((timestamp) => this.animateSprite(timestamp));
  };

  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}

// Global variable for enemy placement
let choosedIndex = new Set();