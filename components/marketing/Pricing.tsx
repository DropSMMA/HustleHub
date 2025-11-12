import config from "@/config";
import ButtonCheckout from "./ButtonCheckout";

// <Pricing/> displays the pricing plans for your app
// It's your Stripe config in config.js.stripe.plans[] that will be used to display the plans
// <ButtonCheckout /> renders a button that will redirect the user to Stripe checkout called the /api/stripe/create-checkout API endpoint with the correct priceId

const Pricing = () => {
  return (
    <section className="bg-brand-secondary text-white overflow-hidden" id="pricing">
      <div className="py-24 px-8 max-w-5xl mx-auto">
        <div className="flex flex-col text-center w-full mb-20">
          <p className="font-medium text-brand-neon uppercase tracking-widest mb-6">
            Membership
          </p>
          <h2 className="font-bold text-3xl lg:text-5xl tracking-tight text-white">
            Choose how you keep your hustle accountable.
          </h2>
          <p className="text-white/70 text-lg mt-6 max-w-2xl mx-auto">
            Whether you&apos;re grinding solo or rallying a distributed squad, every plan includes logging, social kudos, and AI-powered balance reminders.
          </p>
        </div>

        <div className="relative flex justify-center flex-col lg:flex-row items-center lg:items-stretch gap-8">
          {config.stripe.plans.map((plan) => (
            <div key={plan.priceId} className="relative w-full max-w-lg">
              {plan.isFeatured && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                  <span
                    className="badge text-xs font-semibold border-0 bg-brand-neon text-brand-primary"
                  >
                    TEAM FAVORITE
                  </span>
                </div>
              )}

              {plan.isFeatured && (
                <div
                  className="absolute -inset-[1px] rounded-[9px] bg-brand-neon/50 blur-md z-0"
                ></div>
              )}

              <div className="relative flex flex-col h-full gap-5 lg:gap-8 z-10 bg-brand-primary border border-brand-tertiary/40 p-8 rounded-lg shadow-[0_25px_60px_-25px_rgba(0,0,0,0.8)]">
                <div className="flex justify-between items-center gap-4">
                  <div>
                    <p className="text-lg lg:text-xl font-bold text-white">
                      {plan.name}
                    </p>
                    {plan.description && (
                      <p className="text-white/70 mt-2">
                        {plan.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {plan.priceAnchor && (
                    <div className="flex flex-col justify-end mb-[4px] text-lg ">
                      <p className="relative">
                        <span className="absolute bg-white/40 h-[1.5px] inset-x-0 top-[53%]"></span>
                        <span className="text-white/50">
                          ${plan.priceAnchor}
                        </span>
                      </p>
                    </div>
                  )}
                  <p className={`text-5xl tracking-tight font-extrabold`}>
                    ${plan.price}
                  </p>
                  <div className="flex flex-col justify-end mb-[4px]">
                    <p className="text-xs text-white/60 uppercase font-semibold">
                      USD
                    </p>
                  </div>
                </div>
                {plan.features && (
                  <ul className="space-y-2.5 leading-relaxed text-base flex-1 text-white/80">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="w-[18px] h-[18px] text-brand-neon shrink-0"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                            clipRule="evenodd"
                          />
                        </svg>

                        <span>{feature.name} </span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="space-y-2">
                  <ButtonCheckout priceId={plan.priceId} />

                  <p className="flex items-center justify-center gap-2 text-sm text-center text-white/70 font-medium relative">
                    Cancel anytime. Your streaks stay with you.
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
