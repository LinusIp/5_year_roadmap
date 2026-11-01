/**
 * The Engineering path's sub-filters (ATLAS-LIBRARY, 13,839 rows). The `engineering` track is the Library's largest
 * outside AI, so its path offers chips for its areas. A chip is a set of words matched on an item's title and
 * summary (the file's `why`): no field in the data names an area, and the rows read the same with or without one.
 * An item can belong to several areas; one that names none shows under no chip.
 */
export interface Topic {
  key: string;
  label: string;
  /** Lower-case word starts: "vibrat" matches vibration and vibrations. An entry with a space matches the phrase. */
  words: readonly string[];
}

export const TOPICS: readonly Topic[] = [
  { key: 'mechanics', label: 'Mechanics', words: ['statics', 'dynamics', 'vibrat', 'kinematic', 'mechanics', 'stress', 'strain', 'beam', 'truss', 'fatigue', 'fracture', 'rigid body', 'elasticity', 'structural', 'strength of materials', 'finite element', 'fea', 'buckling', 'torsion', 'deflection'] },
  { key: 'materials', label: 'Materials', words: ['material', 'metallurg', 'alloy', 'polymer', 'composite', 'ceramic', 'crystal', 'phase diagram', 'corrosion', 'steel', 'microstructure', 'doitpoms', 'solid state', 'semiconductor physics', 'heat treatment'] },
  { key: 'thermo', label: 'Thermo-fluids', words: ['thermodynamic', 'heat transfer', 'fluid', 'turbomachin', 'compressible', 'hvac', 'refrigerat', 'combustion', 'boiler', 'pump', 'turbine', 'convection', 'conduction', 'psychrometric', 'entropy', 'heat exchanger', 'thermal', 'cfd', 'aerodynamic', 'hydraulic', 'pneumatic'] },
  { key: 'design', label: 'Design & CAD', words: ['cad', 'freecad', 'cadquery', 'solidworks', 'fusion 360', 'onshape', 'openscad', 'gd&t', 'tolerance', 'machine design', 'gear', 'bearing', 'shaft', 'spring', 'fastener', 'fundamentals of design', 'engineering drawing', 'mechanism', 'linkage', 'cam', 'compliant', 'machine element'] },
  { key: 'manufacturing', label: 'Manufacturing', words: ['manufactur', 'machining', 'cnc', '3d print', 'additive', 'injection mold', 'casting', 'welding', 'sheet metal', 'lathe', 'milling', 'g-code', 'gcode', 'dfm', 'lean', 'six sigma', 'quality', 'metrology', 'fabrication', 'prototyp', 'linuxcnc'] },
  { key: 'electronics', label: 'Electronics & PCB', words: ['pcb', 'kicad', 'circuit', 'op-amp', 'op amp', 'amplifier', 'adc', 'dac', 'signal integrity', 'emc', 'emi', 'ngspice', 'spice', 'oscilloscope', 'solder', 'schematic', 'microcontroller', 'analog', 'sensor', 'electronics', 'transistor', 'diode', 'mosfet', 'filter design', 'layout', 'ltspice', 'arduino', 'embedded', 'firmware', 'rf', 'antenna', 'electromagnetic', 'fpga', 'verilog', 'vhdl', 'dsp', 'signal processing', 'signals', 'digital design', 'digital', 'radio', 'sdr', 'communication', 'rtos', 'freertos', 'lithography', 'microfabrication', 'semiconductor', 'vlsi', 'logic'] },
  { key: 'power', label: 'Power & energy', words: ['power electronics', 'inverter', 'converter', 'motor', 'drive', 'battery', 'batteries', 'bms', 'grid', 'solar', 'photovoltaic', 'pv ', 'wind', 'electric vehicle', 'ev ', 'evs', 'charging', 'transformer', 'energy', 'fuel cell', 'power system', 'generator', 'nrel', 'electricity', 'renewable', 'hydrogen', 'brayton', 'sco2', 'supercritical', 'balance of plant', 'power plant', 'power core', 'direct energy conversion', 'direct conversion', 'costing', 'techno-economic', 'superconduct', 'magnet', 'current leads'] },
  { key: 'control', label: 'Control', words: ['control', 'pid', 'state-space', 'state space', 'kalman', 'feedback', 'system identification', 'lqr', 'mpc', 'loop shaping', 'bode', 'nyquist', 'transfer function', 'observer', 'simulink', 'servo'] },
  { key: 'aerospace', label: 'Aerospace', words: ['aerospace', 'aircraft', 'rocket', 'propulsion', 'orbit', 'astrodynamic', 'spacecraft', 'satellite', 'flight', 'wing', 'airfoil', 'launch', 'space ', 'nasa', 'aeronautic', 'helicopter', 'drone', 'uav', 'jet engine', 'gas turbine', 'reentry', 'attitude', 'turbopump', 'jpl', 'naca', 'apollo', 'mars', 'lunar', 'trajectory', 'guidance', 'gnc', 'gn&c', 'ephemeris', 'descent', 'landing', 'orbital debris', 'spice', 'xfoil', 'openvsp', 'jsbsim', 'aerosandbox', 'ariane', 'artemis', 'esa', 'convexification', 'compressible flow'] },
  { key: 'chemical', label: 'Chemical & nuclear', words: ['chemical', 'process engineering', 'process safety', 'process control', 'reactor', 'nuclear', 'reaction engineering', 'distillation', 'mass transfer', 'fission', 'fusion', 'radiation', 'neutron', 'fogler', 'moose', 'serpent', 'separation', 'thermochemical', 'reactor engineering', 'radioisotope', 'plasma', 'isotope', 'learncheme', 'cheme', 'unit operation', 'hazop', 'ccps', 'tokamak', 'stellarator', 'tritium', 'blanket', 'd-t', 'd-3he', 'deuterium', 'mirror reactor', 'magnetic confinement', 'inertial', 'accelerator', 'linac', 'synchrotron', 'beam dynamics', 'beam physics', 'particle beam', 'beam instrumentation', 'cavity', 'cavities', 'srf', 'free-electron', 'free electron', 'wakefield', 'collider', 'undulator', 'cyclotron', 'storage ring', 'cern', 'juas', 'uspas', 'fermilab', 'jacow', 'space charge', 'space-charge', 'emittance', 'bunch', 'neutronics', 'openmc', 'iter', 'demo ', 'sparc', 'aries'] },
  { key: 'practice', label: 'Practice', words: ['systems engineering', 'reliability', 'failure', 'case stud', 'fmea', 'root cause', 'incose', 'sebok', 'requirements', 'verification', 'validation', 'ethics', 'standard', 'iso ', 'asq', 'safety', 'accident', 'postmortem', 'risk', 'engineering practice', 'project management', 'design review'] },
];

/** Lower-case words of a text, and the text itself for phrases. */
function normalise(text: string): string {
  return ' ' + text.toLowerCase().replace(/[^a-z0-9&+-]+/g, ' ') + ' ';
}

/** The areas an item belongs to, from its title and summary. */
export function topicsOf(title: string, summary = ''): string[] {
  const text = normalise(title + ' ' + summary);
  return TOPICS.filter((t) => t.words.some((w) => text.includes(' ' + w) || (w.endsWith(' ') && text.includes(' ' + w)))).map((t) => t.key);
}
