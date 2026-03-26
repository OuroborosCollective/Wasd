with open("server/src/core/WorldTick.ts", "r") as f:
    content = f.read()

new_content = content.replace("""    if (this.tickCount % 100 === 0) {
      console.log(`World Tick ${this.tickCount} - Active Chunks: ${activeChunks.length}`);
    }""", "")

with open("server/src/core/WorldTick.ts", "w") as f:
    f.write(new_content)
