import { useState } from "react";
import "./SubscriptionPlans.css";

const plans = [
  {
    id: "silver",
    name: "Silver",
    months: 1,
    price: "Rs. 3,000",
    description: "A flexible monthly start.",
  },
  {
    id: "gold",
    name: "Gold",
    months: 3,
    price: "Rs. 8,000",
    description: "More time to build genuine connections.",
    badge: "Popular",
  },
  {
    id: "platinum",
    name: "Platinum",
    months: 6,
    price: "Rs. 15,000",
    description: "Created for a serious partner search.",
  },
  {
    id: "diamond",
    name: "Diamond",
    months: 12,
    price: "Rs. 28,000",
    description: "Our longest plan for the best long-term value.",
    badge: "Best value",
  },
];

const paymentMethods = [
  { id: "card", name: "Credit / Debit Card", detail: "Visa, Mastercard and international cards" },
  { id: "paypal", name: "PayPal", detail: "Pay with your PayPal account" },
  { id: "apple-pay", name: "Apple Pay", detail: "Available on supported Apple devices" },
  { id: "google-pay", name: "Google Pay", detail: "Available on supported devices" },
  { id: "jazzcash", name: "JazzCash", detail: "Pay with your JazzCash account" },
  { id: "easypaisa", name: "Easypaisa", detail: "Pay with your Easypaisa account" },
];

export default function SubscriptionPlans() {
  const [selected, setSelected] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const chosenMethod = paymentMethods.find((method) => method.id === paymentMethod);

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
              <div className="plan-price">{plan.price}</div>
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

      <section className="payment-section" aria-labelledby="payment-heading">
        <div className="payment-heading">
          <div>
            <span className="plans-kicker">Secure checkout</span>
            <h2 id="payment-heading">Payment method</h2>
            <p>Choose how you would like to pay.</p>
          </div>
          <span className="payment-lock" aria-hidden="true">⌁</span>
        </div>
        <div className="payment-grid">
          {paymentMethods.map((method) => {
            const active = paymentMethod === method.id;
            return (
              <button
                type="button"
                className={`payment-option ${active ? "active" : ""}`}
                key={method.id}
                onClick={() => setPaymentMethod(method.id)}
                aria-pressed={active}
              >
                <span className="payment-radio" aria-hidden="true" />
                <span>
                  <strong>{method.name}</strong>
                  <small>{method.detail}</small>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {selected && (
        <section className="selected-plan" role="status" aria-live="polite">
          <div>
            <span>Your selection</span>
            <h2>{selected.name} — {selected.price}</h2>
            <p>
              {selected.months} {selected.months === 1 ? "month" : "months"}
              {" · "}{chosenMethod?.name}. Checkout will activate after the
              secure payment account is connected.
            </p>
          </div>
          <button type="button" disabled>Continue to payment</button>
        </section>
      )}
    </main>
  );
}
