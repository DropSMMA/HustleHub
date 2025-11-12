"use client";

import { useRef, useState } from "react";
import type { JSX } from "react";

// <FAQ> component is a lsit of <Item> component
// Just import the FAQ & add your FAQ content to the const faqList arrayy below.

interface FAQItemProps {
  question: string;
  answer: JSX.Element;
}

const faqList: FAQItemProps[] = [
  {
    question: "What counts as a Hustle Session?",
    answer: (
      <div className="space-y-2 leading-relaxed">
        <p>
          Anything that moves your body, product, or mindset forward. Log gym workouts, deep work blocks, pitch rehearsals, customer calls, or even meditation breaks. Tag each session with a category so your balance stays visible.
        </p>
      </div>
    ),
  },
  {
    question: "Do I need a wearable to use HustleHub?",
    answer: (
      <div className="space-y-2 leading-relaxed">
        <p>
          Nope. Manual quick-log cards make it easy to capture momentum on the fly. If you do connect Apple Health or Google Fit we’ll automatically pull in workouts and steps to keep your streaks current.
        </p>
      </div>
    ),
  },
  {
    question: "Is HustleHub just for solo founders?",
    answer: (
      <div className="space-y-2 leading-relaxed">
        <p>
          HustleHub thrives with solos, co-founders, and remote teams. You can create private accountability squads, invite investors or advisors to follow along, and keep the wider community cheering you on.
        </p>
      </div>
    ),
  },
  {
    question: "How do challenges and accountability groups work?",
    answer: (
      <div className="space-y-2 leading-relaxed">
        <p>
          Join a public sprint like “30-Day MVP Build” or spin up your own invite-only cohort. Each challenge comes with streak goals, leaderboards, and group chats so progress stays social and fun.
        </p>
      </div>
    ),
  },
];

const FaqItem = ({ item }: { item: FAQItemProps }) => {
  const accordion = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <li>
      <button
        className="relative flex gap-2 items-center w-full py-5 text-base font-semibold text-left border-t md:text-lg border-brand-tertiary/40 text-white"
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(!isOpen);
        }}
        aria-expanded={isOpen}
      >
        <span
          className={`flex-1 ${
            isOpen ? "text-brand-neon" : "text-white"
          }`}
        >
          {item?.question}
        </span>
        <svg
          className="flex-shrink-0 w-4 h-4 ml-auto fill-white/70"
          viewBox="0 0 16 16"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            y="7"
            width="16"
            height="2"
            rx="1"
            className={`transform origin-center transition duration-200 ease-out ${
              isOpen && "rotate-180"
            }`}
          />
          <rect
            y="7"
            width="16"
            height="2"
            rx="1"
            className={`transform origin-center rotate-90 transition duration-200 ease-out ${
              isOpen && "rotate-180 hidden"
            }`}
          />
        </svg>
      </button>

      <div
        ref={accordion}
        className={`transition-all duration-300 ease-in-out text-white/70 overflow-hidden`}
        style={
          isOpen
            ? { maxHeight: accordion?.current?.scrollHeight, opacity: 1 }
            : { maxHeight: 0, opacity: 0 }
        }
      >
        <div className="pb-5 leading-relaxed">{item?.answer}</div>
      </div>
    </li>
  );
};

const FAQ = () => {
  return (
    <section className="bg-brand-primary text-white" id="faq">
      <div className="py-24 px-8 max-w-7xl mx-auto flex flex-col md:flex-row gap-12">
        <div className="flex flex-col text-left basis-1/2">
          <p className="inline-block font-semibold text-brand-neon mb-4">
            FAQ
          </p>
          <p className="sm:text-4xl text-3xl font-extrabold text-white">
            Frequently Asked Questions
          </p>
        </div>

        <ul className="basis-1/2">
          {faqList.map((item, i) => (
            <FaqItem key={i} item={item} />
          ))}
        </ul>
      </div>
    </section>
  );
};

export default FAQ;
