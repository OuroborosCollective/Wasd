with open("server/src/core/WorldTick.ts", "r") as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if "if (this.tickCount % 100 === 0) {" in line and "World Tick" in lines[i+1]:
        skip = True
        continue
    if skip and "}" in line:
        skip = False
        continue
    if not skip:
        new_lines.append(line)

with open("server/src/core/WorldTick.ts", "w") as f:
    f.writelines(new_lines)
