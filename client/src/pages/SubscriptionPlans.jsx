import { useState } from "react";
import "./SubscriptionPlans.css";

const plans = [
  {
    id: "silver",
    name: "Silver",
    months: 1,
    description: "A flexible monthly start.",
  },
  {
    id: "golden",
    name: "Golden",
    months: 3,
    description: "More time to build genuine connections.",
    badge: "Popular",
  },
  {
    id: "platinum",
    name: "Platinum",
    months: 6,
    description: "Created for a serious partner search.",
  },
  {
    id: "diamond",
    name: "Diamond",
    months: 12,
    description: "Our longest plan for the best long-term value.",
    badge: "Best value",
  },
];

const benefits = [
  "See who is interested in you",
  "Send unlimited connection requests",
  "Appear higher in profile discovery",
  "Use advanced partner search filters",
  "Premium support and account assistance",
];

export default function SubscriptionPlans() {
  const [selected, setSelected] = useState(null);

  return (
    <main className="plans-page">
      <section className="plans-hero">
        <span className="plans-kicker">MatchNest Premium</span>
        <h1>Choose the plan that fits your journey</h1>
        <p>
          Premium works across both Dating and Marriage modes, so you can focus
          on finding the right connection.
        </p>
      </section>

      <div className="plans-notice" role="note">
        <span aria-hidden="true">♡</span>
        <div>
          <strong>Payment setup is being finalized</strong>
          <p>
            Compare and select a plan now. Prices and payment methods will be
            shown before payments go live, and no charge will be made today.
          </p>
        </div>
      </div>

      <section className="plans-grid" aria-label="Subscription plans">
        {plans.map((plan) => {
          const isSelected = selected?.id === plan.id;
          return (
            <article
              className={`plan-card plan-${plan.id} ${isSelected ? "selected" : ""}`}
              key={plan.id}
            >
              {plan.badge && <span className="plan-badge">{plan.badge}</span>}
              <div className="plan-icon" aria-hidden="true">
                {plan.id === "diamond" ? "◇" : "♡"}
              </div>
              <h2>{plan.name}</h2>
              <div className="plan-duration">
                <strong>{plan.months}</strong>
                <span>{plan.months === 1 ? "Month" : "Months"}</span>
              </div>
              <p>{plan.description}</p>
              <div className="plan-price-pending">Price to be added</div>
              <button
                type="button"
                className="plan-select"
                onClick={() => setSelected(plan)}
                aria-pressed={isSelected}
              >
                {isSelected ? "Selected" : `Select ${plan.name}`}
              </button>
            </article>
          );
        })}
      </section>

      <section className="premium-benefits">
        <div>
          <span className="plans-kicker">Included in every plan</span>
          <h2>More opportunities to find the right person</h2>
        </div>
        <ul>
          {benefits.map((benefit) => (
            <li key={benefit}><span aria-hidden="true">✓</span>{benefit}</li>
          ))}
        </ul>
      </section>

      {selected && (
        <section className="selected-plan" role="status" aria-live="polite">
          <div>
            <span>Your selection</span>
            <h2>{selected.name} — {selected.months} {selected.months === 1 ? "month" : "months"}</h2>
            <p>
              This plan is saved for this visit. Payment options will appear
              here after MatchNest payment setup is connected.
            </p>
          </div>
          <button type="button" disabled>Continue to payment</button>
        </section>
      )}
    </main>
  );
}
