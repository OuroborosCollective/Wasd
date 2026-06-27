/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { CharacterSelectPanel } from "../CharacterSelectPanel";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";

describe("CharacterSelectPanel", () => {
  beforeEach(() => {
    cleanup();
  });

  it("renders English text", () => {
    render(<CharacterSelectPanel />);
    expect(screen.getByText("Character Creation")).toBeDefined();
    expect(screen.getByLabelText("Name")).toBeDefined();
    expect(screen.getByLabelText("Starting Path")).toBeDefined();
    expect(screen.getByText("Create Character")).toBeDefined();
  });

  it("has autoFocus on the name input", () => {
    render(<CharacterSelectPanel />);
    const input = screen.getByPlaceholderText("Wanderer");
    expect(document.activeElement).toBe(input);
  });
});
