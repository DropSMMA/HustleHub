import ButtonSignin from "./ButtonSignin";
import config from "@/config";

const CTA = () => {
  return (
    <section className="bg-brand-tertiary text-white" id="cta">
      <div className="max-w-5xl mx-auto px-8 py-24 text-center">
        <p className="uppercase tracking-[0.4em] text-sm text-brand-neon mb-6">
          Build, sweat, connect
        </p>
        <h2 className="font-bold text-3xl md:text-5xl tracking-tight mb-8 md:mb-12">
          Turn every sprint into momentum with HustleHub.
        </h2>
        <p className="text-lg text-white/75 mb-12 md:mb-16">
          Log the grind, celebrate the wins, and keep your energy balanced with a crew of founders who are chasing the same dream. Join for free and put your hustle on the map today.
        </p>

        <ButtonSignin
          text="Join the HustleHub community"
          extraStyle="bg-brand-neon text-brand-primary btn-wide border-0 hover:bg-brand-neon/90"
        />
      </div>
    </section>
  );
};

export default CTA;
