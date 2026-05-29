## 2025-05-15 - Weather Combat Bridge Implementation

Learning: Creating a Bridge between existing systems (Weather and Combat) allows for deterministic gameplay variety without increasing system complexity. The use of optional parameters with default values in `CombatSystem` maintains backward compatibility while enabling new features.

Action: When implementing new features in simulation paths, always ensure they are deterministic by using seeded RNG and injected state (like weather) rather than global state. Ensure tests for these bridges reset the simulation state (like combat sequence) for side-by-side comparison.
