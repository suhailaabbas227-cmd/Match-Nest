import { useState } from "react";
import { useAuth } from "../AuthContext";
import "./SubscriptionPlans.css";

const markets = [
  { id: "PK", label: "Pakistan", currency: "PKR", locale: "en-PK" },
  { id: "US", label: "United States / USD", currency: "USD", locale: "en-US" },
  { id: "EU", label: "Europe", currency: "EUR", locale: "en-IE" },
  { id: "GB", label: "United Kingdom", currency: "GBP", locale: "en-GB" },
  { id: "AE", label: "United Arab Emirates", currency: "AED", locale: "en-AE" },
  { id: "SA", label: "Saudi Arabia", currency: "SAR", locale: "en-SA" },
  { id: "CA", label: "Canada", currency: "CAD", locale: "en-CA" },
  { id: "AU", label: "Australia", currency: "AUD", locale: "en-AU" },
  { id: "IN", label: "India", currency: "INR", locale: "en-IN" },
];

const marketAliases = {
  pakistan: "PK", pk: "PK", "united states": "US", usa: "US", us: "US",
  "united kingdom": "GB", uk: "GB", england: "GB", canada: "CA", australia: "AU",
  india: "IN", "united arab emirates": "AE", uae: "AE", "saudi arabia": "SA",
};

function initialMarket(country) {
  const profileMarket = marketAliases[String(country || "").trim().toLowerCase()];
  if (profileMarket) return profileMarket;
  const region = String(navigator.language || "").split("-")[1]?.toUpperCase();
  if (markets.some((market) => market.id === region)) return region;
  const euroRegions = ["AT", "BE", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "HR", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PT", "SI", "SK"];
  return euroRegions.includes(region) ? "EU" : "US";
}

function formattedPrice(plan, market) {
  return new Intl.NumberFormat(market.locale, {
    style: "currency",
    currency: market.currency,
    maximumFractionDigits: Number.isInteger(plan.prices[market.currency]) ? 0 : 2,
  }).format(plan.prices[market.currency]);
}

const plans = [
  {
    id: "silver",
    name: "Silver",
    months: 1,
    prices: { PKR: 3000, USD: 10.99, EUR: 9.99, GBP: 8.99, AED: 39, SAR: 41, CAD: 14.99, AUD: 16.99, INR: 899 },
    description: "A flexible monthly start.",
  },
  {
    id: "gold",
    name: "Gold",
    months: 3,
    prices: { PKR: 8000, USD: 28.99, EUR: 26.99, GBP: 23.99, AED: 105, SAR: 109, CAD: 39.99, AUD: 44.99, INR: 2399 },
    description: "More time to build genuine connections.",
    badge: "Popular",
  },
  {
    id: "platinum",
    name: "Platinum",
    months: 6,
    prices: { PKR: 15000, USD: 54.99, EUR: 49.99, GBP: 44.99, AED: 199, SAR: 205, CAD: 74.99, AUD: 84.99, INR: 4499 },
    description: "Created for a serious partner search.",
  },
  {
    id: "diamond",
    name: "Diamond",
    months: 12,
    prices: { PKR: 28000, USD: 99.99, EUR: 94.99, GBP: 84.99, AED: 369, SAR: 375, CAD: 139.99, AUD: 159.99, INR: 8299 },
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
  const { user } = useAuth();
  const [selected, setSelected] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [marketId, setMarketId] = useState(() => initialMarket(user?.country || user?.profile?.country));
  const market = markets.find((item) => item.id === marketId) || markets[1];
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
        <label className="billing-market">
          <span>Display prices for</span>
          <select value={marketId} onChange={(event) => setMarketId(event.target.value)}>
            {markets.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
          </select>
        </label>
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
              <div className="plan-price">{formattedPrice(plan, market)}</div>
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
            <h2>{selected.name} — {formattedPrice(selected, market)}</h2>
            <p>
              {selected.months} {selected.months === 1 ? "month" : "months"}
              {" · "}{chosenMethod?.name}. Checkout will activate after the
              secure payment account is connected.
            </p>
          </div>
          <button type="button" disabled>Continue to payment</button>
        </section>
      )}
      <p className="currency-note">
        Currency is selected from your profile or device region without GPS tracking. Final store pricing will be confirmed when payments are connected.
      </p>
    </main>
  );
}
