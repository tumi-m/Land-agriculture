"use client";

import { useState } from "react";

const QUESTIONS = [
  {
    label: "Soil",
    title: "Start below the surface.",
    detail:
      "Ask for soil tests, usable soil depth and drainage information before choosing a crop.",
  },
  {
    label: "Water",
    title: "Know where the water comes from.",
    detail:
      "Check the supply, seasonal reliability and water-use permissions. A nearby river is not a right to irrigate.",
  },
  {
    label: "Access",
    title: "A farm needs a way to market.",
    detail:
      "Visit the access road. Check fencing, power, storage and the distance to buyers against your farming plan.",
  },
];

export default function LandProfile() {
  const [active, setActive] = useState(0);
  return (
    <aside className="land-profile" aria-label="What to check on a farm">
      <p className="profile-kicker">A CLOSER LOOK AT THE LAND</p>
      <div className="profile-object">
        <img
          src="/images/land-profile.png"
          width="1254"
          height="1254"
          alt="Illustrated cutaway of layered soil supporting crop rows and an orchard beside an irrigation channel"
        />
      </div>
      <div
        className="profile-topics"
        role="group"
        aria-label="Farm considerations"
      >
        {QUESTIONS.map((question, index) => (
          <button
            key={question.label}
            aria-pressed={active === index}
            onClick={() => setActive(index)}
          >
            {question.label}
          </button>
        ))}
      </div>
      <div className="profile-reading" aria-live="polite">
        <h3>{QUESTIONS[active].title}</h3>
        <p>{QUESTIONS[active].detail}</p>
      </div>
      <p className="profile-caption">
        Illustrative land profile · not a listed farm
      </p>
    </aside>
  );
}
