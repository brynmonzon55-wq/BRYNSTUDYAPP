import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Curated verified domain knowledge for foundational curriculum topics
interface QuestionTemplate {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  depth?: 'foundation' | 'balanced' | 'deep';
}

const CURATED_KNOWLEDGE: Record<string, {
  questions: QuestionTemplate[];
  flashcards: Array<{ front: string; back: string }>;
  analogies: { simplified: string; analogy: string };
}> = {
  ohm: {
    questions: [
      {
        question: "According to Ohm's Law (V = I * R), what happens to the electric current (I) if the voltage (V) across a resistor is doubled while resistance (R) stays constant?",
        options: ["Current is halved", "Current doubles", "Current remains unchanged", "Current quadruples"],
        correctIndex: 1,
        explanation: "Current is directly proportional to voltage when resistance remains constant (I = V / R). Doubling V doubles I.",
        difficulty: "easy",
        depth: "foundation"
      },
      {
        question: "What is the standard SI unit of electrical resistance?",
        options: ["Ampere (A)", "Volt (V)", "Ohm (Ω)", "Watt (W)"],
        correctIndex: 2,
        explanation: "The Ohm (symbol: Ω) is the standard SI unit of electrical resistance, named after Georg Simon Ohm.",
        difficulty: "easy",
        depth: "foundation"
      },
      {
        question: "If a 12V battery is connected across a 4Ω resistor, what is the current flowing through the circuit?",
        options: ["3 Amperes", "48 Amperes", "0.33 Amperes", "8 Amperes"],
        correctIndex: 0,
        explanation: "Using Ohm's Law: I = V / R = 12V / 4Ω = 3A.",
        difficulty: "easy",
        depth: "foundation"
      },
      {
        question: "When two identical 10Ω resistors are connected in series, what is the total equivalent resistance of the circuit?",
        options: ["5 Ohms", "10 Ohms", "20 Ohms", "100 Ohms"],
        correctIndex: 2,
        explanation: "In a series circuit, resistances add directly together: R_total = R1 + R2 = 10Ω + 10Ω = 20Ω.",
        difficulty: "medium",
        depth: "balanced"
      },
      {
        question: "When two identical 10Ω resistors are connected in parallel, what is the resulting equivalent resistance?",
        options: ["20 Ohms", "5 Ohms", "10 Ohms", "2.5 Ohms"],
        correctIndex: 1,
        explanation: "For parallel resistors, 1/R_eq = 1/R1 + 1/R2 = 1/10 + 1/10 = 2/10, so R_eq = 5Ω.",
        difficulty: "medium",
        depth: "balanced"
      },
      {
        question: "Which component exhibits non-ohmic behavior, meaning its current-voltage relationship does NOT follow a straight line?",
        options: ["Carbon film resistor", "Metal wire conductor", "Semiconductor diode", "Ideal resistor"],
        correctIndex: 2,
        explanation: "Diodes only conduct in forward bias after reaching a threshold voltage (approx 0.7V for silicon), creating an exponential non-linear curve.",
        difficulty: "medium",
        depth: "balanced"
      },
      {
        question: "How does the electrical resistance of most pure metallic conductors change as temperature increases?",
        options: ["Resistance decreases sharply", "Resistance increases", "Resistance stays exactly constant", "Resistance drops to zero"],
        correctIndex: 1,
        explanation: "As temperature rises, increased thermal vibrations of metal lattice ions scatter electrons more frequently, increasing resistance.",
        difficulty: "medium",
        depth: "balanced"
      },
      {
        question: "In a circuit with a fixed 24V supply, you need to limit current to 120mA (0.12A). What minimum resistance must you place in series?",
        options: ["200 Ohms", "20 Ohms", "2.88 Ohms", "2880 Ohms"],
        correctIndex: 0,
        explanation: "R = V / I = 24V / 0.12A = 200Ω.",
        difficulty: "hard",
        depth: "deep"
      },
      {
        question: "If the power dissipated across a resistor is P = I² * R, what happens to power loss if current is tripled through a fixed resistor?",
        options: ["Increases by 3x", "Increases by 6x", "Increases by 9x", "Decreases by 3x"],
        correctIndex: 2,
        explanation: "Power is proportional to the square of current (I²). Tripling current increases power dissipation by (3)² = 9 times.",
        difficulty: "hard",
        depth: "deep"
      },
      {
        question: "A high-precision sensor circuit experiences ground bounce and voltage drops along trace resistance. Which technique best mitigates this edge case?",
        options: ["Using thinner copper traces", "Adding Kelvin (4-wire) sense connections", "Increasing wire length", "Removing bypass capacitors"],
        correctIndex: 1,
        explanation: "Kelvin 4-wire sensing separates current-carrying leads from voltage-measuring leads, eliminating lead resistance error from the measurement.",
        difficulty: "hard",
        depth: "deep"
      },
      {
        question: "What is the total equivalent resistance when three identical 6Ω resistors are connected in parallel?",
        options: ["2 Ohms", "18 Ohms", "3 Ohms", "0.5 Ohms"],
        correctIndex: 0,
        explanation: "For 3 identical parallel resistors: R_eq = R / N = 6Ω / 3 = 2Ω (or 1/Req = 1/6 + 1/6 + 1/6 = 3/6 -> Req = 2Ω).",
        difficulty: "medium",
        depth: "balanced"
      },
      {
        question: "What is electrical conductance (G), and what is its standard SI unit?",
        options: ["The reciprocal of resistance (1/R), measured in Siemens (S)", "The rate of voltage change, measured in Volts/sec", "Magnetic flux density, measured in Tesla", "Energy stored, measured in Joules"],
        correctIndex: 0,
        explanation: "Conductance measures how easily charge flows through a material. G = 1/R, with the SI unit of Siemens (S), formerly known as mho.",
        difficulty: "easy",
        depth: "foundation"
      },
      {
        question: "What physical conservation law is Kirchhoff's Current Law (KCL) directly derived from?",
        options: ["Conservation of electric charge", "Conservation of mechanical momentum", "Conservation of angular velocity", "First law of thermodynamics only"],
        correctIndex: 0,
        explanation: "KCL states that the algebraic sum of currents entering a junction is zero, which is a direct consequence of conservation of electric charge.",
        difficulty: "medium",
        depth: "balanced"
      },
      {
        question: "What physical conservation law is Kirchhoff's Voltage Law (KVL) directly derived from?",
        options: ["Conservation of electrical energy", "Conservation of mass", "Coulomb's electrostatic law", "Newton's third law"],
        correctIndex: 0,
        explanation: "KVL states that the sum of all voltages around any closed circuit loop equals zero, representing conservation of energy per unit charge.",
        difficulty: "medium",
        depth: "balanced"
      },
      {
        question: "If the voltage across a circuit element increases by 100% (doubles) but current only increases by 20%, what does this prove about the component?",
        options: ["The component is non-ohmic, as its resistance increased under higher voltage/current", "The component has zero resistance", "The component violates conservation of energy", "The component operates as a superconductor"],
        correctIndex: 0,
        explanation: "In an ideal ohmic device, doubling voltage must double current (constant R). If current increases less than voltage, resistance has increased (non-ohmic behavior, typical of incandescent filaments).",
        difficulty: "hard",
        depth: "deep"
      }
    ],
    flashcards: [
      { front: "Ohm's Law Formula", back: "V = I * R (Voltage = Current × Resistance)" },
      { front: "Electric Current (I)", back: "The rate of flow of electric charge through a conductor, measured in Amperes (A)." },
      { front: "Voltage (V)", back: "Electric potential difference that drives charge flow, measured in Volts (V)." },
      { front: "Resistance (R)", back: "The opposition to the flow of electric current, measured in Ohms (Ω)." },
      { front: "Series Resistance Rule", back: "R_total = R1 + R2 + ... + Rn (Resistances add linearly)." },
      { front: "Parallel Resistance Rule", back: "1/R_total = 1/R1 + 1/R2 + ... (Equivalent resistance is always less than smallest branch)." },
      { front: "Ohmic vs Non-Ohmic", back: "Ohmic devices have constant resistance (linear V-I plot); non-ohmic devices (diodes, bulbs) vary with voltage or temperature." },
      { front: "Joule Heating / Power Law", back: "P = V * I = I² * R = V² / R. Rate of electrical energy converted into heat." }
    ],
    analogies: {
      simplified: "Voltage is the water pressure in a pipe, current is the volume of water flowing per second, and resistance is the width of the pipe restricting the flow.",
      analogy: "Think of a garden hose: turn up the faucet (voltage) and more water sprays (current); squeeze the hose (resistance) and the flow slows down."
    }
  },
  ac_dc: {
    questions: [
      {
        question: "Which statement correctly describes the fundamental difference between Alternating Current (AC) and Direct Current (DC)?",
        options: [
          "AC reverses direction periodically, while DC flows in one direction only",
          "AC flows in one direction only, while DC reverses direction periodically",
          "AC is only found in chemical batteries, while DC is only found in grid wall outlets",
          "AC and DC differ only in voltage magnitude, having identical directionality"
        ],
        correctIndex: 0,
        explanation: "AC periodically alternates its direction of flow (following a sinusoidal waveform), whereas DC flows continuously in a single unchanging direction.",
        difficulty: "easy",
        depth: "foundation"
      },
      {
        question: "Which of the following is a direct source of Direct Current (DC)?",
        options: [
          "An electrochemical battery cell (e.g. Lithium-ion or alkaline)",
          "A wall outlet in a residential home",
          "A three-phase hydroelectric turbine generator stator",
          "A high-voltage utility pole distribution transformer"
        ],
        correctIndex: 0,
        explanation: "Batteries produce steady Direct Current through internal chemical redox reactions with fixed positive and negative terminals.",
        difficulty: "easy",
        depth: "foundation"
      },
      {
        question: "What standard frequency does residential AC mains electricity operate at in North America versus most of Europe?",
        options: [
          "60 Hz in North America, 50 Hz in Europe",
          "50 Hz in North America, 60 Hz in Europe",
          "120 Hz in North America, 230 Hz in Europe",
          "100 Hz in North America, 100 Hz in Europe"
        ],
        correctIndex: 0,
        explanation: "North America standardizes on 60 Hz (60 sinusoidal cycles per second), while Europe, Asia, and Africa operate at 50 Hz.",
        difficulty: "medium",
        depth: "foundation"
      },
      {
        question: "Why did AC triumph over DC for long-distance power grid transmission during the 'War of the Currents'?",
        options: [
          "AC voltage can be easily stepped up to very high voltages via transformers, slashing I²R heat losses",
          "AC electricity is completely safe to touch without shock hazards",
          "DC cannot pass through copper wires without melting them",
          "AC motors were impossible to design, forcing all mechanical work onto transmission lines"
        ],
        correctIndex: 0,
        explanation: "Transformers only work with AC. Stepping up voltage reduces current, which exponentially cuts resistive power losses (P = I²R) across long transmission wires.",
        difficulty: "medium",
        depth: "balanced"
      },
      {
        question: "Which circuit component is primarily used to convert Alternating Current (AC) into Direct Current (DC)?",
        options: [
          "A diode rectifier (such as a full-wave bridge rectifier)",
          "A power inverter circuit",
          "A step-down transformer without semiconductor diodes",
          "A variable air capacitor"
        ],
        correctIndex: 0,
        explanation: "A rectifier uses diodes that permit current flow in only one direction, turning oscillating AC into pulsating unidirectional DC.",
        difficulty: "medium",
        depth: "balanced"
      },
      {
        question: "For a standard 120V RMS sinusoidal AC wall outlet, what is the approximate peak instantaneous voltage?",
        options: [
          "Approximately 170 Volts (120V × √2)",
          "Exactly 120 Volts",
          "60 Volts (half the RMS value)",
          "240 Volts (double the RMS value)"
        ],
        correctIndex: 0,
        explanation: "V_peak = V_rms * √2 ≈ 120 * 1.414 ≈ 170V. RMS is the effective DC heating equivalent, but the sine peak reaches ~170V.",
        difficulty: "medium",
        depth: "balanced"
      },
      {
        question: "What electronic device performs the reverse operation of a rectifier, converting DC from solar panels or batteries into AC for the grid?",
        options: [
          "An inverter (using high-frequency transistor switching)",
          "A step-up transformer alone",
          "A mechanical commutator",
          "A passive inductor choke"
        ],
        correctIndex: 0,
        explanation: "An inverter uses switching transistors (MOSFETs/IGBTs) with pulse-width modulation to synthesize AC from a DC source.",
        difficulty: "medium",
        depth: "balanced"
      },
      {
        question: "Why cannot a conventional magnetic core transformer operate on steady Direct Current (DC)?",
        options: [
          "Transformers require a changing magnetic flux (dΦ/dt) to induce secondary voltage; steady DC creates a static magnetic field",
          "DC voltage is too high for transformer windings",
          "DC current moves too fast for copper to respond",
          "Transformers only have positive terminals"
        ],
        correctIndex: 0,
        explanation: "Faraday's Law of Induction dictates that induced EMF requires a time-varying magnetic field (dΦ/dt). Steady DC produces zero induction and will overheat the primary coil.",
        difficulty: "hard",
        depth: "deep"
      },
      {
        question: "What is 'Skin Effect' in high-frequency AC conductors?",
        options: [
          "High-frequency AC current tends to concentrate near the outer surface of a wire, increasing effective resistance",
          "Electric current completely leaves the wire and travels through the air",
          "DC current flows exclusively along the insulation jacket",
          "Magnetic fields reverse without electron movement"
        ],
        correctIndex: 0,
        explanation: "Changing magnetic fields within the wire induce eddy currents that oppose current in the center, crowding high-frequency current toward the wire's outer skin.",
        difficulty: "hard",
        depth: "deep"
      },
      {
        question: "Why is High-Voltage Direct Current (HVDC) increasingly favored over AC for undersea cables longer than 50 miles?",
        options: [
          "HVDC avoids the continuous capacitive charging currents that overwhelm long underwater AC cables",
          "HVDC cables do not require insulation",
          "HVDC operates at zero voltage",
          "HVDC cannot produce heat in copper"
        ],
        correctIndex: 0,
        explanation: "Long underwater cables form large capacitors with surrounding water. AC constantly charges and discharges this capacitance, causing massive reactive power loss, which does not happen with DC.",
        difficulty: "hard",
        depth: "deep"
      }
    ],
    flashcards: [
      { front: "AC vs DC Directionality", back: "AC periodically reverses direction in a wave (mains grid). DC flows continuously in one direction (batteries, chips)." },
      { front: "Why Grids Use AC", back: "AC can be stepped up/down with transformers to transmit high voltage over miles with minimal I²R heat loss." },
      { front: "RMS vs Peak Voltage", back: "V_rms = V_peak / √2 ≈ 0.707 × V_peak. A 120V RMS outlet actually peaks at ~170V." },
      { front: "Rectifier vs Inverter", back: "Rectifier converts AC to DC (charger). Inverter converts DC to AC (solar panels, battery backups)." },
      { front: "Transformer Induction Rule", back: "Transformers require changing AC magnetic flux (dΦ/dt); steady DC produces zero induction and overheats the coil." },
      { front: "Grid Frequencies", back: "North America: 60 Hz. Europe, Asia, Africa: 50 Hz. Indicates complete sinusoidal cycles per second." },
      { front: "Skin Effect", back: "At higher AC frequencies, current crowds to the outer surface of conductors, increasing effective AC resistance." },
      { front: "HVDC Advantage", back: "Eliminates continuous capacitive charging losses on long undersea and underground transmission runs." }
    ],
    analogies: {
      simplified: "DC is a continuous conveyor belt moving items in one direction. AC is a hand saw moving back and forth, transferring energy through oscillation.",
      analogy: "DC is like water flowing down an aqueduct in one direction. AC is like ocean waves sloshing back and forth on a beach, pushing energy without the water ever leaving the bay."
    }
  },
  binary_search: {
    questions: [
      {
        question: "What is the mandatory prerequisite for running Binary Search on an array?",
        options: [
          "The array elements must be sorted in order",
          "The array must have an even number of elements",
          "The array must only store positive integers",
          "The array must be implemented as a linked list"
        ],
        correctIndex: 0,
        explanation: "Binary search compares the target with the middle element to eliminate half the search space; this logic only works if the elements are sorted.",
        difficulty: "easy",
        depth: "foundation"
      },
      {
        question: "What is the worst-case time complexity of Binary Search on a sorted array of N elements?",
        options: ["O(log N)", "O(N)", "O(1)", "O(N log N)"],
        correctIndex: 0,
        explanation: "Because the search window is halved at each comparison step, the worst-case time is logarithmic (O(log2 N)).",
        difficulty: "easy",
        depth: "foundation"
      },
      {
        question: "In languages with fixed 32-bit signed integers (e.g. C++, Java), why is `mid = low + (high - low) / 2` used instead of `mid = (low + high) / 2`?",
        options: [
          "It avoids 32-bit integer overflow when (low + high) exceeds 2,147,483,647",
          "It calculates the floating point midpoint rather than integer floor",
          "It compiles to a single bitwise shift on all architectures",
          "It rounds up instead of down"
        ],
        correctIndex: 0,
        explanation: "If `low` and `high` are both large numbers near INT_MAX, their sum `(low + high)` exceeds 2^31 - 1 and wraps to a negative number.",
        difficulty: "medium",
        depth: "balanced"
      },
      {
        question: "Why cannot Binary Search achieve O(log N) runtime directly on a Singly Linked List, even if the nodes are sorted?",
        options: [
          "Linked lists lack O(1) random index access; finding the middle node takes O(N) traversal",
          "Linked lists cannot store comparable data types",
          "Linked lists reverse element pointers during comparison",
          "The head pointer cannot be reset"
        ],
        correctIndex: 0,
        explanation: "Binary search requires instant O(1) access to the middle element. In a linked list, advancing to the midpoint requires traversing N/2 nodes, turning the overall runtime into O(N).",
        difficulty: "medium",
        depth: "balanced"
      },
      {
        question: "What while-loop condition indicates that Binary Search has exhausted the search space without finding the target?",
        options: [
          "low > high",
          "low == high",
          "mid == 0",
          "target < 0"
        ],
        correctIndex: 0,
        explanation: "When `low` becomes strictly greater than `high`, the search window has collapsed to size zero, confirming the target is not present.",
        difficulty: "easy",
        depth: "foundation"
      },
      {
        question: "How many comparisons does Binary Search take in the worst case to search a sorted list of 1,024 elements?",
        options: ["10 comparisons (log2 1024)", "512 comparisons", "1,024 comparisons", "100 comparisons"],
        correctIndex: 0,
        explanation: "2^10 = 1024, so log2(1024) = exactly 10 comparisons in the worst case.",
        difficulty: "easy",
        depth: "foundation"
      },
      {
        question: "In standard C++ algorithms, what does `std::lower_bound` return on a sorted range with duplicates?",
        options: [
          "An iterator to the first element that is not less than (i.e. >=) the target",
          "An iterator to the last element strictly equal to the target",
          "The exact middle occurrence of the duplicate elements",
          "A boolean flag indicating presence"
        ],
        correctIndex: 0,
        explanation: "`lower_bound` finds the first position where the value is >= target; `upper_bound` finds the first position where value is > target.",
        difficulty: "hard",
        depth: "deep"
      },
      {
        question: "What is 'Binary Search on the Answer' (Monotonic Predicate Search)?",
        options: [
          "Binary searching over a numeric output range when a validation function f(x) is monotonic (False...False -> True...True)",
          "Searching a database using binary SQL syntax",
          "Running two simultaneous binary searches in opposite directions",
          "Using XOR bitwise masks to guess integers"
        ],
        correctIndex: 0,
        explanation: "When a feasibility question satisfies monotonicity (e.g. 'can we ship N items within D days?'), we can binary search the answer domain directly in O(log(range) * cost).",
        difficulty: "hard",
        depth: "deep"
      }
    ],
    flashcards: [
      { front: "Binary Search Prerequisite", back: "Array must be sorted with O(1) random index access." },
      { front: "Time Complexity", back: "O(log N) worst/average, O(1) best case (target at exact middle on first try)." },
      { front: "Overflow-Safe Midpoint", back: "mid = low + (high - low) / 2 prevents 32-bit signed integer overflow." },
      { front: "Why not on Linked Lists?", back: "Finding middle node requires O(N) pointer traversal, destroying the O(log N) advantage." },
      { front: "Termination Condition", back: "Loop runs while low <= high; terminates when low > high (target not found)." },
      { front: "Lower Bound vs Upper Bound", back: "Lower bound: first index >= target. Upper bound: first index > target." },
      { front: "Search on Answer", back: "Binary searching over possible solution values when the decision check is monotonic." }
    ],
    analogies: {
      simplified: "Binary search is looking up a word in a physical dictionary: open to the middle, check alphabetical order, and discard the unneeded half.",
      analogy: "Like the number guessing game: you guess 50. If told 'higher', you instantly discard 1-50 and guess 75 next."
    }
  },
  photosynthesis: {
    questions: [
      {
        question: "In plant photosynthesis, in which chloroplast structure do the light-dependent reactions take place?",
        options: [
          "Thylakoid membranes",
          "Stroma fluid matrix",
          "Outer chloroplast membrane",
          "Mitochondrial matrix"
        ],
        correctIndex: 0,
        explanation: "The light reactions occur across the thylakoid membrane, where chlorophyll pigments and electron transport chains are embedded.",
        difficulty: "easy",
        depth: "foundation"
      },
      {
        question: "What is the primary source of the oxygen (O2) released as a byproduct during photosynthesis?",
        options: [
          "The photolysis (splitting) of water molecules (H2O)",
          "The breakdown of carbon dioxide (CO2)",
          "The splitting of glucose (C6H12O6)",
          "Atmospheric nitrogen breakdown"
        ],
        correctIndex: 0,
        explanation: "In Photosystem II, water molecules are split (photolysis: 2H2O -> 4H+ + 4e- + O2) to replace excited electrons, releasing O2 gas.",
        difficulty: "medium",
        depth: "foundation"
      },
      {
        question: "Which enzyme catalyzes the initial carbon fixation step in the Calvin Cycle (light-independent reactions)?",
        options: [
          "RuBisCO (Ribulose-1,5-bisphosphate carboxylase-oxygenase)",
          "ATP Synthase",
          "DNA Polymerase",
          "Amylase"
        ],
        correctIndex: 0,
        explanation: "RuBisCO attaches CO2 to 5-carbon RuBP, initiating the Calvin cycle in the stroma.",
        difficulty: "medium",
        depth: "balanced"
      },
      {
        question: "What two energy-carrier molecules produced by the light-dependent reactions are consumed in the Calvin Cycle?",
        options: [
          "ATP and NADPH",
          "Glucose and Pyruvate",
          "NADH and FADH2",
          "ADP and NADP+"
        ],
        correctIndex: 0,
        explanation: "The light reactions store solar energy into ATP and NADPH, which power the reduction of 3-PGA to G3P in the Calvin cycle.",
        difficulty: "medium",
        depth: "balanced"
      },
      {
        question: "What wasteful process occurs when RuBisCO binds oxygen (O2) instead of carbon dioxide (CO2) in hot, dry conditions?",
        options: [
          "Photorespiration",
          "Cellular respiration",
          "Fermentation",
          "Photophosphorylation"
        ],
        correctIndex: 0,
        explanation: "Photorespiration occurs when RuBisCO oxygenates RuBP, wasting energy and releasing previously fixed CO2 without producing ATP or sugar.",
        difficulty: "hard",
        depth: "deep"
      },
      {
        question: "How do C4 plants (e.g. corn, sugarcane) structurally minimize photorespiration?",
        options: [
          "They spatially separate initial CO2 fixation (mesophyll cells) from the Calvin cycle (bundle-sheath cells)",
          "They close stomata permanently and rely on root CO2",
          "They replace RuBisCO with chlorophyll c",
          "They only photosynthesize during complete darkness"
        ],
        correctIndex: 0,
        explanation: "C4 plants use PEP carboxylase in mesophyll cells to fix CO2 into 4-carbon malate, then pump it to bundle-sheath cells to maintain high local CO2 around RuBisCO.",
        difficulty: "hard",
        depth: "deep"
      }
    ],
    flashcards: [
      { front: "Light Reactions Location", back: "Thylakoid membrane of chloroplasts (generates ATP & NADPH, releases O2)." },
      { front: "Calvin Cycle Location", back: "Stroma of chloroplasts (uses ATP & NADPH to fix CO2 into sugars)." },
      { front: "Source of O2 Gas", back: "Photolysis (splitting) of water (H2O) at Photosystem II." },
      { front: "RuBisCO Role", back: "Key enzyme fixing atmospheric CO2 to RuBP in the Calvin cycle." },
      { front: "Photorespiration", back: "Wasteful reaction when RuBisCO binds O2 instead of CO2 under high heat." },
      { front: "C4 Plant Adaptation", back: "Spatial separation of CO2 capture (mesophyll) and Calvin cycle (bundle sheath) to stop photorespiration." }
    ],
    analogies: {
      simplified: "Light reactions are solar panels generating battery power (ATP/NADPH); the Calvin cycle is a factory using that battery power to build sugar blocks from CO2 air.",
      analogy: "Like a charging station: sunlight charges the battery pack (light reactions), then the factory floor uses that stored charge to assemble furniture from raw lumber (Calvin cycle)."
    }
  }
};

// Utility to shuffle question options and update correctIndex
function shuffleQuestionOptions(q: QuestionTemplate) {
  const correctOptionText = q.options[q.correctIndex];
  const shuffled = [...q.options];
  // Fisher-Yates
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const newIndex = shuffled.indexOf(correctOptionText);
  return {
    ...q,
    options: shuffled,
    correctIndex: newIndex >= 0 ? newIndex : 0,
  };
}

// Check if topic matches curated verified domain knowledge
function getCuratedTopicQuestions(topic: string, count = 10) {
  const lower = topic.toLowerCase();
  let baseList: QuestionTemplate[] | null = null;

  if (lower.includes('ohm') || lower.includes('circuit') || lower.includes('resistor')) {
    baseList = CURATED_KNOWLEDGE.ohm.questions;
  } else if (
    (lower.includes('ac') && lower.includes('dc')) ||
    lower.includes('alternating') ||
    lower.includes('direct current')
  ) {
    baseList = CURATED_KNOWLEDGE.ac_dc.questions;
  } else if (lower.includes('binary') || lower.includes('search') || lower.includes('divide')) {
    baseList = CURATED_KNOWLEDGE.binary_search.questions;
  } else if (lower.includes('photo') || lower.includes('calvin') || lower.includes('chloroplast')) {
    baseList = CURATED_KNOWLEDGE.photosynthesis.questions;
  }

  if (!baseList || baseList.length === 0) return null;

  if (baseList.length >= count) {
    return baseList.map(shuffleQuestionOptions).slice(0, count);
  }

  // If requested count exceeds base list, cycle and shuffle options to fulfill target count
  const result: QuestionTemplate[] = [];
  while (result.length < count) {
    for (const q of baseList) {
      if (result.length >= count) break;
      result.push(shuffleQuestionOptions(q));
    }
  }
  return result;
}

function getCuratedFlashcards(topic: string, count = 10) {
  const lower = topic.toLowerCase();
  if (lower.includes('ohm') || lower.includes('circuit')) return CURATED_KNOWLEDGE.ohm.flashcards.slice(0, count);
  if ((lower.includes('ac') && lower.includes('dc')) || lower.includes('alternating')) return CURATED_KNOWLEDGE.ac_dc.flashcards.slice(0, count);
  if (lower.includes('binary') || lower.includes('search')) return CURATED_KNOWLEDGE.binary_search.flashcards.slice(0, count);
  if (lower.includes('photo')) return CURATED_KNOWLEDGE.photosynthesis.flashcards.slice(0, count);
  return null;
}

function getCuratedAnalogy(topic: string) {
  const lower = topic.toLowerCase();
  if (lower.includes('ohm') || lower.includes('circuit')) return CURATED_KNOWLEDGE.ohm.analogies;
  if ((lower.includes('ac') && lower.includes('dc')) || lower.includes('alternating')) return CURATED_KNOWLEDGE.ac_dc.analogies;
  if (lower.includes('binary') || lower.includes('search')) return CURATED_KNOWLEDGE.binary_search.analogies;
  if (lower.includes('photo')) return CURATED_KNOWLEDGE.photosynthesis.analogies;
  return null;
}

// Resilient multi-tier model cascade for high availability and low latency
async function callGeminiWithFallback(ai: GoogleGenAI, contents: any, schema?: any) {
  const config = schema
    ? {
        responseMimeType: 'application/json',
        responseSchema: schema,
      }
    : {};

  // Tier 1: gemini-3.1-flash-lite with MINIMAL thinking (fastest, high throughput, zero lag)
  try {
    return await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents,
      config: {
        ...config,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
      },
    });
  } catch (err1: any) {
    console.warn('gemini-3.1-flash-lite busy, falling back to gemini-3.8-flash with LOW thinking:', err1?.message || err1);
    // Tier 2: gemini-3.8-flash with LOW thinking
    try {
      return await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          ...config,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });
    } catch (err2: any) {
      console.warn('gemini-3.8-flash also failed, falling back to gemini-flash-latest:', err2?.message || err2);
      // Tier 3: gemini-flash-latest
      return await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents,
        config,
      });
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', hasGeminiKey: !!apiKey, time: new Date().toISOString() });
  });

  // 1. Generate Quiz Endpoint
  app.post('/api/gemini/quiz', async (req, res) => {
    const { topic, notes, depth = 'balanced', count = 15 } = req.body;
    if (!topic || typeof topic !== 'string') {
      return res.status(400).json({ error: 'Topic title is required' });
    }

    const targetCount = Math.min(Math.max(Number(count) || 15, 10), 50);

    // If no AI key is configured and topic has curated questions, use curated set
    if (!ai) {
      const curatedQuestions = getCuratedTopicQuestions(topic, targetCount);
      if (curatedQuestions && curatedQuestions.length > 0) {
        const formatted = curatedQuestions.map((q, idx) => ({
          id: `q_${Date.now()}_${idx}`,
          question: q.question,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation,
          difficulty: q.difficulty,
        }));
        return res.json({ questions: formatted });
      }

      return res.status(503).json({
        error: `Gemini API key is not configured in environment. To protect learning quality, generic placeholder questions have been disabled. Please configure your GEMINI_API_KEY in the AI Studio Secrets panel, or test using sample curriculum topics.`,
      });
    }

    try {
      let depthGuidance = '';
      if (depth === 'foundation') {
        depthGuidance = 'Focus on core definitions, formulas, and fundamental distinctions to help relearn without ambiguity.';
      } else if (depth === 'deep') {
        depthGuidance = 'Focus on advanced edge cases, numerical calculations, design trade-offs, and tricky practical debugging scenarios.';
      } else {
        depthGuidance = 'Provide a balanced mix of factual recall (30%), numerical or conceptual calculations (40%), and real-world system applications (30%).';
      }

      const prompt = `You are an expert professor creating an active-recall multiple-choice quiz on: "${topic}".
${notes ? `User lesson notes:\n"${notes}"\n` : ''}
Depth Instruction: ${depthGuidance}
Target Size: Generate exactly ${targetCount} high-yield, non-repeating questions covering every major concept, formula, table entry, and comparison in the notes.
${targetCount > 20 ? `Coverage Instruction for ${targetCount} Questions: Since this is an extensive comprehensive exam (${targetCount} questions), systematically cover each subtopic, formula variation, condition, operational limit, component role, and application without repeating questions or concepts.` : ''}

QUESTION QUALITY RULES (MANDATORY):
1. TOPIC-SPECIFIC ONLY: Every question must contain concrete facts, equations, circuit behaviors, algorithms, or phenomena exclusive to "${topic}". It must make ZERO sense if the topic name is swapped for another.
2. PLAUSIBLE DISTRACTORS: Wrong options must be tempting misconceptions, common student mistakes, inverted formulas, or swapped definitions (e.g. confusing voltage with current, believing DC cannot be stored, wrong calculation steps). NEVER provide obviously silly, academic-sounding filler, or throwaway choices.
3. RANDOMIZED CORRECT ANSWER: Distribute the correct answer index (0, 1, 2, 3) evenly across A, B, C, and D. Do not default to option A.
4. MIXED QUESTION TYPES:
   - Conceptual definitions & key distinctions
   - Numerical calculations with concrete values and formulas
   - Real-world application scenarios
   - "Which of the following statements is FALSE?"
5. EXPLANATIONS: Provide a concise explanation specifying WHY the correct answer is right and correcting the misconception.`;

      const quizSchema = {
        type: Type.OBJECT,
        properties: {
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                correctIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING },
                difficulty: { type: Type.STRING },
              },
              required: ['question', 'options', 'correctIndex', 'explanation', 'difficulty'],
            },
          },
        },
        required: ['questions'],
      };

      const response = await callGeminiWithFallback(ai, prompt, quizSchema);

      const text = response.text || '{}';
      const parsed = JSON.parse(text);
      if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
        throw new Error('Gemini model returned empty or invalid question structure.');
      }

      const validQuestions = parsed.questions.map((q: any, idx: number) => ({
        id: `q_${Date.now()}_${idx}`,
        question: q.question,
        options: Array.isArray(q.options) && q.options.length >= 4 ? q.options.slice(0, 4) : ['Option A', 'Option B', 'Option C', 'Option D'],
        correctIndex: typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < 4 ? q.correctIndex : 0,
        explanation: q.explanation || 'No explanation provided.',
        difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty?.toLowerCase()) ? q.difficulty.toLowerCase() : 'medium',
      }));

      return res.json({ questions: validQuestions });
    } catch (err: any) {
      console.error('Gemini quiz generation error:', err);
      // Seamlessly fall back to verified curriculum questions if topic matches, preventing 503 error
      const curatedFallback = getCuratedTopicQuestions(topic, targetCount);
      if (curatedFallback && curatedFallback.length > 0) {
        const formatted = curatedFallback.map((q, idx) => ({
          id: `q_${Date.now()}_${idx}`,
          question: q.question,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation,
          difficulty: q.difficulty,
        }));
        return res.json({ questions: formatted });
      }

      return res.status(503).json({
        error: `AI generation service is currently experiencing high demand. Please tap Retry or choose a smaller question count.`,
      });
    }
  });

  // 2. Generate Combined Review Quiz across multiple topics
  app.post('/api/gemini/combined-quiz', async (req, res) => {
    const { topics, count = 10 } = req.body;
    if (!Array.isArray(topics) || topics.length === 0) {
      return res.status(400).json({ error: 'Topics array is required' });
    }

    // Try curated questions from due topics first if available
    const curatedMatches: any[] = [];
    topics.forEach((t: any) => {
      const qList = getCuratedTopicQuestions(t.title, 4);
      if (qList) {
        qList.forEach((q) => {
          curatedMatches.push({
            ...q,
            id: `cq_${Date.now()}_${Math.random()}`,
            topicTitle: t.title,
          });
        });
      }
    });

    if (curatedMatches.length >= count) {
      return res.json({ questions: curatedMatches.slice(0, count) });
    }

    if (!ai) {
      if (curatedMatches.length > 0) {
        return res.json({ questions: curatedMatches });
      }
      return res.status(503).json({
        error: `Gemini API key is not configured. Generic template questions are disabled to preserve study quality.`,
      });
    }

    try {
      const topicsSummary = topics.map((t: any, i: number) => `${i + 1}. "${t.title}"${t.notes ? ` (Notes: ${t.notes})` : ''}`).join('\n');
      const prompt = `Create an interleaved spaced repetition review quiz for these ${topics.length} topics:
${topicsSummary}

QUESTION QUALITY RULES (MANDATORY):
1. TOPIC-SPECIFIC: Every question must contain concrete facts, equations, or phenomena specific to the chosen topic.
2. PLAUSIBLE DISTRACTORS: Wrong options must be tempting misconceptions or common calculation errors.
3. RANDOMIZED CORRECT ANSWER: Evenly distribute correct answer index (0, 1, 2, 3).
4. Return exactly ${Math.min(Math.max(count, 5), 12)} questions.`;

      const combinedSchema = {
        type: Type.OBJECT,
        properties: {
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                topicTitle: { type: Type.STRING },
                question: { type: Type.STRING },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                correctIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING },
                difficulty: { type: Type.STRING },
              },
              required: ['topicTitle', 'question', 'options', 'correctIndex', 'explanation', 'difficulty'],
            },
          },
        },
        required: ['questions'],
      };

      const response = await callGeminiWithFallback(ai, prompt, combinedSchema);

      const text = response.text || '{}';
      const parsed = JSON.parse(text);
      if (parsed.questions && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        const valid = parsed.questions.map((q: any, idx: number) => ({
          id: `cq_${Date.now()}_${idx}`,
          topicTitle: q.topicTitle || topics[0]?.title || 'Review Topic',
          question: q.question,
          options: Array.isArray(q.options) && q.options.length >= 4 ? q.options.slice(0, 4) : ['Option A', 'Option B', 'Option C', 'Option D'],
          correctIndex: typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < 4 ? q.correctIndex : 0,
          explanation: q.explanation || 'No explanation provided.',
          difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty?.toLowerCase()) ? q.difficulty.toLowerCase() : 'medium',
        }));
        return res.json({ questions: valid });
      }

      throw new Error('No combined questions returned by model.');
    } catch (err: any) {
      console.error('Combined quiz error:', err);
      if (curatedMatches.length > 0) {
        return res.json({ questions: curatedMatches });
      }
      return res.status(503).json({
        error: `Combined quiz generation failed: ${err.message}. Placeholder questions are disabled. Tap Retry to try again.`,
      });
    }
  });

  // 3. Generate Flashcards Endpoint
  app.post('/api/gemini/flashcards', async (req, res) => {
    const { topic, notes, count = 10 } = req.body;
    if (!topic || typeof topic !== 'string') {
      return res.status(400).json({ error: 'Topic title is required' });
    }

    const curatedCards = getCuratedFlashcards(topic, count);
    if (curatedCards && curatedCards.length > 0) {
      return res.json({
        flashcards: curatedCards.map((c, i) => ({ ...c, id: `fc_${Date.now()}_${i}` })),
      });
    }

    if (!ai) {
      return res.status(503).json({
        error: `Gemini API key is not configured in environment. Please configure your API key in AI Studio Secrets, or test with sample curriculum topics.`,
      });
    }

    try {
      const prompt = `Create a high-impact flashcard deck for: "${topic}".
${notes ? `User notes:\n"${notes}"\n` : ''}
Number of flashcards: ${Math.min(Math.max(count, 8), 12)}.
Requirements:
- Front: A precise term, law, formula, or core conceptual question.
- Back: Concise definition with key formula and 1 practical example or takeaway.`;

      const flashcardSchema = {
        type: Type.OBJECT,
        properties: {
          flashcards: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                front: { type: Type.STRING },
                back: { type: Type.STRING },
              },
              required: ['front', 'back'],
            },
          },
        },
        required: ['flashcards'],
      };

      const response = await callGeminiWithFallback(ai, prompt, flashcardSchema);

      const text = response.text || '{}';
      const parsed = JSON.parse(text);
      if (parsed.flashcards && Array.isArray(parsed.flashcards) && parsed.flashcards.length > 0) {
        const cards = parsed.flashcards.map((c: any, idx: number) => ({
          id: `fc_${Date.now()}_${idx}`,
          front: c.front,
          back: c.back,
        }));
        return res.json({ flashcards: cards });
      }
      throw new Error('Invalid flashcard payload from model.');
    } catch (err: any) {
      console.error('Flashcard error:', err);
      if (curatedCards && curatedCards.length > 0) {
        return res.json({
          flashcards: curatedCards.map((c, i) => ({ ...c, id: `fc_${Date.now()}_${i}` })),
        });
      }
      return res.status(503).json({
        error: `Flashcard generation failed: ${err.message}. Tap Retry to try again.`,
      });
    }
  });

  // 4. "Explain It Simpler" Endpoint
  app.post('/api/gemini/simplify', async (req, res) => {
    const { topic, concept, explanation } = req.body;

    const curatedAnalogy = getCuratedAnalogy(topic || '');
    if (curatedAnalogy && (!concept || concept.length < 30)) {
      return res.json(curatedAnalogy);
    }

    if (!ai) {
      if (curatedAnalogy) return res.json(curatedAnalogy);
      return res.json({
        simplified: `At its core, this concept establishes consistent rules so that we can predict behavior accurately instead of guessing.`,
        analogy: `Think of it like gravity: you don't have to reinvent the law every time an apple falls; you just apply the equation to predict the trajectory.`,
      });
    }

    try {
      const prompt = `Explain this concept simply with a memorable everyday analogy.
Topic: "${topic || 'General'}"
Concept: "${concept || ''}"
Original: "${explanation || ''}"
Provide:
1. simplified: plain conversational English explanation (2 sentences).
2. analogy: a vivid 1-2 sentence real-world analogy.`;

      const simplifySchema = {
        type: Type.OBJECT,
        properties: {
          simplified: { type: Type.STRING },
          analogy: { type: Type.STRING },
        },
        required: ['simplified', 'analogy'],
      };

      const response = await callGeminiWithFallback(ai, prompt, simplifySchema);

      const text = response.text || '{}';
      const parsed = JSON.parse(text);
      if (parsed.simplified && parsed.analogy) {
        return res.json({
          simplified: parsed.simplified,
          analogy: parsed.analogy,
        });
      }
    } catch (err: any) {
      console.warn('Gemini simplify error:', err);
    }

    if (curatedAnalogy) return res.json(curatedAnalogy);
    res.json({
      simplified: `This principle guarantees predictable system behavior by tying inputs directly to outputs through physical laws.`,
      analogy: `Think of it like a faucet: more pressure yields higher flow, but a narrower nozzle creates resistance that restricts the stream.`,
    });
  });

  // 5. "Enrich Notes & Fill Missing Examples" Endpoint
  app.post('/api/gemini/enrich-notes', async (req, res) => {
    const { topic, notes } = req.body;
    if (!notes || typeof notes !== 'string') {
      return res.status(400).json({ error: 'Notes are required to enrich' });
    }

    if (ai) {
      try {
        const prompt = `You are an expert tutor enhancing a learner's study notes on the topic: "${topic || 'General'}".
The learner has provided their study notes below.
Your instructions:
1. RESPECT their study guide as the ground truth. Keep their notes intact.
2. Check if there are concrete real-world examples, numerical walkthroughs, or illustrative applications missing.
3. If examples are missing or brief, append clearly formatted examples and nuances at the end of the notes.
Format the additions with:
"💡 Practical Example & Application:"
"📌 Key Edge Case / Common Misconception:"
Return JSON with { "enrichedNotes": string, "addedExamples": string[] }.

Learner's original notes:
"${notes}"`;

        const enrichSchema = {
          type: Type.OBJECT,
          properties: {
            enrichedNotes: { type: Type.STRING },
            addedExamples: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['enrichedNotes', 'addedExamples'],
        };

        const response = await callGeminiWithFallback(ai, prompt, enrichSchema);

        const text = response.text || '{}';
        const parsed = JSON.parse(text);
        if (parsed.enrichedNotes) {
          return res.json({
            enrichedNotes: parsed.enrichedNotes,
            addedExamples: parsed.addedExamples || [],
          });
        }
      } catch (err: any) {
        console.warn('Gemini enrich-notes fallback:', err?.message || err);
      }
    }

    // Curated high-yield example additions for foundation topics
    const lowerTopic = (topic || '').toLowerCase();
    let exampleAddition = '';
    let addedExamples: string[] = [];

    if (lowerTopic.includes('ohm') || lowerTopic.includes('circuit')) {
      exampleAddition = `\n\n💡 Practical Example & Walkthrough:\nIf you connect an LED with a forward voltage of 2V to a 9V battery and need to limit current to 20mA (0.02A), the resistor must drop 9V - 2V = 7V. By Ohm's Law: R = 7V / 0.02A = 350Ω (use standard 360Ω resistor).\n\n📌 Key Nuance:\nReal resistors have a power rating (e.g. 1/4 Watt). P = I² * R = (0.02)² * 350 = 0.14W, which safely stays under the 0.25W limit.`;
      addedExamples = ['LED current limiting resistor calculation with voltage drop', 'Joule heating power safety margin check'];
    } else if (lowerTopic.includes('binary') || lowerTopic.includes('search')) {
      exampleAddition = `\n\n💡 Practical Example & Walkthrough:\nLooking up a target value (42) in a sorted array [3, 8, 14, 25, 42, 60, 81]:\n- Step 1: mid is 25 (index 3). 42 > 25, so discard left half.\n- Step 2: new window is [42, 60, 81]. mid is 60. 42 < 60, discard right half.\n- Step 3: mid is 42. Match found in 3 comparisons!\n\n📌 Key Edge Case:\nAlways compute \`mid = low + (high - low) / 2\` in languages like C++/Java to avoid 32-bit signed integer overflow.`;
      addedExamples = ['Step-by-step array search trace in 3 steps', 'Integer overflow prevention formula'];
    } else if (lowerTopic.includes('ac') || lowerTopic.includes('dc')) {
      exampleAddition = `\n\n💡 Practical Example & Walkthrough:\nA 120V AC wall outlet has a peak voltage of ~170V (120 × √2). A laptop charger uses a bridge rectifier diode circuit and capacitors to smooth this 60Hz oscillation into a constant 19V DC supply.\n\n📌 Key Nuance:\nTransformers only work on AC because electromagnetic induction requires a constantly changing magnetic flux; steady DC creates a static magnetic field that saturates the core without inducing secondary voltage.`;
      addedExamples = ['Laptop charger rectification from 120V AC to 19V DC', 'Transformer induction requirement'];
    } else if (lowerTopic.includes('photo')) {
      exampleAddition = `\n\n💡 Practical Example & Walkthrough:\nDuring the light reactions in thylakoid membranes, photolysis of water produces O2 (2H2O -> 4H+ + 4e- + O2). In hot conditions, C3 plants suffer from photorespiration because RuBisCO fixes O2 instead of CO2, cutting sugar yield by 25%.\n\n📌 Key Nuance:\nC4 plants like corn avoid this by using PEP carboxylase in mesophyll cells to concentrate CO2 around RuBisCO in bundle-sheath cells.`;
      addedExamples = ['Photolysis water splitting reaction equation', 'C4 vs C3 RuBisCO adaptation'];
    } else {
      exampleAddition = `\n\n💡 Practical Example & Real-World Application:\nConsider a practical scenario where ${topic} is implemented: analyze the specific input parameters, apply the governing formulas, and trace the downstream outputs step by step.\n\n📌 Key Edge Case / Common Misconception:\nVerify all operational boundaries and assumptions to prevent false conclusions under extreme conditions.`;
      addedExamples = [`Practical application scenario for ${topic}`, 'Operational boundary check'];
    }

    res.json({
      enrichedNotes: notes.trim() + exampleAddition,
      addedExamples,
    });
  });

  // Mount Vite or static files
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist'), {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('sw.js')) res.setHeader('Cache-Control', 'no-cache');
      },
    }));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
