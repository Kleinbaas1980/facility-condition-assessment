import { emptyBuildUp, type CostResource } from "./qs-cost-model";

type Basis = [unit: string, material: string, supply: number, hours: number];

// Budget assumptions in ZAR excluding VAT. Supply is per finished work unit
// before waste. Hours are person-hours per finished work unit at normal access.
const bases: Record<string, Basis> = {
  "Waterproofing, drainage, etc.": [
    "m²",
    "Waterproofing membrane and primer",
    145,
    0.55,
  ],
  Finishes: ["m²", "Exterior coating and primer", 42, 0.32],
  Windows: [
    "No.",
    "Standard aluminium window with glazing and fixings",
    2850,
    4,
  ],
  "Doors (External façade)": [
    "No.",
    "External door set, frame and ironmongery",
    4950,
    6,
  ],
  "Special doors (Internal divisions)": [
    "No.",
    "Specialist door set and ironmongery",
    8500,
    7,
  ],
  "Internal Floor finishes": [
    "m²",
    "Ceramic floor tiles, adhesive and grout",
    265,
    0.85,
  ],
  "Internal wall finishes": [
    "m²",
    "Interior paint, primer and filler",
    27,
    0.3,
  ],
  "Ceiling finishes": [
    "m²",
    "Ceiling board, framing and jointing materials",
    180,
    0.65,
  ],
  Fittings: ["No.", "Standard built-in fitting and fixings", 1800, 3.5],
  "Sanitary fittings": [
    "No.",
    "Standard close-coupled WC and fittings",
    1950,
    2.75,
  ],
  "Balustrading, handrails, etc.": [
    "LM",
    "Mild steel handrail and fixings",
    760,
    1.6,
  ],
  "Directional, identification, safety, etc.": [
    "No.",
    "Standard sign panel and fixings",
    175,
    0.45,
  ],
  Coverings: ["m²", "Profiled roof sheeting and fixings", 245, 0.72],
  "Rain water drainage": [
    "LM",
    "Gutter or downpipe with brackets and fittings",
    145,
    0.62,
  ],
  "Doors (Internal divisions)": [
    "No.",
    "Internal door, frame and ironmongery",
    2150,
    4,
  ],
  "Building signage": [
    "No.",
    "Building identification sign and fixings",
    1450,
    2,
  ],
  "Grilles, screens, louvers, etc.": [
    "m²",
    "Metal louvre panel and fixings",
    1150,
    1.8,
  ],
  Partitions: ["m²", "Drywall studs, boards and jointing material", 240, 0.85],
  "Shop fronts and similar glazed screens (Internal divisions)": [
    "m²",
    "Aluminium framing and safety glazing",
    1900,
    2.2,
  ],
  Cladding: ["m²", "Fibre-cement cladding panels and fixings", 540, 1.35],
  "Boundary walls (finish)": [
    "m²",
    "Sand, cement and exterior coating",
    68,
    0.65,
  ],
  Canopies: ["m²", "Light steel canopy framing and covering", 1050, 2.75],
  "Site/street furniture and equipment": [
    "No.",
    "Standard outdoor bench and anchors",
    2800,
    2.8,
  ],
  "Covering to parking": ["m²", "Carport roof sheeting and fixings", 260, 0.85],
  "Signage pylons, towers, etc.": [
    "No.",
    "Small freestanding pylon, sign face and base materials",
    9500,
    12,
  ],
  "Railings, balustrades, etc": [
    "LM",
    "Steel railing panels, posts and fixings",
    870,
    1.9,
  ],
  "Jungle Gym": [
    "No.",
    "Small modular playground structure and anchors",
    17500,
    24,
  ],
  "Water supply pipework": [
    "LM",
    "Exposed 20 mm pipe with supports and fittings",
    95,
    0.55,
  ],
  "Waste and soil pipework": [
    "LM",
    "110 mm PVC pipe with fittings and supports",
    165,
    0.65,
  ],
  "Water heaters and geysers": [
    "No.",
    "150 L geyser and installation fittings",
    5600,
    6,
  ],
  "Valves and taps": ["No.", "Standard tap or valve and connectors", 360, 0.95],
  "Distribution boards": [
    "No.",
    "Small distribution board, breakers and labels",
    3600,
    8,
  ],
  "Cabling and containment": [
    "LM",
    "Small circuit cable and surface containment",
    90,
    0.45,
  ],
  "Light fittings": ["No.", "Standard LED batten fitting", 475, 0.85],
  "Socket outlets and switches": [
    "No.",
    "Outlet or switch, plate and box",
    145,
    0.65,
  ],
  "Earthing and bonding": [
    "No.",
    "Earthing electrode and connection materials",
    460,
    2.1,
  ],
  Foundations: [
    "m³",
    "Concrete, formwork and reinforcement allowance",
    2900,
    8,
  ],
  "Concrete columns and beams": [
    "m³",
    "Concrete, formwork and reinforcement allowance",
    4100,
    16,
  ],
  "Structural steelwork": [
    "kg",
    "Fabricated and primed structural steel",
    53,
    0.11,
  ],
  "Load-bearing walls": ["m²", "Masonry units, mortar and ties", 220, 1.5],
  "Concrete slabs": ["m²", "Concrete, mesh and formwork allowance", 440, 2.4],
  "Fire extinguishers": [
    "No.",
    "4.5 kg dry powder extinguisher and bracket",
    820,
    0.45,
  ],
  "Fire hose reels": [
    "No.",
    "Hose reel assembly and connection fittings",
    3350,
    3.5,
  ],
  "Fire hydrants": [
    "No.",
    "Hydrant valve assembly and connection fittings",
    5100,
    5,
  ],
  "Fire alarm and detection": ["No.", "Compatible detector and base", 680, 1.1],
  "Fire doors": [
    "No.",
    "Certified single fire door set and ironmongery",
    9800,
    7,
  ],
  "Air conditioning units": [
    "No.",
    "Small split AC unit and connection kit",
    7450,
    7,
  ],
  "Fans and ductwork": [
    "LM",
    "Small sheet-metal duct with hangers and fittings",
    310,
    1.25,
  ],
  Pumps: ["No.", "Small circulation pump and connectors", 4400, 4.5],
  "Filters and controls": [
    "No.",
    "Standard filter or control module allowance",
    620,
    1.1,
  ],
  Lifts: [
    "No.",
    "Small passenger lift equipment and installation package",
    460000,
    0,
  ],
  "Paving and roads": [
    "m²",
    "Concrete pavers, bedding and base materials",
    290,
    1.15,
  ],
  "Stormwater drains": [
    "LM",
    "Small stormwater pipe, fittings and bedding",
    360,
    1.6,
  ],
  Manholes: ["No.", "Shallow chamber, cover and bedding materials", 3900, 10],
  "Kerbs and channels": [
    "LM",
    "Precast kerb or channel and bedding materials",
    165,
    0.88,
  ],
  "Retaining walls": [
    "m²",
    "Segmental blocks, drainage and granular backfill",
    590,
    3.6,
  ],
};

const labourRates: Record<string, number> = {
  Plumber: 285,
  Electrician: 325,
  "Structural Engineer": 265,
  "Fire Engineer": 345,
  "Mechanical Engineer": 320,
  "Civil Engineer": 245,
};

// Ratios describe a typical intervention on one affected unit. They are editable
// proxies where the exact repair specification is only known after inspection.
const interventions: Record<
  string,
  [material: number, labour: number, scope: string]
> = {
  Repair: [
    0.25,
    0.6,
    "Localised repair, including preparation and reinstatement",
  ],
  Replacement: [1, 1, "Standard supply, removal and installation"],
  "Routine maintenance": [
    0.04,
    0.22,
    "Clean, inspect and carry out routine servicing",
  ],
  "Preventative maintenance": [
    0.08,
    0.35,
    "Service, adjust and carry out preventive treatment",
  ],
  Refurbishment: [0.42, 0.85, "Prepare and restore the existing component"],
};

export function budgetRate(
  component: string,
  discipline: string,
  work: string,
) {
  const basis = bases[component];
  const intervention = interventions[work];
  if (!basis || !intervention) return null;

  const [unit, material, supply, hours] = basis;
  const [materialFactor, labourFactor, scope] = intervention;
  const isMaintenance = work.endsWith("maintenance");
  const isReplacement = work === "Replacement";
  const resources: CostResource[] = [];
  if (component === "Lifts") {
    const specialistAllowances: Record<string, number> = {
      Repair: 8500,
      Replacement: supply,
      "Routine maintenance": 1700,
      "Preventative maintenance": 2900,
      Refurbishment: 95000,
    };
    resources.push({
      id: "specialist",
      category: "Subcontractor",
      description: scope,
      unit: "No.",
      quantity: 1,
      rate: specialistAllowances[work],
      wastePercent: 0,
    });
  } else {
    resources.push(
      {
        id: "material",
        category: "Material",
        description: isReplacement
          ? material
          : isMaintenance
            ? "Service consumables and minor parts allowance"
            : `Parts and materials allowance based on ${material.toLowerCase()}`,
        unit,
        quantity: materialFactor,
        rate: supply,
        wastePercent: unit === "No." || isMaintenance ? 0 : 5,
      },
      {
        id: "labour",
        category: "Labour",
        description: scope,
        unit: "hour",
        quantity: Number((hours * labourFactor).toFixed(3)),
        rate: labourRates[discipline] ?? 220,
        wastePercent: 0,
      },
      {
        id: "plant",
        category: "Plant",
        description: "Small tools and equipment",
        unit: "hour",
        quantity: Number((hours * labourFactor).toFixed(3)),
        rate: 28,
        wastePercent: 0,
      },
    );
    if (!isMaintenance)
      resources.push({
        id: "disposal",
        category: "Other",
        description: "Waste handling and disposal allowance",
        unit,
        quantity: 1,
        rate: Math.round(supply * (isReplacement ? 0.035 : 0.015)),
        wastePercent: 0,
      });
  }
  return {
    unit,
    build: {
      ...emptyBuildUp(),
      resources,
      overheadPercent: 10,
      profitPercent: 10,
      reference: "Indicative 1C budget allowance · QS review required",
      notes: `${scope}. Assumes normal access and standard specification. Confirm resource prices, productivity and scope with the QS. Excludes VAT, specialist access and project-level allowances.`,
    },
  };
}
