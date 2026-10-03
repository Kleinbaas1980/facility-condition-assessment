// Checklist definitions only. These are not captured findings or seeded projects.
// Measurements, prices, presence and condition percentages are entered by assessors.
export const areaTypes=["Teaching areas", "General Support Areas", "Administration and Staff Facilities", "Assembly Meeting Areas", "Ablutions", "Hard Courts", "Parks and Gardens", "Roads and Parking", "External works"] as const;
export const componentDefinitions=[
  {
    "area": "Teaching areas",
    "section": "PRIMARY ELEMENTS",
    "element": "External facade",
    "component": "Waterproofing, drainage, etc.",
    "type": "Waterproofing"
  },
  {
    "area": "Teaching areas",
    "section": "PRIMARY ELEMENTS",
    "element": "External facade",
    "component": "Finishes",
    "type": "Face Brick"
  },
  {
    "area": "Teaching areas",
    "section": "PRIMARY ELEMENTS",
    "element": "External facade",
    "component": "Windows",
    "type": "Aluminium"
  },
  {
    "area": "Teaching areas",
    "section": "PRIMARY ELEMENTS",
    "element": "External facade",
    "component": "Doors (External façade)",
    "type": "Timber"
  },
  {
    "area": "Teaching areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Internal divisions",
    "component": "Special doors (Internal divisions)",
    "type": ""
  },
  {
    "area": "Teaching areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Internal floor finishes",
    "component": "Internal Floor finishes",
    "type": "Tiles"
  },
  {
    "area": "Teaching areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Internal wall finishes",
    "component": "Internal wall finishes",
    "type": "Paint"
  },
  {
    "area": "Teaching areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Ceiling finishes",
    "component": "Ceiling finishes",
    "type": "Concrete Soffit"
  },
  {
    "area": "Teaching areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Fittings",
    "component": "Fittings",
    "type": "Any joinery fittings, cupboards, worktops, benches etc."
  },
  {
    "area": "Teaching areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Plumbing",
    "component": "Sanitary fittings",
    "type": "Complete"
  },
  {
    "area": "Teaching areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Balustrading, handrails, etc.",
    "component": "Balustrading, handrails, etc.",
    "type": "Steel handrails"
  },
  {
    "area": "Teaching areas",
    "section": "SPECIALIST INSTALLATIONS",
    "element": "Signage",
    "component": "Directional, identification, safety, etc.",
    "type": "Statutory signage"
  },
  {
    "area": "Teaching areas",
    "section": "PRIMARY ELEMENTS",
    "element": "External facade",
    "component": "Waterproofing, drainage, etc.",
    "type": "Drainage"
  },
  {
    "area": "Teaching areas",
    "section": "PRIMARY ELEMENTS",
    "element": "External facade",
    "component": "Doors (External façade)",
    "type": ""
  },
  {
    "area": "Teaching areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Roofs",
    "component": "Coverings",
    "type": "Sheet Metal"
  },
  {
    "area": "Teaching areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Roofs",
    "component": "Rain water drainage",
    "type": "Plastic (PVC)"
  },
  {
    "area": "Teaching areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Ceiling finishes",
    "component": "Ceiling finishes",
    "type": "Plasterboard"
  },
  {
    "area": "Teaching areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Balustrading, handrails, etc.",
    "component": "Balustrading, handrails, etc.",
    "type": "Balustrade walls"
  },
  {
    "area": "General Support Areas",
    "section": "PRIMARY ELEMENTS",
    "element": "External facade",
    "component": "Waterproofing, drainage, etc.",
    "type": "Drainage"
  },
  {
    "area": "General Support Areas",
    "section": "PRIMARY ELEMENTS",
    "element": "External facade",
    "component": "Finishes",
    "type": "Face Brick"
  },
  {
    "area": "General Support Areas",
    "section": "PRIMARY ELEMENTS",
    "element": "External facade",
    "component": "Windows",
    "type": "Aluminium"
  },
  {
    "area": "General Support Areas",
    "section": "PRIMARY ELEMENTS",
    "element": "External facade",
    "component": "Doors (External façade)",
    "type": "Timber"
  },
  {
    "area": "General Support Areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Roofs",
    "component": "Coverings",
    "type": "Sheet Metal"
  },
  {
    "area": "General Support Areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Roofs",
    "component": "Rain water drainage",
    "type": "Steel"
  },
  {
    "area": "General Support Areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Internal floor finishes",
    "component": "Internal Floor finishes",
    "type": "Tiles"
  },
  {
    "area": "General Support Areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Internal wall finishes",
    "component": "Internal wall finishes",
    "type": "Paint"
  },
  {
    "area": "General Support Areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Ceiling finishes",
    "component": "Ceiling finishes",
    "type": "Plasterboard"
  },
  {
    "area": "General Support Areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Fittings",
    "component": "Fittings",
    "type": "Any joinery fittings, cupboards, worktops, benches etc."
  },
  {
    "area": "General Support Areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Plumbing",
    "component": "Sanitary fittings",
    "type": "Complete"
  },
  {
    "area": "Administration and Staff Facilities",
    "section": "PRIMARY ELEMENTS",
    "element": "External facade",
    "component": "Waterproofing, drainage, etc.",
    "type": "Drainage"
  },
  {
    "area": "Administration and Staff Facilities",
    "section": "PRIMARY ELEMENTS",
    "element": "External facade",
    "component": "Finishes",
    "type": "Face Brick"
  },
  {
    "area": "Administration and Staff Facilities",
    "section": "PRIMARY ELEMENTS",
    "element": "External facade",
    "component": "Windows",
    "type": "Aluminium"
  },
  {
    "area": "Administration and Staff Facilities",
    "section": "PRIMARY ELEMENTS",
    "element": "External facade",
    "component": "Doors (External façade)",
    "type": "Steel"
  },
  {
    "area": "Administration and Staff Facilities",
    "section": "PRIMARY ELEMENTS",
    "element": "Roofs",
    "component": "Rain water drainage",
    "type": "Plastic (PVC)"
  },
  {
    "area": "Administration and Staff Facilities",
    "section": "PRIMARY ELEMENTS",
    "element": "Internal divisions",
    "component": "Doors (Internal divisions)",
    "type": "Wood"
  },
  {
    "area": "Administration and Staff Facilities",
    "section": "PRIMARY ELEMENTS",
    "element": "Internal floor finishes",
    "component": "Internal Floor finishes",
    "type": "Tiles"
  },
  {
    "area": "Administration and Staff Facilities",
    "section": "PRIMARY ELEMENTS",
    "element": "Internal wall finishes",
    "component": "Internal wall finishes",
    "type": "Paint"
  },
  {
    "area": "Administration and Staff Facilities",
    "section": "PRIMARY ELEMENTS",
    "element": "Ceiling finishes",
    "component": "Ceiling finishes",
    "type": "Concrete Soffit"
  },
  {
    "area": "Administration and Staff Facilities",
    "section": "PRIMARY ELEMENTS",
    "element": "Fittings",
    "component": "Fittings",
    "type": "Any joinery fittings, cupboards, worktops, benches etc."
  },
  {
    "area": "Administration and Staff Facilities",
    "section": "PRIMARY ELEMENTS",
    "element": "Plumbing",
    "component": "Sanitary fittings",
    "type": "Complete"
  },
  {
    "area": "Administration and Staff Facilities",
    "section": "PRIMARY ELEMENTS",
    "element": "Balustrading, handrails, etc.",
    "component": "Balustrading, handrails, etc.",
    "type": "Steel balustrading"
  },
  {
    "area": "Administration and Staff Facilities",
    "section": "PRIMARY ELEMENTS",
    "element": "External facade",
    "component": "Doors (External façade)",
    "type": "Timber"
  },
  {
    "area": "Administration and Staff Facilities",
    "section": "PRIMARY ELEMENTS",
    "element": "Roofs",
    "component": "Coverings",
    "type": "Sheet Metal"
  },
  {
    "area": "Administration and Staff Facilities",
    "section": "PRIMARY ELEMENTS",
    "element": "Ceiling finishes",
    "component": "Ceiling finishes",
    "type": "Plasterboard"
  },
  {
    "area": "Administration and Staff Facilities",
    "section": "SPECIALIST INSTALLATIONS",
    "element": "Signage",
    "component": "Building signage",
    "type": "Other than statutory signage"
  },
  {
    "area": "Assembly Meeting Areas",
    "section": "PRIMARY ELEMENTS",
    "element": "External facade",
    "component": "Waterproofing, drainage, etc.",
    "type": "Drainage"
  },
  {
    "area": "Assembly Meeting Areas",
    "section": "PRIMARY ELEMENTS",
    "element": "External facade",
    "component": "Finishes",
    "type": "Face Brick"
  },
  {
    "area": "Assembly Meeting Areas",
    "section": "PRIMARY ELEMENTS",
    "element": "External facade",
    "component": "Windows",
    "type": "Aluminium"
  },
  {
    "area": "Assembly Meeting Areas",
    "section": "PRIMARY ELEMENTS",
    "element": "External facade",
    "component": "Grilles, screens, louvers, etc.",
    "type": "screens"
  },
  {
    "area": "Assembly Meeting Areas",
    "section": "PRIMARY ELEMENTS",
    "element": "External facade",
    "component": "Doors (External façade)",
    "type": "Timber"
  },
  {
    "area": "Assembly Meeting Areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Roofs",
    "component": "Coverings",
    "type": "Sheet Metal"
  },
  {
    "area": "Assembly Meeting Areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Roofs",
    "component": "Rain water drainage",
    "type": "Steel"
  },
  {
    "area": "Assembly Meeting Areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Internal divisions",
    "component": "Doors (Internal divisions)",
    "type": "Metal"
  },
  {
    "area": "Assembly Meeting Areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Internal floor finishes",
    "component": "Internal Floor finishes",
    "type": "Granolithic Finish"
  },
  {
    "area": "Assembly Meeting Areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Internal floor finishes",
    "component": "Internal Floor finishes",
    "type": "Tiles"
  },
  {
    "area": "Assembly Meeting Areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Internal wall finishes",
    "component": "Internal wall finishes",
    "type": "Paint"
  },
  {
    "area": "Assembly Meeting Areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Ceiling finishes",
    "component": "Ceiling finishes",
    "type": "Suspended panel"
  },
  {
    "area": "Assembly Meeting Areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Fittings",
    "component": "Fittings",
    "type": "Any joinery fittings, cupboards, worktops, benches etc."
  },
  {
    "area": "Assembly Meeting Areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Plumbing",
    "component": "Sanitary fittings",
    "type": "Complete"
  },
  {
    "area": "Assembly Meeting Areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Balustrading, handrails, etc.",
    "component": "Balustrading, handrails, etc.",
    "type": "Steel handrails"
  },
  {
    "area": "Assembly Meeting Areas",
    "section": "SPECIALIST INSTALLATIONS",
    "element": "Signage",
    "component": "Building signage",
    "type": "Other than statutory signage"
  },
  {
    "area": "Assembly Meeting Areas",
    "section": "SPECIALIST INSTALLATIONS",
    "element": "Signage",
    "component": "Directional, identification, safety, etc.",
    "type": "Statutory signage"
  },
  {
    "area": "General Support Areas",
    "section": "PRIMARY ELEMENTS",
    "element": "External facade",
    "component": "Waterproofing, drainage, etc.",
    "type": "Waterproofing"
  },
  {
    "area": "General Support Areas",
    "section": "PRIMARY ELEMENTS",
    "element": "External facade",
    "component": "Finishes",
    "type": "Paintwork"
  },
  {
    "area": "General Support Areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Internal divisions",
    "component": "Doors (Internal divisions)",
    "type": "Wood"
  },
  {
    "area": "General Support Areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Internal floor finishes",
    "component": "Internal Floor finishes",
    "type": "Granolithic Finish"
  },
  {
    "area": "General Support Areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Ceiling finishes",
    "component": "Ceiling finishes",
    "type": "Concrete Soffit"
  },
  {
    "area": "General Support Areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Balustrading, handrails, etc.",
    "component": "Balustrading, handrails, etc.",
    "type": "Steel handrails"
  },
  {
    "area": "Assembly Meeting Areas",
    "section": "PRIMARY ELEMENTS",
    "element": "External facade",
    "component": "Finishes",
    "type": "Plaster and painted"
  },
  {
    "area": "Ablutions",
    "section": "PRIMARY ELEMENTS",
    "element": "External facade",
    "component": "Finishes",
    "type": "Face Brick"
  },
  {
    "area": "Ablutions",
    "section": "PRIMARY ELEMENTS",
    "element": "External facade",
    "component": "Windows",
    "type": "Steel"
  },
  {
    "area": "Ablutions",
    "section": "PRIMARY ELEMENTS",
    "element": "External facade",
    "component": "Doors (External façade)",
    "type": "Timber"
  },
  {
    "area": "Ablutions",
    "section": "PRIMARY ELEMENTS",
    "element": "Roofs",
    "component": "Rain water drainage",
    "type": "Plastic (PVC)"
  },
  {
    "area": "Ablutions",
    "section": "PRIMARY ELEMENTS",
    "element": "Partitions",
    "component": "Partitions",
    "type": "Complete"
  },
  {
    "area": "Ablutions",
    "section": "PRIMARY ELEMENTS",
    "element": "Internal floor finishes",
    "component": "Internal Floor finishes",
    "type": "Tiles"
  },
  {
    "area": "Ablutions",
    "section": "PRIMARY ELEMENTS",
    "element": "Internal wall finishes",
    "component": "Internal wall finishes",
    "type": "Tiles"
  },
  {
    "area": "Ablutions",
    "section": "PRIMARY ELEMENTS",
    "element": "Ceiling finishes",
    "component": "Ceiling finishes",
    "type": "Concrete Soffit"
  },
  {
    "area": "Ablutions",
    "section": "PRIMARY ELEMENTS",
    "element": "Fittings",
    "component": "Fittings",
    "type": "Any joinery fittings, cupboards, worktops, benches etc."
  },
  {
    "area": "Ablutions",
    "section": "PRIMARY ELEMENTS",
    "element": "Plumbing",
    "component": "Sanitary fittings",
    "type": "Complete"
  },
  {
    "area": "Ablutions",
    "section": "PRIMARY ELEMENTS",
    "element": "External facade",
    "component": "Finishes",
    "type": "Plaster and painted"
  },
  {
    "area": "Ablutions",
    "section": "PRIMARY ELEMENTS",
    "element": "Roofs",
    "component": "Coverings",
    "type": "Sheet Metal"
  },
  {
    "area": "Ablutions",
    "section": "PRIMARY ELEMENTS",
    "element": "Internal floor finishes",
    "component": "Internal Floor finishes",
    "type": "Vinyl"
  },
  {
    "area": "Ablutions",
    "section": "PRIMARY ELEMENTS",
    "element": "Internal wall finishes",
    "component": "Internal wall finishes",
    "type": "Paint"
  },
  {
    "area": "Ablutions",
    "section": "PRIMARY ELEMENTS",
    "element": "Ceiling finishes",
    "component": "Ceiling finishes",
    "type": "Plasterboard"
  },
  {
    "area": "Ablutions",
    "section": "PRIMARY ELEMENTS",
    "element": "Balustrading, handrails, etc.",
    "component": "Balustrading, handrails, etc.",
    "type": "Steel handrails"
  },
  {
    "area": "Teaching areas",
    "section": "PRIMARY ELEMENTS",
    "element": "External facade",
    "component": "Windows",
    "type": "Steel"
  },
  {
    "area": "Teaching areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Internal divisions",
    "component": "Doors (Internal divisions)",
    "type": "Wood"
  },
  {
    "area": "Teaching areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Internal floor finishes",
    "component": "Internal Floor finishes",
    "type": "Vinyl"
  },
  {
    "area": "Teaching areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Internal floor finishes",
    "component": "Internal Floor finishes",
    "type": "Granolithic Finish"
  },
  {
    "area": "Teaching areas",
    "section": "PRIMARY ELEMENTS",
    "element": "External facade",
    "component": "Finishes",
    "type": "Plaster and painted"
  },
  {
    "area": "Teaching areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Internal divisions",
    "component": "Shop fronts and similar glazed screens (Internal divisions)",
    "type": "Complete"
  },
  {
    "area": "Teaching areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Balustrading, handrails, etc.",
    "component": "Balustrading, handrails, etc.",
    "type": "Steel balustrading"
  },
  {
    "area": "Teaching areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Partitions",
    "component": "Partitions",
    "type": "Complete"
  },
  {
    "area": "Teaching areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Roofs",
    "component": "Rain water drainage",
    "type": "Steel"
  },
  {
    "area": "Teaching areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Internal wall finishes",
    "component": "Internal wall finishes",
    "type": "Tiles"
  },
  {
    "area": "Teaching areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Ceiling finishes",
    "component": "Ceiling finishes",
    "type": "Suspended panel"
  },
  {
    "area": "General Support Areas",
    "section": "PRIMARY ELEMENTS",
    "element": "External facade",
    "component": "Windows",
    "type": ""
  },
  {
    "area": "General Support Areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Roofs",
    "component": "Rain water drainage",
    "type": "Plastic (PVC)"
  },
  {
    "area": "General Support Areas",
    "section": "PRIMARY ELEMENTS",
    "element": "External facade",
    "component": "Cladding",
    "type": "Sheet metal"
  },
  {
    "area": "General Support Areas",
    "section": "PRIMARY ELEMENTS",
    "element": "Ceiling finishes",
    "component": "Ceiling finishes",
    "type": "Suspended panel"
  },
  {
    "area": "General Support Areas",
    "section": "PRIMARY ELEMENTS",
    "element": "External facade",
    "component": "Finishes",
    "type": "Plaster and painted"
  },
  {
    "area": "Hard Courts",
    "section": "EXTERNAL WORKS AND SERVICES",
    "element": "Boundary, screen, retaining walls, etc.",
    "component": "Boundary walls (finish)",
    "type": "Face Brick"
  },
  {
    "area": "Hard Courts",
    "section": "EXTERNAL WORKS AND SERVICES",
    "element": "Pergolas, canopies, etc.",
    "component": "Canopies",
    "type": "Steel"
  },
  {
    "area": "Hard Courts",
    "section": "EXTERNAL WORKS AND SERVICES",
    "element": "Miscellaneous items (External)",
    "component": "Site/street furniture and equipment",
    "type": "Concrete"
  },
  {
    "area": "Roads and Parking",
    "section": "EXTERNAL WORKS AND SERVICES",
    "element": "Covered parking, walkways, etc.",
    "component": "Covering to parking",
    "type": "Complete"
  },
  {
    "area": "External works",
    "section": "SPECIALIST INSTALLATIONS",
    "element": "Signage",
    "component": "Signage pylons, towers, etc.",
    "type": "Complete"
  },
  {
    "area": "External works",
    "section": "EXTERNAL WORKS AND SERVICES",
    "element": "Boundary, screen, retaining walls, etc.",
    "component": "Boundary walls (finish)",
    "type": "Face Brick"
  },
  {
    "area": "External works",
    "section": "EXTERNAL WORKS AND SERVICES",
    "element": "Fences and railings",
    "component": "Railings, balustrades, etc",
    "type": "Steel"
  },
  {
    "area": "External works",
    "section": "EXTERNAL WORKS AND SERVICES",
    "element": "Play area",
    "component": "Jungle Gym",
    "type": "Medium"
  }
] as const;
export const catalog={areas:areaTypes.map((type,i)=>({code:`FA-${i+1}`,unit:"",type,name:type,sqm:null})),captures:componentDefinitions.map(item=>({...item,exists:"",extent:null,ratings:[0,0,0,0,0],comment:"",discipline:"Architect"}))};
