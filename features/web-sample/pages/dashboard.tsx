import React, { useEffect, useRef, useState } from "react";

// GOOD: semantic HTML with main, nav, section, proper heading hierarchy

const Dashboard = () => {
  const [items, setItems] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // BAD: layout thrashing — reads layout property then writes style
    if (containerRef.current) {
      const h = containerRef.current.offsetHeight; // forces reflow
      containerRef.current.style.minHeight = h + "px"; // triggers another reflow
    }

    // BAD: dynamic content insertion without size reservation (CLS risk)
    setTimeout(() => {
      setItems(["Dashboard", "Analytics", "Reports"]);
    }, 500);
  }, []);

  return (
    <main className="p-4">
      <nav className="mb-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <ul className="flex gap-4 mt-2">
          {/* BAD: icon buttons without aria-label */}
          <li>
            <button>
              <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="8" /></svg>
            </button>
          </li>
          <li>
            <button>
              <svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" /></svg>
            </button>
          </li>
        </ul>
      </nav>

      <section ref={containerRef} className="grid gap-4">
        <h2 className="text-lg font-semibold">Overview</h2>

        {/* BAD: no stable key (index used, no key prop at all below) */}
        {items.map((item) => (
          <div className="border p-2">{item}</div>
        ))}

        {/* BAD: below-fold image without loading="lazy" */}
        <img src="/public/promo.png" alt="Promo" className="mt-8" />
      </section>
    </main>
  );
};

export default Dashboard;
