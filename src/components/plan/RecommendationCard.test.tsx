import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RecommendationCard } from "./RecommendationCard";
import type { Recommendation } from "@/lib/planner/types";

const recommendation: Recommendation = {
  code: "B",
  title: "Build your emergency savings",
  why: "Your accessible savings cover about 1.5 months of essential expenses.",
  how: "Direct part of your surplus into a separate, easy-to-access account.",
  afterThis: "Once the reserve target is reached your plan is reviewed again.",
  suggestedMonthlyAmount: 8000,
  urgency: "high",
};

describe("RecommendationCard", () => {
  it("shows what, why, how and what comes after", () => {
    render(<RecommendationCard recommendation={recommendation} currency="INR" />);
    expect(screen.getByText(recommendation.title)).toBeInTheDocument();
    expect(screen.getByText(recommendation.why)).toBeInTheDocument();
    expect(screen.getByText(recommendation.how)).toBeInTheDocument();
    expect(screen.getByText(recommendation.afterThis)).toBeInTheDocument();
  });

  it("marks the primary action for the reader", () => {
    render(<RecommendationCard recommendation={recommendation} currency="INR" primary />);
    expect(screen.getByText("Your next action")).toBeInTheDocument();
  });

  it("shows the urgency label when it is not the primary action", () => {
    render(<RecommendationCard recommendation={recommendation} currency="INR" index={1} />);
    expect(screen.getByText(/High priority/)).toBeInTheDocument();
  });
});
