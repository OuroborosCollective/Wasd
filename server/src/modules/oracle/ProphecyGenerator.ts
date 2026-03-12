export class ProphecyGenerator {
  generate(signal: string) {
    return { type: "prophecy", line: `Ich sehe ein Zeichen: ${signal}` };
  }
}