import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Nav from "../Nav";

describe("Nav", () => {
  it("renders lowercase 'gesher' wordmark", () => {
    render(<Nav />);
    
    const wordmark = screen.getByText("gesher");
    expect(wordmark).toBeTruthy();
    expect(wordmark.textContent).toBe("gesher");
  });

  it("renders navigation links", () => {
    render(<Nav />);
    
    const howItWorks = screen.getByText("How it works");
    const founders = screen.getByText("Founders");
    const contact = screen.getByText("Contact");
    const cta = screen.getByText("Get a quick read");
    
    expect(howItWorks).toBeTruthy();
    expect(founders).toBeTruthy();
    expect(contact).toBeTruthy();
    expect(cta).toBeTruthy();
  });

  it("renders bridge icon SVG", () => {
    const { container } = render(<Nav />);
    
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });
});
