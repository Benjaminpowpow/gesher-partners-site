import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import HeroSection from "../HeroSection";

describe("HeroSection", () => {
  it("renders hero content with left-aligned layout", () => {
    render(<HeroSection />);
    
    const heading = screen.getByText("Get the most out of your life's work.");
    expect(heading).toBeTruthy();
    
    const description = screen.getByText(/An Israeli sell-side advisor/);
    expect(description).toBeTruthy();
  });

  it("renders both CTA buttons", () => {
    render(<HeroSection />);
    
    const talkButton = screen.getByText("Talk to us.");
    const briefButton = screen.getByText("Get a quick read on your business.");
    
    expect(talkButton).toBeTruthy();
    expect(briefButton).toBeTruthy();
  });

  it("displays correct revenue range", () => {
    render(<HeroSection />);
    
    const revenueText = screen.getByText(/NIS 5-50M revenue/);
    expect(revenueText).toBeTruthy();
  });
});
