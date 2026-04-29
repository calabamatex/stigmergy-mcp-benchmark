# Explaining Stigmergy: Two Analogies for Non-Technical Audiences

**Purpose:** Make the architectural argument for stigmergy-based AI coordination accessible to readers without a technical background. Each analogy stands alone and can be adapted for different audiences (LinkedIn post, blog article, internal pitch deck, conference talk).

**How to use this document:** Pick the analogy that best fits your audience and context. The kitchen analogy is broadly accessible and works well for general business audiences. The construction site analogy lands particularly well with operations leaders, project managers, and anyone who has worked in physical industries. Both make the same argument through different lenses; using both in sequence is also viable for longer-form pieces.

---

## Analogy One: The Kitchen

### Standalone version

Imagine two ways of running a kitchen with multiple cooks working on a single elaborate meal.

The first way is direct handoff. Each cook finishes their part and personally walks the entire dish over to the next cook, explaining everything that has been done so far. The first cook hands off to the second. The second hands off to the third, but now they are carrying not just their own work but also a recap of what the first cook did. By the time you reach the tenth cook, that person is receiving a summary of nine prior cooks' work, all of it spoken aloud, every time. The conversations get longer and longer as the meal progresses. This is how most multi-agent AI systems work today. It is simple, but the talking grows fast as you add cooks.

The second way is the bulletin board. Instead of cooks talking to each other directly, there is a board on the kitchen wall. Each cook posts a short note when they finish their part: "soup seasoned, needs salt check," "bread out of oven, cooling." The next cook glances at the board, sees what is relevant, and gets to work. No long handoff conversations. Just brief notes that anyone can read.

This second approach is borrowed from how ant colonies coordinate. Ants do not talk to each other. They leave chemical trails. Other ants follow or ignore those trails based on what they need. Biologists call this stigmergy. The colony coordinates beautifully without any direct communication.

Now, the catch. The bulletin board is not free. You have to install it. You have to teach every cook how to read it and write on it. You have to explain the system every time a new cook joins. That setup cost is real, and it gets paid by every cook in the kitchen, every time they work.

In a small kitchen with two cooks, the setup cost of the bulletin board is more expensive than just having the two cooks talk to each other directly. The handoff is short, the bulletin board overhead is large, and direct communication wins.

But as the kitchen grows, the math flips. With ten cooks, direct communication means the tenth cook is listening to a long recap of everything that came before. The conversations have grown enormous. Meanwhile, the bulletin board cost stays roughly the same per cook regardless of how many cooks you have. At some point, the bulletin board becomes cheaper than all that talking.

The benchmark this work is built around is finding that crossover point. It is asking: at what kitchen size does the bulletin board become worth the setup cost?

The early results show the bulletin board losing badly at small kitchen sizes, which surprised people who assumed it would always win. But once you understand the cost structure, that result is not surprising. It is honest. The bulletin board is not magic. It pays for itself only when you have enough cooks for the talking to become the bottleneck.

Most companies right now are using the direct-handoff approach because it is simpler. They are running into walls as their AI systems grow more complex, because the conversations between AI agents get longer and more expensive every time they add another agent. The bulletin board approach offers a way out, but only above a certain scale. Knowing where that scale is, precisely, tells executives when to switch architectures and when not to bother. That practical guidance is more valuable than a vague claim that "the bulletin board is always better." Honesty about where the technique works and where it does not is what makes the recommendation trustworthy.

The thesis being tested is not "this new approach beats the old one." It is "the old approach has a scaling ceiling, the new approach has a higher ceiling, and here is exactly where they cross." That is the kind of finding that helps people make real decisions.

### Adaptation notes for the kitchen analogy

- **For a LinkedIn post (300-500 words):** Open with the kitchen scene and end at the math flipping. Skip the methodology paragraph. Add a one-line link to the benchmark.
- **For a blog article (1000-2000 words):** Use the full version. Add a section after "the math flips" that explains the actual numbers from the benchmark (46 percent reduction, 10 agents, p = 0.002).
- **For a pitch deck:** Distill to three slides. Slide 1: two kitchens (illustration). Slide 2: cost equations as simple bar charts. Slide 3: where stigmergy wins.
- **For a conference talk:** Keep the analogy in the introduction (90 seconds). Then transition to actual data and methodology.

---

## Analogy Two: The Construction Site

### Standalone version

Picture two construction sites building identical office towers.

On the first site, the workers communicate by walking up to each other. The electrician finishes wiring a floor and walks across the building to find the plumber, explains what he did, walks back. The drywall crew needs to know what is behind the walls, so they track down the electrician, who explains it again. Every time anyone needs information, they go find the person who knows. The site has 50 workers. By midday, half of them are walking around looking for someone to talk to. The work happens, but slowly, and as you add more workers the problem gets worse fast. Adding a 51st worker does not just add one person's communication burden. That person now has to coordinate with all 50 others, and all 50 of them have to coordinate with the new arrival.

On the second site, every floor has a status board. When the electrician finishes a wall, he posts a short note on the board: "north wall, conduit run, breakers at junction box 4." The plumber comes by later, glances at the board, sees what he needs, and starts work. The drywall crew reads the same board and knows exactly what is behind the walls before they cover them. Nobody walks across the building looking for anybody. Information sits where the work is, available to whoever needs it.

This second approach has been used in real construction for decades, under names like Last Planner System, Visual Management, and Lean Construction. It is the core insight of stigmergy: instead of coordinating people directly, you let the work environment carry the coordination.

But the status boards are not free. Someone has to install them. Every worker has to be trained to read and write on them. There are conventions to follow about what gets posted and how. On a small job with three workers, all this overhead is not worth it. They can just talk to each other. The status board approach pays off only when there are enough workers that direct communication has become the bottleneck.

This is exactly the situation in modern AI systems. The current approach is direct communication: each AI agent receives a summary of every other agent's work before doing its part. When the system has only two or three agents, this works fine. When the system grows to ten or twenty agents, the agents spend more time reading summaries than doing actual work. Direct communication has become the bottleneck.

The stigmergy approach replaces the direct messaging with a shared environment, like the construction site's status boards. Each AI agent leaves a compact note about what it did. The next agent reads the relevant notes and continues. The notes are short. Reading them is fast. Adding more agents does not multiply the communication burden the way it would with direct messaging.

The benchmark behind this work is measuring where the trade-off flips. With small AI systems, direct communication wins because the setup cost of the shared environment is too high. With large AI systems, the shared environment wins because direct communication has grown out of control. Somewhere in the middle is a crossover point, and finding it precisely tells builders of multi-agent AI systems when to use which approach.

The early results suggest the crossover is between three and ten agents. Above ten, the shared environment approach saves roughly half the communication cost. The savings get larger as the system grows. Below three, direct communication is still simpler and cheaper. The interesting question, the one this benchmark is designed to answer with rigor, is what happens between those numbers.

For executives running organizations that build with AI: this is a scaling decision. If your multi-agent systems are small, do nothing differently. If they are large or growing fast, start evaluating the shared-environment approach. The savings compound at scale.

### Adaptation notes for the construction site analogy

- **Audience fit:** This analogy works particularly well with operations executives, manufacturing leaders, project managers, and anyone with experience in physical industries. The construction parallel feels concrete and avoids the "everybody talks about food" cliche of kitchen analogies.
- **For a LinkedIn post:** Open with the two-construction-sites scene. Cut after "...somewhere in the middle is a crossover point."
- **For a podcast or talk:** The walking-around-looking-for-someone image is vivid and memorable when spoken aloud. Lean into it.
- **Avoid for academic audiences:** Construction analogies can read as too informal in research contexts. Use the kitchen analogy or skip analogies entirely for those.

---

## Adaptation Patterns Across Both Analogies

Both analogies make the same five-step argument:

1. **Establish the scaling problem.** Direct communication grows fast as participants increase.
2. **Introduce the alternative.** Shared environment with compact signals.
3. **Acknowledge the cost.** The shared environment requires setup that gets paid per participant.
4. **Identify the trade-off.** Small systems, direct communication wins. Large systems, shared environment wins.
5. **Position the research contribution.** The benchmark finds where the crossover lives.

This structure is replicable. If neither the kitchen nor the construction site fits your audience, you can build a third analogy from any domain that has:

- Multiple actors working toward a shared outcome
- An obvious "talk directly" approach that scales badly
- A plausible "shared environment" alternative
- A real setup cost for the alternative

Candidates worth considering for specific audiences:

- **Software engineers:** Pull requests vs. direct review meetings, monolith microservices coordination patterns
- **Healthcare administrators:** Patient handoff conversations vs. EHR shared notes
- **Lawyers:** In-person case meetings vs. shared case management systems
- **Logistics professionals:** Driver-to-driver radio coordination vs. fleet management dashboards

Whichever domain you choose, the structure remains: explain the scaling problem, introduce the shared-environment alternative, name the setup cost honestly, identify the trade-off, then point to the benchmark as the source of precise guidance about when to switch.

---

## What Both Analogies Are Doing

Beyond explaining the technical concept, both analogies serve a strategic purpose. They preempt three common objections:

**"This sounds like just another protocol claim."** By acknowledging the setup cost honestly, the analogies position stigmergy as a real engineering trade-off rather than a marketing pitch. Skeptical readers see the limits and become more willing to consider the upside.

**"Why has nobody done this already?"** The biological framing (ant colonies) and physical framing (Lean Construction) make clear that the underlying insight is not novel. The novelty is applying it to AI agent coordination and measuring precisely when it is worth the setup cost.

**"Where is the catch?"** The analogies make the catch explicit: the shared environment loses on small systems. This honesty earns trust for the larger claim that it wins on big systems.

A reader who finishes either analogy understands not only what the technique is, but where it does and does not apply. That is more valuable than a stronger but less qualified claim.
